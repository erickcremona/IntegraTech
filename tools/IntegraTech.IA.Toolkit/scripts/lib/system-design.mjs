import {validateAgainstSchema,loadSchema} from './contracts.mjs';
import {fingerprint} from './candidate.mjs';

const critical=new Set(['critical_external_integration','payment_or_financial_flow','regulated_data_boundary','cross_system_consistency','availability_requirement','distributed_runtime']);
const supported=new Set(['multiple_components','critical_external_integration','payment_or_financial_flow','regulated_data_boundary','cross_system_consistency','availability_requirement','performance_requirement','distributed_runtime','complex_async_workflow','resilience_requirement']);
export function assessSystemDesign({context,specification,contextHash}){
 try{validateAgainstSchema(loadSchema('functional-spec'),specification);}catch{throw new Error('System design: especificação funcional inválida.');}
 const requirements=specification.requirements;
 if(typeof contextHash!=='string'||!/^[a-f0-9]{64}$/.test(contextHash)||specification.context_sha256!==contextHash)throw new Error('System design: contexto e especificação divergentes.');
 const signals=[];
 for(const requirement of requirements)for(const signal of requirement.system_design_signals??[]){
  if(!supported.has(signal.kind)||typeof signal.evidence!=='string'||!signal.evidence.trim())throw new Error('System design: indicador sem evidência ou não suportado.');
  const refs=requirement.context_refs??[];const grounded=refs.some(ref=>{if(!ref.pointer.startsWith('/'))return false;const value=ref.pointer.slice(1).split('/').reduce((v,k)=>{const key=k.replaceAll('~1','/').replaceAll('~0','~');return v&&typeof v==='object'&&Object.hasOwn(v,key)?v[key]:undefined;},context);return typeof value==='string'&&value===ref.quote&&ref.quote.includes(signal.evidence);});
  if(!grounded)throw new Error('System design: indicador não está sustentado por citação exata do contexto.');
  signals.push({requirement_id:requirement.id,kind:signal.kind,evidence:signal.evidence});
 }
 const criticality=signals.some(s=>critical.has(s.kind));
 const kinds=new Set(signals.map(s=>s.kind));
 const recommended=criticality||['multiple_components','complex_async_workflow','resilience_requirement'].some(k=>kinds.has(k))||kinds.size>=2;
 return {status:criticality?'required':recommended?'recommended':'not_required',signals,reason:criticality?'A especificação registra fluxo crítico, fronteira regulada, consistência externa, disponibilidade ou execução distribuída.':recommended?'A especificação combina atributos que precisam de decisões coordenadas de componentes, dados ou falhas.':'A especificação atual não contém sinais estruturais que justifiquem um desenho de sistema separado; o desenho técnico SDD é suficiente.',follow_up:recommended?'Explicitar componentes, sequências, dados, integrações, falhas, segurança, observabilidade, UX e critérios de validação para aprovação no plano SDD.':'Registrar a avaliação e prosseguir com o desenho técnico normal.'};
}
export function inspectSystemDesign({repo,context,specification,technicalDesign,contextHash,specificationHash,required=true}){
 const assessment=assessSystemDesign({context,specification,contextHash});
 const design=technicalDesign.system_design;
 if(!design){if(required)throw new Error('System design: avaliação contextual obrigatória no desenho técnico.');return assessment;}
 validateAgainstSchema(loadSchema('system-design'),design);
 if(technicalDesign.context_sha256!==contextHash||technicalDesign.specification_sha256!==specificationHash)throw new Error('System design: contexto/especificação divergente.');
 const specIds=new Set(specification.requirements.map(r=>r.id));
 if(design.signals.some(s=>!specIds.has(s.requirement_id)))throw new Error('System design: indicador sem requisito correspondente.');
 if(fingerprint(design.signals)!==fingerprint(assessment.signals))throw new Error('System design: indicadores divergem da especificação funcional.');
 if(assessment.status==='required'&&(design.applicability!=='required'||design.decision!=='included'))throw new Error('System design: requisito crítico exige desenho detalhado incluído no plano.');
 if(assessment.status==='recommended'&&design.applicability!=='recommended')throw new Error('System design: recomendação precisa ser incluída ou adiada com justificativa; não pode ser marcada como não aplicável.');
 if(assessment.status==='recommended'&&!['included','deferred'].includes(design.decision))throw new Error('System design: recomendação deve ser incluída ou adiada com justificativa.');
 if(assessment.status==='not_required'&&(design.applicability!=='not_required'||design.decision!=='not_applicable'))throw new Error('System design: sem sinais relevantes, a decisão deve ser not_applicable.');
 if(design.decision==='deferred'&&!design.defer_reason?.trim())throw new Error('System design: adiamento requer motivo.');
 if(design.decision!=='deferred'&&design.defer_reason!==undefined)throw new Error('System design: defer_reason só é permitido para decisão adiada.');
 if(design.applicability==='required'||design.applicability==='recommended'&&design.decision==='included'){
  for(const field of ['components','flows','data_boundaries','integrations','failure_modes','quality_attributes','security','observability','ux_touchpoints','validation_strategy'])if(!design[field].length)throw new Error(`System design: seção ${field} obrigatória para desenho incluído.`);
  if(design.decision!=='included')throw new Error('System design: desenho proposto precisa ser incluído no SDD aprovado.');
 }
 if(design.decision==='deferred'||design.decision==='not_applicable')for(const field of ['components','flows','data_boundaries','integrations','failure_modes','quality_attributes','security','observability','ux_touchpoints','validation_strategy'])if(design[field].length)throw new Error(`System design: ${field} deve ficar vazio enquanto o desenho não for incluído.`);
 return {...assessment,approved_with_plan:true};
}
