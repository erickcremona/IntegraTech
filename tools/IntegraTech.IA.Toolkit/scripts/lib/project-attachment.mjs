import {existsSync,lstatSync,realpathSync,readFileSync,readdirSync,mkdirSync,writeFileSync,renameSync,rmSync,mkdtempSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {randomBytes,createHash} from 'node:crypto';
import {assertNoLinks,contained,assertSanitized} from './paths.mjs';
import {linkedProject,localDocument,overlaps,ignoredSourcePath,interfaceSourcePath} from './project-locations.mjs';
import {normalizeInitialContext} from './business-context.mjs';
import {selectedProviders} from './provider-selection.mjs';
const idCheck=id=>{if(typeof id!=='string'||!/^[a-z0-9][a-z0-9-]{0,59}$/.test(id))throw new Error('ID obrigatório: letras minúsculas, números e hífen');return id;};
const directory=(repo,id)=>contained(resolve(repo),`.integratech/projects/${idCheck(id)}`);
export function diagnoseSource(source){
 const manifests=[],interface_candidates=[],technologies=new Set();let count=0;
 function walk(dir,prefix=''){
  for(const item of readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
   if(++count>10000)throw new Error('diagnóstico acima do limite de 10000 entradas; restrinja o escopo');
   const path=prefix+item.name;if(ignoredSourcePath(path)||['bin','obj'].includes(item.name))continue;
   if(item.isSymbolicLink())continue;
   if(item.isDirectory())walk(join(dir,item.name),path+'/');
   else if(item.isFile()){
    const name=item.name;let technology;
    if(interfaceSourcePath(path))interface_candidates.push(path);
    if(name==='package.json')technology='node';else if(/\.(?:csproj|sln)$/.test(name))technology='dotnet';else if(/^(?:pyproject\.toml|requirements.*\.txt|setup\.py)$/.test(name))technology='python';else if(name==='pom.xml'||/build\.gradle(?:\.kts)?$/.test(name))technology='java';else if(name==='go.mod')technology='go';else if(name==='Cargo.toml')technology='rust';else if(name==='composer.json')technology='php';
    if(technology){technologies.add(technology);manifests.push(path);}
   }
  }
 }
 walk(source);
 return {schema_version:1,scope:'manifest_names_only',manifests,interface_candidates,interface_status:'unclassified',technologies:[...technologies].sort().map(id=>({id})),validation_profiles:[],validation_status:'not_executed',next_step:'Analisar manifests, instruções do fonte, arquitetura e testes; confirmar contexto e perfil compatível antes de implementar. Detecção não certifica suporte.'};
}
export function attachedProject({repo,id}){const root=directory(repo,id);const link=linkedProject(root);if(!link||link.id!==id)throw new Error('projeto anexado ausente ou divergente');return {id,repo:root,source:link.source_root,binding_sha256:link.binding_sha256};}
export function listAttachedProjects({repo}){const root=contained(resolve(repo),'.integratech/projects');if(!existsSync(root))return {status:'ready',projects:[]};return {status:'ready',projects:readdirSync(root).filter(id=>/^[a-z0-9][a-z0-9-]{0,59}$/.test(id)).sort().map(id=>{try{const item=attachedProject({repo,id});return {id,status:'attached',name:localDocument(item.repo,'project.json').display_name??localDocument(item.repo,'project.json').name};}catch{return {id,status:'blocked'};}})};}
export function attachProject({repo,id,source,name,context,provider='both',dryRun=false}){
 repo=resolve(repo);assertNoLinks(repo);idCheck(id);
 if(!source)return {status:'needs_input',questions:['Qual é o local/caminho acessível do sistema existente?']};
 assertNoLinks(resolve(source));source=realpathSync(resolve(source));
 if(!lstatSync(source).isDirectory()||overlaps(repo,source)||overlaps(source,repo))throw new Error('fonte e toolkit devem estar em pastas separadas sem sobreposição');
 const registry=contained(repo,'.integratech/projects');
 if(existsSync(registry))for(const other of readdirSync(registry)){if(other===id||!/^[-a-z0-9]+$/.test(other))continue;const path=directory(repo,other);const saved=localDocument(path,'project-link.json');if(overlaps(saved.source_root,source)||overlaps(source,saved.source_root))throw new Error('fonte já vinculado a outro ID');}
 const target=directory(repo,id);
 if(existsSync(target)){const current=attachedProject({repo,id});if(current.source!==source)throw new Error('ID já vinculado a outro fonte');return {status:'unchanged',id,control_root:target};}
 selectedProviders(provider);
 name=name??id;if(typeof name!=='string'||!name.trim()||name.length>120||/[\r\n\x00]/.test(name))throw new Error('nome inválido');assertSanitized(name);
 const initial=context===undefined?{schema_version:1,problem:'',current_situation:'',stakeholders:[],desired_outcomes:[],success_criteria:[],scope:[],out_of_scope:[],known_rules:[],data:[],constraints:[],integrations:[],open_questions:[],assumptions:[]}:normalizeInitialContext(context);
 const diagnostic=diagnoseSource(source);
 if(dryRun)return {status:'planned',id,control_root:target,diagnostic};
 const link={schema_version:1,mode:'attached',id,source_root:source,binding_id:randomBytes(16).toString('hex')};
 const text=JSON.stringify(link,null,2)+'\n';
 const state={project_mode:'attached',source_binding_sha256:createHash('sha256').update(text).digest('hex'),execution_workflow:'sdd-v2',scope_status:'pending',plan_gate:'pending',context_path:'references/business-context.json',plan_path:null,approval_path:null,specialist_path:null};
 const technicalName=/^[A-Z][a-zA-Z0-9]{0,49}$/.test(name)?name:('Linked'+id.split('-').filter(Boolean).map(part=>part[0].toUpperCase()+part.slice(1)).join('')).slice(0,50);
 const identity={schema_version:1,id,name:technicalName,display_name:name,provider,is_model:false,mode:'attached',presentation:'existing'};
 const intro=`# ${name} — sistema existente\n\nGestão assistida pelo IntegraTech; a autoria do sistema permanece com seus responsáveis originais. Leia a governança e as skills na instalação do toolkit, usando --project ${id} em cada operação. Leia também AGENTS.md, CLAUDE.md e regras Cursor existentes no fonte e em suas subpastas, respeitando as permissões nativas.\n\nO fonte permanece no caminho local registrado em project-link.json; a gestão fica nesta pasta. Não copiar, renomear ou adotar o fonte como modelo. Leia o diagnóstico e as instruções existentes do fonte. Continue o contexto registrado e use SDD incremental; vincular não aprova implementação.\n`;
 const files=new Map([['project-link.json',text],['project.json',JSON.stringify(identity,null,2)+'\n'],['references/project-state.json',JSON.stringify(state,null,2)+'\n'],['references/business-context.json',JSON.stringify(initial,null,2)+'\n'],['references/source-diagnostic.json',JSON.stringify(diagnostic,null,2)+'\n'],['references/traceability-graph.json',JSON.stringify({schema_version:1,nodes:[],edges:[]},null,2)+'\n'],['project.code-workspace',JSON.stringify({folders:[{name:'Gestão',path:'.'},{name:'Fonte',path:source},{name:'Toolkit',path:repo}]},null,2)+'\n'],['README.md',intro],['SOLUTION_CONTEXT.md',intro],['references/README.md',intro]]);
 for(const p of selectedProviders(provider)){if(p==='codex')files.set('AGENTS.md',intro);if(p==='claude')files.set('CLAUDE.md',intro);if(p==='cursor')files.set('.cursor/rules/project.mdc','---\nalwaysApply: true\n---\n'+intro);}
 const parent=dirname(target);mkdirSync(parent,{recursive:true});assertNoLinks(parent);
 const staging=mkdtempSync(join(parent,'.attaching-'));
 try{for(const [path,data]of files){const full=contained(staging,path);mkdirSync(dirname(full),{recursive:true});writeFileSync(full,data,{flag:'wx'});}renameSync(staging,target);}finally{rmSync(staging,{recursive:true,force:true});}
 return {status:'attached',id,control_root:target,diagnostic,next_step:'Ler README da gestão e as instruções do fonte, completar contexto e pesquisa antes do desenho. Usar --project '+id+' em toda operação.'};
}
