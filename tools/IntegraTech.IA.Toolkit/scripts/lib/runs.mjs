import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync, unlinkSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { contained, assertNoLinks } from './paths.mjs';
import { atomicFileWrite } from './adoption-recovery.mjs';
const hash = data => createHash('sha256').update(data).digest('hex');
const terminal = ['completed', 'blocked', 'failed', 'paused', 'cancelled'];
const safeId = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,140}$/.test(value);
function paths(repo, id) {
  if (!safeId(id)) throw new Error('identificador inválido');
  const root = resolve(repo, 'qa-artifacts/runs'); assertNoLinks(root);
  const dir = contained(root, id);
  return { root, dir, state: join(dir, 'state.json'), events: join(dir, 'events.jsonl') };
}
function snapshot(repo, inputs) {
  const values = {};
  for (const file of [...new Set(['references/project-state.json', 'references/business-context.json', ...inputs])].sort()) {
    const full = contained(repo, file);
    values[file] = existsSync(full) ? hash(readFileSync(full)) : null;
  }
  values.policy = hash(readFileSync(new URL('../../fabrica/policy.json', import.meta.url)));
  values.catalog = hash(readFileSync(new URL('../../fabrica/team/catalog.yaml', import.meta.url)));
  if (existsSync(join(repo, '.git'))) {
    try { values.commit = execFileSync('git', ['-C', repo, 'rev-parse', 'HEAD'], { encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
    catch { values.commit = null; }
  }
  return hash(JSON.stringify(values));
}
export function eventRun(run, type, fields = {}) {
  if (!['run_started', 'policy_checked', 'provider_checked', 'process_finished', 'output_validated', 'run_finished'].includes(type)) throw new Error('evento inválido');
  for (const [key, value] of Object.entries(fields)) {
    if (!['status', 'reason_code', 'verdict', 'duration_ms'].includes(key)
      || !(typeof value === 'number' && Number.isFinite(value) || typeof value === 'string' && /^[a-z0-9_:-]{1,100}$/.test(value))) throw new Error('campo de evento não permitido');
  }
  appendFileSync(run.events, JSON.stringify({ at: new Date().toISOString(), run_id: run.id, type, ...fields }) + '\n', 'utf8');
}
export function beginRun({ repo, taskId, provider, agent, phase, inputs = [] }) {
  if (!safeId(taskId) || !['codex', 'claude'].includes(provider) || !safeId(agent)
    || !['toolkit', 'discovery', 'design', 'business'].includes(phase) || !Array.isArray(inputs) || inputs.length > 80) throw new Error('execução inválida');
  const id = `${taskId}-${randomUUID()}`;
  const p = paths(repo, id);
  mkdirSync(p.root, { recursive: true });
  const lock = contained(p.root, `${taskId}.lock`);
  const fingerprint = snapshot(repo, inputs);
  writeFileSync(lock, JSON.stringify({ id }), { flag: 'wx' });
  try {
    mkdirSync(p.dir);
    const state = { version: 1, id, task_id: taskId, provider, agent, phase, pid: process.pid, status: 'running', started_at: new Date().toISOString(), inputs, fingerprint, attempts: 1, tokens: null, cost: null };
    atomicFileWrite(p.state, JSON.stringify(state, null, 2) + '\n');
    const run = { ...p, id, repo, lock };
    eventRun(run, 'run_started');
    return run;
  } catch (error) { if (JSON.parse(readFileSync(lock, 'utf8')).id === id) unlinkSync(lock); throw error; }
}
export function finishRun(run, { status, reason_code = 'none', verdict } = {}) {
  if (!terminal.includes(status)) throw new Error('transição inválida');
  const state = JSON.parse(readFileSync(run.state, 'utf8'));
  if (state.status !== 'running') throw new Error('execução já encerrada');
  eventRun(run, 'run_finished', { status, reason_code, ...(verdict ? { verdict } : {}) });
  state.status = status; state.reason_code = reason_code;
  state.finished_at = new Date().toISOString();
  state.duration_ms = Math.max(0, Date.now() - Date.parse(state.started_at));
  if (verdict) state.verdict = verdict;
  atomicFileWrite(run.state, JSON.stringify(state, null, 2) + '\n');
  if (existsSync(run.lock) && JSON.parse(readFileSync(run.lock, 'utf8')).id === run.id) unlinkSync(run.lock);
}
export function inspectRun(repo, id) {
  const p = paths(repo, id);
  const state = JSON.parse(readFileSync(p.state, 'utf8'));
  if (state.id !== id || !['running', ...terminal].includes(state.status) || !safeId(state.task_id) || !Array.isArray(state.inputs)) throw new Error('registro inválido');
  return { id, status: state.status, snapshot_matches: snapshot(repo, state.inputs) === state.fingerprint, automatic_replay: false,
    attempts: state.attempts, duration_ms: state.duration_ms ?? null, tokens: null, cost: null, requires_manual_action: state.status === 'running' };
}
export function closeInterruptedRun(repo, id) {
  const p = paths(repo, id);
  const state = JSON.parse(readFileSync(p.state, 'utf8'));
  if (state.id !== id || !safeId(state.task_id) || !['running', ...terminal].includes(state.status) || !Number.isInteger(state.pid) || state.pid < 1) throw new Error('execução não recuperável');
  try { process.kill(state.pid, 0); throw new Error('processo ainda ativo'); }
  catch (error) { if (error.code !== 'ESRCH') throw new Error('não foi comprovado que o processo encerrou'); }
  const lock = contained(p.root, `${state.task_id}.lock`);
  if (state.status === 'running') finishRun({ ...p, id, repo, lock }, { status: 'failed', reason_code: 'interrupted_no_replay' });
  else if (existsSync(lock) && JSON.parse(readFileSync(lock, 'utf8')).id === id) unlinkSync(lock);
  return inspectRun(repo, id);
}
