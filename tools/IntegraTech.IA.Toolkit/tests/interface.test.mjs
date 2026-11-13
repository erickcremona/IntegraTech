import test from 'node:test';
import {designDigest} from '../scripts/lib/interface-design.mjs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { decisionFor } from './technology-fixture.mjs';
import { fullContext, preparationFor } from './domain-fixture.mjs';
import { createProject } from './generation-fixture.mjs';
import { inspectTechnologyDecision } from '../scripts/lib/technology-decision.mjs';
import * as ui from '../scripts/lib/interface-profile.mjs';

export function interfaceDecision(framework='react-vite') {
 const decision=decisionFor(fullContext);
 const url=({vue:'https://vuejs.org/guide/best-practices/performance.html',angular:'https://angular.dev/best-practices/a11y',maui:'https://learn.microsoft.com/dotnet/maui/fundamentals/accessibility'})[framework]??'https://react.dev/learn/thinking-in-react';
 decision.options[0].source_urls.push(url);
 decision.research.push({url,accessed_at:'2026-11-10',status:'consulted',findings:'UI baseada em componentes e estado mínimo; versão validada no perfil.'});
 decision.options[0].interface={platform:'web',framework,version:'19.3.1',rendering:'client',source_roots:['frontend'],component_library:'none',style_strategy:'css',design_system:'Identidade visual revisada no plano',targets:['Desktop e mobile'],accessibility:['WCAG 2.2 AA e avaliação manual'],validation:['Tipos, build, interação, teclado e screenshots'],source_urls:[url]};
 return decision;
}
function fixture(decision=interfaceDecision()) {
 const repo=mkdtempSync(join(tmpdir(),'interface-'));
 const preparation=preparationFor(fullContext);
 for(const url of decision.options[0].interface?.source_urls??[]){const source=structuredClone(preparation.sources[0]);source.id='interface';source.url=url;source.receipt.final_url=url;preparation.sources.push(source);preparation.coverage.push({topic:'Interface',rationale:'Validar a stack selecionada',source_ids:['interface']});}
 createProject({name:'InterfaceApp',target:repo,presentation:'api',provider:'all',technologyDecision:decision,preparation});
 return repo;
}

test('structured interface selection requires its own consulted source, never infers UI from API or strings',()=>{
 const repo=mkdtempSync(join(tmpdir(),'interface-approval-'));mkdirSync(join(repo,'references'));
 writeFileSync(join(repo,'references/aceite-tecnologia.md'),'Aceite explícito da decisão técnica.');
 try {
  const d=interfaceDecision();
  assert.equal(inspectTechnologyDecision({decision:d,context:fullContext,repo}).interface.framework,'react-vite');
  d.research.at(-1).status='unavailable';
  assert.throws(()=>inspectTechnologyDecision({decision:d,context:fullContext,repo}),/interface|pesquisa/i);
  const plain=decisionFor(fullContext);plain.options[0].technologies.push('React mencionado como alternativa');
  assert.equal(inspectTechnologyDecision({decision:plain,context:fullContext,repo}).interface.platform,'none');
 }finally{rmSync(repo,{recursive:true,force:true});}
});

test('generation prepares only selected interface skill and provider adapters without frontend business files',()=>{
 const repo=fixture();
 try {
  const meta=ui.inspectInterface(repo);
  assert.equal(meta.selection.framework,'react-vite');
  assert.equal(meta.files.filter(file=>file.path.includes('/skills/')).length,4);
  assert.equal(existsSync(join(repo,'frontend')),false);
  assert.ok(JSON.parse(readFileSync(join(repo,'references/traceability-graph.json'))).nodes.some(node=>node.source.path==='references/interface-profile.json'));
  assert.equal(JSON.parse(readFileSync(join(repo,'references/project-state.json'))).interface_profile_path,'references/interface-profile.json');
  assert.ok(readFileSync(join(repo,meta.skill_path),'utf8').includes('WCAG'));
  assert.equal(ui.prepareInterface({repo,dryRun:true}).status,'unchanged');
 }finally{rmSync(repo,{recursive:true,force:true});}
});

test('manual skill edits, stale decisions and state paths block interface use and preparation',()=>{
 const repo=fixture();
 try {
  const meta=ui.inspectInterface(repo);
  writeFileSync(join(repo,meta.skill_path),'manual content');
  assert.throws(()=>ui.inspectInterface(repo),/diverg|alterad|conflit/i);
  assert.throws(()=>ui.prepareInterface({repo}),/diverg|alterad|conflit/i);
  assert.equal(readFileSync(join(repo,meta.skill_path),'utf8'),'manual content');
 }finally{rmSync(repo,{recursive:true,force:true});}
});

test('none stays clean and non-materializable profiles never fall back to React',()=>{
 const noUI=decisionFor(fullContext);noUI.options[0].interface={platform:'none',framework:'none'};
 const repo=fixture(noUI);
 try {assert.equal(ui.interfaceStatus(repo).status,'not_required');assert.equal(existsSync(join(repo,'references/interface-profile.json')),false);}
 finally{rmSync(repo,{recursive:true,force:true});}
 const other=interfaceDecision('vue');other.options[0].interface.version='3.5.0';
 const another=fixture(other);
 try {assert.equal(ui.inspectInterface(another).selection.framework,'vue');assert.equal(ui.interfaceStatus(another).capabilities.generator_available,false);}
 finally{rmSync(another,{recursive:true,force:true});}
});

test('UI CLI exposes capabilities, refuses business generation before approval, and requires explicit local diagnostics',async()=>{
 const {main}=await import('../scripts/toolkit.mjs');const repo=fixture();
 try{
  assert.ok((await main(['ui-capabilities'])).profiles.some(p=>p.id==='react-vite'));
  assert.equal((await main(['ui-status','--repo',repo])).status,'ready');
  assert.equal((await main(['ui-generate','--repo',repo,'--dry-run'])).reason_code,'business_gate_required');
  assert.equal((await main(['ui-validate','--repo',repo])).delivery_valid,false);
  assert.equal((await main(['ui-validate','--repo',repo,'--local'])).reason_code,'frontend_dependencies_missing');
 }finally{rmSync(repo,{recursive:true,force:true});}
});

test('generator capability does not silently drop the selected component library or styling technology',()=>{
 const repo=fixture();
 try{
  const d=JSON.parse(readFileSync(join(repo,'references/technology-decision.json')));
  d.options[0].interface.component_library='Material UI';
  writeFileSync(join(repo,'references/technology-decision.json'),JSON.stringify(d));
  ui.prepareInterface({repo});
  assert.equal(ui.interfaceStatus(repo).capabilities.generator_available,false);
 }finally{rmSync(repo,{recursive:true,force:true});}
});

function approveBusiness(repo){
 const hash=value=>createHash('sha256').update(value).digest('hex');
 const save=(path,data)=>writeFileSync(join(repo,path),typeof data==='string'?data:JSON.stringify(data));
 const state=JSON.parse(readFileSync(join(repo,'references/project-state.json')));
 const meta=JSON.parse(readFileSync(join(repo,'references/domain-specialist.json')));
 save('references/consultation.json',{schema_version:1,feature_id:'ui-phase',context_sha256:meta.context_sha256,preparation_sha256:meta.preparation_sha256,skill_sha256:meta.skill_sha256,findings:['Fluxo de interface revisado'],domain_impacts:['Formulários acessíveis']});
 const plan={schema_version:1,context_sha256:hash(readFileSync(join(repo,state.context_path))),consultation_paths:['references/consultation.json'],objective:'Implementar a interface aprovada',scope:['Interface'],out_of_scope:[],risks:[],phases:[{id:'ui-phase',deliverables:['Interface'],acceptance_criteria:['Teclado e estados corretos'],validation_commands:['Tipos e browser']}]};
 save('references/business-plan.json',plan);save('references/approval.md','O usuário aprovou o plano nesta fixture de teste.');
 save('references/approval.json',{schema_version:1,decision:'approved',context_sha256:plan.context_sha256,plan_sha256:hash(readFileSync(join(repo,'references/business-plan.json'))),approved_by:'Responsável pelo projeto',approved_at:'2026-11-11T00:00:00Z',source_reference:'references/approval.md'});
 save('references/project-state.json',{...state,execution_workflow:'legacy-v1',scope_status:'defined',plan_gate:'approved',plan_path:'references/business-plan.json',approval_path:'references/approval.json'});
 const design=JSON.parse(readFileSync(join(repo,'references/interface-design.json')));
 save('references/ux-prototype.html','<!doctype html><main>Protótipo sintético do teste de contrato</main>');
 Object.assign(design,{status:'approved',design_reference:{proposal_id:'toolkit-option-1',origin:'toolkit',revision:'1.0',prototype_path:'references/ux-prototype.html',usage_rules:['Aplicar padrão aprovado nas telas do produto']},experience_goals:['Fluxo compreensível para atendentes'],references:[{url:'https://designsystem.digital.gov/',accessed_at:'2026-11-10',analysis:'Fixture de análise de hierarquia e legibilidade',application:'Fixture de aplicação ao formulário'}],visual_direction:Object.fromEntries(['principles','typography','layout','color','spacing','components','motion'].map(key=>[key,['Direção específica revisada nesta fixture']])),journeys:[{task:'Registrar solicitação',steps:['Abrir formulário','Confirmar dados'],states:['Vazio','Erro','Sucesso'],acceptance:['Atendente consegue concluir']}],responsive_rules:['Adaptar navegação ao mobile'],content_guidelines:['Texto claro e específico'],validation_plan:['Revisar protótipo e testar tarefas'],prototypes:[{path:'references/ux-prototype.html',sha256:hash(readFileSync(join(repo,'references/ux-prototype.html'))),description:'Mockup de fixture, não prova de qualidade visual'}],approval_reference:'references/ux-design-approval.json'});
 save('references/ux-approval.md','Fixture: usuário aprovou explicitamente esta direção e protótipo de UX.');
 save('references/ux-design-approval.json',{schema_version:1,kind:'ux_design',decision:'approved',design_sha256:designDigest(design),approved_by:'Responsável pelo design',approved_at:'2026-11-11T00:00:00Z',source_reference:'references/ux-approval.md'});
 save('references/interface-design.json',design);
}


test('approved UI generation preserves backend and refuses overwriting customized frontend',async()=>{
 const {generateInterface}=await import('../scripts/lib/interface-generator.mjs');const repo=fixture();
 try{
  approveBusiness(repo);
  const planned=generateInterface({repo,dryRun:true});assert.equal(planned.status,'planned');assert.equal(existsSync(join(repo,'frontend')),false);
  const backend=readFileSync(join(repo,'project.json'),'utf8');
  assert.equal(generateInterface({repo}).status,'prepared');
  assert.equal(readFileSync(join(repo,'project.json'),'utf8'),backend);
  assert.equal(generateInterface({repo}).status,'unchanged');
  writeFileSync(join(repo,'frontend/src/App.tsx'),'custom interface');
  assert.throws(()=>generateInterface({repo}),/conflito/);
  assert.equal(readFileSync(join(repo,'frontend/src/App.tsx'),'utf8'),'custom interface');
 }finally{rmSync(repo,{recursive:true,force:true});}
});

test('UI candidate fixes UX review requirement before dispatch in addition to code and security',async()=>{
 const {generateInterface}=await import('../scripts/lib/interface-generator.mjs');
 const {startTask,advanceTask}=await import('../scripts/lib/task-loop.mjs');
 const {acceptCandidate,validateCandidate}=await import('../scripts/lib/engineering-loop.mjs');
 const repo=fixture();
 try{
  approveBusiness(repo);generateInterface({repo});
  const delegation={schema_version:1,task_id:'ui-loop',objective:'Ajustar interface aprovada',business_context:'Contexto registrado',technical_context:'React',scope:['frontend'],out_of_scope:[],assigned_agent:'ui-engineer',supporting_agents:[],required_inputs:[],expected_deliverables:['Interface'],constraints:[],file_ownership:{read:['frontend'],write:['frontend']},risks:[],acceptance_criteria:['Navegação acessível'],validation_commands:[],evidence_required:[],deadline_or_priority:'normal',human_gate:'none'};
  startTask({repo,delegation,phase:'business',provider:'codex'});
  advanceTask({repo,id:'ui-loop',expectedRevision:1,event:{type:'gate_checked'}});
  advanceTask({repo,id:'ui-loop',expectedRevision:2,event:{type:'gate_checked'}});
  writeFileSync(join(repo,'frontend/src/App.tsx'),readFileSync(join(repo,'frontend/src/App.tsx'),'utf8')+'\n// revised UI\n');
  const state=acceptCandidate({repo,id:'ui-loop',expectedRevision:3,profile:'node-tests-v1'});
  assert.deepEqual(state.engineering.required_reviews,['code','security','ux_accessibility']);
  const validated=await validateCandidate({repo,id:'ui-loop',expectedRevision:state.revision,validator:async()=>({status:'passed',isolation:'unverified',execution_mode:'host_controlled',checks:['inventory','frozen_oracles','host_controls','node-tests-v1'].map(id=>({id,code:0})),environment:{platform:'synthetic',runtime:'test'}})});
  assert.equal(validated.status,'validation_blocked');
 }finally{rmSync(repo,{recursive:true,force:true});}
});

test('preparation recovery refuses live or unknown writers and clears only confirmed dead pre-write lock',()=>{
 const repo=fixture();
 try{
  mkdirSync(join(repo,'.scratch'),{recursive:true});const path=join(repo,'.scratch/interface.lock');
  writeFileSync(path,JSON.stringify({pid:process.pid,journal:null}));assert.throws(()=>ui.recoverInterface({repo}),/ativo|encerramento/);
  writeFileSync(path,'invalid');assert.throws(()=>ui.recoverInterface({repo}),/inválido/);
  writeFileSync(path,JSON.stringify({pid:2147483647,journal:null}));
  assert.equal(ui.recoverInterface({repo}).status,'recovered');assert.equal(existsSync(path),false);assert.equal(ui.interfaceStatus(repo).status,'ready');
 }finally{rmSync(repo,{recursive:true,force:true});}
});

test('SIMULATED local UI diagnostic records sanitized checks but never grants isolated delivery',async()=>{
 const {generateInterface,validateInterface}=await import('../scripts/lib/interface-generator.mjs');const repo=fixture();
 try{
  approveBusiness(repo);generateInterface({repo});mkdirSync(join(repo,'frontend/node_modules'));
  const calls=[];const result=await validateInterface({repo,local:true,runner:async invocation=>{calls.push(invocation.args);return {code:0,stdout:'private-output-not-for-reports'};}});
  assert.equal(result.status,'passed');assert.equal(result.delivery_valid,false);assert.equal(result.isolation,'not_verified');
  assert.deepEqual(calls,[['run','build'],['run','test:browser']]);assert.ok(!readFileSync(result.report,'utf8').includes('private-output'));
  const unstable=await validateInterface({repo,local:true,runner:async()=>{writeFileSync(join(repo,'frontend/src/App.tsx'),'concurrent source');return {code:0};}});
  assert.equal(unstable.status,'blocked');assert.equal(unstable.stable,false);
 }finally{rmSync(repo,{recursive:true,force:true});}
});

test('new descendant does not inherit the parent interface selection, metadata or frontend',async()=>{
 const {generationOptions}=await import('./generation-fixture.mjs');
 const {pathToFileURL}=await import('node:url');const repo=fixture();const child=mkdtempSync(join(tmpdir(),'interface-child-'));
 try{
  const {createProject:again}=await import(pathToFileURL(join(repo,'tools/InterfaceApp.IA.Toolkit/scripts/lib/project-generator.mjs')));
  again(generationOptions({name:'CleanChild',target:child,presentation:'console'}));
  assert.equal(existsSync(join(child,'references/interface-profile.json')),false);
  assert.equal(existsSync(join(child,'frontend')),false);
  assert.equal(JSON.parse(readFileSync(join(child,'references/technology-decision.json'))).options[0].interface,undefined);
 }finally{rmSync(repo,{recursive:true,force:true});rmSync(child,{recursive:true,force:true});}
});


test('approved UI roots cover Angular inline TS and native MAUI CSharp even with application engineer',async()=>{
 const {startTask,advanceTask}=await import('../scripts/lib/task-loop.mjs');
 const {acceptCandidate,validateCandidate}=await import('../scripts/lib/engineering-loop.mjs');
 for(const [framework,file]of [['angular','app.component.ts'],['maui','MainPage.cs']]){
  const decision=interfaceDecision(framework);const selection=decision.options[0].interface;
  selection.version=framework==='maui'?'8.0.0':'21.0.0';selection.platform=framework==='maui'?'native':'web';selection.rendering=framework==='maui'?'native':'client';selection.source_roots=['src/app'];
  const repo=fixture(decision);
  try{
   approveBusiness(repo);mkdirSync(join(repo,'src/app'),{recursive:true});writeFileSync(join(repo,'src/app',file),'original UI');
   const delegation={schema_version:1,task_id:'inline-ui',objective:'Atualizar interface',business_context:'Contexto registrado',technical_context:framework,scope:['src/app'],out_of_scope:[],assigned_agent:'application-engineer',supporting_agents:[],required_inputs:[],expected_deliverables:['UI'],constraints:[],file_ownership:{read:['src/app'],write:['src/app']},risks:[],acceptance_criteria:['Interface funcional'],validation_commands:[],evidence_required:[],deadline_or_priority:'normal',human_gate:'none'};
   startTask({repo,delegation,phase:'business',provider:'codex'});advanceTask({repo,id:'inline-ui',expectedRevision:1,event:{type:'gate_checked'}});advanceTask({repo,id:'inline-ui',expectedRevision:2,event:{type:'gate_checked'}});
   writeFileSync(join(repo,'src/app',file),'changed inline UI');
   const state=acceptCandidate({repo,id:'inline-ui',expectedRevision:3,profile:'node-tests-v1'});
   assert.ok(state.engineering.required_reviews.includes('ux_accessibility'));
   const validated=await validateCandidate({repo,id:'inline-ui',expectedRevision:state.revision,validator:async()=>({status:'passed',isolation:'unverified',execution_mode:'host_controlled',checks:['inventory','frozen_oracles','host_controls','node-tests-v1'].map(id=>({id,code:0})),environment:{platform:'synthetic',runtime:'test'}})});
   assert.equal(validated.status,'validation_blocked');
  }finally{rmSync(repo,{recursive:true,force:true});}
 }
});

test('product UX brief requires actual direction, journeys, prototype and human reference; changes invalidate it',async()=>{
 const design=await import('../scripts/lib/interface-design.mjs');const repo=fixture();
 try{
  assert.equal(design.initializeDesign({repo}).status,'exists');
  assert.throws(()=>design.inspectDesign(repo),/design|UX/);
  approveBusiness(repo);
  assert.equal(design.inspectDesign(repo).status,'approved');
  const path=join(repo,'references/interface-design.json');const original=readFileSync(path,'utf8');const changed=JSON.parse(original);changed.visual_direction.color=['Nova direção sem novo aceite'];writeFileSync(path,JSON.stringify(changed));assert.throws(()=>design.inspectDesign(repo),/aceite UX/);writeFileSync(path,original);
  writeFileSync(join(repo,'references/ux-prototype.html'),'changed prototype');
  assert.throws(()=>design.inspectDesign(repo),/protótipo|evidência/);
 }finally{rmSync(repo,{recursive:true,force:true});}
});

test('accepted design records selected proposal as product standard and accepts local user references',async()=>{
 const {inspectDesign,designDigest}=await import('../scripts/lib/interface-design.mjs');const repo=fixture();
 try{
  approveBusiness(repo);const path=join(repo,'references/interface-design.json');const design=JSON.parse(readFileSync(path));
  delete design.design_reference;writeFileSync(path,JSON.stringify(design));assert.throws(()=>inspectDesign(repo),/referência|padrão/);
  const prototype=design.prototypes[0];design.design_reference={proposal_id:'user-option-2',origin:'user',revision:'2',prototype_path:prototype.path,usage_rules:['Aplicar hierarquia, tipografia e componentes nas novas telas']};
  design.references=[{origin:'user',path:prototype.path,sha256:prototype.sha256,accessed_at:'2026-11-11',analysis:'Referência própria informada pelo usuário',application:'Padrão visual escolhido para o produto'}];
  writeFileSync(path,JSON.stringify(design));const approvalPath=join(repo,design.approval_reference);const approval=JSON.parse(readFileSync(approvalPath));approval.design_sha256=designDigest(design);writeFileSync(approvalPath,JSON.stringify(approval));
  const checked=inspectDesign(repo);assert.equal(checked.design_reference.origin,'user');assert.equal(checked.design_reference.proposal_id,'user-option-2');
  design.design_reference.usage_rules=['Novo padrão não aprovado'];writeFileSync(path,JSON.stringify(design));assert.throws(()=>inspectDesign(repo),/aceite UX/);
 }finally{rmSync(repo,{recursive:true,force:true});}
});
