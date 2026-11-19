import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function fixture(provider = 'all') {
  const repo = mkdtempSync(join(tmpdir(), 'integratech-readiness-'));
  const toolkit = join(repo, 'tools', 'Demo.IA.Toolkit');
  const factory = join(toolkit, 'fabrica');
  const role = { name: 'application-engineer', skill: 'integratech-aplicacao' };
  mkdirSync(join(factory, 'team'), { recursive: true });
  mkdirSync(join(factory, 'skills', role.skill), { recursive: true });
  mkdirSync(join(factory, 'skills', 'ponytail'), { recursive: true });
  writeFileSync(join(repo, 'project.json'), JSON.stringify({ name: 'Demo', provider }));
  writeFileSync(join(factory, 'team', 'catalog.yaml'), JSON.stringify({ specialists: [role] }));
  writeFileSync(join(factory, 'project-template.json'), JSON.stringify({ files: [
    `tools/Demo.IA.Toolkit/fabrica/skills/${role.skill}/SKILL.md`,
    'tools/Demo.IA.Toolkit/fabrica/skills/ponytail/SKILL.md'
  ] }));
  for (const skill of [role.skill, 'ponytail']) writeFileSync(join(factory, 'skills', skill, 'SKILL.md'), '# skill');
  for (const selected of ['codex', 'claude', 'cursor']) {
    if (selected === 'codex') {
      mkdirSync(join(repo, '.agents', 'skills', role.skill), { recursive: true });
      mkdirSync(join(repo, '.agents', 'skills', 'ponytail'), { recursive: true });
      mkdirSync(join(repo, '.codex', 'agents'), { recursive: true });
      writeFileSync(join(repo, 'AGENTS.md'), '# Codex');
      for (const skill of [role.skill, 'ponytail']) writeFileSync(join(repo, '.agents', 'skills', skill, 'SKILL.md'), '# skill');
      writeFileSync(join(repo, '.codex', 'agents', `${role.name}.toml`), 'name = "application-engineer"');
    }
    if (selected === 'claude') {
      mkdirSync(join(repo, '.claude', 'skills', role.skill), { recursive: true });
      mkdirSync(join(repo, '.claude', 'skills', 'ponytail'), { recursive: true });
      mkdirSync(join(repo, '.claude', 'agents'), { recursive: true });
      writeFileSync(join(repo, 'CLAUDE.md'), '# Claude');
      for (const skill of [role.skill, 'ponytail']) writeFileSync(join(repo, '.claude', 'skills', skill, 'SKILL.md'), '# skill');
      writeFileSync(join(repo, '.claude', 'agents', `${role.name}.md`), '# agent');
    }
    if (selected === 'cursor') {
      mkdirSync(join(repo, '.cursor', 'skills', role.skill), { recursive: true });
      mkdirSync(join(repo, '.cursor', 'skills', 'ponytail'), { recursive: true });
      mkdirSync(join(repo, '.cursor', 'agents'), { recursive: true });
      mkdirSync(join(repo, '.cursor', 'rules'), { recursive: true });
      writeFileSync(join(repo, '.cursor', 'rules', 'integratech.mdc'), '# Cursor');
      for (const skill of [role.skill, 'ponytail']) writeFileSync(join(repo, '.cursor', 'skills', skill, 'SKILL.md'), '# skill');
      writeFileSync(join(repo, '.cursor', 'agents', `${role.name}.md`), '# agent');
    }
  }
  return { repo, role };
}
const success = async () => ({ code: 0, stdout: 'curl 8.0.0', timedOut: false });

test('local setup doctor reports ready for runtime, curl, and selected skill/agent adapters', async () => {
  const { repo } = fixture();
  try {
    const { diagnoseLocalSetup } = await import('../scripts/lib/environment-readiness.mjs');
    const report = await diagnoseLocalSetup({ repo, nodeVersion: 'v22.1.0', runner: success });
    assert.equal(report.status, 'ready');
    assert.deepEqual(report.adapters.missing_skills, []);
    assert.deepEqual(report.adapters.missing_agents, []);
    assert.deepEqual(report.tools.curl, { status: 'available', version: '8.0.0' });
  } finally { rmSync(repo, { recursive: true, force: true }); }
});

test('missing optional adapters or curl report safe recovery and allow independent work to continue', async () => {
  const { repo, role } = fixture('cursor');
  try {
    const { diagnoseLocalSetup } = await import('../scripts/lib/environment-readiness.mjs');
    rmSync(join(repo, '.cursor', 'agents', `${role.name}.md`));
    rmSync(join(repo, '.cursor', 'skills', 'ponytail', 'SKILL.md'));
    const report = await diagnoseLocalSetup({ repo, nodeVersion: 'v24.0.0', runner: async () => ({ code: null, error: 'ENOENT', stdout: '' }) });
    assert.equal(report.status, 'degraded');
    assert.deepEqual(report.adapters.missing_agents.map(item => item.agent), [role.name]);
    assert.ok(report.adapters.missing_skills.some(item => item.skill === 'ponytail'));
    assert.equal(report.tools.curl.status, 'missing');
    assert.equal(report.recovery.preview_command, 'npm run toolkit -- install --provider cursor --dry-run');
    assert.equal(report.recovery.install_command, 'npm run toolkit -- install --provider cursor');
    assert.equal(report.fallback.missing_agent, 'O CTO pode executar diretamente com a skill canônica disponível.');
    assert.equal(report.fallback.research_external, 'blocked_until_prerequisite');
    assert.ok(report.fallback.independent_work.includes('discovery'));
  } finally { rmSync(repo, { recursive: true, force: true }); }
});

test('runtime below minimum and invalid provider are diagnosed without false readiness', async () => {
  const { repo } = fixture('invalid');
  try {
    const { diagnoseLocalSetup } = await import('../scripts/lib/environment-readiness.mjs');
    const report = await diagnoseLocalSetup({ repo, nodeVersion: 'v20.9.0', runner: success });
    assert.equal(report.status, 'degraded');
    assert.equal(report.runtime.status, 'unsupported');
    assert.equal(report.adapters.status, 'unknown');
    assert.ok(report.recovery.instructions.some(item => item.includes('Node.js 22')));
  } finally { rmSync(repo, { recursive: true, force: true }); }
});

test('doctor rejects unsafe role and skill names from the local catalog', async () => {
  const { repo } = fixture('codex');
  try {
    const { diagnoseLocalSetup } = await import('../scripts/lib/environment-readiness.mjs');
    writeFileSync(join(repo, 'tools', 'Demo.IA.Toolkit', 'fabrica', 'team', 'catalog.yaml'), JSON.stringify({ specialists: [
      { name: '../outside', skill: '../../outside' }
    ] }));
    const report = await diagnoseLocalSetup({ repo, nodeVersion: 'v24.0.0', runner: success });
    assert.equal(report.status, 'degraded');
    assert.equal(report.adapters.status, 'unknown');
    assert.match(report.adapters.errors.join(' '), /identificador inválido/);
  } finally { rmSync(repo, { recursive: true, force: true }); }
});

test('doctor quick CLI accepts repo and skips provider CLI diagnostics', async () => {
  const { repo } = fixture('codex');
  try {
    const { main } = await import('../scripts/toolkit.mjs');
    const report = await main(['doctor', '--quick', '--repo', repo], { environmentRunner: success });
    assert.equal(report.status, 'ready');
    assert.equal(Object.hasOwn(report, 'provider_clis'), false);
  } finally { rmSync(repo, { recursive: true, force: true }); }
});
