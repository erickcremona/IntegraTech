import {taskArchitectureTransition,verifyArchitectureOracles} from './architecture-oracles.mjs';
import {sourceRoot,sourceFile,linkedProject,ignoredSourcePath} from './project-locations.mjs';
import {assertSDDTask} from './sdd-workflow.mjs';
import { readFileSync, mkdirSync, existsSync, writeFileSync, unlinkSync, readdirSync, lstatSync, rmSync } from 'node:fs';
import { resolve, join, relative, isAbsolute } from 'node:path';
import { createHash } from 'node:crypto';
import { validateContract, validateAgainstSchema, loadSchema } from './contracts.mjs';
import { precheck, sha256 } from './governance.mjs';
import { checkPolicy } from './policy.mjs';
import { contained, assertNoLinks } from './paths.mjs';
import { inventory, fingerprint, generatedOutput } from './candidate.mjs';
import { atomicFileWrite } from './adoption-recovery.mjs';

const safeId = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(value);
const digest = value => createHash('sha256').update(value).digest('hex');
export function taskPaths(repo, id) {
  if (!safeId(id)) throw new Error('identificador inválido');
  const root = resolve(repo, 'qa-artifacts/loops');
  assertNoLinks(root);
  const dir = contained(root, id);
  return { root, dir, state: contained(dir, 'state.json'), lock: contained(root, `${id}.lock`) };
}
export function snapshot(repo, delegation) {
  const linked=linkedProject(repo),source=sourceRoot(repo);
  const documents=['project.json','references/project-state.json','references/business-context.json',...(linked?['project-link.json']:[])];
  const files = new Set(linked?[]:documents);
  for (const path of [...delegation.file_ownership.read, ...delegation.file_ownership.write]) {
    const full = path === '.' ? source : sourceFile(repo, path);
    const rel = relative(source, full);
    if (rel && (rel.startsWith('..') || isAbsolute(rel))) throw new Error('ownership fora do repositório');
    {
      const visit = (current, currentRel) => {
        assertNoLinks(current);
        if (!existsSync(current)) { files.add(currentRel); return; }
        const stat = lstatSync(current);
        if (stat.isDirectory()) {
          for (const child of readdirSync(current).sort()) {
            if(linked&&ignoredSourcePath(join(currentRel,child)))continue;
            if (['.git', 'node_modules', 'qa-artifacts', 'runtime-publish', '.superpowers'].includes(child)) continue;
            if (lstatSync(join(current, child)).isDirectory() && generatedOutput(current, child)) continue;
            visit(join(current, child), join(currentRel, child));
          }
        } else if (stat.isFile()) files.add(currentRel);
        else throw new Error('tipo de arquivo de ownership não permitido');
      };
      visit(full, path === '.' ? '' : path);
    }
  }
  const entries = [...files].sort().map(path => {
    const full = sourceFile(repo, path);
    return [path, existsSync(full) ? digest(readFileSync(full)) : null];
  });
  const controls=linked?documents.map(path=>{
    let bytes=readFileSync(contained(repo,path));
    if(path==='references/project-state.json'){const state=JSON.parse(bytes);delete state.workflow_status;delete state.coherence_path;bytes=JSON.stringify(state);}
    return [path,digest(bytes)];
  }):[];
  return digest(JSON.stringify({ entries, ...(linked?{controls}:{}), policy: sha256(readFileSync(new URL('../../fabrica/policy.json', import.meta.url), 'utf8')) }));
}
export function persist(paths, state) {
  atomicFileWrite(paths.state, JSON.stringify(state, null, 2) + '\n');
}

export function startTask({ repo, delegation, phase, provider }) {
  validateContract('delegation', delegation);
  if (!safeId(delegation.task_id)) throw new Error('identidade da tarefa inválida');
  if (!['toolkit', 'discovery', 'design', 'business'].includes(phase) || !['codex', 'claude', 'cursor'].includes(provider))
    throw new Error('fase ou provedor inválido');
  assertSDDTask({repo,delegation,phase,starting:true});
  const id = delegation.task_id;
  const paths = taskPaths(repo, id);
  mkdirSync(paths.root, { recursive: true });
  writeFileSync(paths.lock, JSON.stringify({ id, pid: process.pid }), { flag: 'wx' });
  try {
    if (existsSync(paths.state)) {
      const existing = JSON.parse(readFileSync(paths.state, 'utf8'));
      if (existing.id !== id || existing.task_id !== delegation.task_id
        || existing.provider !== provider || existing.phase !== phase
        || existing.delegation_sha256 !== digest(JSON.stringify(delegation)))
        throw new Error('identidade da tarefa já vinculada a outra delegação');
      return inspectTask({ repo, id });
    }
    const baselineFiles = inventory(repo);
    const oracleFiles = baselineFiles.map(item=>({...item})).filter(item => /(^|\/)tests?\//.test(item.path) || /\.(?:test|spec)\.(?:mjs|cjs|js)$/.test(item.path));
    taskArchitectureTransition(repo,delegation,baselineFiles);
    mkdirSync(paths.dir);
    for (const file of oracleFiles) {
      const target = contained(join(paths.dir, 'oracles'), file.path);
      mkdirSync(resolve(target, '..'), { recursive: true });
      const bytes = readFileSync(sourceFile(repo, file.path));
      if (fingerprint(bytes) !== file.sha256) throw new Error('oráculo alterado durante captura');
      writeFileSync(target, bytes, { flag: 'wx' });
    }
    if (fingerprint(inventory(repo)) !== fingerprint(baselineFiles)) throw new Error('insumos alterados durante criação');
    const state = {
      schema_version: 1, id, task_id: delegation.task_id, provider, phase,
      assigned_agent: delegation.assigned_agent, human_gate: delegation.human_gate,
      ownership: delegation.file_ownership,
      status: 'awaiting_gate', revision: 1,
      attempts: 0, correction_count: 0, snapshot: snapshot(repo, delegation),
      delegation_sha256: digest(JSON.stringify(delegation)), baseline_files: baselineFiles, oracle_files: oracleFiles, delegation, events: [
        { revision: 1, type: 'task_created', at: new Date().toISOString() }
      ]
    };
    validateAgainstSchema(loadSchema('task-run'), state);
    persist(paths, state);
    return state;
  } catch (error) {
    throw error;
  } finally { if (existsSync(paths.lock)) unlinkSync(paths.lock); }
}

export function inspectTask({ repo, id }) {
  const paths = taskPaths(repo, id);
  const state = JSON.parse(readFileSync(paths.state, 'utf8'));
  validateAgainstSchema(loadSchema('task-run'), state);
  if (state.id !== id || !Number.isInteger(state.revision) || !Array.isArray(state.events)
    || state.events.at(-1)?.revision !== state.revision) throw new Error('registro inválido');
  verifyArchitectureOracles(repo,state);
  return { ...state, snapshot_matches: snapshot(repo, { file_ownership: state.ownership }) === state.snapshot };
}

export function advanceTask({ repo, id, expectedRevision, event }) {
  const paths = taskPaths(repo, id);
  const lock = contained(paths.root, `${id}.transition.lock`);
  writeFileSync(lock, JSON.stringify({ id, pid: process.pid }), { flag: 'wx' });
  try {
    const state = inspectTask({ repo, id });
    if (state.revision !== expectedRevision) throw new Error('revisão divergente');
    if (!state.snapshot_matches) throw new Error('snapshot divergente');
    if (state.engineering) throw new Error('use os comandos de engenharia para o candidato');
    assertSDDTask({repo,delegation:state.delegation,phase:state.phase});
    if (event?.type !== 'gate_checked') throw new Error('transição não suportada');
    const decision = state.phase === 'toolkit'
      ? checkPolicy({ repo, action: 'implement_toolkit', agent: state.assigned_agent, phase: state.phase })
      : checkPolicy({ repo, action: 'implement', agent: state.assigned_agent, phase: state.phase });
    const gate = precheck(repo, state.phase);
    const ready = state.human_gate === 'none' && decision.status === 'allowed' && gate.status === 'ready';
    const nextStatus = ready && state.events.some(item => item.type === 'gate_checked' && item.result === 'ready')
      ? 'implementation_pending' : 'awaiting_gate';
    const { snapshot_matches, ...persisted } = state;
    const next = {
      ...persisted, status: nextStatus, revision: state.revision + 1,
      events: [...state.events, {
        revision: state.revision + 1, type: 'gate_checked',
        result: ready ? 'ready' : 'blocked',
        reason: ready ? gate.reason : state.human_gate !== 'none' ? 'human_gate_required' : decision.reason_code,
        at: new Date().toISOString()
      }]
    };
    validateAgainstSchema(loadSchema('task-run'), next);
    persist(paths, next);
    return next;
  } finally { if (existsSync(lock)) unlinkSync(lock); }
}

export function recoverTask({ repo, id }) {
  const paths = taskPaths(repo, id);
  const transitionLock = contained(paths.root, `${id}.transition.lock`);
  const creationLock = paths.lock;
  const recoverDeadLock = (lockPath, stage) => {
    let lock;
    try { lock = JSON.parse(readFileSync(lockPath, 'utf8')); }
    catch { throw new Error('lock inválido'); }
    if (lock.id !== id || !Number.isInteger(lock.pid) || lock.pid < 1) throw new Error('lock inválido');
    try {
      process.kill(lock.pid, 0);
      throw new Error(`processo da ${stage} ainda ativo`);
    } catch (error) {
      if (error.code !== 'ESRCH') throw new Error(`encerramento da ${stage} não confirmado`);
    }
    return lock;
  };
  if (existsSync(transitionLock)) {
    const lock = recoverDeadLock(transitionLock, 'transição');
    const state = inspectTask({ repo, id });
    if (state.engineering?.operation) {
      if (state.engineering.operation.kind === 'review') throw new Error('revisão interrompida: encerramento dos descendentes não comprovado; bloqueio preservado');
      if (state.engineering.operation.pid !== lock.pid || !['validating', 'reviewing'].includes(state.status)) throw new Error('operação interrompida divergente');
      const started = Date.parse(state.engineering.operation.started_at);
      if (!Number.isFinite(started)) throw new Error('operação interrompida inválida');
      state.engineering.spent_ms += Math.min(600000, Math.max(0, Date.now() - started));
      state.status = state.engineering.operation.kind === 'validation' ? 'validation_blocked' : 'review_blocked';
      delete state.engineering.operation;
      delete state.snapshot_matches;
      state.revision++;
      state.events.push({ revision: state.revision, type: 'operation_interrupted', at: new Date().toISOString() });
      validateAgainstSchema(loadSchema('task-run'), state);
      persist(paths, state);
    }
    unlinkSync(transitionLock);
    return inspectTask({ repo, id });
  }
  if (!existsSync(creationLock)) return inspectTask({ repo, id });
  recoverDeadLock(creationLock, 'criação');
  if (existsSync(paths.state)) {
    const state = inspectTask({ repo, id });
    unlinkSync(creationLock);
    return state;
  }
  if (existsSync(paths.dir)) {
    assertNoLinks(paths.dir);
    rmSync(paths.dir, { recursive: true });
  }
  unlinkSync(creationLock);
  return { id, status: 'recovered', stage: 'creation' };
}
