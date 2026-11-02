import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, existsSync, readdirSync, writeFileSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { presentationFiles } from '../scripts/lib/presentation-templates.mjs';
const generatorUrl = new URL('../scripts/lib/project-generator.mjs', import.meta.url);
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
    assert.equal(read(join(target, 'references/business-context.json')).problem, '');
    for (const forbidden of ['.git', '.scratch', 'qa-artifacts', '.integratech-toolkit.json', 'docs/validacao/bootstrap-results.json', 'docs/superpowers'])
      assert.equal(existsSync(join(target, forbidden)), false, forbidden);
    assert.equal(existsSync(join(target, 'AGENTS.md')), provider !== 'claude');
    assert.equal(existsSync(join(target, 'CLAUDE.md')), provider !== 'codex');
    const toolkit = join(target, `tools/${name}.IA.Toolkit`);
    const { main } = await import(pathToFileURL(join(toolkit, 'scripts/toolkit.mjs')));
    assert.equal((await main(['validate'])).status, 'valid');
    assert.equal((await main(['precheck', '--phase', 'business'])).status, 'blocked');
    assert.equal((await main(['precheck', '--phase', 'discovery'])).status, 'ready');
    assert.ok(!readFileSync(join(target, 'README.md'), 'utf8').includes('erickcremona'));
    if (provider === 'codex') {
      writeFileSync(join(target, 'references/business-context.json'), JSON.stringify({ problem: 'Contexto privado do projeto anterior' }));
      const child = mkdtempSync(join(tmpdir(), 'model-regenerated-'));
      const { createProject: createAgain } = await import(pathToFileURL(join(toolkit, 'scripts/lib/project-generator.mjs')));
      assert.equal(createAgain({ name: 'CopiaLimpa', target: child, provider: 'both', presentation: 'console' }).status, 'created');
      assert.equal(read(join(child, 'references/business-context.json')).problem, '');
      assert.ok(existsSync(join(child, '.claude/agents/business-analyst.md')));
      assert.ok(!readFileSync(join(child, 'SOLUTION_CONTEXT.md'), 'utf8').includes('Contexto privado'));
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
