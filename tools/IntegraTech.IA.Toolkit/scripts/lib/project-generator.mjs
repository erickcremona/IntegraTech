import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, relative, isAbsolute, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { contained, assertNoLinks } from './paths.mjs';
import { presentationFiles, presentationNames } from './presentation-templates.mjs';
import { providerFiles } from './installer.mjs';

const sourceRoot = fileURLToPath(new URL('../../../../', import.meta.url));
export function prepareProject({ name, provider = 'both', presentation = 'worker', source = sourceRoot }) {
  if (typeof name !== 'string' || !/^[A-Z][A-Za-z0-9]{0,49}$/.test(name)
    || /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9]|System|Microsoft|Console|Program)$/i.test(name)) throw new Error('nome inválido: use PascalCase alfanumérico, sem nomes reservados');
  if (!['both', 'codex', 'claude'].includes(provider) || !Object.hasOwn(presentationNames, presentation)) throw new Error('provedor/apresentação inválidos');
  const identity = JSON.parse(readFileSync(resolve(source, 'project.json'), 'utf8'));
  const manifest = JSON.parse(readFileSync(contained(source, `tools/${identity.name}.IA.Toolkit/fabrica/project-template.json`), 'utf8'));
  const slug = name.toLowerCase();
  const render = text => text.replaceAll(identity.name, name).replaceAll(identity.slug, slug)
    .replaceAll(`.Apresentacao.${presentationNames[identity.presentation]}`, `.Apresentacao.${presentationNames[presentation]}`);
  const files = new Map();
  const sourceSkills = [];
  for (const path of manifest.files) {
    if (typeof path !== 'string' || /(^|\/)(?:\.git|\.scratch|\.vs|bin|obj|secrets|node_modules|qa-artifacts|runtime-publish)(?:\/|$)/i.test(path)) throw new Error('manifesto inválido');
    if (path.endsWith('/template-baseline.json')) continue;
    if (['AGENTS.md', 'CLAUDE.md'].includes(path) || /^\.(?:codex|agents|claude)\//.test(path)) continue;
    // Presentation sources are generated from reviewed templates, never copied from a customized host.
    if (path.startsWith(`src/${identity.name}.Apresentacao/`) || path === `tests/${identity.name}.Arquitetura.Tests/Program.cs`) continue;
    const origin = contained(source, path);
    const stat = statSync(origin);
    if (!stat.isFile() || stat.size > 1024 * 1024) throw new Error('origem inválida');
    const text = new TextDecoder('utf-8', { fatal: true }).decode(readFileSync(origin));
    const skill = path.match(/\/fabrica\/skills\/([^/]+)\/SKILL\.md$/);
    if (skill) sourceSkills.push([skill[1], text]);
    const destination = render(path);
    if (files.has(destination)) throw new Error('colisão de arquivos');
    files.set(destination, path === 'THIRD-PARTY-NOTICES.md' ? text : render(text));
  }
  const rolesPath = manifest.files.find(path => path.endsWith('/fabrica/team/catalog.yaml'));
  const roles = JSON.parse(readFileSync(contained(source, rolesPath), 'utf8')).specialists;
  for (const [path, text] of providerFiles(provider, roles, sourceSkills)) files.set(render(path), render(text));
  for (const [path, text] of presentationFiles(name, presentation)) files.set(path, text);
  files.set('docs/arquitetura/base.md', `# Arquitetura ${name}\n\nApresentação: ${presentation}. O domínio ainda será definido pelo problema de negócio.\n\n| Camada | Referências |\n|---|---|\n| Apresentação.${presentationNames[presentation]} | Aplicação, Infra.CrossCutting.IoC |\n| Aplicação | Domínio |\n| Domínio | Nenhuma |\n| Infra.Data | Domínio |\n| Infra.Service | Aplicação, Domínio |\n| Infra.CrossCutting.IoC | Aplicação, Domínio, Infra.Data, Infra.Service |\n\nO host usa composição de dependências pelo IoC. Não há casos de uso, banco, autenticação ou integrações configurados. O teste em tests/${name}.Arquitetura.Tests verifica o ciclo de vida real do host.\n\nO núcleo compartilhado da fábrica fica em tools/${name}.IA.Toolkit/fabrica. Consulte ../inicio/primeiro-projeto.md para descobrir o negócio e validar os gates. Nenhuma evidência ou aprovação do modelo foi herdada.\n`);
  files.set('project.json', JSON.stringify({ schema_version: 1, name, slug, presentation, provider, is_model: false }, null, 2) + '\n');
  files.set('references/project-state.json', JSON.stringify({ schema_version: 1, scope_status: 'pending', plan_gate: 'pending', active_phase: 'discovery', context_path: 'references/business-context.json', plan_path: null, approval_path: null, business_implementation: 'blocked_until_scope_and_plan', external_actions_authorized: false }, null, 2) + '\n');
  files.set('references/business-context.json', JSON.stringify({ schema_version: 1, problem: '', current_situation: '', stakeholders: [], desired_outcomes: [], success_criteria: [], scope: [], out_of_scope: [], known_rules: [], data: [], constraints: [], integrations: [], open_questions: [], assumptions: [] }, null, 2) + '\n');
  files.set('README.md', `# ${name}\n\nBase .NET 8 em camadas, apresentação ${presentationNames[presentation]} e fábrica de desenvolvimento para ${provider === 'both' ? 'Codex e Claude Code' : provider}. O problema de negócio ainda não foi definido.\n\nComece por [docs/inicio/primeiro-projeto.md](docs/inicio/primeiro-projeto.md) e preencha references/business-context.json com a fábrica.\n\n\x60\x60\x60powershell\ndotnet build ${name}.sln --disable-build-servers -m:1\ndotnet run --project tests/${name}.Arquitetura.Tests --no-build\nnpm test\nnpm run check\nnpm run toolkit -- precheck --phase discovery\n\x60\x60\x60\n\nNenhum remoto, credencial, aprovação ou evidência de outro projeto foi herdado.\n`);
  return files;
}
export function createProject({ name, target, provider = 'both', presentation = 'worker', dryRun = false }) {
  if (typeof target !== 'string' || !target.trim()) throw new Error('destino obrigatório');
  const root = resolve(target);
  const rel = relative(sourceRoot, root);
  if (!rel || (!rel.startsWith('..') && !isAbsolute(rel))) throw new Error('destino deve ficar fora do modelo');
  assertNoLinks(root);
  if (existsSync(root) && (!statSync(root).isDirectory() || readdirSync(root).length)) throw new Error('destino deve ser uma pasta vazia');
  const files = prepareProject({ name, provider, presentation });
  for (const path of files.keys()) contained(root, path);
  if (dryRun) return { status: 'planned', name, presentation, provider, files: [...files.keys()] };
  // Recheck immediately before creating files; only explicit destinations are written.
  assertNoLinks(root);
  if (existsSync(root) && readdirSync(root).length) throw new Error('destino alterado durante planejamento');
  mkdirSync(root, { recursive: true });
  for (const [path, text] of files) {
    const full = contained(root, path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, text, { encoding: 'utf8', flag: 'wx' });
  }
  return { status: 'created', name, presentation, provider, target: root, files: files.size, next_step: 'Descreva o problema de negócio em references/business-context.json com a fábrica.' };
}
