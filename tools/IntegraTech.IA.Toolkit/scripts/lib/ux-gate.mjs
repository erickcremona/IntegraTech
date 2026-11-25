import {validateContract} from './contracts.mjs';

const gatedSeverities=new Set(['blocker','critical','high']);

export function evaluateUxGate({applicability,rationale='',dependency='available',evidenceAvailable=true,review}={}){
 if(applicability==='not_applicable')return rationale.trim()?{outcome:'not_applicable',reason:rationale.trim()}:{outcome:'blocked',reason:'not_applicable_requires_rationale'};
 if(!['direct','indirect'].includes(applicability))return {outcome:'blocked',reason:'experience_impact_unclassified'};
 if(!['available','alternative'].includes(dependency))return {outcome:'blocked',reason:'required_capability_unavailable'};
 if(evidenceAvailable!==true)return {outcome:'blocked',reason:'validation_evidence_unavailable'};
 if(!review)return {outcome:'blocked',reason:'independent_ux_review_missing'};
 validateContract('review',review);
 if(review.review_type!=='ux_accessibility')return {outcome:'blocked',reason:'review_type_mismatch'};
 if(review.verdict==='blocked')return {outcome:'blocked',reason:'review_blocked'};
 if(review.verdict==='changes_required'||review.findings.some(item=>gatedSeverities.has(item.severity)))return {outcome:'rejected',reason:'review_rejected_or_impeditive_finding'};
 if(review.verdict==='approved'&&review.findings.length===0)return {outcome:'approved',reason:'all_required_criteria_passed'};
 if(review.verdict==='approved_with_findings')return {outcome:'approved_with_remarks',reason:'non_impeditive_findings_remain'};
 return {outcome:'blocked',reason:'review_outcome_not_approvable'};
}
