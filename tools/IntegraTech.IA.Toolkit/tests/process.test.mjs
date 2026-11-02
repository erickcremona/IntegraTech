import test from 'node:test';
import assert from 'node:assert/strict';
import { runProcess } from '../scripts/lib/providers.mjs';

test('processo real: stdin e argumentos preservam espaços sem shell', async () => {
  const result = await runProcess({ command: process.execPath, args: ['-e', 'process.stdin.on("data", d => process.stdout.write(d));', 'argumento com espaço'], input: 'entrada comum', timeoutMs: 5000 });
  assert.equal(result.code, 0);
  assert.equal(result.stdout, 'entrada comum');
});
test('processo real: timeout encerra e erro mantém código de saída', async () => {
  const timeout = await runProcess({ command: process.execPath, args: ['-e', 'setInterval(() => {}, 1000)'], timeoutMs: 200 });
  assert.equal(timeout.timedOut, true);
  const failed = await runProcess({ command: process.execPath, args: ['-e', 'process.exit(7)'], timeoutMs: 5000 });
  assert.equal(failed.code, 7);
});
test('processo real: limita saída e não inclui stderr', async () => {
  const large = await runProcess({ command: process.execPath, args: ['-e', 'process.stdout.write("x".repeat(3 * 1024 * 1024))'], timeoutMs: 5000 });
  assert.equal(large.overflow, true);
  const failed = await runProcess({ command: process.execPath, args: ['-e', 'process.stderr.write("not-for-evidence");process.exit(1)'], timeoutMs: 5000 });
  assert.ok(!JSON.stringify(failed).includes('not-for-evidence'));
});
test('processo real: preserva UTF-8 entre chunks', async () => {
  const result = await runProcess({ command: process.execPath,
    args: ['-e', 'const b = Buffer.from("ação");process.stdout.write(b.subarray(0, 2));setTimeout(() => process.stdout.write(b.subarray(2)), 150);'], timeoutMs: 5000 });
  assert.equal(result.code, 0);
  assert.equal(result.stdout, 'ação');
});
