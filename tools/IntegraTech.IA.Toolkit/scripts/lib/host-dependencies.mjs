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
  const profile = readJson(join(providerDir, `${provider}.json`));
  const result = providerRun(command, provider === 'codex' ? ['exec', '--help'] : ['--help']);
  if (!result.available) {
    const status = commandStatus(result);
    return {
      id: provider, status, required: true,
      ...(status === 'missing' ? { install: installation(provider) } : {}),
      reason: status === 'missing' ? `CLI ${command} não encontrado.` : `Execução de diagnóstico do CLI ${command} não foi permitida (${result.error}).`
    };
  }
  const missingFlags = profile.required_flags.filter(flag => !result.stdout.includes(flag));
  return missingFlags.length
    ? { id: provider, status: 'incompatible', required: true, missing_flags: missingFlags, reason: `CLI ${command} não oferece as flags requeridas: ${missingFlags.join(', ')}.`, install: installation(provider) }
    : { id: provider, status: 'available', required: true };
}

export function inspectHostDependencies({ repo, provider, runner = run } = {}) {
  if (typeof repo !== 'string' || !repo) throw new Error('repositório obrigatório para verificar dependências');
  const identity = readJson(join(repo, 'project.json'));
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
  const npm = { id: 'npm', status: npmStatus, required: true, ...(npmStatus === 'missing' ? { install: installation('npm') } : {}) };
  if (npmResult.available) npm.version = npmResult.stdout.split(/\s+/)[0];
  const curlResult = runner(process.platform === 'win32' ? 'curl.exe' : 'curl', ['--version']);
  const curlStatus = commandStatus(curlResult);
  const curl = { id: 'curl', status: curlStatus, required: true, purpose: 'consulta HTTPS de referências de domínio', ...(curlStatus === 'missing' ? { install: installation('curl') } : {}) };
  const checks = [node, npm, curl];
  if (existsSync(join(repo, '.git'))) {
    const gitResult = runner(process.platform === 'win32' ? 'git.exe' : 'git', ['--version']);
    const gitStatus = commandStatus(gitResult);
    checks.push({ id: 'git', status: gitStatus, required: true, purpose: 'verificação do remoto antes da adoção', ...(gitStatus === 'missing' ? { install: installation('git') } : {}) });
  }
  const providerDir = join(repo, `tools/${identity.name}.IA.Toolkit/fabrica/providers`);
  const providerChecks = providers.map(name => checkProvider(name, providerDir));
  const requiredMissing = [...checks, ...providerChecks].filter(item => item.required && ['missing', 'incompatible'].includes(item.status));
  const requiredUnverified = [...checks, ...providerChecks].filter(item => item.required && item.status === 'unverified');
  const manual = providerChecks.filter(item => item.status === 'manual_confirmation');
  const pluginStatus = {
    status: 'not_required', required: [],
    note: 'O toolkit inclui localmente suas skills, agentes e contratos. Plugins externos/MCPs não são dependências universais; avalie-os somente quando um plano aprovado de produto os exigir.'
  };
  const status = requiredMissing.length ? 'installation_required' : requiredUnverified.length ? 'verification_required' : manual.length ? 'manual_confirmation' : 'ready';
  return {
    status, provider_selection: selected, checked_at: new Date().toISOString(),
    checks, providers: providerChecks, plugins: pluginStatus,
    missing_required: requiredMissing,
    unverified_required: requiredUnverified,
    installation_requests: requiredMissing.map(item => ({ dependency: item.id, reason: item.reason ?? item.purpose ?? item.status, ...item.install })),
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
