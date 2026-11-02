import { readFileSync, readdirSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { repoRoot } from './lib/installer.mjs';
import { createProject } from './lib/project-generator.mjs';
import { evaluateLocal } from './lib/evaluations.mjs';
import { scanRepository } from './lib/secret-scan.mjs';
import { main } from './toolkit.mjs';
import { runProcess } from './lib/providers.mjs';
const results = [];
async function command(label, executable, args, cwd = repoRoot) {
  const result = await runProcess({ command: executable, args, cwd, timeoutMs: 600000 });
  const ok = result.code === 0 && !result.timedOut && !result.overflow && !result.error;
  results.push({ check: label, status: ok ? 'passed' : 'failed' });
  console.log(JSON.stringify(results.at(-1)));
  if (!ok) throw new Error(`${label}: falhou (código ${result.code ?? 'indisponível'}); execute a verificação individual para diagnóstico. Saída bruta não persistida.`);
}
try {
  const identity = JSON.parse(readFileSync(join(repoRoot, 'project.json'), 'utf8'));
  if (identity.is_model) await command('template_baseline', process.execPath, [join(repoRoot, `tools/${identity.name}.IA.Toolkit/scripts/update-template-baseline.mjs`)]);
  const tests = readdirSync(join(repoRoot, `tools/${identity.name}.IA.Toolkit/tests`)).filter(name => name.endsWith('.test.mjs')).map(name => join(repoRoot, `tools/${identity.name}.IA.Toolkit/tests`, name));
  await command('toolkit_tests', process.execPath, ['--test', '--test-isolation=none', ...tests]);
  if ((await main(['validate'])).status !== 'valid') throw new Error('Consistência dos adaptadores falhou.');
  const evals = evaluateLocal();
  if (evals.failed) throw new Error('Avaliações locais falharam.');
  results.push({ check: 'local_evals', status: 'passed', cases: evals.passed, proves_model_behavior: false });
  const secrets = scanRepository(repoRoot);
  if (secrets.status !== 'passed') throw new Error('Varredura de padrões de credenciais/artefatos falhou; execute secret-scan.');
  results.push({ check: 'secret_patterns', status: secrets.status, binary_skipped: secrets.binary_skipped });
  await command('solution_build', 'dotnet', ['build', `${identity.name}.sln`, '--disable-build-servers', '-m:1', '-p:UseSharedCompilation=false']);
  await command('host_lifecycle', 'dotnet', ['run', '--project', `tests/${identity.name}.Arquitetura.Tests`, '--no-build']);
  if (identity.is_model) for (const presentation of ['worker', 'api', 'console']) {
    const name = `Ci${presentation[0].toUpperCase()}${presentation.slice(1)}`;
    const target = mkdtempSync(join(tmpdir(), 'factory-ci-'));
    createProject({ name, target, presentation, provider: 'both' });
    await command(`generated_${presentation}_consistency`, process.execPath, [`tools/${name}.IA.Toolkit/scripts/toolkit.mjs`, 'validate'], target);
    await command(`generated_${presentation}_build`, 'dotnet', ['build', `${name}.sln`, '--disable-build-servers', '-m:1', '-p:UseSharedCompilation=false'], target);
    await command(`generated_${presentation}_lifecycle`, 'dotnet', ['run', '--project', `tests/${name}.Arquitetura.Tests`, '--no-build'], target);
  }
  console.log(JSON.stringify({ status: 'passed', results, live_model_evals: 'not_executed' }, null, 2));
} catch (error) { console.error(error.message); console.log(JSON.stringify({ status: 'failed', results })); process.exitCode = 1; }
