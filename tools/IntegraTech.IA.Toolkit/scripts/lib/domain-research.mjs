import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isIP } from 'node:net';
import { digest, inspectPreparation } from './domain-specialist.mjs';

const maxBytes = 2 * 1024 * 1024;
function publicAddress(host) {
  if (isIP(host) === 4) {
    const [a, b] = host.split('.').map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 || a === 169 && b === 254 || a === 172 && b >= 16 && b <= 31 || a === 192 && [0, 168].includes(b) || a === 100 && b >= 64 && b <= 127 || a === 198 && [18, 19, 51].includes(b) || a === 203 && b === 0);
  }
  // Reject IPv6 literals: keep supported destinations unambiguous across proxy/DNS stacks.
  return false;
}
export function publicHttps(value) {
  const url = new URL(value);
  const host = url.hostname.toLowerCase();
  if (url.protocol !== 'https:' || url.username || url.password || url.hash || url.port && url.port !== '443' || !host.includes('.') || /(?:^|\.)(?:localhost|local|internal|lan|test|invalid|example)$/.test(host) || host.endsWith('.') || host.startsWith('[') || isIP(host) && !publicAddress(host)) throw new Error('Pesquisa exige destino HTTPS público, sem credenciais ou porta especial.');
  return url;
}
export function httpsRequest(value) {
  const url = publicHttps(value);
  // Resolve before connecting, including every redirect. The managed proxy also
  // enforces destination policy. Never fall back to private/direct routes.
  // In managed environments DNS belongs to the HTTPS proxy; local DNS may be
  // intentionally unavailable. Such proxies must enforce public-destination policy.
  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  if (!proxy && !isIP(url.hostname)) {
    let addresses;
    try { addresses = execFileSync('getent', ['ahostsv4', url.hostname], { encoding: 'utf8', timeout: 5000, stdio: ['ignore', 'pipe', 'ignore'] }).trim().split('\n').map(line => line.split(/\s+/)[0]); }
    catch { throw new Error(`Não foi possível verificar DNS público de ${url.hostname}; pesquisa bloqueada.`); }
    if (!addresses.length || addresses.some(ip => !publicAddress(ip))) throw new Error('DNS da fonte não é público.');
  }
  const directory = mkdtempSync(join(tmpdir(), 'domain-research-'));
  try {
    const status = execFileSync('curl', ['--silent', '--show-error', '--proto', '=https', '--max-time', '15', '--connect-timeout', '5', '--max-filesize', String(maxBytes), '--dump-header', join(directory, 'headers'), '--output', join(directory, 'body'), '--write-out', '%{http_code}', '--url', url.href], { encoding: 'utf8', timeout: 18000, maxBuffer: 4096, stdio: ['ignore', 'pipe', 'pipe'] });
    const headers = readFileSync(join(directory, 'headers'), 'utf8');
    return { status: Number(status), body: readFileSync(join(directory, 'body')), location: [...headers.matchAll(/^location:\s*(.+)\r?$/gim)].at(-1)?.[1].trim() ?? null };
  } catch { throw new Error(`Consulta HTTPS falhou em ${url.hostname}; verifique rede, TLS e permissões e tente novamente.`); }
  finally { rmSync(directory, { recursive: true, force: true }); }
}
function consult(source, request) {
  let url = publicHttps(source.url);
  const visited = new Set();
  for (let i = 0; i < 4; i++) {
    if (visited.has(url.href)) throw new Error('Loop de redirecionamento na fonte.');
    visited.add(url.href);
    const response = request(url.href);
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      if (!response.location) throw new Error('Redirecionamento sem destino.');
      url = publicHttps(new URL(response.location, url).href); continue;
    }
    if (response.status < 200 || response.status >= 300 || !Buffer.isBuffer(response.body) || !response.body.length || response.body.length > maxBytes || !response.body.toString('utf8').trim()) throw new Error(`Fonte ${source.id} indisponível, vazia ou acima do limite.`);
    return { final_url: url.href, accessed_at: new Date().toISOString().slice(0, 10), content_sha256: digest(response.body), bytes: response.body.length };
  }
  throw new Error('Limite de redirecionamentos da fonte.');
}
export function collectResearch({ context, preparation, request = httpsRequest }) {
  inspectPreparation({ context, preparation });
  if (preparation.sources.length > 12) throw new Error('Máximo de 12 fontes por levantamento; priorize cobertura relevante.');
  const output = structuredClone(preparation);
  for (const source of output.sources) {
    delete source.receipt;
    try { source.receipt = consult(source, request); }
    catch (error) { if (source.required || output.coverage.some(c => c.source_ids.includes(source.id)) || output.synthesis.some(s => s.source_ids.includes(source.id))) throw error; }
  }
  return output;
}
export function inspectReceipts(preparation) {
  for (const source of preparation.sources) {
    const receipt = source.receipt;
    const needed = source.required || preparation.coverage.some(c => c.source_ids.includes(source.id)) || preparation.synthesis.some(s => s.source_ids.includes(source.id));
    if (!receipt) { if (needed) throw new Error('Pesquisa bloqueada: evidência de consulta obrigatória ausente.'); else continue; }
    publicHttps(receipt.final_url);
    const date = new Date(receipt.accessed_at);
    if (!/^[a-f0-9]{64}$/.test(receipt.content_sha256) || !Number.isInteger(receipt.bytes) || receipt.bytes < 1 || receipt.bytes > maxBytes || !/^\d{4}-\d{2}-\d{2}$/.test(receipt.accessed_at) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== receipt.accessed_at || receipt.accessed_at > new Date().toISOString().slice(0, 10)) throw new Error('Evidência de consulta inválida.');
  }
}
export function verifyResearch({ context, preparation, request = httpsRequest }) {
  inspectPreparation({ context, preparation }); inspectReceipts(preparation);
  const current = collectResearch({ context, preparation, request });
  for (const source of current.sources) {
    const old = preparation.sources.find(s => s.id === source.id)?.receipt;
    if (source.receipt && (!old || old.content_sha256 !== source.receipt.content_sha256 || old.final_url !== source.receipt.final_url)) throw new Error(`Fonte ${source.id} mudou: revise a análise e recolete a evidência antes de continuar.`);
  }
}

export function verifyTechnologySources(decision, preparation) {
  const selection = decision.options.find(option => option.id === decision.selected_option);
  for (const reference of selection.source_urls) {
    const url = publicHttps(reference).href;
    const source = preparation?.sources?.find(source => new URL(source.url).href === url);
    if (!source?.required || !source.receipt) throw new Error('Fonte técnica selecionada exige evidência na preparação, como fonte obrigatória com cobertura justificada.');
  }
}
