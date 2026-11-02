import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const base = new URL('../', import.meta.url);
const read = name => JSON.parse(readFileSync(new URL(name, base), 'utf8'));
const core = async () => {
  const url = new URL('scripts/lib/contracts.mjs', base);
  assert.ok(await import('node:fs').then(fs => fs.existsSync(url)), 'validador de contratos ainda ausente');
  return import(url);
};
test('contratos: revisão válida, tipos e identidade', async () => {
  const { validateContract } = await core();
  const review = read('fabrica/templates/review.json');
  assert.doesNotThrow(() => validateContract('review', review, review.task_id));
  for (const change of [{ extra: true }, { schema_version: '1' }, { findings: {} }, { task_id: '' }, { verdict: 'ok' }])
    assert.throws(() => validateContract('review', { ...review, ...change }, review.task_id));
  assert.throws(() => validateContract('review', review, 'outra-tarefa'));
  assert.throws(() => validateContract('review', { ...review, verdict: 'approved', findings: [{ severity: 'high', title: 'x', evidence: 'x', path: 'x', impact: 'x', recommendation: 'x', line: 1 }] }));
});
test('retorno: completed exige evidência, testes e ausência de pendências', async () => {
  const { validateContract } = await core();
  const result = read('fabrica/templates/return.json');
  assert.doesNotThrow(() => validateContract('return', result));
  assert.throws(() => validateContract('return', { ...result, status: 'completed' }));
  const done = { ...result, status: 'completed', tests_executed: ['npm test'], test_results: ['PASS'], evidence: ['report.json'], pending_items: [], decisions_required: [] };
  assert.doesNotThrow(() => validateContract('return', done));
  assert.throws(() => validateContract('return', { ...done, pending_items: ['escopo'] }));
});
test('delegação: rejeita campos ausentes e ownership inválido', async () => {
  const { validateContract } = await core();
  const data = read('fabrica/templates/delegation.json');
  assert.doesNotThrow(() => validateContract('delegation', data));
  assert.throws(() => validateContract('delegation', { ...data, file_ownership: { read: [], write: 'src' } }));
  const { acceptance_criteria, ...missing } = data;
  assert.throws(() => validateContract('delegation', missing));
});
test('governança: sem escopo, negócio bloqueado e toolkit permitido', async () => {
  const { precheck, route } = await import(new URL('scripts/lib/governance.mjs', base));
  const repo = mkdtempSync(join(tmpdir(), 'integratech-precheck-'));
  mkdirSync(join(repo, 'references'));
  writeFileSync(join(repo, 'references/project-state.json'), JSON.stringify({ scope_status: 'pending', plan_gate: 'pending' }));
  assert.equal(precheck(repo, 'toolkit').status, 'ready');
  assert.equal(precheck(repo, 'business').status, 'blocked');
  writeFileSync(join(repo, 'references/project-state.json'), JSON.stringify({ scope_status: 'defined', plan_gate: 'pending' }));
  assert.equal(precheck(repo, 'business').status, 'blocked');
  writeFileSync(join(repo, 'references/project-state.json'), JSON.stringify({ scope_status: 'defined', plan_gate: 'approved' }));
  assert.equal(precheck(repo, 'business').status, 'blocked');
  assert.throws(() => precheck(repo, 'unknown'));
  assert.throws(() => route('__proto__'));
  assert.throws(() => route('toString'));
  for (const item of read('fabrica/team/routing-scenarios.yaml').scenarios)
    if (item.expected === 'blocked') assert.throws(() => route(item.category));
    else assert.equal(route(item.category).name, item.expected);
});
test('schema: keyword nova não pode ser ignorada', async () => {
  const { assertSupported } = await core();
  assert.throws(() => assertSupported({ type: 'object', oneOf: [] }), /não suportada/);
});
