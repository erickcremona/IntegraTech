import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const source = readFileSync(resolve(root, 'tools/IntegraTech.IA.Toolkit/scripts/verify-model.mjs'), 'utf8');
const manifest = JSON.parse(readFileSync(resolve(root, 'tools/IntegraTech.IA.Toolkit/fabrica/project-template.json'), 'utf8'));
const workflow = readFileSync(resolve(root, '.github/workflows/validate.yml'), 'utf8');

test('verificação integral não requer runtime nem projetos de produto', () => {
  assert.match(source, /toolkit_tests/);
  assert.match(source, /local_evals/);
  assert.match(source, /secret_patterns/);
  assert.doesNotMatch(source, /\bdotnet\b|solution_build|host_lifecycle|generated_(?:worker|api|console)|adopted_(?:api|console)/i);
  assert.doesNotMatch(manifest.files.join('\n'), /(?:^|\/)(?:IntegraTech\.sln|global\.json|Directory\.Build\.props|src\/.*\.csproj|tests\/.*\.csproj)$/i);
  assert.match(workflow, /npm run verify/);
  assert.doesNotMatch(workflow, /setup-dotnet|dotnet-version|\bdotnet\b/i);
});

test('timeout global de verify cobre a suíte serial medida', () => {
  assert.match(source, /timeoutMs:\s*60\s*\*\s*60\s*\*\s*1000/);
  assert.match(source, /--test-concurrency=4/);
  assert.doesNotMatch(source, /--test-isolation=none/);
  assert.match(source, /--test-reporter=tap/);
  assert.match(source, /--test-reporter-destination=/);
  assert.match(source, /outputPath:\s*reporter/);
});
