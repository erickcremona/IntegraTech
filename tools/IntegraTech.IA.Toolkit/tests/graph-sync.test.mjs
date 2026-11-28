import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync,mkdtempSync,readFileSync,writeFileSync,existsSync,symlinkSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {tmpdir} from 'node:os';
import {symlinkTest} from './host-capability-fixture.mjs';
import {createHash} from 'node:crypto';
import {fullContext} from './domain-fixture.mjs';
import {decisionFor} from './technology-fixture.mjs';
const moduleUrl=new URL('../scripts/lib/traceability-sync.mjs',import.meta.url);
const digest=v=>createHash('sha256').update(v).digest('hex');
function fixture(){
 const repo=mkdtempSync(join(tmpdir(),'graph-sync-'));
 const save=(path,data)=>{mkdirSync(dirname(join(repo,path)),{recursive:true});writeFileSync(join(repo,path),typeof data==='string'?data:JSON.stringify(data));};
 const read=path=>JSON.parse(readFileSync(join(repo,path),'utf8'));
 const context=structuredClone(fullContext);context.scope=['Registrar pedidos','Consultar pedidos'];
 const state={context_path:'references/business-context.json',technology_decision_path:'references/technology-decision.json',plan_path:'references/business-plan.json',approval_path:'references/approval.json'};
 save('references/business-context.json',context); save('references/project-state.json',state);
 save('references/aceite-tecnologia.md','Fixture: responsável aprovou a decisão tecnológica.');
 save('references/technology-decision.json',decisionFor(context));
 const plan={schema_version:1,context_sha256:digest(readFileSync(join(repo,state.context_path))),objective:'Acompanhar pedidos',scope:context.scope,out_of_scope:[],risks:[],phases:[{id:'fase-1',deliverables:['Consulta de pedidos'],acceptance_criteria:['Pedidos disponíveis para consulta'],validation_commands:['npm test']}]};
 save(state.plan_path,plan);save('references/aceite-plano.md','Fixture: responsável aprovou o plano.');
 save(state.approval_path,{schema_version:1,decision:'approved',context_sha256:plan.context_sha256,plan_sha256:digest(readFileSync(join(repo,state.plan_path))),approved_by:'Responsável',approved_at:'2026-11-10T12:00:00Z',source_reference:'references/aceite-plano.md'});
 save('references/traceability-graph.json',{schema_version:1,nodes:[],edges:[]});
 return {repo,save,read,context,state,plan,graph:()=>read('references/traceability-graph.json')};
}
test('sync: dry-run não escreve; contexto/decisão/plano/aceites são extraídos sem inventar testes',async()=>{
 const {syncGraph}=await import(moduleUrl);const f=fixture();const before=readFileSync(join(f.repo,'references/traceability-graph.json'));
 const planned=syncGraph({repo:f.repo,dryRun:true});assert.equal(planned.status,'planned');assert.ok(planned.changes.add_nodes.length>=7);
 assert.deepEqual(readFileSync(join(f.repo,'references/traceability-graph.json')),before);assert.equal(existsSync(join(f.repo,'references/traceability-graph.json.lock')),false);
 assert.equal(syncGraph({repo:f.repo}).status,'synced');const g=f.graph();
 assert.ok(g.nodes.some(n=>n.kind==='requirement'&&n.source.pointer==='/scope/0'));
 assert.ok(g.nodes.some(n=>n.kind==='task'&&n.source.pointer==='/phases/0'));
 assert.equal(g.nodes.some(n=>n.kind==='test'),false);
 assert.ok(g.nodes.some(n=>n.kind==='approval'));assert.ok(g.sync.nodes.length>0);
 assert.ok(planned.suggestions.some(s=>s.code==='requirement_mapping_needed'));
 assert.equal(syncGraph({repo:f.repo}).status,'unchanged');
});
test('sync: vínculos manuais são preservados e edição de nó gerenciado bloqueia',async()=>{
 const {syncGraph}=await import(moduleUrl);const f=fixture();syncGraph({repo:f.repo});
 let g=f.graph();f.save('references/manual.md','Uma referência manual.');g.nodes.push({id:'MANUAL',kind:'component',source:{path:'references/manual.md',pointer:''}});g.edges.push({from:g.nodes[0].id,to:'MANUAL',relation:'informs'});f.save('references/traceability-graph.json',g);
 assert.equal(syncGraph({repo:f.repo}).status,'unchanged');assert.ok(f.graph().nodes.some(n=>n.id==='MANUAL'));
 g=f.graph();const managed=g.nodes.find(n=>g.sync.nodes.some(item=>item.id===n.id));managed.kind='evidence';f.save('references/traceability-graph.json',g);
 assert.equal(syncGraph({repo:f.repo,acceptChanges:true}).status,'blocked');assert.equal(f.graph().nodes.find(n=>n.id===managed.id).kind,'evidence');
});
test('sync: hashes e mudanças exigem reconhecimento; aprovações não são alteradas',async()=>{
 const {syncGraph}=await import(moduleUrl);const f=fixture();syncGraph({repo:f.repo});
 const approval=readFileSync(join(f.repo,f.state.approval_path)); const before=readFileSync(join(f.repo,'references/traceability-graph.json'));
 f.save('references/aceite-tecnologia.md','Fixture: registro revisado pelo responsável, conteúdo mudou.');
 const pending=syncGraph({repo:f.repo});assert.equal(pending.status,'needs_review');assert.ok(pending.changed_sources.includes('references/aceite-tecnologia.md'));
 assert.deepEqual(readFileSync(join(f.repo,'references/traceability-graph.json')),before);
 assert.equal(syncGraph({repo:f.repo,acceptChanges:true}).status,'synced');assert.deepEqual(readFileSync(join(f.repo,f.state.approval_path)),approval);
});
test('sync: reordenação mantém IDs; documento divergente não pode ser aprovado pelo grafo',async()=>{
 const {syncGraph}=await import(moduleUrl);const f=fixture();syncGraph({repo:f.repo});
 const old=f.graph().nodes.find(n=>n.source.path===f.state.context_path&&n.source.pointer==='/scope/0').id;
 f.context.scope.reverse();f.save(f.state.context_path,f.context);
 const blocked=syncGraph({repo:f.repo,acceptChanges:true});
 assert.equal(blocked.status,'blocked'); // Plano/decisão ainda vinculam o contexto anterior.
 assert.ok(blocked.review_required.length>0);assert.ok(blocked.changed_sources.includes(f.state.context_path));
 f.state.technology_decision_path=null;f.state.plan_path=null;f.state.approval_path=null;f.save('references/project-state.json',f.state);
 // Explicit null means no linked document: do not silently fall back to the unlinked files.
 const pending=syncGraph({repo:f.repo});assert.equal(pending.status,'needs_review');assert.ok(pending.review_required.length>0);
 assert.equal(syncGraph({repo:f.repo,acceptChanges:true}).status,'synced');
 assert.equal(f.graph().nodes.find(n=>n.source.path===f.state.context_path&&n.source.pointer==='/scope/1').id,old);
});
test('sync: não elimina nó gerenciado referenciado manualmente',async()=>{
 const {syncGraph}=await import(moduleUrl);const f=fixture();f.state.technology_decision_path=null;f.state.plan_path=null;f.state.approval_path=null;f.save('references/project-state.json',f.state);syncGraph({repo:f.repo});
 const g=f.graph(),req=g.nodes.find(n=>n.source.pointer==='/scope/0');f.save('references/manual.md','Manual');g.nodes.push({id:'M',kind:'component',source:{path:'references/manual.md',pointer:''}});g.edges.push({from:req.id,to:'M',relation:'implemented_by'});f.save('references/traceability-graph.json',g);
 f.context.scope.shift();f.save(f.state.context_path,f.context);
 assert.equal(syncGraph({repo:f.repo,acceptChanges:true}).status,'blocked');assert.ok(f.graph().nodes.some(n=>n.id===req.id));
});
test('sync: caminhos/locks e fonte malformada falham sem sobrescrever',async()=>{
 const {syncGraph}=await import(moduleUrl);
 for(const scenario of ['escape','lock','json']){
 const f=fixture(),before=readFileSync(join(f.repo,'references/traceability-graph.json'));
 if(scenario==='escape'){f.state.context_path='../escape.json';f.save('references/project-state.json',f.state);}
 if(scenario==='lock')f.save('references/traceability-graph.json.lock','existing lock');
 if(scenario==='json')f.save(f.state.context_path,'{private-invalid');
 assert.equal(syncGraph({repo:f.repo}).status,'blocked');assert.deepEqual(readFileSync(join(f.repo,'references/traceability-graph.json')),before);
 }
});
symlinkTest(test,'sync: rejeita fonte atravessada por junction',async()=>{
 const {syncGraph}=await import(moduleUrl);const f=fixture();const before=readFileSync(join(f.repo,'references/traceability-graph.json'));
 symlinkSync(join(f.repo,'references'),join(f.repo,'linked'),'junction');f.state.context_path='linked/business-context.json';f.save('references/project-state.json',f.state);
 assert.equal(syncGraph({repo:f.repo}).status,'blocked');assert.deepEqual(readFileSync(join(f.repo,'references/traceability-graph.json')),before);
});
test('sync: CLI e rota do agente são reais e retomada mantém os gates',async()=>{
 const f=fixture();const {main}=await import('../scripts/toolkit.mjs');
 const run=async args=>({code:0,result:await main([...args,'--repo',f.repo])});
 assert.equal((await run(['graph','sync','--dry-run'])).result.status,'planned');assert.equal((await run(['graph','sync'])).result.status,'synced');
 f.save('references/project-state.json',{...f.state,scope_status:'pending',plan_gate:'pending'});
 const ready=await run(['precheck','--phase','discovery']);assert.equal(ready.result.status,'ready');assert.ok(ready.result.traceability);
 assert.equal((await main(['route','--category','traceability'])).name,'traceability-maintainer');
});
test('sync: mapeamento manual confirmado não reaparece como sugestão pendente',async()=>{
 const {syncGraph}=await import(moduleUrl);const f=fixture();syncGraph({repo:f.repo});
 const g=f.graph(),req=g.nodes.find(n=>n.source.pointer==='/scope/0'),task=g.nodes.find(n=>n.kind==='task');
 g.edges.push({from:req.id,to:task.id,relation:'implemented_by'});f.save('references/traceability-graph.json',g);
 const result=syncGraph({repo:f.repo,dryRun:true});assert.ok(!result.suggestions.some(s=>s.node===req.id&&s.code==='requirement_mapping_needed'));
});
test('sync: modelo vazio permanece vazio e agente não recebe escrita de negócio',async()=>{
 const {syncGraph}=await import(moduleUrl);const f=fixture();f.save(f.state.context_path,{problem:'',scope:[]});
 assert.equal(syncGraph({repo:f.repo}).status,'empty');assert.deepEqual(f.graph(),{schema_version:1,nodes:[],edges:[]});
 const {checkPolicy}=await import('../scripts/lib/policy.mjs');
 assert.equal(checkPolicy({repo:f.repo,action:'implement',agent:'traceability-maintainer',phase:'business'}).status,'blocked');
 assert.equal(checkPolicy({repo:f.repo,action:'maintain_traceability',agent:'traceability-maintainer',phase:'discovery'}).status,'allowed');
});
test('sync: graph validate também detecta metadata de ownership adulterada',async()=>{
 const {syncGraph}=await import(moduleUrl);const {validateGraph}=await import('../scripts/lib/traceability-graph.mjs');const f=fixture();syncGraph({repo:f.repo});
 const g=f.graph();g.sync.nodes[0].sha256='0'.repeat(64);f.save('references/traceability-graph.json',g);
 assert.equal(validateGraph({repo:f.repo}).status,'blocked');
});
