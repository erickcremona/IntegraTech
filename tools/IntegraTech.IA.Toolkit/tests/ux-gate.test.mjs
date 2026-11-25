import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateUxGate} from '../scripts/lib/ux-gate.mjs';

const criteria=['task_clarity','visual_hierarchy','visual_identity','interaction_states','responsive_behavior','accessibility','performance'];
function report(verdict='approved',findings=[]){return {schema_version:1,task_id:'ux',review_type:'ux_accessibility',verdict,findings,residual_risk:'',...(verdict==='approved'||verdict==='approved_with_findings'?{ux_assessment:criteria.map(criterion=>({criterion,score:4,evidence:['Candidato, fluxo e render observados']}))}:{})};}
function finding(severity='medium',id='UX-001'){return {finding_id:id,severity,title:'Fluxo sem feedback',evidence:'Estado de salvamento sem indicação visual',path:'src/page.tsx',line:12,impact:'A pessoa não sabe se a operação foi concluída',recommendation:'Exibir confirmação de sucesso',affected_feature:'Cadastro',affected_flow:'Salvar cadastro',priority:'P2',cause_hypothesis:'Estado de sucesso não implementado',dependencies:[],acceptance_criteria:['Confirmação aparece após salvar'],owner:'ui-engineer',required_tests:['Teste do fluxo de salvamento'],resolution_status:'open'};}

test('UX gate returns explicit outcomes and blocks missing classification, dependency, or evidence',()=>{
 assert.equal(evaluateUxGate({applicability:'not_applicable',rationale:'Produto sem interação com pessoas'}).outcome,'not_applicable');
 assert.equal(evaluateUxGate({applicability:'unknown'}).outcome,'blocked');
 assert.equal(evaluateUxGate({applicability:'direct',dependency:'unavailable',review:report()}).outcome,'blocked');
 assert.equal(evaluateUxGate({applicability:'direct',dependency:'available',evidenceAvailable:false,review:report()}).outcome,'blocked');
 assert.equal(evaluateUxGate({applicability:'direct',dependency:'available'}).outcome,'blocked');
});

test('UX gate maps review results and never approves critical or high findings',()=>{
 const base={applicability:'indirect',dependency:'available',evidenceAvailable:true};
 assert.equal(evaluateUxGate({...base,review:report()}).outcome,'approved');
 assert.equal(evaluateUxGate({...base,review:report('approved_with_findings',[finding('medium')])}).outcome,'approved_with_remarks');
 assert.equal(evaluateUxGate({...base,review:report('changes_required')}).outcome,'rejected');
 assert.equal(evaluateUxGate({...base,review:report('blocked')}).outcome,'blocked');
 for(const severity of ['blocker','critical','high'])assert.equal(evaluateUxGate({...base,review:report('changes_required',[finding(severity)])}).outcome,'rejected');
});
