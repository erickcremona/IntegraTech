import {isDeepStrictEqual} from 'node:util';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {engineeringStatus} from './engineering-loop.mjs';
import {actionPlan,sddDelegation,receiptPath,verifyReceipt,sddRead,verifySDDFrontier} from './sdd-workflow.mjs';
import {contained} from './paths.mjs';
import {fingerprint} from './candidate.mjs';
import {atomicFileWrite} from './adoption-recovery.mjs';
export function completeSDDTask({repo,id,runId}){
 const {action}=actionPlan(repo);const delegation=sddDelegation({repo,id});
 if(runId!==delegation.task_id)throw new Error('execução não corresponde à tarefa SDD');
 const path=contained(repo,receiptPath(action,id));
 if(existsSync(path)){verifyReceipt(repo,action,id);verifySDDFrontier(repo,action);return {status:'unchanged',task_id:id};}
 const observed=engineeringStatus({repo,id:runId});
 if(observed.phase!=='business'||!isDeepStrictEqual(observed.delegation,delegation))throw new Error('execução diverge do vínculo exato à tarefa SDD de negócio');
 if(!observed.delivery_valid)throw new Error('conclusão SDD exige entrega observada válida');
 const task=action.tasks.find(task=>task.id===id);
 for(const path of task.test_paths)if(!observed.engineering.validation.test_files?.some(file=>file.path===path&&file.sha256===fingerprint(readFileSync(contained(repo,path)))))throw new Error('testes previstos na tarefa não possuem execução observada nesta revisão');
 const state=sddRead(repo,`qa-artifacts/loops/${runId}/state.json`);
 const receipt={schema_version:1,task_id:id,run_id:runId,plan_sha256:action.plan_sha256,approval_sha256:action.approval_sha256,run_sha256:fingerprint(state.text),candidate_sha256:observed.engineering.candidate_sha256,evidence:observed.engineering.reviews.map(item=>({path:item.path,sha256:item.sha256})),completed_at:new Date().toISOString()};
 mkdirSync(dirname(path),{recursive:true});atomicFileWrite(path,JSON.stringify(receipt,null,2)+'\n',{exclusive:true});return {status:'completed',task_id:id,receipt:receiptPath(action,id)};
}
