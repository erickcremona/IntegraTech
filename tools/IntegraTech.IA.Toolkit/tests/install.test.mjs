import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const moduleUrl = new URL('../scripts/lib/installer.mjs', import.meta.url);
test('instalador: simula sem escrever, instala ambos e detecta deriva', async () => {
  const { install } = await import(moduleUrl);
  const repo = mkdtempSync(join(tmpdir(), 'integratech-install-'));
  const plan = install(repo, 'both', { dryRun: true });
  assert.ok(plan.files.includes('CLAUDE.md'));
  assert.equal(existsSync(join(repo, 'CLAUDE.md')), false);
  install(repo, 'both');
  for (const p of ['AGENTS.md', 'CLAUDE.md', '.codex/agents/code-reviewer.toml', '.claude/agents/code-reviewer.md', '.agents/skills/integratech-worker/SKILL.md', '.claude/skills/integratech-worker/SKILL.md'])
    assert.ok(existsSync(join(repo, p)), p);
  assert.equal(install(repo, 'both').changed, 0);
  writeFileSync(join(repo, 'CLAUDE.md'), 'trabalho do usuário');
  assert.throws(() => install(repo, 'both'), /conflito/i);
  assert.equal(readFileSync(join(repo, 'CLAUDE.md'), 'utf8'), 'trabalho do usuário');
});
test('instalador: conflito não produz instalação parcial e escolha é explícita', async () => {
  const { install } = await import(moduleUrl);
  const repo = mkdtempSync(join(tmpdir(), 'integratech-conflict-'));
  writeFileSync(join(repo, 'CLAUDE.md'), 'existente');
  assert.throws(() => install(repo, 'both'), /conflito/i);
  assert.equal(existsSync(join(repo, 'AGENTS.md')), false);
  const only = mkdtempSync(join(tmpdir(), 'integratech-codex-'));
  install(only, 'codex');
  assert.equal(existsSync(join(only, 'CLAUDE.md')), false);
  assert.throws(() => install(only, 'other'));
});
test('instalador: bloqueia caminhos que atravessam junction', async () => {
  const { install } = await import(moduleUrl);
  const { symlinkSync } = await import('node:fs');
  const repo = mkdtempSync(join(tmpdir(), 'integratech-link-'));
  const elsewhere = mkdtempSync(join(tmpdir(), 'integratech-outside-'));
  symlinkSync(elsewhere, join(repo, '.claude'), 'junction');
  assert.throws(() => install(repo, 'claude'), /link/i);
  assert.equal(existsSync(join(elsewhere, 'skills')), false);
  const dangling = mkdtempSync(join(tmpdir(), 'integratech-dangling-'));
  symlinkSync(join(dangling, 'missing'), join(dangling, '.claude'), 'junction');
  assert.throws(() => install(dangling, 'claude'), /link/i);
});
