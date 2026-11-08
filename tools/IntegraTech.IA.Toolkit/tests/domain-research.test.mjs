import test from 'node:test';
import assert from 'node:assert/strict';
import { fullContext as context, preparationFor, researchRequest } from './domain-fixture.mjs';
const research = await import('../scripts/lib/domain-research.mjs').catch(() => ({}));
test('pesquisa: coleta conteúdo e exige nova consulta com hash idêntico', () => {
  const input = preparationFor(); delete input.sources[0].receipt;
  const preparation = research.collectResearch({ context, preparation: input, request: researchRequest });
  assert.match(preparation.sources[0].receipt.content_sha256, /^[a-f0-9]{64}$/);
  assert.doesNotThrow(() => research.verifyResearch({ context, preparation, request: researchRequest }));
  assert.throws(() => research.verifyResearch({ context, preparation, request: () => ({ status: 200, body: Buffer.from('Fonte foi alterada') }) }), /mudou/i);
});
test('pesquisa: erro de rede, erro HTTP, corpo vazio, limite e evidência ausente bloqueiam', () => {
  for (const request of [() => { throw new Error('TLS failure'); }, () => ({ status: 403, body: Buffer.from('denied') }), () => ({ status: 200, body: Buffer.alloc(0) }), () => ({ status: 200, body: Buffer.alloc(2 * 1024 * 1024 + 1) })])
    assert.throws(() => research.collectResearch({ context, preparation: preparationFor(), request }));
  const preparation = preparationFor(); delete preparation.sources[0].receipt;
  assert.throws(() => research.verifyResearch({ context, preparation, request: researchRequest }), /evidência/i);
});
test('pesquisa: redirecionamento privado e loop não recebem acesso', () => {
  for (const location of ['https://127.0.0.1/private', 'http://example.com', 'https://[::1]/', 'https://localhost/admin', 'https://10.0.0.1', 'https://service.internal', 'https://169.254.169.254']) {
    let calls = 0;
    assert.throws(() => research.collectResearch({ context, preparation: preparationFor(), request: () => { calls++; return { status: 302, location, body: Buffer.alloc(0) }; } }));
    assert.equal(calls, 1);
  }
  assert.throws(() => research.collectResearch({ context, preparation: preparationFor(), request: () => ({ status: 302, location: 'https://www.w3.org/TR/WCAG22/', body: Buffer.alloc(0) }) }));
});
