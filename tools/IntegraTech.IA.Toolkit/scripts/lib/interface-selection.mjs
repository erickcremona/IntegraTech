import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
export const uiHash=value=>createHash('sha256').update(typeof value==='string'||Buffer.isBuffer(value)?value:JSON.stringify(value)).digest('hex');
export function interfaceRegistry(){return JSON.parse(readFileSync(new URL('../../fabrica/ui/profiles.json',import.meta.url),'utf8'));}
export function inspectInterfaceSelection(selection,sources){
 if(!selection||selection.platform==='none'){
  if(selection&&selection.framework!=='none')throw new Error('interface none não admite framework');
  return {platform:'none',framework:'none'};
 }
 const fields=['version','rendering','component_library','style_strategy','design_system'];
 if(fields.some(field=>typeof selection[field]!=='string'||!selection[field].trim())||!/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/.test(selection.version))throw new Error('interface exige versão exata e escolhas explícitas');
 for(const field of ['source_roots','targets','accessibility','validation','source_urls'])if(!Array.isArray(selection[field])||!selection[field].length||selection[field].some(value=>typeof value!=='string'||!value.trim()))throw new Error('interface exige público, acessibilidade, validação e pesquisa');
 if(selection.source_roots.some(root=>root!=='.'&&(!/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_.-]+)*$/.test(root)||root.split('/').some(part=>part==='..'||part==='.'||['qa-artifacts','node_modules','secrets','runtime-publish'].includes(part)))))throw new Error('raízes de interface exigem caminhos relativos canônicos e não operacionais');
 if(!selection.source_urls.every(url=>sources.get(new URL(url).href)==='consulted'))throw new Error('pesquisa da interface indisponível ou não registrada');
 const profile=interfaceRegistry().profiles.find(profile=>profile.id===selection.framework);
 if(profile&&(profile.platform!==selection.platform||!profile.renderings.includes(selection.rendering)))throw new Error('interface incompatível com plataforma ou renderização');
 return structuredClone(selection);
}
export function interfaceCapabilities(selection){
 const profile=interfaceRegistry().profiles.find(profile=>profile.id===selection.framework);
 return {recommended:selection.platform!=='none',guidance_available:!!profile,generator_available:!!profile?.generator&&profile.generator.versions.includes(selection.version)&&profile.generator.component_libraries.includes(selection.component_library)&&profile.generator.style_strategies.includes(selection.style_strategy)&&JSON.stringify(selection.source_roots)===JSON.stringify(profile.generator.source_roots),generator:profile?.generator?.id??null,tools_verified:false,browser_validation:'not_observed',isolated_validation:'not_observed'};
}
