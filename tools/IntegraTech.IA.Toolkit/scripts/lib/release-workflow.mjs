import {architectureCompleted} from './architecture-workflow.mjs';
import {readFileSync,existsSync,lstatSync,mkdirSync,writeFileSync,unlinkSync} from 'node:fs';
import {dirname,resolve,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {inventory,fingerprint} from './candidate.mjs';
import {sourceRoot,sourceBinding,overlaps} from './project-locations.mjs';
import {contained,assertNoLinks,assertSanitized} from './paths.mjs';
import {graphPath} from './traceability-graph.mjs';
import {atomicFileWrite} from './adoption-recovery.mjs';
import {engineeringStatus} from './engineering-loop.mjs';
import {sddStatus,actionPlan,sddDelegation} from './sdd-workflow.mjs';
export const releaseCriteria=['functional_acceptance','build_provenance','configuration','security_operations','observability','rollback','distribution'];
const toolkitRepo=fileURLToPath(new URL('../../../../',import.meta.url));
function releasePath(id){if(typeof id!=='string'||!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,59}$/.test(id))throw new Error('ID de release inválido');return `qa-artifacts/releases/${id}/plan.json`;}
function text(repo,path){const full=graphPath(repo,path);const stat=lstatSync(full);if(!stat.isFile()||stat.size>256*1024)throw new Error('evidência inválida');const bytes=readFileSync(full);const value=new TextDecoder('utf-8',{fatal:true}).decode(bytes);if(value.includes('\0'))throw new Error('evidência não textual');assertSanitized(value);return value;}
function json(repo,path){return JSON.parse(text(repo,path));}
const digestFile=(repo,path)=>fingerprint(readFileSync(contained(repo,path)));
function binding(repo){return {source_sha256:fingerprint(inventory(repo)),context_sha256:digestFile(repo,'references/business-context.json'),project_sha256:digestFile(repo,'project.json'),source_binding_sha256:sourceBinding(repo)??null};}
function artifactBytes(repo,artifact){if(!artifact||typeof artifact.path!=='string'||!artifact.path.startsWith('qa-artifacts/')||artifact.path.split('/').some(part=>!part||part==='.'||part==='..'))throw new Error('artefato deve ficar nos artefatos privados da gestão');const full=contained(repo,artifact.path);const stat=lstatSync(full);if(!stat.isFile()||stat.size>32*1024*1024||!stat.size)throw new Error('artefato inválido ou acima de 32 MiB');const bytes=readFileSync(full);if(fingerprint(bytes)!==artifact.sha256)throw new Error('artefato alterado');return bytes;}
const meaningful=value=>typeof value==='string'&&value.trim().length>=3&&!/^(?:todo|tbd|pendente|a definir|preencher|\.\.\.)$/i.test(value.trim());
function https(value){try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password;}catch{return false;}}
function validDate(value){return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T.*Z$/.test(value)&&Number.isFinite(Date.parse(value))&&Date.parse(value)<=Date.now();}
function safeDestination(repo,destination){if(typeof destination!=='string'||!isAbsolute(destination))throw new Error('destino local absoluto obrigatório');destination=resolve(destination);assertNoLinks(destination);if([sourceRoot(repo),resolve(repo),toolkitRepo].some(root=>overlaps(root,destination)))throw new Error('destino sobrepõe fonte ou toolkit');if(!lstatSync(dirname(destination)).isDirectory())throw new Error('pasta de destino deve existir');return destination;}
export function initializeRelease({repo,id}){
 const identity=json(repo,'project.json');if(identity.is_model!==false)throw new Error('release exige produto real, sem converter o modelo');
 const path=releasePath(id);const full=contained(repo,path);if(existsSync(full))return {status:'exists',path};
 const plan={schema_version:1,release_id:id,...binding(repo),run_id:'',artifact:{path:'',sha256:''},target:{kind:'manual',environment:'staging',destination:'',rationale:'',research:[]},criteria:Object.fromEntries([...releaseCriteria,'staging_validation'].map(key=>[key,{status:'pending',release_binding_sha256:'',verified_by:'',verified_at:'',statement:'',evidence_path:'',evidence_sha256:''}]))};
 mkdirSync(dirname(full),{recursive:true});atomicFileWrite(full,JSON.stringify(plan,null,2)+'\n',{exclusive:true});return {status:'draft',path,next_step:'Agente de publicação: entender o produto, pesquisar alternativas, preparar destino, artefato e evidências; não publicar sem aceite específico.'};
}
export function releaseEvidenceBinding(plan){const {criteria,...version}=plan;return fingerprint(version);}
export function checkRelease({repo,id,stage='staging'}){
 if(!['staging','production'].includes(stage))throw new Error('estágio inválido');
 const path=releasePath(id);const plan=json(repo,path);if(plan.schema_version!==1||plan.release_id!==id)throw new Error('manifesto de release inválido');
 const evidenceBinding=releaseEvidenceBinding(plan);
 const checks=[];const add=(id,passed,basis)=>checks.push({id,status:passed?'passed':'blocked',basis});
 let architecture=true;try{architecture=architectureCompleted(repo)!==false;}catch{architecture=false;}
 add('architecture',architecture,'approved_architecture_and_completed_migration');
 let bound=false;try{const current=binding(repo);bound=Object.keys(current).every(key=>plan[key]===current[key])&&json(repo,'project.json').is_model===false;}catch{}
 add('version_binding',bound,'observed_local_hashes');
 let scope=false,delivery=false;try{scope=sddStatus({repo}).status==='completed';const {action}=actionPlan(repo);const run=engineeringStatus({repo,id:plan.run_id});delivery=scope&&run.delivery_valid&&run.phase==='business'&&action.tasks.some(task=>sddDelegation({repo,id:task.id}).task_id===plan.run_id);}catch{}
 add('approved_scope',bound&&scope,'observed_sdd_checkpoints');add('delivery',bound&&delivery,'observed_engineering_loop');
 let artifact=false;try{artifactBytes(repo,plan.artifact);artifact=true;}catch{}add('artifact',bound&&artifact,'observed_local_hash');
 const target=plan.target;let destination=false;try{destination=target.kind==='local-artifact'?!!safeDestination(repo,target.destination):target.kind==='manual'&&https(target.destination);}catch{}
 const research=Array.isArray(target?.research)&&target.research.length>0&&target.research.every(source=>https(source.url)&&/^\d{4}-\d{2}-\d{2}$/.test(source.accessed_at)&&!isNaN(Date.parse(source.accessed_at))&&source.accessed_at<=new Date().toISOString().slice(0,10)&&meaningful(source.finding));
 add('target',bound&&destination&&target.environment===stage&&meaningful(target.rationale)&&research,'operator_research_records');
 for(const key of [...releaseCriteria,...(stage==='production'?['staging_validation']:[])]){
  const record=plan.criteria?.[key];let passed=false;
  try{passed=record?.release_binding_sha256===evidenceBinding&&record?.status==='passed'&&meaningful(record.verified_by)&&validDate(record.verified_at)&&meaningful(record.statement)&&fingerprint(text(repo,record.evidence_path))===record.evidence_sha256;}catch{}
  add(key,bound&&passed,'operator_evidence_not_authenticated');
 }
 const blockers=checks.filter(check=>check.status!=='passed').map(check=>check.id);
 return {status:blockers.length?'preparing':stage==='production'?'ready_for_production':'ready_for_staging',release_id:id,stage,manifest_sha256:fingerprint(text(repo,path)),evidence_binding_sha256:evidenceBinding,metric:{satisfied:checks.length-blockers.length,required:checks.length},blockers,checks,automation:target?.kind==='local-artifact'?'local_artifact_distribution_only':'manual_guidance',assurance:'local_records_do_not_authenticate_approvers_or_certify_production'};
}
export function deployRelease({repo,id,stage='staging',approvalFile,dryRun=false}){
 const readiness=checkRelease({repo,id,stage});if(readiness.blockers.length)throw new Error('release bloqueada; consulte release-check');
 const plan=json(repo,releasePath(id));if(plan.target.kind!=='local-artifact')throw new Error('destino sem executor de deploy; seguir orientação manual');
 const destination=safeDestination(repo,plan.target.destination);if(existsSync(destination))throw new Error('destino existente: não sobrescrever distribuição');
 if(dryRun)return {status:'planned',release_id:id,stage,destination,scope:'artifact_copy_only',manifest_sha256:readiness.manifest_sha256,approval_required:true};
 if(typeof approvalFile!=='string')throw new Error('aceite específico de publicação obrigatório');
 // The caller supplies a local approval record, not an asserted --passed/--yes flag.
 const approvalPath=resolve(approvalFile);assertNoLinks(approvalPath);const stat=lstatSync(approvalPath);if(!stat.isFile()||stat.size>128*1024)throw new Error('aceite inválido');const approvalText=readFileSync(approvalPath,'utf8');assertSanitized(approvalText);const approval=JSON.parse(approvalText);
 if(approval.kind!=='release_deploy'||approval.decision!=='approved'||approval.stage!==stage||approval.manifest_sha256!==readiness.manifest_sha256||!meaningful(approval.approved_by)||!validDate(approval.approved_at)||fingerprint(text(repo,approval.source_reference))!==approval.source_reference_sha256)throw new Error('aceite ausente ou divergente da versão/destino/estágio');
 const lock=contained(repo,`qa-artifacts/releases/${id}/deploy.lock`);writeFileSync(lock,JSON.stringify({pid:process.pid,stage}),{flag:'wx'});
 try{
  const current=checkRelease({repo,id,stage});if(current.blockers.length||current.manifest_sha256!==readiness.manifest_sha256)throw new Error('release mudou durante publicação');
  const bytes=artifactBytes(repo,plan.artifact);const receipt=contained(repo,`qa-artifacts/releases/${id}/distribution-${randomUUID()}.json`);
  // Journal first: an interrupted copy is never silently replayed.
  const record={schema_version:1,release_id:id,stage,manifest_sha256:readiness.manifest_sha256,artifact_sha256:plan.artifact.sha256,manifest:plan,checks:current.checks,approval_sha256:fingerprint(approvalText),destination,status:'prepared',scope:'artifact_copy_only',application_health:'not_observed'};
  atomicFileWrite(receipt,JSON.stringify(record,null,2)+'\n',{exclusive:true});
  assertNoLinks(destination);atomicFileWrite(destination,bytes,{exclusive:true});
  atomicFileWrite(receipt,JSON.stringify({...record,status:'distributed',distributed_at:new Date().toISOString()},null,2)+'\n');
  return {status:'distributed',release_id:id,stage,receipt,scope:'artifact_copy_only',application_health:'not_observed'};
 }finally{unlinkSync(lock);}
}
