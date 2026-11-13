import {architectureCurrent} from './architecture-inspection.mjs';
export function architectureOracleTransition({decision,taskId,baselineFiles}){
 const t=decision?.mode==='evolution'&&decision.migration?.oracle_transition;
 if(!t||t.task_id!==taskId)return null;
 // Keep the approved transition record, but never synthesize or compare product source.
 if(!t.task_id||![t.original_sha256,t.target_sha256].every(value=>/^[a-f0-9]{64}$/.test(value)))throw new Error('Registro de transição arquitetural inválido');
 if(!Array.isArray(baselineFiles))throw new Error('Baseline arquitetural inválido');
 throw new Error('Transição automática de oráculo indisponível; preserve o teste atual e implemente e valide a migração para a stack aprovada.');
}
export function taskArchitectureTransition(repo,delegation,baselineFiles){
 if(!delegation?.sdd)return null;
 const current=architectureCurrent(repo);if(!current)return null;
 const transition=architectureOracleTransition({decision:current.decision,taskId:delegation.sdd.task_id,baselineFiles});
 return transition;
}
export function verifyArchitectureOracles(repo,state){
 const archived=state.architecture_oracle_transition;
 if(archived){
  const validHash=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
  if(typeof archived.path!=='string'||!validHash(archived.original_sha256)||!validHash(archived.target_sha256)||!validHash(archived.decision_sha256)
   ||state.baseline_files.find(file=>file.path===archived.path)?.sha256!==archived.original_sha256
   ||state.oracle_files.find(file=>file.path===archived.path)?.sha256!==archived.target_sha256)throw new Error('Transição arquitetural arquivada inválida');
  return true;
 }
 const transition=taskArchitectureTransition(repo,state.delegation,state.baseline_files);
 const descriptor=transition?(({content,...record})=>record)(transition):null;
 if(descriptor)throw new Error('Transição automática de oráculo não é suportada pelo toolkit.');
 return true;
}
