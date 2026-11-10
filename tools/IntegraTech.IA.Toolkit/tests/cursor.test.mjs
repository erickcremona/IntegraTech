import { cliResearchFixture } from './cli-research-fixture.mjs';
import { generationOptions } from './generation-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, existsSync, mkdirSync, symlinkSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { install, providerFiles, validateInstalled, repoRoot } from '../scripts/lib/installer.mjs';
import { catalog } from '../scripts/lib/governance.mjs';
import { main } from '../scripts/toolkit.mjs';
import { researchRequest } from './domain-fixture.mjs';

const read = path => JSON.parse(readFileSync(path, 'utf8'));
const temp = label => mkdtempSync(join(tmpdir(), label));
const selections = [
  ['codex', true, false, false], ['claude', false, true, false],
  ['both', true, true, false], ['cursor', false, false, true], ['all', true, true, true]
];
test('Cursor: matriz preserva both e gera somente adaptadores selecionados', () => {
  for (const [selection, codex, claude, cursor] of selections) {
    const files = providerFiles(selection, catalog.specialists, [['integratech-example', 'conteúdo canônico da skill']]);
    assert.equal(files.has('AGENTS.md'), codex || cursor, selection);
    assert.equal(files.has('CLAUDE.md'), claude, selection);
    assert.equal(files.has('.agents/skills/integratech-example/SKILL.md'), codex, selection);
    assert.equal(files.has('.claude/skills/integratech-example/SKILL.md'), claude, selection);
    assert.equal(files.has('.cursor/skills/integratech-example/SKILL.md'), cursor, selection);
    assert.equal(files.has('.cursor/rules/integratech.mdc'), cursor, selection);
    assert.equal(files.has('.codex/agents/code-reviewer.toml'), codex, selection);
    assert.equal(files.has('.claude/agents/code-reviewer.md'), claude, selection);
    assert.equal(files.has('.cursor/agents/code-reviewer.md'), cursor, selection);
    if (cursor) {
      assert.equal(files.get('.cursor/skills/integratech-example/SKILL.md'), 'conteúdo canônico da skill');
      const rule = files.get('.cursor/rules/integratech.mdc');
      assert.match(rule, /^---\r?\ndescription: .+\r?\nalwaysApply: true\r?\n---/);
      for (const path of rule.matchAll(/`(tools\/[^`]+\.md)`/g)) assert.ok(existsSync(join(repoRoot, path[1])), path[1]);
      assert.match(files.get('.cursor/agents/code-reviewer.md'), /^---\nname: code-reviewer\ndescription: /);
    }
  }
  for (const invalid of ['other', '__proto__', 'toString', undefined]) assert.throws(() => providerFiles(invalid, [], []));
});
test('Cursor: instalação é repetível, aditiva e valida a seleção instalada por padrão', async () => {
  const { main } = await import('../scripts/toolkit.mjs');
  const repo = temp('cursor-install-');
  assert.ok(install(repo, 'cursor', { dryRun: true }).files.includes('.cursor/rules/integratech.mdc'));
  assert.deepEqual(readdirSync(repo), []);
  install(repo, 'cursor');
  assert.equal(install(repo, 'cursor').changed, 0);
  assert.deepEqual(validateInstalled(repo), []);
  assert.equal((await main(['validate', '--repo', repo])).status, 'valid');
  assert.equal(existsSync(join(repo, '.codex')), false);
  assert.equal(existsSync(join(repo, '.claude')), false);
  writeFileSync(join(repo, '.cursor/rules/pessoal.mdc'), 'regra pessoal');
  install(repo, 'all');
  assert.equal(install(repo, 'all').changed, 0);
  assert.equal(read(join(repo, '.integratech-toolkit.json')).provider, 'all');
  assert.deepEqual(validateInstalled(repo), []);
  assert.equal(readFileSync(join(repo, '.cursor/rules/pessoal.mdc'), 'utf8'), 'regra pessoal');
  writeFileSync(join(repo, '.cursor/rules/integratech.mdc'), 'customização do usuário');
  assert.throws(() => install(repo, 'all'), /conflito/);
  assert.equal(readFileSync(join(repo, '.cursor/rules/integratech.mdc'), 'utf8'), 'customização do usuário');
  assert.ok(validateInstalled(repo).some(issue => issue.includes('.cursor/rules/integratech.mdc')));
});
test('Cursor: conflitos e links são detectados antes de escrever', () => {
  const repo = temp('cursor-conflict-');
  mkdirSync(join(repo, '.cursor/rules'), { recursive: true });
  writeFileSync(join(repo, '.cursor/rules/integratech.mdc'), 'regra própria');
  assert.throws(() => install(repo, 'all'), /conflito/);
  assert.equal(existsSync(join(repo, 'AGENTS.md')), false);
  const linked = temp('cursor-link-'), outside = temp('cursor-outside-');
  symlinkSync(outside, join(linked, '.cursor'), 'junction');
  assert.throws(() => install(linked, 'cursor'), /link/i);
  assert.deepEqual(readdirSync(outside), []);
});
test('Cursor: geração e regeneração atualizam nomes sem copiar adaptadores indesejados', async () => {
  const { createProject } = await import('./generation-fixture.mjs');
  for (const provider of ['cursor', 'all']) {
    const target = temp('cursor-project-');
    createProject({ name: 'LojaCursor', target, provider, presentation: 'api' });
    assert.equal(read(join(target, 'project.json')).provider, provider);
    assert.equal(existsSync(join(target, '.cursor/rules/lojacursor.mdc')), true);
    assert.equal(existsSync(join(target, '.codex')), provider === 'all');
    assert.equal(existsSync(join(target, '.claude')), provider === 'all');
    const rule = readFileSync(join(target, '.cursor/rules/lojacursor.mdc'), 'utf8');
    assert.ok(rule.includes('tools/LojaCursor.IA.Toolkit/fabrica/governance.md'));
    assert.ok(!rule.includes('IntegraTech'));
    const toolkit = join(target, 'tools/LojaCursor.IA.Toolkit/scripts');
    const { main } = await import(pathToFileURL(join(toolkit, 'toolkit.mjs')));
    assert.equal((await main(['validate'])).status, 'valid');
    writeFileSync(join(target, '.cursor/rules/private.mdc'), 'instrução particular não herdada');
    const { createProject: again } = await import(pathToFileURL(join(toolkit, 'lib/project-generator.mjs')));
    for (const nextProvider of ['cursor', 'both']) {
      const child = temp('cursor-regenerated-');
      again(generationOptions({ name: 'LojaSeguinte', target: child, provider: nextProvider, presentation: 'console' }));
      assert.equal(existsSync(join(child, '.cursor/rules/private.mdc')), false);
      assert.equal(existsSync(join(child, '.cursor')), nextProvider === 'cursor');
      const { main: nextMain } = await import(pathToFileURL(join(child, 'tools/LojaSeguinte.IA.Toolkit/scripts/toolkit.mjs')));
      assert.equal((await nextMain(['validate'])).status, 'valid');
    }
  }
});
test('Cursor: handoff aceita origem Cursor sem habilitar dispatcher nem avaliações externas', async () => {
  const { validateContract } = await import('../scripts/lib/contracts.mjs');
  const handoff = read(new URL('../fabrica/templates/handoff.json', import.meta.url));
  assert.doesNotThrow(() => validateContract('handoff', { ...handoff, provider: 'cursor' }));
  assert.throws(() => validateContract('handoff', { ...handoff, provider: 'all' }));
  const { checkProvider, buildInvocation, diagnoseProviders } = await import('../scripts/lib/providers.mjs');
  let calls = 0;
  const runner = async () => { calls++; return { code: null }; };
  const capability = await checkProvider('cursor', runner);
  assert.equal(capability.status, 'unsupported');
  assert.equal(capability.native_editor, 'supported');
  assert.equal(capability.automated_review, false);
  assert.equal(calls, 0);
  assert.throws(() => buildInvocation('cursor', {}), /Cursor.*automa|automa.*Cursor/i);
  const diagnosed = await diagnoseProviders(runner);
  assert.equal(diagnosed.find(item => item.provider === 'cursor').status, 'unsupported');
  assert.equal(calls, 2); // Only Codex and Claude probes; no Cursor process.
  const { evaluateProtocol } = await import('../scripts/lib/evaluations.mjs');
  const { dispatch } = await import('../scripts/lib/dispatcher.mjs');
  const repo = temp('cursor-no-process-');
  const task = read(new URL('../fabrica/templates/delegation.json', import.meta.url));
  const forbidden = async () => { throw new Error('não deve iniciar processo'); };
  const evaluated = await evaluateProtocol({ provider: 'cursor', live: true, runner: forbidden, probe: forbidden });
  assert.equal(evaluated.status, 'blocked');
  assert.equal(evaluated.executed, false);
  assert.equal(evaluated.reason_code, 'cursor_automation_not_supported');
  const dispatched = await dispatch({ repo, provider: 'cursor', task, phase: 'toolkit', files: ['README.md'], runner: forbidden, probe: forbidden });
  assert.equal(dispatched.status, 'blocked');
  assert.match(dispatched.reason, /Cursor.*automa|automa.*Cursor/i);
  assert.deepEqual(readdirSync(repo), []);
});
const isModel = read(join(repoRoot, 'project.json')).is_model;
test('Cursor: CLI cria e adota com escolha explícita e recuperação', { skip: !isModel }, async () => {
  const transport = cliResearchFixture();
  const run = args => main(args, { researchRequest });
  const inputs = temp('cursor-cli-inputs-');
  const inputArgs = transport.prepare(inputs);
  const created = temp('cursor-cli-create-');
  assert.equal((await run(['create-project', '--name', 'ViaCursor', '--target', created, '--provider', 'cursor', '--presentation', 'api', '--repo', inputs, ...inputArgs])).status, 'created');
  const generatedCli = join(created, 'tools/ViaCursor.IA.Toolkit/scripts/toolkit.mjs');
  const checked = JSON.parse(execFileSync(process.execPath, [generatedCli, 'validate'], { encoding: 'utf8' }));
  assert.equal(checked.status, 'valid');
  for (const provider of ['cursor', 'all']) {
    const repo = temp('cursor-cli-adopt-');
    const { dirname } = await import('node:path');
    const baselinePath = 'tools/IntegraTech.IA.Toolkit/fabrica/template-baseline.json';
    const baseline = read(join(repoRoot, baselinePath));
    for (const path of [...Object.keys(baseline.files), baselinePath]) {
      mkdirSync(dirname(join(repo, path)), { recursive: true });
      writeFileSync(join(repo, path), readFileSync(join(repoRoot, path)));
    }
    writeFileSync(join(repo, 'personal.txt'), 'arquivo pessoal');
    const adoptionInputs = transport.prepare(repo);
    const args = ['adopt-project', '--repo', repo, '--name', 'ProdutoCursor', ...adoptionInputs, '--provider', provider, '--presentation', 'api'];
    assert.equal((await run([...args, '--dry-run'])).status, 'planned');
    assert.equal(read(join(repo, 'project.json')).is_model, true);
    const result = await run(args);
    assert.equal(result.status, 'adopted');
    assert.equal(read(join(repo, 'project.json')).provider, provider);
    const ownCli = join(repo, 'tools/ProdutoCursor.IA.Toolkit/scripts/toolkit.mjs');
    assert.equal(JSON.parse(execFileSync(process.execPath, [ownCli, 'validate'], { encoding: 'utf8' })).status, 'valid');
    assert.equal(readFileSync(join(repo, 'personal.txt'), 'utf8'), 'arquivo pessoal');
    assert.equal((await run(['restore-adoption', '--journal', result.journal])).status, 'restored');
    assert.equal(read(join(repo, 'project.json')).is_model, true);
  }
});
