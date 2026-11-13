import { spawn } from 'node:child_process';
import { constants } from 'node:fs';
import { lstat, readdir, realpath, open, mkdtemp, mkdir, writeFile, rm, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { tmpdir, platform } from 'node:os';
import { join, dirname, isAbsolute } from 'node:path';
import { scanText } from './secret-scan.mjs';
const MAX_FILE = 2 * 1024 * 1024, MAX_TOTAL = 32 * 1024 * 1024, MAX_FILES = 2048;
function result(status, isolation, checks, reason_code) {
 return {status,isolation,execution_mode:'host_controlled',checks,environment:{platform:platform(),runtime:`node-${process.versions.node}`},...(reason_code?{reason_code}:{})};
}
// This runner constrains commands, environment, output and time. It does not isolate
// candidate code from the current user's OS permissions, network or files.
async function run(executable,args,deadline,oracleTests,{cwd,env,allowLeafTests=false}) {
 return new Promise(resolveRun => {
  let bytes=0, timed=false, overflow=false, child, timer, output="";
  const stop=()=>{
   if(platform()==='win32'){
    try { const root=process.env.SystemRoot??process.env.WINDIR??'C:\\Windows';const killer=spawn(join(root,'System32','taskkill.exe'),['/PID',String(child.pid),'/T','/F'],{env:{SystemRoot:root,WINDIR:root},stdio:'ignore',windowsHide:true,shell:false}); killer.unref(); } catch {}
   } else { try {process.kill(-child.pid,'SIGKILL');}catch{} }
  };
  try { child=spawn(executable,args,{cwd,env,stdio:['ignore','pipe','pipe'],detached:platform()!=='win32',shell:false,windowsHide:true}); }
  catch { resolveRun({code:-1,startError:true}); return; }
  const count=(data,retain)=>{bytes+=data.length;if(bytes>65536){overflow=true;stop();}else if(retain)output+=data.toString('utf8');};
  child.stdout.on('data',data=>count(data,true)); child.stderr.on('data',data=>count(data,false));
  timer=setTimeout(()=>{timed=true;stop();},Math.max(1,deadline-Date.now()));
  child.on('error',()=>{clearTimeout(timer);resolveRun({code:-1,startError:true});});
  child.on('close',code=>{
   clearTimeout(timer);
   let passedTests=/^PASS:/m.test(output)?1:0,incomplete=false;
   if(oracleTests) {
    // Process-isolated Node's stock parent TAP reporter escapes child output.
    // Accept only its terminal aggregate, never a child's isolated '# pass'.
    const summary=output.match(/(?:^|\n)1\.\.(\d+)\n# tests (\d+)\n# suites (\d+)\n# pass (\d+)\n# fail (\d+)\n# cancelled (\d+)\n# skipped (\d+)\n# todo (\d+)\n# duration_ms [0-9.]+\n?$/);
   const fallback=oracleTests.some(path=>output.split('\n').map(line=>line.replaceAll('\\#','#')).some(line=>[path,join('/workspace',path),cwd?join(cwd,path).replaceAll('\\','/'):path].some(label=>line===`# Subtest: ${label}`||/^ok \d+ - /.test(line)&&line.replace(/^ok \d+ - /,'')===label)));
    const observedFiles=Number(summary?.[3]??0)+(allowLeafTests?Number(summary?.[4]??0)+Number(summary?.[7]??0):0);
    incomplete=!summary||fallback||Number(summary[4])<1||Number(summary[5])!==0||Number(summary[6])!==0||Number(summary[7])!==0||Number(summary[8])!==0||observedFiles<oracleTests.length||Number(summary[1])<1||Number(summary[1])>Number(summary[2])||Number(summary[4])+Number(summary[7])!==Number(summary[2]);
    passedTests=incomplete?0:Number(summary[4]);
   }
   resolveRun({code:code??-1,timed,overflow,passedTests,incomplete});
  });
 });
}
async function safePath(root,path) {
 let current=root;
 for(const part of path.split('/')) { current=join(current,part); const st=await lstat(current); if(st.isSymbolicLink()) throw Error('unsafe_inventory'); }
 return current;
}
async function safeSdkTree(root,deadline) {
 const pending=[root];let count=0;
 while(pending.length) {
  if(Date.now()>=deadline) throw Error('timeout');
  for(const entry of await readdir(pending.pop(),{withFileTypes:true})) {
   if(++count>50000||entry.isSymbolicLink()||/^(?:nuget\.config|\.env|credentials|secrets)$/i.test(entry.name)) throw Error('unsafe_sdk');
   if(entry.isDirectory()) pending.push(join(entry.parentPath,entry.name));
  }
 }
}
async function inventoryBytes(root,entries,deadline) {
 const buffers=[];let total=0;
 const blocked=code=>{throw Error(code);};
  for(const [path,hash] of entries) {
   if(!path||/[\x00-\x1f\x7f]/.test(path)||isAbsolute(path)||path.includes('\\')||path.split('/').some(x=>!x||x==='.'||x==='..')||!/^([a-f0-9]{64})$/.test(hash)) return blocked('invalid_inventory');
   if(Date.now()>=deadline) return blocked('timeout');
   const absolute=await safePath(root,path);
   const handle=await open(absolute,constants.O_RDONLY|constants.O_NOFOLLOW);
   let data;
   try {const st=await handle.stat(); if(!st.isFile()||st.size>MAX_FILE||total+st.size>MAX_TOTAL) return blocked('inventory_limit');
    // Limit the read even if an untrusted writer grows the inode after stat.
    data=Buffer.alloc(st.size+1); const {bytesRead}=await handle.read(data,0,data.length,0); data=data.subarray(0,bytesRead); if(bytesRead!==st.size) return blocked('inventory_mismatch');
   } finally {await handle.close();}
   total+=data.length;
   if(createHash('sha256').update(data).digest('hex')!==hash) return blocked('inventory_mismatch');
   if(/(^|\/)\.env(?:\.|$)|(^|\/)(?:\.aws|\.ssh|\.git|secrets)(\/|$)|\.(pem|pfx|key)$/i.test(path)||scanText(data.toString('utf8')).length) return blocked('secret_detected');
   buffers.push([path,data]);
  }
 return buffers;
}
export async function validateIsolated({repo,files,profile,timeoutMs=120000,oracles,requestedTests=[]}={}) {
 const checks=[]; let staging;
 const blocked=code=>result('blocked','unverified',checks,code);
 if(!['node-tests-v1','dotnet-offline-v1'].includes(profile)) return blocked('unsupported_profile');
 if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>600000) return blocked('invalid_timeout');
 const deadline=Date.now()+timeoutMs;
 try {
  if(!files||typeof files!=='object'||Array.isArray(files)||Object.keys(files).length>MAX_FILES) return blocked('invalid_inventory');
  const entries=Object.entries(files);
  const root=await realpath(repo);
  const buffers=await inventoryBytes(root,entries,deadline);
  const nodeTest=path=>/(?:^|\/)(?:[^/]+\.)?(?:test|spec)\.(?:mjs|cjs|js)$/.test(path);
  const architecture=path=>/^tests\/[^/]*(?:Architecture|Arquitetura)[^/]*\/[^/]+\.csproj$/i.test(path);
  const runnable=path=>profile==='node-tests-v1'?nodeTest(path):architecture(path);
  if(!oracles) return blocked(entries.some(([path])=>runnable(path))?'oracle_unavailable':'no_tests');
  if(!oracles.root||!isAbsolute(oracles.root)||!oracles.files||typeof oracles.files!=='object'||Array.isArray(oracles.files)||Object.keys(oracles.files).length>MAX_FILES) return blocked('oracle_unavailable');
  const frozenEntries=Object.entries(oracles.files);
  if(!frozenEntries.some(([path])=>runnable(path))) return blocked('no_tests');
  if(frozenEntries.some(([path])=>!/(^|\/)tests?\//.test(path)&&!nodeTest(path))) return blocked('invalid_oracles');
  const frozen=await inventoryBytes(await realpath(oracles.root),frozenEntries,deadline);
  const originals=new Map(buffers);
  const merged=new Map(buffers);for(const [path,data] of frozen)merged.set(path,data);
  if(merged.size>MAX_FILES||[...merged.values()].reduce((sum,data)=>sum+data.length,0)>MAX_TOTAL) return blocked('inventory_limit');
  buffers.splice(0,buffers.length,...merged.entries());
  entries.splice(0,entries.length,...[...merged.keys()].map(path=>[path,'frozen-or-candidate']));
  checks.push({id:'frozen_oracles',code:0});
  const outputPaths=['qa-artifacts','.scratch'];
  if(profile==='dotnet-offline-v1') for(const [path] of entries) if(path.endsWith('.csproj')) for(const output of ['bin','obj']) outputPaths.push(join(dirname(path),output));
  if(entries.some(([path])=>outputPaths.some(output=>path===output||path.startsWith(output+'/')))) return blocked('unsafe_inventory');
  const tests=frozenEntries.map(([p])=>p).filter(p=>/(?:^|\/)(?:[^/]+\.)?(?:test|spec)\.(?:mjs|cjs|js)$/.test(p)).sort();
  let commands, dotnetRoot;
  if(profile==='node-tests-v1') { if(!tests.length)return blocked('no_tests'); commands=[[process.execPath,'--test','--test-reporter=tap','--test-isolation=process',...tests]]; }
  else {
   const projects=frozenEntries.map(([p])=>p).filter(p=>/^tests\/[^/]*(?:Architecture|Arquitetura)[^/]*\/[^/]+\.csproj$/i.test(p)).sort();
   if(!projects.length) return blocked('no_tests');
   const configured=process.env.DOTNET_ROOT;
   const sdkCandidates=[configured,process.platform==='win32'?'C:/Program Files/dotnet':'/usr/share/dotnet',join(repo,'.integratech-dotnet')].filter(Boolean);
   for(const sdk of sdkCandidates) {
    try {const executable=join(sdk,process.platform==='win32'?'dotnet.exe':'dotnet');await access(executable,process.platform==='win32'?constants.F_OK:constants.X_OK);dotnetRoot=sdk;break;}catch{}
   }
   if(!dotnetRoot) return blocked('dotnet_sdk_unavailable');
   try {await safeSdkTree(dotnetRoot,deadline);}catch(error){return blocked(error.message==='timeout'?'timeout':'unsafe_sdk');}
   commands=projects.flatMap(p=>[
    [join(dotnetRoot,process.platform==='win32'?'dotnet.exe':'dotnet'),'restore',p,'--source','<empty-temporary-package-source>','-p:NuGetAudit=false'],
    [join(dotnetRoot,process.platform==='win32'?'dotnet.exe':'dotnet'),'build',p,'--no-restore'],
    [join(dotnetRoot,process.platform==='win32'?'dotnet.exe':'dotnet'),'run','--project',p,'--no-build','--no-restore']]);
  }
  checks.push({id:'inventory',code:0});
  staging=await mkdtemp(join(tmpdir(),'integratech-validation-')); const candidate=join(staging,'candidate'); await mkdir(candidate);
  for(const [path,data] of buffers) {if(Date.now()>=deadline)return blocked('timeout');const dest=join(candidate,path);await mkdir(dirname(dest),{recursive:true});await writeFile(dest,data,{flag:'wx',mode:0o600});}
  const systemRoot=process.env.SystemRoot??process.env.WINDIR??'C:\\Windows';
  const pathEntries=process.platform==='win32'?[dirname(process.execPath),join(systemRoot,'System32'),...(dotnetRoot?[dotnetRoot]:[])]:[dirname(process.execPath),'/usr/bin','/bin',...(dotnetRoot?[dotnetRoot]:[])];
  const safeEnv={PATH:pathEntries.join(process.platform==='win32'?';':':'),SystemRoot:systemRoot,WINDIR:systemRoot,TEMP:staging,TMP:staging};
  if(dotnetRoot) Object.assign(safeEnv,{DOTNET_ROOT:dotnetRoot,DOTNET_CLI_HOME:join(staging,'dotnet-home'),NUGET_PACKAGES:join(staging,'nuget'),DOTNET_SKIP_FIRST_TIME_EXPERIENCE:'1',DOTNET_CLI_TELEMETRY_OPTOUT:'1'});
  if(profile==='dotnet-offline-v1'){
   const empty=join(staging,'empty-nuget-source');await mkdir(empty,{recursive:true});
   for(const command of commands) command[4]=empty;
  }
  for(const path of outputPaths) await mkdir(join(candidate,path),{recursive:true});
  checks.push({id:'host_controls',code:0});
  if(Date.now()>=deadline) return blocked('timeout');
  let observed;
  for(const command of commands) {
   observed=await run(command[0],command.slice(1),deadline,profile==='node-tests-v1'?tests:undefined,{cwd:candidate,env:safeEnv});
   if(observed.startError) return blocked('host_execution_unavailable');
   if(profile==='dotnet-offline-v1' && ['restore','build'].includes(command[1]) && observed.code===0&&!observed.timed&&!observed.overflow) continue;
   if(observed.code!==0||observed.timed||observed.overflow||observed.passedTests===0) break;
  }
  let executed=(profile==='node-tests-v1'?tests:frozenEntries.map(([path])=>path).filter(architecture)).map(path=>({path,sha256:oracles.files[path]}));
  if(observed.code===0&&observed.passedTests>0&&!observed.timed&&!observed.overflow&&requestedTests.length){
   if(profile!=='node-tests-v1'){
    if(requestedTests.some(path=>!executed.some(item=>item.path===path&&item.sha256===files[path])))return blocked('requested_tests_not_observed');
   }else{
    if(requestedTests.some(path=>!nodeTest(path)||!originals.has(path)))return blocked('requested_tests_invalid');
    const supplement=join(staging,'supplement');await mkdir(supplement);
    for(const [path,data]of originals){const full=join(supplement,path);await mkdir(dirname(full),{recursive:true});await writeFile(full,data,{flag:'wx',mode:0o600});}
    for(const path of outputPaths)await mkdir(join(supplement,path),{recursive:true});
    // Each approved file must register at least one passing leaf test itself.
    // Aggregate counts could otherwise hide an empty suite behind another file.
    for(const path of requestedTests){
     observed=await run(process.execPath,['--test','--test-reporter=tap','--test-isolation=process',path],deadline,[path],{cwd:supplement,env:safeEnv,allowLeafTests:true});
     if(observed.startError) return blocked('host_execution_unavailable');
     if(observed.code!==0||observed.timed||observed.overflow||observed.passedTests===0)break;
    }
    executed=executed.filter(item=>!requestedTests.includes(item.path)).concat(requestedTests.map(path=>({path,sha256:files[path]})));
   }
  }
  checks.push({id:profile,code:observed.timed?124:observed.overflow?125:observed.code===0&&observed.passedTests>0?0:observed.passedTests===0?2:1});
  const finalResult=result(observed.code===0&&observed.passedTests>0&&!observed.timed&&!observed.overflow?'passed':'failed','unverified',checks,observed.timed?'timeout':observed.overflow?'output_limit':observed.incomplete?'incomplete_oracles':undefined);
  return {...finalResult,test_files:finalResult.status==='passed'?executed:[]};
 } catch(error) {return blocked(['unsafe_inventory','invalid_inventory','inventory_limit','inventory_mismatch','secret_detected','timeout'].includes(error.message)?error.message:'host_execution_unavailable');}
 finally {if(staging) await rm(staging,{recursive:true,force:true});}
}
