import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { precheck } from '../scripts/lib/governance.mjs';
const hash = text => createHash('sha256').update(text).digest('hex');
function setup() {
  const repo = mkdtempSync(join(tmpdir(), 'business-gates-'));
  mkdirSync(join(repo, 'references'));
  const state = { scope_status: 'defined', plan_gate: 'approved', context_path: 'references/context.json', plan_path: 'references/plan.json', approval_path: 'references/approval.json' };
  const save = (path, data) => { const text = typeof data === 'string' ? data : JSON.stringify(data); writeFileSync(join(repo, path), text); return text; };
  const context = { schema_version: 1, problem: 'O atendimento demora e precisa de acompanhamento.', current_situation: 'Solicitações são registradas manualmente.', stakeholders: ['Atendentes'], desired_outcomes: ['Acompanhar solicitações'], success_criteria: ['Todas as solicitações têm responsável'], scope: ['Registrar solicitações'], out_of_scope: [], known_rules: [], data: [], constraints: [], integrations: [], open_questions: [], assumptions: [] };
  const contextText = save(state.context_path, context);
  const plan = { schema_version: 1, context_sha256: hash(contextText), objective: 'Registrar solicitações com responsável', scope: ['Registro'], out_of_scope: [], risks: [], phases: [{ id: 'fase-1', deliverables: ['Registro'], acceptance_criteria: ['Responsável obrigatório'], validation_commands: ['Teste do caso de uso'] }] };
  const planText = save(state.plan_path, plan);
  const approval = { schema_version: 1, decision: 'approved', context_sha256: hash(contextText), plan_sha256: hash(planText), approved_by: 'Responsável pelo produto', approved_at: '2026-11-02T12:00:00Z', source_reference: 'references/aceite.md' };
  save(approval.source_reference, 'O responsável aprovou a fase 1 descrita no plano nesta sessão.');
  save(state.approval_path, approval);
  save('references/project-state.json', state);
  return { repo, state, context, plan, approval, save };
}
test('negócio: descoberta aceita contexto pendente, implementação não', () => {
  const f = setup();
  f.save('references/project-state.json', { scope_status: 'pending', plan_gate: 'pending' });
  assert.equal(precheck(f.repo, 'discovery').status, 'ready');
  assert.equal(precheck(f.repo, 'design').status, 'blocked');
  assert.equal(precheck(f.repo, 'business').status, 'blocked');
});
test('negócio: documentos e aceite vinculados liberam fase, alteração invalida', () => {
  const f = setup();
  assert.equal(precheck(f.repo, 'design').status, 'ready');
  assert.equal(precheck(f.repo, 'business').status, 'ready');
  f.save(f.state.context_path, { ...f.context, problem: 'Problema alterado após o aceite' });
  assert.equal(precheck(f.repo, 'business').status, 'blocked');
});
test('negócio: booleanos, placeholders, documentos vazios e escapes não liberam', () => {
  for (const mutate of [
    f => f.save('references/project-state.json', { scope_status: 'defined', plan_gate: 'approved' }),
    f => f.save(f.state.context_path, ''),
    f => f.save(f.state.context_path, { ...f.context, problem: 'TODO' }),
    f => f.save(f.state.plan_path, { ...f.plan, objective: 'A definir' }),
    f => f.save(f.state.approval_path, { ...f.approval, approved_by: 'PENDENTE' }),
    f => f.save(f.approval.source_reference, ''),
    f => f.save(f.state.approval_path, { ...f.approval, approved_at: 'invalid' }),
    f => f.save('references/project-state.json', { ...f.state, context_path: '../outside.json' })
  ]) {
    const f = setup(); mutate(f);
    assert.equal(precheck(f.repo, 'business').status, 'blocked');
  }
});
