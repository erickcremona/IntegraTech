import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startTask, inspectTask, advanceTask, recoverTask } from '../scripts/lib/task-loop.mjs';
import { main } from '../scripts/toolkit.mjs';
import { checkPolicy } from '../scripts/lib/policy.mjs';

function fixture() {
  const repo = mkdtempSync(join(tmpdir(), 'task-loop-'));
  mkdirSync(join(repo, 'references'));
  mkdirSync(join(repo, 'src'));
  writeFileSync(join(repo, 'references/project-state.json'), JSON.stringify({ scope_status: 'pending', plan_gate: 'pending' }));
  writeFileSync(join(repo, 'references/business-context.json'), '{}');
  writeFileSync(join(repo, 'task.json'), JSON.stringify({
    schema_version: 1, task_id: 'loop-1', objective: 'Validar loop',
    business_context: '', technical_context: '', scope: ['src'], out_of_scope: [],
    assigned_agent: 'platform-engineer', supporting_agents: [], required_inputs: [],
    expected_deliverables: ['resultado'], constraints: [], file_ownership: { read: ['.'], write: ['src'] },
    risks: [], acceptance_criteria: ['validar'], validation_commands: [], evidence_required: [],
    deadline_or_priority: 'normal', human_gate: 'none'
  }));
  writeFileSync(join(repo, 'src', 'initial.txt'), 'initial');
  return repo;
}

test('starts blocked until a valid explicit transition', () => {
  const repo = fixture();
  try {
    const state = startTask({ repo, delegation: JSON.parse(readFileSync(join(repo, 'task.json'))), phase: 'toolkit', provider: 'codex' });
    assert.equal(state.status, 'awaiting_gate');
    assert.equal(inspectTask({ repo, id: state.id }).revision, 1);
  } finally { rmSync(repo, { recursive: true, force: true }); }
});

test('retries with the same task identity resume one loop and conflicting reuse is rejected', () => {
  const repo = fixture();
  try {
    const delegation = JSON.parse(readFileSync(join(repo, 'task.json')));
    const started = startTask({ repo, delegation, phase: 'toolkit', provider: 'codex' });
    const retried = startTask({ repo, delegation, phase: 'toolkit', provider: 'codex' });
    assert.equal(retried.id, started.id);
    assert.equal(retried.revision, started.revision);
    assert.throws(() => startTask({ repo, delegation: { ...delegation, objective: 'Outra tarefa' }, phase: 'toolkit', provider: 'codex' }), /identidade/);
  } finally { rmSync(repo, { recursive: true, force: true }); }
});

test('persists the selected Cursor provider without changing the task identity', () => {
  const repo = fixture();
  try {
    const state = startTask({ repo, delegation: JSON.parse(readFileSync(join(repo, 'task.json'))), phase: 'toolkit', provider: 'cursor' });
    assert.equal(state.provider, 'cursor');
  } finally { rmSync(repo, { recursive: true, force: true }); }
});

test('requires expected revision and persists an append-only transition', () => {
  const repo = fixture();
  try {
    const started = startTask({ repo, delegation: JSON.parse(readFileSync(join(repo, 'task.json'))), phase: 'toolkit', provider: 'codex' });
    assert.throws(() => advanceTask({ repo, id: started.id, expectedRevision: 0, event: { type: 'gate_checked' } }), /revisão/);
    const advanced = advanceTask({ repo, id: started.id, expectedRevision: 1, event: { type: 'gate_checked' } });
    assert.equal(advanced.status, 'awaiting_gate');
    const ready = advanceTask({ repo, id: started.id, expectedRevision: 2, event: { type: 'gate_checked' } });
    assert.equal(ready.status, 'implementation_pending');
    assert.equal(ready.revision, 3);
    assert.equal(inspectTask({ repo, id: started.id }).revision, 3);
  } finally { rmSync(repo, { recursive: true, force: true }); }
});

test('CLI exposes task creation, inspection, and gate recheck without accepting an asserted approval', async () => {
  const repo = fixture();
  try {
    const started = await main(['loop-start', '--task', join(repo, 'task.json'), '--phase', 'toolkit', '--provider', 'codex', '--repo', repo]);
    assert.equal(started.status, 'awaiting_gate');
    await assert.rejects(main(['loop-advance', '--id', started.id, '--revision', '1', '--event', 'approved', '--repo', repo]));
    const checked = await main(['loop-advance', '--id', started.id, '--revision', '1', '--event', 'gate_checked', '--repo', repo]);
    assert.equal(checked.status, 'awaiting_gate');
    assert.equal((await main(['loop-status', '--id', started.id, '--repo', repo])).revision, 2);
  } finally { rmSync(repo, { recursive: true, force: true }); }
});

test('rejects transitions after owned files change', () => {
  const repo = fixture();
  try {
    const started = startTask({ repo, delegation: JSON.parse(readFileSync(join(repo, 'task.json'))), phase: 'toolkit', provider: 'codex' });
    writeFileSync(join(repo, 'src', 'initial.txt'), 'changed');
    assert.equal(inspectTask({ repo, id: started.id }).snapshot_matches, false);
    assert.throws(() => advanceTask({ repo, id: started.id, expectedRevision: 1, event: { type: 'gate_checked' } }), /snapshot/);
  } finally { rmSync(repo, { recursive: true, force: true }); }
});

test('rejects a locally edited state that claims an unobserved delivery status', () => {
  const repo = fixture();
  try {
    const started = startTask({ repo, delegation: JSON.parse(readFileSync(join(repo, 'task.json'))), phase: 'toolkit', provider: 'codex' });
    const statePath = join(repo, 'qa-artifacts', 'loops', started.id, 'state.json');
    const altered = JSON.parse(readFileSync(statePath, 'utf8'));
    altered.status = 'ready_for_delivery';
    writeFileSync(statePath, JSON.stringify(altered));
    assert.throws(() => inspectTask({ repo, id: started.id }));
  } finally { rmSync(repo, { recursive: true, force: true }); }
});

test('recovery refuses live writers and clears a confirmed dead transition lock', () => {
  const repo = fixture();
  try {
    const started = startTask({ repo, delegation: JSON.parse(readFileSync(join(repo, 'task.json'))), phase: 'toolkit', provider: 'codex' });
    const lock = join(repo, 'qa-artifacts', 'loops', `${started.id}.transition.lock`);
    mkdirSync(join(repo, 'qa-artifacts', 'loops'), { recursive: true });
    writeFileSync(lock, JSON.stringify({ id: started.id, pid: process.pid }));
    assert.throws(() => recoverTask({ repo, id: started.id }), /não confirmado/);
    writeFileSync(lock, JSON.stringify({ id: started.id, pid: 2147483647 }));
    assert.equal(recoverTask({ repo, id: started.id }).revision, 1);
  } finally { rmSync(repo, { recursive: true, force: true }); }
});

test('recovery clears an interrupted task creation before allowing an idempotent retry', () => {
  const repo = fixture();
  try {
    const root = join(repo, 'qa-artifacts', 'loops');
    mkdirSync(join(root, 'loop-1'), { recursive: true });
    writeFileSync(join(root, 'loop-1', 'partial.tmp'), 'partial');
    writeFileSync(join(root, 'loop-1.lock'), JSON.stringify({ id: 'loop-1', pid: 2147483647, stage: 'creating' }));

    const recovered = recoverTask({ repo, id: 'loop-1' });

    assert.equal(recovered.status, 'recovered');
    assert.equal(recovered.stage, 'creation');
    assert.equal(existsSync(join(root, 'loop-1.lock')), false);
    assert.equal(existsSync(join(root, 'loop-1')), false);
    const started = startTask({ repo, delegation: JSON.parse(readFileSync(join(repo, 'task.json'))), phase: 'toolkit', provider: 'codex' });
    assert.equal(started.revision, 1);
  } finally { rmSync(repo, { recursive: true, force: true }); }
});

test('recovery keeps an incomplete creation lock when its writer cannot be identified', () => {
  const repo = fixture();
  try {
    const root = join(repo, 'qa-artifacts', 'loops');
    mkdirSync(join(root, 'loop-1'), { recursive: true });
    writeFileSync(join(root, 'loop-1', 'partial.tmp'), 'partial');
    writeFileSync(join(root, 'loop-1.lock'), '{"id":"loop-1","pid":');

    assert.throws(() => recoverTask({ repo, id: 'loop-1' }), /lock inválido/);
    assert.equal(existsSync(join(root, 'loop-1.lock')), true);
    assert.equal(existsSync(join(root, 'loop-1', 'partial.tmp')), true);
  } finally { rmSync(repo, { recursive: true, force: true }); }
});

test('toolkit write policy is limited to the platform engineer in toolkit phase', () => {
  const repo = fixture();
  try {
    assert.equal(checkPolicy({ repo, action: 'implement_toolkit', agent: 'platform-engineer', phase: 'toolkit' }).status, 'allowed');
    assert.equal(checkPolicy({ repo, action: 'implement_toolkit', agent: 'application-engineer', phase: 'toolkit' }).status, 'blocked');
    assert.equal(checkPolicy({ repo, action: 'implement_toolkit', agent: 'platform-engineer', phase: 'business' }).status, 'blocked');
    assert.equal(checkPolicy({ repo, action: 'implement', agent: 'platform-engineer', phase: 'toolkit' }).status, 'blocked');
  } finally { rmSync(repo, { recursive: true, force: true }); }
});
