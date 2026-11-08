import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync, mkdtempSync, rmSync, rmdirSync, renameSync } from 'node:fs';
import { resolve, relative, isAbsolute, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { contained, assertNoLinks } from './paths.mjs';
import { presentationFiles, presentationNames } from './presentation-templates.mjs';
import { selectionForGeneration } from './technology-decision.mjs';
import { specialistFiles } from './domain-specialist.mjs';
import { verifyResearch, verifyTechnologySources } from './domain-research.mjs';
import { normalizeInitialContext } from './business-context.mjs';
import { selectedProviders, providerLabel } from './provider-selection.mjs';
import { providerFiles } from './installer.mjs';

const sourceRoot = fileURLToPath(new URL('../../../../', import.meta.url));
export function prepareProject({ name, provider = 'both', presentation, source = sourceRoot, context, technologyDecision, preparation, researchRequest, decisionRepo = source }) {
  if (!technologyDecision) throw new Error('Decisão tecnológica pesquisada e aprovada obrigatória; apresentação manual não dispensa pesquisa.');
  presentation = selectionForGeneration({ decision: technologyDecision, context, repo: decisionRepo, presentation });
  verifyTechnologySources(technologyDecision, preparation);
  verifyResearch({ context, preparation, request: researchRequest });
  if (typeof name !== 'string' || !/^[A-Z][A-Za-z0-9]{0,49}$/.test(name)
    || /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9]|System|Microsoft|Console|Program)$/i.test(name)) throw new Error('nome inválido: use PascalCase alfanumérico, sem nomes reservados');
  selectedProviders(provider);
  if ( !Object.hasOwn(presentationNames, presentation)) throw new Error('provedor/apresentação inválidos');
  const identity = JSON.parse(readFileSync(resolve(source, 'project.json'), 'utf8'));
  const manifest = JSON.parse(readFileSync(contained(source, `tools/${identity.name}.IA.Toolkit/fabrica/project-template.json`), 'utf8'));
  const slug = name.toLowerCase();
  const render = text => text.replaceAll(identity.name, name).replaceAll(identity.slug, slug);
  const renderHost = text => render(text).replaceAll(`.Apresentacao.${presentationNames[identity.presentation]}`, `.Apresentacao.${presentationNames[presentation]}`);
  const files = new Map();
  const sourceSkills = [];
  for (const path of manifest.files) {
    if (typeof path !== 'string' || /(^|\/)(?:\.git|\.scratch|\.vs|bin|obj|secrets|node_modules|qa-artifacts|runtime-publish)(?:\/|$)/i.test(path)) throw new Error('manifesto inválido');
    if (path.endsWith('/template-baseline.json')) continue;
    if (['AGENTS.md', 'CLAUDE.md'].includes(path) || /^\.(?:codex|agents|claude|cursor)\//.test(path)) continue;
    // Presentation sources are generated from reviewed templates, never copied from a customized host.
    if (path.startsWith(`src/${identity.name}.Apresentacao/`) || path === `tests/${identity.name}.Arquitetura.Tests/Program.cs`) continue;
    const origin = contained(source, path);
    const stat = statSync(origin);
    if (!stat.isFile() || stat.size > 1024 * 1024) throw new Error('origem inválida');
    const text = new TextDecoder('utf-8', { fatal: true }).decode(readFileSync(origin));
    const skill = path.match(/\/fabrica\/skills\/([^/]+)\/SKILL\.md$/);
    if (skill) sourceSkills.push([skill[1], text]);
    const destination = renderHost(path);
    if (files.has(destination)) throw new Error('colisão de arquivos');
    files.set(destination, path === 'THIRD-PARTY-NOTICES.md' ? text : /\.(?:sln|csproj)$/.test(path) || path.endsWith('/project-template.json') ? renderHost(text) : render(text));
  }
  const rolesPath = manifest.files.find(path => path.endsWith('/fabrica/team/catalog.yaml'));
  const roles = JSON.parse(readFileSync(contained(source, rolesPath), 'utf8')).specialists;
  for (const [path, text] of providerFiles(provider, roles, sourceSkills)) files.set(render(path), render(text));
  for (const [path, text] of presentationFiles(name, presentation)) files.set(path, text);
  files.set('docs/arquitetura/base.md', `# Arquitetura ${name}\n\nApresentação: ${presentation}. Domínio: ${preparation.assessment.domain}. Consulte references/business-context.json e a skill indicada em references/domain-specialist.json antes de desenhar funcionalidades.\n\n| Camada | Referências |\n|---|---|\n| Apresentação.${presentationNames[presentation]} | Aplicação, Infra.CrossCutting.IoC |\n| Aplicação | Domínio |\n| Domínio | Nenhuma |\n| Infra.Data | Domínio |\n| Infra.Service | Aplicação, Domínio |\n| Infra.CrossCutting.IoC | Aplicação, Domínio, Infra.Data, Infra.Service |\n\nO host usa composição de dependências pelo IoC. Não há casos de uso, banco, autenticação ou integrações configurados. O teste em tests/${name}.Arquitetura.Tests verifica o ciclo de vida real do host.\n\nO núcleo compartilhado da fábrica fica em tools/${name}.IA.Toolkit/fabrica. Consulte ../inicio/primeiro-projeto.md para descobrir o negócio e validar os gates. Nenhuma evidência ou aprovação do modelo foi herdada.\n`);
  files.set('SOLUTION_CONTEXT.md', `# ${name} — contexto do projeto\n\nProjeto real com contexto pesquisado em references/business-context.json e references/domain-preparation.json. Especialista registrado em references/domain-specialist.json. Leia-o antes de cada desenho e registre sua consulta. Problema: ${context.problem}\n\nMaterialização não aprova funcionalidades. Os gates de plano e aceite continuam aplicáveis. Conclua revisão/otimização global com coherence-run e coherence-check.\n`);
  files.set('project.json', JSON.stringify({ schema_version: 1, name, slug, presentation, provider, is_model: false }, null, 2) + '\n');
  files.set('references/project-state.json', JSON.stringify({ schema_version: 1, scope_status: 'pending', plan_gate: 'pending', active_phase: 'discovery', context_path: 'references/business-context.json', plan_path: null, approval_path: null, business_implementation: 'blocked_until_scope_and_plan', external_actions_authorized: false }, null, 2) + '\n');
  files.set('references/business-context.json', JSON.stringify({ schema_version: 1, problem: '', current_situation: '', stakeholders: [], desired_outcomes: [], success_criteria: [], scope: [], out_of_scope: [], known_rules: [], data: [], constraints: [], integrations: [], open_questions: [], assumptions: [] }, null, 2) + '\n');
  files.set('README.md', `# ${name}\n\nBase .NET 8 em camadas, apresentação ${presentationNames[presentation]} e fábrica de desenvolvimento para ${providerLabel(provider)}. O problema de negócio ainda não foi definido.\n\nComece por [docs/inicio/primeiro-projeto.md](docs/inicio/primeiro-projeto.md) e preencha references/business-context.json com a fábrica.\n\n\x60\x60\x60powershell\ndotnet build ${name}.sln --disable-build-servers -m:1\ndotnet run --project tests/${name}.Arquitetura.Tests --no-build\nnpm test\nnpm run check\nnpm run toolkit -- precheck --phase discovery\n\x60\x60\x60\n\nNenhum remoto, credencial, aprovação ou evidência de outro projeto foi herdado.\n`);
  if (context !== undefined) files.set('references/business-context.json', JSON.stringify(normalizeInitialContext(context), null, 2) + '\n');
  if (technologyDecision !== undefined) {
    const decision = structuredClone(technologyDecision);
    const evidence = readFileSync(contained(decisionRepo, decision.approval.source_reference), 'utf8');
    decision.approval.source_reference = 'references/technology-approval.md';
    files.set('references/technology-approval.md', evidence);
    files.set('references/technology-decision.json', JSON.stringify(decision, null, 2) + '\n');
    const state = JSON.parse(files.get('references/project-state.json'));
    state.technology_decision_path = 'references/technology-decision.json';
    files.set('references/project-state.json', JSON.stringify(state, null, 2) + '\n');
    files.set('README.md', files.get('README.md').replace('O problema de negócio ainda não foi definido.', 'Contexto e decisão tecnológica registrados em references/.'));
  }
  for (const [path, text] of specialistFiles({ name, provider, context, preparation })) files.set(path, text);
  const finalState = JSON.parse(files.get('references/project-state.json'));
  finalState.specialist_path = 'references/domain-specialist.json';
  finalState.workflow_status = 'materialized';
  files.set('references/project-state.json', JSON.stringify(finalState, null, 2) + '\n');
  return files;
}
export function createProject({ name, target, provider = 'both', presentation, dryRun = false, context, technologyDecision, preparation, researchRequest, decisionRepo = sourceRoot }) {
  if (typeof target !== 'string' || !target.trim()) throw new Error('destino obrigatório');
  const root = resolve(target);
  const rel = relative(sourceRoot, root);
  if (!rel || (!rel.startsWith('..') && !isAbsolute(rel))) throw new Error('destino deve ficar fora do modelo');
  assertNoLinks(root);
  if (existsSync(root) && (!statSync(root).isDirectory() || readdirSync(root).length)) throw new Error('destino deve ser uma pasta vazia');
  const files = prepareProject({ name, provider, presentation, context, technologyDecision, preparation, researchRequest, decisionRepo });
  presentation = JSON.parse(files.get('project.json')).presentation;
  for (const path of files.keys()) contained(root, path);
  if (dryRun) return { status: 'planned', name, presentation, provider, files: [...files.keys()] };
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
  return { status: 'created', name, presentation, provider, target: root, files: files.size, next_step: 'Projeto materializado; revisar, otimizar e executar coherence-check antes de concluir o fluxo.' };
}
