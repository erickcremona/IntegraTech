import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { context, decisionFor } from './technology-fixture.mjs';
const moduleUrl = new URL('../scripts/lib/technology-decision.mjs', import.meta.url);
function fixture() {
  const repo = mkdtempSync(join(tmpdir(), 'technology-'));
  mkdirSync(join(repo, 'references'));
  writeFileSync(join(repo, 'references/aceite-tecnologia.md'), 'Usuário aprovou API .NET para o catálogo.');
  return repo;
}
test('tecnologia: decisão pesquisada e aprovada resolve modelo e vincula contexto', async () => {
  const { inspectTechnologyDecision, selectionForGeneration } = await import(moduleUrl);
  const repo = fixture(), decision = decisionFor();
  const result = inspectTechnologyDecision({ decision, context, repo });
  assert.equal(result.generator_supported, true);
  assert.equal(result.selection.presentation, 'api');
  assert.equal(selectionForGeneration({ decision, context, repo }), 'api');
  assert.throws(() => selectionForGeneration({ decision, context: { ...context, problem: 'Outro problema.' }, repo }), /contexto/i);
  assert.throws(() => selectionForGeneration({ decision, context, repo, presentation: 'worker' }), /diverg/i);
});
test('tecnologia: recomendação fora do catálogo não gera aproximação .NET', async () => {
  const { inspectTechnologyDecision, selectionForGeneration } = await import(moduleUrl);
  const repo = fixture(), decision = decisionFor(); decision.selected_option = 'static';
  assert.equal(inspectTechnologyDecision({ decision, context, repo }).generator_supported, false);
  assert.throws(() => selectionForGeneration({ decision, context, repo }), /suportad/i);
});
test('tecnologia: fontes, datas, alternativas e pesquisa indisponível falham sem inventar evidência', async () => {
  const { inspectTechnologyDecision } = await import(moduleUrl);
  for (const mutate of [
    d => d.research[0].url = 'http://example.com',
    d => d.research[0].accessed_at = '2026-02-30',
    d => d.research[0].accessed_at = '2999-01-01',
    d => d.research[0].status = 'unavailable',
    d => d.options[0].source_urls = ['https://example.com/unconsulted'],
    d => d.options.push(structuredClone(d.options[0])),
    d => d.selected_option = 'missing',
    d => d.drivers = ['  ']
  ]) {
    const decision = decisionFor(); mutate(decision);
    assert.throws(() => inspectTechnologyDecision({ decision, context, repo: fixture() }));
  }
});
test('tecnologia: proposta pode ser inspecionada mas não materializada; aceite exige referência local', async () => {
  const { inspectTechnologyDecision, selectionForGeneration } = await import(moduleUrl);
  const repo = fixture(), decision = decisionFor(); decision.approval.status = 'proposed';
  assert.equal(inspectTechnologyDecision({ decision, context, repo }).status, 'proposed');
  assert.throws(() => selectionForGeneration({ decision, context, repo }), /aprova/i);
  decision.approval.status = 'approved';
  for (const reference of ['../escape.md', 'references/missing.md']) {
    decision.approval.source_reference = reference;
    assert.throws(() => selectionForGeneration({ decision, context, repo }));
  }
  decision.approval.source_reference = 'references/aceite-tecnologia.md';
  writeFileSync(join(repo, decision.approval.source_reference), '   ');
  assert.throws(() => selectionForGeneration({ decision, context, repo }), /aceite/i);
});
