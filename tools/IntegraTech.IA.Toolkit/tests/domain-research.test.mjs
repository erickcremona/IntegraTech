import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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
test('pesquisa: bloqueia endereços não públicos e aceita 192.0.66.109', () => {
  for (const ip of ['10.0.0.1', '172.16.0.1', '192.168.1.1', '169.254.1.1', '127.0.0.1', '0.1.2.3', '224.0.0.1', '100.64.0.1', '192.0.2.1', '198.18.0.1', '198.51.100.1', '203.0.113.1']) assert.throws(() => research.publicHttps(`https://${ip}/`), undefined, ip);
  assert.equal(research.publicHttps('https://192.0.66.109/').hostname, '192.0.66.109');
});
test('pesquisa: revalidação identifica URL alterada e orienta substituição oficial', () => {
  const preparation = preparationFor();
  let error;
  try { research.verifyResearch({ context, preparation, request: () => ({ status: 200, body: Buffer.from('Conteúdo atualizado') }) }); } catch (caught) { error = caught; }
  assert.ok(error);
  assert.match(error.message, /technology \(https:\/\/learn\.microsoft\.com/);
  assert.match(error.message, /publicação oficial equivalente.*revise os achados.*research-collect.*SHA-256/);
});
test('pesquisa: DNS direto valida cada resposta e fixa IP no curl preservando domínio TLS', async () => {
  let invocation;
  const response = await research.httpsRequest('https://public.example.org/path', {
    env: {}, resolveHost: async host => { assert.equal(host, 'public.example.org'); return ['93.184.216.34']; },
    directoryFactory: () => { const dir = mkdtempSync(join(tmpdir(), 'research-test-')); writeFileSync(join(dir, 'headers'), ''); writeFileSync(join(dir, 'body'), 'ok'); return dir; },
    runCurl: (_command, args, options) => { invocation = { args, options }; return '200'; }
  });
  assert.equal(response.status, 200);
  assert.ok(invocation.args.includes('--resolve'));
  assert.ok(invocation.args.includes('public.example.org:443:93.184.216.34'));
  assert.ok(invocation.args.includes('https://public.example.org/path'));
  assert.deepEqual(invocation.options.env, {});
  rmSync(invocation.args[invocation.args.indexOf('--output') + 1].replace(/body$/, ''), { recursive: true, force: true });
});
test('pesquisa: DNS seleciona somente registros IPv4 para domínios dual-stack', async () => {
  let observed;
  const addresses = await research.resolvePublic('www.rfc-editor.org', (host, options, callback) => {
    observed = { host, options };
    callback(null, [{ address: '104.18.20.81', family: 4 }]);
  });
  assert.equal(observed.host, 'www.rfc-editor.org');
  assert.equal(observed.options.family, 4);
  assert.deepEqual(addresses, ['104.18.20.81']);
});
test('pesquisa: proxy HTTPS/ALL e nomes minúsculos são reconhecidos sem credenciais no argv', async () => {
  for (const key of ['HTTPS_PROXY', 'https_proxy', 'ALL_PROXY', 'all_proxy']) {
    let invocation;
    const response = await research.httpsRequest('https://public.example.org/path', {
      env: { [key]: 'http://proxy.example:8080' },
      directoryFactory: () => { const dir = mkdtempSync(join(tmpdir(), 'research-test-')); writeFileSync(join(dir, 'headers'), ''); writeFileSync(join(dir, 'body'), 'ok'); return dir; },
      runCurl: (_command, args) => { invocation = args; return '200'; }
    });
    assert.equal(response.status, 200);
    assert.ok(invocation.includes('http://proxy.example:8080'));
    assert.equal(invocation.some(value => String(value).includes('secret') || String(value).includes('user')), false);
    assert.equal(invocation.includes('--resolve'), false);
    rmSync(invocation[invocation.indexOf('--output') + 1].replace(/body$/, ''), { recursive: true, force: true });
  }
  const proxy = ['http://user', ':secret@proxy.example:8080'].join('');
  await assert.rejects(research.httpsRequest('https://public.example.org/', { env: { HTTPS_PROXY: proxy } }), /credenciais embutidas/);
});
test('pesquisa: DNS e proxy têm erros diagnósticos distintos', async () => {
  await assert.rejects(research.httpsRequest('https://public.example.org/', { env: {}, resolveHost: async () => { throw new Error('Falha de DNS'); } }), /DNS/i);
  await assert.rejects(research.httpsRequest('https://public.example.org/', { env: { HTTPS_PROXY: 'http://proxy.example.org:8080' }, runCurl: () => { const error = new Error('proxy connection failed'); error.stderr = Buffer.from('proxy connection failed'); throw error; } }), /Proxy indisponível/i);
});
