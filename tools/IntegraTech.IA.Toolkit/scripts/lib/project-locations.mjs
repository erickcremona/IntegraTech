import {existsSync,lstatSync,readFileSync,realpathSync} from 'node:fs';
import {resolve,relative,isAbsolute} from 'node:path';
import {createHash} from 'node:crypto';
import {contained,assertNoLinks} from './paths.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export function localDocument(repo,path){const full=contained(repo,path);const stat=lstatSync(full);if(!stat.isFile()||stat.size>1024*1024)throw new Error('registro local inválido');return JSON.parse(readFileSync(full,'utf8'));}
export function overlaps(a,b){const rel=relative(resolve(a),resolve(b));return !rel||!rel.startsWith('..')&&!isAbsolute(rel);}
export function ignoredSourcePath(path){return path.split(/[\\/]/).some(part=>['.git','.scratch','.superpowers','.integratech','node_modules','qa-artifacts','runtime-publish','.vs','.idea','.venv','venv','__pycache__','vendor','dist','build','coverage','TestResults','secrets'].includes(part)||/^\.env(?:\.|$)/i.test(part)||/^\.(?:aws|ssh|npmrc|pypirc|netrc)$/.test(part))||/\.(?:pem|pfx|key|db|sqlite|log|trx)$/i.test(path)||/appsettings.*\.local\.json$/i.test(path);}
export function linkedProject(repo){
 repo=resolve(repo);assertNoLinks(repo);
 const linkPath=contained(repo,'project-link.json');
 const statePath=contained(repo,'references/project-state.json');
 const state=existsSync(statePath)?localDocument(repo,'references/project-state.json'):undefined;
 const identity=existsSync(contained(repo,'project.json'))?localDocument(repo,'project.json'):undefined;
 if(!existsSync(linkPath)){if(state?.project_mode==='attached'||identity?.mode==='attached')throw new Error('vínculo de fonte ausente');return null;}
 const link=localDocument(repo,'project-link.json');
 if(link.schema_version!==1||link.mode!=='attached'||!/^[-a-z0-9]{1,60}$/.test(link.id)||typeof link.source_root!=='string'||!isAbsolute(link.source_root)||typeof link.binding_id!=='string'||!/^[a-f0-9]{32}$/.test(link.binding_id))throw new Error('vínculo de fonte inválido');
 const binding_sha256=hash(readFileSync(linkPath));
 if(state?.source_binding_sha256!==binding_sha256||identity?.mode!=='attached'||identity?.id!==link.id)throw new Error('vínculo de fonte alterado ou divergente');
 assertNoLinks(link.source_root);
 if(!lstatSync(link.source_root).isDirectory()||realpathSync(link.source_root)!==link.source_root||overlaps(repo,link.source_root)||overlaps(link.source_root,repo))throw new Error('fonte indisponível ou sobreposto à gestão');
 return {...link,binding_sha256};
}
export const sourceRoot=repo=>linkedProject(repo)?.source_root??resolve(repo);
export function sourceFile(repo,path){const link=linkedProject(repo);if(link&&ignoredSourcePath(path))throw new Error('arquivo sensível/operacional fora do escopo do fonte');return contained(link?.source_root??repo,path);}
export const sourceBinding=repo=>linkedProject(repo)?.binding_sha256;
