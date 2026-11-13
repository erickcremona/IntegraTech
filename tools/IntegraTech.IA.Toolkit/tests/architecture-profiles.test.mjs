import test from 'node:test';
import assert from 'node:assert/strict';
import { validateArchitectureModules } from '../scripts/lib/architecture-model.mjs';

test('architecture module graph accepts contextual names independent of programming language', () => {
  const graph = validateArchitectureModules([
    { name: 'orders-service', depends_on: [] },
    { name: 'owner_api', depends_on: ['orders-service'] }
  ], 'modular-monolith');
  assert.deepEqual([...graph.keys()], ['orders-service', 'owner_api']);
  assert.equal(validateArchitectureModules([{ name: 'orders-service', depends_on: [] }], 'distributed').size, 1);
});

test('architecture module graph retains boundary, dependency and cycle checks', () => {
  assert.throws(() => validateArchitectureModules([], 'modular-monolith'), /módulos/i);
  assert.throws(() => validateArchitectureModules([{ name: 'orders', depends_on: ['missing'] }], 'modular-monolith'), /desconhecida/i);
  assert.throws(() => validateArchitectureModules([{ name: 'orders', depends_on: ['owners'] }, { name: 'owners', depends_on: ['orders'] }], 'modular-monolith'), /ciclo/i);
  assert.throws(() => validateArchitectureModules([{ name: 'orders', depends_on: [] }, { name: 'orders', depends_on: [] }], 'modular-monolith'), /duplicado/i);
  assert.throws(() => validateArchitectureModules([{ name: 'orders', depends_on: [] }], 'layered-monolith'), /perfil modular/i);
});
