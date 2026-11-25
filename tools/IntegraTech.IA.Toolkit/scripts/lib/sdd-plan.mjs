import {inspectSystemDesign} from './system-design.mjs';
import {architectureCurrent,architectureEstablished} from './architecture-inspection.mjs';
import {assessArchitectureImpact} from './architecture-impact.mjs';
import {sourceRoot,sourceFile,sourceBinding} from './project-locations.mjs';
import { readFileSync, lstatSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateAgainstSchema } from './contracts.mjs';
import { contained, assertNoLinks } from './paths.mjs';

const limit = 256 * 1024;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const digest = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const safeId = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(value);
const schema = kind => JSON.parse(readFileSync(new URL(`../../fabrica/team/contracts/${kind}.schema.json`, import.meta.url), 'utf8'));

function meaningful(value) {
  if (typeof value === 'string') {
    if (!value.trim() || /^(?:todo|tbd|pendente|a definir|preencher|placeholder|\.\.\.|<[^>]*>)\s*[.!]?$/i.test(value.trim())) throw new Error('SDD: conteúdo vazio/placeholder');
  } else if (Array.isArray(value)) value.forEach(meaningful);
  else if (value && typeof value === 'object') Object.values(value).forEach(meaningful);
}
function canonical(repo, name) {
  if (typeof name !== 'string' || name === '.' || name !== name.trim() || /[\\\x00-\x1f\x7f:*?\[\]{}]/.test(name)
    || name.split('/').some(part => !part || part === '.' || part === '..') || posix.normalize(name) !== name)
    throw new Error('SDD: caminho relativo canônico obrigatório');
  return contained(repo, name);
}
function readDocument(repo, path) {
  const full = canonical(repo, path);
  const stat = lstatSync(full);
  if (!stat.isFile() || stat.size > limit) throw new Error('SDD: documento inválido ou acima de 256 KiB');
  const bytes = readFileSync(full);
  if (bytes.length > limit) throw new Error('SDD: documento acima de 256 KiB');
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  if (text.includes('\0')) throw new Error('SDD: documento binário');
  return { value: JSON.parse(text), sha256: hash(bytes) };
}
function unique(values, label) {
  if (new Set(values).size !== values.length) throw new Error(`SDD: ${label} duplicado`);
}
function checkIds(values, label) {
  unique(values, label);
  if (values.some(value => !safeId(value))) throw new Error(`SDD: identificador inválido (${label})`);
}
const owns = (roots, path) => roots.some(root => path === root || path.startsWith(root + '/'));

/** Inspect approved-plan inputs only. Validation commands and intended test paths are data, never execution evidence. */
export function inspectSDDPlan({ repo, plan, contextHash }) {
  assertNoLinks(repo);
  if (Buffer.byteLength(JSON.stringify(plan)) > limit) throw new Error('SDD: plano acima de 256 KiB');
  validateAgainstSchema(schema('business-plan-v2'), plan);
  meaningful(plan);
  const architecture=architectureCurrent(repo);
  if(architecture){
    if(plan.architecture_sha256!==architecture.decision_sha256)throw new Error('SDD: decisão arquitetural ausente ou alterada');
    if(architecture.decision.mode==='evolution'&&!architectureEstablished(repo,architecture.decision)&&architecture.decision.migration.phases.some(id=>!plan.phases.some(p=>p.id===id)))throw new Error('SDD: fases da migração ausentes');
    const transition=architecture.decision.migration?.oracle_transition;if(transition&&!architectureEstablished(repo,architecture.decision)&&!plan.phases.flatMap(p=>p.tasks).some(t=>t.id===transition.task_id))throw new Error('SDD: tarefa da transição de oráculo ausente');
  }
  const binding=sourceBinding(repo);if(binding&&plan.source_binding_sha256!==binding)throw new Error('SDD: plano não vinculado ao fonte externo atual');
  if (!digest(contextHash) || plan.context_sha256 !== contextHash) throw new Error('SDD: contexto do plano divergente');
  if (!digest(plan.specification_sha256) || !digest(plan.design_sha256)) throw new Error('SDD: hash de artefato inválido');
  unique(plan.consultation_paths, 'consulta');
  plan.consultation_paths.forEach(path => canonical(repo, path));

  const spec = readDocument(repo, plan.specification_path);
  const technical = readDocument(repo, plan.design_path);
  const specification = validateAgainstSchema(schema('functional-spec'), spec.value);
  const design = validateAgainstSchema(schema('technical-design'), technical.value);
  meaningful(specification); meaningful(design);
  const statePath=contained(repo,'references/project-state.json');
  const state=existsSync(statePath)?JSON.parse(readFileSync(statePath,'utf8')):{};
  const hasSystemSignals=specification.requirements.some(r=>Array.isArray(r.system_design_signals)&&r.system_design_signals.length>0);
  if(state.system_design_mode==='contextual-v1'||Object.hasOwn(design,'system_design')||hasSystemSignals)inspectSystemDesign({repo,context,specification,technicalDesign:design,contextHash,specificationHash:spec.sha256,required:state.system_design_mode==='contextual-v1'||hasSystemSignals});
  if (plan.specification_sha256 !== spec.sha256 || plan.design_sha256 !== technical.sha256)
    throw new Error('SDD: bytes da especificação/desenho divergentes');
  if (specification.context_sha256 !== contextHash || design.context_sha256 !== contextHash || design.specification_sha256 !== spec.sha256)
    throw new Error('SDD: especificação/desenho divergente do contexto ou especificação');

  const requirementIds = specification.requirements.map(requirement => requirement.id);
  const scenarioOwners = new Map();
  checkIds(requirementIds, 'requisito');
  const scenarios = specification.requirements.flatMap(requirement => requirement.scenarios.map(scenario => {
    scenarioOwners.set(scenario.id, requirement.id);
    return scenario.id;
  }));
  checkIds(scenarios, 'cenário');
  const phaseIds = plan.phases.map(phase => phase.id);
  checkIds(phaseIds, 'fase');
  checkIds(plan.phases.flatMap(phase => phase.tasks.map(task => task.id)), 'tarefa');

  const phases = new Map(plan.phases.map(phase => [phase.id, phase]));
  for (const phase of plan.phases) {
    unique(phase.depends_on, 'dependência de fase');
    if (phase.depends_on.some(id => !phases.has(id) || id === phase.id)) throw new Error('SDD: dependência de fase inválida');
  }
  // Stable topological order: among currently available phases preserve their order in the plan.
  const ordered = [];
  const done = new Set();
  while (ordered.length < plan.phases.length) {
    const phase = plan.phases.find(candidate => !done.has(candidate.id) && candidate.depends_on.every(id => done.has(id)));
    if (!phase) throw new Error('SDD: ciclo entre fases');
    ordered.push(phase); done.add(phase.id);
  }

  // Read the installed factory catalog directly, avoiding governance/precheck import cycles.
  const catalogPath = new URL('../../fabrica/team/catalog.yaml', import.meta.url);
  assertNoLinks(fileURLToPath(catalogPath));
  if (!lstatSync(catalogPath).isFile() || lstatSync(catalogPath).size > limit) throw new Error('SDD: catálogo inválido');
  const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
  const owners = new Set(catalog.specialists.filter(role => role.kind === 'executor' && role.read_only === false && role.name !== 'traceability-maintainer').map(role => role.name));
  const coveredRequirements = new Set();
  const coveredScenarios = new Set();
  const tasks = [];
  for (const phase of ordered) for (const [index, task] of phase.tasks.entries()) {
    if (!owners.has(task.owner)) throw new Error('SDD: owner exige executor autorizado para implementação');
    unique(task.requirement_ids, 'requisito vinculado'); unique(task.scenario_ids, 'cenário vinculado');
    if (task.requirement_ids.some(id => !requirementIds.includes(id))) throw new Error('SDD: requisito desconhecido');
    if (task.scenario_ids.some(id => !scenarioOwners.has(id) || !task.requirement_ids.includes(scenarioOwners.get(id))))
      throw new Error('SDD: cenário desconhecido ou fora dos requisitos vinculados');
    for (const field of ['read_files', 'write_files', 'test_paths']) {
      unique(task[field], field);
      task[field].forEach(path => {canonical(sourceRoot(repo), path);sourceFile(repo,path);});
    }
    for (const path of task.test_paths) {
      if (!owns([...task.read_files, ...task.write_files], path)) throw new Error('SDD: teste fora do ownership de leitura/escrita');
      try {
        if (!lstatSync(sourceFile(repo, path)).isFile()) throw new Error('SDD: caminho de teste deve nomear arquivo');
      } catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    if (architecture) {
      const impact = assessArchitectureImpact({ impact: task.architecture_impact, requirementIds: task.requirement_ids, writeFiles: task.write_files });
      if (impact.status !== 'ready') throw new Error(`SDD: impacto arquitetural bloqueado (${impact.reason})`);
      if (['N3', 'N4'].includes(impact.classification) && !task.architecture_impact.decision_refs.includes(architecture.state.architecture_path))
        throw new Error('SDD: impacto N3/N4 deve referenciar a decisão arquitetural vigente');
      for (const ref of task.architecture_impact.decision_refs) {
        const full = canonical(repo, ref); const stat = lstatSync(full);
        if (!stat.isFile() || stat.size > limit) throw new Error('SDD: referência de decisão arquitetural inválida');
      }
      if (impact.classification === 'N4') {
        if (architecture.decision.mode !== 'evolution') throw new Error('SDD: N4 exige decisão arquitetural de evolução aprovada');
        if (!architecture.decision.migration.phases.includes(phase.id)) throw new Error('SDD: tarefa N4 fora de uma fase de migração aprovada');
      }
    } else if (task.architecture_impact) {
      const impact = assessArchitectureImpact({ impact: task.architecture_impact, requirementIds: task.requirement_ids, writeFiles: task.write_files });
      if (impact.status !== 'ready') throw new Error(`SDD: impacto arquitetural inválido (${impact.reason})`);
    }
    task.requirement_ids.forEach(id => coveredRequirements.add(id));
    task.scenario_ids.forEach(id => coveredScenarios.add(id));
    const depends_on = index > 0 ? [phase.tasks[index - 1].id]
      : phase.depends_on.map(id => phases.get(id).tasks.at(-1).id);
    tasks.push({ ...task, phase_id: phase.id, depends_on });
  }
  if (requirementIds.some(id => !coveredRequirements.has(id)) || scenarios.some(id => !coveredScenarios.has(id)))
    throw new Error('SDD: todos os requisitos e cenários exigem tarefa vinculada');
  return { specification, design, tasks, phase_order: ordered.map(phase => phase.id), specification_sha256: spec.sha256, design_sha256: technical.sha256 };
}
