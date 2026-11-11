import {sourceFile,linkedProject} from './project-locations.mjs';
import { readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { contained, assertSanitized } from './paths.mjs';
import { validateContract } from './contracts.mjs';

const defaultFile = 'references/traceability-graph.json';
const fileLimit = 256 * 1024;
const sourceBudget = 8 * 1024 * 1024;
const safeId = id => /^[A-Za-z0-9][A-Za-z0-9_.-]{0,79}$/.test(id);
const failure = code => { const error = new Error(code); error.graphCode = code; throw error; };
const hash = data => createHash('sha256').update(data).digest('hex');
export function graphPath(repo, path) {
  if (typeof path !== 'string' || !path || path.includes('\\') || path.split('/').some(part => !part || part === '.' || part === '..')
    || /(^|\/)(?:\.git|\.aws|\.ssh|secrets?|node_modules|bin|obj)(\/|$)/i.test(path)
    || /(^|\/)(?:\.env(?:\..*)?|\.npmrc|\.pypirc|\.netrc)$|\.(?:pem|pfx|key|db|sqlite|log)$/i.test(path)
    || /appsettings.*\.local\.json$/i.test(path)) failure('source_path_invalid');
  try { return contained(repo, path); } catch { failure('source_path_invalid'); }
}
export function graphSourcePath(repo,path){graphPath(repo,path);return path.startsWith('source/')&&linkedProject(repo)?sourceFile(repo,path.slice(7)):graphPath(repo,path);}
function readText(repo, path) {
  const full = graphSourcePath(repo, path);
  try {
    const stat = statSync(full);
    if (!stat.isFile()) failure('source_not_file');
    if (stat.size > fileLimit) failure('source_too_large');
    const data = readFileSync(full);
    if (data.length > fileLimit) failure('source_too_large');
    return decodeGraphSource(data);
  } catch (error) { if (error.graphCode) throw error; failure(error.code === 'ENOENT' ? 'source_missing' : 'source_unreadable'); }
}
export function decodeGraphSource(data) {
  if (data.length > fileLimit) failure('source_too_large');
  let text;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(data); if (text.includes('\0')) throw new Error(); }
  catch { failure('source_not_text'); }
  try { assertSanitized(text); } catch { failure('source_sensitive'); }
  return { text, digest: hash(data), size: data.length };
}
export const readGraphSource = readText;
function resolvePointer(source, pointer) {
  if (pointer === '') return;
  if (!pointer.startsWith('/') || /~(?![01])/u.test(pointer)) failure('pointer_invalid');
  let value;
  try { value = JSON.parse(source.text); } catch { failure('pointer_requires_json'); }
  for (const token of pointer.slice(1).split('/').map(part => part.replaceAll('~1', '/').replaceAll('~0', '~'))) {
    if (Array.isArray(value) && !/^(0|[1-9][0-9]*)$/.test(token)) failure('pointer_invalid');
    if (value === null || typeof value !== 'object' || !Object.hasOwn(value, token)) failure('pointer_missing');
    value = value[token];
  }
}
function reachable(start, adjacency) {
  const distances = new Map([[start, 0]]), queue = [start];
  for (let index = 0; index < queue.length; index++) {
    const id = queue[index];
    for (const next of adjacency.get(id) ?? []) if (!distances.has(next)) {
      distances.set(next, distances.get(id) + 1); queue.push(next);
    }
  }
  distances.delete(start);
  return distances;
}
function inspect({ repo, file = defaultFile, graph: suppliedGraph, readSource }) {
  const read = readSource ?? (path => readText(repo, path));
  const report = { status: 'blocked', scope: 'declared_links_only', node_count: 0, edge_count: 0, errors: [], warnings: [] };
  let graph;
  try { graph = suppliedGraph ?? JSON.parse(read(file).text); }
  catch { report.errors.push({ code: 'invalid_graph_document' }); return { report }; }
  try { validateContract('traceability-graph', graph); }
  catch { report.errors.push({ code: 'invalid_graph_schema' }); return { report }; }
  report.node_count = graph.nodes.length; report.edge_count = graph.edges.length;
  const nodes = new Map(), adjacency = new Map(), reverse = new Map();
  const error = (code, node) => report.errors.push({ code, ...(node ? { node } : {}) });
  for (const node of graph.nodes) {
    if (!safeId(node.id)) { error('invalid_node_id'); continue; }
    if (nodes.has(node.id)) error('duplicate_node', node.id);
    nodes.set(node.id, node); adjacency.set(node.id, []); reverse.set(node.id, []);
  }
  const edges = new Set();
  for (const edge of graph.edges) {
    if (!nodes.has(edge.from) || !nodes.has(edge.to)) { error('unknown_endpoint'); continue; }
    if (edge.from === edge.to) error('self_edge', edge.from);
    const key = JSON.stringify([edge.from, edge.to, edge.relation]);
    if (edges.has(key)) error('duplicate_edge', edge.from);
    edges.add(key); adjacency.get(edge.from).push(edge.to); reverse.get(edge.to).push(edge.from);
  }
  if (graph.sync) {
    const owned = new Set();
    for (const item of graph.sync.nodes) {
      if (owned.has(item.id) || !/^[a-f0-9]{64}$/.test(item.sha256) || !nodes.has(item.id)
        || hash(JSON.stringify(nodes.get(item.id))) !== item.sha256) error('managed_node_modified');
      owned.add(item.id);
    }
    const actual = new Set(graph.edges.map(edge => hash(JSON.stringify([edge.from, edge.to, edge.relation]))));
    if (new Set(graph.sync.edges).size !== graph.sync.edges.length || graph.sync.edges.some(key => !/^[a-f0-9]{64}$/.test(key) || !actual.has(key))) error('managed_edge_modified');
  }
  const sources = new Map(); let bytes = 0;
  for (const node of nodes.values()) {
    try {
      const path = node.source.path;
      if (!sources.has(path)) {
        const source = read(path); bytes += source.size;
        if (bytes > sourceBudget) failure('source_budget_exceeded');
        sources.set(path, source);
      }
      const source = sources.get(path);
      if (node.source.sha256 !== undefined) {
        if (!/^[a-f0-9]{64}$/.test(node.source.sha256)) failure('source_hash_invalid');
        if (source.digest !== node.source.sha256) failure('source_hash_mismatch');
      }
      resolvePointer(source, node.source.pointer);
    } catch (cause) { error(cause.graphCode ?? 'source_unreadable', node.id); }
    if (bytes > sourceBudget) break;
  }
  if (report.errors.length) return { report };
  for (const node of nodes.values()) {
    if (!adjacency.get(node.id).length && !reverse.get(node.id).length) report.warnings.push({ code: 'isolated_node', node: node.id });
    if (node.kind === 'requirement' && ![...reachable(node.id, adjacency).keys()].some(id => nodes.get(id).kind === 'test'))
      report.warnings.push({ code: 'requirement_without_test', node: node.id });
    if (node.kind === 'decision' && ![...reachable(node.id, reverse).keys()].some(id => ['context', 'requirement'].includes(nodes.get(id).kind)))
      report.warnings.push({ code: 'decision_without_justification', node: node.id });
  }
  report.status = nodes.size ? 'valid' : 'empty';
  if (!nodes.size) report.warnings.push({ code: 'empty_graph' });
  return { report, nodes, adjacency };
}
export function validateGraphData(options) { return inspect(options).report; }
export function validateGraph(options) { return inspect(options).report; }
export function graphImpact({ id, ...options }) {
  const { report, nodes, adjacency } = inspect(options);
  if (report.status !== 'valid') return report;
  if (!nodes.has(id)) return { ...report, status: 'blocked', errors: [{ code: 'unknown_node' }] };
  const affected = [...reachable(id, adjacency)].map(([key, distance]) => {
    const node = nodes.get(key);
    return { id: node.id, kind: node.kind, source: node.source, distance };
  }).sort((a, b) => a.distance - b.distance || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return { ...report, origin: id, affected, review_required: affected.filter(node => node.kind === 'approval').map(node => node.id) };
}
