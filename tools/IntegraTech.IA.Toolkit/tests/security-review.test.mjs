import test from 'node:test';
import assert from 'node:assert/strict';
import { validateContract } from '../scripts/lib/contracts.mjs';
import { expectedFiles } from '../scripts/lib/installer.mjs';
import { readFileSync } from 'node:fs';
import { route } from '../scripts/lib/governance.mjs';

const finding = {
  severity: 'high', title: 'Autorização insuficiente', evidence: 'A rota não verifica ownership',
  path: 'src/api/orders.mjs', line: 42, impact: 'Outro usuário pode ler o pedido',
  recommendation: 'Validar ownership no servidor',
};
const report = findings => ({ schema_version: 1, task_id: 'security-review', review_type: 'security', verdict: 'changes_required', findings, residual_risk: '' });

test('security review findings require an OWASP reference', () => {
  assert.throws(() => validateContract('review', report([finding])), /security_reference/);
});

test('security review accepts findings with a contextual OWASP reference', () => {
  assert.doesNotThrow(() => validateContract('review', report([{ ...finding, security_reference: 'OWASP ASVS 5.0.0 V4.2.1' }])));
  assert.doesNotThrow(() => validateContract('review', report([{ ...finding, security_reference: 'https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html' }])));
});

test('security review rejects references that do not identify an OWASP source', () => {
  assert.throws(() => validateContract('review', report([{ ...finding, security_reference: 'A standard security checklist' }])), /referência OWASP/);
});

test('clean security review does not require a fabricated OWASP reference', () => {
  assert.doesNotThrow(() => validateContract('review', {
    schema_version: 1, task_id: 'security-review', review_type: 'security', verdict: 'approved', findings: [], residual_risk: 'Riscos residuais descritos no relatório.',
  }));
});

test('new product provider adapters install the OWASP security reviewer and canonical skill', () => {
  const files = expectedFiles('all');
  for (const path of ['.codex/agents/security-reviewer.toml', '.claude/agents/security-reviewer.md', '.cursor/agents/security-reviewer.md']) {
    assert.match(files.get(path), /OWASP/);
  }
  for (const path of ['.agents/skills/integratech-seguranca/SKILL.md', '.claude/skills/integratech-seguranca/SKILL.md', '.cursor/skills/integratech-seguranca/SKILL.md']) {
    assert.match(files.get(path), /OWASP Secure Code Review Cheat Sheet/);
    assert.match(files.get(path), /ASVS 5\.0\.0/);
  }
});

test('CTO security route selects the existing independent OWASP reviewer', () => {
  const specialist = route('security');
  assert.equal(specialist.name, 'security-reviewer');
  assert.equal(specialist.review_type, 'security');
  assert.equal(specialist.read_only, true);
  assert.equal(specialist.skill, 'integratech-seguranca');
  const governance = readFileSync(new URL('../fabrica/governance.md', import.meta.url), 'utf8');
  assert.match(governance, /sempre que uma demanda introduzir, alterar, aceitar ou remover decisão de segurança, o CTO aciona o `security-reviewer`/);
});
