import test from 'node:test';
import assert from 'node:assert/strict';
import {validateContract} from '../scripts/lib/contracts.mjs';
const criteria=['task_clarity','visual_hierarchy','visual_identity','interaction_states','responsive_behavior','accessibility','performance'];
function report(){return {schema_version:1,task_id:'ux',review_type:'ux_accessibility',verdict:'approved',findings:[],residual_risk:'',ux_assessment:criteria.map(criterion=>({criterion,score:4,evidence:['Render e interação observados na evidência do candidato']}))};}
test('UX approval requires complete evidenced quality assessment, without averaging weak dimensions',()=>{
 const r=report();assert.doesNotThrow(()=>validateContract('review',r));
 for(const alter of [r=>delete r.ux_assessment,r=>r.ux_assessment.pop(),r=>r.ux_assessment[0].score=3,r=>r.ux_assessment[0].score=6,r=>r.ux_assessment[0].evidence=[],r=>r.ux_assessment[0]=r.ux_assessment[1]]){const value=report();alter(value);assert.throws(()=>validateContract('review',value));}
 const blocked=report();blocked.verdict='blocked';delete blocked.ux_assessment;assert.doesNotThrow(()=>validateContract('review',blocked));
});

test('UX findings require actionable lifecycle fields and unique identifiers',()=>{
 const complete={finding_id:'UX-001',severity:'medium',title:'Feedback ausente',evidence:'Estado observável sem confirmação',path:'src/page.tsx',line:4,impact:'A pessoa repete a ação sem saber seu resultado',recommendation:'Exibir resultado da ação',affected_feature:'Cadastro',affected_flow:'Salvar',priority:'P2',cause_hypothesis:'Estado de sucesso ausente',dependencies:[],acceptance_criteria:['Confirmação aparece após salvar'],owner:'ui-engineer',required_tests:['Teste do fluxo'],resolution_status:'open'};
 const withFinding={...report(),verdict:'approved_with_findings',findings:[complete]};
 assert.doesNotThrow(()=>validateContract('review',withFinding));
 for(const key of ['finding_id','affected_feature','affected_flow','priority','cause_hypothesis','dependencies','acceptance_criteria','owner','required_tests','resolution_status']){
  const invalid=structuredClone(withFinding);delete invalid.findings[0][key];assert.throws(()=>validateContract('review',invalid),new RegExp(key));
 }
 const duplicate=structuredClone(withFinding);duplicate.findings.push({...complete,title:'Outro achado'});assert.throws(()=>validateContract('review',duplicate),/identificador UX duplicado/);
 for(const severity of ['blocker','critical','high']){const invalid=structuredClone(withFinding);invalid.findings[0].severity=severity;assert.throws(()=>validateContract('review',invalid),/achado alto/);}
 const nonUx={...withFinding,review_type:'code',findings:[{severity:'medium',title:'Bug',evidence:'Falha reproduzida',path:'src/a.mjs',line:1,impact:'resultado incorreto',recommendation:'corrigir'}]};delete nonUx.ux_assessment;assert.doesNotThrow(()=>validateContract('review',nonUx));
});
