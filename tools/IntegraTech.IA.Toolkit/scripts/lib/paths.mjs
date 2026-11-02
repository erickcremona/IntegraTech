import { lstatSync, existsSync, readFileSync } from 'node:fs';
import { resolve, relative, isAbsolute, dirname, basename } from 'node:path';

export function assertNoLinks(path) {
  let current = resolve(path);
  while (true) {
    let stat;
    try { stat = lstatSync(current); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (stat?.isSymbolicLink()) throw new Error('link/junction não permitido');
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
}
export function contained(root, name) {
  if (typeof name !== 'string' || !name || name.includes(':') || isAbsolute(name)) throw new Error('caminho relativo obrigatório');
  const full = resolve(root, name);
  const rel = relative(resolve(root), full);
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) throw new Error('caminho fora do destino');
  assertNoLinks(full);
  return full;
}
export function assertSanitized(text) {
  if (/(?:password|passwd|api[_-]?key|client[_-]?secret|access[_-]?token|connectionstrings?)\s*["']?\s*[:=]\s*["']?\S+/i.test(text)
    || /Bearer\s+[a-z\d._~+/=-]{12,}/i.test(text)
    || /-----BEGIN (?:\w+ )?PRIVATE KEY-----/.test(text)) throw new Error('possível segredo: conteúdo bloqueado');
}
export function readReviewFile(root, name) {
  const full = contained(root, name);
  if (name.split(/[\\/]/).some(part => /^\.|^(secrets?|qa-artifacts|runtime-publish|bin|obj|node_modules)$/i.test(part))
    || /(?:appsettings.*\.json|\.pem|\.pfx|\.key|\.db|\.sqlite|\.log)$/i.test(basename(name))) throw new Error('arquivo sensível/operacional não permitido no pacote');
  const stat = lstatSync(full);
  if (!stat.isFile() || stat.size > 256 * 1024) throw new Error('arquivo não textual ou acima do limite');
  const text = new TextDecoder('utf-8', { fatal: true }).decode(readFileSync(full));
  if (text.includes('\0')) throw new Error('arquivo binário');
  assertSanitized(text);
  return text;
}
