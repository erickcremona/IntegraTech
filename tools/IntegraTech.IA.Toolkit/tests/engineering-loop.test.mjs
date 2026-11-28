import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { startTask, advanceTask } from '../scripts/lib/task-loop.mjs';
import { fingerprint } from '../scripts/lib/candidate.mjs';
import * as engineering from '../scripts/lib/engineering-loop.mjs';
import {inventory,changes,owns} from '../scripts/lib/candidate.mjs';

function fixture({ includeTest = true, architectureImpact = null } = {}) {
  const repo = mkdtempSync(join(tmpdir(), 'engineering-loop-'));
  mkdirSync(join(repo, 'src')); mkdirSync(join(repo, 'references'));
  writeFileSync(join(repo, 'src/main.mjs'), 'export const value = 1;');
  if (includeTest) writeFileSync(join(repo, 'src/main.test.mjs'), "import test from 'node:test'; test('original assertion', () => {});");
  writeFileSync(join(repo, 'references/project-state.json'), JSON.stringify({ scope_status: 'pending', plan_gate: 'pending' }));
  writeFileSync(join(repo, 'references/business-context.json'), '{}');
  const delegation = { schema_version: 1, task_id: 'cycle', objective: 'Maintain test fixture', business_context: '', technical_context: '', scope: ['src'], out_of_scope: [], assigned_agent: 'platform-engineer', supporting_agents: [], required_inputs: [], expected_deliverables: ['code'], constraints: [], file_ownership: { read: ['.'], write: ['src'] }, risks: [], acceptance_criteria: ['tests pass'], validation_commands: [], evidence_required: [], deadline_or_priority: 'normal', human_gate: 'none', ...(architectureImpact?{sdd:{plan_sha256:'a'.repeat(64),task_id:'architecture-task',architecture_impact:architectureImpact}}:{}) };
  startTask({ repo, delegation, phase: 'toolkit', provider: 'codex' });
  advanceTask({ repo, id: 'cycle', expectedRevision: 1, event: { type: 'gate_checked' } });
  advanceTask({ repo, id: 'cycle', expectedRevision: 2, event: { type: 'gate_checked' } });
  return { repo, id: 'cycle', expectedRevision: 3 };
}
const observed = async () => ({ status: 'passed', isolation: 'unverified', execution_mode: 'host_controlled', checks: ['inventory', 'frozen_oracles', 'host_controls', 'node-tests-v1'].map(id => ({ id, code: 0 })), environment: { platform: 'synthetic-test', runtime: 'test' } });
const reviewer = async ({ repo, task, files, candidate }) => {
  const path = join(repo, 'qa-artifacts', `${task.task_id}.json`);
  const report = { schema_version: 1, task_id: task.task_id, review_type: task.assigned_agent === 'data-migration-reviewer' ? 'data' : task.technical_context.includes('Revisão arquitetural do nível') ? 'architecture' : task.assigned_agent === 'code-reviewer' ? 'code' : 'security', verdict: 'approved', findings: [], residual_risk: '' };
  writeFileSync(path, JSON.stringify(report));
  return { status: 'completed', verdict: report.verdict, output: path, run_id: task.task_id, candidate_sha256: candidate.sha256, package_sha256: fingerprint(files.map(path => ({ path, content: candidate.removed.includes(path) ? null : readFileSync(join(repo, path), 'utf8') }))) };
};
function candidate(f) {
  writeFileSync(join(f.repo, 'src/main.mjs'), 'export const value = 2;');
  return engineering.acceptCandidate({ ...f, profile: 'node-tests-v1' });
}

test('candidate detects additions/deletions and rejects changes outside original ownership', () => {
  const f = fixture();
  try {
    rmSync(join(f.repo, 'src/main.mjs'));
    writeFileSync(join(f.repo, 'src/new.mjs'), 'export const value = 3;');
    const state = engineering.acceptCandidate({ ...f, profile: 'node-tests-v1' });
    assert.deepEqual(state.engineering.changed_files, ['src/main.mjs', 'src/new.mjs']);
    writeFileSync(join(f.repo, 'references/project-state.json'), '{"changed":true}');
    assert.throws(() => engineering.acceptCandidate({ ...f, expectedRevision: state.revision, profile: 'node-tests-v1' }), /ownership|insumos|gate/);
  } finally { rmSync(f.repo, { recursive: true, force: true }); }
});

test('loop inventory includes large local documentation and still detects authorized source changes',()=>{
 const f=fixture();
 try{
  mkdirSync(join(f.repo,'docs'),{recursive:true});
  const attachment=Buffer.alloc(1800*1024,0x41);writeFileSync(join(f.repo,'docs/local-attachment.bin'),attachment);
  const baseline=inventory(f.repo);
  assert.equal(baseline.find(item=>item.path==='docs/local-attachment.bin').sha256,fingerprint(attachment));
  writeFileSync(join(f.repo,'src/main.mjs'),'export const value = 3;');
  const authorized=changes(baseline,inventory(f.repo));
  assert.deepEqual(authorized,['src/main.mjs']);assert.equal(owns(['src'],authorized[0]),true);
  writeFileSync(join(f.repo,'docs/local-attachment.bin'),Buffer.alloc(1800*1024,0x42));
  const outsideOwnership=changes(baseline,inventory(f.repo));
  assert.ok(outsideOwnership.includes('docs/local-attachment.bin'));assert.equal(owns(['src'],'docs/local-attachment.bin'),false);
 }finally{rmSync(f.repo,{recursive:true,force:true});}
});

test('observed validation and both fixed reviews are required for delivery; edits invalidate it', async () => {
  const f = fixture();
  try {
    const accepted = candidate(f);
    const validated = await engineering.validateCandidate({ ...f, expectedRevision: accepted.revision, validator: observed });
    assert.equal(validated.status, 'review_pending');
    const reviewed = await engineering.reviewCandidate({ ...f, expectedRevision: validated.revision, dispatcher: reviewer });
    assert.equal(reviewed.status, 'ready_for_delivery');
    assert.deepEqual(reviewed.engineering.reviews.map(item => item.type), ['code', 'security']);
    writeFileSync(join(f.repo, 'src/main.mjs'), 'changed after review');
    assert.equal(engineering.engineeringStatus(f).delivery_valid, false);
  } finally { rmSync(f.repo, { recursive: true, force: true }); }
});

test('N2+ architecture impact adds an independent architecture review and persistence adds data review', async () => {
  const impact = { classification: 'N3', rationale: 'A tarefa altera a persistência.', signals: ['data_persistence'], affected_modules: ['Orders'], evidence_requirement_ids: ['REQ-1'], decision_refs: ['references/architecture-decision.json'] };
  const f = fixture({ architectureImpact: impact });
  try {
    const accepted = candidate(f);
    const validated = await engineering.validateCandidate({ ...f, expectedRevision: accepted.revision, validator: observed });
    const reviewed = await engineering.reviewCandidate({ ...f, expectedRevision: validated.revision, dispatcher: reviewer });
    assert.equal(reviewed.status, 'ready_for_delivery');
    assert.deepEqual(reviewed.engineering.reviews.map(item => item.type), ['code', 'security', 'architecture', 'data']);
  } finally { rmSync(f.repo, { recursive: true, force: true }); }
});

test('unavailable isolation persists blocked status without accepting claimed success', async () => {
  const f = fixture();
  try {
    const accepted = candidate(f);
    const blocked = await engineering.validateCandidate({ ...f, expectedRevision: accepted.revision, validator: async () => ({ status: 'passed', isolation: 'unverified', checks: [] }) });
    assert.equal(blocked.status, 'validation_blocked');
    assert.equal(blocked.engineering.validation.status, 'blocked');
    await assert.rejects(engineering.reviewCandidate({ ...f, expectedRevision: blocked.revision, dispatcher: reviewer }));
  } finally { rmSync(f.repo, { recursive: true, force: true }); }
});

test('failed test requires a changed candidate; corrections consume a persistent budget', async () => {
  const f = fixture();
  try {
    let state = candidate(f);
    state = await engineering.validateCandidate({ ...f, expectedRevision: state.revision, validator: async () => ({ ...(await observed()), status: 'failed', checks: [{ id: 'node-tests', code: 1 }] }) });
    assert.equal(state.status, 'correction_pending');
    assert.throws(() => engineering.acceptCandidate({ ...f, expectedRevision: state.revision, profile: 'node-tests-v1' }), /progresso/);
    for (let i = 0; i < 2; i++) {
      writeFileSync(join(f.repo, 'src/main.mjs'), `export const value = ${i + 3};`);
      state = engineering.acceptCandidate({ ...f, expectedRevision: state.revision, profile: 'node-tests-v1' });
      state = await engineering.validateCandidate({ ...f, expectedRevision: state.revision, validator: async () => ({ ...(await observed()), status: 'failed', checks: [{ id: 'node-tests', code: 1 }] }) });
    }
    writeFileSync(join(f.repo, 'src/main.mjs'), 'last');
    assert.throws(() => engineering.acceptCandidate({ ...f, expectedRevision: state.revision, profile: 'node-tests-v1' }), /orçamento/);
  } finally { rmSync(f.repo, { recursive: true, force: true }); }
});

test('negative review and changes during validation cannot yield delivery', async () => {
  const f = fixture();
  try {
    let state = candidate(f);
    state = await engineering.validateCandidate({ ...f, expectedRevision: state.revision, validator: async () => { writeFileSync(join(f.repo, 'src/main.mjs'), 'concurrent'); return observed(); } });
    assert.equal(state.status, 'validation_blocked');
    state = engineering.acceptCandidate({ ...f, expectedRevision: state.revision, profile: 'node-tests-v1' });
    state = await engineering.validateCandidate({ ...f, expectedRevision: state.revision, validator: observed });
    state = await engineering.reviewCandidate({ ...f, expectedRevision: state.revision, dispatcher: async args => { const result = await reviewer(args); const report = JSON.parse(readFileSync(result.output)); report.verdict = 'changes_required'; writeFileSync(result.output, JSON.stringify(report)); return { ...result, verdict: 'changes_required' }; } });
    assert.equal(state.status, 'correction_pending');
    assert.equal(engineering.engineeringStatus(f).delivery_valid, false);
  } finally { rmSync(f.repo, { recursive: true, force: true }); }
});

test('a changed or removed review artifact invalidates delivery', async () => {
  const f = fixture();
  try {
    let state = candidate(f);
    state = await engineering.validateCandidate({ ...f, expectedRevision: state.revision, validator: observed });
    state = await engineering.reviewCandidate({ ...f, expectedRevision: state.revision, dispatcher: reviewer });
    rmSync(join(f.repo, state.engineering.reviews[0].path));
    assert.equal(engineering.engineeringStatus(f).delivery_valid, false);
  } finally { rmSync(f.repo, { recursive: true, force: true }); }
});

test('concurrent operations cannot dispatch twice; budgets survive inspection', async () => {
  const f = fixture();
  try {
    const state = candidate(f);
    let resolveValidation;
    const validation = engineering.validateCandidate({ ...f, expectedRevision: state.revision, validator: () => new Promise(resolve => { resolveValidation = resolve; }) });
    await assert.rejects(engineering.validateCandidate({ ...f, expectedRevision: state.revision, validator: observed }));
    resolveValidation(await observed());
    const final = await validation;
    assert.equal(engineering.engineeringStatus(f).attempts, 1);
    assert.equal(final.status, 'review_pending');
  } finally { rmSync(f.repo, { recursive: true, force: true }); }
});

test('CLI exposes candidate and isolated validation without caller-provided commands or success', async () => {
  const { main } = await import('../scripts/toolkit.mjs');
  const f = fixture({ includeTest: false });
  try {
    writeFileSync(join(f.repo, 'src/main.mjs'), 'export const value = 3;');
    const state = await main(['loop-candidate', '--repo', f.repo, '--id', f.id, '--revision', '3', '--profile', 'node-tests-v1']);
    assert.equal(state.status, 'validation_pending');
    await assert.rejects(main(['loop-validate', '--repo', f.repo, '--id', f.id, '--revision', String(state.revision), '--passed']));
    const result = await main(['loop-validate', '--repo', f.repo, '--id', f.id, '--revision', String(state.revision)]);
    assert.equal(result.status, 'validation_blocked'); // fixture has no test files; no arbitrary shell fallback
    assert.equal((await main(['loop-status', '--repo', f.repo, '--id', f.id])).delivery_valid, false);
  } finally { rmSync(f.repo, { recursive: true, force: true }); }
});

test('recovery reconciles an interrupted validation without reexecuting candidate commands', async () => {
  const { recoverTask } = await import('../scripts/lib/task-loop.mjs');
  const f = fixture();
  try {
    const state = candidate(f);
    const path = join(f.repo, 'qa-artifacts/loops/cycle/state.json');
    state.status = 'validating';
    state.engineering.operation = { kind: 'validation', pid: 2147483647, started_at: new Date().toISOString() };
    writeFileSync(path, JSON.stringify(state));
    writeFileSync(join(f.repo, 'qa-artifacts/loops/cycle.transition.lock'), JSON.stringify({ id: f.id, pid: 2147483647 }));
    const recovered = recoverTask(f);
    assert.equal(recovered.status, 'validation_blocked');
    assert.equal(recovered.engineering.operation, undefined);
    assert.equal(recovered.events.at(-1).type, 'operation_interrupted');
  } finally { rmSync(f.repo, { recursive: true, force: true }); }
});

test('same candidate never repeats completed or blocked external review attempts', async () => {
  const f = fixture();
  try {
    let state = candidate(f);
    state = await engineering.validateCandidate({ ...f, expectedRevision: state.revision, validator: observed });
    let calls = 0;
    state = await engineering.reviewCandidate({ ...f, expectedRevision: state.revision, dispatcher: async args => { calls++; return args.task.assigned_agent === 'code-reviewer' ? reviewer(args) : { status: 'blocked' }; } });
    assert.equal(state.status, 'review_blocked');
    assert.equal(calls, 2);
    await assert.rejects(engineering.reviewCandidate({ ...f, expectedRevision: state.revision, dispatcher: async () => { calls++; return { status: 'blocked' }; } }), /tentada|repeti/);
    assert.equal(calls, 2);
  } finally { rmSync(f.repo, { recursive: true, force: true }); }
});

test('interrupted review stays locked when descendant termination cannot be established', async () => {
  const { recoverTask } = await import('../scripts/lib/task-loop.mjs');
  const f = fixture();
  try {
    const state = candidate(f);
    state.status = 'reviewing'; state.engineering.operation = { kind: 'review', pid: 2147483647, started_at: new Date().toISOString() };
    writeFileSync(join(f.repo, 'qa-artifacts/loops/cycle/state.json'), JSON.stringify(state));
    writeFileSync(join(f.repo, 'qa-artifacts/loops/cycle.transition.lock'), JSON.stringify({ id: f.id, pid: 2147483647 }));
    assert.throws(() => recoverTask(f), /revisão|descendentes/);
    assert.equal(engineering.engineeringStatus(f).status, 'reviewing');
  } finally { rmSync(f.repo, { recursive: true, force: true }); }
});

test('weakening a candidate test preserves the original assertion passed to isolated validation', async () => {
  const f = fixture();
  try {
    const original = readFileSync(join(f.repo, 'src/main.test.mjs'), 'utf8');
    writeFileSync(join(f.repo, 'src/main.test.mjs'), '// weakened assertion');
    const state = engineering.acceptCandidate({ ...f, profile: 'node-tests-v1' });
    const result = await engineering.validateCandidate({ ...f, expectedRevision: state.revision, validator: async ({ oracles }) => {
      assert.equal(readFileSync(join(oracles.root, 'src/main.test.mjs'), 'utf8'), original);
      assert.equal(oracles.files['src/main.test.mjs'], fingerprint(original));
      return observed();
    } });
    assert.equal(result.status, 'review_pending');
  } finally { rmSync(f.repo, { recursive: true, force: true }); }
});

test('claimed passing validation without the frozen oracle criterion is blocked', async () => {
  const f = fixture();
  try {
    const state = candidate(f);
    const result = await engineering.validateCandidate({ ...f, expectedRevision: state.revision, validator: async () => ({ ...(await observed()), checks: [{ id: 'node-tests-v1', code: 0 }] }) });
    assert.equal(result.status, 'validation_blocked');
  } finally { rmSync(f.repo, { recursive: true, force: true }); }
});

test('explicit provider handoff preserves candidate and observed validation without replay', async () => {
  const f = fixture();
  try {
    let state = candidate(f);
    state = await engineering.validateCandidate({ ...f, expectedRevision: state.revision, validator: observed });
    const handed = engineering.handoffTask({ ...f, expectedRevision: state.revision, provider: 'cursor' });
    assert.equal(handed.provider, 'cursor');
    assert.equal(handed.status, 'review_pending');
    assert.equal(handed.engineering.candidate_sha256, state.engineering.candidate_sha256);
    assert.equal(handed.attempts, state.attempts);
    assert.equal(handed.events.at(-1).type, 'provider_changed');
    writeFileSync(join(f.repo, 'src/main.mjs'), 'stale');
    assert.throws(() => engineering.handoffTask({ ...f, expectedRevision: handed.revision, provider: 'codex' }), /snapshot|candidato/);
  } finally { rmSync(f.repo, { recursive: true, force: true }); }
});

test('Node bin sources are inventoried and edits invalidate delivery while dotnet outputs remain excluded', async () => {
  const f = fixture();
  try {
    mkdirSync(join(f.repo,'bin'));writeFileSync(join(f.repo,'bin/cli.mjs'),'console.log(1)');
    assert.throws(() => engineering.acceptCandidate({ ...f, profile: 'node-tests-v1' }), /ownership/);
    const { inventory } = await import('../scripts/lib/candidate.mjs');
    const before = fingerprint(inventory(f.repo));writeFileSync(join(f.repo,'bin/cli.mjs'),'console.log(2)');
    assert.notEqual(fingerprint(inventory(f.repo)),before);
    mkdirSync(join(f.repo,'src/app'));writeFileSync(join(f.repo,'src/app/app.csproj'),'<Project />');
    mkdirSync(join(f.repo,'src/app/bin'));writeFileSync(join(f.repo,'src/app/bin/output.dll'),'build output');
    assert.equal(inventory(f.repo).some(item=>item.path==='src/app/bin/output.dll'),false);
  } finally { rmSync(f.repo, { recursive: true, force: true }); }
});

test('independent code and security reviews start together and settle before release',async()=>{
 const f=fixture();try{
  let state=candidate(f);state=await engineering.validateCandidate({...f,expectedRevision:state.revision,validator:observed});
  const started=[];let release;const barrier=new Promise(resolve=>{release=resolve;});
  const pending=engineering.reviewCandidate({...f,expectedRevision:state.revision,dispatcher:async args=>{started.push(args.task.assigned_agent);if(started.length===2)release();await barrier;return reviewer(args);}});
  await new Promise(resolve=>setImmediate(resolve));
  const simultaneous=[...started];release();
  state=await pending;assert.deepEqual(simultaneous,['code-reviewer','security-reviewer']);assert.equal(state.status,'ready_for_delivery');assert.equal(state.engineering.review_attempts.length,2);
 }finally{rmSync(f.repo,{recursive:true,force:true});}
});

test('rejected concurrent review waits for its peer and preserves blocked outcome',async()=>{
 const f=fixture();try{
  let state=candidate(f);state=await engineering.validateCandidate({...f,expectedRevision:state.revision,validator:observed});
  let release,entered;const enteredPromise=new Promise(resolve=>{entered=resolve;});const barrier=new Promise(resolve=>{release=resolve;});let finished=false;
  const pending=engineering.reviewCandidate({...f,expectedRevision:state.revision,dispatcher:async args=>{if(args.task.assigned_agent==='code-reviewer')throw Error('synthetic failure');entered();await barrier;return reviewer(args);}}).then(result=>{finished=true;return result;});
  await new Promise(resolve=>setImmediate(resolve));
  const earlyFinish=finished;release();
  state=await pending;assert.equal(earlyFinish,false);assert.equal(state.status,'review_blocked');assert.equal(state.engineering.review_attempts.length,2);assert.ok(state.engineering.reviews.some(r=>r.type==='security'));
 }finally{rmSync(f.repo,{recursive:true,force:true});}
});
