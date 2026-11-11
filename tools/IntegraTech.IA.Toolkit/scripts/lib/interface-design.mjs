import {existsSync,readFileSync,lstatSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {inspectInterface} from './interface-profile.mjs';
import {contained,assertSanitized} from './paths.mjs';
import {atomicFileWrite} from './adoption-recovery.mjs';
import {uiHash} from './interface-selection.mjs';
export const designPath='references/interface-design.json';
export const qualityCriteria=['task_clarity','visual_hierarchy','visual_identity','interaction_states','responsive_behavior','accessibility','performance'];
export function designDraft(meta,context){return {schema_version:1,status:'draft',context_sha256:meta.context_sha256,technology_sha256:meta.technology_sha256,profile_sha256:meta.profile_sha256,audience:context.stakeholders.join('; '),primary_tasks:context.scope,experience_goals:[],design_reference:null,references:[],visual_direction:{principles:[],typography:[],layout:[],color:[],spacing:[],components:[],motion:[]},journeys:[],responsive_rules:[],content_guidelines:[],validation_plan:[],prototypes:[],approval_reference:null};}
export function designDigest(design){const {status,approval_reference,...content}=design;return uiHash(content);}
export function designHash(repo){return {design_sha256:designDigest(JSON.parse(bytes(repo,designPath,256*1024)))};}
export function initializeDesign({repo}){
 const meta=inspectInterface(repo);if(!meta)return {status:'not_required'};
 const path=contained(repo,designPath);if(existsSync(path))return {status:'exists',path:designPath};
 const state=JSON.parse(readFileSync(contained(repo,'references/project-state.json')));const context=JSON.parse(readFileSync(contained(repo,state.context_path)));
 mkdirSync(dirname(path),{recursive:true});atomicFileWrite(path,JSON.stringify(designDraft(meta,context),null,2)+'\n',{exclusive:true});return {status:'draft',path:designPath};
}
function meaningful(value){return typeof value==='string'&&value.trim().length>2&&!/^(?:todo|tbd|pendente|a definir|preencher|\.\.\.)[.!]?$/i.test(value.trim());}
function list(value){return Array.isArray(value)&&value.length>0&&value.every(meaningful);}
function bytes(repo,path,limit){const full=contained(repo,path);const stat=lstatSync(full);if(!stat.isFile()||stat.size>limit)throw new Error('evidência de UX inválida ou acima do limite');return readFileSync(full);}
export function inspectDesign(repo){
 const meta=inspectInterface(repo);if(!meta)return null;
 const draft=JSON.parse(bytes(repo,designPath,256*1024));assertSanitized(JSON.stringify(draft));
 if(draft.schema_version!==1||draft.status!=='approved'||['context_sha256','technology_sha256','profile_sha256'].some(key=>draft[key]!==meta[key]))throw new Error('design UX pendente ou divergente do contexto/stack/perfil');
 if(!meaningful(draft.audience)||!['primary_tasks','experience_goals','responsive_rules','content_guidelines','validation_plan'].every(key=>list(draft[key])))throw new Error('briefing de design UX incompleto');
 if(!['principles','typography','layout','color','spacing','components','motion'].every(key=>list(draft.visual_direction?.[key])))throw new Error('direção visual de UX incompleta');
 const reference=draft.design_reference;
 if(!reference||!meaningful(reference.proposal_id)||!['toolkit','user'].includes(reference.origin)||typeof reference.revision!=='string'||!/^[-a-zA-Z0-9_.]{1,64}$/.test(reference.revision)||!list(reference.usage_rules)||!draft.prototypes?.some(item=>item.path===reference.prototype_path))throw new Error('referência padrão de UX exige proposta escolhida, origem, revisão, protótipo e regras de aplicação');
 if(!Array.isArray(draft.references)||!draft.references.length||draft.references.some(item=>{
  let validSource=false;
  if(item.url){try{const url=new URL(item.url);validSource=url.protocol==='https:'&&!url.username&&!url.password;}catch{}}
  else if(item.origin==='user'&&typeof item.path==='string'&&/\.(?:png|jpg|jpeg|webp|svg|html|pdf)$/i.test(item.path)){try{validSource=uiHash(bytes(repo,item.path,4*1024*1024))===item.sha256;}catch{}}
  return !validSource||!meaningful(item.analysis)||!meaningful(item.application)||!/^\d{4}-\d{2}-\d{2}$/.test(item.accessed_at)||!Number.isFinite(Date.parse(item.accessed_at))||new Date(item.accessed_at).toISOString().slice(0,10)!==item.accessed_at||item.accessed_at>new Date().toISOString().slice(0,10);
 }))throw new Error('referências de UX exigem consulta, análise e aplicação ao contexto');
 if(!Array.isArray(draft.journeys)||!draft.journeys.length||draft.journeys.some(item=>!meaningful(item.task)||!list(item.steps)||!list(item.states)||!list(item.acceptance)))throw new Error('jornadas de UX incompletas');
 if(!Array.isArray(draft.prototypes)||!draft.prototypes.length)throw new Error('protótipo de UX ausente');
 for(const item of draft.prototypes){
  if(!meaningful(item.description)||typeof item.path!=='string'||!/^[-a-zA-Z0-9_/ .]+\.(?:png|jpg|jpeg|webp|svg|html|pdf)$/i.test(item.path)||uiHash(bytes(repo,item.path,4*1024*1024))!==item.sha256)throw new Error('protótipo/evidência de UX ausente ou alterado');
 }
 if(!meaningful(draft.approval_reference))throw new Error('design UX exige referência humana de aceite');
 const approval=JSON.parse(bytes(repo,draft.approval_reference,128*1024));assertSanitized(JSON.stringify(approval));
 if(approval.schema_version!==1||approval.kind!=='ux_design'||approval.decision!=='approved'||approval.design_sha256!==designDigest(draft)||!meaningful(approval.approved_by)||!/^\d{4}-\d{2}-\d{2}T.*Z$/.test(approval.approved_at)||!Number.isFinite(Date.parse(approval.approved_at))||Date.parse(approval.approved_at)>Date.now())throw new Error('aceite UX ausente ou divergente da revisão de design/protótipo');
 const source=bytes(repo,approval.source_reference,128*1024).toString('utf8');assertSanitized(source);if(!meaningful(source))throw new Error('referência humana de UX vazia');
 return {status:'approved',path:designPath,design_sha256:uiHash(draft),quality_criteria:qualityCriteria,design_reference:reference,quality_observed:false};
}
