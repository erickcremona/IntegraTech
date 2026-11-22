import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isIP } from 'node:net';
import { lookup } from 'node:dns';
import { digest, inspectPreparation } from './domain-specialist.mjs';

const maxBytes = 2 * 1024 * 1024;
function publicAddress(host) {
  if (isIP(host) === 4) {
    const [a, b] = host.split('.').map(Number);
    const [,, c] = host.split('.').map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 || a === 169 && b === 254 || a === 172 && b >= 16 && b <= 31 || a === 192 && (b === 0 && c !== 9 && c !== 10 && c !== 66 || b === 168) || a === 100 && b >= 64 && b <= 127 || a === 198 && (b === 18 || b === 19 || b === 51 && c === 100) || a === 203 && b === 0);
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
export function proxyEnvironment(env = process.env) {
  return env.HTTPS_PROXY || env.https_proxy || env.ALL_PROXY || env.all_proxy || null;
}
export function resolvePublic(host, lookupHost = lookup) {
  return new Promise((resolve, reject) => lookupHost(host, { all: true, family: 4, verbatim: true }, (error, addresses) => {
    if (error) return reject(new Error(`Falha de DNS ao verificar ${host}.`));
    const unique = [...new Set(addresses.map(item => item.address))];
    if (!unique.length || unique.some(address => !publicAddress(address))) return reject(new Error(`Destino rejeitado pelo filtro de endereços: ${host}.`));
    resolve(unique);
  }));
}
export async function httpsRequest(value, { resolveHost = resolvePublic, runCurl = execFileSync, env = process.env, directoryFactory = () => mkdtempSync(join(tmpdir(), 'domain-research-')) } = {}) {
  const url = publicHttps(value);
  const proxy = proxyEnvironment(env);
  const proxyUrl = proxy ? new URL(proxy) : null;
  if (proxyUrl && (proxyUrl.protocol !== 'http:' && proxyUrl.protocol !== 'https:' || proxyUrl.username || proxyUrl.password)) throw new Error('Proxy inválido ou com credenciais embutidas; configure a autenticação por mecanismo externo seguro.');
  const addresses = proxy ? null : (isIP(url.hostname) ? [url.hostname] : await resolveHost(url.hostname));
  const directory = directoryFactory();
  try {
    const args = ['--silent', '--show-error', '--proto', '=https', '--max-time', '15', '--connect-timeout', '5', '--max-filesize', String(maxBytes), '--dump-header', join(directory, 'headers'), '--output', join(directory, 'body'), '--write-out', '%{http_code}'];
    if (proxy) {
      args.push('--proxy', `${proxyUrl.protocol}//${proxyUrl.host}`);
    }
    else args.push('--noproxy', '*', '--resolve', `${url.hostname}:443:${addresses.join(',')}`);
    args.push('--url', url.href);
    let status;
    try { status = runCurl('curl', args, { encoding: 'utf8', timeout: 18000, maxBuffer: 4096, stdio: ['ignore', 'pipe', 'pipe'], env: proxy ? { ...env, HTTPS_PROXY: '', https_proxy: '', ALL_PROXY: '', all_proxy: '' } : env }); }
    catch (error) {
      const detail = String(error.stderr ?? error.message ?? '');
      if (proxy && /\b(5|6|7|8|16|35|52|56|97)\d\d?\b|proxy/i.test(detail)) throw new Error(`Proxy indisponível para consultar ${url.hostname}.`);
      if (!proxy && /resolve|host name|could not resolve/i.test(detail)) throw new Error(`Falha de DNS ao conectar a ${url.hostname}.`);
      throw new Error(`Consulta HTTPS falhou em ${url.hostname}; verifique rede, TLS e permissões.`);
    }
    const headers = readFileSync(join(directory, 'headers'), 'utf8');
    return { status: Number(status), body: readFileSync(join(directory, 'body')), location: [...headers.matchAll(/^location:\s*(.+)\r?$/gim)].at(-1)?.[1].trim() ?? null };
  } catch (error) { throw error; }
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
    catch (error) { if (source.required || output.coverage.some(c => c.source_ids.includes(source.id)) || output.synthesis.some(s => s.source_ids.includes(source.id)) || output.capability_recommendations?.items?.some(item => item.source_ids.includes(source.id))) throw error; }
  }
  return output;
}
export function inspectReceipts(preparation) {
  for (const source of preparation.sources) {
    const receipt = source.receipt;
    const needed = source.required || preparation.coverage.some(c => c.source_ids.includes(source.id)) || preparation.synthesis.some(s => s.source_ids.includes(source.id)) || preparation.capability_recommendations?.items?.some(item => item.source_ids.includes(source.id));
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
    if (source.receipt && (!old || old.content_sha256 !== source.receipt.content_sha256 || old.final_url !== source.receipt.final_url)) throw new Error(`Fonte ${source.id} (${source.url}) mudou entre consultas: selecione uma publicação oficial equivalente, revise os achados contra ela e execute research-collect novamente para gerar novo comprovante SHA-256.`);
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
