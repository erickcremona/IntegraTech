import {architectureCurrent} from './architecture-inspection.mjs';
import {linkedProject} from './project-locations.mjs';
import {inspectSDDPlan} from './sdd-plan.mjs';
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { contained, assertNoLinks } from './paths.mjs';
import { inspectInterface } from './interface-profile.mjs';
import { inspectTechnologyDecision } from './technology-decision.mjs';
import { inspectSpecialist, inspectConsultation, readDocument } from './domain-workflow.mjs';
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
  let state;let workflow='legacy-v1';
  const result = (ready, reason) => ({ status: ready ? 'ready' : 'blocked', phase, scope_status: state?.scope_status ?? 'pending', ...(phase==='business'?{execution_workflow:workflow,sdd_verified:ready&&workflow==='sdd-v2',...(ready&&workflow==='legacy-v1'?{warning:'legacy_plan_not_sdd'}:{})}:{}), reason });
  try {
    const read = path => {
      const full = contained(repo, path);
      if (!statSync(full).isFile() || statSync(full).size > 128 * 1024) throw new Error('documento inválido');
      return new TextDecoder('utf-8', { fatal: true }).decode(readFileSync(full));
    };
    const linked=linkedProject(repo);
    state = JSON.parse(read('references/project-state.json'));
    workflow=state.execution_workflow??'legacy-v1';
    if (!['pending', 'defined'].includes(state.scope_status)) throw new Error('estado inválido');
    if(linked&&phase==='toolkit')return result(false,'Manutenção do toolkit usa sua raiz; o sistema anexado exige plano de negócio.');
    if (['toolkit', 'discovery'].includes(phase)) return result(true, 'Fase permitida; não autoriza efeitos externos ou implementação de negócio.');
    if (state.scope_status !== 'defined') throw new Error('contexto pendente');
    const contextText = read(state.context_path);
    const context = validateContract('business-context', JSON.parse(contextText));
    assertMeaningful(context);
    inspectSpecialist(repo);
    let selectedInterface;
    if (state.technology_decision_path) {
      const decision = JSON.parse(read(state.technology_decision_path));
      selectedInterface = decision.options?.find(option=>option.id===decision.selected_option)?.interface;
    }
    if (state.interface_profile_path || selectedInterface && selectedInterface.platform!=='none') inspectInterface(repo);
    if (phase === 'design') return result(true, 'Contexto estruturado válido; desenho ainda exige validação humana.');
    if (state.technology_decision_path) {
      const decision = JSON.parse(read(state.technology_decision_path));
      const technology = inspectTechnologyDecision({ decision, context, repo, requireApproval: true });
      if (!linked) {
        const identity = JSON.parse(read('project.json'));
        if (Object.hasOwn(identity, 'presentation') && technology.selection.presentation !== identity.presentation) throw new Error('decisão tecnológica diverge da identidade do projeto');
      }
    }
    architectureCurrent(repo);
    if (state.plan_gate !== 'approved') throw new Error('plano pendente');
    const planText = read(state.plan_path);
    const rawPlan=JSON.parse(planText);
    if(rawPlan.schema_version===2)workflow='sdd-v2';
    if((linked||state.execution_workflow==='sdd-v2')&&rawPlan.schema_version!==2)throw new Error('SDD exige plano v2');
    const plan = validateContract(rawPlan.schema_version===2?'business-plan-v2':'business-plan', rawPlan);
    if(plan.schema_version===2)inspectSDDPlan({repo,plan,contextHash:sha256(read(state.context_path))});
    assertMeaningful(plan);
    if (!Array.isArray(plan.consultation_paths) || !plan.consultation_paths.length) throw new Error('Consulta do especialista por funcionalidade ausente.');
    const consulted = plan.consultation_paths.map(path => { const record = readDocument(repo, path); inspectConsultation(repo, record); return record.feature_id; });
    if (new Set(consulted).size !== consulted.length || plan.phases.some(phase => !consulted.includes(phase.id))) throw new Error('Cada fase funcional exige consulta atual do especialista.');
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
    return result(false, 'Contexto, especialista, pesquisa, consulta por funcionalidade, plano, arquitetura ou aceite pendente/inválido. Confira documentos e hashes; use specialist-prepare para preparar o domínio.');
  }
}
export const sha256 = text => createHash('sha256').update(text).digest('hex');
function assertMeaningful(value) {
  if (typeof value === 'string') {
    if (!value.trim() || /^(?:todo|tbd|pendente|a definir|preencher|\.\.\.|<[^>]*>)\s*[.!]?$/i.test(value.trim())) throw new Error('placeholder');
  } else if (Array.isArray(value)) value.forEach(assertMeaningful);
  else if (value && typeof value === 'object') Object.values(value).forEach(assertMeaningful);
}
