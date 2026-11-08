import { assertSanitized } from './paths.mjs';
export function normalizeInitialContext(input) {
  const initial = typeof input === 'string' ? { problem: input } : input;
  if (!initial || Array.isArray(initial) || typeof initial !== 'object') throw new Error('contexto inicial inválido');
  const result = { schema_version: 1, problem: '', current_situation: '', stakeholders: [], desired_outcomes: [], success_criteria: [], scope: [], out_of_scope: [], known_rules: [], data: [], constraints: [], integrations: [], open_questions: [], assumptions: [] };
  for (const [key, value] of Object.entries(initial)) {
    if (!Object.hasOwn(result, key)) throw new Error('campo de contexto desconhecido');
    if (key === 'schema_version' ? value !== 1 : Array.isArray(result[key]) ? !Array.isArray(value) || value.some(item => typeof item !== 'string') : typeof value !== 'string') throw new Error('tipo de contexto inválido');
    result[key] = value;
  }
  if (!result.problem.trim() || /^(todo|tbd|pendente|a definir|\.\.\.)[.!]?$/i.test(result.problem.trim())) throw new Error('informe o problema de negócio');
  if (Buffer.byteLength(JSON.stringify(result)) > 128 * 1024) throw new Error('contexto acima do limite');
  assertSanitized(JSON.stringify(result));
  return result;
}
