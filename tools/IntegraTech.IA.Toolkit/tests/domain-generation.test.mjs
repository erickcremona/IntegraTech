import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createProject } from '../scripts/lib/project-generator.mjs';
import { decisionFor } from './technology-fixture.mjs';
import { fullContext as context, preparationFor, researchRequest } from './domain-fixture.mjs';
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
test('projeto: seleção manual não contorna contexto, pesquisa e decisão', () => {
  const target = mkdtempSync(join(tmpdir(), 'domain-block-'));
  assert.throws(() => createProject({ name: 'Atendimento', target, presentation: 'api', dryRun: true }), /contexto|pesquisa|decisão/i);
  assert.deepEqual(readdirSync(target), []);
});
test('projeto: rede bloqueada não escreve; sucesso gera especialista e referências', () => {
  const target = mkdtempSync(join(tmpdir(), 'domain-create-'));
  const repo = mkdtempSync(join(tmpdir(), 'domain-approval-')); mkdirSync(join(repo, 'references'));
  writeFileSync(join(repo, 'references/aceite-tecnologia.md'), 'Aprovação do usuário para API .NET.');
  const args = { name: 'Atendimento', target, provider: 'all', context, preparation: preparationFor(), technologyDecision: decisionFor(context), decisionRepo: repo };
  assert.throws(() => createProject({ ...args, researchRequest: () => { throw new Error('Rede indisponível'); } }), /Rede indisponível/);
  assert.deepEqual(readdirSync(target), []);
  assert.equal(createProject({ ...args, researchRequest }).status, 'created');
  const state = JSON.parse(readFileSync(join(target, 'references/project-state.json')));
  assert.equal(state.specialist_path, 'references/domain-specialist.json');
  assert.equal(state.workflow_status, 'materialized');
});
function readyOptions() {
  const target = mkdtempSync(join(tmpdir(), 'domain-atomic-'));
  const repo = mkdtempSync(join(tmpdir(), 'domain-approve-')); mkdirSync(join(repo, 'references'));
  writeFileSync(join(repo, 'references/aceite-tecnologia.md'), 'Usuário aprovou API.');
  return { name: 'Atendimento', target, context, preparation: preparationFor(), technologyDecision: decisionFor(context), decisionRepo: repo, researchRequest };
}
test('projeto: falha de gravação não deixa destino parcial e permite repetir', () => {
  const args = readyOptions(), original = fs.writeFileSync;
  let writes = 0;
  fs.writeFileSync = (path, ...rest) => {
    if (typeof path === 'string' && (path.startsWith(args.target) || path.includes('.factory-create-')) && ++writes === 3) throw new Error('ENOSPC simulado');
    return original(path, ...rest);
  }; syncBuiltinESMExports();
  try { assert.throws(() => createProject(args), /ENOSPC/); }
  finally { fs.writeFileSync = original; syncBuiltinESMExports(); }
  assert.deepEqual(readdirSync(args.target), []);
  assert.equal(createProject(args).status, 'created');
});
test('projeto: fonte técnica declarada consulted não dispensa evidência pública e reconsulta', () => {
  const args = readyOptions();
  for (const option of args.technologyDecision.options) option.source_urls = ['https://127.0.0.1/private'];
  args.technologyDecision.research = [{ url: 'https://127.0.0.1/private', accessed_at: '2026-11-08', status: 'consulted', findings: 'Framework HTTP' }];
  assert.throws(() => createProject(args), /fonte|HTTPS|públic|técnic/i);
  assert.deepEqual(readdirSync(args.target), []);
});
