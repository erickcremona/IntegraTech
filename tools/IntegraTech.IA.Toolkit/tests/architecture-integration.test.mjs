import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,existsSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {generationOptions} from './generation-fixture.mjs';
import {createProject} from '../scripts/lib/project-generator.mjs';
import {architectureDigest} from '../scripts/lib/architecture-decision.mjs';
import {architectureStatus,architectureSourceSnapshot,inspectArchitectureGraph} from '../scripts/lib/architecture-inspection.mjs';
import {architectureFiles} from '../scripts/lib/architecture-profiles.mjs';
import {completeArchitecture} from '../scripts/lib/architecture-workflow.mjs';
const temporary=t=>{const repo=mkdtempSync(join(tmpdir(),'arch-integration-'));t.after(()=>rmSync(repo,{recursive:true,force:true}));return repo;};
test('materialization records approved simple and modular architecture for future review',t=>{
 for(const profile of ['simple-application','modular-monolith']){
 const target=temporary(t),args=generationOptions({name:'Product',target,presentation:'api',provider:'all'});
 assert.throws(()=>createProject({...args,architectureDecision:undefined}),/arquitetural/);assert.deepEqual(architectureStatus({repo:target}).status,'assessment_required');
 const d=args.architectureDecision;d.profile=profile;
 if(profile==='modular-monolith')d.requirements.modules=[{name:'Requests',depends_on:[],context_refs:[{pointer:'/scope/0',quote:args.context.scope[0]}]},{name:'Owners',depends_on:['Requests'],context_refs:[{pointer:'/known_rules/0',quote:args.context.known_rules[0]}]}];
 d.approval.decision_sha256=architectureDigest(d);
 createProject(args);assert.equal(existsSync(join(target,'src')),false);
 assert.equal(architectureStatus({repo:target}).status,'needs_review');
 const before=architectureSourceSnapshot(target);writeFileSync(join(target,'references/unrelated-note.md'),'Control update');assert.equal(architectureSourceSnapshot(target),before);
 mkdirSync(join(target,'src'));writeFileSync(join(target,'src/evolution.txt'),'Source evolution');assert.notEqual(architectureSourceSnapshot(target),before);
 assert.throws(()=>completeArchitecture({repo:target}),/Nenhuma migração/);
 }
});
test('architectural graph blocks hidden MSBuild references and custom imports',t=>{
 const repo=temporary(t),decision={layout:{name:'Product',presentation:'console',stack:'dotnet'},profile:'simple-application',requirements:{modules:[]}};
 for(const [p,text] of architectureFiles({...decision.layout,profile:decision.profile})){mkdirSync(dirname(join(repo,p)),{recursive:true});writeFileSync(join(repo,p),text);}
 assert.equal(inspectArchitectureGraph(repo,decision).status,'structurally_consistent');
 writeFileSync(join(repo,'Directory.Build.targets'),'<Project><ItemGroup><ProjectReference Include="injected.csproj" /></ItemGroup></Project>');
 assert.throws(()=>inspectArchitectureGraph(repo,decision),/MSBuild/);rmSync(join(repo,'Directory.Build.targets'));
 const p='src/Product.Apresentacao/Product.Apresentacao.Console/Product.Apresentacao.Console.csproj';writeFileSync(join(repo,p),readFileSync(join(repo,p),'utf8').replace('</Project>','<Import Project="hidden.props" /></Project>'));
 assert.throws(()=>inspectArchitectureGraph(repo,decision),/dinâmica/);
});
test('external legacy architecture assessment preserves source and fingerprints its own documents',async t=>{
 const home=temporary(t),manager=join(home,'manager'),source=join(home,'legacy');mkdirSync(manager);mkdirSync(source);mkdirSync(join(source,'references'));writeFileSync(join(source,'legacy.txt'),'Original system');
 const {attachProject,attachedProject}=await import('../scripts/lib/project-attachment.mjs');attachProject({repo:manager,id:'old',source,name:'Existing'});const {repo}=attachedProject({repo:manager,id:'old'});
 assert.equal(architectureStatus({repo}).status,'assessment_required');const before=architectureSourceSnapshot(repo);writeFileSync(join(source,'references/business-context.json'),'Source-owned document');assert.notEqual(architectureSourceSnapshot(repo),before);assert.equal(readFileSync(join(source,'legacy.txt'),'utf8'),'Original system');assert.equal(existsSync(join(source,'src')),false);
});
