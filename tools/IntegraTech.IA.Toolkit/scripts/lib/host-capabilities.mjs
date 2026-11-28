import {mkdtempSync,mkdirSync,symlinkSync,rmSync} from 'node:fs';
import {tmpdir,platform} from 'node:os';
import {join} from 'node:path';

export function symlinkCapability(){
 const root=mkdtempSync(join(tmpdir(),'integratech-host-capability-'));
 try{
  const target=join(root,'target');mkdirSync(target);
  try{symlinkSync(target,join(root,'link'),platform()==='win32'?'junction':'dir');return {status:'available'};}
  catch(error){return {status:'unavailable',reason_code:'symlink_unavailable',error_code:['EPERM','EACCES','ENOSYS','ENOTSUP'].includes(error.code)?error.code:'UNKNOWN'};}
 }finally{rmSync(root,{recursive:true,force:true});}
}
