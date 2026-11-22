import {inspectArchitectureDecision} from './architecture-decision.mjs';
import {productDocuments} from './product-entry.mjs';
import { designDraft,designPath } from './interface-design.mjs';
import { interfaceFiles } from './interface-profile.mjs';
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync, mkdtempSync, rmSync, rmdirSync, renameSync } from 'node:fs';
import { resolve, relative, isAbsolute, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { contained, assertNoLinks } from './paths.mjs';
import { inspectTechnologyDecision } from './technology-decision.mjs';
import { specialistFiles } from './domain-specialist.mjs';
import { verifyResearch, verifyTechnologySources } from './domain-research.mjs';
import { normalizeInitialContext } from './business-context.mjs';
import { selectedProviders } from './provider-selection.mjs';
import { initialTraceability } from './traceability-sync.mjs';
import { providerFiles } from './installer.mjs';
import { auditToolkit } from './toolkit-audit.mjs';
import { inspectHostDependencies, formatInstallationRequest } from './host-dependencies.mjs';
import { inspectCapabilityRecommendations, renderCapabilityRecommendations } from './capability-recommendations.mjs';

const sourceRoot = fileURLToPath(new URL('../../../../', import.meta.url));
export function prepareProject({ name, provider = 'both', source = sourceRoot, context, technologyDecision, architectureDecision, preparation, researchRequest, decisionRepo = source, hostDependencies }) {
  if (!technologyDecision) throw new Error('Decisão tecnológica pesquisada e aprovada obrigatória.');
  const technology = inspectTechnologyDecision({ decision: technologyDecision, context, repo: decisionRepo, requireApproval: true });
  verifyTechnologySources(technologyDecision, preparation);
  verifyResearch({ context, preparation, request: researchRequest });
  inspectCapabilityRecommendations({ repo: source, preparation });
  if (!architectureDecision) throw new Error('Decisão arquitetural pesquisada e aprovada obrigatória.');
  const initialContext = normalizeInitialContext(context);
  const architecture = inspectArchitectureDecision({ repo: decisionRepo, context: initialContext, technologyDecision, decision: architectureDecision, requireApproval: true });
  if (architecture.mode !== 'initial' || architectureDecision.layout.name !== name || architectureDecision.layout.stack !== technology.selection.stack) throw new Error('Decisão arquitetural diverge do produto ou da stack aprovada.');
  if (typeof name !== 'string' || !/^[A-Z][A-Za-z0-9]{0,49}$/.test(name)
    || /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i.test(name)) throw new Error('nome inválido: use PascalCase alfanumérico, sem nomes reservados');
  selectedProviders(provider);
  const identity = JSON.parse(readFileSync(resolve(source, 'project.json'), 'utf8'));
  const manifest = JSON.parse(readFileSync(contained(source, `tools/${identity.name}.IA.Toolkit/fabrica/project-template.json`), 'utf8'));
  const slug = name.toLowerCase();
  const render = text => text.replaceAll(identity.name, name).replaceAll(identity.slug, slug);
  const files = new Map();
  const readinessReport = auditToolkit(source, { provider, hostDependencies });
  if (readinessReport.status === 'blocked') throw new Error(`auditoria estrutural bloqueou a criação: ${readinessReport.issues.join('; ')}`);
  files.set('references/toolkit-readiness.md', readinessReport.content);
  const capabilityReport = renderCapabilityRecommendations({ name, context: initialContext, preparation });
  files.set('references/capability-recommendations.md', capabilityReport);
  const sourceSkills = [];
  for (const path of manifest.files) {
    if (typeof path !== 'string' || /(^|\/)(?:\.git|\.scratch|\.vs|bin|obj|secrets|node_modules|qa-artifacts|runtime-publish)(?:\/|$)/i.test(path)) throw new Error('manifesto inválido');
    if (path.endsWith('/template-baseline.json')) continue;
    if (['AGENTS.md', 'CLAUDE.md'].includes(path) || /^\.(?:codex|agents|claude|cursor)\//.test(path)) continue;
    // Controlled example files belong to the original model, so adoption can remove them.
    if (path.startsWith('src/') || path.startsWith('tests/') || /\.(?:sln|csproj)$/i.test(path) || ['global.json', 'Directory.Build.props'].includes(path)) continue;
    const origin = contained(source, path);
    const stat = statSync(origin);
    if (!stat.isFile() || stat.size > 1024 * 1024) throw new Error('origem inválida');
    const text = new TextDecoder('utf-8', { fatal: true }).decode(readFileSync(origin));
    const skill = path.match(/\/fabrica\/skills\/([^/]+)\/SKILL\.md$/);
    if (skill) sourceSkills.push([skill[1], text]);
    const destination = render(path);
    if (files.has(destination)) throw new Error('colisão de arquivos');
    files.set(destination, ['THIRD-PARTY-NOTICES.md','AUTHORS.md'].includes(path) ? text : render(text));
  }
  const rolesPath = manifest.files.find(path => path.endsWith('/fabrica/team/catalog.yaml'));
  const roles = JSON.parse(readFileSync(contained(source, rolesPath), 'utf8')).specialists;
  for (const [path, text] of providerFiles(provider, roles, sourceSkills, {productName:name})) {
    const productEntry = text.replace('Continue o produto existente.', 'Antes de qualquer trabalho de produto na primeira sessão, leia e apresente ao usuário references/toolkit-readiness.md e references/capability-recommendations.md. Recomendações não instalam componentes. Continue o produto existente.');
    files.set(render(path), render(productEntry));
  }
  const architectural=structuredClone(architectureDecision);
  const architecturalEvidence=readFileSync(contained(decisionRepo,architectural.approval.source_reference),'utf8');
  architectural.approval.source_reference='references/architecture-approval.md';
  files.set('references/architecture-approval.md',architecturalEvidence);
  files.set('references/architecture-decision.json',JSON.stringify(architectural,null,2)+'\n');
  files.set('project.json', JSON.stringify({ schema_version: 1, name, slug, provider, is_model: false }, null, 2) + '\n');
  const decision = structuredClone(technologyDecision);
  const evidence = readFileSync(contained(decisionRepo, decision.approval.source_reference), 'utf8');
  decision.approval.source_reference = 'references/technology-approval.md';
  files.set('references/technology-approval.md', evidence);
  files.set('references/technology-decision.json', JSON.stringify(decision, null, 2) + '\n');
  files.set('references/business-context.json', JSON.stringify(initialContext, null, 2) + '\n');
  for (const [path, text] of specialistFiles({ name, provider, context, preparation })) files.set(path, text);
  for (const [path, text] of interfaceFiles({ name, provider, context, decision })) files.set(path, text);
  const finalState = {
    schema_version: 1,
    scope_status: 'pending',
    plan_gate: 'pending',
    active_phase: 'discovery',
    execution_workflow: 'sdd-v2',
    architecture_mode: 'managed-v1',
    architecture_path: 'references/architecture-decision.json',
    system_design_mode: 'contextual-v1',
    context_path: 'references/business-context.json',
    technology_decision_path: 'references/technology-decision.json',
    plan_path: null,
    approval_path: null,
    business_implementation: 'blocked_until_scope_and_plan',
    external_actions_authorized: false
  };
  if (files.has('references/interface-profile.json')) {
    finalState.interface_profile_path = 'references/interface-profile.json';
    files.set(designPath,JSON.stringify(designDraft(JSON.parse(files.get(finalState.interface_profile_path)),context),null,2)+'\n');
  }
  finalState.specialist_path = 'references/domain-specialist.json';
  finalState.workflow_status = 'materialized';
  files.set('references/project-state.json', JSON.stringify(finalState, null, 2) + '\n');
  files.set('references/traceability-graph.json', JSON.stringify({ schema_version: 1, nodes: [], edges: [] }, null, 2) + '\n');
  files.set('references/traceability-graph.json', JSON.stringify(initialTraceability(files), null, 2) + '\n');
  for(const [path,text] of productDocuments({name,context:initialContext,preparation,decision,architecture:architectural,authorship:files.get('AUTHORS.md'),toolkitManual:files.get(`tools/${name}.IA.Toolkit/fabrica/toolkit-manual.md`)})) files.set(path,text);
  return files;
}
export function createProject({ name, target, provider = 'both', dryRun = false, context, technologyDecision, architectureDecision, preparation, researchRequest, decisionRepo = sourceRoot }) {
  if (typeof target !== 'string' || !target.trim()) throw new Error('destino obrigatório');
  const root = resolve(target);
  const rel = relative(sourceRoot, root);
  if (!rel || (!rel.startsWith('..') && !isAbsolute(rel))) throw new Error('destino deve ficar fora do modelo');
  assertNoLinks(root);
  if (existsSync(root) && (!statSync(root).isDirectory() || readdirSync(root).length)) throw new Error('destino deve ser uma pasta vazia');
  const hostDependencies = inspectHostDependencies({ repo: sourceRoot, provider });
  const files = prepareProject({ name, provider, context, technologyDecision, architectureDecision, preparation, researchRequest, decisionRepo, hostDependencies });
  const capabilityReport = files.get('references/capability-recommendations.md');
  if (!dryRun && ['installation_required', 'verification_required'].includes(hostDependencies.status)) throw new Error(formatInstallationRequest(hostDependencies));
  for (const path of files.keys()) contained(root, path);
  if (dryRun) return { status: 'planned', name, provider, dependencies: hostDependencies, files: [...files.keys()], capability_recommendations: { path: 'references/capability-recommendations.md', content: capabilityReport, presentation_required_before_product_work: true } };
  // Recheck immediately before creating files; only explicit destinations are written.
  assertNoLinks(root);
  if (existsSync(root) && readdirSync(root).length) throw new Error('destino alterado durante planejamento');
  // Build outside the final destination, then publish the entire tree at once.
  const parent = dirname(root);
  assertNoLinks(parent); mkdirSync(parent, { recursive: true });
  const staging = mkdtempSync(resolve(parent, '.factory-create-'));
  let removedEmpty = false;
  try {
    for (const [path, text] of files) {
      const full = contained(staging, path);
      mkdirSync(dirname(full), { recursive: true }); writeFileSync(full, text, 'utf8');
    }
    assertNoLinks(root);
    if (existsSync(root)) {
      if (!statSync(root).isDirectory() || readdirSync(root).length) throw new Error('destino alterado durante preparação');
      rmdirSync(root); removedEmpty = true;
    }
    renameSync(staging, root);
  } catch (error) {
    if (removedEmpty && !existsSync(root)) mkdirSync(root);
    throw error;
  } finally { if (existsSync(staging)) rmSync(staging, { recursive: true, force: true }); }
  const readinessReport = auditToolkit(sourceRoot, { provider, hostDependencies });
  return { status: 'created', name, provider, target: root, files: files.size, dependencies: hostDependencies, readiness_report: { status: readinessReport.status, generation_status: 'generated', path: 'references/toolkit-readiness.md', content: readinessReport.content, presentation_required_before_product_work: true }, capability_recommendations: { status: 'ready', path: 'references/capability-recommendations.md', content: capabilityReport, presentation_required_before_product_work: true }, next_step: 'Apresente os relatórios de prontidão e de recomendações antes de iniciar qualquer trabalho do produto.' };
}
