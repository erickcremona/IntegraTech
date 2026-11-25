import test from 'node:test';
import assert from 'node:assert/strict';
import { assessArchitectureImpact } from '../scripts/lib/architecture-impact.mjs';

const base = {
  classification: 'N1', rationale: 'Mudança localizada em módulo conhecido.',
  signals: ['single_module'], affected_modules: ['Orders'],
  evidence_requirement_ids: ['REQ-1'], decision_refs: []
};

test('architecture impact derives objective N0 to N4 minimums and required reviews', () => {
  const cases = [
    [{ ...base, classification: 'N0', signals: ['documentation_only'] }, 'N0', ['code', 'security'], ['docs/architecture/README.md']],
    [{ ...base, classification: 'N1', signals: ['single_module'] }, 'N1', ['code', 'security']],
    [{ ...base, classification: 'N2', signals: ['domain_rules'] }, 'N2', ['code', 'security', 'architecture']],
    [{ ...base, classification: 'N3', signals: ['data_persistence'], decision_refs: ['references/architecture-decision.json'] }, 'N3', ['code', 'security', 'architecture', 'data']],
    [{ ...base, classification: 'N4', signals: ['technology_change'], decision_refs: ['references/architecture-decision.json'] }, 'N4', ['code', 'security', 'architecture']]
  ];
  for (const [impact, minimum, reviews, writeFiles = ['src/orders/service.mjs']] of cases) {
    const result = assessArchitectureImpact({ impact, requirementIds: ['REQ-1'], writeFiles });
    assert.equal(result.status, 'ready');
    assert.equal(result.minimum, minimum);
    assert.deepEqual(result.required_reviews, reviews);
  }
});

test('architecture impact blocks unknown, missing evidence, and under-classification', () => {
  for (const impact of [
    { ...base, signals: ['unknown'] },
    { ...base, evidence_requirement_ids: [] },
    { ...base, classification: 'N1', signals: ['data_persistence'] },
    { ...base, classification: 'N0', signals: ['documentation_only'], rationale: ' ' }
  ]) {
    assert.equal(assessArchitectureImpact({ impact, requirementIds: ['REQ-1'], writeFiles: ['src/orders/service.mjs'] }).status, 'blocked');
  }
});

test('architecture impact raises the floor for unambiguously sensitive paths', () => {
  const cases = [
    ['N3', ['src/api/openapi.yaml'], ['public_contract']],
    ['N3', ['db/migrations/001.sql'], ['data_persistence']],
    ['N3', ['src/security/authorization.mjs'], ['security_boundary']],
    ['N4', ['references/architecture-decision.json'], ['architecture_decision']]
  ];
  for (const [minimum, writeFiles, expectedSignal] of cases) {
    const impact = { ...base, classification: minimum, signals: ['single_module'], ...(minimum === 'N3' || minimum === 'N4' ? { decision_refs: ['references/architecture-decision.json'] } : {}) };
    const result = assessArchitectureImpact({ impact, requirementIds: ['REQ-1'], writeFiles });
    assert.equal(result.status, 'ready');
    assert.equal(result.minimum, minimum);
    assert.ok(expectedSignal.every(signal => result.checks.some(check => check.signal === signal)));
  }
});

test('documentation-only N0 is rejected for executable source changes', () => {
  const impact = { ...base, classification: 'N0', signals: ['documentation_only'] };
  const result = assessArchitectureImpact({ impact, requirementIds: ['REQ-1'], writeFiles: ['src/orders/service.mjs'] });
  assert.equal(result.status, 'blocked');
  assert.equal(result.minimum, 'N1');
});
