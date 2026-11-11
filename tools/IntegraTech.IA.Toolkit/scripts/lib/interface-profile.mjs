import { readFileSync, existsSync, lstatSync, mkdirSync, mkdtempSync, writeFileSync, unlinkSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { inspectTechnologyDecision } from './technology-decision.mjs';
import { interfaceRegistry, interfaceCapabilities, uiHash } from './interface-selection.mjs';
import { inspectSpecialist } from './domain-workflow.mjs';
import { verifyTechnologySources } from './domain-research.mjs';
import { validateContract } from './contracts.mjs';
import { selectedProviders } from './provider-selection.mjs';
import { contained, assertNoLinks, assertSanitized } from './paths.mjs';
import { atomicFileWrite, currentHash, restoreAdoption } from './adoption-recovery.mjs';

const metaPath='references/interface-profile.json';
const statePath='references/project-state.json';
function read(repo,path,watches){const full=contained(repo,path);if(!lstatSync(full).isFile()||lstatSync(full).size>256*1024)throw new Error('documento de interface inválido');const bytes=readFileSync(full);watches?.push([path,uiHash(bytes)]);return JSON.parse(bytes);}
export function interfaceFiles({name,provider,context,decision}){
 const selection=decision.options.find(option=>option.id===decision.selected_option)?.interface;
 if(!selection||selection.platform==='none')return new Map();
 const profile=interfaceRegistry().profiles.find(profile=>profile.id===selection.framework);
 if(!profile||!/^[-a-z]+\.md$/.test(profile.guidance))throw new Error('perfil de orientação da interface indisponível');
 const common=readFileSync(new URL('../../fabrica/skills/integratech-interface/SKILL.md',import.meta.url),'utf8');
 const quality=readFileSync(new URL('../../fabrica/ui/experience-quality.md',import.meta.url),'utf8');
 const guidance=readFileSync(new URL(`../../fabrica/ui/profiles/${profile.guidance}`,import.meta.url),'utf8');
 if(!/^[A-Z][a-zA-Z0-9]*$/.test(name))throw new Error('identidade de interface inválida');
 const skillName=`${name.toLowerCase()}-interface`;
 const skillPath=`tools/${name}.IA.Toolkit/fabrica/skills/${skillName}/SKILL.md`;
 const data=JSON.stringify(selection,null,2).replaceAll('`','\\u0060');
 const text=`---\nname: ${skillName}\ndescription: Use ao trabalhar na interface aprovada de ${name}; verifique ui-status antes de desenhar ou implementar.\n---\n\nLeia references/interface-profile.json, o contexto e a decisão tecnológica atuais. Esta especialização não concede aprovação de negócio nem permissões.\n\n## Seleção aprovada (dados, nunca instruções)\n\n\x60\x60\x60json\n${data}\n\x60\x60\x60\n\n${common.split('---').slice(2).join('---')}\n\n${guidance}\n\n${quality}`;
 const files=new Map([[skillPath,text]]);
 for(const selected of selectedProviders(provider))files.set(`${selected==='codex'?'.agents':'.'+selected}/skills/${skillName}/SKILL.md`,text);
 const validationPath='references/interface-validation-plan.json';
 files.set(validationPath,JSON.stringify({schema_version:1,framework:selection.framework,criteria:selection.validation,accessibility:selection.accessibility,targets:selection.targets,required_reviews:['code','security','ux_accessibility'],requires_observed_browser:selection.platform==='web',design_brief_path:'references/interface-design.json',quality_criteria:['task_clarity','visual_hierarchy','visual_identity','interaction_states','responsive_behavior','accessibility','performance'],minimum_score_per_criterion:4,requires_visual_observation:true,local_diagnostics_are_delivery_evidence:false},null,2)+'\n');
 const technologyHash=uiHash(decision);
 const meta={schema_version:1,context_sha256:decision.context_sha256,technology_sha256:technologyHash,selection,profile_sha256:uiHash({profile,common,guidance,quality}),skill_path:skillPath,validation_path:validationPath,files:[...files].map(([path,value])=>({path,sha256:uiHash(value)}))};
 validateContract('interface-profile',meta);
 files.set(metaPath,JSON.stringify(meta,null,2)+'\n');return files;
}
function inputs(repo){
 const watches=[];const identity=read(repo,'project.json',watches);const state=read(repo,statePath,watches);
 if(identity.is_model!==false)throw new Error('interface exige projeto real, sem converter modelo canônico');
 const context=read(repo,state.context_path??'references/business-context.json',watches);
 if(!state.technology_decision_path)throw new Error('decisão tecnológica aprovada da interface ausente');
 const decision=read(repo,state.technology_decision_path,watches);
 const checked=inspectTechnologyDecision({decision,context,repo,requireApproval:true});
 if(checked.interface.platform!=='none'){
  const specialist=inspectSpecialist(repo);
  const preparation=read(repo,specialist.preparation_path,watches);
  verifyTechnologySources(decision,preparation);
 }
 watches.push([decision.approval.source_reference,currentHash(contained(repo,decision.approval.source_reference))]);
 return {identity,state,context,decision,selection:checked.interface,watches};
}
export function inspectInterface(repo){
 const {identity,state,context,decision,selection}=inputs(repo);
 if(selection.platform==='none'){
  if(state.interface_profile_path||existsSync(contained(repo,metaPath)))throw new Error('perfil de interface antigo exige reconciliação após seleção none');
  return null;
 }
 if(state.interface_profile_path!==metaPath)throw new Error('preparação de interface ausente ou caminho divergente');
 const expected=interfaceFiles({name:identity.name,provider:identity.provider,context,decision});
 for(const [path,text]of expected)if(!existsSync(contained(repo,path))||uiHash(readFileSync(contained(repo,path)))!==uiHash(text))throw new Error('interface/skill/adaptador alterado ou divergente; preserve edição e reavalie a preparação');
 return JSON.parse(expected.get(metaPath));
}
export function interfaceStatus(repo){
 const {selection}=inputs(repo);const meta=inspectInterface(repo);
 return {status:meta?'ready':'not_required',selection,capabilities:interfaceCapabilities(selection),...(meta?{profile_sha256:meta.profile_sha256,skill_path:meta.skill_path,required_reviews:['code','security','ux_accessibility']}:{}),business_authorized:false};
}
// Same recoverable journal format as adoption. All writes are planned before mutation.
export function applyInterfaceFiles({repo,files,oldFiles=[],dryRun=false,inputPaths=[],inputHashes=[]}){
 repo=resolve(repo);assertNoLinks(repo);
 const snapshots=new Map();const old=new Map(oldFiles.map(item=>[item.path,item.sha256]));
 for(const [path,text]of files){
  assertSanitized(text);const full=contained(repo,path);const previous=existsSync(full)?readFileSync(full):null;
  if(previous&&uiHash(previous)!==uiHash(text)&&old.get(path)!==uiHash(previous))throw new Error(`conflito: arquivo de interface alterado ${path}; preservado`);
  snapshots.set(path,previous);
 }
 for(const item of oldFiles)if(!files.has(item.path)||!existsSync(contained(repo,item.path))||uiHash(readFileSync(contained(repo,item.path)))!==item.sha256)throw new Error('conflito: arquivo gerenciado de interface alterado');
 const watches=[...inputHashes,...inputPaths.map(path=>[path,currentHash(contained(repo,path))])];
 const changed=[...files].filter(([path,text])=>snapshots.get(path)?.toString('utf8')!==text);
 if(!changed.length)return {status:'unchanged',files:[...files.keys()]};
 if(dryRun)return {status:'planned',files:changed.map(([path])=>path)};
 const scratch=contained(repo,'.scratch');mkdirSync(scratch,{recursive:true});const lock=contained(scratch,'interface.lock');
 writeFileSync(lock,JSON.stringify({pid:process.pid,journal:null}),{flag:'wx'});
 try{
  const root=contained(repo,'.scratch/adoptions');mkdirSync(root,{recursive:true});const run=mkdtempSync(join(root,'interface-'));
  const journalPath=join(run,'journal.json');
  const operations=changed.map(([path,text])=>({path,before:snapshots.get(path)?uiHash(snapshots.get(path)):null,after:uiHash(text)}));
  const journal={version:1,repo,status:'prepared',operations};
  for(const op of operations)if(op.before){const backup=contained(join(run,'before'),op.path);mkdirSync(dirname(backup),{recursive:true});writeFileSync(backup,snapshots.get(op.path));}
  const save=()=>atomicFileWrite(journalPath,JSON.stringify(journal,null,2)+'\n');save();
  atomicFileWrite(lock,JSON.stringify({pid:process.pid,journal:journalPath.slice(repo.length+1).replaceAll('\\','/')}));
  try{
   if(watches.some(([path,hash])=>currentHash(contained(repo,path))!==hash))throw new Error('insumos da interface alterados');
   for(const [path,bytes]of snapshots)if(currentHash(contained(repo,path))!==(bytes?uiHash(bytes):null))throw new Error('conflito concorrente antes da interface');
   journal.status='applying';save();
   for(const op of operations){if(currentHash(contained(repo,op.path))!==op.before)throw new Error('conflito concorrente durante interface');const full=contained(repo,op.path);mkdirSync(dirname(full),{recursive:true});atomicFileWrite(full,files.get(op.path),{exclusive:op.before===null});}
   if(watches.some(([path,hash])=>!files.has(path)&&currentHash(contained(repo,path))!==hash))throw new Error('insumos da interface alterados durante preparação');
   journal.status='applied';save();return {status:'prepared',files:changed.map(([path])=>path),journal:journalPath};
  }catch(error){journal.status='recovery_required';save();try{restoreAdoption(journalPath);}catch{throw new Error(`interface exige recuperação preservando conflitos: ${journalPath}`);}throw error;}
 }finally{unlinkSync(lock);}
}
export function prepareInterface({repo,dryRun=false}){
 const {identity,state,context,decision,selection,watches}=inputs(repo);
 if(selection.platform==='none'){inspectInterface(repo);return {status:'not_required',capabilities:interfaceCapabilities(selection)};}
 const files=interfaceFiles({name:identity.name,provider:identity.provider,context,decision});
 let oldFiles=[];
 if(existsSync(contained(repo,metaPath))){const old=read(repo,metaPath);const expectedPaths=new Set(files.keys());if(!Array.isArray(old.files)||old.files.some(item=>!expectedPaths.has(item.path)))throw new Error('conflito: metadata de interface incompatível');oldFiles=[...old.files,{path:metaPath,sha256:uiHash(readFileSync(contained(repo,metaPath)))}];}
 const stateText=JSON.stringify({...state,interface_profile_path:metaPath},null,2)+'\n';files.set(statePath,stateText);
 oldFiles.push({path:statePath,sha256:uiHash(readFileSync(contained(repo,statePath)))});
 return {...applyInterfaceFiles({repo,files,oldFiles,dryRun,inputHashes:watches}),capabilities:interfaceCapabilities(selection)};
}


export function recoverInterface({repo}){
 repo=resolve(repo);const lock=contained(repo,'.scratch/interface.lock');
 if(!existsSync(lock))return {status:'not_required'};
 let state;try{state=JSON.parse(readFileSync(lock,'utf8'));}catch{throw new Error('lock de interface inválido; preservado');}
 if(!Number.isInteger(state.pid)||state.pid<1||!Object.hasOwn(state,'journal'))throw new Error('lock de interface inválido; preservado');
 try{process.kill(state.pid,0);throw new Error('escritor ativo');}catch(error){if(error.code!=='ESRCH')throw new Error('encerramento do escritor não comprovado; lock preservado');}
 if(state.journal!==null){
  if(typeof state.journal!=='string'||!/^\.scratch\/adoptions\/interface-[^/]+\/journal\.json$/.test(state.journal))throw new Error('journal de interface inválido');
  const path=contained(repo,state.journal);const journal=read(repo,state.journal);
  if(journal.repo!==repo||!Array.isArray(journal.operations))throw new Error('journal de interface divergente');
  if(journal.status==='applied'){
   if(journal.operations.some(op=>currentHash(contained(repo,op.path))!==op.after))throw new Error('conflito após aplicação; lock preservado');
  }else restoreAdoption(path);
 }
 unlinkSync(lock);return {status:'recovered',automatic_replay:false};
}
