import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {architectureCurrent,architectureSourceSnapshot,architectureStatus,architectureRead,architectureReceiptEvidence} from './architecture-inspection.mjs';
import {sddStatus,actionPlan,sddDelegation} from './sdd-workflow.mjs';
import {engineeringStatus} from './engineering-loop.mjs';
import {contained} from './paths.mjs';
import {fingerprint} from './candidate.mjs';
import {atomicFileWrite} from './adoption-recovery.mjs';
export function architectureReceiptPath(digest,source,plan){return `qa-artifacts/architecture/${digest}/${source}-${plan}.json`;}
export function architectureCompleted(repo){
 const current=architectureCurrent(repo);if(!current)return null;if(current.decision.mode==='initial')return false;
 const {action}=actionPlan(repo);const source=architectureSourceSnapshot(repo);
 const path=architectureReceiptPath(current.decision_sha256,source,action.plan_sha256);if(!existsSync(contained(repo,path)))return false;
 const receipt=architectureRead(repo,path);if(!architectureReceiptEvidence(repo,current.decision,receipt)||receipt.decision_sha256!==current.decision_sha256||receipt.source_sha256!==architectureSourceSnapshot(repo))return false;
 if(receipt.plan_sha256!==action.plan_sha256||sddStatus({repo}).status!=='completed')return false;
 return engineeringStatus({repo,id:receipt.run_id}).delivery_valid;
}
export function completeArchitecture({repo}){
 const current=architectureCurrent(repo);if(!current||current.decision.mode!=='evolution')throw new Error('Nenhuma migração aprovada em andamento');
 if(sddStatus({repo}).status!=='completed')throw new Error('Migração exige todas as tarefas SDD concluídas');
 const {action}=actionPlan(repo);const runs=action.tasks.map(t=>sddDelegation({repo,id:t.id}).task_id);
 const run_id=runs.find(id=>{const run=engineeringStatus({repo,id});return run.delivery_valid&&run.engineering.profile===current.decision.migration.validation_profile&&run.engineering.validation.test_files?.some(f=>typeof f.path==='string'&&/^[a-f0-9]{64}$/.test(f.sha256));});if(!run_id)throw new Error('Migração exige entrega atual validada e revisada pelo perfil aprovado');
 const source=architectureSourceSnapshot(repo);
 const path=architectureReceiptPath(current.decision_sha256,source,action.plan_sha256);const receipt={schema_version:1,decision_sha256:current.decision_sha256,plan_sha256:action.plan_sha256,source_sha256:architectureSourceSnapshot(repo),run_id,run_sha256:fingerprint(readFileSync(contained(repo,`qa-artifacts/loops/${run_id}/state.json`))),completed_at:new Date().toISOString()};
 if(!architectureReceiptEvidence(repo,current.decision,receipt))throw new Error('Evidências arquiteturais inconsistentes');
 if(existsSync(contained(repo,path))){if(architectureCompleted(repo))return {status:'unchanged',path};throw new Error('Recibo existente inválido; preservar histórico e replanejar');}
 mkdirSync(dirname(contained(repo,path)),{recursive:true});atomicFileWrite(contained(repo,path),JSON.stringify(receipt,null,2)+'\n',{exclusive:true});
 return {status:'completed',path,assurance:`observed_sdd_delivery_with_${current.decision.migration.validation_profile}_validator`};
}
export function reviewArchitecture({repo}){const status=architectureStatus({repo});try{if(status.status==='migration_pending'&&architectureCompleted(repo))return {...status,status:'consistent'};}catch{}return status;}
