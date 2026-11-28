import {readFileSync,existsSync,mkdirSync,writeFileSync,unlinkSync} from 'node:fs';
import {dirname} from 'node:path';
import {contained,assertNoLinks} from './paths.mjs';
import {atomicFileWrite} from './adoption-recovery.mjs';
import {digest} from './domain-specialist.mjs';
import {normalizeInitialContext} from './business-context.mjs';
import {verifyResearch} from './domain-research.mjs';
import {inspectCapabilityRecommendations,renderCapabilityRecommendations} from './capability-recommendations.mjs';

export function refreshCapabilityRecommendations({repo,preparation,request}={}){
 const statePath=contained(repo,'references/project-state.json');
 const state=JSON.parse(readFileSync(statePath,'utf8'));
 const identity=JSON.parse(readFileSync(contained(repo,'project.json'),'utf8'));
 if(identity.is_model!==false)throw new Error('Relatório de capacidades só pode ser atualizado em projeto adotado.');
 const context=normalizeInitialContext(JSON.parse(readFileSync(contained(repo,state.context_path??'references/business-context.json'),'utf8')));
 verifyResearch({context,preparation,...(request?{request}:{})});
 inspectCapabilityRecommendations({repo,preparation});
 const report=renderCapabilityRecommendations({name:identity.name,context,preparation});
 const reportPath=contained(repo,'references/capability-recommendations.md');
 const lock=contained(repo,'references/.capability-report.lock');
 assertNoLinks(reportPath);writeFileSync(lock,'refresh',{flag:'wx'});
 let historyPreserved=false;
 try{
  if(existsSync(reportPath)){
   const previous=readFileSync(reportPath);
   if(previous.toString('utf8')!==report){
    const archive=`references/history/capability-recommendations/${digest(previous)}.md`;
    const fullArchive=contained(repo,archive);assertNoLinks(fullArchive);mkdirSync(dirname(fullArchive),{recursive:true});
    if(existsSync(fullArchive)){if(digest(readFileSync(fullArchive))!==digest(previous))throw new Error('Histórico de recomendações conflitante; preservar ambos os arquivos.');}
    else atomicFileWrite(fullArchive,previous,{exclusive:true});
    historyPreserved=true;
   }else{
    state.capability_recommendations_sha256=digest(report);atomicFileWrite(statePath,JSON.stringify(state,null,2)+'\n');
    return {status:'unchanged',path:'references/capability-recommendations.md',context_sha256:preparation.context_sha256};
   }
  }
  atomicFileWrite(reportPath,report);
  state.capability_recommendations_sha256=digest(report);
  atomicFileWrite(statePath,JSON.stringify(state,null,2)+'\n');
  return {status:'refreshed',path:'references/capability-recommendations.md',context_sha256:preparation.context_sha256,history_preserved:historyPreserved};
 }finally{if(existsSync(lock))unlinkSync(lock);}
}
