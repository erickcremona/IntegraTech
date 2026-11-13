import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot } from './lib/installer.mjs';
import { evaluateLocal } from './lib/evaluations.mjs';
import { scanRepository } from './lib/secret-scan.mjs';
import { main } from './toolkit.mjs';
import { runProcess } from './lib/providers.mjs';
import { failureCode } from './lib/verify-report.mjs';
import { toolkitSourceFingerprint } from './lib/toolkit-audit.mjs';
const results = [];
async function command(label, executable, args, cwd = repoRoot) {
  const result = await runProcess({ command: executable, args, cwd, timeoutMs: 1500000 });
  const ok = result.code === 0 && !result.timedOut && !result.overflow && !result.error;
  results.push({ check: label, status: ok ? 'passed' : 'failed', ...(!ok ? { reason_code: failureCode(result) } : {}) });
  console.log(JSON.stringify(results.at(-1)));
  if (!ok) throw new Error(`${label}: falhou (${failureCode(result)}); execute a verificação individual para diagnóstico. Saída bruta não persistida.`);
}
async function toolkitTests(label, root, name) {
  const directory = join(root, `tools/${name}.IA.Toolkit/tests`);
  const tests = readdirSync(directory).filter(file => file.endsWith('.test.mjs')).map(file => join(directory, file));
  await command(label, process.execPath, ['--test', '--test-isolation=none', ...tests], root);
}
try {
  const identity = JSON.parse(readFileSync(join(repoRoot, 'project.json'), 'utf8'));
  if (identity.is_model) await command('template_baseline', process.execPath, [join(repoRoot, `tools/${identity.name}.IA.Toolkit/scripts/update-template-baseline.mjs`)]);
  // The suite includes neutral creation/adoption regressions; no product runtime is assumed here.
  await toolkitTests('toolkit_tests_and_neutral_materialization', repoRoot, identity.name);
  if ((await main(['validate'])).status !== 'valid') throw new Error('Consistência dos adaptadores falhou.');
  if (identity.is_model && (await main(['validate', '--provider', 'all'])).status !== 'valid') throw new Error('Consistência de todos os adaptadores falhou.');
  const evals = evaluateLocal();
  if (evals.failed) throw new Error('Avaliações locais falharam.');
  results.push({ check: 'local_evals', status: 'passed', cases: evals.passed, proves_model_behavior: false });
  const secrets = scanRepository(repoRoot);
  if (secrets.status !== 'passed') throw new Error('Varredura de padrões de credenciais/artefatos falhou; execute secret-scan.');
  results.push({ check: 'secret_patterns', status: secrets.status, binary_skipped: secrets.binary_skipped });
  if (identity.is_model) {
    mkdirSync(join(repoRoot, '.scratch'), { recursive: true });
    writeFileSync(join(repoRoot, '.scratch/toolkit-verification.json'), JSON.stringify({ status: 'passed', completed_at: new Date().toISOString(), checks: results, source_sha256: toolkitSourceFingerprint(repoRoot) }, null, 2) + '\n');
  }
  console.log(JSON.stringify({ status: 'passed', results, live_model_evals: 'not_executed' }, null, 2));
} catch (error) { console.error(error.message); console.log(JSON.stringify({ status: 'failed', results })); process.exitCode = 1; }
