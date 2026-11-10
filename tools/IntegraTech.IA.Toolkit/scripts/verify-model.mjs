import { readFileSync, readdirSync, mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { repoRoot } from './lib/installer.mjs';
import { adoptProject, createProject } from '../tests/generation-fixture.mjs';
import { evaluateLocal } from './lib/evaluations.mjs';
import { scanRepository } from './lib/secret-scan.mjs';
import { main } from './toolkit.mjs';
import { runProcess } from './lib/providers.mjs';
import { failureCode } from './lib/verify-report.mjs';
const results = [];
async function command(label, executable, args, cwd = repoRoot) {
  const result = await runProcess({ command: executable, args, cwd, timeoutMs: 600000 });
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
  await toolkitTests('toolkit_tests', repoRoot, identity.name);
  if ((await main(['validate'])).status !== 'valid') throw new Error('Consistência dos adaptadores falhou.');
  if (identity.is_model && (await main(['validate', '--provider', 'all'])).status !== 'valid') throw new Error('Consistência de todos os adaptadores falhou.');
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
    createProject({ name, target, presentation, provider: presentation === 'worker' ? 'both' : presentation === 'api' ? 'all' : 'cursor' });
    await command(`generated_${presentation}_consistency`, process.execPath, [`tools/${name}.IA.Toolkit/scripts/toolkit.mjs`, 'validate'], target);
    await toolkitTests(`generated_${presentation}_toolkit_tests`, target, name);
    await command(`generated_${presentation}_build`, 'dotnet', ['build', `${name}.sln`, '--disable-build-servers', '-m:1', '-p:UseSharedCompilation=false'], target);
    await command(`generated_${presentation}_lifecycle`, 'dotnet', ['run', '--project', `tests/${name}.Arquitetura.Tests`, '--no-build'], target);
  }
  if (identity.is_model) for (const presentation of ['api', 'console']) {
    const target = mkdtempSync(join(tmpdir(), 'factory-adopt-ci-'));
    const baselinePath = `tools/${identity.name}.IA.Toolkit/fabrica/template-baseline.json`;
    const baseline = JSON.parse(readFileSync(join(repoRoot, baselinePath), 'utf8'));
    for (const path of [...Object.keys(baseline.files), baselinePath]) {
      mkdirSync(dirname(join(target, path)), { recursive: true });
      writeFileSync(join(target, path), readFileSync(join(repoRoot, path)));
    }
    const name = `Adopt${presentation[0].toUpperCase()}${presentation.slice(1)}`;
    adoptProject({ repo: target, name, context: 'Validar substituição do worker pelo modelo selecionado.', presentation, provider: presentation === 'api' ? 'all' : 'cursor' });
    await command(`adopted_${presentation}_consistency`, process.execPath, [`tools/${name}.IA.Toolkit/scripts/toolkit.mjs`, 'validate'], target);
    await command(`adopted_${presentation}_build`, 'dotnet', ['build', `${name}.sln`, '--disable-build-servers', '-m:1', '-p:UseSharedCompilation=false'], target);
    await command(`adopted_${presentation}_lifecycle`, 'dotnet', ['run', '--project', `tests/${name}.Arquitetura.Tests`, '--no-build'], target);
  }
  console.log(JSON.stringify({ status: 'passed', results, live_model_evals: 'not_executed' }, null, 2));
} catch (error) { console.error(error.message); console.log(JSON.stringify({ status: 'failed', results })); process.exitCode = 1; }
