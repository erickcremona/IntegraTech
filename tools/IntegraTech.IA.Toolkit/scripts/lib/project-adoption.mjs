import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, existsSync, unlinkSync, rmdirSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { prepareProject } from './project-generator.mjs';
import { contained, assertNoLinks } from './paths.mjs';
import { restoreAdoption, transactionPath, exactHash, currentHash, atomicFileWrite } from './adoption-recovery.mjs';
import { normalizeInitialContext } from './business-context.mjs';
export { normalizeInitialContext } from './business-context.mjs';
import { assessContext } from './domain-specialist.mjs';
import { checkPolicy } from './policy.mjs';
import { auditToolkit } from './toolkit-audit.mjs';
import { formatInstallationRequest } from './host-dependencies.mjs';

export const baselineHash = data => exactHash(data.toString('utf8').replaceAll('\r\n', '\n'));
const normalizeRemote = value => {
  const text = value.trim().replace(/^[^/@:]+@([^:]+):/, 'https://$1/');
  try {
    const url = new URL(text);
    return `${url.hostname}${url.pathname}`.replace(/\.git\/?$/i, '').replace(/\/$/, '').toLowerCase();
  } catch { return text.replace(/\.git\/?$/i, '').replace(/\/$/, '').toLowerCase(); }
};
export function onboarding({ repo, name, context }) {
  const identity = JSON.parse(readFileSync(transactionPath(resolve(repo), 'project.json'), 'utf8'));
  if (identity.is_model === false) return { status: 'project_real', name: identity.name, next_step: 'Ler o contexto existente e continuar a descoberta; não repetir adoção.' };
  const questions = [];
  if (typeof name !== 'string' || !name.trim()) questions.push('Qual será o nome do projeto?');
  const assessed = assessContext(context);
  questions.push(...assessed.questions.map(q => q.question));
  return { status: questions.length ? 'needs_input' : 'needs_domain_research', questions };
}
export function adoptProject({ repo, name, context, dryRun = false, contextFile, technologyDecision, architectureDecision, preparation, researchRequest, provider, gitExecFileSync = execFileSync }) {
  const root = resolve(repo);
  assertNoLinks(root);
  const identity = JSON.parse(readFileSync(transactionPath(root, 'project.json'), 'utf8'));
  if (identity.is_model !== true) throw new Error('projeto já é real/adotado; alteração de identidade deve ser uma tarefa explícita');
  if (checkPolicy({ repo: root, action: 'adopt', agent: 'cto', phase: 'discovery' }).status !== 'allowed') throw new Error('política não permite adoção');
  const baselinePath = `tools/${identity.name}.IA.Toolkit/fabrica/template-baseline.json`;
  const baseline = JSON.parse(readFileSync(transactionPath(root, baselinePath), 'utf8'));
  if (baseline.version !== 1 || !baseline.files || !baseline.canonical_repository) throw new Error('baseline inválido');
  const readinessReport = auditToolkit(root);
  if (readinessReport.structural_status === 'blocked') throw new Error(`auditoria estrutural do toolkit bloqueou a adoção: ${readinessReport.issues.join('; ')}`);
  if (!dryRun && ['installation_required', 'verification_required'].includes(readinessReport.dependencies.status)) throw new Error(formatInstallationRequest(readinessReport.dependencies));
  if (!dryRun && !readinessReport.verification) throw new Error('adoção bloqueada: execute npm run verify, corrija falhas e repita até haver validação aprovada do conteúdo atual do toolkit');
  if (existsSync(join(root, '.git'))) {
    assertNoLinks(join(root, '.git'));
    let remotes;
    try {
      remotes = gitExecFileSync('git', ['-C', root, 'config', '--get-regexp', '^remote\..*\.(url|pushurl)$'], { encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (error) { if (error.status === 1) remotes = ''; else throw new Error('não foi possível verificar os remotos Git'); }
    const canonical = normalizeRemote(baseline.canonical_repository);
    if (remotes.split(/\r?\n/).filter(Boolean).some(line => normalizeRemote(line.replace(/^\S+\s+/, '')) === canonical))
      throw new Error('modelo canônico protegido: use uma cópia/repositório próprio antes de adotar');
  }
  const initial = normalizeInitialContext(context);
  const files = prepareProject({ source: root, name, provider: provider ?? identity.provider, context: initial, technologyDecision, architectureDecision, preparation, researchRequest, decisionRepo: root });
  const newIdentity = JSON.parse(files.get('project.json'));
  newIdentity.adoption = { status: 'adopted', context_path: 'references/business-context.json' };
  files.set('project.json', JSON.stringify(newIdentity, null, 2) + '\n');
  files.set('references/business-context.json', JSON.stringify(initial, null, 2) + '\n');
  files.set('README.md', files.get('README.md').replace('O problema de negócio ainda não foi definido.', 'Projeto real com contexto inicial registrado em references/business-context.json. Continue a descoberta a partir dos fatos já informados.').replace('Nenhum remoto, credencial, aprovação ou evidência de outro projeto foi herdado.', 'Git, remotos existentes e arquivos pessoais foram preservados. Adoção não autoriza push, deploy ou implementação sem os gates aplicáveis.'));
  files.set('references/toolkit-readiness.md', readinessReport.content);
  const old = new Set([...Object.keys(baseline.files), baselinePath]);
  const before = new Map();
  for (const path of old) {
    const full = transactionPath(root, path);
    if (!existsSync(full)) throw new Error(`conflito: arquivo do modelo ausente: ${path}`);
    const data = readFileSync(full);
    const isInput = contextFile && resolve(contextFile) === full && path === 'references/business-context.json';
    if (isInput) {
      let selected;
      try { selected = normalizeInitialContext(JSON.parse(data.toString('utf8').replace(/^\uFEFF/, ''))); }
      catch { throw new Error('arquivo de contexto selecionado inválido'); }
      if (JSON.stringify(selected) !== JSON.stringify(initial)) throw new Error('contexto selecionado diverge da entrada');
    }
    if (path !== baselinePath && !isInput && baselineHash(data) !== baseline.files[path]) throw new Error(`conflito: arquivo do modelo alterado: ${path}`);
    before.set(path, data);
  }
  for (const path of files.keys()) {
    const full = transactionPath(root, path);
    if (existsSync(full) && !old.has(path)) throw new Error(`conflito: destino já existe: ${path}`);
  }
  const operations = [...new Set([...old, ...files.keys()])].sort((a, b) => a === 'project.json' ? 1 : b === 'project.json' ? -1 : a.localeCompare(b))
    .map(path => ({ path, before: before.has(path) ? exactHash(before.get(path)) : null, after: files.has(path) ? exactHash(Buffer.from(files.get(path), 'utf8')) : null }));
  if (dryRun) return { status: 'planned', name, root, dependencies: readinessReport.dependencies, operations: operations.map(op => ({ path: op.path, action: op.after === null ? 'remove' : op.before === null ? 'create' : 'replace' })) };
  const parent = join(root, '.scratch/adoptions');
  assertNoLinks(parent);
  mkdirSync(parent, { recursive: true });
  const run = mkdtempSync(join(parent, 'adopt-'));
  const journalPath = join(run, 'journal.json');
  for (const [path, data] of before) { const dest = contained(run, `before/${path}`); mkdirSync(dirname(dest), { recursive: true }); writeFileSync(dest, data); }
  for (const [path, text] of files) { const dest = contained(run, `after/${path}`); mkdirSync(dirname(dest), { recursive: true }); writeFileSync(dest, text, 'utf8'); }
  writeFileSync(join(run, 'recover.mjs'), readFileSync(new URL('adoption-recovery.mjs', import.meta.url)));
  const journal = { version: 1, repo: root, status: 'prepared', operations };
  const save = () => atomicFileWrite(journalPath, JSON.stringify(journal, null, 2) + '\n');
  save();
  try {
    // Verify the complete precondition again before the first mutation.
    for (const operation of operations) if (currentHash(transactionPath(root, operation.path)) !== operation.before) throw new Error('conflito após preparação');
    journal.status = 'applying'; save();
    for (const operation of operations) {
      const full = transactionPath(root, operation.path);
      if (currentHash(full) !== operation.before) throw new Error('conflito durante aplicação');
      if (operation.after === null) unlinkSync(full);
      else { mkdirSync(dirname(full), { recursive: true }); atomicFileWrite(full, files.get(operation.path), { exclusive: operation.before === null }); }
    }
    // Remove only empty directories left by controlled removals. Never recurse into user files.
    for (const operation of operations.filter(op => op.after === null)) {
      let directory = dirname(transactionPath(root, operation.path));
      while (directory !== root) {
        try { rmdirSync(directory); }
        catch (error) { if (['ENOTEMPTY', 'EEXIST', 'ENOENT'].includes(error.code)) break; throw error; }
        directory = dirname(directory);
      }
    }
    journal.status = 'applied'; save();
  } catch (error) {
    journal.status = 'recovery_required';
    try { save(); } catch { /* Previous complete journal remains usable. */ }
    try { restoreAdoption(journalPath); } catch { throw new Error(`adoção interrompida; recuperação local necessária: ${journalPath}`); }
    throw error;
  }
  return { status: 'adopted', name, root, journal: journalPath, recovery: join(run, 'recover.mjs'), readiness_report: { status: readinessReport.status, generation_status: 'generated', path: 'references/toolkit-readiness.md', content: readinessReport.content, presentation_required_before_product_work: true }, next_step: 'Apresente integralmente o relatório de prontidão ao usuário antes de iniciar qualquer trabalho do produto.' };
}
