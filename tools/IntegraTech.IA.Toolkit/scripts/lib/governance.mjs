import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { contained, assertNoLinks } from './paths.mjs';
import { validateContract } from './contracts.mjs';

export const factoryRoot = new URL('../../fabrica/', import.meta.url);
export const catalog = JSON.parse(readFileSync(new URL('team/catalog.yaml', factoryRoot), 'utf8'));
export function route(category) {
  if (!Object.hasOwn(catalog.routes, category)) throw new Error('categoria sem rota: classificação CTO necessária');
  const name = catalog.routes[category];
  if (!name) throw new Error('categoria sem rota: classificação CTO necessária');
  const role = catalog.specialists.find(role => role.name === name);
  if (!role) throw new Error('rota aponta para papel inexistente');
  return role;
}
export function precheck(repo, phase) {
  if (!['toolkit', 'discovery', 'design', 'business'].includes(phase)) throw new Error('fase inválida');
  let state;
  const result = (ready, reason) => ({ status: ready ? 'ready' : 'blocked', phase, scope_status: state?.scope_status ?? 'pending', reason });
  try {
    const read = path => {
      const full = contained(repo, path);
      if (!statSync(full).isFile() || statSync(full).size > 128 * 1024) throw new Error('documento inválido');
      return new TextDecoder('utf-8', { fatal: true }).decode(readFileSync(full));
    };
    state = JSON.parse(read('references/project-state.json'));
    if (!['pending', 'defined'].includes(state.scope_status)) throw new Error('estado inválido');
    if (['toolkit', 'discovery'].includes(phase)) return result(true, 'Fase permitida; não autoriza efeitos externos ou implementação de negócio.');
    if (state.scope_status !== 'defined') throw new Error('contexto pendente');
    const contextText = read(state.context_path);
    const context = validateContract('business-context', JSON.parse(contextText));
    assertMeaningful(context);
    if (phase === 'design') return result(true, 'Contexto estruturado válido; desenho ainda exige validação humana.');
    if (state.plan_gate !== 'approved') throw new Error('plano pendente');
    const planText = read(state.plan_path);
    const plan = validateContract('business-plan', JSON.parse(planText));
    assertMeaningful(plan);
    const contextHash = sha256(contextText);
    if (plan.context_sha256 !== contextHash || new Set(plan.phases.map(p => p.id)).size !== plan.phases.length) throw new Error('plano divergente');
    const approval = validateContract('approval', JSON.parse(read(state.approval_path)));
    assertMeaningful(approval);
    if (approval.context_sha256 !== contextHash || approval.plan_sha256 !== sha256(planText)
      || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(approval.approved_at)
      || !Number.isFinite(Date.parse(approval.approved_at))) throw new Error('aceite divergente');
    assertMeaningful(read(approval.source_reference));
    return result(true, 'Contexto, plano e referência de aceite válidos. A estrutura não autentica o aprovador nem autoriza efeitos externos.');
  } catch {
    return result(false, 'Contexto, plano ou aceite pendente/inválido. Confira documentos, placeholders, referências e hashes.');
  }
}
export const sha256 = text => createHash('sha256').update(text).digest('hex');
function assertMeaningful(value) {
  if (typeof value === 'string') {
    if (!value.trim() || /^(?:todo|tbd|pendente|a definir|preencher|\.\.\.|<[^>]*>)\s*[.!]?$/i.test(value.trim())) throw new Error('placeholder');
  } else if (Array.isArray(value)) value.forEach(assertMeaningful);
  else if (value && typeof value === 'object') Object.values(value).forEach(assertMeaningful);
}
