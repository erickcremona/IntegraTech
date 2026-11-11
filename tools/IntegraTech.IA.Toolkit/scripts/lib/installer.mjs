import { existsSync, readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { selectedProviders } from './provider-selection.mjs';
import { catalog } from './governance.mjs';
import { assertNoLinks, contained } from './paths.mjs';

export const toolkitRoot = fileURLToPath(new URL('../../', import.meta.url));
export const repoRoot = resolve(toolkitRoot, '../..');
const prefix = 'tools/IntegraTech.IA.Toolkit/';
const digest = text => createHash('sha256').update(text).digest('hex');
const normalizeLineEndings = text => text.replace(/\r\n/g, '\n');
function tree(path, output, repoPrefix) {
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    const full = join(path, entry.name);
    assertNoLinks(full);
    if (entry.isDirectory()) tree(full, output, `${repoPrefix}${entry.name}/`);
    else if (entry.isFile()) output.set(`${repoPrefix}${entry.name}`, readFileSync(full, 'utf8'));
  }
}
export function providerFiles(provider, roles, skills, { productName } = {}) {
  const selected = selectedProviders(provider);
  const codex = selected.includes('codex'), claude = selected.includes('claude'), cursor = selected.includes('cursor');
  const files = new Map();
  const instructions = productName ? `# ${productName} — produto em desenvolvimento\n\nContinue o produto existente. Pedidos de imagem/animação seguem docs/inicio/design-grafico.md e graphic-designer sem exigir nome técnico do usuário. Leia project.json, SOLUTION_CONTEXT.md, references/business-context.json e references/project-state.json; aplique tools/IntegraTech.IA.Toolkit/fabrica/governance.md. Consulte o especialista registrado antes de desenhar, revalide plano/aceites antes de implementar e use references/README.md na retomada. Não repetir onboarding, renomeação ou adoção. Atualize a documentação deste produto com suas decisões e evolução. Regras do provedor não ampliam autorização.\n` : '# IntegraTech — entrada CTO\n\nLeia project.json e aplique `tools/IntegraTech.IA.Toolkit/fabrica/governance.md`. Para pedidos de imagem/animação, reconheça a intenção pela conversa e siga docs/inicio/design-grafico.md: carregue a skill e coordene graphic-designer sem exigir nome de agente/skill ou onboarding. Se o pedido é manter um sistema existente com fonte externo, leia docs/inicio/sistemas-existentes.md, solicite seu local se faltar e use vínculo separado; não adote o modelo sobre o legado. Se is_model=true, use o onboarding: aproveite nome e problema já informados e pergunte somente o que falta. Adote a cópia do desenvolvedor conforme docs/inicio/adotar-projeto.md; nunca converta o repositório canônico. Se is_model=false, leia SOLUTION_CONTEXT.md e references/business-context.json e continue o projeto real sem repetir onboarding. Antes de criar/adotar, siga docs/inicio/especialista-dominio.md; bloqueie contexto incompleto ou pesquisa indisponível. Antes de desenhar, consulte o especialista registrado e valide sua consulta. Finalize com revisão/otimização global e coherence-check. Retomada: references/README.md. Regras do provedor não ampliam autorização.\n';
  if (codex || cursor) files.set('AGENTS.md', instructions);
  if (claude) files.set('CLAUDE.md', instructions);
  if (cursor) files.set('.cursor/rules/integratech.mdc', `---\ndescription: Entrada e governança da fábrica IntegraTech\nalwaysApply: true\n---\n\n${instructions}\nUse as skills de .cursor/skills e o núcleo em tools/IntegraTech.IA.Toolkit/fabrica. ${productName?'Continue o contexto e o estado deste produto; criação/adoção não são passos de retomada.':'Ao criar ou adotar pelo Cursor, selecione --provider cursor ou --provider all conforme as ferramentas desejadas.'} Regras e perfis são instruções; não concedem permissões de execução.\n`);
  for (const [name, content] of skills) {
    if (codex) files.set(`.agents/skills/${name}/SKILL.md`, content);
    if (claude) files.set(`.claude/skills/${name}/SKILL.md`, content);
    if (cursor) files.set(`.cursor/skills/${name}/SKILL.md`, content);
  }
  for (const role of roles) {
    const instructions = `${role.description}\nLeia tools/IntegraTech.IA.Toolkit/fabrica/governance.md e fabrica/skills/${role.skill}/SKILL.md sob o toolkit. Não delegue. Respeite ownership e aceite. ${role.read_only ? 'Somente leitura; não modificar arquivos.' : 'Implemente somente a fase e os arquivos autorizados.'}\nRetorne o contrato ${role.kind === 'reviewer' ? 'review' : 'return'} com fatos observados. Sem evidência suficiente, retorne blocked. Revisões independentes usam o dispatcher; este arquivo isoladamente não garante permissões.\n`;
    if (codex) files.set(`.codex/agents/${role.name}.toml`, `name = ${JSON.stringify(role.name)}\ndescription = ${JSON.stringify(role.description)}\ndeveloper_instructions = ${JSON.stringify(instructions)}\n`);
    if (claude) files.set(`.claude/agents/${role.name}.md`, `---\nname: ${role.name}\ndescription: ${role.description}\n${role.read_only ? 'tools: Read, Glob, Grep\npermissionMode: plan\n' : 'tools: Read, Glob, Grep, Edit, Write, Bash\n'}---\n\n${instructions}`);
    if (cursor) files.set(`.cursor/agents/${role.name}.md`, `---\nname: ${role.name}\ndescription: ${JSON.stringify(role.description)}\n---\n\n${instructions}\nUse a skill .cursor/skills/${role.skill}/SKILL.md. Cursor executa o fluxo na sessão nativa do editor. O dispatcher automatizado deste toolkit aceita somente Codex/Claude; este perfil não estabelece isolamento técnico nem habilita automação Cursor.\n`);
  }
  return files;
}
export function expectedFiles(provider) {
  const files = new Map();
  tree(join(toolkitRoot, 'fabrica'), files, `${prefix}fabrica/`);
  tree(join(toolkitRoot, 'scripts'), files, `${prefix}scripts/`);
  for (const path of ['project.json', 'SOLUTION_CONTEXT.md', 'references/README.md', 'references/traceability-graph.json', 'references/escopo-pendente.md', 'references/project-state.json', 'references/business-context.json', 'docs/inicio/primeiro-projeto.md', 'docs/inicio/sdd.md', 'docs/inicio/publicacao.md', 'docs/inicio/design-grafico.md', 'docs/inicio/sistemas-existentes.md', 'docs/inicio/fluxo-toolkit.md', 'docs/inicio/interfaces.md', 'docs/inicio/grafo-rastreabilidade.md', 'docs/inicio/adotar-projeto.md', 'docs/inicio/confiabilidade.md', 'docs/inicio/loop-engenharia.md', 'docs/inicio/decisao-tecnologica.md', 'docs/inicio/especialista-dominio.md', 'docs/inicio/cursor.md', 'docs/arquitetura/base.md', 'docs/arquitetura/proveniencia.md', 'THIRD-PARTY-NOTICES.md', 'AUTHORS.md'])
    if (existsSync(join(repoRoot, path))) files.set(path, readFileSync(join(repoRoot, path), 'utf8'));
  const skills = readdirSync(join(toolkitRoot, 'fabrica/skills')).map(name => [name, readFileSync(join(toolkitRoot, 'fabrica/skills', name, 'SKILL.md'), 'utf8')]);
  const identity = JSON.parse(readFileSync(join(repoRoot,'project.json'),'utf8'));
  for (const [name, text] of providerFiles(provider, catalog.specialists, skills, {productName:identity.is_model===false?identity.name:undefined})) files.set(name, text);
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
  writeFileSync(manifestPath, JSON.stringify({ version: 1, provider, files: { ...previous.files, ...hashes } }, null, 2) + '\n');
  return { status: 'installed', changed: changed.length, files: [...expected.keys()] };
}
export function validateInstalled(root, provider) {
  if (provider === undefined) {
    const manifest = contained(root, '.integratech-toolkit.json');
    const installed = existsSync(manifest) ? JSON.parse(readFileSync(manifest, 'utf8')) : {};
    provider = installed.provider ?? JSON.parse(readFileSync(contained(root, 'project.json'), 'utf8')).provider;
  }
  const issues = [];
  for (const [name, text] of expectedFiles(provider)) {
    const target = contained(root, name);
    if (!existsSync(target)) issues.push(`ausente: ${name}`);
    else if (normalizeLineEndings(readFileSync(target, 'utf8')) !== normalizeLineEndings(text)) issues.push(`deriva: ${name}`);
  }
  return issues;
}
