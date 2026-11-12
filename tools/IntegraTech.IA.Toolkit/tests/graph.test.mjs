import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, symlinkSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
const graphUrl = new URL('../scripts/lib/traceability-graph.mjs', import.meta.url);
function fixture() {
  const repo = mkdtempSync(join(tmpdir(), 'trace-graph-'));
  const save = (path, data) => { mkdirSync(dirname(join(repo,path)), {recursive:true}); writeFileSync(join(repo,path), typeof data === 'string' ? data : JSON.stringify(data)); };
  save('references/context.json', { scope: ['Catálogo'], 'a/b': { '~value': true } });
  save('src/app.cs', 'public class App {}');
  save('tests/catalog.test.mjs', 'export const testCase = "catalog";');
  save('qa-artifacts/result.json', { status: 'passed' });
  save('references/approval.md', 'Aceite registrado pelo responsável.');
  const source = path => ({path, pointer:''});
  const graph = {schema_version:1, nodes:[
    {id:'CTX',kind:'context',source:{path:'references/context.json',pointer:'/scope/0'}},
    {id:'REQ',kind:'requirement',source:{path:'references/context.json',pointer:'/scope/0'}},
    {id:'DEC',kind:'decision',source:{path:'references/context.json',pointer:'/a~1b/~0value'}},
    {id:'APP',kind:'component',source:source('src/app.cs')},
    {id:'TASK',kind:'task',source:source('src/app.cs')},
    {id:'TEST',kind:'test',source:source('tests/catalog.test.mjs')},
    {id:'EVIDENCE',kind:'evidence',source:source('qa-artifacts/result.json')},
    {id:'APPROVAL',kind:'approval',source:source('references/approval.md')}
  ], edges:[
    {from:'CTX',to:'REQ',relation:'informs'}, {from:'REQ',to:'DEC',relation:'informs'},
    {from:'DEC',to:'APP',relation:'implemented_by'}, {from:'APP',to:'TASK',relation:'implemented_by'},
    {from:'REQ',to:'TEST',relation:'verified_by'}, {from:'TASK',to:'TEST',relation:'verified_by'},
    {from:'TEST',to:'EVIDENCE',relation:'evidenced_by'}, {from:'DEC',to:'APPROVAL',relation:'approved_by'}
  ]};
  const persist = () => save('references/traceability-graph.json',graph); persist();
  return {repo,graph,save,persist};
}
test('grafo: valida referências reais, JSON Pointer e hash sem copiar conteúdo', async () => {
  const {validateGraph}=await import(graphUrl); const f=fixture();
  f.graph.nodes[0].source.sha256=createHash('sha256').update(readFileSync(join(f.repo,'references/context.json'))).digest('hex'); f.persist();
  const result=validateGraph({repo:f.repo});
  assert.equal(result.status,'valid'); assert.deepEqual(result.errors,[]); assert.deepEqual(result.warnings,[]);
  assert.equal(result.node_count,8); assert.ok(!JSON.stringify(result).includes('Catálogo'));
  f.save('references/context.json',{scope:['Mudança'], 'a/b':{'~value':true}});
  assert.equal(validateGraph({repo:f.repo}).errors[0].code,'source_hash_mismatch');
});
test('grafo: impacto transitivo preserva direção, termina ciclos e sinaliza aceites',async()=>{
  const {graphImpact}=await import(graphUrl); const f=fixture();
  f.graph.edges.push({from:'TEST',to:'REQ',relation:'informs'}); f.persist();
  const result=graphImpact({repo:f.repo,id:'REQ'});
  assert.equal(result.status,'valid');
  assert.deepEqual(result.affected.map(n=>[n.id,n.distance]),[['DEC',1],['TEST',1],['APP',2],['APPROVAL',2],['EVIDENCE',2],['TASK',3]]);
  assert.deepEqual(result.review_required,['APPROVAL']);
  assert.ok(!result.affected.some(n=>n.id==='CTX'||n.id==='REQ'));
  assert.deepEqual(graphImpact({repo:f.repo,id:'EVIDENCE'}).affected,[]);
  assert.equal(graphImpact({repo:f.repo,id:'MISSING'}).errors[0].code,'unknown_node');
});
test('grafo: reporta lacunas e distingue grafo vazio de validação efetiva',async()=>{
  const {validateGraph}=await import(graphUrl); const f=fixture();
  f.graph.edges=[]; f.persist(); const result=validateGraph({repo:f.repo});
  assert.equal(result.status,'valid');
  assert.ok(result.warnings.some(w=>w.code==='requirement_without_test'&&w.node==='REQ'));
  assert.ok(result.warnings.some(w=>w.code==='decision_without_justification'&&w.node==='DEC'));
  f.save('references/traceability-graph.json',{schema_version:1,nodes:[],edges:[]});
  assert.equal(validateGraph({repo:f.repo}).status,'empty');
});
test('grafo: rejeita ids, pontas, duplicações, pointers e fontes inválidos',async()=>{
  const {validateGraph}=await import(graphUrl);
  for (const mutate of [
    f=>f.graph.nodes.push(structuredClone(f.graph.nodes[0])),
    f=>f.graph.edges[0].to='ABSENT',
    f=>f.graph.edges.push(structuredClone(f.graph.edges[0])),
    f=>f.graph.edges[0].to='CTX',
    f=>f.graph.nodes[0].source.pointer='/scope/99',
    f=>f.graph.nodes[0].source.pointer='/scope/00',
    f=>f.graph.nodes[0].source.pointer='/__proto__',
    f=>f.graph.nodes[0].source.pointer='/a~2b',
    f=>f.graph.nodes[0].source.path='references/missing.json',
    f=>f.graph.nodes[0].source.sha256='not-a-hash',
    f=>f.graph.nodes[0].kind='unknown',
    f=>f.graph.nodes[0].id='unsafe id'
  ]) { const f=fixture();mutate(f);f.persist();assert.equal(validateGraph({repo:f.repo}).status,'blocked'); }
});
test('grafo: caminhos, links, segredos e limites não expõem conteúdo nem permitem impacto',async()=>{
  const {validateGraph,graphImpact}=await import(graphUrl);
  for(const path of ['../escape.json','/tmp/escape.json','references/../context.json','.env','.git/config','secrets/config.json','references\\context.json']) {
    const f=fixture();f.graph.nodes[0].source.path=path; f.persist();assert.equal(validateGraph({repo:f.repo}).status,'blocked');
    assert.equal(graphImpact({repo:f.repo,id:'REQ'}).status,'blocked');
  }
  const f=fixture(),outside=mkdtempSync(join(tmpdir(),'trace-outside-'));
  writeFileSync(join(outside,'data.json'),'{}'); symlinkSync(outside,join(f.repo,'linked'),'junction');
  f.graph.nodes[0].source.path='linked/data.json';f.persist(); assert.equal(validateGraph({repo:f.repo}).status,'blocked');
  f.graph.nodes[0].source.path='references/context.json'; f.save('references/context.json','api_key = private-value-do-not-print'); f.persist();
  const serialized=JSON.stringify(validateGraph({repo:f.repo}));assert.ok(serialized.includes('blocked'));assert.ok(!serialized.includes('private-value-do-not-print'));
  f.save('references/traceability-graph.json','{invalid-private-document');assert.equal(validateGraph({repo:f.repo}).status,'blocked');
  f.save('references/traceability-graph.json',' '.repeat(262145));assert.equal(validateGraph({repo:f.repo}).status,'blocked');
});
test('grafo: CLI aceita subcomandos e rejeita vazio/inválido',async()=>{
  const f=fixture();const {main}=await import('../scripts/toolkit.mjs');
  const run=async args=>{try{const result=await main([...args,'--repo',f.repo]);return {code:['blocked','failed','needs_input','empty','needs_review','needs_clarification','preparing'].includes(result?.status)?2:0,result};}catch{return {code:2,result:null};}};
  assert.equal((await run(['graph','validate'])).code,0);
  const impact=await run(['graph','impact','--id','REQ']);assert.equal(impact.code,0);assert.deepEqual(impact.result.review_required,['APPROVAL']);
  assert.equal((await run(['graph','impact','--id','missing'])).code,2);
  f.save('references/traceability-graph.json',{schema_version:1,nodes:[],edges:[]});assert.equal((await run(['graph','validate'])).code,2);
  assert.equal((await run(['graph','erase'])).code,2);
});
test('grafo: geração e regeneração distribuem comandos sem herdar relações',async()=>{
  const {createProject}=await import('./generation-fixture.mjs');
  const target=mkdtempSync(join(tmpdir(),'trace-generated-'));
  createProject({name:'ProjetoGrafo',target,provider:'all',presentation:'api'});
  const path=join(target,'references/traceability-graph.json');
  assert.ok(JSON.parse(readFileSync(path,'utf8')).nodes.some(n=>n.kind==='requirement'));
  writeFileSync(path,JSON.stringify({schema_version:1,nodes:[{id:'PRIVATE'}],edges:[]}));
  const {createProject:generateAgain}=await import(pathToFileURL(join(target,'tools/ProjetoGrafo.IA.Toolkit/tests/generation-fixture.mjs')));
  const child=mkdtempSync(join(tmpdir(),'trace-descendant-'));generateAgain({name:'OutroGrafo',target:child,provider:'cursor',presentation:'console'});
  const nextGraph=JSON.parse(readFileSync(join(child,'references/traceability-graph.json'),'utf8'));
  assert.ok(nextGraph.nodes.some(n=>n.kind==='context'));
  assert.ok(!nextGraph.nodes.some(n=>n.id==='PRIVATE'));
  assert.equal(nextGraph.nodes.find(n=>n.kind==='context').source.sha256,createHash('sha256').update(readFileSync(join(child,'references/business-context.json'))).digest('hex'));
  assert.ok(existsSync(join(child,'tools/OutroGrafo.IA.Toolkit/scripts/lib/traceability-graph.mjs')));
});
