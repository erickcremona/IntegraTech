import {architectureFiles} from './architecture-profiles.mjs';
import {architectureDigest} from './architecture-decision.mjs';
import {architectureCurrent,architectureEstablished} from './architecture-inspection.mjs';
import {fingerprint,owns} from './candidate.mjs';
export function architectureOracleTransition({decision,taskId,baselineFiles}){
 const t=decision?.mode==='evolution'&&decision.migration?.oracle_transition;
 if(!t||t.task_id!==taskId)return null;
 const path=`tests/${decision.layout.name}.Arquitetura.Tests/Program.cs`;
 const from=architectureFiles({...decision.layout,profile:decision.migration.from_profile,modules:decision.migration.from_modules??[]}).get(path);
 const content=architectureFiles({...decision.layout,profile:decision.profile,modules:decision.profile==='modular-monolith'?decision.requirements.modules:[]}).get(path);
 if(t.original_sha256!==fingerprint(from)||baselineFiles.find(f=>f.path===path)?.sha256!==fingerprint(from))throw new Error('Oráculo original customizado ou divergente: separar testes de regressão antes de migrar');
 if(t.target_sha256!==fingerprint(content))throw new Error('Oráculo alvo diverge da transição aprovada');
 return {path,content,original_sha256:fingerprint(from),target_sha256:fingerprint(content),decision_sha256:architectureDigest(decision)};
}
export function taskArchitectureTransition(repo,delegation,baselineFiles){
 if(!delegation?.sdd)return null;
 const current=architectureCurrent(repo);if(!current)return null;
 const t=current.decision.migration?.oracle_transition;if(t&&architectureEstablished(repo,current.decision)&&!baselineFiles.some(f=>f.path===`tests/${current.decision.layout.name}.Arquitetura.Tests/Program.cs`&&f.sha256===t.original_sha256))return null;
 const transition=architectureOracleTransition({decision:current.decision,taskId:delegation.sdd.task_id,baselineFiles});
 if(transition&&!owns(delegation.file_ownership.write,transition.path))throw new Error('Transição arquitetural exige ownership de escrita do oráculo');
 return transition;
}
export function verifyArchitectureOracles(repo,state){
 const transition=taskArchitectureTransition(repo,state.delegation,state.baseline_files);
 const descriptor=transition?(({content,...record})=>record)(transition):null;
 if(JSON.stringify(state.architecture_oracle_transition??null)!==JSON.stringify(descriptor))throw new Error('Transição arquitetural do oráculo ausente ou divergente');
 if(transition&&state.oracle_files.find(f=>f.path===transition.path)?.sha256!==transition.target_sha256)throw new Error('Hash de oráculo arquitetural divergente');
 return true;
}
