import test from 'node:test';
import assert from 'node:assert/strict';
const moduleUrl = new URL('../scripts/lib/providers.mjs', import.meta.url);
test('provedores: argumentos separados e capacidades de leitura', async () => {
  const { buildInvocation } = await import(moduleUrl);
  const opts = { workspace: 'C:/com espaço', schemaPath: 'C:/schema.json', outputPath: 'C:/out.json' };
  const codex = buildInvocation('codex', opts);
  assert.equal(codex.command, 'codex');
  assert.ok(codex.args.includes('read-only'));
  assert.ok(codex.args.includes('never'));
  assert.ok(codex.args.includes('C:/com espaço'));
  assert.ok(!codex.args.some(arg => arg.includes('bypass')));
  const claude = buildInvocation('claude', opts);
  assert.equal(claude.command, 'claude');
  assert.equal(claude.args[claude.args.indexOf('--tools') + 1], '');
  assert.ok(claude.args.includes('--bare'));
  assert.ok(claude.args.includes('--strict-mcp-config'));
  assert.ok(!claude.args.some(arg => arg.includes('bypass')));
  assert.throws(() => buildInvocation('other', opts));
});
test('provedores: capacidade ausente bloqueia sem fallback', async () => {
  const { checkProvider } = await import(moduleUrl);
  const absent = await checkProvider('claude', async () => ({ code: null, error: 'ENOENT', stdout: '' }));
  assert.equal(absent.status, 'unavailable');
  const old = await checkProvider('claude', async () => ({ code: 0, stdout: '--tools --json-schema' }));
  assert.equal(old.status, 'incompatible');
});
