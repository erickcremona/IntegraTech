import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {fingerprint} from '../scripts/lib/candidate.mjs';
import {architectureReceiptEvidence} from '../scripts/lib/architecture-inspection.mjs';
import {architectureDigest} from '../scripts/lib/architecture-decision.mjs';

function fixture(t,profile){
 const repo=mkdtempSync(join(tmpdir(),'architecture-receipt-'));t.after(()=>rmSync(repo,{recursive:true,force:true}));
 const runId='run-candidate',testPath=profile==='node-tests-v1'?'tests/architecture.test.mjs':'tests/Product.Arquitetura.Tests/Product.Arquitetura.Tests.csproj';
 const source='frozen test bytes';const fileHash=fingerprint(source);const files=[{path:testPath,sha256:fileHash}];const candidateHash=fingerprint(files);
 const oracleFiles=[{path:testPath,sha256:fileHash}];const reviewFiles=[];
 for(const type of ['code','security']){const path=`qa-artifacts/reviews/${type}.json`,text=`${type} review`;mkdirSync(dirname(join(repo,path)),{recursive:true});writeFileSync(join(repo,path),text);reviewFiles.push({type,verdict:'approved',candidate_sha256:candidateHash,path,sha256:fingerprint(text)});}
 const oraclePath=join(repo,'qa-artifacts/loops',runId,'oracles',testPath);mkdirSync(dirname(oraclePath),{recursive:true});writeFileSync(oraclePath,source);
 const planHash='a'.repeat(64);const run={id:runId,phase:'business',status:'ready_for_delivery',delegation:{sdd:{plan_sha256:planHash}},oracle_files:oracleFiles,engineering:{profile,candidate_sha256:candidateHash,files,required_reviews:['code','security'],reviews:reviewFiles,validation:{status:'passed',execution_mode:'host_controlled',isolation:'unverified',candidate_sha256:candidateHash,oracle_sha256:fingerprint(oracleFiles),test_files:[{path:testPath,sha256:fileHash}],checks:['inventory','frozen_oracles','host_controls',profile].map(id=>({id,code:0}))}}};
 const runText=JSON.stringify(run);const runPath=join(repo,'qa-artifacts/loops',runId,'state.json');writeFileSync(runPath,runText);
 const decision={layout:{name:'Product'},migration:{validation_profile:profile}};
 const receipt={schema_version:1,decision_sha256:architectureDigest(decision),plan_sha256:planHash,run_id:runId,run_sha256:fingerprint(runText)};
 return {repo,run,decision,receipt,oraclePath,testPath,source};
}

for(const profile of ['node-tests-v1','dotnet-offline-v1'])test(`architecture receipt binds ${profile} tests and frozen oracles to the candidate`,t=>{
 const f=fixture(t,profile);assert.equal(architectureReceiptEvidence(f.repo,f.decision,f.receipt),true);
 f.run.oracle_files=[];const text=JSON.stringify(f.run);writeFileSync(join(f.repo,'qa-artifacts/loops',f.receipt.run_id,'state.json'),text);f.receipt.run_sha256=fingerprint(text);
 assert.equal(architectureReceiptEvidence(f.repo,f.decision,f.receipt),false);
});

test('architecture receipt rejects altered frozen-oracle bytes and hashes',t=>{
 const f=fixture(t,'node-tests-v1');writeFileSync(f.oraclePath,'altered');
 assert.equal(architectureReceiptEvidence(f.repo,f.decision,f.receipt),false);
});

test('architecture receipt rejects frozen-oracle entries without valid SHA-256 values',t=>{
 const f=fixture(t,'node-tests-v1');f.run.oracle_files[0].sha256='invalid';
 const runText=JSON.stringify(f.run);writeFileSync(join(f.repo,'qa-artifacts/loops',f.receipt.run_id,'state.json'),runText);f.receipt.run_sha256=fingerprint(runText);
 assert.equal(architectureReceiptEvidence(f.repo,f.decision,f.receipt),false);
});
