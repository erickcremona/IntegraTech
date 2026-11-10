import {readFileSync,existsSync,mkdirSync,writeFileSync,unlinkSync} from 'node:fs';
import {dirname} from 'node:path';
import {validateContract} from './contracts.mjs';
import {atomicFileWrite} from './adoption-recovery.mjs';
import {graphPath,readGraphSource,decodeGraphSource,validateGraphData} from './traceability-graph.mjs';
import {deriveTraceability,traceDigest,traceEdgeKey} from './traceability-sources.mjs';
const defaultFile='references/traceability-graph.json';
const empty=()=>({schema_version:1,nodes:[],edges:[]});
const fingerprint=node=>traceDigest(JSON.stringify(node));
const blocked=code=>({status:'blocked',errors:[{code}]});
const fail=code=>{throw Object.assign(new Error(code),{graphCode:code});};
function reviews(graph,changed){
 const seen=new Set(changed),queue=[...changed],approvals=new Set();
 for(let i=0;i<queue.length;i++){
  if(graph.nodes.find(n=>n.id===queue[i])?.kind==='approval')approvals.add(queue[i]);
  for(const e of graph.edges)if(e.from===queue[i]&&!seen.has(e.to)){seen.add(e.to);queue.push(e.to);}
 }
 return [...approvals].sort();
}
// Diagnostic reachability is computed from the previously recorded topology. It does
// not validate stale content or approve a proposed update.
function staleDiagnostics(graph,read,repo){
 try{
  validateContract('traceability-graph',graph);
  if(graph.nodes.some(n=>!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,79}$/.test(n.id)))return {};
  const changed=[],paths=new Set();
  for(const item of graph.sync?.nodes??[]){
   const n=graph.nodes.find(node=>node.id===item.id);
   if(!n||fingerprint(n)!==item.sha256)return {};
   graphPath(repo,n.source.path);
   let current=null;try{current=read(n.source.path).digest;}catch{ /* Missing/unreadable is a stale reference too. */ }
   if(current!==n.source.sha256){changed.push(n.id);paths.add(n.source.path);}
  }
  return {changed_sources:[...paths].sort(),review_required:reviews(graph,changed)};
 }catch{return {};}
}
function reconcile(graph,derived,read){
 validateContract('traceability-graph',graph);
 const current=new Map(graph.nodes.map(n=>[n.id,n])),edgeMap=new Map(graph.edges.map(e=>[traceEdgeKey(e),e]));
 if(current.size!==graph.nodes.length||edgeMap.size!==graph.edges.length||graph.edges.some(e=>e.from===e.to||!current.has(e.from)||!current.has(e.to)))fail('graph_structure_invalid');
 const owned=new Map(),ownedEdges=new Set(graph.sync?.edges??[]);
 for(const item of graph.sync?.nodes??[]){
  if(owned.has(item.id)||!/^[a-f0-9]{64}$/.test(item.sha256)||!current.has(item.id)||fingerprint(current.get(item.id))!==item.sha256)fail('managed_node_modified');
  owned.set(item.id,item.sha256);
 }
 if(ownedEdges.size!==(graph.sync?.edges.length??0)||[...ownedEdges].some(key=>!edgeMap.has(key)))fail('managed_edge_modified');
 const desired=new Map(derived.nodes.map(n=>[n.id,n]));
 const add_nodes=[],update_nodes=[],remove_nodes=[];
 for(const n of derived.nodes){
  if(!current.has(n.id))add_nodes.push(n.id);
  else if(!owned.has(n.id))fail('manual_node_collision');
  else if(fingerprint(n)!==owned.get(n.id))update_nodes.push(n.id);
 }
 for(const id of owned.keys())if(!desired.has(id))remove_nodes.push(id);
 const manualNodes=graph.nodes.filter(n=>!owned.has(n.id)),manualEdges=graph.edges.filter(e=>!ownedEdges.has(traceEdgeKey(e)));
 if(manualEdges.some(e=>remove_nodes.includes(e.from)||remove_nodes.includes(e.to)))fail('manual_edge_depends_on_removed_node');
 const mergedEdges=new Map(manualEdges.map(e=>[traceEdgeKey(e),e]));
 const managedEdges=[];
 for(const e of derived.edges){const key=traceEdgeKey(e);if(!mergedEdges.has(key)){mergedEdges.set(key,e);managedEdges.push(key);}}
 const add_edges=managedEdges.filter(k=>!ownedEdges.has(k)),remove_edges=[...ownedEdges].filter(k=>!managedEdges.includes(k));
 const candidate={schema_version:1,nodes:[...manualNodes,...derived.nodes],edges:[...mergedEdges.values()],sync:{version:1,nodes:derived.nodes.map(n=>({id:n.id,sha256:fingerprint(n)})),edges:managedEdges}};
 if(Buffer.byteLength(JSON.stringify(candidate,null,2)+'\n')>256*1024)fail('graph_too_large');
 const validation=validateGraphData({graph:candidate,readSource:read});
 if(validation.status==='blocked')return {...validation,status:'blocked'};
 const changed=[...update_nodes,...remove_nodes];
 const changed_sources=[...new Set(changed.map(id=>current.get(id).source.path))].sort();
 const changes={add_nodes,update_nodes,remove_nodes,add_edges,remove_edges};
 const changedAny=Object.values(changes).some(items=>items.length);
 const needsReview=update_nodes.length>0||remove_nodes.length>0||remove_edges.length>0;
 const hasMapping=id=>{
  const seen=new Set([id]),queue=[id];
  for(let i=0;i<queue.length;i++)for(const edge of candidate.edges)if(edge.from===queue[i]&&!seen.has(edge.to)){
   const target=candidate.nodes.find(n=>n.id===edge.to);if(['component','task'].includes(target.kind))return true;
   seen.add(edge.to);queue.push(edge.to);
  }return false;
 };
 const suggestions=derived.suggestions.filter(s=>s.code!=='requirement_mapping_needed'||!hasMapping(s.node));
 return {status:needsReview?'needs_review':changedAny?'planned':'unchanged',changes,changed_sources,review_required:reviews(graph,changed),suggestions,warnings:validation.warnings,candidate};
}
export function initialTraceability(files){
 const cache=new Map();let total=0;
 const read=path=>{
  graphPath('/virtual-traceability',path);
  if(!cache.has(path)){
   if(!files.has(path))fail('source_missing');
   const data=decodeGraphSource(Buffer.from(files.get(path),'utf8'));total+=data.size;if(total>8*1024*1024)fail('source_budget_exceeded');cache.set(path,data);
  }return cache.get(path);
 };
 const derived=deriveTraceability(read);if(!derived.nodes.length)return empty();
 const proposal=reconcile(empty(),derived,read);
 if(proposal.status==='blocked')fail('initial_graph_invalid');
 return proposal.candidate;
}
export function syncGraph({repo,file=defaultFile,dryRun=false,acceptChanges=false}){
 let lock,ownsLock=false,previous,reader;
 try{
  const full=graphPath(repo,file);lock=graphPath(repo,`${file}.lock`);
  const inputs=new Map();let bytes=0;
  const read=path=>{
   if(!inputs.has(path)){
    try{const source=readGraphSource(repo,path);bytes+=source.size;if(bytes>8*1024*1024)fail('source_budget_exceeded');inputs.set(path,source);}
    catch(e){if(e.graphCode==='source_missing')inputs.set(path,null);throw e;}
   }
   if(inputs.get(path)===null)fail('source_missing');return inputs.get(path);
  };
  reader=read;
  let graph=empty();try{graph=JSON.parse(read(file).text);}catch(e){if(e.graphCode!=='source_missing')fail('graph_document_invalid');}
  validateContract('traceability-graph',graph);previous=graph;
  const derived=deriveTraceability(read);
  const proposal=reconcile(graph,derived,read);const {candidate,...report}=proposal;
  if(report.status==='blocked')return report;
  if(!derived.nodes.length&&!graph.nodes.length)return {...report,status:'empty'};
  if(report.status==='unchanged')return report;
  if(dryRun)return {...report,requires_review:proposal.status==='needs_review',proposed_graph:candidate};
  if(report.status==='needs_review'&&!acceptChanges)return report;
  mkdirSync(dirname(full),{recursive:true});try{writeFileSync(lock,JSON.stringify({pid:process.pid}),{flag:'wx'});ownsLock=true;}catch{fail('graph_locked');}
  const output=JSON.stringify(candidate,null,2)+'\n';if(Buffer.byteLength(output)>256*1024)fail('graph_too_large');
  for(const [path,source]of inputs){
   const pathOnDisk=graphPath(repo,path);const now=existsSync(pathOnDisk)?traceDigest(readFileSync(pathOnDisk)):null;
   if(now!==(source?.digest??null))fail('source_changed_during_sync');
  }
  atomicFileWrite(full,output,{exclusive:inputs.get(file)===null});
  return {...report,status:'synced',acknowledged_changes:proposal.status==='needs_review'};
 }catch(e){return {...blocked(e.graphCode??'sync_failed'),...(previous&&reader?staleDiagnostics(previous,reader,repo):{})};}
 finally{if(ownsLock&&existsSync(lock))unlinkSync(lock);}
}
