import test from 'node:test';
import assert from 'node:assert/strict';
import { fullContext, preparationFor } from './domain-fixture.mjs';
const domain = await import('../scripts/lib/domain-specialist.mjs').catch(() => ({}));
test('domínio: contexto incompleto solicita campos ausentes e não considera um problema suficiente', () => {
  const result = domain.assessContext({ problem: 'Criar sistema' });
  assert.equal(result.status, 'needs_input');
  assert.ok(result.questions.some(q => q.field === 'stakeholders'));
  assert.ok(result.questions.some(q => q.field === 'success_criteria'));
  assert.equal(domain.assessContext(fullContext).status, 'ready');
});
test('domínio: perguntas essenciais, contexto divergente e fontes sem cobertura bloqueiam', () => {
  assert.doesNotThrow(() => domain.inspectPreparation({ context: fullContext, preparation: preparationFor() }));
  for (const mutate of [p => p.assessment.critical_questions.push('Quem pode acessar os dados?'), p => p.context_sha256 = 'invalid', p => p.synthesis[0].source_ids = ['missing'], p => p.coverage = [], p => p.sources[0].authority = 'TODO', p => p.action_plan[1].depends_on = ['missing']]) {
    const preparation = preparationFor(); mutate(preparation);
    assert.throws(() => domain.inspectPreparation({ context: fullContext, preparation }));
  }
});
test('domínio: especialista inclui contexto rastreável e adaptadores de todos os provedores', () => {
  const files = domain.specialistFiles({ name: 'Atendimento', provider: 'all', context: fullContext, preparation: preparationFor() });
  for (const dir of ['.agents', '.claude', '.cursor']) assert.ok(files.has(`${dir}/skills/atendimento-especialista-dominio/SKILL.md`));
  const state = JSON.parse(files.get('references/domain-specialist.json'));
  assert.equal(state.skill_path, 'tools/Atendimento.IA.Toolkit/fabrica/skills/atendimento-especialista-dominio/SKILL.md');
  assert.equal(state.context_sha256, preparationFor().context_sha256);
});
