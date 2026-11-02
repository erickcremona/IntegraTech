import { readFileSync } from 'node:fs';

// Deliberately limited to the keywords used in the versioned factory contracts.
// Unsupported keywords fail closed; this is not a general JSON Schema engine.
const supported = new Set(['$schema', '$id', 'title', 'description', 'type', 'additionalProperties', 'required', 'properties', 'items', 'const', 'enum', 'minLength', 'minimum', 'minItems', 'maxItems', 'allOf', 'if', 'then']);
export function assertSupported(schema) {
  for (const key of Object.keys(schema)) if (!supported.has(key)) throw new Error(`schema: keyword não suportada: ${key}`);
  for (const child of Object.values(schema.properties ?? {})) assertSupported(child);
  for (const child of schema.allOf ?? []) assertSupported(child);
  for (const key of ['items', 'if', 'then']) if (schema[key]) assertSupported(schema[key]);
}
function check(schema, value, path = '$') {
  const fail = reason => { throw new Error(`${path}: ${reason}`); };
  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    const matches = type => type === 'null' ? value === null
      : type === 'array' ? Array.isArray(value)
      : type === 'object' ? value !== null && typeof value === 'object' && !Array.isArray(value)
      : type === 'integer' ? Number.isInteger(value) : typeof value === type;
    if (!types.some(matches)) fail(`tipo esperado: ${types.join('|')}`);
  }
  if ('const' in schema && value !== schema.const) fail('const inválida');
  if (schema.enum && !schema.enum.includes(value)) fail('valor fora do enum');
  if (typeof value === 'string' && [...value].length < (schema.minLength ?? 0)) fail('texto vazio/curto');
  if (typeof value === 'number' && value < (schema.minimum ?? -Infinity)) fail('número abaixo do mínimo');
  if (Array.isArray(value)) {
    if (value.length < (schema.minItems ?? 0) || value.length > (schema.maxItems ?? Infinity)) fail('quantidade de itens inválida');
    if (schema.items) value.forEach((item, i) => check(schema.items, item, `${path}[${i}]`));
  } else if (value !== null && typeof value === 'object') {
    for (const key of schema.required ?? []) if (!Object.hasOwn(value, key)) fail(`campo obrigatório: ${key}`);
    for (const [key, item] of Object.entries(value)) {
      if (Object.hasOwn(schema.properties ?? {}, key)) check(schema.properties[key], item, `${path}.${key}`);
      else if (schema.additionalProperties === false) fail(`campo adicional: ${key}`);
    }
  }
  for (const child of schema.allOf ?? []) check(child, value, path);
  if (schema.if) {
    let matches = true;
    try { check(schema.if, value, path); } catch { matches = false; }
    if (matches && schema.then) check(schema.then, value, path);
  }
}
export function loadSchema(kind) {
  if (!['delegation', 'return', 'review', 'handoff', 'business-context', 'business-plan', 'approval'].includes(kind)) throw new Error('contrato desconhecido');
  return JSON.parse(readFileSync(new URL(`../../fabrica/team/contracts/${kind}.schema.json`, import.meta.url), 'utf8'));
}
export function validateContract(kind, value, expectedTaskId) {
  const schema = loadSchema(kind);
  assertSupported(schema);
  check(schema, value);
  if (expectedTaskId && value.task_id !== expectedTaskId) throw new Error('task_id divergente');
  if (kind === 'review') {
    if (value.verdict === 'approved' && value.findings.length) throw new Error('approved exige ausência de achados');
    if (value.verdict === 'approved_with_findings' && value.findings.some(f => ['blocker', 'high'].includes(f.severity)))
      throw new Error('achado alto/bloqueador exige changes_required ou blocked');
  }
  return value;
}

export function validateAgainstSchema(schema, value) {
  assertSupported(schema);
  check(schema, value);
  return value;
}
