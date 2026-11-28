import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {generationOptions} from './generation-fixture.mjs';
import {createProject} from '../scripts/lib/project-generator.mjs';
import {architectureDigest,architectureTechnologyHash} from '../scripts/lib/architecture-decision.mjs';
import {fingerprint} from '../scripts/lib/candidate.mjs';
import {architectureStatus,architectureSourceSnapshot,inspectArchitectureGraph} from '../scripts/lib/architecture-inspection.mjs';
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
 const state=JSON.parse(readFileSync(join(target,'references/project-state.json'),'utf8'));
 assert.equal(state.capability_recommendations_sha256,fingerprint(readFileSync(join(target,'references/capability-recommendations.md'))));
 assert.equal(architectureStatus({repo:target}).status,'decision_recorded');
 assert.equal(architectureStatus({repo:target}).validation_status,'not_run');
 const before=architectureSourceSnapshot(target);writeFileSync(join(target,'references/unrelated-note.md'),'Control update');assert.equal(architectureSourceSnapshot(target),before);
 mkdirSync(join(target,'src'));writeFileSync(join(target,'src/evolution.txt'),'Source evolution');assert.notEqual(architectureSourceSnapshot(target),before);
 assert.throws(()=>completeArchitecture({repo:target}),/Nenhuma migração/);
 }
});
test('decisão arquitetural neutra aceita stack aprovada sem layout gerado',t=>{
 const target=temporary(t),args=generationOptions({name:'Product',target,presentation:'api'});
 args.architectureDecision.profile='modular-monolith';
 args.architectureDecision.layout.stack='rust';
 args.technologyDecision.options.find(option=>option.id===args.technologyDecision.selected_option).stack='rust';
 args.architectureDecision.technology_sha256=architectureTechnologyHash(args.technologyDecision);
 args.architectureDecision.requirements.modules=[
  {name:'orders-service',depends_on:[],context_refs:[{pointer:'/scope/0',quote:args.context.scope[0]}]},
  {name:'owner_api',depends_on:['orders-service'],context_refs:[{pointer:'/known_rules/0',quote:args.context.known_rules[0]}]}
 ];
 args.architectureDecision.approval.decision_sha256=architectureDigest(args.architectureDecision);
 createProject(args);
 const current=architectureStatus({repo:target});
 assert.equal(JSON.parse(readFileSync(join(target,'references/architecture-decision.json'),'utf8')).layout.stack,'rust');
 assert.equal(current.status,'decision_recorded');
 assert.equal(current.validation_status,'not_run');
 assert.equal(existsSync(join(target,'src')),false);
});
test('architecture inspection reports decision and leaves product validation not run',t=>{
 const repo=temporary(t),decision={layout:{name:'Product',presentation:'console',stack:'some-contextual-stack'},profile:'simple-application',requirements:{modules:[]}};
 const result=inspectArchitectureGraph(repo,decision);
 assert.equal(result.status,'not_run');
 assert.equal(result.validation_status,'not_run');
 assert.equal(result.source_files,0);
});
test('external legacy architecture assessment preserves source and fingerprints its own documents',async t=>{
 const home=temporary(t),manager=join(home,'manager'),source=join(home,'legacy');mkdirSync(manager);mkdirSync(source);mkdirSync(join(source,'references'));writeFileSync(join(source,'legacy.txt'),'Original system');
 const {attachProject,attachedProject}=await import('../scripts/lib/project-attachment.mjs');attachProject({repo:manager,id:'old',source,name:'Existing'});const {repo}=attachedProject({repo:manager,id:'old'});
 assert.equal(architectureStatus({repo}).status,'assessment_required');const before=architectureSourceSnapshot(repo);writeFileSync(join(source,'references/business-context.json'),'Source-owned document');assert.notEqual(architectureSourceSnapshot(repo),before);assert.equal(readFileSync(join(source,'legacy.txt'),'utf8'),'Original system');assert.equal(existsSync(join(source,'src')),false);
});
