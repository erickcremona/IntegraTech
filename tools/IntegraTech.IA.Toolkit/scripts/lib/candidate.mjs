import {sourceRoot,linkedProject,ignoredSourcePath} from './project-locations.mjs';
import { readdirSync, lstatSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { contained, assertNoLinks } from './paths.mjs';

export const fingerprint = value => createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest('hex');
const ignored = new Set(['.git', '.integratech', '.scratch', '.superpowers', 'node_modules', 'qa-artifacts', 'runtime-publish', '.vs']);
const maxFileBytes = 16 * 1024 * 1024;
export function generatedOutput(directory, name) {
  return ['bin', 'obj'].includes(name) && !existsSync(join(directory, 'package.json')) && readdirSync(directory).some(file => file.endsWith('.csproj'));
}
export function inventory(repo) {
  const linked=linkedProject(repo);repo=sourceRoot(repo);
  assertNoLinks(repo);
  const result = [];
  let bytes = 0;
  function visit(directory, prefix = '') {
    for (const name of readdirSync(directory).sort()) {
      if (ignored.has(name) || linked && ignoredSourcePath(prefix ? `${prefix}/${name}` : name)) continue;
      const path = prefix ? `${prefix}/${name}` : name;
      const full = contained(repo, path);
      const stat = lstatSync(full);
      if (stat.isDirectory()) { if (!generatedOutput(directory, name)) visit(full, path); }
      else {
        if (!stat.isFile() || stat.size > maxFileBytes || result.length >= 5000 || (bytes += stat.size) > 64 * 1024 * 1024)
          throw new Error('inventário excede limites ou contém arquivo não regular');
        result.push({ path, sha256: fingerprint(readFileSync(full)) });
      }
    }
  }
  visit(repo);
  return result.sort((a, b) => a.path.localeCompare(b.path, 'en'));
}
export function owns(roots, path) {
  return roots.some(root => root === '.' || path === root.replace(/\/$/, '') || path.startsWith(`${root.replace(/\/$/, '')}/`));
}
export function changes(before, after) {
  const previous = new Map(before.map(item => [item.path, item.sha256]));
  const current = new Map(after.map(item => [item.path, item.sha256]));
  return [...new Set([...previous.keys(), ...current.keys()])].filter(path => previous.get(path) !== current.get(path)).sort();
}
