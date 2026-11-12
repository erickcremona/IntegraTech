import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { validateIsolated as actualValidateIsolated } from '../scripts/lib/isolated-validation.mjs';
const validateIsolated = options => actualValidateIsolated({...options,oracles:options.oracles ?? {root:options.repo,files:options.files}});
const parentTap='TAP version 13\n# Subtest: registered\nok 1 - registered\n1..1\n# tests 1\n# suites 0\n# pass 1\n# fail 0\n# cancelled 0\n# skipped 0\n# todo 0\n# duration_ms 1\n';
const digest = text => createHash('sha256').update(text).digest('hex');
async function fixture(fn) { const repo = await mkdtemp(join(tmpdir(), 'isolation-test-')); try { await fn(repo); } finally { await rm(repo,{recursive:true,force:true}); } }
async function withLinuxBubblewrap(fn) {
 const os = await import('node:os'), fs = await import('node:fs/promises'), path = await import('node:path');
 const { syncBuiltinESMExports } = await import('node:module');
 const originalPlatform = os.default.platform, originalAccess = fs.default.access, originalJoin = path.default.join;
 os.default.platform = () => 'linux';
 fs.default.access = (path, ...args) => String(path) === '/usr/bin/bwrap' ? Promise.resolve() : originalAccess(path, ...args);
 path.default.join = path.posix.join;
 syncBuiltinESMExports();
 try { return await fn(); }
 finally { os.default.platform = originalPlatform; fs.default.access = originalAccess; path.default.join = originalJoin; syncBuiltinESMExports(); }
}
test('rejects arbitrary command profiles without executing candidate', () => fixture(async repo => {
 const r = await validateIsolated({repo,files:{},profile:'sh -c true'}); assert.equal(r.status,'blocked'); assert.equal(r.reason_code,'unsupported_profile');
}));
test('rejects inventory escapes, symlinks, changed bytes and secrets', () => fixture(async repo => {
 await writeFile(join(repo,'ok.test.mjs'),'test'); await mkdir(join(repo,'linked-target')); await writeFile(join(repo,'linked-target','link.test.mjs'),'test');
 await symlink(join(repo,'linked-target'),join(repo,'linked'),'junction');
 for (const [path, hash, code] of [['../escape',digest(''),'invalid_inventory'],['linked/link.test.mjs',digest('test'),'unsafe_inventory'],['ok.test.mjs',digest('different'),'inventory_mismatch']]) {
 const r=await validateIsolated({repo,files:{[path]:hash},profile:'node-tests-v1'}); assert.equal(r.reason_code,code); }
 const secret=['-----BEGIN', 'PRIVATE KEY-----'].join(' '); await writeFile(join(repo,'secret.test.mjs'),secret);
 assert.equal((await validateIsolated({repo,files:{'secret.test.mjs':digest(secret)},profile:'node-tests-v1'})).reason_code,'secret_detected');
}));
test('zero tests are blocked', () => fixture(async repo => {
 await writeFile(join(repo,'readme.md'),'hello'); assert.equal((await validateIsolated({repo,files:{'readme.md':digest('hello')},profile:'node-tests-v1'})).reason_code,'no_tests');
}));
test('real boundary never falls back to host when namespace unavailable', () => fixture(async repo => {
 const source="import test from 'node:test'; test('one',()=>{});"; await writeFile(join(repo,'one.test.mjs'),source);
 const r=await validateIsolated({repo,files:{'one.test.mjs':digest(source)},profile:'node-tests-v1',timeoutMs:5000});
 assert.ok(['passed','blocked'].includes(r.status)); if(r.status==='passed') assert.equal(r.isolation,'verified'); else assert.equal(r.isolation,'unverified');
 assert.deepEqual(Object.keys(r.environment).sort(),['platform','runtime']); assert.ok(!JSON.stringify(r).includes(repo));
}));
test('SIMULATED subprocess boundary checks fixed argv, cleared environment, and canary ordering', () => fixture(repo => withLinuxBubblewrap(async () => {
 const cp=await import('node:child_process'); const {syncBuiltinESMExports}=await import('node:module');
 const {EventEmitter}=await import('node:events'); const {PassThrough}=await import('node:stream');
 const calls=[]; const original=cp.default.spawn;
 cp.default.spawn=(executable,args,options)=>{
  calls.push({executable,args,options}); const child=new EventEmitter(); child.pid=99999999; child.stdout=new PassThrough(); child.stderr=new PassThrough();
  queueMicrotask(()=>{child.stdout.emit('data',Buffer.from(calls.length===1?'':parentTap));child.emit('close',0);});return child;
 }; syncBuiltinESMExports();
 try {
  const source="import test from 'node:test'; test('one',()=>{});"; await writeFile(join(repo,'one.test.mjs'),source);
  const r=await validateIsolated({repo,files:{'one.test.mjs':digest(source)},profile:'node-tests-v1'});
  assert.equal(r.status,'passed'); assert.equal(calls.length,2);
  for(const call of calls) {assert.equal(call.executable,'/usr/bin/bwrap');assert.deepEqual(call.options.env,{});assert.equal(call.options.shell,false);for(const arg of ['--unshare-all','--clearenv','--die-with-parent','--new-session'])assert.ok(call.args.includes(arg));assert.ok(!call.args.includes(repo));}
  const a=calls[0].args, wi=a.indexOf('/workspace'); assert.equal(a[wi-2],'--ro-bind');
  const writable=a.flatMap((v,i)=>v==='--bind'?[a[i+2]]:[]).sort();assert.deepEqual(writable,['/workspace/.scratch','/workspace/qa-artifacts']);
  assert.ok(a.at(-1).includes('appendFileSync'));assert.ok(a.at(-1).includes('/usr/bin/codex'));
  assert.ok(calls[0].args.includes('-e'));assert.ok(calls[1].args.includes('--test'));assert.ok(calls[1].args.includes('--test-isolation=process'));assert.ok(!JSON.stringify(r).includes('# pass'));
 } finally {cp.default.spawn=original;syncBuiltinESMExports();}
})));
test('bounded inventory and total timeout fail closed', () => fixture(async repo => {
 const huge='x'.repeat(2*1024*1024+1);await writeFile(join(repo,'large.test.mjs'),huge);
 assert.equal((await validateIsolated({repo,files:{'large.test.mjs':digest(huge)},profile:'node-tests-v1'})).reason_code,'inventory_limit');
 assert.equal((await validateIsolated({repo,files:{},profile:'node-tests-v1',timeoutMs:0})).reason_code,'invalid_timeout');
}));
test('SIMULATED failed canary prevents all candidate execution and drops diagnostics', () => fixture(repo => withLinuxBubblewrap(async () => {
 const cp=await import('node:child_process'); const {syncBuiltinESMExports}=await import('node:module');
 const {EventEmitter}=await import('node:events');const {PassThrough}=await import('node:stream');const original=cp.default.spawn;let count=0;
 cp.default.spawn=()=>{count++;const c=new EventEmitter();c.pid=99999999;c.stdout=new PassThrough();c.stderr=new PassThrough();queueMicrotask(()=>{c.stderr.emit('data',Buffer.from('sensitive-host-diagnostics'));c.emit('close',31);});return c;};syncBuiltinESMExports();
 try {const source="import test from 'node:test';test('one',()=>{});";await writeFile(join(repo,'one.test.mjs'),source);const r=await validateIsolated({repo,files:{'one.test.mjs':digest(source)},profile:'node-tests-v1'});assert.equal(r.status,'blocked');assert.equal(r.isolation,'unverified');assert.equal(count,1);assert.ok(!JSON.stringify(r).includes('sensitive-host-diagnostics'));assert.ok(r.checks.every(c=>Number.isInteger(c.code)));}
 finally{cp.default.spawn=original;syncBuiltinESMExports();}
})));

test('operational output mounts cannot hide immutable inventory sources', () => fixture(async repo => {
 const source="import test from 'node:test';test('one',()=>{});";
 for(const dir of ['qa-artifacts','.scratch']) {const {mkdir}=await import('node:fs/promises');await mkdir(join(repo,dir));await writeFile(join(repo,dir,'one.test.mjs'),source);assert.equal((await validateIsolated({repo,files:{[`${dir}/one.test.mjs`]:digest(source)},profile:'node-tests-v1'})).reason_code,'unsafe_inventory');}
}));

test('runnable candidate without independent frozen oracles is blocked', () => fixture(async repo => {
 const source="import test from 'node:test';test('one',()=>{});";await writeFile(join(repo,'one.test.mjs'),source);
 assert.equal((await actualValidateIsolated({repo,files:{'one.test.mjs':digest(source)},profile:'node-tests-v1'})).reason_code,'oracle_unavailable');
}));
test('SIMULATED frozen regression oracle replaces weakened test only in discardable snapshot', () => fixture(repo => withLinuxBubblewrap(() => fixture(async oracleRoot => {
 const original="import test from 'node:test';test('regression',()=>{throw Error('must fail')});";
 const weakened="import test from 'node:test';test('empty',()=>{});";
 await writeFile(join(repo,'one.test.mjs'),weakened);await writeFile(join(repo,'00.test.mjs'),"process.stdout.write('# pass 1\\n');process.exit(0);");await writeFile(join(oracleRoot,'one.test.mjs'),original);
 const cp=await import('node:child_process');const {syncBuiltinESMExports}=await import('node:module');const {readFileSync}=await import('node:fs');
 const {EventEmitter}=await import('node:events');const {PassThrough}=await import('node:stream');const previous=cp.default.spawn;let count=0;
 cp.default.spawn=(executable,args)=>{assert.ok(!args.includes('00.test.mjs'));const workspace=args.indexOf('/workspace');assert.equal(readFileSync(join(args[workspace-1],'one.test.mjs'),'utf8'),original);count++;const c=new EventEmitter();c.pid=99999999;c.stdout=new PassThrough();c.stderr=new PassThrough();queueMicrotask(()=>{c.stdout.emit('data',Buffer.from(count===1?'':parentTap));c.emit('close',0);});return c;};syncBuiltinESMExports();
 try {const r=await actualValidateIsolated({repo,files:{'one.test.mjs':digest(weakened),'00.test.mjs':digest("process.stdout.write('# pass 1\\n');process.exit(0);")},profile:'node-tests-v1',oracles:{root:oracleRoot,files:{'one.test.mjs':digest(original)}}});assert.equal(r.status,'passed');assert.ok(r.checks.some(c=>c.id==='frozen_oracles'&&c.code===0));assert.equal(readFileSync(join(repo,'one.test.mjs'),'utf8'),weakened);assert.equal(count,2);}
 finally{cp.default.spawn=previous;syncBuiltinESMExports();}
}))));
test('frozen regression oracle hashes and secrets are checked before sandbox execution', () => fixture(async repo => fixture(async root => {
 const source="import test from 'node:test';test('one',()=>{});";await writeFile(join(repo,'one.test.mjs'),source);await writeFile(join(root,'one.test.mjs'),source);
 const base={repo,files:{'one.test.mjs':digest(source)},profile:'node-tests-v1'};
 assert.equal((await actualValidateIsolated({...base,oracles:{root,files:{'one.test.mjs':digest('different')}}})).reason_code,'inventory_mismatch');
 const secret=['-----BEGIN', 'PRIVATE KEY-----'].join(' ');await writeFile(join(root,'one.test.mjs'),secret);
 assert.equal((await actualValidateIsolated({...base,oracles:{root,files:{'one.test.mjs':digest(secret)}}})).reason_code,'secret_detected');
})));

test('SIMULATED import exit-zero fallback cannot pass a frozen oracle', () => fixture(repo => withLinuxBubblewrap(async () => {
 const cp=await import('node:child_process');const {syncBuiltinESMExports}=await import('node:module');const {EventEmitter}=await import('node:events');const {PassThrough}=await import('node:stream');const previous=cp.default.spawn;let count=0;
 cp.default.spawn=()=>{count++;const c=new EventEmitter();c.pid=99999999;c.stdout=new PassThrough();c.stderr=new PassThrough();queueMicrotask(()=>{c.stdout.emit('data',Buffer.from(count===1?'':parentTap.replaceAll('registered','/workspace/one.test.mjs')));c.emit('close',0);});return c;};syncBuiltinESMExports();
 try {const source="import test from 'node:test';test('one',()=>{});";await writeFile(join(repo,'one.test.mjs'),source);const r=await validateIsolated({repo,files:{'one.test.mjs':digest(source)},profile:'node-tests-v1'});assert.equal(r.status,'failed');assert.equal(r.reason_code,'incomplete_oracles');}
 finally{cp.default.spawn=previous;syncBuiltinESMExports();}
})));

test('frozen helper files in conventional test directory use the same allowlist as capture', () => fixture(async repo => {
 const { mkdir } = await import('node:fs/promises');
 await mkdir(join(repo,'test'));
 const source="import test from 'node:test';import './helper.mjs';test('original',()=>{});";
 await writeFile(join(repo,'test/main.test.mjs'),source);await writeFile(join(repo,'test/helper.mjs'),'export const helper = 1;');
 const files={'test/main.test.mjs':digest(source),'test/helper.mjs':digest('export const helper = 1;')};
 const r=await validateIsolated({repo,files,profile:'node-tests-v1',oracles:{root:repo,files}});
 assert.notEqual(r.reason_code,'invalid_oracles');
}));

test('SIMULATED SDD requested candidate tests run separately after frozen regressions and attest actual bytes',()=>fixture(repo=>withLinuxBubblewrap(async()=>{
 const cp=await import('node:child_process');const {syncBuiltinESMExports}=await import('node:module');const {EventEmitter}=await import('node:events');const {PassThrough}=await import('node:stream');const original=cp.default.spawn;const calls=[];
 cp.default.spawn=(exe,args)=>{calls.push(args);const c=new EventEmitter();c.pid=99999999;c.stdout=new PassThrough();c.stderr=new PassThrough();queueMicrotask(()=>{if(calls.length>1)c.stdout.emit('data',Buffer.from('TAP version 13\n# Subtest: assertion\nok 1 - assertion\n1..1\n# tests 1\n# suites 0\n# pass 1\n# fail 0\n# cancelled 0\n# skipped 0\n# todo 0\n# duration_ms 1\n'));c.emit('close',0);});return c;};syncBuiltinESMExports();
 try{
  const source="import test from 'node:test';test('assertion',()=>{});";await writeFile(join(repo,'original.test.mjs'),source);await writeFile(join(repo,'new.test.mjs'),source+'\n');
  const r=await validateIsolated({repo,files:{'original.test.mjs':digest(source),'new.test.mjs':digest(source+'\n')},profile:'node-tests-v1',oracles:{root:repo,files:{'original.test.mjs':digest(source)}},requestedTests:['new.test.mjs']});
  assert.equal(r.status,'passed');assert.equal(calls.length,3);assert.ok(!calls[1].includes('new.test.mjs'));assert.ok(calls[2].includes('new.test.mjs'));assert.ok(r.test_files.some(file=>file.path==='new.test.mjs'&&file.sha256===digest(source+'\n')));
 }finally{cp.default.spawn=original;syncBuiltinESMExports();}
})));

test('SIMULATED skipped requested tests never produce SDD execution attestations',()=>fixture(repo=>withLinuxBubblewrap(async()=>{
 const cp=await import('node:child_process');const {syncBuiltinESMExports}=await import('node:module');const {EventEmitter}=await import('node:events');const {PassThrough}=await import('node:stream');const original=cp.default.spawn;let count=0;
 cp.default.spawn=()=>{count++;const n=count;const c=new EventEmitter();c.pid=99999999;c.stdout=new PassThrough();c.stderr=new PassThrough();queueMicrotask(()=>{if(n>1)c.stdout.emit('data',Buffer.from(n===3?parentTap.replace('# tests 1','# tests 2').replace('# skipped 0','# skipped 1'):parentTap));c.emit('close',0);});return c;};syncBuiltinESMExports();
 try{
  const source="import test from 'node:test';test('assertion',()=>{});";await writeFile(join(repo,'original.test.mjs'),source);await writeFile(join(repo,'new.test.mjs'),source);
  const r=await validateIsolated({repo,files:{'original.test.mjs':digest(source),'new.test.mjs':digest(source)},profile:'node-tests-v1',oracles:{root:repo,files:{'original.test.mjs':digest(source)}},requestedTests:['new.test.mjs']});
  assert.notEqual(r.status,'passed');assert.equal(count,3);assert.ok(!r.test_files?.length);
 }finally{cp.default.spawn=original;syncBuiltinESMExports();}
})));

test('SIMULATED each requested test file must independently execute leaf tests',()=>fixture(repo=>withLinuxBubblewrap(async()=>{
 const cp=await import('node:child_process');const {syncBuiltinESMExports}=await import('node:module');const {EventEmitter}=await import('node:events');const {PassThrough}=await import('node:stream');const original=cp.default.spawn;const calls=[];
 cp.default.spawn=(exe,args)=>{calls.push(args);const n=calls.length;const c=new EventEmitter();c.pid=99999999;c.stdout=new PassThrough();c.stderr=new PassThrough();queueMicrotask(()=>{if(n>1)c.stdout.emit('data',Buffer.from(n===4?parentTap.replace('# tests 1','# tests 0').replace('# suites 0','# suites 1').replace('# pass 1','# pass 0'):parentTap));c.emit('close',0);});return c;};syncBuiltinESMExports();
 try{
  const source="import test from 'node:test';test('assertion',()=>{});";const files={};
  for(const path of ['original.test.mjs','a.test.mjs','b.test.mjs']){await writeFile(join(repo,path),source);files[path]=digest(source);}
  const r=await validateIsolated({repo,files,profile:'node-tests-v1',oracles:{root:repo,files:{'original.test.mjs':digest(source)}},requestedTests:['a.test.mjs','b.test.mjs']});
  assert.notEqual(r.status,'passed');assert.equal(calls.length,4);assert.ok(calls[2].includes('a.test.mjs'));assert.ok(!calls[2].includes('b.test.mjs'));assert.ok(calls[3].includes('b.test.mjs'));assert.ok(!r.test_files?.length);
 }finally{cp.default.spawn=original;syncBuiltinESMExports();}
})));
