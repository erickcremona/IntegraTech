import {existsSync,readFileSync,lstatSync,readdirSync} from 'node:fs';
import {inventory,fingerprint} from './candidate.mjs';
import {contained} from './paths.mjs';
import {sourceBinding,linkedProject} from './project-locations.mjs';
import {inspectArchitectureDecision,architectureDigest} from './architecture-decision.mjs';
export function architectureRead(repo,path){const p=contained(repo,path);if(!lstatSync(p).isFile()||lstatSync(p).size>256*1024)throw new Error('Documento arquitetural inválido');return JSON.parse(readFileSync(p,'utf8'));}
export function architectureProductSource(repo){const linked=linkedProject(repo);return inventory(repo).filter(f=>linked||! /^(?:references\/|docs\/|tools\/|\.(?:agents|claude|codex|cursor)\/|(?:README|SOLUTION_CONTEXT|AGENTS|CLAUDE)\.md$)/.test(f.path));}
export function architectureSourceSnapshot(repo){return fingerprint(architectureProductSource(repo));}
export function architectureCurrent(repo,{requireApproval=true}={}){
 if(!existsSync(contained(repo,'references/project-state.json')))return null;
 const state=architectureRead(repo,'references/project-state.json');
 if(!state.architecture_path){if(state.architecture_mode==='managed-v1')throw new Error('Decisão arquitetural gerenciada ausente');return null;}
 const context=architectureRead(repo,state.context_path);const technologyDecision=architectureRead(repo,state.technology_decision_path);
 const decision=architectureRead(repo,state.architecture_path);
 const inspected=inspectArchitectureDecision({repo,context,technologyDecision,decision,requireApproval});
 if((decision.source_binding_sha256??null)!==(sourceBinding(repo)??null))throw new Error('Arquitetura diverge do vínculo do fonte');
 const identity=architectureRead(repo,'project.json');
 const presentationMismatch = Object.hasOwn(identity, 'presentation') && decision.layout.presentation !== identity.presentation;
 if (!linkedProject(repo) && (decision.layout.name !== identity.name || presentationMismatch)) throw new Error('Arquitetura diverge da identidade do produto');
 return {state,decision,...inspected};
}
// Architecture records do not imply product source generation or validation.
export function inspectArchitectureGraph(repo,decision){
 const sourceFiles=architectureProductSource(repo);
 return {status:'not_run',validation_status:'not_run',source_files:sourceFiles.length,reason:'A decisão arquitetural foi registrada; a validação de código depende de um verificador escolhido para a stack e o contexto.'};
}
export function architectureStatus({repo}){
 try{
 const current=architectureCurrent(repo);if(!current)return {status:'assessment_required',reason:'Projeto existente preservado; analisar arquitetura atual antes de ativar gestão.'};
 const {decision}=current,graph=inspectArchitectureGraph(repo,decision);
 return {status:decision.mode==='evolution'?'migration_pending':'decision_recorded',validation_status:'not_run',profile:decision.profile,decision_sha256:architectureDigest(decision),source_sha256:architectureSourceSnapshot(repo),graph,limits:'A decisão registrada não certifica código, domínio, desempenho, isolamento em runtime ou prontidão para produção.'};
 }catch(error){return {status:'blocked',reason:error.message};}
}

// Verify archived observations without declaring them a current delivery.
export function architectureReceiptEvidence(repo,decision,receipt){
 try{
  if(receipt.schema_version!==1||receipt.decision_sha256!==architectureDigest(decision)||!/^[-A-Za-z0-9_]{1,80}$/.test(receipt.run_id))return false;
  const path=`qa-artifacts/loops/${receipt.run_id}/state.json`;
  if(fingerprint(readFileSync(contained(repo,path)))!==receipt.run_sha256)return false;
  const run=architectureRead(repo,path),e=run.engineering,v=e?.validation;
  const project=`tests/${decision.layout.name}.Arquitetura.Tests/${decision.layout.name}.Arquitetura.Tests.csproj`;
  if(receipt.plan_sha256!==run.delegation?.sdd?.plan_sha256||run.id!==receipt.run_id||run.phase!=='business'||run.status!=='ready_for_delivery'||e?.profile!=='dotnet-offline-v1'||v?.status!=='passed'||v.isolation!=='verified'||v.candidate_sha256!==e.candidate_sha256||fingerprint(e.files)!==e.candidate_sha256)return false;
  if(!v.test_files?.some(f=>f.path===project&&e.files.some(c=>c.path===f.path&&c.sha256===f.sha256)))return false;
  if(!['inventory','frozen_oracles','isolation_canaries','dotnet-offline-v1'].every(id=>v.checks?.some(c=>c.id===id&&c.code===0)))return false;
  if(v.oracle_sha256!==fingerprint(run.oracle_files)||!run.oracle_files.every(f=>fingerprint(readFileSync(contained(repo,`qa-artifacts/loops/${run.id}/oracles/${f.path}`)))===f.sha256))return false;
  const types=e.required_reviews;if(!Array.isArray(types)||!['code','security'].every(t=>types.includes(t))||new Set(types).size!==types.length)return false;
  if(!types.every(type=>e.reviews?.some(r=>r.type===type&&r.verdict==='approved'&&r.candidate_sha256===e.candidate_sha256&&fingerprint(readFileSync(contained(repo,r.path)))===r.sha256)))return false;
  return true;
 }catch{return false;}
}
// Established target permits future approved SDD plans without repeating migration phases.
// Current readiness still requires a receipt for the current source and approved plan.
export function architectureEstablished(repo,decision){
 const digest=architectureDigest(decision),folder=`qa-artifacts/architecture/${digest}`;
 if(!existsSync(contained(repo,folder)))return false;
 return readdirSync(contained(repo,folder)).filter(p=>/^[a-f0-9]{64}-[a-f0-9]{64}\.json$/.test(p)).some(name=>{try{return architectureReceiptEvidence(repo,decision,architectureRead(repo,`${folder}/${name}`));}catch{return false;}});
}
