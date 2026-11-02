import test from 'node:test';
import assert from 'node:assert/strict';
import { main } from '../scripts/toolkit.mjs';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
test('CLI: erro de contexto não inclui seu conteúdo no diagnóstico', async () => {
  const file = join(mkdtempSync(join(tmpdir(), 'context-diagnostic-')), 'invalid.json');
  writeFileSync(file, '{"problem": "conteudo-privado"');
  await assert.rejects(main(['adopt-project', '--name', 'Projeto', '--context-file', file]), error => !error.message.includes('conteudo-privado') && error.message.includes('contexto inicial'));
});
test('CLI: rejeita opção desconhecida, duplicada, fase e provedor inválidos', async () => {
  for (const args of [['precheck', '--phase', 'unknown'], ['install', '--provider', 'unknown'], ['help', '--secret', 'x'], ['route', '--category', 'qa', '--category', 'worker'], ['dispatch', '--provider']])
    await assert.rejects(main(args));
  assert.equal((await main(['route', '--category', 'qa'])).name, 'qa-engineer');
  assert.ok((await main(['help'])).includes('resume'));
});
