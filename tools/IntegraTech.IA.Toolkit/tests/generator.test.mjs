import { generationOptions } from './generation-fixture.mjs';
import { fullContext } from './domain-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, existsSync, readdirSync, writeFileSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { presentationFiles } from '../scripts/lib/presentation-templates.mjs';
const generatorUrl = new URL('./generation-fixture.mjs', import.meta.url);
const read = path => JSON.parse(readFileSync(path, 'utf8'));
test('gerador: templates qualificam Task, Host e Timeout sem alterar namespaces', () => {
  for (const name of ['Task', 'Host', 'Timeout']) {
    const files = presentationFiles(name, 'worker');
    const source = [...files.values()].join('\n');
    assert.ok(source.includes(`namespace ${name}.Apresentacao.Worker`));
    assert.ok(source.includes('global::System.Threading.Tasks.Task'));
    assert.ok(source.includes('global::System.Threading.Timeout'));
    assert.ok(source.includes('global::Microsoft.Extensions.Hosting.Host.CreateApplicationBuilder'));
  }
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
  const linkParent = mkdtempSync(join(tmpdir(), 'model-link-'));
  symlinkSync(empty, join(linkParent, 'link'), 'junction');
  assert.throws(() => createProject({ name: 'NovaLoja', target: join(linkParent, 'link', 'new'), provider: 'both', presentation: 'worker' }));
});
test('gerador: identidades, três apresentações e provedores independentes', async () => {
  const { createProject } = await import(generatorUrl);
  for (const [name, presentation, provider] of [['NovaLoja', 'worker', 'both'], ['ClienteLivre', 'api', 'codex'], ['TarefaLivre', 'console', 'claude']]) {
    const target = mkdtempSync(join(tmpdir(), 'model-generated-'));
    const result = createProject({ name, target, provider, presentation });
    assert.equal(result.status, 'created');
    assert.ok(existsSync(join(target, `${name}.sln`)));
    assert.equal(read(join(target, 'project.json')).presentation, presentation);
    assert.ok(readFileSync(join(target, 'docs/arquitetura/base.md'), 'utf8').includes(`Apresentação: ${presentation}`));
    const state = read(join(target, 'references/project-state.json'));
    assert.equal(state.scope_status, 'pending');
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
    assert.equal((await main(['precheck', '--phase', 'business'])).status, 'blocked');
    assert.equal((await main(['precheck', '--phase', 'discovery'])).status, 'ready');
    assert.ok(!readFileSync(join(target, 'README.md'), 'utf8').includes('erickcremona'));
    const entrance=readFileSync(join(target,'README.md'),'utf8');
    assert.ok(entrance.includes(fullContext.problem));
    assert.ok(entrance.includes('Erick Cremona'));
    assert.ok(entrance.includes('https://www.linkedin.com/in/erick-cremona-6983a1383/'));
    assert.ok(readFileSync(join(target,'AUTHORS.md'),'utf8').includes('IntegraTech'));
    assert.ok(entrance.includes('Não atribui a autoria'));
    assert.ok(entrance.includes('Este projeto foi criado com base no [IntegraTech](https://github.com/erickcremona/IntegraTech).'));
    assert.ok(entrance.includes('Próximo passo'));
    assert.ok(readFileSync(join(target,'references/README.md'),'utf8').includes(name));
    const entry=readFileSync(join(target,provider==='claude'?'CLAUDE.md':'AGENTS.md'),'utf8');
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
      assert.ok(readFileSync(join(child,'README.md'),'utf8').includes('Este projeto foi criado com base no [IntegraTech]'));
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

test('gerador: contexto sozinho nunca escolhe worker e decisão aprovada gera somente API', async () => {
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
  assert.equal(read(join(target, 'project.json')).presentation, 'api');
  assert.equal(read(join(target, 'references/business-context.json')).problem, context.problem);
  assert.equal(existsSync(join(target, 'src/Catalogo.Apresentacao/Catalogo.Apresentacao.Worker')), false);
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
