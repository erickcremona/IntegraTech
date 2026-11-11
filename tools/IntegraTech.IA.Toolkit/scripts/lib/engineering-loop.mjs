import {sourceRoot,sourceFile} from './project-locations.mjs';
import {assertSDDTask} from './sdd-workflow.mjs';
import { inspectDesign } from './interface-design.mjs';
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { resolve, relative, isAbsolute } from 'node:path';
import { inventory, fingerprint, changes, owns } from './candidate.mjs';
import { inspectTask, taskPaths, persist, snapshot } from './task-loop.mjs';
import { validateAgainstSchema, loadSchema, validateContract } from './contracts.mjs';
import { precheck } from './governance.mjs';
import { checkPolicy } from './policy.mjs';
import { dispatch } from './dispatcher.mjs';
import { contained, assertNoLinks, assertSanitized } from './paths.mjs';
import { inspectInterface } from './interface-profile.mjs';
import { validateIsolated } from './isolated-validation.mjs';

const limits = Object.freeze({ attempts: 3, corrections: 2, active_ms: 600000 });
const profiles = ['node-tests-v1', 'dotnet-offline-v1'];
const baseReviewTypes = Object.freeze(['code', 'security']);
function requiredReviewTypes(repo,state,changed){
 const registered=existsSync(contained(repo,'references/interface-profile.json'));
 if(!registered){
  if(state.assigned_agent==='ui-engineer')throw new Error('agente UI exige especialização aprovada');
  return [...baseReviewTypes];
 }
 const meta=inspectInterface(repo);
 const affectsUI=state.assigned_agent==='ui-engineer'||changed.some(path=>owns(meta.selection.source_roots,path));
 if(affectsUI)inspectDesign(repo);
 return affectsUI?[...baseReviewTypes,'ux_accessibility']:[...baseReviewTypes];
}
function gate(repo, state) {
  validateContract('delegation', state.delegation);
  assertSDDTask({repo,delegation:state.delegation,phase:state.phase});
  if (fingerprint(state.delegation) !== state.delegation_sha256 || state.delegation.task_id !== state.id)
    throw new Error('delegação divergente');
  if (state.human_gate !== 'none' || precheck(repo, state.phase).status !== 'ready'
    || checkPolicy({ repo, action: state.phase === 'toolkit' ? 'implement_toolkit' : 'implement', agent: state.assigned_agent, phase: state.phase }).status !== 'allowed')
    throw new Error('gate ou política bloqueado');
}
function load(repo, id, expectedRevision) {
  const state = inspectTask({ repo, id });
  if (state.revision !== expectedRevision) throw new Error('revisão divergente');
  if (!state.baseline_files || !state.delegation) throw new Error('registro legado: inicie nova tarefa com inventário');
  gate(repo, state);
  const { snapshot_matches, ...stored } = state;
  return stored;
}
function save(repo, state, type) {
  state.revision++;
  state.events.push({ revision: state.revision, type, at: new Date().toISOString() });
  validateAgainstSchema(loadSchema('task-run'), state);
  persist(taskPaths(repo, state.id), state);
  return state;
}
function acquire(repo, id) {
  const paths = taskPaths(repo, id);
  if (existsSync(paths.lock)) throw new Error('criação da tarefa ainda bloqueada');
  const lock = contained(paths.root, `${id}.transition.lock`);
  writeFileSync(lock, JSON.stringify({ id, pid: process.pid }), { flag: 'wx' });
  return () => unlinkSync(lock);
}
function current(repo, state) {
  return fingerprint(inventory(repo)) === state.engineering.candidate_sha256;
}
function remaining(state) {
  const left = limits.active_ms - state.engineering.spent_ms;
  if (left <= 0) throw new Error('orçamento esgotado');
  return Math.min(left, 120000);
}
export function acceptCandidate({ repo, id, expectedRevision, profile }) {
  const release = acquire(repo, id);
  try {
    if (!profiles.includes(profile)) throw new Error('perfil não suportado');
    const state = load(repo, id, expectedRevision);
    if (!['implementation_pending', 'correction_pending', 'validation_blocked', 'review_blocked', 'ready_for_delivery'].includes(state.status)) throw new Error('estado não permite candidato');
    const files = inventory(repo);
    const changed = changes(state.baseline_files, files);
    if (changed.some(path => !owns(state.ownership.write, path))) throw new Error('alterações fora do ownership ou insumos alterados');
    const candidateHash = fingerprint(files);
    if (state.engineering?.history.includes(candidateHash)) throw new Error('candidato sem progresso ou repetido');
    if (state.engineering && (state.correction_count >= limits.corrections || state.attempts >= limits.attempts)) throw new Error('orçamento de correções esgotado');
    if (state.engineering) { remaining(state); state.correction_count++; }
    state.engineering = {
      version: 1, profile, profile_sha256: fingerprint(readFileSync(new URL('../../fabrica/validation-profiles.json', import.meta.url))),
      candidate_sha256: candidateHash, files, changed_files: changed,
      required_reviews: requiredReviewTypes(repo,state,changed), reviews: [], review_attempts: [], validation: null,
      history: [...(state.engineering?.history ?? []), candidateHash],
      spent_ms: state.engineering?.spent_ms ?? 0, automatic_executor: false
    };
    state.snapshot = snapshot(repo, { file_ownership: state.ownership });
    state.status = 'validation_pending';
    return save(repo, state, 'candidate_accepted');
  } finally { release(); }
}
function uiValidationChecks(repo,state){
 if(!state.engineering.required_reviews.includes('ux_accessibility'))return [];
 const meta=inspectInterface(repo);
 return meta.selection.platform==='web'?['ui_build','ui_browser','ui_accessibility']:['ui_build','ui_native'];
}
function validValidation(value, profile, extraChecks=[]) {
  return value?.status === 'passed' && value.isolation === 'verified'
    && Array.isArray(value.checks) && value.checks.length > 0 && value.checks.every(check => check.code === 0)
    && ['inventory', 'frozen_oracles', 'isolation_canaries', profile,...extraChecks].every(id => value.checks.some(check => check.id === id && check.code === 0))
    && value.environment && typeof value.environment.platform === 'string' && typeof value.environment.runtime === 'string';
}
function sanitizeValidation(result, profile, extraChecks=[]) {
  const status = validValidation(result, profile, extraChecks) ? 'passed' : result?.status === 'failed' && result.isolation === 'verified' ? 'failed' : 'blocked';
  const checks = Array.isArray(result?.checks) ? result.checks.slice(0, 50).map(item => ({ id: /^[a-z0-9_-]{1,80}$/.test(item.id) ? item.id : 'criterion', code: Number.isInteger(item.code) ? item.code : null })) : [];
  return { status, test_files:Array.isArray(result?.test_files)?result.test_files.filter(item=>typeof item.path==='string'&&typeof item.sha256==='string').slice(0,2048):[], reason_code: typeof result?.reason_code === 'string' && /^[a-z0-9_]{1,100}$/.test(result.reason_code) ? result.reason_code : status === 'blocked' ? 'validation_unavailable_or_candidate_changed' : 'criteria_observed', isolation: result?.isolation === 'verified' ? 'verified' : 'unverified', checks,
    environment: { platform: typeof result?.environment?.platform === 'string' && /^[a-zA-Z0-9._-]{1,100}$/.test(result.environment.platform) ? result.environment.platform : 'unknown', runtime: typeof result?.environment?.runtime === 'string' && /^[a-zA-Z0-9._-]{1,100}$/.test(result.environment.runtime) ? result.environment.runtime : 'unknown' } };
}
export async function validateCandidate({ repo, id, expectedRevision, validator = validateIsolated }) {
  const release = acquire(repo, id);
  try {
    const state = load(repo, id, expectedRevision);
    if (!['validation_pending', 'validation_blocked'].includes(state.status)) throw new Error('validação não permitida');
    if (!current(repo, state) || !inspectTask({ repo, id }).snapshot_matches) throw new Error('candidato ou insumos divergentes');
    if (state.attempts >= limits.attempts) throw new Error('orçamento de tentativas esgotado');
    if (fingerprint(readFileSync(new URL('../../fabrica/validation-profiles.json', import.meta.url))) !== state.engineering.profile_sha256) throw new Error('perfil alterado');
    const timeoutMs = remaining(state);
    const extraChecks=uiValidationChecks(repo,state);
    state.status = 'validating'; state.attempts++;
    state.engineering.operation = { kind: 'validation', started_at: new Date().toISOString(), pid: process.pid };
    save(repo, state, 'validation_started');
    const started = performance.now();
    let observed;
    try {
      const files = Object.fromEntries(state.engineering.files.filter(item => owns([...state.ownership.read, ...state.ownership.write], item.path)).map(item => [item.path, item.sha256]));
      observed = await validator({ repo:sourceRoot(repo), files, profile: state.engineering.profile, timeoutMs, requestedTests:state.delegation.sdd?state.delegation.evidence_required:[], oracles: { root: contained(taskPaths(repo, id).dir, 'oracles'), files: Object.fromEntries((state.oracle_files ?? []).map(item => [item.path, item.sha256])) } });
      gate(repo, state);
      if (!current(repo, state) || !inspectTask({ repo, id }).snapshot_matches) observed = { status: 'blocked' };
    } catch { observed = { status: 'blocked' }; }
    state.engineering.spent_ms += Math.ceil(performance.now() - started);
    delete state.engineering.operation;
    const evidence = sanitizeValidation(observed, state.engineering.profile, extraChecks);
    state.engineering.validation = { ...evidence, candidate_sha256: state.engineering.candidate_sha256, oracle_sha256: fingerprint(state.oracle_files ?? []), profile_sha256: state.engineering.profile_sha256 };
    state.status = evidence.status === 'passed' ? 'review_pending' : evidence.status === 'failed' ? 'correction_pending' : 'validation_blocked';
    return save(repo, state, 'validation_finished');
  } finally { release(); }
}
export async function reviewCandidate({ repo, id, expectedRevision, dispatcher = dispatch, files: requestedFiles }) {
  const release = acquire(repo, id);
  try {
    const state = load(repo, id, expectedRevision);
    if (!['review_pending', 'review_blocked'].includes(state.status) || state.engineering.validation?.status !== 'passed') throw new Error('validação observada exigida');
    if (!current(repo, state) || !inspectTask({ repo, id }).snapshot_matches) throw new Error('parecer ou candidato obsoleto');
    const reviewTypes=requiredReviewTypes(repo,state,state.engineering.changed_files);
    if (JSON.stringify(reviewTypes)!==JSON.stringify(state.engineering.required_reviews)) throw new Error('tipos de revisão divergentes');
    const files = [...new Set(requestedFiles ?? state.engineering.changed_files)].sort();
    if (state.engineering.changed_files.some(path => !files.includes(path)) || files.some(path => !owns([...state.ownership.read, ...state.ownership.write], path)))
      throw new Error('pacote deve cobrir todas as alterações e respeitar ownership');
    const hashes = Object.fromEntries(state.engineering.files.map(item => [item.path, item.sha256]));
    const removed = files.filter(path => !Object.hasOwn(hashes, path));
    if (removed.some(path => !state.baseline_files.some(item => item.path === path))) throw new Error('arquivo de revisão inexistente');
    const candidate = { sha256: state.engineering.candidate_sha256, hashes, removed };
    const expectedPackageHash = fingerprint(files.map(path => ({ path, content: removed.includes(path) ? null : readFileSync(sourceFile(repo, path), 'utf8') })));
    // Dispatcher bounds and sanitizes its package. Never silently truncate a review.
    if (!files.length || files.length > 80) throw new Error('pacote deve conter de 1 a 80 arquivos; reduza o ownership de leitura');
    if (state.engineering.review_attempts?.length) throw new Error('revisão já tentada para este candidato; repetição bloqueada');
    state.engineering.reviews = [];
    state.status = 'reviewing';
    state.engineering.operation = { kind: 'review', started_at: new Date().toISOString(), pid: process.pid };
    remaining(state); save(repo, state, 'review_started');
    const started = performance.now();
    try {
      for (const type of reviewTypes) {
        const task = { ...state.delegation, task_id: `review-${fingerprint({ id, candidate: state.engineering.candidate_sha256, type }).slice(0, 32)}`, assigned_agent: type === 'code' ? 'code-reviewer' : type === 'security' ? 'security-reviewer' : 'ux-accessibility-reviewer', file_ownership: { read: files, write: [] } };
        const timeLeft = limits.active_ms - state.engineering.spent_ms - Math.ceil(performance.now() - started);
        if (timeLeft < 100) throw new Error('orçamento esgotado');
        state.engineering.review_attempts.push({ type, task_id: task.task_id, candidate_sha256: state.engineering.candidate_sha256 });
        persist(taskPaths(repo, id), state);
        const response = await dispatcher({ repo, task, candidate, phase: state.phase, provider: state.provider, files, timeoutMs: Math.min(120000, timeLeft) });
        gate(repo, state);
        if (!current(repo, state) || !inspectTask({ repo, id }).snapshot_matches) throw new Error('snapshot divergente');
        if (response.status !== 'completed' || typeof response.run_id !== 'string' || response.candidate_sha256 !== candidate.sha256 || response.package_sha256 !== expectedPackageHash) { state.status = 'review_blocked'; break; }
        const path = relative(resolve(repo), resolve(response.output)).replaceAll('\\', '/');
        if (!path.startsWith('qa-artifacts/') || isAbsolute(path)) throw new Error('parecer fora dos artefatos');
        const output = contained(repo, path); assertNoLinks(output);
        const text = readFileSync(output, 'utf8'); assertSanitized(text);
        const report = JSON.parse(text); validateContract('review', report, task.task_id);
        if (report.review_type !== type || report.verdict !== response.verdict) throw new Error('parecer divergente');
        state.engineering.reviews.push({ type, run_id: response.run_id, path, sha256: fingerprint(text), package_sha256: expectedPackageHash, candidate_sha256: state.engineering.candidate_sha256, verdict: report.verdict });
        // Findings require correction and a fresh independent review; no automatic risk acceptance.
        if (report.verdict === 'blocked') { state.status = 'review_blocked'; break; }
        if (report.verdict !== 'approved' || report.findings.length) { state.status = 'correction_pending'; break; }
      }
      if (state.status === 'reviewing') state.status = state.engineering.reviews.length === reviewTypes.length ? 'ready_for_delivery' : 'review_blocked';
    } catch { state.status = 'review_blocked'; }
    state.engineering.spent_ms += Math.ceil(performance.now() - started);
    delete state.engineering.operation;
    return save(repo, state, 'review_finished');
  } finally { release(); }
}
export function engineeringStatus({ repo, id }) {
  const state = inspectTask({ repo, id });
  let deliveryValid = false;
  try {
    gate(repo, state);
    deliveryValid = state.status === 'ready_for_delivery' && state.snapshot_matches && current(repo, state)
      && state.engineering.validation.status === 'passed'
      && validValidation(state.engineering.validation, state.engineering.profile, uiValidationChecks(repo,state))
      && state.engineering.validation.candidate_sha256 === state.engineering.candidate_sha256
      && state.engineering.validation.oracle_sha256 === fingerprint(state.oracle_files ?? [])
      && (state.oracle_files ?? []).every(item => fingerprint(readFileSync(contained(contained(taskPaths(repo, id).dir, 'oracles'), item.path))) === item.sha256)
      && state.engineering.profile_sha256 === fingerprint(readFileSync(new URL('../../fabrica/validation-profiles.json', import.meta.url)))
      && JSON.stringify(requiredReviewTypes(repo,state,state.engineering.changed_files))===JSON.stringify(state.engineering.required_reviews)
      && state.engineering.required_reviews.every(type => state.engineering.reviews.some(item => item.type === type && item.verdict === 'approved' && item.candidate_sha256 === state.engineering.candidate_sha256 && fingerprint(readFileSync(contained(repo, item.path))) === item.sha256));
  } catch { deliveryValid = false; }
  return { ...state, effective_status: state.status === 'ready_for_delivery' && !deliveryValid ? 'stale' : state.status, delivery_valid: deliveryValid, automatic_executor: false };
}

export function handoffTask({ repo, id, expectedRevision, provider }) {
  const release = acquire(repo, id);
  try {
    if (!['codex', 'claude', 'cursor'].includes(provider)) throw new Error('provedor inválido');
    const state = load(repo, id, expectedRevision);
    if (state.engineering?.operation || !inspectTask({ repo, id }).snapshot_matches || state.engineering && !current(repo, state)) throw new Error('snapshot ou candidato divergente');
    if (provider === state.provider) return state;
    state.provider = provider;
    return save(repo, state, 'provider_changed');
  } finally { release(); }
}
