import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { normalizeInitialContext } from './business-context.mjs';
import { validateContract } from './contracts.mjs';
import { inspectInterfaceSelection } from './interface-selection.mjs';
import { contained, assertSanitized } from './paths.mjs';

export const technologyContextHash = context => createHash('sha256').update(JSON.stringify(normalizeInitialContext(context))).digest('hex');
const models = ['worker', 'api', 'console'];
function meaningful(value) {
  if (typeof value === 'string' && (!value.trim() || /^(todo|tbd|pendente|a definir|\.\.\.)[.!]?$/i.test(value.trim()))) throw new Error('decisão tecnológica incompleta');
  if (Array.isArray(value)) value.forEach(meaningful);
  else if (value && typeof value === 'object') Object.values(value).forEach(meaningful);
}
function httpsUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('fonte exige URL HTTPS sem credenciais');
  return url.href;
}
export function inspectTechnologyDecision({ decision, context, repo, requireApproval = false }) {
  if (Buffer.byteLength(JSON.stringify(decision) ?? '') > 128 * 1024) throw new Error('decisão acima do limite');
  validateContract('technology-decision', decision);
  meaningful(decision);
  assertSanitized(JSON.stringify(decision));
  if (decision.context_sha256 !== technologyContextHash(context)) throw new Error('decisão diverge do contexto atual');
  const ids = new Set(decision.options.map(option => option.id));
  if (ids.size !== decision.options.length) throw new Error('alternativas duplicadas');
  const selection = decision.options.find(option => option.id === decision.selected_option);
  if (!selection) throw new Error('alternativa selecionada não existe');
  const sources = new Map();
  for (const source of decision.research) {
    const url = httpsUrl(source.url);
    if (sources.has(url)) throw new Error('fonte duplicada');
    const date = new Date(source.accessed_at);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(source.accessed_at) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== source.accessed_at || source.accessed_at > new Date().toISOString().slice(0, 10)) throw new Error('data de consulta inválida');
    sources.set(url, source.status);
  }
  for (const option of decision.options) {
    for (const url of option.source_urls) if (!sources.has(httpsUrl(url))) throw new Error('fonte da alternativa não registrada');
  }
  if (!selection.source_urls.some(url => sources.get(httpsUrl(url)) === 'consulted')) throw new Error('pesquisa indisponível para a seleção; não há evidência consultada');
  for (const option of decision.options) {
    inspectInterfaceSelection(option.interface, sources);
    if (option.interface?.source_urls?.some(url=>!option.source_urls.includes(url))) throw new Error('pesquisa de interface deve integrar as fontes da alternativa');
  }
  if (requireApproval && decision.approval.status !== 'approved') throw new Error('decisão tecnológica exige aprovação');
  if (decision.approval.status === 'approved') {
    if (!repo || !decision.approval.source_reference) throw new Error('aceite exige referência local');
    const path = contained(repo, decision.approval.source_reference);
    if (!statSync(path).isFile() || statSync(path).size > 128 * 1024) throw new Error('referência de aceite inválida');
    const evidence = readFileSync(path, 'utf8');
    if (!evidence.trim()) throw new Error('aceite vazio');
    assertSanitized(evidence);
  }
  return { interface: inspectInterfaceSelection(selection.interface, sources), status: decision.approval.status === 'approved' ? 'approved' : 'proposed', selection, generator_supported: selection.stack === 'dotnet' && models.includes(selection.presentation), context_sha256: decision.context_sha256 };
}
export function selectionForGeneration({ decision, context, repo, presentation }) {
  if (decision !== undefined) {
    const result = inspectTechnologyDecision({ decision, context, repo, requireApproval: true });
    if (!result.generator_supported) throw new Error('stack/apresentação recomendada sem gerador suportado; nenhuma aproximação será criada');
    if (presentation !== undefined && presentation !== result.selection.presentation) throw new Error('apresentação diverge da decisão tecnológica');
    return result.selection.presentation;
  }
  if (!models.includes(presentation)) throw new Error('decisão tecnológica necessária: pesquise e aprove uma decisão ou selecione um modelo .NET explicitamente com --presentation');
  return presentation;
}
