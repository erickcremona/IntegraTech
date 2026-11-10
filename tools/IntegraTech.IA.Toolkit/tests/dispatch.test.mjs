import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const toolkit = new URL('../', import.meta.url);
function fixture() {
  const repo = mkdtempSync(join(tmpdir(), 'integratech-dispatch-'));
  mkdirSync(join(repo, 'references'));
  writeFileSync(join(repo, 'references/project-state.json'), JSON.stringify({ scope_status: 'pending', plan_gate: 'pending' }));
  writeFileSync(join(repo, 'README.md'), 'base neutra');
  const task = JSON.parse(readFileSync(new URL('fabrica/templates/delegation.json', toolkit), 'utf8'));
  const review = JSON.parse(readFileSync(new URL('fabrica/templates/review.json', toolkit), 'utf8'));
  review.verdict = 'approved';
  return { repo, task, review };
}
test('dispatcher: revisão validada produz handoff comum em ambos provedores', async () => {
  const { dispatch } = await import(new URL('scripts/lib/dispatcher.mjs', toolkit));
  for (const provider of ['codex', 'claude']) {
    const { repo, task, review } = fixture();
    const result = await dispatch({ repo, provider, task, files: ['README.md'], phase: 'toolkit',
      probe: async () => ({ status: 'available' }),
      runner: async invocation => {
        assert.equal(invocation.shell, false);
        assert.ok(invocation.input.includes('base neutra'));
        return { code: 0, stdout: provider === 'claude' ? JSON.stringify({ type: 'result', is_error: false, structured_output: review }) : JSON.stringify(review) };
      } });
    assert.equal(result.status, 'completed');
    const handoff = JSON.parse(readFileSync(result.handoff, 'utf8'));
    assert.equal(handoff.provider, provider);
    assert.equal(handoff.task_id, task.task_id);
    assert.equal(handoff.verdict, 'approved');
    assert.ok(existsSync(result.output));
  }
});
test('dispatcher: indisponibilidade, erro, timeout e JSON inválido não concluem', async () => {
  const { dispatch } = await import(new URL('scripts/lib/dispatcher.mjs', toolkit));
  for (const response of [{ code: 1, stdout: 'secret never copy' }, { code: null, timedOut: true }, { code: 0, stdout: '{}' }, { code: 0, stdout: 'not json' }]) {
    const { repo, task } = fixture();
    const result = await dispatch({ repo, task, provider: 'claude', phase: 'toolkit', files: ['README.md'],
      probe: async () => ({ status: 'available' }), runner: async () => response });
    assert.equal(result.status, 'blocked');
    assert.equal('output' in result, false);
    assert.ok(!JSON.stringify(result).includes('secret never copy'));
  }
  const { repo, task } = fixture();
  let called = false;
  const result = await dispatch({ repo, task, provider: 'claude', phase: 'toolkit', files: ['README.md'],
    probe: async () => ({ status: 'unavailable' }), runner: async () => { called = true; } });
  assert.equal(result.status, 'blocked');
  assert.equal(called, false);
});
test('dispatcher: bloqueia escopo, gate, executor mutante, escape e segredos', async () => {
  const { dispatch } = await import(new URL('scripts/lib/dispatcher.mjs', toolkit));
  const { repo, task, review } = fixture();
  const opts = { repo, task, provider: 'codex', phase: 'toolkit', files: ['README.md'],
    probe: async () => ({ status: 'available' }), runner: async () => ({ code: 0, stdout: JSON.stringify(review) }) };
  assert.equal((await dispatch({ ...opts, phase: 'business' })).status, 'blocked');
  assert.equal((await dispatch({ ...opts, task: { ...task, human_gate: 'pending' } })).status, 'blocked');
  assert.equal((await dispatch({ ...opts, task: { ...task, assigned_agent: 'application-engineer' } })).status, 'blocked');
  assert.equal((await dispatch({ ...opts, files: ['../outside.txt'] })).status, 'blocked');
  writeFileSync(join(repo, '.env'), 'PASSWORD=do-not-send');
  assert.equal((await dispatch({ ...opts, files: ['.env'] })).status, 'blocked');
  writeFileSync(join(repo, 'README.md'), 'api_key = "never-send-this"');
  assert.equal((await dispatch(opts)).status, 'blocked');
});
test('dispatcher: apaga saída bruta e respeita ownership de leitura', async () => {
  const { dispatch } = await import(new URL('scripts/lib/dispatcher.mjs', toolkit));
  const { repo, task } = fixture();
  let rawPath;
  const result = await dispatch({ repo, task, provider: 'codex', phase: 'toolkit', files: ['README.md'],
    probe: async () => ({ status: 'available' }), runner: async invocation => {
      rawPath = invocation.outputPath;
      writeFileSync(rawPath, 'invalid-sensitive-response');
      return { code: 0, stdout: 'invalid-sensitive-response' };
    } });
  assert.equal(result.status, 'blocked');
  assert.equal(existsSync(rawPath), false);
  const outsideOwnership = await dispatch({ repo, task: { ...task, file_ownership: { read: ['src/'], write: [] } }, provider: 'codex',
    phase: 'toolkit', files: ['README.md'], probe: async () => { throw new Error('não deveria executar'); } });
  assert.equal(outsideOwnership.status, 'blocked');
  assert.match(outsideOwnership.reason, /ownership/i);
});

test('dispatcher binds the exact package to expected hashes and rejects mutation during review', async () => {
  const { dispatch } = await import(new URL('scripts/lib/dispatcher.mjs', toolkit));
  const { createHash } = await import('node:crypto');
  const { repo, task, review } = fixture();
  const hash = value => createHash('sha256').update(value).digest('hex');
  const candidate = { sha256: hash('candidate'), hashes: { 'README.md': hash('base neutra') }, removed: [] };
  const options = { repo, task, candidate, provider: 'codex', phase: 'toolkit', files: ['README.md'], probe: async () => ({ status: 'available' }) };
  const good = await dispatch({ ...options, runner: async () => ({ code: 0, stdout: JSON.stringify(review) }) });
  assert.equal(good.candidate_sha256, candidate.sha256);
  assert.equal(typeof good.package_sha256, 'string');
  const stale = await dispatch({ ...options, runner: async () => { writeFileSync(join(repo, 'README.md'), 'modified during review'); return { code: 0, stdout: JSON.stringify(review) }; } });
  assert.equal(stale.status, 'blocked');
  let called = false;
  const mismatched = await dispatch({ ...options, runner: async () => { called = true; return { code: 0, stdout: JSON.stringify(review) }; } });
  assert.equal(mismatched.status, 'blocked');
  assert.equal(called, false);
});
