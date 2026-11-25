import {architectureCurrent,architectureSourceSnapshot,architectureEstablished} from './architecture-inspection.mjs';
import {isDeepStrictEqual} from 'node:util';
import {readFileSync,lstatSync,existsSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {inspectSDDPlan} from './sdd-plan.mjs';
import {precheck} from './governance.mjs';
import {contained,assertSanitized} from './paths.mjs';
import {atomicFileWrite} from './adoption-recovery.mjs';
import {fingerprint,inventory,changes,owns} from './candidate.mjs';
export function sddRead(repo,path){const full=contained(repo,path);const stat=lstatSync(full);if(!stat.isFile()||stat.size>1024*1024)throw new Error('documento SDD inválido');const text=readFileSync(full,'utf8');assertSanitized(text);return {text,value:JSON.parse(text)};}
export function sddRequired(repo){const state=sddRead(repo,'references/project-state.json').value;return state.execution_workflow==='sdd-v2'||state.plan_path&&sddRead(repo,state.plan_path).value.schema_version===2;}
export function approvedSDD(repo){
 const state=sddRead(repo,'references/project-state.json').value;
 if(precheck(repo,'business').status!=='ready')throw new Error('SDD exige plano/contexto/aceite aprovados e consistentes');
 const plan=sddRead(repo,state.plan_path);if(plan.value.schema_version!==2)throw new Error('plano legado: migração SDD e novo aceite necessários');
 const checked=inspectSDDPlan({repo,plan:plan.value,contextHash:fingerprint(readFileSync(contained(repo,state.context_path)))});
 const action={schema_version:1,context_sha256:plan.value.context_sha256,plan_sha256:fingerprint(plan.text),approval_sha256:fingerprint(sddRead(repo,state.approval_path).text),specification_sha256:plan.value.specification_sha256,design_sha256:plan.value.design_sha256,tasks:checked.tasks};
 action.epoch=fingerprint({plan:action.plan_sha256,approval:action.approval_sha256});
 return {state,plan:plan.value,checked,action,path:`references/action-plans/${action.epoch}.json`};
}
export function prepareActionPlan({repo,dryRun=false}){
 const current=approvedSDD(repo);const architecture=architectureCurrent(repo);if(architecture?.decision.mode==='evolution'&&!architectureEstablished(repo,architecture.decision)&&!existsSync(contained(repo,current.path))&&architecture.decision.migration.baseline_sha256!==architectureSourceSnapshot(repo))throw new Error('Arquitetura: fonte alterado desde a análise; reavaliar baseline antes da migração');const text=JSON.stringify(current.action,null,2)+'\n';const path=contained(repo,current.path);
 if(existsSync(path)){if(readFileSync(path,'utf8')!==text)throw new Error('plano de ação existente diverge; preserve histórico');return {status:'unchanged',path:current.path};}
 if(dryRun)return {status:'planned',path:current.path,tasks:current.action.tasks};
 mkdirSync(dirname(path),{recursive:true});atomicFileWrite(path,text,{exclusive:true});return {status:'prepared',path:current.path,tasks:current.action.tasks};
}
export function actionPlan(repo){const current=approvedSDD(repo);const stored=sddRead(repo,current.path).value;if(JSON.stringify(stored)!==JSON.stringify(current.action))throw new Error('plano de ação alterado ou obsoleto');return current;}
export function sddDelegation({repo,id}){
 const {action,plan,state}=actionPlan(repo);const task=action.tasks.find(task=>task.id===id);if(!task)throw new Error('tarefa SDD ausente');
 return {schema_version:1,task_id:`sdd-${action.epoch.slice(0,12)}-${fingerprint(id).slice(0,20)}`,objective:task.deliverables.join('; '),business_context:plan.specification_path,technical_context:plan.design_path,scope:task.write_files,out_of_scope:plan.out_of_scope,assigned_agent:task.owner,supporting_agents:[],required_inputs:[plan.specification_path,plan.design_path,...(state.architecture_path?[state.architecture_path]:[])],expected_deliverables:task.deliverables,constraints:[],file_ownership:{read:task.read_files,write:task.write_files},risks:plan.risks,acceptance_criteria:plan.phases.find(phase=>phase.id===task.phase_id).acceptance_criteria,validation_commands:task.validation_commands,evidence_required:task.test_paths,deadline_or_priority:'normal',human_gate:'none',experience_impact:task.experience_impact??{classification:'unknown',rationale:'Impacto de experiência deve ser classificado no plano aprovado.'},sdd:{plan_sha256:action.plan_sha256,task_id:id,...(task.architecture_impact?{architecture_impact:task.architecture_impact}:{})}};
}
export function receiptPath(action,id){return `qa-artifacts/sdd/${action.epoch}/${fingerprint(id)}.json`;}
export function verifyReceipt(repo,action,id,seen=new Set()){
 if(seen.has(id))return;
 seen.add(id);
 const task=action.tasks.find(task=>task.id===id);if(!task)throw new Error('checkpoint de tarefa desconhecida');
 for(const dependency of task.depends_on)verifyReceipt(repo,action,dependency,seen);
 const receipt=sddRead(repo,receiptPath(action,id)).value;
 const delegation=sddDelegation({repo,id});
 if(receipt.plan_sha256!==action.plan_sha256||receipt.approval_sha256!==action.approval_sha256||receipt.task_id!==id||receipt.run_id!==delegation.task_id)throw new Error('checkpoint SDD divergente');
 const run=sddRead(repo,`qa-artifacts/loops/${receipt.run_id}/state.json`);
 if(run.value.phase!=='business'||!isDeepStrictEqual(run.value.delegation,delegation))throw new Error('execução de checkpoint diverge da tarefa SDD de negócio');
 if(fingerprint(run.text)!==receipt.run_sha256||run.value.status!=='ready_for_delivery')throw new Error('execução de checkpoint SDD alterada');
 if(receipt.candidate_sha256!==run.value.engineering?.candidate_sha256||receipt.candidate_sha256!==fingerprint(run.value.engineering?.files)||!Array.isArray(run.value.baseline_files))throw new Error('candidato de checkpoint SDD divergente');
 const expectedEvidence=run.value.engineering?.reviews?.map(item=>({path:item.path,sha256:item.sha256}));
 if(!isDeepStrictEqual(receipt.evidence,expectedEvidence)||!expectedEvidence?.length||run.value.engineering.validation?.status!=='passed'||run.value.engineering.validation?.execution_mode!=='host_controlled'||run.value.engineering.validation?.isolation!=='unverified')throw new Error('checkpoint sem evidências consistentes');
 for(const item of receipt.evidence??[])if(fingerprint(readFileSync(contained(repo,item.path)))!==item.sha256)throw new Error('evidência de checkpoint alterada');
 return receipt;
}
export function assertSDDTask({repo,delegation,phase,starting=false}){
 if(phase!=='business'||!sddRequired(repo))return;
 const {action}=actionPlan(repo);
 const architecture=architectureCurrent(repo);
 if(starting&&architecture?.decision.mode==='evolution'&&!architectureEstablished(repo,architecture.decision)&&!action.tasks.some(task=>existsSync(contained(repo,`qa-artifacts/loops/${sddDelegation({repo,id:task.id}).task_id}/state.json`)))&&architecture.decision.migration.baseline_sha256!==architectureSourceSnapshot(repo))throw new Error('Arquitetura: baseline alterado antes do início');
 if(delegation.sdd?.plan_sha256!==action.plan_sha256)throw new Error('tarefa exige vínculo ao plano SDD aprovado');
 const expected=sddDelegation({repo,id:delegation.sdd.task_id});
 if(!isDeepStrictEqual(delegation,expected))throw new Error('delegação diverge da tarefa aprovada no plano SDD');
 for(const dependency of action.tasks.find(task=>task.id===delegation.sdd.task_id).depends_on)verifyReceipt(repo,action,dependency);
 verifySDDFrontier(repo,action,starting?null:delegation);
}
export function sddStatus({repo}){
 if(!sddRequired(repo))return {status:'migration_required',workflow:'legacy-v1',sdd:false};
 const {action,path,plan}=actionPlan(repo);const completed=[];
 for(const task of action.tasks)if(existsSync(contained(repo,receiptPath(action,task.id)))){verifyReceipt(repo,action,task.id);completed.push(task.id);}
 verifySDDFrontier(repo,action);
 return {status:completed.length===action.tasks.length?'completed':'in_progress',path,completed,phases:plan.phases.map(phase=>({id:phase.id,completed:action.tasks.filter(task=>task.phase_id===phase.id).every(task=>completed.includes(task.id))})),ready:action.tasks.filter(task=>!completed.includes(task.id)&&task.depends_on.every(id=>completed.includes(id))).map(task=>task.id)};
}

export function verifySDDFrontier(repo,action,delegation){
 const receipts=action.tasks.filter(task=>existsSync(contained(repo,receiptPath(action,task.id)))).map(task=>verifyReceipt(repo,action,task.id));
 if(!receipts.length)return;
 const edges=receipts.map(receipt=>{const run=sddRead(repo,`qa-artifacts/loops/${receipt.run_id}/state.json`).value;return [fingerprint(run.baseline_files),receipt.candidate_sha256];});
 const latest={candidate_sha256:checkpointFrontier(edges)};
 const current=inventory(repo);if(fingerprint(current)===latest.candidate_sha256)return;
 const candidates=delegation?[delegation]:action.tasks.filter(task=>!receipts.some(receipt=>receipt.task_id===task.id)).map(task=>sddDelegation({repo,id:task.id}));
 for(const task of candidates){
  const path=`qa-artifacts/loops/${task.task_id}/state.json`;if(!existsSync(contained(repo,path)))continue;
  const run=sddRead(repo,path).value;
  if(!run.baseline_files||fingerprint(run.baseline_files)!==latest.candidate_sha256)continue;
  if(!isDeepStrictEqual(run.delegation,task))continue;
  if(changes(run.baseline_files,current).every(path=>owns(task.file_ownership.write,path)))return;
 }
 throw new Error('checkpoint SDD histórico não valida alterações atuais; retome tarefa autorizada ou replaneje');
}

// Use verified execution inventories, never caller-authored checkpoint timestamps.
export function checkpointFrontier(edges){
 const nodes=new Set(edges.flat());const outgoing=new Map([...nodes].map(node=>[node,new Set()]));const adjacent=new Map([...nodes].map(node=>[node,new Set()]));
 for(const [from,to] of edges){adjacent.get(from).add(to);adjacent.get(to).add(from);if(from!==to)outgoing.get(from).add(to);}
 const visited=new Set(),active=new Set();
 function visit(node){if(active.has(node))throw new Error('checkpoints SDD cíclicos exigem reconciliação e nova validação');if(visited.has(node))return;active.add(node);for(const next of outgoing.get(node))visit(next);active.delete(node);visited.add(node);}
 for(const node of nodes)visit(node);
 const connected=new Set();function connect(node){if(connected.has(node))return;connected.add(node);for(const next of adjacent.get(node))connect(next);}
 if(nodes.size)connect(nodes.values().next().value);
 const tips=[...nodes].filter(node=>!outgoing.get(node).size);
 if(connected.size!==nodes.size||tips.length!==1)throw new Error('checkpoints SDD divergentes exigem reconciliação e nova validação');
 return tips[0];
}
