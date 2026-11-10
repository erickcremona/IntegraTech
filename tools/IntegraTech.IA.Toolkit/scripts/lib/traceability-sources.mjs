import {createHash} from 'node:crypto';
import {normalizeInitialContext} from './business-context.mjs';
import {validateContract} from './contracts.mjs';

export const traceDigest = value => createHash('sha256').update(value).digest('hex');
export const traceEdgeKey = edge => traceDigest(JSON.stringify([edge.from,edge.to,edge.relation]));
export function deriveTraceability(read) {
  const nodes=[],edges=[],suggestions=[];
  const fail=code=>{throw Object.assign(new Error(code),{graphCode:code});};
  const json=(path,required=false)=>{
    let source;try{source=read(path);}catch(e){if(!required&&e.graphCode==='source_missing')return null;throw e;}
    try{return {value:JSON.parse(source.text),source};}catch{fail('source_json_invalid');}
  };
  const check=(kind,value)=>{try{validateContract(kind,value);}catch{fail('source_contract_invalid');}};
  const node=(kind,path,pointer='',identity=pointer)=>{
    const id=`auto-${kind}-${traceDigest(JSON.stringify([path,identity])).slice(0,24)}`;
    if(nodes.some(n=>n.id===id))fail('duplicate_source_identity');
    nodes.push({id,kind,source:{path,pointer,sha256:read(path).digest}});return id;
  };
  const link=(from,to,relation='informs')=>edges.push({from,to,relation});
  const state=json('references/project-state.json')?.value??{};
  if(!state||typeof state!=='object'||Array.isArray(state))fail('project_state_invalid');
  const contextPath=state.context_path??'references/business-context.json';
  const contextDocument=json(contextPath,!!state.context_path);
  if(!contextDocument)return {nodes,edges,suggestions:[{code:'context_not_ready'}]};
  let context;
  try{context=normalizeInitialContext(contextDocument.value);}catch{
    if(contextDocument.value?.problem===''&&!contextDocument.value?.scope?.length)return {nodes,edges,suggestions:[{code:'context_not_ready'}]};
    fail('context_invalid');
  }
  const contextNode=node('context',contextPath);
  const requirements=[];
  for(const field of ['scope','success_criteria'])for(const [index,value]of context[field].entries()){
    const id=node('requirement',contextPath,`/${field}/${index}`,`${field}:${JSON.stringify(value)}`);requirements.push(id);link(contextNode,id);
  }
  if(!requirements.length)suggestions.push({code:'requirements_not_recorded'});
  const documentPath=(key,fallback)=>{
    if(!Object.hasOwn(state,key))return fallback;
    if(state[key]===null)return null;
    if(typeof state[key]!=='string'||!state[key].trim())fail('project_state_path_invalid');
    return state[key];
  };
  const technologyPath=documentPath('technology_decision_path','references/technology-decision.json');
  if(technologyPath){
    const document=json(technologyPath,!!state.technology_decision_path);
    if(document){
      const decision=document.value;check('technology-decision',decision);
      if(decision.context_sha256!==traceDigest(JSON.stringify(context)))fail('decision_context_mismatch');
      const selected=decision.options.findIndex(o=>o.id===decision.selected_option);
      if(selected<0)fail('selected_option_missing');
      const decisionNode=node('decision',technologyPath,`/options/${selected}`,`option:${decision.selected_option}`);link(contextNode,decisionNode);
      if(decision.approval.status==='approved'){
        const reference=decision.approval.source_reference;if(!reference)fail('approval_reference_missing');read(reference);
        link(decisionNode,node('approval',reference),'approved_by');
      }
    }
  }
  const planPath=documentPath('plan_path','references/business-plan.json');
  const plan=planPath?json(planPath,!!state.plan_path):null;
  if(plan){
    check('business-plan',plan.value);
    if(plan.value.context_sha256!==contextDocument.source.digest)fail('plan_context_mismatch');
    const planNode=node('decision',planPath);link(contextNode,planNode);
    for(const [index,phase]of plan.value.phases.entries())link(planNode,node('task',planPath,`/phases/${index}`,`phase:${phase.id}`));
    const approvalPath=documentPath('approval_path','references/approval.json');
    const approval=approvalPath?json(approvalPath,!!state.approval_path):null;
    if(approval){
      check('approval',approval.value);
      if(approval.value.context_sha256!==contextDocument.source.digest||approval.value.plan_sha256!==plan.source.digest)fail('approval_binding_mismatch');
      const approvalNode=node('approval',approvalPath);link(planNode,approvalNode,'approved_by');
      const reference=approval.value.source_reference;read(reference);link(approvalNode,node('evidence',reference),'evidenced_by');
    }
  }
  // Array membership proves origin, not which phase/component implements a requirement.
  for(const id of requirements)suggestions.push({code:'requirement_mapping_needed',node:id});
  return {nodes,edges,suggestions};
}
