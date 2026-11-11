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
