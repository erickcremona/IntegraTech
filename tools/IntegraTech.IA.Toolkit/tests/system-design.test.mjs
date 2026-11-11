import test from 'node:test';
import assert from 'node:assert/strict';
import {fingerprint} from '../scripts/lib/candidate.mjs';
import {fullContext} from './domain-fixture.mjs';
import {assessSystemDesign,inspectSystemDesign} from '../scripts/lib/system-design.mjs';

const requirement=(kind, evidence)=>({id:'req-1',description:'O produto deve preservar a disponibilidade do serviço.',scenarios:[{id:'scenario-1',given:'Uma solicitação registrada',when:'O serviço acompanha o fluxo',then:'O estado continua rastreável'}],context_refs:[{pointer:'/success_criteria/0',quote:fullContext.success_criteria[0]}],system_design_signals:kind?[{kind,evidence}]:[]});
const contextHash=fingerprint(JSON.stringify(fullContext));
const specification=(req=requirement())=>({schema_version:1,context_sha256:contextHash,requirements:[req]});
const design=(overrides={})=>({applicability:'not_required',decision:'not_applicable',rationale:'O escopo atual não exige desenho de sistema separado.',signals:[],components:[],flows:[],data_boundaries:[],integrations:[],failure_modes:[],quality_attributes:[],security:[],observability:[],ux_touchpoints:[],validation_strategy:[],...overrides});
const inspect=(spec,systemDesign)=>inspectSystemDesign({context:fullContext,specification:spec,technicalDesign:{context_sha256:contextHash,specification_sha256:fingerprint(spec),system_design:systemDesign},contextHash,specificationHash:fingerprint(spec)});

test('system design classifies context-grounded signals and rejects stale context hashes',()=>{
 const spec=specification(requirement('availability_requirement','Toda solicitação tem responsável'));
 assert.equal(assessSystemDesign({context:fullContext,specification:spec,contextHash}).status,'required');
 assert.throws(()=>assessSystemDesign({context:fullContext,specification:spec,contextHash:fingerprint({...fullContext,problem:'Outro produto'})}),/contexto.*especificação/i);
});

test('system design enforces a coherent decision for required, recommended, and unnecessary designs',()=>{
 const requiredSpec=specification(requirement('availability_requirement','Toda solicitação tem responsável'));
 const requiredSignal=[{requirement_id:'req-1',kind:'availability_requirement',evidence:'Toda solicitação tem responsável'}];
 assert.throws(()=>inspect(requiredSpec,design({applicability:'required',decision:'included',signals:requiredSignal})),/components/);
 const recommendedSpec=specification(requirement('complex_async_workflow','Toda solicitação tem responsável'));
 const recommendedSignal=[{requirement_id:'req-1',kind:'complex_async_workflow',evidence:'Toda solicitação tem responsável'}];
 assert.throws(()=>inspect(recommendedSpec,design({applicability:'recommended',decision:'not_applicable',signals:recommendedSignal})),/decisão|adiad|not_applicable/i);
 assert.throws(()=>inspect(recommendedSpec,design({applicability:'recommended',decision:'deferred',signals:recommendedSignal})),/motivo|razão/i);
 assert.equal(inspect(recommendedSpec,design({applicability:'recommended',decision:'deferred',defer_reason:'A equipe validará a necessidade na próxima fase.',signals:recommendedSignal})).approved_with_plan,true);
});
