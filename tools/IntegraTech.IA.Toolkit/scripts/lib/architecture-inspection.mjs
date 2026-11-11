import {existsSync,readFileSync,lstatSync,readdirSync} from 'node:fs';
import {posix} from 'node:path';
import {inventory,fingerprint} from './candidate.mjs';
import {contained} from './paths.mjs';
import {sourceFile,sourceBinding,linkedProject} from './project-locations.mjs';
import {architectureFiles} from './architecture-profiles.mjs';
import {inspectArchitectureDecision,architectureDigest} from './architecture-decision.mjs';
export function architectureRead(repo,path){const p=contained(repo,path);if(!lstatSync(p).isFile()||lstatSync(p).size>256*1024)throw new Error('Documento arquitetural inválido');return JSON.parse(readFileSync(p,'utf8'));}
export function architectureSourceSnapshot(repo){const linked=linkedProject(repo);return fingerprint(inventory(repo).filter(f=>linked||! /^(?:references\/|docs\/|tools\/|\.(?:agents|claude|codex|cursor)\/|(?:README|SOLUTION_CONTEXT|AGENTS|CLAUDE)\.md$)/.test(f.path)));}
export function architectureCurrent(repo,{requireApproval=true}={}){
 if(!existsSync(contained(repo,'references/project-state.json')))return null;
 const state=architectureRead(repo,'references/project-state.json');
 if(!state.architecture_path){if(state.architecture_mode==='managed-v1')throw new Error('Decisão arquitetural gerenciada ausente');return null;}
 const context=architectureRead(repo,state.context_path);const technologyDecision=architectureRead(repo,state.technology_decision_path);
 const decision=architectureRead(repo,state.architecture_path);
 const inspected=inspectArchitectureDecision({repo,context,technologyDecision,decision,requireApproval});
 if((decision.source_binding_sha256??null)!==(sourceBinding(repo)??null))throw new Error('Arquitetura diverge do vínculo do fonte');
 const identity=architectureRead(repo,'project.json');
 if(!linkedProject(repo)&&(decision.layout.name!==identity.name||decision.layout.presentation!==identity.presentation))throw new Error('Arquitetura diverge da identidade do produto');
 return {state,decision,...inspected};
}
// A conservative .NET project-reference check. Semantic/domain fitness still needs native review.
export function inspectArchitectureGraph(repo,decision){
 if(decision.layout.stack!=='dotnet'||decision.profile==='distributed')throw new Error('Arquitetura sem verificador estrutural implementado; avaliação específica necessária');
 const expected=architectureFiles({...decision.layout,profile:decision.profile,modules:decision.profile==='modular-monolith'?decision.requirements.modules:[]});
 const source=inventory(repo);
 for(const f of source.filter(f=>/\.(?:props|targets)$/i.test(f.path)&&!f.path.startsWith('tools/'))){if(/<!DOCTYPE|<!ENTITY|<(?:ProjectReference|Import|Target|UsingTask)\b/i.test(readFileSync(sourceFile(repo,f.path),'utf8')))throw new Error('MSBuild dinâmico/importado exige verificação específica');}
 const projects=source.map(f=>f.path).filter(p=>p.endsWith('.csproj')&&!p.startsWith('tools/')).sort();
 const wanted=[...expected.keys()].filter(p=>p.endsWith('.csproj')).sort();
 if(JSON.stringify(projects)!==JSON.stringify(wanted))throw new Error('Conjunto de projetos diverge do perfil arquitetural');
 const refs=(path,text)=>{
  if(/<!DOCTYPE|<!ENTITY|<Import\b|<ProjectReference[^>]*Condition\s*=/i.test(text))throw new Error('Referência dinâmica não verificável');
  const entries=[...text.matchAll(/<ProjectReference\b([^>]*?)(?:\/>|>)/g)].map(m=>{
   const match=m[1].match(/\bInclude\s*=\s*["']([^"']+)["']/);if(!match||/[\$*?@]/.test(match[1]))throw new Error('ProjectReference dinâmico não verificável');
   const target=posix.normalize(posix.join(posix.dirname(path),match[1].replaceAll('\\','/')));if(!wanted.includes(target))throw new Error('Referência externa/desconhecida');return target;
  }).sort();if(new Set(entries).size!==entries.length)throw new Error('Referências duplicadas');return entries;
 };
 for(const p of projects){const original=refs(p,expected.get(p));const actual=refs(p,readFileSync(sourceFile(repo,p),'utf8'));if(JSON.stringify(original)!==JSON.stringify(actual))throw new Error(`Dependência arquitetural divergente: ${p}`);}
 return {status:'structurally_consistent',projects:projects.length,assurance:'project_references_only_runtime_tests_and_review_required'};
}
export function architectureStatus({repo}){
 try{
 const current=architectureCurrent(repo);if(!current)return {status:'assessment_required',reason:'Projeto existente preservado; analisar arquitetura atual antes de ativar gestão.'};
 const {decision}=current;let graph;try{graph=inspectArchitectureGraph(repo,decision);}catch(error){graph={status:'needs_review',reason:error.message};}
 return {status:decision.mode==='evolution'?'migration_pending':graph.status==='structurally_consistent'?'consistent':'needs_review',profile:decision.profile,decision_sha256:architectureDigest(decision),source_sha256:architectureSourceSnapshot(repo),graph,limits:'Não certifica domínio, desempenho, isolamento em runtime ou prontidão para produção.'};
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
  const transition=decision.migration?.oracle_transition;
  if(transition&&!e.files.some(f=>f.path===`tests/${decision.layout.name}.Arquitetura.Tests/Program.cs`&&f.sha256===transition.target_sha256))return false;
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
