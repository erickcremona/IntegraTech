import { existsSync, readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { catalog } from './governance.mjs';
import { assertNoLinks, contained } from './paths.mjs';

export const toolkitRoot = fileURLToPath(new URL('../../', import.meta.url));
export const repoRoot = resolve(toolkitRoot, '../..');
const prefix = 'tools/IntegraTech.IA.Toolkit/';
const digest = text => createHash('sha256').update(text).digest('hex');
function tree(path, output, repoPrefix) {
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    const full = join(path, entry.name);
    assertNoLinks(full);
    if (entry.isDirectory()) tree(full, output, `${repoPrefix}${entry.name}/`);
    else if (entry.isFile()) output.set(`${repoPrefix}${entry.name}`, readFileSync(full, 'utf8'));
  }
}
export function providerFiles(provider, roles, skills) {
  if (!['codex', 'claude', 'both'].includes(provider)) throw new Error('provedor de instalação inválido');
  const files = new Map();
  const instructions = '# IntegraTech — entrada CTO\n\nLeia project.json e aplique `tools/IntegraTech.IA.Toolkit/fabrica/governance.md`. Se is_model=true, use o onboarding: aproveite nome e problema já informados e pergunte somente o que falta. Adote a cópia do desenvolvedor conforme docs/inicio/adotar-projeto.md; nunca converta o repositório canônico. Se is_model=false, leia SOLUTION_CONTEXT.md e references/business-context.json e continue o projeto real sem repetir onboarding. Retomada: references/README.md. Regras do provedor não ampliam autorização.\n';
  if (provider !== 'claude') files.set('AGENTS.md', instructions);
  if (provider !== 'codex') files.set('CLAUDE.md', instructions);
  for (const [name, content] of skills) {
    if (provider !== 'claude') files.set(`.agents/skills/${name}/SKILL.md`, content);
    if (provider !== 'codex') files.set(`.claude/skills/${name}/SKILL.md`, content);
  }
  for (const role of roles) {
    const instructions = `${role.description}\nLeia tools/IntegraTech.IA.Toolkit/fabrica/governance.md e fabrica/skills/${role.skill}/SKILL.md sob o toolkit. Não delegue. Respeite ownership e aceite. ${role.read_only ? 'Somente leitura; não modificar arquivos.' : 'Implemente somente a fase e os arquivos autorizados.'}\nRetorne o contrato ${role.kind === 'reviewer' ? 'review' : 'return'} com fatos observados. Sem evidência suficiente, retorne blocked. Revisões independentes usam o dispatcher; este arquivo isoladamente não garante permissões.\n`;
    if (provider !== 'claude') files.set(`.codex/agents/${role.name}.toml`, `name = ${JSON.stringify(role.name)}\ndescription = ${JSON.stringify(role.description)}\ndeveloper_instructions = ${JSON.stringify(instructions)}\n`);
    if (provider !== 'codex') files.set(`.claude/agents/${role.name}.md`, `---\nname: ${role.name}\ndescription: ${role.description}\n${role.read_only ? 'tools: Read, Glob, Grep\npermissionMode: plan\n' : 'tools: Read, Glob, Grep, Edit, Write, Bash\n'}---\n\n${instructions}`);
  }
  return files;
}
export function expectedFiles(provider) {
  const files = new Map();
  tree(join(toolkitRoot, 'fabrica'), files, `${prefix}fabrica/`);
  tree(join(toolkitRoot, 'scripts'), files, `${prefix}scripts/`);
  for (const path of ['project.json', 'SOLUTION_CONTEXT.md', 'references/README.md', 'references/escopo-pendente.md', 'references/project-state.json', 'references/business-context.json', 'docs/inicio/primeiro-projeto.md', 'docs/inicio/adotar-projeto.md', 'docs/inicio/confiabilidade.md', 'docs/arquitetura/base.md', 'docs/arquitetura/proveniencia.md', 'THIRD-PARTY-NOTICES.md'])
    if (existsSync(join(repoRoot, path))) files.set(path, readFileSync(join(repoRoot, path), 'utf8'));
  const skills = readdirSync(join(toolkitRoot, 'fabrica/skills')).map(name => [name, readFileSync(join(toolkitRoot, 'fabrica/skills', name, 'SKILL.md'), 'utf8')]);
  for (const [name, text] of providerFiles(provider, catalog.specialists, skills)) files.set(name, text);
  return files;
}
export function install(target, provider, { dryRun = false } = {}) {
  const root = resolve(target);
  assertNoLinks(root);
  const expected = expectedFiles(provider);
  const manifestPath = contained(root, '.integratech-toolkit.json');
  const previous = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : { files: {} };
  const changed = [];
  for (const [name, text] of expected) {
    const destination = contained(root, name);
    if (!existsSync(destination)) changed.push(name);
    else {
      const current = readFileSync(destination, 'utf8');
      if (current === text) continue;
      if (previous.files?.[name] !== digest(current)) throw new Error(`conflito: ${name}; arquivo preservado`);
      changed.push(name);
    }
  }
  if (dryRun) return { status: 'planned', files: [...expected.keys()], changed: changed.length };
  for (const name of changed) {
    const destination = contained(root, name);
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, expected.get(name), 'utf8');
  }
  mkdirSync(root, { recursive: true });
  const hashes = Object.fromEntries([...expected].map(([name, text]) => [name, digest(text)]));
  writeFileSync(manifestPath, JSON.stringify({ version: 1, files: { ...previous.files, ...hashes } }, null, 2) + '\n');
  return { status: 'installed', changed: changed.length, files: [...expected.keys()] };
}
export function validateInstalled(root, provider = 'both') {
  const issues = [];
  for (const [name, text] of expectedFiles(provider)) {
    const target = contained(root, name);
    if (!existsSync(target)) issues.push(`ausente: ${name}`);
    else if (readFileSync(target, 'utf8') !== text) issues.push(`deriva: ${name}`);
  }
  return issues;
}
