import { readFileSync } from 'node:fs';

// Deliberately limited to the keywords used in the versioned factory contracts.
// Unsupported keywords fail closed; this is not a general JSON Schema engine.
const supported = new Set(['$schema', '$id', 'title', 'description', 'type', 'additionalProperties', 'required', 'properties', 'items', 'const', 'enum', 'minLength', 'minimum', 'minItems', 'maxItems', 'allOf', 'if', 'then']);
export const contractKinds = Object.freeze(['delegation', 'return', 'review', 'handoff', 'business-context', 'business-plan', 'approval', 'technology-decision', 'domain-preparation', 'domain-consultation', 'domain-coherence', 'task-run', 'traceability-graph', 'interface-profile', 'business-plan-v2', 'functional-spec', 'technical-design', 'system-design', 'architecture-impact']);
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
  if (!contractKinds.includes(kind)) throw new Error('contrato desconhecido');
  return JSON.parse(readFileSync(new URL(`../../fabrica/team/contracts/${kind}.schema.json`, import.meta.url), 'utf8'));
}
export function validateContract(kind, value, expectedTaskId) {
  const schema = loadSchema(kind==='business-plan'&&value?.schema_version===2?'business-plan-v2':kind);
  assertSupported(schema);
  check(schema, value);
  if (expectedTaskId && value.task_id !== expectedTaskId) throw new Error('task_id divergente');
  if(kind==='delegation'&&value.experience_impact&&!value.experience_impact.rationale.trim())throw new Error('classificação de impacto UX exige justificativa');
  if (kind === 'review') {
    if(value.review_type==='security'){
      for(const finding of value.findings){
        if(!Object.hasOwn(finding,'security_reference')||!finding.security_reference.trim())throw new Error('achado de segurança exige security_reference OWASP aplicável');
        if(!/^OWASP\b/i.test(finding.security_reference.trim())&&!/^https:\/\/(?:[\w-]+\.)*owasp\.org(?:\/|$)/i.test(finding.security_reference.trim()))throw new Error('achado de segurança exige referência OWASP identificável');
      }
    }
    if(value.review_type==='ux_accessibility'&&['approved','approved_with_findings'].includes(value.verdict)){
      const criteria=['task_clarity','visual_hierarchy','visual_identity','interaction_states','responsive_behavior','accessibility','performance'];
      if(!Array.isArray(value.ux_assessment)||new Set(value.ux_assessment.map(item=>item.criterion)).size!==criteria.length||criteria.some(criterion=>!value.ux_assessment.some(item=>item.criterion===criterion&&item.score>=4&&item.score<=5&&item.evidence.every(text=>text.trim().length>0))))throw new Error('aprovação UX exige avaliação completa, evidências e mínimo 4/5 em cada dimensão');
    }
    if(value.review_type==='ux_accessibility'&&value.findings.length){
      const required=['finding_id','affected_feature','affected_flow','priority','cause_hypothesis','dependencies','acceptance_criteria','owner','required_tests','resolution_status'];
      const ids=new Set();
      for(const finding of value.findings){
        for(const field of required)if(!Object.hasOwn(finding,field))throw new Error(`achado UX exige campo ${field}`);
        if(ids.has(finding.finding_id))throw new Error('identificador UX duplicado');
        ids.add(finding.finding_id);
      }
    }
    if(value.review_type==='architecture'&&value.findings.length){
      const required=['finding_id','affected_component','affected_module','decision_ref','functional_impact','technical_impact','operational_impact','priority','cause_hypothesis','alternatives_considered','dependencies','acceptance_criteria','owner','required_tests','resolution_status'];
      const ids=new Set();
      for(const finding of value.findings){
        for(const field of required)if(!Object.hasOwn(finding,field))throw new Error(`achado arquitetural exige campo ${field}`);
        if(ids.has(finding.finding_id))throw new Error('identificador arquitetural duplicado');
        ids.add(finding.finding_id);
      }
    }
    if (value.verdict === 'approved' && value.findings.length) throw new Error('approved exige ausência de achados');
    if (value.verdict === 'approved_with_findings' && value.findings.some(f => ['blocker', 'critical', 'high'].includes(f.severity)))
      throw new Error('achado alto/bloqueador exige changes_required ou blocked');
    if (value.review_type === 'architecture' && value.findings.some(f => ['blocker', 'critical', 'high'].includes(f.severity)) && value.verdict !== 'changes_required' && value.verdict !== 'blocked')
      throw new Error('achado arquitetural alto/bloqueador exige changes_required ou blocked');
  }
  return value;
}

export function validateAgainstSchema(schema, value) {
  assertSupported(schema);
  check(schema, value);
  return value;
}
