import test from 'node:test';
import assert from 'node:assert/strict';
import { main } from '../scripts/toolkit.mjs';
import { mkdtempSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
test('CLI: erro de contexto não inclui seu conteúdo no diagnóstico', async () => {
  const file = join(mkdtempSync(join(tmpdir(), 'context-diagnostic-')), 'invalid.json');
  writeFileSync(file, '{"problem": "conteudo-privado"');
  await assert.rejects(main(['adopt-project', '--name', 'Projeto', '--context-file', file]), error => !error.message.includes('conteudo-privado') && error.message.includes('contexto inicial'));
});
test('CLI: rejeita opção desconhecida, duplicada, fase e provedor inválidos', async () => {
  for (const args of [['precheck', '--phase', 'unknown'], ['install', '--provider', 'unknown'], ['help', '--secret', 'x'], ['route', '--category', 'qa', '--category', 'worker'], ['dispatch', '--provider']])
    await assert.rejects(main(args));
  assert.equal((await main(['route', '--category', 'qa'])).name, 'qa-engineer');
  assert.ok((await main(['help'])).includes('resume'));
});

test('CLI help enumerates every route, policy action, and contract schema', async () => {
  const help = await main(['help']);
  const { catalog } = await import('../scripts/lib/governance.mjs');
  const { policyConfig } = await import('../scripts/lib/policy.mjs');
  const contractsDirectory = new URL('../fabrica/team/contracts/', import.meta.url);
  const contracts = readdirSync(contractsDirectory).filter(name => name.endsWith('.schema.json')).map(name => name.replace(/\.schema\.json$/, ''));
  for (const route of Object.keys(catalog.routes)) assert.ok(help.includes(route), `help precisa listar a rota ${route}`);
  for (const action of Object.keys(policyConfig().actions)) assert.ok(help.includes(action), `help precisa listar a ação ${action}`);
  for (const kind of contracts) assert.ok(help.includes(kind), `help precisa listar o contrato ${kind}`);
});

test('CLI: tecnologia informa pesquisa pendente e valida recomendação sem gerar arquivos', async () => {
  const { context, decisionFor } = await import('./technology-fixture.mjs');
  const { mkdirSync, readdirSync } = await import('node:fs');
  const repo = mkdtempSync(join(tmpdir(), 'technology-cli-'));
  const contextFile = join(repo, 'context.json'), decisionFile = join(repo, 'decision.json');
  writeFileSync(contextFile, JSON.stringify(context));
  const help = await main(['help']);
  assert.doesNotMatch(help, /--presentation\b/);
  for (const command of ['create-project', 'adopt-project'])
    await assert.rejects(main([command, '--presentation', 'api']), /comando\/opção desconhecido/);
  const pending = await main(['technology-check', '--context-file', contextFile]);
  assert.equal(pending.status, 'needs_research');
  assert.match(pending.context_sha256, /^[a-f0-9]{64}$/);
  const decision = decisionFor();
  decision.approval.status = 'proposed'; decision.approval.source_reference = null;
  writeFileSync(decisionFile, JSON.stringify(decision));
  assert.equal((await main(['technology-check', '--repo', repo, '--context-file', contextFile, '--decision-file', decisionFile])).status, 'proposed');
  const target = join(repo, 'new-project');
  await assert.rejects(main(['create-project', '--name', 'Catalogo', '--target', target, '--context-file', contextFile, '--technology-file', decisionFile]), /aprova/i);
  assert.deepEqual(readdirSync(repo).sort(), ['context.json', 'decision.json']);
  decision.approval.status = 'approved'; decision.selected_option = 'static';
  mkdirSync(join(repo, 'references'));
  writeFileSync(join(repo, decision.approval.source_reference = 'references/aceite.md'), 'Aceite para aplicação estática.');
  writeFileSync(decisionFile, JSON.stringify(decision));
  const checked = await main(['technology-check', '--repo', repo, '--context-file', contextFile, '--decision-file', decisionFile]);
  assert.equal(checked.status, 'approved');
  assert.equal(checked.selection.stack, 'static-web');
});

test('CLI: system-design-assess recusa especificação vinculada a outro contexto', async () => {
  const { fingerprint } = await import('../scripts/lib/candidate.mjs');
  const repo = mkdtempSync(join(tmpdir(), 'system-design-cli-'));
  const contextFile = join(repo, 'context.json'), specificationFile = join(repo, 'specification.json');
  const context = { problem: 'Contexto atual' };
  writeFileSync(contextFile, JSON.stringify(context));
  writeFileSync(specificationFile, JSON.stringify({ schema_version: 1, context_sha256: fingerprint({ problem: 'Outro contexto' }), requirements: [{ id: 'req-1', description: 'Preservar o histórico.', scenarios: [{ id: 'scenario-1', given: 'Uma solicitação', when: 'É acompanhada', then: 'O histórico permanece disponível' }] }] }));
  await assert.rejects(main(['system-design-assess', '--context-file', contextFile, '--specification-file', specificationFile]), /contexto e especificação divergentes/i);
  await assert.rejects(main(['system-design-assess', '--context-file', contextFile]), /obrigatórios/i);
});
