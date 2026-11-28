import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, symlinkSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { inspectSDDPlan } from '../scripts/lib/sdd-plan.mjs';
import { architectureDigest, architectureContextHash, architectureTechnologyHash } from '../scripts/lib/architecture-decision.mjs';
import { fullContext } from './domain-fixture.mjs';
import { symlinkCapability } from '../scripts/lib/host-capabilities.mjs';
const symlinkHost=symlinkCapability();

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
function fixture(t) {
  const repo = mkdtempSync(join(tmpdir(), 'sdd-plan-'));
  t.after(() => rmSync(repo, { recursive: true, force: true }));
  const save = (path, data) => {
    const bytes = typeof data === 'string' ? data : JSON.stringify(data, null, 2) + '\n';
    mkdirSync(dirname(join(repo, path)), { recursive: true });
    writeFileSync(join(repo, path), bytes);
    return hash(bytes);
  };
  const contextHash = save('references/context.json', { schema_version: 1, problem: 'Track service requests and their owners.' });
  const specification = { schema_version: 1, context_sha256: contextHash, requirements: [
    { id: 'req-register', description: 'Register a request with an owner', scenarios: [{ id: 'scenario-register', given: 'A valid request and owner', when: 'The operator registers it', then: 'The request is stored with its owner' }] },
    { id: 'req-list', description: 'List stored requests', scenarios: [{ id: 'scenario-list', given: 'A stored request', when: 'The operator opens the list', then: 'The request is visible' }] }
  ] };
  const specificationHash = save('references/functional-spec.json', specification);
  const design = { schema_version: 1, context_sha256: contextHash, specification_sha256: specificationHash, architecture: ['Application service stores and lists requests'], decisions: ['Use existing repository interface'], validation_strategy: ['Exercise registration and listing with isolated tests'] };
  const designHash = save('references/technical-design.json', design);
  const task = (id, requirement, scenario) => ({ id, requirement_ids: [requirement], scenario_ids: [scenario], owner: 'application-engineer', read_files: ['src'], write_files: ['src', 'tests'], deliverables: ['Application use case'], validation_commands: ['node --test tests/request.test.mjs'], test_paths: ['tests/request.test.mjs'] });
  const phase = (id, tasks, depends_on = []) => ({ id, deliverables: ['Working request flow'], acceptance_criteria: ['The linked scenarios pass'], validation_commands: ['node --test tests/request.test.mjs'], depends_on, tasks });
  const plan = { schema_version: 2, context_sha256: contextHash, specification_path: 'references/functional-spec.json', specification_sha256: specificationHash, design_path: 'references/technical-design.json', design_sha256: designHash, objective: 'Track requests', scope: ['Registration and listing'], out_of_scope: [], risks: [], consultation_paths: ['references/consultation.json'], phases: [phase('register', [task('register-task', 'req-register', 'scenario-register')]), phase('list', [task('list-task', 'req-list', 'scenario-list')], ['register'])] };
  save('src/request.mjs', 'export const requests = [];\n');
  save('tests/request.test.mjs', 'import assert from "node:assert/strict"; assert.ok(true);\n');
  const refresh = () => { plan.specification_sha256 = save(plan.specification_path, specification); design.specification_sha256 = plan.specification_sha256; plan.design_sha256 = save(plan.design_path, design); };
  return { repo, save, contextHash, specification, design, plan, refresh, task, phase };
}

test('SDD validates byte-bound artifacts and derives ordered task dependencies', t => {
  const f = fixture(t);
  f.plan.phases[0].tasks.push(f.task('register-validation', 'req-register', 'scenario-register'));
  f.plan.phases.reverse();
  const result = inspectSDDPlan(f);
  assert.deepEqual(result.specification, f.specification);
  assert.deepEqual(result.design, f.design);
  assert.deepEqual(result.tasks.map(({ id, phase_id, depends_on }) => ({ id, phase_id, depends_on })), [
    { id: 'register-task', phase_id: 'register', depends_on: [] },
    { id: 'register-validation', phase_id: 'register', depends_on: ['register-task'] },
    { id: 'list-task', phase_id: 'list', depends_on: ['register-validation'] }
  ]);
  assert.equal(result.specification_sha256, f.plan.specification_sha256);
  assert.equal(result.design_sha256, f.plan.design_sha256);
});

const invalidCases = {
  'rejects v1 as SDD': f => { f.plan.schema_version = 1; },
  'requires consultations': f => { delete f.plan.consultation_paths; },
  'requires nonempty phases': f => { f.plan.phases = []; },
  'requires nonempty phase tasks': f => { f.plan.phases[0].tasks = []; },
  'rejects duplicate phase IDs': f => { f.plan.phases[1].id = 'register'; },
  'rejects duplicate task IDs globally': f => { f.plan.phases[1].tasks[0].id = 'register-task'; },
  'rejects unknown phase dependencies': f => { f.plan.phases[1].depends_on = ['missing']; },
  'rejects self phase dependency': f => { f.plan.phases[0].depends_on = ['register']; },
  'rejects dependency cycles': f => { f.plan.phases[0].depends_on = ['list']; },
  'rejects repeated dependencies': f => { f.plan.phases[1].depends_on = ['register', 'register']; },
  'rejects uncovered requirement': f => { f.specification.requirements.push({ id: 'req-other', description: 'Another requirement', scenarios: [{ id: 'scenario-other', given: 'A request', when: 'An action occurs', then: 'An effect follows' }] }); f.refresh(); },
  'rejects uncovered scenario': f => { f.specification.requirements[0].scenarios.push({ id: 'scenario-other', given: 'A request', when: 'An action occurs', then: 'An effect follows' }); f.refresh(); },
  'rejects unknown requirement': f => { f.plan.phases[0].tasks[0].requirement_ids = ['missing']; },
  'rejects unknown scenario': f => { f.plan.phases[0].tasks[0].scenario_ids = ['missing']; },
  'rejects a scenario from an unlinked requirement': f => { f.plan.phases[0].tasks[0].scenario_ids = ['scenario-list']; },
  'rejects duplicate requirement IDs': f => { f.specification.requirements[1].id = 'req-register'; f.refresh(); },
  'rejects duplicate scenario IDs globally': f => { f.specification.requirements[1].scenarios[0].id = 'scenario-register'; f.refresh(); },
  'rejects repeated task links': f => { f.plan.phases[0].tasks[0].scenario_ids.push('scenario-register'); },
  'rejects readonly owner': f => { f.plan.phases[0].tasks[0].owner = 'business-analyst'; },
  'rejects reviewer owner': f => { f.plan.phases[0].tasks[0].owner = 'code-reviewer'; },
  'rejects unknown owner': f => { f.plan.phases[0].tasks[0].owner = 'unknown-engineer'; },
  'rejects traceability owner': f => { f.plan.phases[0].tasks[0].owner = 'traceability-maintainer'; },
  'rejects unowned test': f => { f.plan.phases[0].tasks[0].test_paths = ['other/request.test.mjs']; },
  'rejects test prefix masquerading as ownership': f => { f.plan.phases[0].tasks[0].test_paths = ['tests-other/request.test.mjs']; },
  'requires tests': f => { f.plan.phases[0].tasks[0].test_paths = []; },
  'rejects whitespace strings': f => { f.design.architecture = ['   ']; f.refresh(); },
  'rejects placeholder strings': f => { f.specification.requirements[0].scenarios[0].then = 'TODO'; f.refresh(); },
  'rejects context mismatch in plan': f => { f.plan.context_sha256 = 'a'.repeat(64); },
  'rejects context mismatch in spec': f => { f.specification.context_sha256 = 'a'.repeat(64); f.refresh(); },
  'rejects context mismatch in design': f => { f.design.context_sha256 = 'a'.repeat(64); f.refresh(); },
  'rejects spec mismatch in design': f => { f.design.specification_sha256 = 'a'.repeat(64); f.plan.design_sha256 = f.save(f.plan.design_path, f.design); },
  'rejects changed spec bytes': f => { f.save(f.plan.specification_path, JSON.stringify(f.specification)); },
  'rejects changed design bytes': f => { f.save(f.plan.design_path, JSON.stringify(f.design)); },
  'rejects oversized spec': f => { f.plan.specification_sha256 = f.save(f.plan.specification_path, ' '.repeat(256 * 1024 + 1)); },
  'rejects oversized design': f => { f.plan.design_sha256 = f.save(f.plan.design_path, ' '.repeat(256 * 1024 + 1)); },
  'rejects oversized supplied plan': f => { f.plan.objective = 'x'.repeat(256 * 1024); },
  'rejects extra task dependency field': f => { f.plan.phases[0].tasks[0].depends_on = []; },
  'rejects directory as test path': f => { f.plan.phases[0].tasks[0].test_paths = ['tests']; },
  'rejects symlinked input': f => { symlinkSync(join(f.repo, 'references'), join(f.repo, 'references/linked'), 'junction'); f.plan.specification_path = 'references/linked/functional-spec.json'; },
  'rejects symlinked ownership ancestor': f => { symlinkSync(join(f.repo, 'tests'), join(f.repo, 'linked-tests'), 'junction'); f.plan.phases[0].tasks[0].write_files.push('linked-tests/new.test.mjs'); }
};
for (const [name, mutate] of Object.entries(invalidCases)) test(`SDD ${name}`, ...(name.includes('symlinked')&&symlinkHost.status==='unavailable'?[{skip:`${symlinkHost.reason_code} (${symlinkHost.error_code}); host must permit directory junctions/symlinks to execute this security oracle.`}]:[]), t => {
  const f = fixture(t); mutate(f); assert.throws(() => inspectSDDPlan(f));
});
for (const path of ['../outside.json', '/tmp/outside.json', './references/functional-spec.json', 'references/../references/functional-spec.json', 'references//functional-spec.json', 'references\\functional-spec.json', 'references/functional-spec.json/']) test(`SDD rejects noncanonical path ${path}`, t => {
  const f = fixture(t); f.plan.specification_path = path; assert.throws(() => inspectSDDPlan(f));
});
test('SDD accepts intended tests in readable ownership before creation and never executes commands', t => {
  const f = fixture(t);
  const task = f.plan.phases[0].tasks[0];
  task.write_files = ['src']; task.read_files = ['tests']; task.test_paths = ['tests/future.test.mjs'];
  task.validation_commands = ['throw new Error("must never run")'];
  assert.equal(inspectSDDPlan(f).tasks[0].test_paths[0], 'tests/future.test.mjs');
  assert.equal(readFileSync(join(f.repo, 'src/request.mjs'), 'utf8'), 'export const requests = [];\n');
});
test('SDD joins every prerequisite phase and preserves deterministic order of independent phases', t => {
  const f = fixture(t);
  f.plan.phases[1].depends_on = [];
  const platform = f.task('platform-task', 'req-register', 'scenario-register');
  platform.owner = 'platform-engineer';
  f.plan.phases.push(f.phase('verification', [platform], ['register', 'list']));
  const result = inspectSDDPlan(f);
  assert.deepEqual(result.phase_order, ['register', 'list', 'verification']);
  assert.deepEqual(result.tasks.at(-1).depends_on, ['register-task', 'list-task']);
});

function installManagedArchitecture(f) {
  const contextText = JSON.stringify(fullContext, null, 2) + '\n';
  const contextHash = f.save('references/business-context.json', contextText);
  f.contextHash = contextHash;
  const technologyDecision = { selection: 'synthetic-node' };
  const technologyHash = f.save('references/technology-decision.json', technologyDecision);
  const approvalText = 'Synthetic fixture approval for architecture-managed SDD tests.';
  f.save('references/architecture-approval.md', approvalText);
  const decision = {
    schema_version: 1, mode: 'initial', profile: 'simple-application',
    layout: { name: 'Product', presentation: 'api', stack: 'node' },
    context_sha256: architectureContextHash(fullContext), technology_sha256: architectureTechnologyHash(technologyDecision), source_binding_sha256: null,
    requirements: { schema_version: 1, context_sha256: architectureContextHash(fullContext), domain_complexity: 'simple', modules: [], drivers: [], unknowns: [] },
    rationale: ['Synthetic fixture with one deployment unit'], alternatives: [{ profile: 'modular-monolith', reason: 'No module boundary requirement in fixture' }],
    research: [{ url: 'https://example.com/synthetic', accessed_at: '2026-01-01', findings: 'Synthetic fixture only' }],
    validation_strategy: ['Run the selected task validation profile'], migration: null
  };
  decision.approval = { status: 'approved', decision_sha256: architectureDigest(decision), approved_by: 'Synthetic fixture owner', approved_at: '2026-01-01T00:00:00Z', source_reference: 'references/architecture-approval.md', source_reference_sha256: hash(approvalText) };
  f.save('references/architecture-decision.json', decision);
  const decisionHash = architectureDigest(decision);
  f.save('project.json', { name: 'Product', presentation: 'api' });
  f.save('references/project-state.json', { scope_status: 'defined', context_path: 'references/business-context.json', technology_decision_path: 'references/technology-decision.json', architecture_path: 'references/architecture-decision.json' });
  f.plan.context_sha256 = contextHash;
  f.specification.context_sha256 = contextHash;
  f.design.context_sha256 = contextHash;
  f.plan.architecture_sha256 = decisionHash;
  for (const phase of f.plan.phases) for (const task of phase.tasks) task.architecture_impact = {
    classification: 'N1', rationale: 'Alteração local no módulo de solicitações.', signals: ['single_module'], affected_modules: ['Requests'],
    evidence_requirement_ids: [...task.requirement_ids], decision_refs: []
  };
  f.refresh();
  return { decision, decisionHash };
}

test('architecture-managed SDD requires evidenced impact per task and rejects under-classification', t => {
  const f = fixture(t); installManagedArchitecture(f);
  assert.notEqual(f.contextHash,architectureContextHash(fullContext),'SDD and traceability bind raw context bytes while architecture uses normalized semantic context.');
  assert.equal(f.plan.context_sha256,f.contextHash);
  assert.equal(f.specification.context_sha256,f.contextHash);
  assert.equal(inspectSDDPlan(f).tasks.length, 2);
  delete f.plan.phases[0].tasks[0].architecture_impact;
  assert.throws(() => inspectSDDPlan(f), /impacto arquitetural bloqueado/);
  f.plan.phases[0].tasks[0].architecture_impact = { classification: 'N0', rationale: 'Só documentação', signals: ['documentation_only'], affected_modules: ['Requests'], evidence_requirement_ids: ['req-register'], decision_refs: [] };
  assert.throws(() => inspectSDDPlan(f), /inferior ao piso/);
});

test('N4 impact requires the current approved evolution decision and its migration phase', t => {
  const f = fixture(t); const { decision, decisionHash } = installManagedArchitecture(f);
  const task = f.plan.phases[0].tasks[0];
  task.architecture_impact = { classification: 'N4', rationale: 'Troca estratégica da arquitetura do runtime.', signals: ['technology_change'], affected_modules: ['Requests'], evidence_requirement_ids: task.requirement_ids, decision_refs: ['references/architecture-decision.json'] };
  f.plan.architecture_sha256 = decisionHash; f.refresh();
  assert.throws(() => inspectSDDPlan(f), /N4 exige decisão arquitetural de evolução/);
  decision.mode = 'evolution';
  decision.migration = { from_profile: 'simple-application', baseline_sha256: 'a'.repeat(64), phases: ['list'], compatibility: ['Preserve API'], rollback: ['Restore previous runtime'], data_changes: false, irreversible: false, validation_profile: 'node-tests-v1' };
  decision.approval.decision_sha256 = architectureDigest(decision);
  f.save('references/architecture-decision.json', decision);
  f.plan.architecture_sha256 = architectureDigest(decision); f.refresh();
  assert.throws(() => inspectSDDPlan(f), /fora de uma fase de migração/);
  decision.migration.phases = ['register'];
  decision.approval.decision_sha256 = architectureDigest(decision);
  f.save('references/architecture-decision.json', decision); f.plan.architecture_sha256 = architectureDigest(decision); f.refresh();
  assert.equal(inspectSDDPlan(f).tasks.length, 2);
});

// Frontier ordering uses verified inventory edges and is independent of timestamps.
test('SDD checkpoint frontier rejects disconnected histories, forks and cycles', async () => {
 const {checkpointFrontier}=await import('../scripts/lib/sdd-workflow.mjs');
 assert.equal(checkpointFrontier([['a','b'],['b','c'],['c','c']]),'c');
 assert.equal(checkpointFrontier([['a','a']]),'a');
 assert.equal(checkpointFrontier([['a','b'],['a','c'],['b','d'],['c','d']]),'d');
 for(const edges of [[['a','b'],['a','c']],[['a','b'],['c','d']],[['a','b'],['b','a']],[['a','b'],['b','a'],['x','y']]])assert.throws(()=>checkpointFrontier(edges),/checkpoints SDD/);
});
