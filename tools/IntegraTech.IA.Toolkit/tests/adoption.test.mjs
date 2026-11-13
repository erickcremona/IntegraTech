import { adoptProject as preparedAdopt } from './generation-fixture.mjs';
import { fullContext } from './domain-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
const root = fileURLToPath(new URL('../../../', import.meta.url));
const prefix = 'tools/IntegraTech.IA.Toolkit/';
const model = JSON.parse(readFileSync(join(root, 'project.json'), 'utf8')).is_model;
const options = { skip: !model };
async function fixture({ git = false, canonical = false } = {}) {
  const module = await import('../scripts/lib/project-adoption.mjs');
  const repo = mkdtempSync(join(tmpdir(), 'model-adoption-'));
  const baseline = JSON.parse(readFileSync(join(root, prefix, 'fabrica/template-baseline.json'), 'utf8'));
  for (const path of [...Object.keys(baseline.files), prefix + 'fabrica/template-baseline.json']) {
    mkdirSync(dirname(join(repo, path)), { recursive: true });
    writeFileSync(join(repo, path), readFileSync(join(root, path)));
  }
  writeFileSync(join(repo, 'personal.txt'), 'Meu arquivo pessoal');
  let gitExecFileSync;
  if (git) {
    mkdirSync(join(repo, '.git'));
    writeFileSync(join(repo, '.git/config'), `[remote "origin"]\n\turl = ${canonical ? baseline.canonical_repository : 'https://github.com/example/MeuProjeto.git'}\n`);
    gitExecFileSync = (_command, args) => args.includes('--get-regexp') ? `remote.origin.url ${canonical ? baseline.canonical_repository : 'https://github.com/example/MeuProjeto.git'}\n` : '';
  }
  return { repo, baseline, gitExecFileSync, ...module, rawAdoptProject: module.adoptProject, adoptProject: args => preparedAdopt({ gitExecFileSync, ...args }) };
}
test('adoção: simula sem escrita e converte nome/contexto na mesma pasta', options, async () => {
  const f = await fixture({ git: true });
  const gitConfig = readFileSync(join(f.repo, '.git/config'));
  const args = { repo: f.repo, presentation: 'worker', name: 'MensagensCliente', context: { problem: 'Automatizar mensagens do WhatsApp para os atendentes.' } };
  assert.equal(f.adoptProject({ ...args, dryRun: true }).status, 'planned');
  assert.equal(JSON.parse(readFileSync(join(f.repo, 'project.json'))).is_model, true);
  assert.equal(existsSync(join(f.repo, '.scratch')), false);
  const result = f.adoptProject(args);
  assert.equal(result.status, 'adopted');
  assert.equal(existsSync(join(f.repo, 'MensagensCliente.sln')), false);
  assert.equal(existsSync(join(f.repo, 'IntegraTech.sln')), false);
  const identity = JSON.parse(readFileSync(join(f.repo, 'project.json')));
  assert.equal(identity.is_model, false);
  assert.equal(Object.hasOwn(identity, 'presentation'), false);
  assert.ok(readFileSync(join(f.repo,'README.md'),'utf8').includes(args.context.problem));
  assert.ok(readFileSync(join(f.repo,'README.md'),'utf8').includes('Este projeto foi criado com base no [IntegraTech]'));
  assert.ok(readFileSync(join(f.repo,'SOLUTION_CONTEXT.md'),'utf8').includes(args.context.problem));
  assert.ok(readFileSync(join(f.repo,'references/README.md'),'utf8').includes(args.context.problem));
  assert.ok(!readFileSync(join(f.repo,'AGENTS.md'),'utf8').includes('Se is_model=true'));
  assert.equal(identity.adoption.status, 'adopted');
  const context = JSON.parse(readFileSync(join(f.repo, 'references/business-context.json')));
  assert.equal(context.problem, args.context.problem);
  assert.deepEqual(context.stakeholders, fullContext.stakeholders);
  assert.equal(readFileSync(join(f.repo, 'personal.txt'), 'utf8'), 'Meu arquivo pessoal');
  assert.deepEqual(readFileSync(join(f.repo, '.git/config')), gitConfig);
  const { main } = await import(pathToFileURL(join(f.repo, 'tools/MensagensCliente.IA.Toolkit/scripts/toolkit.mjs')));
  assert.equal((await main(['validate'])).status, 'valid');
  assert.equal(existsSync(join(f.repo, 'tools/MensagensCliente.IA.Toolkit/scripts/lib/task-loop.mjs')), true);
  assert.equal(existsSync(join(f.repo, 'tools/MensagensCliente.IA.Toolkit/scripts/lib/verify-report.mjs')), true);
  assert.equal((await main(['precheck', '--phase', 'business'])).status, 'blocked');
  assert.throws(() => f.adoptProject(args), /real|adotado/i);
});
test('adoção: gera relatório de prontidão do toolkit para apresentação antes da operação', options, async () => {
  const f = await fixture();
  const result = f.adoptProject({ repo: f.repo, presentation: 'worker', name: 'ProdutoRelatorio', context: 'Organizar atendimento.' });
  assert.equal(result.readiness_report.status, 'ready');
  assert.equal(result.readiness_report.generation_status, 'generated');
  assert.match(result.readiness_report.content, /Relatório de prontidão do toolkit/);
  assert.match(result.readiness_report.content, /Papéis especializados: 16/);
  assert.ok(readFileSync(join(f.repo, 'references/toolkit-readiness.md'), 'utf8').includes('Validação dinâmica completa: npm run verify passou em fixture-only'));
  assert.ok(result.readiness_report.content.includes('Comandos CLI:'));
  assert.ok(result.readiness_report.content.includes('Propósito declarado'));
  assert.ok(readFileSync(join(f.repo, 'README.md'), 'utf8').includes('toolkit-readiness.md'));
});
test('adoção: exige verificação aprovada vinculada ao conteúdo atual', options, async () => {
  const f = await fixture();
  const { generationOptions } = await import('./generation-fixture.mjs');
  const args = generationOptions({ repo: f.repo, presentation: 'worker', name: 'ProdutoSemVerificacao', context: 'Organizar atendimento.' });
  assert.throws(() => f.rawAdoptProject(args), /npm run verify/);
  assert.equal(JSON.parse(readFileSync(join(f.repo, 'project.json'))).is_model, true);
  assert.equal(existsSync(join(f.repo, '.scratch/adoptions')), false);
});
test('adoção: bloqueia origem canônica, alterações locais e colisões antes de escrever', options, async () => {
  for (const kind of ['canonical', 'modified', 'collision', 'missing-problem']) {
    const f = await fixture({ git: kind === 'canonical', canonical: kind === 'canonical' });
    if (kind === 'modified') writeFileSync(join(f.repo, 'README.md'), 'alteração pessoal');
    if (kind === 'collision') writeFileSync(join(f.repo, 'references/technology-decision.json'), 'registro pessoal');
    assert.throws(() => f.adoptProject({ repo: f.repo, presentation: 'worker', name: 'MensagensCliente', context: { problem: kind === 'missing-problem' ? '' : 'Organizar mensagens dos atendentes.' } }), undefined, `case: ${kind}`);
    assert.equal(JSON.parse(readFileSync(join(f.repo, 'project.json'))).is_model, true);
    assert.equal(existsSync(join(f.repo, '.scratch')), false);
  }
});
test('adoção: restaura snapshot preservando arquivos pessoais e recusa trabalho posterior', options, async () => {
  const f = await fixture();
  const result = f.adoptProject({ repo: f.repo, presentation: 'worker', name: 'NovoProduto', context: 'O atendimento precisa de acompanhamento.' });
  const { restoreAdoption } = await import('../scripts/lib/adoption-recovery.mjs');
  writeFileSync(join(f.repo, 'project.json'), 'trabalho posterior');
  assert.throws(() => restoreAdoption(result.journal), /alterad|conflit/i);
  const staged = join(dirname(result.journal), 'after/project.json');
  writeFileSync(join(f.repo, 'project.json'), readFileSync(staged));
  assert.equal(restoreAdoption(result.journal).status, 'restored');
  assert.ok(existsSync(join(f.repo, 'README.md')));
  assert.equal(existsSync(join(f.repo, 'IntegraTech.sln')), false);
  assert.equal(existsSync(join(f.repo, 'NovoProduto.sln')), false);
  assert.equal(readFileSync(join(f.repo, 'personal.txt'), 'utf8'), 'Meu arquivo pessoal');
});
test('adoção: perguntas apenas para dados ausentes e projeto real não reinicia', options, async () => {
  const f = await fixture();
  assert.ok(f.onboarding({ repo: f.repo }).questions.length >= 7);
  assert.ok(f.onboarding({ repo: f.repo, name: 'MeuNegocio' }).questions.length >= 6);
  assert.deepEqual(f.onboarding({ repo: f.repo, presentation: 'worker', context: fullContext }).questions, ['Qual será o nome do projeto?']);
  assert.deepEqual(f.onboarding({ repo: f.repo, presentation: 'worker', name: 'MeuNegocio', context: fullContext }).questions, []);
  f.adoptProject({ repo: f.repo, presentation: 'worker', name: 'MeuNegocio', context: 'Organizar atendimento.' });
  assert.equal(f.onboarding({ repo: f.repo }).status, 'project_real');
});
test('adoção: falha de substituição restaura os arquivos já alterados', options, async () => {
  const f = await fixture();
  const fs = await import('node:fs');
  const { syncBuiltinESMExports } = await import('node:module');
  const original = fs.default.renameSync;
  let mutations = 0;
  fs.default.renameSync = (path, target, ...args) => {
    if (String(target).startsWith(f.repo) && !String(target).includes('.scratch')) {
      mutations++;
      if (mutations === 3) throw new Error('falha de substituição simulada');
    }
    return original(path, target, ...args);
  };
  syncBuiltinESMExports();
  try { assert.throws(() => f.adoptProject({ repo: f.repo, presentation: 'worker', name: 'FalhaRecuperavel', context: 'Organizar atendimento.' }), /falha de substituição/); }
  finally { fs.default.renameSync = original; syncBuiltinESMExports(); }
  assert.equal(JSON.parse(readFileSync(join(f.repo, 'project.json'))).is_model, true);
  for (const [path, digest] of Object.entries(f.baseline.files)) assert.equal(f.baselineHash(readFileSync(join(f.repo, path))), digest, path);
  assert.equal(readFileSync(join(f.repo, 'personal.txt'), 'utf8'), 'Meu arquivo pessoal');
});
test('adoção: escrita parcial em preparação não trunca o arquivo de destino', options, async () => {
  const { atomicFileWrite } = await import('../scripts/lib/adoption-recovery.mjs');
  const fs = await import('node:fs');
  const { syncBuiltinESMExports } = await import('node:module');
  const repo = mkdtempSync(join(tmpdir(), 'adoption-partial-'));
  const file = join(repo, 'controlled.txt');
  writeFileSync(file, 'conteúdo original íntegro');
  const original = fs.default.writeFileSync;
  let injected = false;
  fs.default.writeFileSync = (path, data, ...args) => {
    if (!injected) { injected = true; original(path, 'parcial'); throw new Error('falha após escrita parcial'); }
    return original(path, data, ...args);
  };
  syncBuiltinESMExports();
  try { assert.throws(() => atomicFileWrite(file, 'conteúdo final preparado'), /escrita parcial/); }
  finally { fs.default.writeFileSync = original; syncBuiltinESMExports(); }
  assert.equal(readFileSync(file, 'utf8'), 'conteúdo original íntegro');
});
test('adoção: recovery independente e links não contornam a proteção', options, async t => {
  const f = await fixture();
  const { symlinkSync, unlinkSync } = await import('node:fs');
  const original = readFileSync(join(f.repo, 'README.md'));
  const outside = mkdtempSync(join(tmpdir(), 'adoption-link-'));
  writeFileSync(join(outside, 'props'), original);
  unlinkSync(join(f.repo, 'README.md'));
  // Directory junction works without elevated symbolic-file privileges on Windows.
  symlinkSync(outside, join(f.repo, 'linked'), 'junction');
  assert.throws(() => f.adoptProject({ repo: join(f.repo, 'linked'), name: 'NovoNome', context: 'Organizar atendimento.' }), /link/i);
  writeFileSync(join(f.repo, 'README.md'), original);
  const result = f.adoptProject({ repo: f.repo, presentation: 'worker', name: 'NovoNome', context: 'Organizar atendimento.' });
  try {
    const preview = JSON.parse(execFileSync(process.execPath, [result.recovery, '--dry-run'], { encoding: 'utf8' }));
    assert.equal(preview.status, 'planned');
    const restored = JSON.parse(execFileSync(process.execPath, [result.recovery], { encoding: 'utf8' }));
    assert.equal(restored.status, 'restored');
  } catch (error) {
    if (error.code !== 'EPERM') throw error;
    t.diagnostic('Processo Node filho bloqueado por EPERM; executando o mesmo recovery no processo de teste.');
    const { restoreAdoption } = await import('../scripts/lib/adoption-recovery.mjs');
    assert.equal(restoreAdoption(result.journal, { dryRun: true }).status, 'planned');
    assert.equal(restoreAdoption(result.journal).status, 'restored');
  }
});

test('adoção: exige decisão tecnológica aprovada', options, async () => {
  const f = await fixture();
  assert.throws(() => f.adoptProject({ repo: f.repo, name: 'Catalogo', context: 'Publicar catálogo.' }), /decisão tecnológica/i);
  assert.equal(JSON.parse(readFileSync(join(f.repo, 'project.json'))).is_model, true);
  assert.equal(existsSync(join(f.repo, '.scratch')), false);
  assert.equal(f.onboarding({ repo: f.repo, name: 'Catalogo', context: fullContext }).status, 'needs_domain_research');
});
test('adoção: preserva arquivo controlado modificado e bloqueia a conversão', options, async () => {
  const f = await fixture();
  const controlled = join(f.repo, 'README.md');
  writeFileSync(controlled, 'personalização local');
  assert.throws(() => f.adoptProject({ repo: f.repo, name: 'Catalogo', context: fullContext, presentation: 'worker' }), /alterado/);
  assert.equal(existsSync(join(f.repo, '.scratch')), false);
  assert.equal(JSON.parse(readFileSync(join(f.repo, 'project.json'))).is_model, true);
  assert.equal(readFileSync(controlled, 'utf8'), 'personalização local');
});
test('adoção neutra remove exemplo controlado e preserva arquivos desconhecidos', options, async () => {
  const { context, decisionFor } = await import('./technology-fixture.mjs');
  const f = await fixture();
  const decision = decisionFor();
  decision.selected_option = 'static';
  decision.options[1].presentation = 'Catálogo estático publicado na web';
  const example = 'src/IntegraTech.Apresentacao/IntegraTech.Apresentacao.Worker/IntegrationWorker.cs';
  const personalSource = join(f.repo, 'src/Customizado/minhas-notas.txt');
  mkdirSync(dirname(personalSource), { recursive: true });
  writeFileSync(personalSource, 'Preservar anotações locais');
  const args = { repo: f.repo, name: 'CatalogoNeutro', context, technologyDecision: decision };
  const preview = f.adoptProject({ ...args, dryRun: true });
  assert.equal(preview.operations.some(op => op.path === example), false);
  assert.equal(existsSync(join(f.repo, example)), false);
  const result = f.adoptProject(args);
  assert.equal(result.status, 'adopted');
  const identity = JSON.parse(readFileSync(join(f.repo, 'project.json'), 'utf8'));
  assert.equal(Object.hasOwn(identity, 'presentation'), false);
  assert.equal(existsSync(join(f.repo, example)), false);
  for (const path of Object.keys(f.baseline.files).filter(path => path.endsWith('.csproj')))
    assert.equal(existsSync(join(f.repo, path)), false, path);
  for (const path of ['IntegraTech.sln', 'CatalogoNeutro.sln', 'global.json', 'Directory.Build.props'])
    assert.equal(existsSync(join(f.repo, path)), false, path);
  assert.equal(readFileSync(personalSource, 'utf8'), 'Preservar anotações locais');
  assert.equal(readFileSync(join(f.repo, 'personal.txt'), 'utf8'), 'Meu arquivo pessoal');
  const saved = JSON.parse(readFileSync(join(f.repo, 'references/technology-decision.json'), 'utf8'));
  assert.deepEqual(saved, { ...decision, approval: { ...decision.approval, source_reference: 'references/technology-approval.md' } });
  assert.doesNotMatch(readFileSync(join(f.repo, 'README.md'), 'utf8'), /\bdotnet\s+(?:build|run|test)\b/);
  const { restoreAdoption } = await import('../scripts/lib/adoption-recovery.mjs');
  assert.equal(restoreAdoption(result.journal).status, 'restored');
  assert.equal(existsSync(join(f.repo, example)), false);
  assert.equal(readFileSync(personalSource, 'utf8'), 'Preservar anotações locais');
});
