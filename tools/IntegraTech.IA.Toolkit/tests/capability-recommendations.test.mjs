import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {fullContext} from './domain-fixture.mjs';
import {normalizeInitialContext} from '../scripts/lib/business-context.mjs';
import {digest} from '../scripts/lib/domain-specialist.mjs';
import {capabilityRecommendationsStatus} from '../scripts/lib/capability-recommendations.mjs';
import {precheck} from '../scripts/lib/governance.mjs';
import {formatOperationalError} from '../scripts/toolkit.mjs';
import {preparationFor,researchRequest} from './domain-fixture.mjs';
import {refreshCapabilityRecommendations} from '../scripts/lib/capability-report.mjs';

function fixture(t){
 const repo=mkdtempSync(join(tmpdir(),'capability-status-'));t.after(()=>rmSync(repo,{recursive:true,force:true}));mkdirSync(join(repo,'references'));
 const context=normalizeInitialContext(fullContext),contextHash=digest(JSON.stringify(context));
 writeFileSync(join(repo,'project.json'),JSON.stringify({name:'Example',is_model:false}));
 writeFileSync(join(repo,'references/project-state.json'),JSON.stringify({context_path:'references/business-context.json',scope_status:'defined',plan_gate:'pending'}));
 writeFileSync(join(repo,'references/business-context.json'),JSON.stringify(context));
 const report=`# Recomendações\n\nEste relatório está vinculado ao contexto SHA-256 \`${contextHash}\`.\n`;
 writeFileSync(join(repo,'references/capability-recommendations.md'),report);
 const state=JSON.parse(readFileSync(join(repo,'references/project-state.json'),'utf8'));state.capability_recommendations_sha256=digest(report);writeFileSync(join(repo,'references/project-state.json'),JSON.stringify(state));
 return {repo,context,report};
}

test('capability report status verifies current context and report bytes',t=>{
 const f=fixture(t);assert.equal(capabilityRecommendationsStatus({repo:f.repo}).status,'current');assert.equal(capabilityRecommendationsStatus({repo:f.repo}).path,'references/capability-recommendations.md');
 writeFileSync(join(f.repo,'references/capability-recommendations.md'),f.report+'local edit\n');
 assert.equal(capabilityRecommendationsStatus({repo:f.repo}).status,'stale');
});

test('context changes mark capability recommendations stale and block design precheck',t=>{
 const f=fixture(t);const changed={...f.context,problem:`${f.context.problem} Updated`};
 writeFileSync(join(f.repo,'references/business-context.json'),JSON.stringify(changed));
 assert.equal(capabilityRecommendationsStatus({repo:f.repo}).status,'stale');
 const result=precheck(f.repo,'design');assert.equal(result.status,'blocked');assert.match(result.reason,/recomendações.*stale/);
});

test('refresh archives the old report and binds the new verified recommendation to changed context',t=>{
 const f=fixture(t);const changed={...f.context,problem:`${f.context.problem} Updated`};
 writeFileSync(join(f.repo,'references/business-context.json'),JSON.stringify(changed));
 const result=refreshCapabilityRecommendations({repo:f.repo,preparation:preparationFor(changed),request:researchRequest});
 assert.equal(result.status,'refreshed');assert.equal(capabilityRecommendationsStatus({repo:f.repo}).status,'current');
 const archive=join(f.repo,'references/history/capability-recommendations',`${digest(f.report)}.md`);
 assert.equal(existsSync(archive),true);assert.equal(readFileSync(archive,'utf8'),f.report);
});

test('operational CLI errors expose sanitized code and recovery without exception details',()=>{
 const message=formatOperationalError('sdd-plan',Object.assign(new Error('private file contents'),{code:'EPERM'}));
 assert.match(message,/sdd-plan.*EPERM/);assert.match(message,/permissões/);assert.ok(!message.includes('private file contents'));
 assert.match(formatOperationalError('capability-report',Object.assign(new Error('collision'),{code:'EEXIST'})),/EEXIST.*destino já existe/);
 assert.equal(formatOperationalError('sdd-plan',new Error('validation')),null);
});
