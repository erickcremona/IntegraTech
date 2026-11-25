import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { inspectHostDependencies } from './host-dependencies.mjs';

const providers = ['codex', 'claude', 'cursor'];
const readJson = path => JSON.parse(readFileSync(path, 'utf8'));

export function toolkitSourceFingerprint(repo) {
  const identity = readJson(join(repo, 'project.json'));
  const baselinePath = `tools/${identity.name}.IA.Toolkit/fabrica/template-baseline.json`;
  const baselineText = readFileSync(join(repo, baselinePath), 'utf8').replace(/\r\n/g, '\n');
  const baseline = JSON.parse(baselineText);
  const hash = createHash('sha256').update(baselineText);
  for (const path of Object.keys(baseline.files).sort()) {
    hash.update(`\0${path}\0`);
    hash.update(readFileSync(join(repo, path)).toString('utf8').replace(/\r\n/g, '\n'));
  }
  return hash.digest('hex');
}

export function auditToolkit(repo, { provider, hostDependencies } = {}) {
  const toolkit = join(repo, 'tools/IntegraTech.IA.Toolkit');
  const factory = join(toolkit, 'fabrica');
  const catalog = readJson(join(factory, 'team/catalog.yaml'));
  const roles = catalog.specialists;
  const routeEntries = Object.entries(catalog.routes);
  const roleNames = new Set(roles.map(role => role.name));
  const skills = [...new Set(roles.map(role => role.skill))].sort();
  const missingSkills = skills.filter(skill => !existsSync(join(factory, 'skills', skill, 'SKILL.md')));
  const invalidRoutes = routeEntries.filter(([, role]) => !roleNames.has(role));
  const missingProviders = providers.filter(provider => !existsSync(join(factory, 'providers', `${provider}.json`)));
  const schemas = readdirSync(join(factory, 'team/contracts')).filter(name => name.endsWith('.schema.json')).sort();
  const tests = readdirSync(join(toolkit, 'tests')).filter(name => name.endsWith('.test.mjs')).sort();
  const cliSource = readFileSync(join(toolkit, 'scripts/toolkit.mjs'), 'utf8');
  const help = cliSource.match(/const help = `([\s\S]*?)`;/)?.[1] ?? '';
  const commands = help.split(/\r?\n/).flatMap(line => {
    const match = line.match(/^  ([a-z][a-z0-9-]*)\b/);
    return match ? [match[1]] : [];
  });
  let verification = null;
  try {
    const evidence = readJson(join(repo, '.scratch/toolkit-verification.json'));
    if (evidence.status === 'passed' && evidence.source_sha256 === toolkitSourceFingerprint(repo)) verification = evidence;
  } catch { /* Missing, stale, or malformed evidence is reported as unavailable. */ }
  const dependencies = typeof hostDependencies === 'function' ? hostDependencies() : hostDependencies ?? inspectHostDependencies({ repo, provider });
  const issues = [
    ...missingSkills.map(skill => `Skill ausente: ${skill}`),
    ...invalidRoutes.map(([route, role]) => `Rota ${route} aponta para papel ausente: ${role}`),
    ...missingProviders.map(provider => `Perfil de provedor ausente: ${provider}`)
  ];
  const structuralStatus = issues.length ? 'blocked' : 'passed';
  const status = issues.length ? 'blocked'
    : dependencies.status === 'installation_required' ? 'installation_required'
      : dependencies.status === 'verification_required' ? 'verification_required'
        : verification ? 'ready' : 'verification_required';
  const routeTable = routeEntries.map(([route, roleName]) => {
    const role = roles.find(item => item.name === roleName);
    return `| ${route} | ${roleName} | ${role?.description ?? 'papel ausente'} | ${role?.skill ?? 'ausente'} | ${role?.read_only ? 'somente leitura' : 'execução conforme fase e autorização'} |`;
  }).join('\n');
  const skillTable = skills.map(skill => {
    const skillPath = join(factory, 'skills', skill, 'SKILL.md');
    const text = existsSync(skillPath) ? readFileSync(skillPath, 'utf8') : '';
    const description = text.match(/^description:\s*(.+)$/m)?.[1]?.replace(/^['"]|['"]$/g, '') ?? 'descrição ausente';
    const linkedRoles = roles.filter(role => role.skill === skill).map(role => role.name).join(', ');
    return `| ${skill} | ${description} | ${linkedRoles} |`;
  }).join('\n');
  const issueText = issues.length ? issues.map(issue => `- ${issue}`).join('\n') : '- Nenhuma inconsistência estrutural detectada no inventário analisado.';
  const dynamicStatus = verification
    ? `npm run verify passou em ${verification.completed_at} (${verification.checks.length} verificações; origem vinculada por SHA-256 ${verification.source_sha256}).`
    : 'sem evidência atual para esta versão do toolkit; execute npm run verify antes de adotar.';
  const content = `# Relatório de prontidão do toolkit

Status: **${status}**

Este relatório é gerado durante a criação/adoção e deve ser apresentado ao usuário antes de iniciar trabalho de produto. Ele inspeciona o inventário versionado desta cópia; não representa execução ao vivo de provedores, sistemas externos ou todos os cenários funcionais.

## Cobertura inspecionada

- Papéis especializados: ${roles.length}
- Skills distintas referenciadas: ${skills.length}
- Rotas catalogadas: ${routeEntries.length}
- Comandos documentados na CLI: ${commands.length}
- Contratos JSON Schema presentes: ${schemas.length}
- Provedores com perfil configurado: ${providers.length - missingProviders.length}/${providers.length} (${providers.join(', ')})
- Arquivos de teste automatizado disponíveis: ${tests.length}

## Skills e papéis associados

| Skill | Propósito declarado | Papéis |
|---|---|---|
${skillTable}

## Rotas e responsabilidades

| Rota | Papel | Propósito do papel | Skill | Limite operacional |
|---|---|---|---|---|
${routeTable}

## Comandos, contratos e testes disponíveis

- Comandos CLI: ${commands.join(', ')}
- Contratos: ${schemas.map(name => name.replace(/\.schema\.json$/, '')).join(', ')}
- Arquivos de teste: ${tests.join(', ')}

## Integridade estrutural

${issueText}

## Pré-requisitos do ambiente

- Estado: **${dependencies.status}** (seleção de provedor: ${dependencies.provider_selection}).
- Dependências obrigatórias: ${dependencies.checks.map(item => `${item.id}=${item.status}`).join(', ')}.
- Provedores: ${dependencies.providers.map(item => `${item.id}=${item.status}`).join(', ')}.
- Plugins externos: ${dependencies.plugins.status}; ${dependencies.plugins.note}
- Autenticação: ${dependencies.authentication}.
${dependencies.installation_requests.length ? `- Solicitações/sugestões de instalação:\n${dependencies.installation_requests.map(item => `  - ${item.dependency}${item.required ? ' (obrigatória)' : item.capability ? ` (opcional para ${item.capability})` : ' (opcional)'}: ${item.command ?? 'consulte a fonte oficial'} (${item.source ?? 'fonte oficial indisponível no catálogo local'})`).join('\n')}` : '- Nenhuma dependência obrigatória ausente detectada.'}

## Evidência e limites

- Verificações estruturais executadas ao gerar o relatório: papéis referenciados, skills existentes, destinos das rotas e perfis de provedores.
- Validação dinâmica completa: ${dynamicStatus}
- Quando uma verificação falha, corrija a causa no modelo e repita npm run verify. A adoção só deve avançar após resultado aprovado e vinculado ao conteúdo atual.
- Os arquivos de teste são inventário, não prova de execução; somente a evidência acima atesta uma execução vinculada ao estado atual.
- Este inventário não comprova credenciais, autenticação de provedores, isolamento efetivo, acesso de rede, integrações externas nem comportamento de produção. A verificação de dependências detecta executáveis/versões e flags locais; Cursor opera pela sessão nativa do editor e não possui revisão automatizada neste toolkit.
- Status estrutural aprovado significa apenas que as verificações estruturais deste relatório passaram; a validação funcional e operacional depende do ciclo de verificação e das evidências próprios do produto.
`;
  return { status, structural_status: structuralStatus, issues, content, verification, dependencies };
}
