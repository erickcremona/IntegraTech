import {readFileSync,lstatSync} from 'node:fs';
import {fingerprint} from './candidate.mjs';
import {contained} from './paths.mjs';
import {normalizeInitialContext} from './business-context.mjs';
import {validateArchitectureModules} from './architecture-model.mjs';
export const architectureContextHash=context=>fingerprint(normalizeInitialContext(context));
const evidenceBytes=(repo,path)=>{const p=contained(repo,path);const stat=lstatSync(p);if(!stat.isFile()||stat.size>256*1024)throw new Error('Evidência arquitetural acima do limite');return readFileSync(p);};
export const architectureProfiles=['simple-application','modular-monolith','layered-monolith','distributed'];
const validationProfileIds=new Set(Object.keys(JSON.parse(readFileSync(new URL('../../fabrica/validation-profiles.json',import.meta.url),'utf8')).profiles));
export const architectureTechnologyHash=decision=>{const {approval,...body}=decision;return fingerprint(body);};
export const architectureDigest=({approval,...body})=>fingerprint(body);
const fail=message=>{throw new Error(`Arquitetura: ${message}`);};
const text=v=>typeof v==='string'&&v.trim().length>0&&!/^(?:todo|tbd|pendente|a definir|placeholder|\.\.\.)[.!]?$/i.test(v.trim());
const list=v=>Array.isArray(v)&&v.length>0&&v.every(text);
function reference(context,ref){
  if(!text(ref?.pointer)||!ref.pointer.startsWith('/')||!text(ref.quote))fail('referência contextual obrigatória');
  const value=ref.pointer.slice(1).split('/').reduce((v,k)=>{const key=k.replaceAll('~1','/').replaceAll('~0','~');return v&&typeof v==='object'&&Object.hasOwn(v,key)?v[key]:undefined;},context);
  if(typeof value!=='string'||value!==ref.quote)fail('referência contextual inexistente ou alterada');
}
export function assessArchitecture({context,requirements,repo}){
  if(!requirements)return {status:'needs_input',recommended_profile:null,questions:['Quais são a complexidade do domínio, os limites funcionais, as restrições operacionais e os requisitos de escala?']};
  if(requirements.schema_version!==1||requirements.context_sha256!==architectureContextHash(context))fail('requisitos divergem do contexto');
  if(!['simple','moderate','complex','unknown'].includes(requirements.domain_complexity)||!Array.isArray(requirements.modules)||!Array.isArray(requirements.drivers)||!Array.isArray(requirements.unknowns))fail('requisitos inválidos');
  for(const m of requirements.modules){if(!Array.isArray(m.context_refs)||!m.context_refs.length)fail('módulo sem fundamento contextual');m.context_refs.forEach(r=>reference(context,r));}
  const kinds=['independent_deployment','independent_scaling','fault_isolation','strict_domain_rules','async_processing','operations_ready','coupling_pain','measured_bottleneck','recurring_failures'];
  for(const d of requirements.drivers){if(!kinds.includes(d.kind))fail('motivador desconhecido');reference(context,d);}
  validateArchitectureModules(requirements.modules, requirements.modules.length ? 'modular-monolith' : 'simple-application');
  const questions=[...requirements.unknowns];
  if(!questions.every(text))fail('perguntas inválidas');
  if(requirements.domain_complexity==='unknown')questions.push('Qual a complexidade e quais regras do domínio precisam de isolamento?');
  const independence=requirements.drivers.some(d=>['independent_deployment','independent_scaling','fault_isolation'].includes(d.kind));
  // A contextual claim alone is insufficient to establish production operating capability.
  const operational=independence&&repo&&['ci_cd','observability','ownership','incident_response'].every(key=>{try{const e=requirements.operational_evidence?.[key];return text(e?.path)&&fingerprint(evidenceBytes(repo,e.path))===e.sha256;}catch{return false;}});
  if(independence&&!operational)questions.push('Comprove maturidade operacional, observabilidade, CI/CD, ownership e custo antes de considerar distribuição; registre evidências na decisão.');
  return {status:questions.length?'needs_input':'assessed',recommended_profile:operational&&requirements.modules.length>1?'distributed':requirements.modules.length>1?'modular-monolith':requirements.domain_complexity==='complex'?'layered-monolith':'simple-application',questions,distribution_candidate:independence,reason:'Preferir o menor custo estrutural que preserve os limites e atributos de qualidade identificados. Distribuição exige análise específica e não possui gerador automático.'};
}
export function inspectArchitectureDecision({repo,context,technologyDecision,decision,requireApproval=false}){
  const d=decision;
  if(!d||d.schema_version!==1||!['initial','evolution'].includes(d.mode)||!architectureProfiles.includes(d.profile))fail('decisão inválida');
  if(d.context_sha256!==architectureContextHash(context)||d.technology_sha256!==architectureTechnologyHash(technologyDecision))fail('contexto ou tecnologias alterados');
  if(assessArchitecture({context,requirements:d.requirements,repo}).status==='needs_input')fail('avaliação necessita esclarecer perguntas pendentes');
  if(d.profile==='distributed'&&assessArchitecture({context,requirements:d.requirements,repo}).recommended_profile!=='distributed')fail('distribuição exige necessidade e evidências operacionais');
  if(!d.layout||!text(d.layout.name)||!text(d.layout.stack)||!text(d.layout.presentation)||!list(d.rationale)||!list(d.validation_strategy)||!Array.isArray(d.alternatives)||!d.alternatives.length||d.alternatives.some(a=>!text(a.profile)||!text(a.reason)))fail('justificativas, alternativas e validação obrigatórias');
  if(!Array.isArray(d.research)||!d.research.length||d.research.some(r=>{try{const u=new URL(r.url);return u.protocol!=='https:'||u.username||u.password||!/^\d{4}-\d{2}-\d{2}$/.test(r.accessed_at)||!Number.isFinite(Date.parse(r.accessed_at))||Date.parse(r.accessed_at)>Date.now()||!text(r.findings);}catch{return true;}}))fail('pesquisa externa com URL, data e achados obrigatória');
  if(d.mode==='initial'&&d.migration!==null)fail('criação não aceita migração implícita');
  if(d.mode==='evolution'){
    const m=d.migration;
    if(!m||!text(m.from_profile)||!/^[a-f0-9]{64}$/.test(m.baseline_sha256)||!list(m.phases)||!list(m.compatibility)||!list(m.rollback)||typeof m.data_changes!=='boolean'||m.irreversible!==false||!validationProfileIds.has(m.validation_profile))fail('migração exige baseline, fases, compatibilidade, recuperação reversível e perfil de validação existente');
  }
  if(d.mode==='evolution'&&d.migration.oracle_transition){const t=d.migration.oracle_transition;if(!text(t.task_id)||![t.original_sha256,t.target_sha256].every(v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v)))fail('transição de oráculo exige tarefa e hashes explícitos');}
  validateArchitectureModules(d.requirements.modules,d.profile);
  if(requireApproval){const a=d.approval;if(a?.status!=='approved'||a.decision_sha256!==architectureDigest(d)||!text(a.approved_by)||!text(a.approved_at)||!Number.isFinite(Date.parse(a.approved_at))||Date.parse(a.approved_at)>Date.now()||!text(a.source_reference))fail('aprovação humana ausente ou obsoleta');if(fingerprint(evidenceBytes(repo,a.source_reference))!==a.source_reference_sha256)fail('referência de aprovação alterada');}
  return {profile:d.profile,mode:d.mode,decision_sha256:architectureDigest(d),validation_status:'not_run'};
}
