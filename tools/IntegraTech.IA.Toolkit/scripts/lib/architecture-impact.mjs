import { validateContract } from './contracts.mjs';

const levels = ['N0', 'N1', 'N2', 'N3', 'N4'];
const floors = Object.freeze({
  documentation_only: 'N0', local_change: 'N1', single_module: 'N1',
  multiple_modules: 'N2', domain_rules: 'N2',
  public_contract: 'N3', data_persistence: 'N3', external_integration: 'N3', security_boundary: 'N3', quality_attribute: 'N3',
  architecture_decision: 'N4', technology_change: 'N4', migration: 'N4'
});
const compare = (left, right) => levels.indexOf(left) - levels.indexOf(right);
const matches = (path, expression) => expression.test(path.replaceAll('\\', '/').toLowerCase());

function pathSignals(paths) {
  const detected = new Set();
  for (const path of paths) {
    if (matches(path, /(^|\/)(?:architecture-decision|technology-decision)\.json$|(^|\/)adr\//)) detected.add('architecture_decision');
    if (matches(path, /(^|\/)(?:contracts?|openapi|asyncapi|pact)(\/|\.|$)/)) detected.add('public_contract');
    if (matches(path, /(^|\/)(?:migrations?|db\/migration)(\/|$)/)) detected.add('data_persistence');
    if (matches(path, /(^|\/)(?:security|auth|authorization|authentication|identity)(\/|\.|$)/)) detected.add('security_boundary');
    if (/(?:^|\/)(?:src|source|app|tests?)(?:\/|$)/i.test(path) || /\.(?:mjs|cjs|js|ts|tsx|jsx|cs|java|kt|py|go|rs|sql|json|ya?ml|toml|xml|csproj|props|targets)$/i.test(path)) detected.add('local_change');
  }
  return detected;
}

export function assessArchitectureImpact({ impact, requirementIds = [], writeFiles = [] } = {}) {
  const blocked = (reason, minimum = null, checks = []) => ({ status: 'blocked', classification: impact?.classification ?? null, minimum, required_reviews: [], checks, reason });
  try { validateContract('architecture-impact', impact); }
  catch (error) { return blocked(`classificação arquitetural inválida: ${error.message}`); }
  if (!impact.rationale.trim()) return blocked('justificativa arquitetural ausente');
  if (!Array.isArray(requirementIds) || !Array.isArray(writeFiles) || !writeFiles.length) return blocked('requisitos vinculados e arquivos de escrita são obrigatórios');
  if (new Set(impact.signals).size !== impact.signals.length || new Set(impact.evidence_requirement_ids).size !== impact.evidence_requirement_ids.length
    || new Set(impact.affected_modules).size !== impact.affected_modules.length || new Set(writeFiles).size !== writeFiles.length) return blocked('sinais, requisitos, módulos e caminhos não podem estar duplicados');
  if (impact.signals.includes('unknown')) return blocked('impacto arquitetural desconhecido exige esclarecimento');
  if (!impact.evidence_requirement_ids.every(id => requirementIds.includes(id))) return blocked('evidência deve apontar para requisito vinculado à tarefa');
  const checks = impact.signals.map(signal => ({ signal, minimum: floors[signal] }));
  const detected = pathSignals(writeFiles);
  for (const signal of detected) if (!impact.signals.includes(signal)) checks.push({ signal, minimum: floors[signal], detected_from_write_path: true });
  const hasExecutableChange = [...detected].includes('local_change');
  if (impact.signals.includes('documentation_only') && hasExecutableChange && !impact.signals.some(signal => signal !== 'documentation_only'))
    checks.push({ signal: 'executable_source_path', minimum: 'N1', detected_from_write_path: true });
  const minimum = checks.reduce((current, check) => !current || compare(check.minimum, current) > 0 ? check.minimum : current, null);
  if (!minimum) return blocked('ao menos um sinal de impacto conhecido é obrigatório', null, checks);
  if (compare(impact.classification, minimum) < 0) return blocked(`classificação ${impact.classification} inferior ao piso ${minimum}`, minimum, checks);
  if (compare(impact.classification, 'N3') >= 0 && impact.decision_refs.length === 0) return blocked('impacto N3/N4 exige referência explícita à decisão/desenho arquitetural', minimum, checks);
  const required_reviews = ['code', 'security'];
  if (compare(impact.classification, 'N2') >= 0) required_reviews.push('architecture');
  if (impact.signals.includes('data_persistence')) required_reviews.push('data');
  return { status: 'ready', classification: impact.classification, minimum, required_reviews, checks, reason: 'Classificação consistente com os sinais, evidências de requisitos e caminhos declarados.' };
}
