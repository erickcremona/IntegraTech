import { generationOptions } from './generation-fixture.mjs';
import { fullContext } from './domain-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, existsSync, readdirSync, writeFileSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import {symlinkTest} from './host-capability-fixture.mjs';
const generatorUrl = new URL('./generation-fixture.mjs', import.meta.url);
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const canonicalAuthors = readFileSync(new URL('../../../AUTHORS.md', import.meta.url), 'utf8');
const originCredit = canonicalAuthors.split('\n').find(line => line.startsWith('Este projeto foi criado com base no '));
test('skills de arquitetura não dependem dos scaffolds de produto removidos', () => {
  const skill = readFileSync(new URL('../fabrica/skills/integratech-arquitetura/SKILL.md', import.meta.url), 'utf8');
  assert.match(skill, /arquitetura escolhida e aprovada/);
  assert.doesNotMatch(skill, /testes de arquitetura|dependências entre camadas/i);
});
test('gerador: simulação não escreve; rejeita nomes, destino interno e colisões', async () => {
  const { createProject } = await import(generatorUrl);
  const { repoRoot } = await import('../scripts/lib/installer.mjs');
  const empty = mkdtempSync(join(tmpdir(), 'model-dry-'));
  assert.equal(createProject({ name: 'NovaLoja', target: empty, provider: 'both', presentation: 'worker', dryRun: true }).status, 'planned');
  assert.deepEqual(readdirSync(empty), []);
  for (const name of ['../Invalid', 'bad name', 'lowercase', 'NUL', 'A.B', 'A;B'])
    assert.throws(() => createProject({ name, target: empty, provider: 'both', presentation: 'worker' }));
  assert.throws(() => createProject({ name: 'NovaLoja', target: join(repoRoot, 'child'), provider: 'both', presentation: 'worker' }));
  writeFileSync(join(empty, 'personal.txt'), 'preservar');
  assert.throws(() => createProject({ name: 'NovaLoja', target: empty, provider: 'both', presentation: 'worker' }));
  assert.equal(readFileSync(join(empty, 'personal.txt'), 'utf8'), 'preservar');
});
symlinkTest(test,'gerador: rejeita destino que atravessa junction',async()=>{
 const {createProject}=await import(generatorUrl);const empty=mkdtempSync(join(tmpdir(),'model-link-target-'));const linkParent=mkdtempSync(join(tmpdir(),'model-link-'));
 symlinkSync(empty,join(linkParent,'link'),'junction');
 assert.throws(()=>createProject({name:'NovaLoja',target:join(linkParent,'link','new'),provider:'both',presentation:'worker'}));
});
test('gerador: materializa identidade e provedores independentes', async () => {
  const { createProject } = await import(generatorUrl);
  for (const [name, presentation, provider] of [['NovaLoja', 'worker', 'both'], ['ClienteLivre', 'api', 'codex'], ['TarefaLivre', 'console', 'claude']]) {
    const target = mkdtempSync(join(tmpdir(), 'model-generated-'));
    const result = createProject({ name, target, provider, presentation });
    assert.equal(result.status, 'created');
    assert.equal(existsSync(join(target, `${name}.sln`)), false);
    assert.equal(Object.hasOwn(read(join(target, 'project.json')), 'presentation'), false);
    assert.equal(read(join(target, 'references/technology-decision.json')).options[0].presentation, presentation);
    assert.ok(readFileSync(join(target, 'docs/arquitetura/base.md'), 'utf8').includes('references/architecture-decision.json'));
    const state = read(join(target, 'references/project-state.json'));
    assert.equal(state.scope_status, 'pending');
    assert.equal(state.execution_workflow, 'sdd-v2');
    assert.equal(state.plan_path, null);
    assert.equal(read(join(target, 'references/business-context.json')).problem, fullContext.problem);
    for (const forbidden of ['.git', '.scratch', 'qa-artifacts', '.integratech-toolkit.json', 'docs/validacao/bootstrap-results.json', 'docs/superpowers'])
      assert.equal(existsSync(join(target, forbidden)), false, forbidden);
    assert.equal(existsSync(join(target, 'AGENTS.md')), provider !== 'claude');
    assert.equal(existsSync(join(target, 'CLAUDE.md')), provider !== 'codex');
    const toolkit = join(target, `tools/${name}.IA.Toolkit`);
    assert.ok(existsSync(join(toolkit, 'scripts/lib/task-loop.mjs')));
    assert.ok(existsSync(join(toolkit, 'scripts/lib/verify-report.mjs')));
    assert.ok(existsSync(join(toolkit, 'fabrica/team/contracts/task-run.schema.json')));
    const { main } = await import(pathToFileURL(join(toolkit, 'scripts/toolkit.mjs')));
    assert.equal((await main(['validate'])).status, 'valid');
    const readiness = await main(['doctor', '--quick'], { environmentRunner: async () => ({ code: 0, stdout: 'curl 8.5.0', timedOut: false }) });
    assert.equal(readiness.status, 'ready');
    assert.deepEqual(readiness.adapters.missing_agents, []);
    assert.deepEqual(readiness.adapters.missing_skills, []);
    assert.equal((await main(['precheck', '--phase', 'business'])).status, 'blocked');
    assert.equal((await main(['precheck', '--phase', 'discovery'])).status, 'ready');
    assert.ok(!readFileSync(join(target, 'README.md'), 'utf8').split('## Autoria da ferramenta')[0].includes('erickcremona'));
    const entrance=readFileSync(join(target,'README.md'),'utf8');
    assert.ok(entrance.includes('toolkit-readiness.md'));
    assert.ok(readFileSync(join(target,'references/toolkit-readiness.md'),'utf8').includes('Relatório de prontidão do toolkit'));
    assert.ok(entrance.includes('antes de iniciar trabalho de produto'));
    assert.ok(entrance.includes(fullContext.problem));
    assert.ok(entrance.includes('Erick Cremona'));
    assert.ok(entrance.includes('https://www.linkedin.com/in/erick-cremona-6983a1383/'));
    assert.equal(readFileSync(join(target,'AUTHORS.md'),'utf8'), canonicalAuthors);
    assert.ok(entrance.includes('Não atribui a autoria'));
    assert.ok(originCredit);
    assert.ok(entrance.includes(originCredit));
    assert.ok(entrance.includes('Próximo passo'));
    assert.ok(readFileSync(join(target,'references/README.md'),'utf8').includes(name));
    const entry=readFileSync(join(target,provider==='claude'?'CLAUDE.md':'AGENTS.md'),'utf8');
    assert.ok(entry.includes('doctor --quick'));
    assert.match(entry, /não encerre discovery|não interrompe discovery/i);
    assert.ok(!entry.includes('Se is_model=true'));
    assert.ok(entry.includes('produto em desenvolvimento'));
    assert.ok(readFileSync(join(target,`tools/${name}.IA.Toolkit/README.md`),'utf8').includes('Fábrica dedicada'));
    const userReadme = readFileSync(join(target, 'README.md'), 'utf8');
    assert.ok(userReadme.includes('[Fluxo de uso do toolkit](docs/inicio/fluxo-toolkit.md)'));
    assert.ok(existsSync(join(target, 'docs/inicio/fluxo-toolkit.md')));
    assert.ok(!userReadme.includes('O problema de negócio ainda não foi definido.'));
    assert.ok(userReadme.includes('references/business-context.json'));
    assert.ok(userReadme.includes('loop-engenharia.md'));
    if (provider === 'codex') {
      writeFileSync(join(target, 'references/business-context.json'), JSON.stringify({ problem: 'Contexto privado do projeto anterior' }));
      writeFileSync(join(toolkit,'README.md'),'Contexto privado no manual do produto anterior');
      const child = mkdtempSync(join(tmpdir(), 'model-regenerated-'));
      const { createProject: createAgain } = await import(pathToFileURL(join(toolkit, 'scripts/lib/project-generator.mjs')));
      assert.equal(createAgain(generationOptions({ name: 'CopiaLimpa', target: child, provider: 'both', presentation: 'console' })).status, 'created');
      assert.equal(read(join(child, 'references/business-context.json')).problem, fullContext.problem);
      assert.ok(existsSync(join(child, '.claude/agents/business-analyst.md')));
      assert.ok(!readFileSync(join(child, 'SOLUTION_CONTEXT.md'), 'utf8').includes('Contexto privado'));
      assert.ok(!readFileSync(join(child,'tools/CopiaLimpa.IA.Toolkit/README.md'),'utf8').includes('Contexto privado'));
      assert.equal(readFileSync(join(child,'AUTHORS.md'),'utf8'),readFileSync(join(target,'AUTHORS.md'),'utf8'));
      assert.ok(readFileSync(join(child,'README.md'),'utf8').includes(originCredit));
    }
  }
});
test('gerador: manifesto não inclui arquivo pessoal adicionado à árvore', async () => {
  const { createProject } = await import(generatorUrl);
  const { repoRoot } = await import('../scripts/lib/installer.mjs');
  const { unlinkSync } = await import('node:fs');
  const sentinel = join(repoRoot, 'unlisted-personal-probe.txt');
  assert.equal(existsSync(sentinel), false);
  writeFileSync(sentinel, 'Não copiar');
  try {
    const target = mkdtempSync(join(tmpdir(), 'model-private-'));
    createProject({ name: 'ProjetoLimpo', target, provider: 'both', presentation: 'console' });
    assert.equal(existsSync(join(target, 'unlisted-personal-probe.txt')), false);
  } finally { unlinkSync(sentinel); }
});

test('gerador: contexto sozinho é insuficiente e decisão .NET aprovada fica registrada', async () => {
  const { createProject } = await import(generatorUrl);
  const { context, decisionFor } = await import('./technology-fixture.mjs');
  const { mkdirSync } = await import('node:fs');
  const target = mkdtempSync(join(tmpdir(), 'technology-generated-'));
  assert.throws(() => createProject({ name: 'Catalogo', target, context }), /decisão tecnológica/i);
  assert.deepEqual(readdirSync(target), []);
  const repo = mkdtempSync(join(tmpdir(), 'technology-approval-'));
  mkdirSync(join(repo, 'references'));
  writeFileSync(join(repo, 'references/aceite-tecnologia.md'), 'Usuário aprovou API .NET.');
  createProject({ name: 'Catalogo', target, context, technologyDecision: decisionFor(), decisionRepo: repo });
  assert.equal(Object.hasOwn(read(join(target, 'project.json')), 'presentation'), false);
  assert.equal(read(join(target, 'references/technology-decision.json')).options[0].presentation, 'api');
  assert.equal(read(join(target, 'references/business-context.json')).problem, context.problem);
  assert.equal(existsSync(join(target, 'src')), false);
  assert.equal(read(join(target, 'references/technology-decision.json')).selected_option, 'web');
  const { main } = await import(pathToFileURL(join(target, 'tools/Catalogo.IA.Toolkit/scripts/toolkit.mjs')));
  const checked = await main(['technology-check', '--repo', target, '--context-file', join(target, 'references/business-context.json'), '--decision-file', join(target, 'references/technology-decision.json')]);
  assert.equal(checked.status, 'approved');
  const child = mkdtempSync(join(tmpdir(), 'technology-child-'));
  const { createProject: again } = await import(pathToFileURL(join(target, 'tools/Catalogo.IA.Toolkit/scripts/lib/project-generator.mjs')));
  again(generationOptions({ name: 'OutroCatalogo', target: child, presentation: 'console' }));
  assert.equal(read(join(child, 'references/technology-decision.json')).options[0].presentation, 'console');
  assert.equal(read(join(child, 'references/domain-preparation.json')).context_sha256 === read(join(target, 'references/domain-preparation.json')).context_sha256, false);
  assert.equal(read(join(child, 'references/business-context.json')).problem, fullContext.problem);
});

test('criação neutra preserva a stack aprovada sem scaffold', async () => {
  const { context, decisionFor } = await import('./technology-fixture.mjs');
  const { createProject } = await import('../scripts/lib/project-generator.mjs');
  for (const [id, stack, presentation] of [
    ['static', 'static-web', 'Catálogo estático publicado na web'],
    ['web', 'dotnet', 'Aplicação web renderizada no servidor'],
  ]) {
    const target = mkdtempSync(join(tmpdir(), 'model-neutral-'));
    const decision = decisionFor();
    decision.selected_option = id;
    decision.options.find(option => option.id === id).presentation = presentation;
    const args = generationOptions({ name: 'CatalogoNeutro', target, context, technologyDecision: decision });
    const result = createProject(args);
    assert.equal(result.status, 'created');
    const saved = read(join(target, 'references/technology-decision.json'));
    assert.deepEqual(saved, { ...decision, approval: { ...decision.approval, source_reference: 'references/technology-approval.md' } });
    const savedArchitecture = read(join(target, 'references/architecture-decision.json'));
    assert.deepEqual(savedArchitecture.layout, { name: 'CatalogoNeutro', stack, presentation });
    assert.deepEqual(savedArchitecture, { ...args.architectureDecision, approval: { ...args.architectureDecision.approval, source_reference: 'references/architecture-approval.md' } });
    assert.equal(Object.hasOwn(read(join(target, 'project.json')), 'presentation'), false);
    assert.equal(readdirSync(target, { recursive: true }).some(path => /\.(?:sln|csproj)$/i.test(path)), false);
    for (const path of ['src', 'tests', 'global.json', 'Directory.Build.props']) assert.equal(existsSync(join(target, path)), false, path);
    for (const path of ['README.md', 'SOLUTION_CONTEXT.md', 'docs/arquitetura/base.md']) {
      assert.doesNotMatch(readFileSync(join(target, path), 'utf8'), /\bdotnet\s+(?:build|run|test)\b/);
    }
  }
});

test('cópia gerada documenta decisão tecnológica sem instruções de stack fixa', async () => {
  const { context, decisionFor } = await import('./technology-fixture.mjs');
  const { createProject } = await import('../scripts/lib/project-generator.mjs');
  const target = mkdtempSync(join(tmpdir(), 'model-neutral-docs-'));
  const decision = decisionFor();
  decision.selected_option = 'static';
  decision.options.find(option => option.id === 'static').presentation = 'Site estático com publicação gerenciada';
  createProject(generationOptions({ name: 'DocsNeutras', target, context, technologyDecision: decision }));
  for (const path of [
    'README.md', 'SOLUTION_CONTEXT.md', 'docs/inicio/fluxo-toolkit.md',
    'docs/inicio/decisao-tecnologica.md', 'tools/DocsNeutras.IA.Toolkit/README.md',
    'tools/DocsNeutras.IA.Toolkit/fabrica/toolkit-manual.md',
    'tools/DocsNeutras.IA.Toolkit/fabrica/governance.md',
  ]) {
    const text = readFileSync(join(target, path), 'utf8');
    assert.match(text, /decisão tecnológica aprovada|tecnologia aprovada|contexto.*pesquisa/i, path);
    assert.doesNotMatch(text, /SDK \.NET 8|base disponível é \.NET 8|dotnet build IntegraTech\.sln|Aplicação \.NET em camadas/i, path);
  }
});
