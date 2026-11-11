import { readFileSync, existsSync, lstatSync, readdirSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { inspectInterface, interfaceStatus, applyInterfaceFiles } from './interface-profile.mjs';
import { uiHash } from './interface-selection.mjs';
import { reactInterfaceFiles } from './ui-templates.mjs';
import { precheck } from './governance.mjs';
import { contained, assertNoLinks, assertSanitized } from './paths.mjs';
import { atomicFileWrite } from './adoption-recovery.mjs';
import { runProcess } from './providers.mjs';

const frontendMeta='references/interface-frontend.json';
export function generateInterface({repo,dryRun=false}){
 const status=interfaceStatus(repo);if(status.status==='not_required')return {status:'not_required'};
 if(!status.capabilities.generator_available)return {status:'blocked',reason_code:'interface_generator_unavailable',framework:status.selection.framework};
 if(precheck(repo,'business').status!=='ready')return {status:'blocked',reason_code:'business_gate_required'};
 const profile=inspectInterface(repo);const identity=JSON.parse(readFileSync(contained(repo,'project.json'),'utf8'));
 const files=reactInterfaceFiles({name:identity.name});
 const metadata={schema_version:1,framework:profile.selection.framework,profile_sha256:profile.profile_sha256,technology_sha256:profile.technology_sha256,files:[...files].map(([path,text])=>({path,sha256:uiHash(text)}))};
 let oldFiles=[];
 if(existsSync(contained(repo,frontendMeta))){
  const old=JSON.parse(readFileSync(contained(repo,frontendMeta),'utf8'));
  if(!Array.isArray(old.files)||old.files.some(item=>!files.has(item.path)))throw new Error('metadata frontend inválida');
  oldFiles=[...old.files,{path:frontendMeta,sha256:uiHash(readFileSync(contained(repo,frontendMeta)))}];
 }
 files.set(frontendMeta,JSON.stringify(metadata,null,2)+'\n');
 return {...applyInterfaceFiles({repo,files,oldFiles,dryRun,inputPaths:['project.json','references/project-state.json','references/interface-profile.json']}),business_implemented:false,dependencies_installed:false,next_step:'Revisar o frontend neutro, instalar dependências em ação autorizada e implementar a fase de UI aprovada.'};
}
function frontendSnapshot(repo){
 const root=contained(repo,'frontend');assertNoLinks(root);const entries=[];let bytes=0;
 function walk(path,prefix=''){
  for(const entry of readdirSync(path,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
   if(['node_modules','dist','test-results','.git'].includes(entry.name))continue;
   const name=prefix+entry.name;const full=contained(root,name);
   if(entry.isDirectory())walk(full,name+'/');else{
    const stat=lstatSync(full);if(!stat.isFile()||stat.size>1024*1024||(bytes+=stat.size)>8*1024*1024||entries.length>500)throw new Error('frontend inválido ou acima do limite');
    const data=readFileSync(full);assertSanitized(data.toString('utf8'));entries.push([name,uiHash(data)]);
   }
  }
 }
 walk(root);return uiHash(entries);
}
export async function validateInterface({repo,local=false,runner=runProcess}){
 const profile=inspectInterface(repo);if(!profile)return {status:'not_required'};
 if(!local)return {status:'blocked',reason_code:'isolated_ui_executor_unavailable',local_diagnostic_available:profile.selection.framework==='react-vite',delivery_valid:false};
 if(profile.selection.framework!=='react-vite')return {status:'blocked',reason_code:'interface_validator_unavailable',delivery_valid:false};
 const frontend=contained(repo,'frontend');
 if(!existsSync(contained(frontend,'node_modules')))return {status:'blocked',reason_code:'frontend_dependencies_missing',delivery_valid:false};
 const pkg=JSON.parse(readFileSync(contained(frontend,'package.json'),'utf8'));
 if(pkg.scripts?.build!=='tsc --noEmit && vite build'||pkg.scripts?.['test:browser']!=='node --test tests/browser.test.mjs')throw new Error('perfil diagnóstico exige scripts revisados; não executar shell arbitrário');
 const before=frontendSnapshot(repo);const checks=[];const start=performance.now();
 for(const script of ['build','test:browser']){
  const left=120000-Math.ceil(performance.now()-start);if(left<=0){checks.push({id:script,status:'blocked',reason_code:'timeout'});break;}
  const result=await runner({command:process.platform==='win32'?'npm.exe':'npm',args:['run',script],cwd:frontend,timeoutMs:left});
  const passed=result.code===0&&!result.timedOut&&!result.overflow&&!result.error;
  checks.push({id:script,status:passed?'passed':'failed'});if(!passed)break;
 }
 const stable=before===frontendSnapshot(repo);
 const passed=stable&&checks.length===2&&checks.every(check=>check.status==='passed');
 const report={schema_version:1,status:passed?'passed':'blocked',mode:'local_diagnostic',isolation:'not_verified',delivery_valid:false,frontend_sha256:before,profile_sha256:profile.profile_sha256,technology_sha256:profile.technology_sha256,stable,checks,duration_ms:Math.ceil(performance.now()-start),manual_accessibility_review:'required',real_user_performance:'not_observed'};
 const directory=contained(repo,'qa-artifacts/interface');mkdirSync(directory,{recursive:true});const path=contained(directory,`${randomUUID()}.json`);atomicFileWrite(path,JSON.stringify(report,null,2)+'\n',{exclusive:true});
 return {...report,report:path};
}
