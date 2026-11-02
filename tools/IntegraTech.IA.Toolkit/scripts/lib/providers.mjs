import { spawn } from 'node:child_process';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { loadSchema } from './contracts.mjs';

const capabilities = Object.fromEntries(['codex', 'claude'].map(name => [name,
  JSON.parse(readFileSync(new URL(`../../fabrica/providers/${name}.json`, import.meta.url), 'utf8')).required_flags]));
export function buildInvocation(provider, { workspace, schemaPath, outputPath, jsonSchema }) {
  if (!Object.hasOwn(capabilities, provider)) throw new Error('provedor inválido');
  const args = provider === 'codex'
    ? ['--ask-for-approval', 'never', 'exec', '--sandbox', 'read-only', '--skip-git-repo-check', '--ephemeral',
      '-c', 'mcp_servers={}', '-c', 'features.shell_tool=false', '-c', 'features.apps=false',
      '-c', 'features.plugins=false', '-c', 'features.memories=false', '-c', 'features.request_permissions_tool=false',
      '-c', 'agents.enabled=false', '-c', 'skills.bundled.enabled=false', '-c', 'web_search="disabled"',
      '--cd', workspace, '--output-schema', schemaPath, '--output-last-message', outputPath, '-']
    : ['-p', '--bare', '--tools', '', '--disallowedTools', 'mcp__*', '--strict-mcp-config',
      '--mcp-config', '{"mcpServers":{}}', '--no-session-persistence', '--permission-mode', 'plan',
      '--output-format', 'json', '--json-schema', JSON.stringify(jsonSchema ?? loadSchema('review'))];
  return { command: provider, args, cwd: workspace, shell: false, outputPath: provider === 'codex' ? outputPath : undefined };
}
export function runProcess({ command, args, cwd, input = '', outputPath, timeoutMs = 120000 }) {
  return new Promise(resolve => {
    let child;
    let stdout = '', stderr = '', timedOut = false, overflow = false, settled = false, stopping = false, receivedBytes = 0;
    const finish = value => { if (!settled) { settled = true; clearTimeout(timer); resolve(value); } };
    const stop = () => {
      if (stopping) return;
      stopping = true;
      if (process.platform === 'win32' && child?.pid) {
        const killer = spawn('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { shell: false, windowsHide: true, stdio: 'ignore' });
        killer.on('error', () => child.kill());
      } else child?.kill('SIGKILL');
    };
    const timer = setTimeout(() => { timedOut = true; stop(); }, timeoutMs);
    try {
      child = spawn(command, args, { cwd, shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
      child.on('error', error => finish({ code: null, error: error.code, stdout: '' }));
      child.stdin.on('error', () => {});
      child.stdout.setEncoding('utf8');
      child.stderr.setEncoding('utf8');
      const collect = stream => data => {
        receivedBytes += Buffer.byteLength(data);
        if (receivedBytes > 2 * 1024 * 1024) { overflow = true; stop(); return; }
        if (stream === 'stdout') stdout += data; else stderr += data;
      };
      child.stdout.on('data', collect('stdout'));
      child.stderr.on('data', collect('stderr'));
      child.on('close', code => {
        if (code === 0 && outputPath && existsSync(outputPath)) {
          if (statSync(outputPath).size <= 2 * 1024 * 1024) stdout = readFileSync(outputPath, 'utf8'); else overflow = true;
        }
        // Raw stderr is intentionally not propagated to persisted reports.
        finish({ code, stdout, timedOut, overflow });
      });
      child.stdin.end(input, 'utf8');
    } catch (error) { finish({ code: null, error: error.code ?? 'SPAWN_FAILED', stdout: '' }); }
  });
}
export async function checkProvider(provider, runner = runProcess, { timeoutMs = 15000 } = {}) {
  if (!Object.hasOwn(capabilities, provider)) throw new Error('provedor inválido');
  const result = await runner({ command: provider, args: provider === 'codex' ? ['exec', '--help'] : ['--help'], timeoutMs });
  if (result.code !== 0 || result.timedOut || result.overflow) return { provider, status: 'unavailable' };
  const missing = capabilities[provider].filter(flag => !result.stdout.includes(flag));
  return { provider, status: missing.length ? 'incompatible' : 'available', missing };
}
export async function diagnoseProviders(runner = runProcess) {
  const result = [];
  for (const provider of ['codex', 'claude']) {
    const capability = await checkProvider(provider, runner);
    const version = capability.status === 'available' ? await runner({ command: provider, args: ['--version'], timeoutMs: 10000 }) : null;
    result.push({ ...capability, cli_version: version?.code === 0 ? version.stdout.match(/\d+\.\d+\.\d+(?:[-.][a-zA-Z0-9]+)*/)?.[0] ?? null : null,
      authentication: 'not_checked', effective_isolation: 'not_verified', model: null });
  }
  return result;
}
