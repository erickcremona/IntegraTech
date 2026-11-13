import {initializeRelease,checkRelease,deployRelease,releaseCriteria,releaseEvidenceBinding} from '../scripts/lib/release-workflow.mjs';
import {runCoherenceChecks,completeCoherence,repositorySnapshot} from '../scripts/lib/domain-workflow.mjs';
import {attachProject,attachedProject} from '../scripts/lib/project-attachment.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { specialistFiles } from '../scripts/lib/domain-specialist.mjs';
import { fullContext, preparationFor } from './domain-fixture.mjs';
import { fingerprint, inventory } from '../scripts/lib/candidate.mjs';
import { precheck } from '../scripts/lib/governance.mjs';
import { prepareActionPlan, sddDelegation, assertSDDTask, sddStatus } from '../scripts/lib/sdd-workflow.mjs';
import { completeSDDTask } from '../scripts/lib/sdd-completion.mjs';
import { startTask, advanceTask } from '../scripts/lib/task-loop.mjs';
import { acceptCandidate, validateCandidate, reviewCandidate, engineeringStatus } from '../scripts/lib/engineering-loop.mjs';
import { main } from '../scripts/toolkit.mjs';

// These fixtures exercise production gates with synthetic user approvals and research
// receipts. Injected validator/reviewer responses simulate observed isolated execution;
// they establish state-machine behavior, not a live runtime or external model review.
function fixture(t, external = false) {
  let repo = mkdtempSync(join(tmpdir(), 'sdd-workflow-'));
  const home=repo; t.after(() => rmSync(home, { recursive: true, force: true }));
  const source=external?join(home,'legacy'):repo;let linkedState={};
  if(external){mkdirSync(source);const manager=join(home,'manager');mkdirSync(manager);attachProject({repo:manager,id:'legacy',source,name:'Atendimento'});repo=attachedProject({repo:manager,id:'legacy'}).repo;linkedState=JSON.parse(readFileSync(join(repo,'references/project-state.json'),'utf8'));}
  const disk=path=>join(path.startsWith('src/')?source:repo,path);
  const save = (path, data) => {
    const text = typeof data === 'string' ? data : JSON.stringify(data);
    mkdirSync(dirname(disk(path)), { recursive: true });
    writeFileSync(disk(path), text);
    return fingerprint(text);
  };
  const state = { ...linkedState, execution_workflow: 'sdd-v2', scope_status: 'defined', plan_gate: 'approved', context_path: 'references/business-context.json', plan_path: 'references/business-plan.json', approval_path: 'references/approval.json', specialist_path: 'references/domain-specialist.json' };
  const contextHash = save(state.context_path, fullContext);
  save('project.json', { name: 'Atendimento', provider: 'both', presentation: 'worker', is_model: false, ...(external?{mode:'attached',id:'legacy'}:{}) });
  const specialist = specialistFiles({ name: 'Atendimento', provider: 'both', context: fullContext, preparation: preparationFor(fullContext) });
  for (const [path, text] of specialist) save(path, text);
  const meta = JSON.parse(specialist.get(state.specialist_path));
  const consultation_paths = ['register', 'list'].map(id => {
    const path = `references/domain-consultations/${id}.json`;
    save(path, { schema_version: 1, feature_id: id, context_sha256: meta.context_sha256, preparation_sha256: meta.preparation_sha256, skill_sha256: meta.skill_sha256, findings: ['Requests require an assigned owner'], domain_impacts: ['Validate ownership on registration and listing'] });
    return path;
  });
  const specification = { schema_version: 1, context_sha256: contextHash, requirements: [
    { id: 'req-register', description: 'Register a request with an owner', scenarios: [{ id: 'scenario-register', given: 'A valid request and owner', when: 'Registration is requested', then: 'The request and owner are stored' }] },
    { id: 'req-list', description: 'List requests and their owners', scenarios: [{ id: 'scenario-list', given: 'A registered request', when: 'The operator requests the list', then: 'The request and owner are shown' }] }
  ] };
  const specificationHash = save('references/functional-spec.json', specification);
  const design = { schema_version: 1, context_sha256: contextHash, specification_sha256: specificationHash, architecture: ['Use the existing application service'], decisions: ['Preserve owner association'], validation_strategy: ['Exercise registration and listing in isolated Node tests'] };
  const designHash = save('references/technical-design.json', design);
  const task = (id, suffix) => ({ id, requirement_ids: [`req-${suffix}`], scenario_ids: [`scenario-${suffix}`], owner: 'application-engineer', read_files: ['src'], write_files: ['src'], deliverables: [`Implement ${suffix} use case`], validation_commands: ['node --test src/request.test.mjs'], test_paths: ['src/request.test.mjs'] });
  const phase = (id, tasks, depends_on) => ({ id, deliverables: [`Working ${id} flow`], acceptance_criteria: ['The linked scenario passes with an assigned owner'], validation_commands: ['node --test src/request.test.mjs'], depends_on, tasks });
  const plan = { ...(external?{source_binding_sha256:state.source_binding_sha256}:{}), schema_version: 2, context_sha256: contextHash, objective: 'Track requests and their owners', scope: ['Registration and listing'], out_of_scope: [], risks: [], consultation_paths, specification_path: 'references/functional-spec.json', specification_sha256: specificationHash, design_path: 'references/technical-design.json', design_sha256: designHash, phases: [phase('register', [task('register-task', 'register')], []), phase('list', [task('list-task', 'list')], ['register'])] };
  const approval = { schema_version: 1, decision: 'approved', context_sha256: contextHash, plan_sha256: save(state.plan_path, plan), approved_by: 'Synthetic product owner', approved_at: '2026-11-11T12:00:00Z', source_reference: 'references/approval-source.md' };
  save(approval.source_reference, 'Synthetic fixture approval: the product owner approves both described phases.');
  save(state.approval_path, approval); save('references/project-state.json', state);
  save('src/request.mjs', 'export const value = 1;\n');
  save('src/request.test.mjs', "import test from 'node:test'; import assert from 'node:assert/strict'; import { value } from './request.mjs'; test('request retains owner', () => assert.ok(value > 0));\n");
  return { repo, source, disk, state, plan, approval, specification, save, external };
}

// Only I/O observations are simulated; all state transitions, bindings and digests run.
async function simulateValidationAndReviews(f, state, attestTests = true) {
  const id = state.id;
  const frozenTest = readFileSync(f.disk('src/request.test.mjs'), 'utf8');
  let validationCalls = 0;
  state = await validateCandidate({ repo: f.repo, id, expectedRevision: state.revision, validator: async ({ repo, oracles, files, requestedTests }) => {
    assert.equal(repo,f.source);
    validationCalls++;
    assert.deepEqual(requestedTests, ['src/request.test.mjs']);
    assert.equal(readFileSync(join(oracles.root, 'src/request.test.mjs'), 'utf8'), frozenTest);
    assert.equal(oracles.files['src/request.test.mjs'], fingerprint(frozenTest));
    assert.equal(files['src/request.mjs'], fingerprint(readFileSync(f.disk('src/request.mjs'))));
    return { status: 'passed', isolation: 'unverified', execution_mode: 'host_controlled', checks: ['inventory', 'frozen_oracles', 'host_controls', 'node-tests-v1'].map(id => ({ id, code: 0 })), test_files: attestTests ? [{ path: 'src/request.test.mjs', sha256: fingerprint(frozenTest) }] : [], environment: { platform: 'synthetic-test', runtime: 'simulated-node' } };
  } });
  assert.equal(state.status, 'review_pending');
  const reviewedTypes = [];
  state = await reviewCandidate({ repo: f.repo, id, expectedRevision: state.revision, dispatcher: async ({ task, files, candidate }) => {
    const type = task.assigned_agent === 'code-reviewer' ? 'code' : 'security';
    reviewedTypes.push(type);
    const path = `qa-artifacts/${task.task_id}.json`;
    f.save(path, { schema_version: 1, task_id: task.task_id, review_type: type, verdict: 'approved', findings: [], residual_risk: '' });
    return { status: 'completed', verdict: 'approved', output: join(f.repo, path), run_id: task.task_id, candidate_sha256: candidate.sha256, package_sha256: fingerprint(files.map(path => ({ path, content: candidate.removed.includes(path) ? null : readFileSync(f.disk(path), 'utf8') }))) };
  } });
  assert.equal(validationCalls, 1);
  assert.deepEqual(reviewedTypes, ['code', 'security']);
  assert.equal(state.status, 'ready_for_delivery');
  return state;
}

test('SDD approved plan supports dry run, immutable materialization, and idempotent preparation', t => {
  const f = fixture(t);
  assert.equal(precheck(f.repo, 'business').status, 'ready');
  const preview = prepareActionPlan({ repo: f.repo, dryRun: true });
  assert.equal(preview.status, 'planned');
  assert.equal(existsSync(join(f.repo, preview.path)), false);
  assert.deepEqual(preview.tasks.map(task => task.id), ['register-task', 'list-task']);
  const prepared = prepareActionPlan(f);
  assert.equal(prepared.status, 'prepared');
  const bytes = readFileSync(join(f.repo, prepared.path), 'utf8');
  const artifact = JSON.parse(bytes);
  assert.equal(artifact.plan_sha256, f.approval.plan_sha256);
  assert.equal(artifact.approval_sha256, fingerprint(readFileSync(join(f.repo, f.state.approval_path))));
  assert.equal(artifact.specification_sha256, f.plan.specification_sha256);
  assert.equal(artifact.design_sha256, f.plan.design_sha256);
  assert.deepEqual(artifact.tasks[1].depends_on, ['register-task']);
  assert.equal(prepareActionPlan(f).status, 'unchanged');
  assert.equal(readFileSync(join(f.repo, prepared.path), 'utf8'), bytes);
});

test('SDD new approval for the same plan creates a distinct immutable execution epoch', t => {
  const f = fixture(t); const first = prepareActionPlan(f);
  const bytes = readFileSync(join(f.repo, first.path), 'utf8');
  const oldTask = sddDelegation({ repo: f.repo, id: 'register-task' });
  f.approval.approved_at = '2026-11-11T13:00:00Z';
  f.save(f.state.approval_path, f.approval);
  const second = prepareActionPlan(f);
  assert.equal(second.status, 'prepared');
  assert.notEqual(second.path, first.path);
  assert.notEqual(sddDelegation({ repo: f.repo, id: 'register-task' }).task_id, oldTask.task_id);
  assert.equal(readFileSync(join(f.repo, first.path), 'utf8'), bytes);
});

test('SDD rejects changes to a materialized action plan and preserves its bytes', t => {
  const f = fixture(t); const result = prepareActionPlan(f);
  const altered = JSON.parse(readFileSync(join(f.repo, result.path), 'utf8'));
  altered.tasks[0].owner = 'platform-engineer';
  f.save(result.path, altered);
  assert.throws(() => prepareActionPlan(f), /diverge/);
  assert.throws(() => sddDelegation({ repo: f.repo, id: 'register-task' }), /alterado|obsoleto/);
  assert.equal(JSON.parse(readFileSync(join(f.repo, result.path))).tasks[0].owner, 'platform-engineer');
});

test('SDD delegation binds exact task, approved ownership, owner, evidence, and plan digest', t => {
  const f = fixture(t); prepareActionPlan(f);
  const delegation = sddDelegation({ repo: f.repo, id: 'register-task' });
  assert.equal(delegation.sdd.task_id, 'register-task');
  assert.equal(delegation.sdd.plan_sha256, f.approval.plan_sha256);
  assert.equal(delegation.assigned_agent, 'application-engineer');
  assert.deepEqual(delegation.file_ownership, { read: ['src'], write: ['src'] });
  assert.deepEqual(delegation.evidence_required, ['src/request.test.mjs']);
  assert.doesNotThrow(() => assertSDDTask({ repo: f.repo, delegation, phase: 'business' }));
  assert.deepEqual(sddDelegation({ repo: f.repo, id: 'register-task' }), delegation);
  for (const change of [d => { d.assigned_agent = 'platform-engineer'; }, d => { d.file_ownership.write = ['references']; }, d => { d.validation_commands = ['skip']; }, d => { delete d.sdd; }, d => { d.sdd.plan_sha256 = 'a'.repeat(64); }]) {
    const changed = structuredClone(delegation); change(changed);
    assert.throws(() => assertSDDTask({ repo: f.repo, delegation: changed, phase: 'business' }));
  }
  assert.throws(() => sddDelegation({ repo: f.repo, id: 'unapproved-task' }), /ausente/);
});

test('SDD dependencies block the second phase before a verified checkpoint exists', t => {
  const f = fixture(t); prepareActionPlan(f);
  const status = sddStatus(f);
  assert.deepEqual(status.ready, ['register-task']);
  assert.deepEqual(status.completed, []);
  assert.deepEqual(status.phases, [{ id: 'register', completed: false }, { id: 'list', completed: false }]);
  const delegation = sddDelegation({ repo: f.repo, id: 'list-task' });
  assert.throws(() => assertSDDTask({ repo: f.repo, delegation, phase: 'business' }));
  assert.throws(() => startTask({ repo: f.repo, delegation, phase: 'business', provider: 'codex' }));
});

test('SDD completion rejects a generic run and an exact but unobserved task run', t => {
  const f = fixture(t); prepareActionPlan(f);
  assert.throws(() => completeSDDTask({ repo: f.repo, id: 'register-task', runId: 'generic-run' }), /corresponde/);
  const delegation = sddDelegation({ repo: f.repo, id: 'register-task' });
  startTask({ repo: f.repo, delegation, phase: 'business', provider: 'codex' });
  assert.throws(() => completeSDDTask({ repo: f.repo, id: 'register-task', runId: delegation.task_id }), /observada/);
  assert.deepEqual(sddStatus(f).completed, []);
});

for (const artifact of ['specification', 'plan']) test(`SDD ${artifact} edits invalidate approval, delegation, status, and new action plans`, t => {
  const f = fixture(t); prepareActionPlan(f);
  const path = artifact === 'specification' ? f.plan.specification_path : f.state.plan_path;
  const changed = artifact === 'specification' ? { ...f.specification, requirements: [] } : { ...f.plan, objective: 'Changed after approval' };
  f.save(path, changed);
  assert.equal(precheck(f.repo, 'business').status, 'blocked');
  assert.throws(() => prepareActionPlan(f));
  assert.throws(() => sddDelegation({ repo: f.repo, id: 'register-task' }));
  assert.throws(() => sddStatus(f));
});

test('SDD reports legacy plans as requiring migration without claiming SDD approval', t => {
  const f = fixture(t);
  f.state.execution_workflow = 'legacy-v1';
  const { specification_path, specification_sha256, design_path, design_sha256, ...legacy } = f.plan;
  legacy.schema_version = 1;
  legacy.phases = legacy.phases.map(({ depends_on, tasks, ...phase }) => phase);
  f.save(f.state.plan_path, legacy); f.save('references/project-state.json', f.state);
  assert.deepEqual(sddStatus(f), { status: 'migration_required', workflow: 'legacy-v1', sdd: false });
  assert.throws(() => prepareActionPlan(f));
});

test('SDD CLI exposes plan preview, task bindings, phase readiness, and blocked unobserved completion', async t => {
  const f = fixture(t);
  const preview = await main(['sdd-plan', '--repo', f.repo, '--dry-run']);
  assert.equal(preview.status, 'planned');
  assert.equal(existsSync(join(f.repo, preview.path)), false);
  assert.equal((await main(['sdd-plan', '--repo', f.repo])).status, 'prepared');
  assert.equal((await main(['sdd-plan', '--repo', f.repo])).status, 'unchanged');
  const delegation = await main(['sdd-task', '--repo', f.repo, '--id', 'register-task']);
  assert.deepEqual(delegation, sddDelegation({ repo: f.repo, id: 'register-task' }));
  assert.deepEqual((await main(['sdd-status', '--repo', f.repo])).ready, ['register-task']);
  await assert.rejects(main(['sdd-complete', '--repo', f.repo, '--id', 'register-task', '--run-id', 'generic-run']));
  await assert.rejects(main(['sdd-complete', '--repo', f.repo, '--id', 'register-task', '--run-id', delegation.task_id, '--passed']));
});

for (const external of [false,true]) for (const attestTests of [false, true]) test((external?'EXTERNAL SOURCE: ':'')+(attestTests
  ? 'SDD genuine engine transitions with simulated isolated checks and reviews unlock the next phase'
  : 'SDD passing engine validation and reviews still require observed execution of intended tests'), async t => {
  const f = fixture(t, external); prepareActionPlan(f);
  const delegation = sddDelegation({ repo: f.repo, id: 'register-task' });
  const id = delegation.task_id;
  startTask({ repo: f.repo, delegation, phase: 'business', provider: 'codex' });
  let state = advanceTask({ repo: f.repo, id, expectedRevision: 1, event: { type: 'gate_checked' } });
  state = advanceTask({ repo: f.repo, id, expectedRevision: state.revision, event: { type: 'gate_checked' } });
  assert.equal(state.status, 'implementation_pending');
  f.save('src/request.mjs', 'export const value = 2;\n');
  state = acceptCandidate({ repo: f.repo, id, expectedRevision: state.revision, profile: 'node-tests-v1' });
  state = await simulateValidationAndReviews(f, state, attestTests);
  assert.equal(engineeringStatus({ repo: f.repo, id }).delivery_valid, true);
  if (!attestTests) {
    assert.throws(() => completeSDDTask({ repo: f.repo, id: 'register-task', runId: id }), /execução observada/);
    assert.deepEqual(sddStatus(f).ready, ['register-task']);
    assert.deepEqual(sddStatus(f).completed, []);
    return;
  }
  const completed = completeSDDTask({ repo: f.repo, id: 'register-task', runId: id });
  assert.equal(completed.status, 'completed');
  assert.equal(completeSDDTask({ repo: f.repo, id: 'register-task', runId: id }).status, 'unchanged');
  const status = sddStatus(f);
  assert.deepEqual(status.completed, ['register-task']);
  assert.deepEqual(status.ready, ['list-task']);
  assert.deepEqual(status.phases, [{ id: 'register', completed: true }, { id: 'list', completed: false }]);
  const nextDelegation = sddDelegation({ repo: f.repo, id: 'list-task' });
  assert.doesNotThrow(() => assertSDDTask({ repo: f.repo, delegation: nextDelegation, phase: 'business' }));
  // Historical evidence cannot validate new bytes before an authorized task starts.
  for (const path of ['src/request.mjs', 'src/request.test.mjs']) {
    const bytes = readFileSync(f.disk(path), 'utf8');
    f.save(path, bytes + '// unobserved edit\n');
    assert.throws(() => sddStatus(f), /checkpoint SDD histórico/);
    assert.throws(() => completeSDDTask({ repo: f.repo, id: 'register-task', runId: id }), /checkpoint SDD histórico/);
    assert.throws(() => startTask({ repo: f.repo, delegation: nextDelegation, phase: 'business', provider: 'codex' }), /checkpoint SDD histórico/);
    f.save(path, bytes);
  }
  assert.equal(startTask({ repo: f.repo, delegation: nextDelegation, phase: 'business', provider: 'codex' }).status, 'awaiting_gate');
  let nextState = advanceTask({ repo: f.repo, id: nextDelegation.task_id, expectedRevision: 1, event: { type: 'gate_checked' } });
  nextState = advanceTask({ repo: f.repo, id: nextDelegation.task_id, expectedRevision: nextState.revision, event: { type: 'gate_checked' } });
  assert.equal(nextState.status, 'implementation_pending');
  // A task started on the verified frontier may evolve its approved files.
  f.save('src/request.mjs', 'export const value = 3;\n');
  assert.doesNotThrow(() => sddStatus(f));
  assert.doesNotThrow(() => assertSDDTask({ repo: f.repo, delegation: nextDelegation, phase: 'business' }));
  const receiptBytes = readFileSync(join(f.repo, completed.receipt), 'utf8');
  const receipt = JSON.parse(receiptBytes);
  f.save(completed.receipt, { ...receipt, candidate_sha256: fingerprint(inventory(f.repo)), completed_at: '2099-01-01T00:00:00Z' });
  assert.throws(() => sddStatus(f), /candidato de checkpoint/);
  f.save(completed.receipt, receiptBytes);
  assert.equal(fingerprint(nextState.baseline_files), receipt.candidate_sha256);
  nextState = acceptCandidate({ repo: f.repo, id: nextDelegation.task_id, expectedRevision: nextState.revision, profile: 'node-tests-v1' });
  nextState = await simulateValidationAndReviews(f, nextState);
  assert.notEqual(nextState.engineering.candidate_sha256, receipt.candidate_sha256);
  const secondCompleted = completeSDDTask({ repo: f.repo, id: 'list-task', runId: nextDelegation.task_id });
  assert.equal(secondCompleted.status, 'completed');
  const finalStatus = sddStatus(f);
  assert.equal(finalStatus.status, 'completed');
  if(external){assert.equal(existsSync(join(f.source,'references')),false);assert.equal(existsSync(join(f.source,'qa-artifacts')),false);assert.equal(runCoherenceChecks({repo:f.repo,execute:()=>{throw new Error('must never run stock commands in legacy');}}).status,'ready');}
  if(external){
    const meta=JSON.parse(readFileSync(join(f.repo,f.state.specialist_path),'utf8'));
    completeCoherence({repo:f.repo,report:{schema_version:1,context_sha256:meta.context_sha256,preparation_sha256:meta.preparation_sha256,skill_sha256:meta.skill_sha256,snapshot_sha256:repositorySnapshot(f.repo),assessments:['structure','code','tests','dependencies','configuration','documentation','skills','context'].map(area=>({area,status:'passed',conclusion:'Synthetic regression fixture'})),changes:[],pending:[]}});
    assert.equal(engineeringStatus({repo:f.repo,id:nextDelegation.task_id}).delivery_valid,true);
    assert.equal(runCoherenceChecks({repo:f.repo}).status,'ready');
    const stateBytes=readFileSync(join(f.repo,'references/project-state.json'),'utf8');
    f.save('references/project-state.json',{...JSON.parse(stateBytes),scope_status:'pending'});
    assert.equal(engineeringStatus({repo:f.repo,id:nextDelegation.task_id}).delivery_valid,false);
    f.save('references/project-state.json',stateBytes);
  }
  // Actual readiness gates and local distribution; human/runtime observations remain synthetic.
  const releaseId='candidate';const draft=initializeRelease({repo:f.repo,id:releaseId});
  const plan=JSON.parse(readFileSync(join(f.repo,draft.path),'utf8'));
  const destinationRoot=mkdtempSync(join(tmpdir(),'release-destination-'));t.after(()=>rmSync(destinationRoot,{recursive:true,force:true}));
  const destination=join(destinationRoot,'product.zip');
  const evidencePath='qa-artifacts/release-evidence.md';const evidence='Synthetic operator inspection: acceptance, build provenance and operational recovery verified for this fixture.';
  f.save(evidencePath,evidence);f.save('qa-artifacts/product.zip','synthetic artifact bytes');
  const attestation={status:'passed',verified_by:'Synthetic fixture owner',verified_at:new Date().toISOString(),statement:'Synthetic evidence for the exact release and environment',evidence_path:evidencePath,evidence_sha256:fingerprint(evidence)};
  plan.run_id=nextDelegation.task_id;plan.artifact={path:'qa-artifacts/product.zip',sha256:fingerprint('synthetic artifact bytes')};
  plan.target={kind:'local-artifact',environment:'staging',destination,rationale:'Synthetic local distribution fixture with an explicit approved destination',research:[{url:'https://example.com/fixture-reference',accessed_at:'2026-01-01',finding:'Synthetic source fixture, not an external consultation'}]};
  for(const key of releaseCriteria)plan.criteria[key]={...attestation,release_binding_sha256:releaseEvidenceBinding(plan)};
  f.save(draft.path,plan);assert.equal(checkRelease({repo:f.repo,id:releaseId}).status,'ready_for_staging');
  assert.ok(checkRelease({repo:f.repo,id:releaseId,stage:'production'}).blockers.includes('staging_validation'));
  plan.target.environment='production';plan.criteria.staging_validation={...attestation};f.save(draft.path,plan);
  assert.ok(checkRelease({repo:f.repo,id:releaseId,stage:'production'}).blockers.includes('configuration'));
  for(const key of [...releaseCriteria,'staging_validation'])plan.criteria[key].release_binding_sha256=releaseEvidenceBinding(plan);f.save(draft.path,plan);
  const ready=checkRelease({repo:f.repo,id:releaseId,stage:'production'});assert.equal(ready.status,'ready_for_production');assert.equal(ready.metric.satisfied,ready.metric.required);
  const approvalPath='qa-artifacts/release-approval.json';const approval={kind:'release_deploy',decision:'approved',stage:'production',manifest_sha256:ready.manifest_sha256,approved_by:'Synthetic fixture owner',approved_at:new Date().toISOString(),source_reference:evidencePath,source_reference_sha256:fingerprint(evidence)};f.save(approvalPath,approval);
  const deploy={repo:f.repo,id:releaseId,stage:'production',approvalFile:join(f.repo,approvalPath)};
  assert.equal(deployRelease({...deploy,dryRun:true}).status,'planned');assert.equal(existsSync(destination),false);
  f.save(approvalPath,{...approval,stage:'staging'});assert.throws(()=>deployRelease(deploy),/aceite/);assert.equal(existsSync(destination),false);f.save(approvalPath,approval);
  assert.equal(deployRelease(deploy).status,'distributed');assert.equal(readFileSync(destination,'utf8'),'synthetic artifact bytes');assert.throws(()=>deployRelease(deploy),/existente/);
  f.save('qa-artifacts/product.zip','tampered bytes');assert.ok(checkRelease({repo:f.repo,id:releaseId,stage:'production'}).blockers.includes('artifact'));
  const sourceBytes=readFileSync(f.disk('src/request.mjs'),'utf8');f.save('src/request.mjs',sourceBytes+'// unobserved release change');assert.ok(checkRelease({repo:f.repo,id:releaseId,stage:'production'}).blockers.includes('version_binding'));f.save('src/request.mjs',sourceBytes);
  assert.deepEqual(finalStatus.completed, ['register-task', 'list-task']);
  assert.deepEqual(finalStatus.ready, []);
  assert.deepEqual(finalStatus.phases, [{ id: 'register', completed: true }, { id: 'list', completed: true }]);
  // Completion timestamps cannot reorder the verified baseline → candidate chain.
  f.save(completed.receipt, { ...receipt, completed_at: '2099-01-01T00:00:00Z' });
  assert.deepEqual(sddStatus(f), finalStatus);
  assert.equal(completeSDDTask({ repo: f.repo, id: 'register-task', runId: id }).status, 'unchanged');
  assert.equal(completeSDDTask({ repo: f.repo, id: 'list-task', runId: nextDelegation.task_id }).status, 'unchanged');
  f.save(completed.receipt, { ...receipt, candidate_sha256: fingerprint(inventory(f.repo)), completed_at: '2099-01-01T00:00:00Z' });
  assert.throws(() => sddStatus(f), /candidato de checkpoint/);
  f.save(completed.receipt, receiptBytes);
  assert.deepEqual(sddStatus(f), finalStatus);
  f.save(receipt.evidence[0].path, { altered: true });
  assert.throws(() => sddStatus(f), /evidência/);
});


test('SDD completion rejects a delivered toolkit run that reuses the canonical ID with a different owner and ownership', async t => {
  const f = fixture(t); prepareActionPlan(f);
  const canonical = sddDelegation({ repo: f.repo, id: 'register-task' });
  const altered = { ...canonical, assigned_agent: 'platform-engineer', file_ownership: { read: ['.'], write: ['src', 'references'] } };
  const id = canonical.task_id;
  startTask({ repo: f.repo, delegation: altered, phase: 'toolkit', provider: 'codex' });
  let state = advanceTask({ repo: f.repo, id, expectedRevision: 1, event: { type: 'gate_checked' } });
  state = advanceTask({ repo: f.repo, id, expectedRevision: state.revision, event: { type: 'gate_checked' } });
  assert.equal(state.status, 'implementation_pending');
  f.save('src/request.mjs', 'export const value = 2;\n');
  state = acceptCandidate({ repo: f.repo, id, expectedRevision: state.revision, profile: 'node-tests-v1' });
  state = await simulateValidationAndReviews(f, state);
  assert.equal(state.status, 'ready_for_delivery');
  assert.equal(engineeringStatus({ repo: f.repo, id }).delivery_valid, true);
  assert.throws(() => completeSDDTask({ repo: f.repo, id: 'register-task', runId: id }), /vínculo exato/);
  assert.deepEqual(sddStatus(f).completed, []);
  assert.deepEqual(sddStatus(f).ready, ['register-task']);
});

for(const path of ['src/screen.tsx','src/screen.css','src/frontend/screen.js','src/screen.js','src/angular.ts'])test(`attached UI without profile blocks application-engineer change: ${path}`,t=>{
 const f=fixture(t,true);prepareActionPlan(f);const delegation=sddDelegation({repo:f.repo,id:'register-task'});let state=startTask({repo:f.repo,delegation,phase:'business',provider:'codex'});
 for(let i=0;i<2;i++)state=advanceTask({repo:f.repo,id:state.id,expectedRevision:state.revision,event:{type:'gate_checked'}});
 f.save(path,path==='src/screen.js'?"export function screen(){return document.createElement('button')}":path==='src/angular.ts'?"import {Component} from '@angular/core';":'/* synthetic interface source */');
 assert.throws(()=>acceptCandidate({repo:f.repo,id:state.id,expectedRevision:state.revision,profile:'node-tests-v1'}),/interface.*perfil|perfil.*interface/i);
});
for(const [path,content] of [['src/backend.cs','public List<Request> GetRequests() => requests;'],['src/backend.ts','export async function load(): Promise<Result> { return result; }'],['src/backend.js','export const reactionCount = 0;'],['src/obsolete.mjs',null]])test(`attached backend without interface profile remains editable: ${path}`,t=>{
 const f=fixture(t,true);if(content===null)f.save(path,'export const obsolete = true;');prepareActionPlan(f);const delegation=sddDelegation({repo:f.repo,id:'register-task'});let state=startTask({repo:f.repo,delegation,phase:'business',provider:'codex'});
 for(let i=0;i<2;i++)state=advanceTask({repo:f.repo,id:state.id,expectedRevision:state.revision,event:{type:'gate_checked'}});
 if(content===null)rmSync(f.disk(path));else f.save(path,content);
 assert.equal(acceptCandidate({repo:f.repo,id:state.id,expectedRevision:state.revision,profile:'node-tests-v1'}).status,'validation_pending');
});

test('managed architecture binds SDD and blocks an obsolete migration baseline',async t=>{
 const f=fixture(t);const {architectureDigest,architectureTechnologyHash}=await import('../scripts/lib/architecture-decision.mjs');
 const {architectureSourceSnapshot}=await import('../scripts/lib/architecture-inspection.mjs');
 const {generationOptions}=await import('./generation-fixture.mjs');
 const args=generationOptions({name:'Atendimento',presentation:'worker',context:fullContext,decisionRepo:f.repo});
 f.save('references/technology-decision.json',args.technologyDecision);
 const d=args.architectureDecision;d.mode='evolution';d.migration={from_profile:'simple-application',baseline_sha256:architectureSourceSnapshot(f.repo),phases:['register','list'],compatibility:['Preserve owner association'],rollback:['Restore compatible old service and validate ownership'],data_changes:false,irreversible:false};d.approval.decision_sha256=architectureDigest(d);
 f.save('references/architecture-decision.json',d);f.state.architecture_mode='managed-v1';f.state.architecture_path='references/architecture-decision.json';f.state.technology_decision_path='references/technology-decision.json';f.save('references/project-state.json',f.state);
 assert.equal(precheck(f.repo,'business').status,'blocked');
 f.plan.architecture_sha256=architectureDigest(d);f.approval.plan_sha256=f.save(f.state.plan_path,f.plan);f.save(f.state.approval_path,f.approval);
 assert.equal(precheck(f.repo,'business').status,'ready');
 f.save('src/request.mjs','export const value = 99;');assert.throws(()=>prepareActionPlan(f),/fonte alterado/);
});

test('approved two-phase architecture migration preserves regression oracles and requires validated final delivery',async t=>{
 const f=fixture(t);const {architectureFiles}=await import('../scripts/lib/architecture-profiles.mjs');
 const {architectureDigest}=await import('../scripts/lib/architecture-decision.mjs');
 const {architectureSourceSnapshot}=await import('../scripts/lib/architecture-inspection.mjs');
 const {completeArchitecture,reviewArchitecture}=await import('../scripts/lib/architecture-workflow.mjs');
 const {generationOptions}=await import('./generation-fixture.mjs');
 const layout={name:'Atendimento',presentation:'worker',stack:'dotnet'};
 const from=architectureFiles({...layout,profile:'simple-application'}),target=architectureFiles({...layout,profile:'layered-monolith'});
 for(const [p,text] of from)f.save(p,text);
 f.save('Directory.Build.props','<Project><PropertyGroup><TargetFramework>net8.0</TargetFramework><ImplicitUsings>enable</ImplicitUsings><Nullable>enable</Nullable></PropertyGroup></Project>');
 const args=generationOptions({name:layout.name,presentation:layout.presentation,context:fullContext,decisionRepo:f.repo});f.save('references/technology-decision.json',args.technologyDecision);
 const program=`tests/${layout.name}.Arquitetura.Tests/Program.cs`,project=`tests/${layout.name}.Arquitetura.Tests/${layout.name}.Arquitetura.Tests.csproj`;
 const d=args.architectureDecision;d.mode='evolution';d.migration={from_profile:'simple-application',from_modules:[],baseline_sha256:architectureSourceSnapshot(f.repo),phases:['register','list'],compatibility:['Keep host lifecycle and owner regression'],rollback:['Restore simple graph and run owner regression'],data_changes:false,irreversible:false,oracle_transition:{task_id:'list-task',original_sha256:fingerprint(from.get(program)),target_sha256:fingerprint(target.get(program))}};d.approval.decision_sha256=architectureDigest(d);
 f.save('references/architecture-decision.json',d);Object.assign(f.state,{architecture_mode:'managed-v1',architecture_path:'references/architecture-decision.json',technology_decision_path:'references/technology-decision.json'});f.save('references/project-state.json',f.state);
 f.plan.architecture_sha256=architectureDigest(d);const switchTask=f.plan.phases[1].tasks[0];Object.assign(switchTask,{owner:'architecture-engineer',read_files:['src','tests','Atendimento.sln'],write_files:['src','tests','Atendimento.sln','docs/architecture.md'],test_paths:[project]});
 f.approval.plan_sha256=f.save(f.state.plan_path,f.plan);f.save(f.state.approval_path,f.approval);prepareActionPlan(f);
 assert.throws(()=>completeArchitecture(f),/todas as tarefas/);
 const start=id=>{let run=startTask({repo:f.repo,delegation:sddDelegation({repo:f.repo,id}),phase:'business',provider:'codex'});for(let i=0;i<2;i++)run=advanceTask({repo:f.repo,id:run.id,expectedRevision:run.revision,event:{type:'gate_checked'}});return run;};
 let run=start('register-task');f.save('src/request.mjs','export const value = 2;\n');run=acceptCandidate({repo:f.repo,id:run.id,expectedRevision:run.revision,profile:'node-tests-v1'});run=await simulateValidationAndReviews(f,run);completeSDDTask({repo:f.repo,id:'register-task',runId:run.id});
 run=start('list-task');assert.equal(run.architecture_oracle_transition.original_sha256,fingerprint(from.get(program)));
 const frozenRoot=join(f.repo,`qa-artifacts/loops/${run.id}/oracles`);assert.equal(readFileSync(join(frozenRoot,program),'utf8'),target.get(program));assert.equal(readFileSync(join(frozenRoot,'src/request.test.mjs'),'utf8'),readFileSync(f.disk('src/request.test.mjs'),'utf8'));
 for(const [p,text] of target)if(p!==program)f.save(p,text);
 assert.throws(()=>acceptCandidate({repo:f.repo,id:run.id,expectedRevision:run.revision,profile:'dotnet-offline-v1'}),/atualizar o oráculo/);
 f.save(program,target.get(program));
 run=acceptCandidate({repo:f.repo,id:run.id,expectedRevision:run.revision,profile:'dotnet-offline-v1'});
 // Simulated isolation observations below test protocol only. Native build/run tests cover generated target and oracle transition separately.
 run=await validateCandidate({repo:f.repo,id:run.id,expectedRevision:run.revision,validator:async({oracles})=>{
 assert.equal(readFileSync(join(oracles.root,program),'utf8'),target.get(program));return {status:'passed',isolation:'unverified',execution_mode:'host_controlled',checks:['inventory','frozen_oracles','host_controls','dotnet-offline-v1'].map(id=>({id,code:0})),test_files:[{path:project,sha256:fingerprint(readFileSync(f.disk(project)))}],environment:{platform:'synthetic-test',runtime:'simulated-dotnet'}};
 }});
 run=await reviewCandidate({repo:f.repo,id:run.id,expectedRevision:run.revision,dispatcher:async({task,files,candidate})=>{const path=`qa-artifacts/${task.task_id}.json`;f.save(path,{schema_version:1,task_id:task.task_id,review_type:task.assigned_agent==='code-reviewer'?'code':'security',verdict:'approved',findings:[],residual_risk:''});return {status:'completed',verdict:'approved',output:join(f.repo,path),run_id:task.task_id,candidate_sha256:candidate.sha256,package_sha256:fingerprint(files.map(path=>({path,content:candidate.removed.includes(path)?null:readFileSync(f.disk(path),'utf8')})))};}});
 assert.equal(engineeringStatus({repo:f.repo,id:run.id}).delivery_valid,true);completeSDDTask({repo:f.repo,id:'list-task',runId:run.id});
 assert.equal(sddStatus(f).status,'completed');const completedArchitecture=completeArchitecture(f);assert.equal(completedArchitecture.status,'completed');assert.equal(completeArchitecture(f).status,'unchanged');
 const receiptPath=join(f.repo,completedArchitecture.path),originalReceipt=readFileSync(receiptPath,'utf8'),badReceipt=JSON.parse(originalReceipt);delete badReceipt.run_sha256;writeFileSync(receiptPath,JSON.stringify(badReceipt));assert.notEqual(reviewArchitecture(f).status,'consistent');writeFileSync(receiptPath,originalReceipt);const wrongPlanReceipt=JSON.parse(originalReceipt);wrongPlanReceipt.plan_sha256='0'.repeat(64);writeFileSync(receiptPath,JSON.stringify(wrongPlanReceipt));assert.notEqual(reviewArchitecture(f).status,'consistent');writeFileSync(receiptPath,originalReceipt);assert.equal(reviewArchitecture(f).status,'consistent');
 f.save('src/request.mjs','export const value = 4;\n');assert.notEqual(reviewArchitecture(f).status,'consistent');assert.throws(()=>completeArchitecture(f),/histórico/);
 f.save('src/request.mjs','export const value = 2;\n');
 // A completed migration establishes the target; new product work does not repeat old phases/oracle transitions.
 for(const [i,phase] of f.plan.phases.entries()){phase.id=i?'verify-new':'configure-new';phase.depends_on=i?['configure-new']:[];phase.tasks[0].id=i?'new-verification-task':'new-configuration-task';const path=f.plan.consultation_paths[i];const consultation=JSON.parse(readFileSync(join(f.repo,path),'utf8'));consultation.feature_id=phase.id;f.save(path,consultation);}
 f.approval.plan_sha256=f.save(f.state.plan_path,f.plan);f.save(f.state.approval_path,f.approval);
 assert.equal(prepareActionPlan(f).status,'prepared');assert.equal(start('new-configuration-task').status,'implementation_pending');

});
