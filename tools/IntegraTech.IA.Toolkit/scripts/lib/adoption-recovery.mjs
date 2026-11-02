// Self-contained so a copy can recover an interrupted rename even if toolkit paths changed.
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync, lstatSync, openSync, closeSync, fsyncSync, renameSync, linkSync } from 'node:fs';
import { resolve, relative, isAbsolute, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';

export const exactHash = data => createHash('sha256').update(data).digest('hex');
export function atomicFileWrite(path, data, { exclusive = false } = {}) {
  const temporary = `${path}.adoption-${randomUUID()}.tmp`;
  let descriptor;
  let owned = false;
  try {
    descriptor = openSync(temporary, 'wx');
    owned = true;
    writeFileSync(descriptor, data);
    fsyncSync(descriptor);
    closeSync(descriptor); descriptor = undefined;
    // The destination never sees a truncated/partial payload. New files cannot overwrite a collision.
    if (exclusive) { linkSync(temporary, path); unlinkSync(temporary); }
    else renameSync(temporary, path);
    owned = false;
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
    if (owned && existsSync(temporary)) unlinkSync(temporary);
  }
}
export function transactionPath(root, name) {
  if (typeof name !== 'string' || !name || name.includes(':') || isAbsolute(name)
    || /(^|[\\/])(?:\.git|\.scratch|secrets|node_modules|bin|obj)(?:[\\/]|$)/i.test(name)
    || /(^|[\\/])\.env(?:\.|$)/i.test(name)) throw new Error('caminho da operação inválido');
  const path = resolve(root, name);
  const rel = relative(resolve(root), path);
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) throw new Error('caminho fora da cópia');
  let current = path;
  for (;;) {
    try { if (lstatSync(current).isSymbolicLink()) throw new Error('link não permitido'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return path;
}
export function currentHash(path) {
  if (!existsSync(path)) return null;
  if (!lstatSync(path).isFile()) throw new Error('conflito: caminho não é arquivo');
  return exactHash(readFileSync(path));
}
export function restoreAdoption(journalPath, { dryRun = false } = {}) {
  const fullJournal = resolve(journalPath);
  // Reject junctions/symlinks on the backup itself before reading trusted snapshots.
  transactionPath(dirname(fullJournal), 'journal.json');
  const journal = JSON.parse(readFileSync(fullJournal, 'utf8'));
  if (journal.version !== 1 || typeof journal.repo !== 'string' || !Array.isArray(journal.operations)
    || !['prepared', 'applying', 'applied', 'recovery_required', 'restored'].includes(journal.status)) throw new Error('journal inválido');
  const expectedParent = resolve(journal.repo, '.scratch/adoptions');
  const runName = relative(expectedParent, dirname(fullJournal));
  if (!runName || runName.includes('/') || runName.includes('\\') || runName.startsWith('..')) throw new Error('journal fora da cópia');
  const paths = new Set();
  for (const operation of journal.operations) {
    if (paths.has(operation.path)) throw new Error('operação duplicada');
    paths.add(operation.path);
    if (![operation.before, operation.after].every(value => value === null || /^[a-f0-9]{64}$/.test(value))) throw new Error('hash inválido');
    const path = transactionPath(journal.repo, operation.path);
    const current = currentHash(path);
    if (current !== operation.before && current !== operation.after) throw new Error(`conflito: arquivo alterado após adoção: ${operation.path}`);
    if (operation.before !== null) {
      const backup = transactionPath(dirname(fullJournal), `before/${operation.path}`);
      if (currentHash(backup) !== operation.before) throw new Error('backup alterado ou ausente');
    }
  }
  if (dryRun) return { status: 'planned', operations: journal.operations.length };
  for (const operation of [...journal.operations].reverse()) {
    const path = transactionPath(journal.repo, operation.path);
    const current = currentHash(path);
    if (current !== operation.before && current !== operation.after) throw new Error('conflito durante recuperação');
    if (current === operation.before) continue;
    if (operation.before === null) unlinkSync(path);
    else {
      mkdirSync(dirname(path), { recursive: true });
      const data = readFileSync(transactionPath(dirname(fullJournal), `before/${operation.path}`));
      if (exactHash(data) !== operation.before) throw new Error('backup alterado durante recuperação');
      atomicFileWrite(path, data, { exclusive: current === null });
    }
  }
  journal.status = 'restored';
  atomicFileWrite(fullJournal, JSON.stringify(journal, null, 2) + '\n');
  return { status: 'restored', journal: fullJournal };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const journal = process.argv[2] && process.argv[2] !== '--dry-run' ? process.argv[2] : fileURLToPath(new URL('journal.json', import.meta.url));
    console.log(JSON.stringify(restoreAdoption(journal, { dryRun: process.argv.includes('--dry-run') })));
  } catch (error) { console.error(`Recuperação bloqueada: ${error.message}`); process.exitCode = 2; }
}
