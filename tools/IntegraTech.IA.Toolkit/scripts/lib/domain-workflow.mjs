import {linkedProject,sourceFile} from './project-locations.mjs';
import {inventory,fingerprint} from './candidate.mjs';
import {sddStatus,sddDelegation,actionPlan} from './sdd-workflow.mjs';
import {engineeringStatus} from './engineering-loop.mjs';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, lstatSync, unlinkSync, mkdtempSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { contained, assertNoLinks, assertSanitized } from './paths.mjs';
import { atomicFileWrite, restoreAdoption, currentHash, transactionPath } from './adoption-recovery.mjs';
import { validateContract } from './contracts.mjs';
import { digest, contextHash, inspectPreparation, specialistFiles, meaningful } from './domain-specialist.mjs';
import { verifyResearch, inspectReceipts } from './domain-research.mjs';
import { selectedProviders } from './provider-selection.mjs';

export function readDocument(repo, path) {
  const full = contained(repo, path);
  if (!lstatSync(full).isFile() || lstatSync(full).size > 128 * 1024) throw new Error('Documento inválido ou acima do limite.');
  return JSON.parse(readFileSync(full, 'utf8'));
}
export function inspectSpecialist(repo) {
  const state = readDocument(repo, 'references/project-state.json');
  if (!state.specialist_path) throw new Error('Especialista ausente; complete contexto e pesquisa com specialist-prepare.');
  const meta = readDocument(repo, state.specialist_path);
  const context = readDocument(repo, state.context_path);
  const preparation = readDocument(repo, meta.preparation_path);
  const checked = inspectPreparation({ context, preparation }); inspectReceipts(preparation);
  const identity = readDocument(repo, 'project.json');
  const expected = specialistFiles({ name: identity.name, provider: identity.provider, context, preparation });
  const expectedMeta = JSON.parse(expected.get('references/domain-specialist.json'));
  if (meta.context_sha256 !== checked.context_sha256 || meta.preparation_sha256 !== checked.preparation_sha256 || JSON.stringify(meta) !== JSON.stringify(expectedMeta)) throw new Error('Especialista diverge do contexto, pesquisa ou configuração atual.');
  for (const path of [meta.skill_path, ...meta.adapter_paths]) if (digest(readFileSync(contained(repo, path))) !== meta.skill_sha256) throw new Error('Skill/adaptador alterado ou divergente.');
  return meta;
}
export function inspectConsultation(repo, record) {
  validateContract('domain-consultation', record); meaningful(record); assertSanitized(JSON.stringify(record));
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(record.feature_id)) throw new Error('Identificador de funcionalidade inválido.');
  const meta = inspectSpecialist(repo);
  for (const field of ['context_sha256', 'preparation_sha256', 'skill_sha256']) if (record[field] !== meta[field]) throw new Error('Consulta diverge do especialista/contexto atual.');
  return { status: 'ready', feature_id: record.feature_id };
}
export function recordConsultation({ repo, record }) {
  const checked = inspectConsultation(repo, record);
  const path = `references/domain-consultations/${record.feature_id}.json`;
  const full = contained(repo, path);
  if (existsSync(full)) throw new Error('Registro de consulta já existe; revise e use uma nova versão do identificador de desenho.');
  mkdirSync(dirname(full), { recursive: true }); atomicFileWrite(full, JSON.stringify(record, null, 2) + '\n', { exclusive: true });
  return { ...checked, path };
}
export function prepareSpecialist({ repo, preparation, request }) {
  repo = resolve(repo); assertNoLinks(repo);
  const identity = readDocument(repo, 'project.json');
  if (identity.is_model !== false) throw new Error('Prepare especialista apenas em projeto real; não transforme o modelo canônico.');
  const state = readDocument(repo, 'references/project-state.json');
  const context = readDocument(repo, state.context_path);
  verifyResearch({ context, preparation, request });
  const files = specialistFiles({ name: identity.name, provider: identity.provider, context, preparation });
  let old;
  if (state.specialist_path) old = readDocument(repo, state.specialist_path);
  const snapshots = new Map();
  for (const [path, text] of files) {
    const full = contained(repo, path);
    const current = existsSync(full) ? readFileSync(full) : null;
    if (current && current.toString('utf8') !== text) {
      const controlled = old && (path === old.skill_path || old.adapter_paths.includes(path)) && digest(current) === old.skill_sha256
        || old && path === old.preparation_path && digest(JSON.stringify(JSON.parse(current))) === old.preparation_sha256
        || old && path === state.specialist_path && JSON.stringify(JSON.parse(current)) === JSON.stringify(old);
      if (!controlled) throw new Error(`conflito: arquivo alterado ${path}; preservado.`);
    }
    // Even identical output cannot conceal a locally edited adapter of another version.
    snapshots.set(path, current);
  }
  if (old) for (const path of [old.skill_path, ...old.adapter_paths]) if (!existsSync(contained(repo, path)) || digest(readFileSync(contained(repo, path))) !== old.skill_sha256) throw new Error(`conflito: skill/adaptador alterado ${path}`);
  const statePath = 'references/project-state.json';
  snapshots.set(statePath, readFileSync(contained(repo, statePath)));
  files.set(statePath, JSON.stringify({ ...state, specialist_path: 'references/domain-specialist.json', workflow_status: 'materialized' }, null, 2) + '\n');
  const parent = contained(repo, '.scratch/adoptions'); mkdirSync(parent, { recursive: true });
  const run = mkdtempSync(join(parent, 'domain-'));
  const journalPath = join(run, 'journal.json');
  const journal = { version: 1, repo, status: 'prepared', operations: [...files].map(([path, text]) => ({ path, before: snapshots.get(path) ? digest(snapshots.get(path)) : null, after: digest(text) })) };
  for (const [path, bytes] of snapshots) if (bytes) { const backup = join(run, 'before', path); mkdirSync(dirname(backup), { recursive: true }); writeFileSync(backup, bytes); }
  const saveJournal = () => atomicFileWrite(journalPath, JSON.stringify(journal, null, 2) + '\n');
  saveJournal();
  try {
    for (const op of journal.operations) if (currentHash(transactionPath(repo, op.path)) !== op.before) throw new Error('Conflito antes da preparação.');
    journal.status = 'applying'; saveJournal();
    for (const op of journal.operations) {
      const full = transactionPath(repo, op.path);
      if (currentHash(full) !== op.before) throw new Error('Conflito durante preparação.');
      mkdirSync(dirname(full), { recursive: true }); atomicFileWrite(full, files.get(op.path), { exclusive: op.before === null });
    }
    journal.status = 'applied'; saveJournal();
  } catch (error) {
    journal.status = 'recovery_required';
    try { saveJournal(); } catch { /* The last complete journal remains recoverable. */ }
    try { restoreAdoption(journalPath); }
    catch { throw new Error(`Preparação interrompida por conflito; recuperação necessária: ${journalPath}. Preserve a edição local e revise antes de recuperar.`); }
    throw error;
  }
  return { status: 'prepared', journal: journalPath, next_step: 'Revisar otimizações e concluir com coherence-run e coherence-check.' };
}
const ignoredDirectories = new Set(['.git', '.integratech', '.scratch', 'node_modules', 'bin', 'obj', '.vs', '.idea', 'qa-artifacts', 'runtime-publish', 'TestResults', 'secrets']);
const ignoredReports = new Set(['references/domain-validation.json', 'references/domain-coherence.json']);
export function repositorySnapshot(repo) {
  const entries = [];
  let size = 0;
  function walk(directory, prefix = '') {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const path = prefix + entry.name;
      if (ignoredDirectories.has(entry.name) || ignoredReports.has(path) || /^\.env(?:\.|$)/.test(entry.name) || /\.(?:log|trx|pfx|pem|key)$/.test(entry.name)) continue;
      const full = contained(repo, path);
      if (entry.isSymbolicLink()) throw new Error('Inventário não aceita links simbólicos.');
      if (entry.isDirectory()) walk(full, path + '/');
      else if (entry.isFile()) {
        size += lstatSync(full).size;
        if (size > 128 * 1024 * 1024 || entries.length >= 10000) throw new Error('Inventário acima do limite.');
        let data = readFileSync(full);
        if (path === 'references/project-state.json') { const state = JSON.parse(data); delete state.workflow_status; delete state.coherence_path; data = Buffer.from(JSON.stringify(state)); }
        entries.push([path, digest(data)]);
      } else throw new Error('Arquivo especial no inventário.');
    }
  }
  walk(resolve(repo));
  if(linkedProject(repo))entries.push(['source-inventory',fingerprint(inventory(repo))]);
  return digest(JSON.stringify(entries));
}
function validationCommands(repo) {
  const link=linkedProject(repo);if(link)return [['sdd-checkpoints',link.id]];
  const identity = readDocument(repo, 'project.json');
  if (!/^[A-Z][A-Za-z0-9]{0,49}$/.test(identity.name)) throw new Error('Identidade inválida.');
  return [['npm', 'test'], ['npm', 'run', 'check'], ['dotnet', 'build', `${identity.name}.sln`, '--disable-build-servers', '-m:1', '-p:UseSharedCompilation=false'], ['dotnet', 'run', '--project', `tests/${identity.name}.Arquitetura.Tests`, '--no-build']];
}
export function runCoherenceChecks({ repo, execute = (command, args, options) => spawnSync(command, args, options) }) {
  inspectSpecialist(repo);
  const snapshot = repositorySnapshot(repo);
  const commands = [];
  if(linkedProject(repo)){
    let valid=false;try{const status=sddStatus({repo});const {action}=actionPlan(repo);valid=status.status==='completed'&&action.tasks.some(task=>engineeringStatus({repo,id:sddDelegation({repo,id:task.id}).task_id}).delivery_valid);}catch{}
    const record={schema_version:1,snapshot_sha256:snapshot,commands:[{argv:validationCommands(repo)[0],exit_code:valid?0:2,output_sha256:digest(JSON.stringify({valid,snapshot})),passed:valid}],status:valid?'passed':'blocked'};
    atomicFileWrite(contained(repo,'references/domain-validation.json'),JSON.stringify(record,null,2)+'\n');
    return {status:valid?'ready':'blocked',reason_code:valid?'observed_sdd_checkpoints':'linked_project_requires_observed_sdd_validation',commands:record.commands};
  }
  for (const [command, ...args] of validationCommands(repo)) {
    const result = execute(command, args, { cwd: resolve(repo), timeout: 600000, maxBuffer: 4 * 1024 * 1024, encoding: 'utf8', shell: false });
    commands.push({ argv: [command, ...args], exit_code: result.status, output_sha256: digest(String(result.stdout ?? '') + String(result.stderr ?? '')), passed: result.status === 0 && !result.error && !result.signal });
    if (!commands.at(-1).passed) break;
  }
  const ready = commands.length === validationCommands(repo).length && commands.every(c => c.passed) && repositorySnapshot(repo) === snapshot;
  atomicFileWrite(contained(repo, 'references/domain-validation.json'), JSON.stringify({ schema_version: 1, snapshot_sha256: snapshot, commands, status: ready ? 'passed' : 'blocked' }, null, 2) + '\n');
  return { status: ready ? 'ready' : 'blocked', commands };
}
export function inspectCoherence({ repo, report }) {
  validateContract('domain-coherence', report); meaningful(report); assertSanitized(JSON.stringify(report));
  const meta = inspectSpecialist(repo);
  for (const field of ['context_sha256', 'preparation_sha256', 'skill_sha256']) if (meta[field] !== report[field]) throw new Error('Relatório diverge do especialista/contexto atual.');
  if (report.snapshot_sha256 !== repositorySnapshot(repo)) throw new Error('Repositório mudou: atualize revisão e verificações.');
  const areas = ['structure', 'code', 'tests', 'dependencies', 'configuration', 'documentation', 'skills', 'context'];
  if (report.assessments.length !== areas.length || areas.some(area => report.assessments.filter(a => a.area === area && a.status === 'passed').length !== 1) || report.pending.some(p => p.blocking)) throw new Error('Revisão global incompleta ou com contradições bloqueadoras.');
  for (const change of report.changes) linkedProject(repo)&&change.path.startsWith('source/')?sourceFile(repo,change.path.slice(7)):contained(repo, change.path);
  let validation;
  try { validation = readDocument(repo, 'references/domain-validation.json'); } catch { throw new Error('Verificações obrigatórias ausentes: execute coherence-run.'); }
  if (validation.status !== 'passed' || validation.snapshot_sha256 !== report.snapshot_sha256 || JSON.stringify(validation.commands.map(c => c.argv)) !== JSON.stringify(validationCommands(repo)) || validation.commands.some(c => !c.passed || c.exit_code !== 0 || !/^[a-f0-9]{64}$/.test(c.output_sha256))) throw new Error('Validação obrigatória falhou ou diverge do repositório atual.');
  return { status: 'ready', snapshot_sha256: report.snapshot_sha256 };
}
export function completeCoherence({ repo, report }) {
  const result = inspectCoherence({ repo, report });
  atomicFileWrite(contained(repo, 'references/domain-coherence.json'), JSON.stringify(report, null, 2) + '\n');
  const state = readDocument(repo, 'references/project-state.json');
  atomicFileWrite(contained(repo, 'references/project-state.json'), JSON.stringify({ ...state, workflow_status: 'completed', coherence_path: 'references/domain-coherence.json' }, null, 2) + '\n');
  return result;
}
