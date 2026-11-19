import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { runProcess } from './providers.mjs';
import { selectedProviders } from './provider-selection.mjs';

const readJson = path => {
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return undefined; }
};
const validSegment = value => typeof value === 'string' && /^[a-z][a-z0-9-]{0,63}$/.test(value);
const skillPaths = {
  codex: name => `.agents/skills/${name}/SKILL.md`,
  claude: name => `.claude/skills/${name}/SKILL.md`,
  cursor: name => `.cursor/skills/${name}/SKILL.md`
};
const agentPaths = {
  codex: name => `.codex/agents/${name}.toml`,
  claude: name => `.claude/agents/${name}.md`,
  cursor: name => `.cursor/agents/${name}.md`
};

export async function diagnoseLocalSetup({ repo, nodeVersion = process.version, runner = runProcess } = {}) {
  const root = resolve(repo ?? process.cwd());
  const numericVersion = String(nodeVersion).replace(/^v/, '').split('.').map(Number);
  const major = numericVersion[0];
  const runtime = {
    status: Number.isInteger(major) ? major >= 22 ? 'ready' : 'unsupported' : 'unknown',
    version: String(nodeVersion), minimum: '22'
  };
  const curlResult = await runner({ command: 'curl', args: ['--version'], timeoutMs: 5000 });
  const curlOutput = curlResult.code === 0 && !curlResult.timedOut && !curlResult.overflow ? curlResult.stdout : '';
  const tools = { curl: curlOutput
    ? { status: 'available', version: curlOutput.match(/curl\s+([\d][\w.-]*)/i)?.[1] ?? null }
    : { status: 'missing' } };

  const identity = readJson(join(root, 'project.json'));
  const projectName = typeof identity?.name === 'string' && /^[A-Za-z][A-Za-z0-9]{0,49}$/.test(identity.name) ? identity.name : null;
  const providerSelection = identity?.provider;
  const toolkit = projectName ? join(root, 'tools', `${projectName}.IA.Toolkit`) : null;
  const factory = toolkit && join(toolkit, 'fabrica');
  const catalog = factory && readJson(join(factory, 'team/catalog.yaml'));
  const template = factory && readJson(join(factory, 'project-template.json'));
  const catalogEntries = Array.isArray(catalog?.specialists) ? catalog.specialists : [];
  const roles = catalogEntries.filter(role => validSegment(role?.name) && validSegment(role?.skill));
  let selected = [];
  try { selected = selectedProviders(providerSelection); } catch { /* Report invalid or missing setup below. */ }
  const coreSkills = new Set(roles.map(role => role.skill));
  for (const path of Array.isArray(template?.files) ? template.files : []) {
    const match = typeof path === 'string' && path.match(/\/fabrica\/skills\/([^/]+)\/SKILL\.md$/);
    if (match && validSegment(match[1])) coreSkills.add(match[1]);
  }
  const missingCoreSkills = [...coreSkills].filter(skill => !existsSync(join(factory ?? '', 'skills', skill, 'SKILL.md'))).sort();
  const missingSkills = [];
  const missingAgents = [];
  const missingEntrypoints = [];
  if (selected.length && factory && roles.length) {
    for (const provider of selected) {
      for (const skill of [...coreSkills].sort()) if (!existsSync(join(root, skillPaths[provider](skill)))) missingSkills.push({ provider, skill, path: skillPaths[provider](skill) });
      for (const role of roles) if (!existsSync(join(root, agentPaths[provider](role.name)))) missingAgents.push({ provider, agent: role.name, path: agentPaths[provider](role.name) });
      const entrypoints = provider === 'codex' ? ['AGENTS.md']
        : provider === 'claude' ? ['CLAUDE.md']
          : ['AGENTS.md', '.cursor/rules/integratech.mdc'];
      for (const path of entrypoints) if (!existsSync(join(root, path))) missingEntrypoints.push({ provider, path });
    }
  }

  const configurationErrors = [];
  if (!projectName) configurationErrors.push('project.json ausente ou nome de fábrica inválido.');
  if (!selected.length) configurationErrors.push('Provedor ausente ou inválido em project.json.');
  if (!roles.length) configurationErrors.push('Catálogo de agentes ausente ou inválido.');
  if (roles.length !== catalogEntries.length) configurationErrors.push('Catálogo contém identificador inválido de agente ou skill.');
  const adapterStatus = configurationErrors.length || missingCoreSkills.length ? 'unknown'
    : missingSkills.length || missingAgents.length || missingEntrypoints.length ? 'degraded' : 'ready';
  const adapters = { status: adapterStatus, provider_selection: providerSelection ?? null,
    providers: selected, missing_core_skills: missingCoreSkills,
    missing_skills: missingSkills, missing_agents: missingAgents,
    missing_entrypoints: missingEntrypoints, errors: configurationErrors };
  const instructions = [];
  if (runtime.status === 'unsupported' || runtime.status === 'unknown') instructions.push('Instale Node.js 22 ou superior e reabra o terminal: https://nodejs.org/');
  if (tools.curl.status === 'missing') instructions.push('Instale curl pelo gerenciador de pacotes do seu sistema operacional ou use https://curl.se/download.html; pesquisa externa ficará bloqueada até então.');
  if (missingCoreSkills.length) instructions.push(`Skill(s) do núcleo ausente(s): ${missingCoreSkills.join(', ')}. Restaure da cópia oficial do IntegraTech antes das tarefas que dependam dessa especialização.`);
  if (missingSkills.length || missingAgents.length || missingEntrypoints.length) instructions.push(`Revise e simule a recuperação com: npm run toolkit -- install --provider ${providerSelection} --dry-run. Resolva qualquer conflito antes de executar sem --dry-run; personalizações são preservadas.`);
  if (configurationErrors.length) instructions.push('Confira project.json, o catálogo e a integridade da pasta tools/<Nome>.IA.Toolkit.');
  const status = runtime.status === 'ready' && adapterStatus === 'ready' && tools.curl.status === 'available' ? 'ready' : 'degraded';
  return {
    status,
    runtime,
    tools,
    adapters,
    recovery: {
      preview_command: missingSkills.length || missingAgents.length || missingEntrypoints.length
        ? `npm run toolkit -- install --provider ${providerSelection} --dry-run` : null,
      install_command: missingSkills.length || missingAgents.length || missingEntrypoints.length
        ? `npm run toolkit -- install --provider ${providerSelection}` : null,
      instructions
    },
    fallback: {
      missing_agent: 'O CTO pode executar diretamente com a skill canônica disponível.',
      missing_adapter_skill: 'Leia a skill correspondente em tools/<Nome>.IA.Toolkit/fabrica/skills e prossiga na sessão nativa.',
      missing_core_skill: 'Use integratech-fabrica-autonoma e os registros/contexto disponíveis; continue trabalho independente e sinalize a limitação da especialização.',
      independent_work: ['discovery', 'manutenção que não dependa de pesquisa externa', 'tarefas não relacionadas à especialização ausente'],
      research_external: tools.curl.status === 'available' && runtime.status === 'ready' ? 'available' : 'blocked_until_prerequisite'
    },
    blocking_capabilities: [
      ...(runtime.status === 'ready' ? [] : ['execução do toolkit neste runtime']),
      ...(tools.curl.status === 'available' ? [] : ['pesquisa externa']),
      ...(missingCoreSkills.length ? [`tarefas dependentes de skills do núcleo ausentes: ${missingCoreSkills.join(', ')}`] : [])
    ]
  };
}
