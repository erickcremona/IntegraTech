import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { specialistFiles } from '../scripts/lib/domain-specialist.mjs';
import { fullContext as context, preparationFor, researchRequest } from './domain-fixture.mjs';
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { spawnSync } from 'node:child_process';
import { restoreAdoption } from '../scripts/lib/adoption-recovery.mjs';
const workflow = await import('../scripts/lib/domain-workflow.mjs').catch(() => ({}));
function fixture() {
  const repo = mkdtempSync(join(tmpdir(), 'domain-workflow-'));
  const save = (path, value) => { mkdirSync(dirname(join(repo, path)), { recursive: true }); writeFileSync(join(repo, path), typeof value === 'string' ? value : JSON.stringify(value)); };
  save('project.json', { name: 'Atendimento', provider: 'all', is_model: false, presentation: 'api' });
  save('references/business-context.json', context);
  save('references/project-state.json', { context_path: 'references/business-context.json', specialist_path: 'references/domain-specialist.json', workflow_status: 'materialized' });
  for (const [path, text] of specialistFiles({ name: 'Atendimento', provider: 'all', context, preparation: preparationFor() })) save(path, text);
  return { repo, save };
}
test('desenho: especialista íntegro e consulta por funcionalidade; alterações invalidam', () => {
  const f = fixture();
  const specialist = workflow.inspectSpecialist(f.repo);
  const record = { schema_version: 1, feature_id: 'registro', context_sha256: specialist.context_sha256, preparation_sha256: specialist.preparation_sha256, skill_sha256: specialist.skill_sha256, findings: ['Rótulos claros nos campos'], domain_impacts: ['Toda solicitação tem responsável'] };
  assert.equal(workflow.inspectConsultation(f.repo, record).status, 'ready');
  assert.throws(() => workflow.inspectConsultation(f.repo, { ...record, feature_id: '' }));
  f.save(specialist.skill_path, 'skill alterada');
  assert.throws(() => workflow.inspectSpecialist(f.repo));
});
test('especialista: adaptação local ou contexto modificado invalida; atualização preserva conflitos', () => {
  const f = fixture();
  const meta = workflow.inspectSpecialist(f.repo);
  f.save(meta.adapter_paths[0], 'edição local');
  assert.throws(() => workflow.inspectSpecialist(f.repo));
  assert.throws(() => workflow.prepareSpecialist({ repo: f.repo, preparation: preparationFor(), request: researchRequest }), /conflito|alterad/i);
  assert.equal(readFileSync(join(f.repo, meta.adapter_paths[0]), 'utf8'), 'edição local');
});
test('coerência: conclusão exige avaliação completa, comandos reais registrados e snapshot atual', () => {
  const f = fixture();
  const snapshot = workflow.repositorySnapshot(f.repo);
  const meta = workflow.inspectSpecialist(f.repo);
  const report = { schema_version: 1, context_sha256: meta.context_sha256, preparation_sha256: meta.preparation_sha256, skill_sha256: meta.skill_sha256, snapshot_sha256: snapshot, assessments: ['structure', 'code', 'tests', 'dependencies', 'configuration', 'documentation', 'skills', 'context'].map(area => ({ area, conclusion: 'Avaliado sem contradição relevante', status: 'passed' })), changes: [], pending: [] };
  assert.throws(() => workflow.inspectCoherence({ repo: f.repo, report }), /validação|verifica/i);
  workflow.runCoherenceChecks({ repo: f.repo, execute: () => ({ status: 0, stdout: 'PASS', stderr: '' }) });
  assert.equal(workflow.inspectCoherence({ repo: f.repo, report }).status, 'ready');
  assert.throws(() => workflow.inspectCoherence({ repo: f.repo, report: { ...report, pending: [{ description: 'Dependência sem justificativa', blocking: true }] } }));
  f.save('nova-config.json', '{}');
  assert.throws(() => workflow.inspectCoherence({ repo: f.repo, report }), /mudou|diverg|atual/i);
});
test('coerência: comando falho não permite conclusão', () => {
  const f = fixture();
  const result = workflow.runCoherenceChecks({ repo: f.repo, execute: () => ({ status: 1, stdout: '', stderr: 'Falha' }) });
  assert.equal(result.status, 'blocked');
});
test('coerência: verificações do toolkit não exigem uma stack de produto predefinida', () => {
  const f = fixture(), commands = [];
  workflow.runCoherenceChecks({ repo: f.repo, execute: (command, args) => { commands.push([command, ...args]); return { status: 0, stdout: 'PASS', stderr: '' }; } });
  assert.deepEqual(commands, [['npm', 'test'], ['npm', 'run', 'check']]);
  assert.equal(commands.flat().some(value => /dotnet|\.sln|\.csproj/i.test(value)), false);
});
test('especialista: migração de projeto existente reconsulta e preserva identidade', () => {
  const f = fixture();
  assert.equal(workflow.prepareSpecialist({ repo: f.repo, preparation: preparationFor(), request: researchRequest }).status, 'prepared');
  assert.equal(JSON.parse(readFileSync(join(f.repo, 'project.json'))).name, 'Atendimento');
});
test('especialista: conflito durante atualização nunca apaga edição concorrente', () => {
  const f = fixture(), meta = workflow.inspectSpecialist(f.repo);
  const path = join(f.repo, meta.skill_path), original = fs.readFileSync;
  let reads = 0;
  fs.readFileSync = (selected, ...args) => {
    if (selected === path && ++reads === 3) writeFileSync(path, 'edição concorrente que deve permanecer');
    return original(selected, ...args);
  }; syncBuiltinESMExports();
  try { assert.throws(() => workflow.prepareSpecialist({ repo: f.repo, preparation: preparationFor(), request: researchRequest }), /conflito|recuperação/i); }
  finally { fs.readFileSync = original; syncBuiltinESMExports(); }
  assert.equal(readFileSync(path, 'utf8'), 'edição concorrente que deve permanecer');
});
test('especialista: interrupção abrupta permite recuperação explícita por journal', t => {
  const f = fixture(), meta = workflow.inspectSpecialist(f.repo);
  const original = readFileSync(join(f.repo, meta.skill_path), 'utf8');
  const input = preparationFor(); input.risks.push('Risco adicional avaliado na atualização');
  f.save('.scratch/update.json', input);
  const script = `import fs from 'node:fs'; import {syncBuiltinESMExports} from 'node:module';
    const {prepareSpecialist}=await import(process.argv[1]);const {researchRequest}=await import(process.argv[2]);
    const original=fs.renameSync; fs.renameSync=(from,to)=>{original(from,to);if(String(to).split(String.fromCharCode(92)).join('/').endsWith('/SKILL.md'))process.exit(23);};syncBuiltinESMExports();
    prepareSpecialist({repo:process.argv[3],preparation:JSON.parse(fs.readFileSync(process.argv[3]+'/.scratch/update.json')),request:researchRequest});`;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', script, new URL('../scripts/lib/domain-workflow.mjs', import.meta.url).href, new URL('./domain-fixture.mjs', import.meta.url).href, f.repo]);
  if (result.error?.code === 'EPERM') return t.skip('ambiente bloqueia subprocessos; outros testes cobrem recuperação por journal em processo');
  assert.equal(result.status, 23);
  assert.notEqual(readFileSync(join(f.repo, meta.skill_path), 'utf8'), original);
  const directory = fs.readdirSync(join(f.repo, '.scratch/adoptions'))[0];
  assert.equal(restoreAdoption(join(f.repo, '.scratch/adoptions', directory, 'journal.json')).status, 'restored');
  assert.equal(readFileSync(join(f.repo, meta.skill_path), 'utf8'), original);
  assert.doesNotThrow(() => workflow.inspectSpecialist(f.repo));
});
