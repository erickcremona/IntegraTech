import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { selectedProviders } from './provider-selection.mjs';

const readJson = path => JSON.parse(readFileSync(path, 'utf8'));
const installInfo = {
  node: {
    windows: { command: 'winget install OpenJS.NodeJS.LTS', source: 'https://nodejs.org/en/download/' },
    other: { command: null, source: 'https://nodejs.org/en/download/' }
  },
  npm: {
    windows: { command: 'Instale Node.js LTS; o instalador inclui npm.', source: 'https://nodejs.org/en/download/' },
    other: { command: null, source: 'https://nodejs.org/en/download/' }
  },
  curl: {
    windows: { command: 'winget install cURL.cURL', source: 'https://curl.se/download.html' },
    other: { command: null, source: 'https://curl.se/download.html' }
  },
  git: {
    windows: { command: 'winget install --id Git.Git -e', source: 'https://git-scm.com/downloads' },
    other: { command: null, source: 'https://git-scm.com/downloads' }
  },
  codex: {
    windows: { command: 'npm install -g @openai/codex@latest', source: 'https://developers.openai.com/codex/cli' },
    other: { command: 'npm install -g @openai/codex@latest', source: 'https://developers.openai.com/codex/cli' }
  },
  claude: {
    windows: { command: 'winget install Anthropic.ClaudeCode', source: 'https://code.claude.com/docs/en/setup' },
    other: { command: 'Siga o instalador oficial para seu sistema operacional.', source: 'https://code.claude.com/docs/en/setup' }
  }
};

function run(command, args = []) {
  try {
    const stdout = execFileSync(command, args, {
      encoding: 'utf8', timeout: 8000, maxBuffer: 64 * 1024,
      windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'],
      shell: false
    });
    return { available: true, stdout: stdout.trim() };
  } catch (error) {
    return { available: false, error: error.code ?? (error.status !== undefined ? `EXIT_${error.status}` : 'COMMAND_FAILED') };
  }
}

function commandStatus(result) {
  if (result.available) return 'available';
  return result.error === 'ENOENT' ? 'missing' : 'unverified';
}

function windowsCommandStatus(command) {
  const result = run('where.exe', [command]);
  if (result.available) return { status: 'available' };
  if (result.error === 'EXIT_1') return { status: 'missing' };
  return { status: 'unverified', error: result.error };
}

function providerRun(provider, args) {
  if (process.platform !== 'win32') return run(provider, args);
  if (!args.every(arg => arg === 'exec' || /^--[a-z-]+$/.test(arg))) return { available: false, error: 'UNSAFE_ARGUMENT' };
  const located = windowsCommandStatus(provider);
  if (located.status !== 'available') return { available: false, error: located.status === 'missing' ? 'ENOENT' : located.error };
  const commandLine = `${provider} ${args.join(' ')}`;
  return run('cmd.exe', ['/d', '/s', '/c', commandLine]);
}

function installation(id) {
  const entries = installInfo[id];
  return entries?.[process.platform === 'win32' ? 'windows' : 'other'] ?? null;
}

function checkProvider(provider, providerDir) {
  if (provider === 'cursor') return {
    id: provider, status: 'manual_confirmation', required: false,
    reason: 'O toolkit usa Cursor pela sessão nativa; não há CLI/revisor automatizado para detectar.'
  };
  const command = provider === 'codex' ? 'codex' : 'claude';
  let profile;
  try { profile = readJson(join(providerDir, `${provider}.json`)); }
  catch { return { id: provider, status: 'unverified', required: false, capability: 'dispatcher de revisão independente', reason: `Perfil de CLI ${provider} ausente ou inválido; as flags requeridas não puderam ser conferidas.` }; }
  if (!Array.isArray(profile?.required_flags) || profile.required_flags.some(flag => typeof flag !== 'string'))
    return { id: provider, status: 'unverified', required: false, capability: 'dispatcher de revisão independente', reason: `Perfil de CLI ${provider} não contém a lista de flags esperada.` };
  const result = providerRun(command, provider === 'codex' ? ['exec', '--help'] : ['--help']);
  if (!result.available) {
    const status = commandStatus(result);
    const missing = status === 'missing';
    return {
      id: provider, status: missing ? 'optional_missing' : status, required: false,
      capability: 'dispatcher de revisão independente',
      ...(missing ? { install: installation(provider) } : {}),
      reason: missing ? `CLI ${command} não encontrado; a sessão nativa continua disponível, mas o dispatcher deste provedor não poderá executar revisões.` : `Execução de diagnóstico do CLI ${command} não foi permitida (${result.error}); a sessão nativa não foi avaliada.`
    };
  }
  const missingFlags = profile.required_flags.filter(flag => !result.stdout.includes(flag));
  return missingFlags.length
    ? { id: provider, status: 'incompatible', required: false, capability: 'dispatcher de revisão independente', missing_flags: missingFlags, reason: `CLI ${command} não oferece as flags requeridas ao dispatcher: ${missingFlags.join(', ')}.`, install: installation(provider) }
    : { id: provider, status: 'available', required: false, capability: 'dispatcher de revisão independente' };
}

export function inspectHostDependencies({ repo, provider, runner = run } = {}) {
  if (typeof repo !== 'string' || !repo) throw new Error('repositório obrigatório para verificar dependências');
  const identity = readJson(join(repo, 'project.json'));
  if (typeof identity.name !== 'string' || !/^[A-Z][A-Za-z0-9]{0,49}$/.test(identity.name)
    || /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i.test(identity.name)) throw new Error('nome inválido no project.json; perfil de provedor não foi lido');
  const selected = provider ?? identity.provider;
  const providers = selectedProviders(selected);
  const packageJson = readJson(join(repo, 'package.json'));
  const nodeFloor = Number(packageJson.engines?.node?.match(/\d+/)?.[0] ?? 22);
  const nodeVersion = Number(process.versions.node.split('.')[0]);
  const node = {
    id: 'node', status: nodeVersion >= nodeFloor ? 'available' : 'incompatible', required: true,
    version: process.versions.node, minimum_major: nodeFloor,
    ...(nodeVersion < nodeFloor ? { reason: `Node.js ${nodeVersion} é inferior ao mínimo ${nodeFloor}.`, install: installation('node') } : {})
  };
  let npmResult;
  if (process.platform === 'win32') {
    const located = windowsCommandStatus('npm');
    npmResult = located.status === 'available'
      ? run('cmd.exe', ['/d', '/s', '/c', 'npm --version'])
      : { available: false, error: located.status === 'missing' ? 'ENOENT' : located.error };
  } else npmResult = runner('npm', ['--version']);
  const npmStatus = commandStatus(npmResult);
  const npm = { id: 'npm', status: npmStatus, required: true,
    ...(npmStatus === 'unverified' ? { reason: `Inspeção do npm não concluída (${npmResult.error}).` } : {}),
    ...(npmStatus === 'missing' ? { install: installation('npm') } : {}) };
  if (npmResult.available) npm.version = npmResult.stdout.split(/\s+/)[0];
  const curlResult = runner(process.platform === 'win32' ? 'curl.exe' : 'curl', ['--version']);
  const curlStatus = commandStatus(curlResult);
  const curl = { id: 'curl', status: curlStatus, required: true, purpose: 'consulta HTTPS de referências de domínio',
    ...(curlStatus === 'unverified' ? { reason: `Inspeção do curl não concluída (${curlResult.error}).` } : {}),
    ...(curlStatus === 'missing' ? { install: installation('curl') } : {}) };
  const checks = [node, npm, curl];
  if (existsSync(join(repo, '.git'))) {
    const gitResult = runner(process.platform === 'win32' ? 'git.exe' : 'git', ['--version']);
    const gitStatus = commandStatus(gitResult);
    checks.push({ id: 'git', status: gitStatus, required: true, purpose: 'verificação do remoto antes da adoção',
      ...(gitStatus === 'unverified' ? { reason: `Inspeção do Git não concluída (${gitResult.error}).` } : {}),
      ...(gitStatus === 'missing' ? { install: installation('git') } : {}) });
  }
  const providerDir = join(repo, `tools/${identity.name}.IA.Toolkit/fabrica/providers`);
  const providerChecks = providers.map(name => checkProvider(name, providerDir));
  const requiredMissing = [...checks, ...providerChecks].filter(item => item.required && ['missing', 'incompatible'].includes(item.status));
  const requiredUnverified = [...checks, ...providerChecks].filter(item => item.required && item.status === 'unverified');
  const manual = providerChecks.filter(item => item.status === 'manual_confirmation' || (!item.required && item.status !== 'available'));
  const installableMissing = [...checks, ...providerChecks].filter(item => ['missing', 'incompatible', 'optional_missing'].includes(item.status) && item.install);
  const pluginStatus = {
    status: 'not_required', required: [],
    note: 'O toolkit inclui localmente suas skills, agents e contratos. Plugins externos/MCPs não são requisitos universais; avalie-os durante discovery pelo contexto e instale somente após escopo aprovado e autorização.'
  };
  const status = requiredMissing.length ? 'installation_required' : requiredUnverified.length ? 'verification_required' : manual.length ? 'manual_confirmation' : 'ready';
  return {
    status, provider_selection: selected, checked_at: new Date().toISOString(),
    checks, providers: providerChecks, plugins: pluginStatus,
    missing_required: requiredMissing,
    unverified_required: requiredUnverified,
    installation_requests: installableMissing.map(item => ({ dependency: item.id, required: item.required, ...(item.capability ? { capability: item.capability } : {}), reason: item.reason ?? item.purpose ?? item.status, ...item.install })),
    authentication: 'not_checked',
    limitations: ['Autenticação e sessão interativa dos provedores não são verificadas automaticamente.', 'Ferramentas de produto são verificadas após plano e decisão tecnológica aprovados, conforme a stack escolhida.']
  };
}

export function formatInstallationRequest(report) {
  if (report.status === 'verification_required') {
    return `A verificação do ambiente não conseguiu executar um ou mais comandos necessários; a adoção foi bloqueada sem classificar esses itens como ausentes. Execute novamente dependencies fora do isolamento que impediu os processos. Itens: ${report.unverified_required.map(item => `${item.id} (${item.reason ?? item.error ?? 'não verificado'})`).join(', ')}.`;
  }
  if (!report.missing_required.length) return '';
  const lines = report.missing_required.map(item => {
    const source = item.install?.source ? ` (${item.install.source})` : '';
    const command = item.install?.command ? ` Comando sugerido: ${item.install.command}.` : '';
    return `- ${item.id}: ${item.reason ?? item.purpose ?? item.status}.${command}${source}`;
  });
  return `Pré-requisitos ausentes ou incompatíveis; adoção bloqueada até instalar/atualizar e repetir a verificação:\n${lines.join('\n')}`;
}
