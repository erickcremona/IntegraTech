import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, existsSync, unlinkSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { prepareProject } from './project-generator.mjs';
import { contained, assertNoLinks, assertSanitized } from './paths.mjs';
import { restoreAdoption, transactionPath, exactHash, currentHash, atomicFileWrite } from './adoption-recovery.mjs';
import { checkPolicy } from './policy.mjs';

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
  const problem = typeof context === 'string' ? context : context?.problem;
  if (typeof problem !== 'string' || !problem.trim()) questions.push('Qual problema seu projeto precisa resolver?');
  return { status: questions.length ? 'needs_input' : 'ready_for_adoption', questions };
}
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
export function adoptProject({ repo, name, context, dryRun = false, contextFile }) {
  const root = resolve(repo);
  assertNoLinks(root);
  const identity = JSON.parse(readFileSync(transactionPath(root, 'project.json'), 'utf8'));
  if (identity.is_model !== true) throw new Error('projeto já é real/adotado; alteração de identidade deve ser uma tarefa explícita');
  if (checkPolicy({ repo: root, action: 'adopt', agent: 'cto', phase: 'discovery' }).status !== 'allowed') throw new Error('política não permite adoção');
  const baselinePath = `tools/${identity.name}.IA.Toolkit/fabrica/template-baseline.json`;
  const baseline = JSON.parse(readFileSync(transactionPath(root, baselinePath), 'utf8'));
  if (baseline.version !== 1 || !baseline.files || !baseline.canonical_repository) throw new Error('baseline inválido');
  if (existsSync(join(root, '.git'))) {
    assertNoLinks(join(root, '.git'));
    let remotes;
    try {
      remotes = execFileSync('git', ['-C', root, 'config', '--get-regexp', '^remote\..*\.(url|pushurl)$'], { encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (error) { if (error.status === 1) remotes = ''; else throw new Error('não foi possível verificar os remotos Git'); }
    const canonical = normalizeRemote(baseline.canonical_repository);
    if (remotes.split(/\r?\n/).filter(Boolean).some(line => normalizeRemote(line.replace(/^\S+\s+/, '')) === canonical))
      throw new Error('modelo canônico protegido: use uma cópia/repositório próprio antes de adotar');
  }
  const initial = normalizeInitialContext(context);
  const files = prepareProject({ source: root, name, provider: identity.provider, presentation: identity.presentation });
  const newIdentity = JSON.parse(files.get('project.json'));
  newIdentity.adoption = { status: 'adopted', context_path: 'references/business-context.json' };
  files.set('project.json', JSON.stringify(newIdentity, null, 2) + '\n');
  files.set('references/business-context.json', JSON.stringify(initial, null, 2) + '\n');
  files.set('SOLUTION_CONTEXT.md', `# ${name} — projeto real\n\nEste projeto foi adotado pelo desenvolvedor. Não repetir onboarding, renomeação ou geração do modelo.\n\nO problema original e os fatos informados estão em references/business-context.json. Leia esse contexto antes de qualquer tarefa de negócio. Dados ausentes são perguntas de descoberta, não requisitos presumidos.\n\nEstado atual: discovery, com escopo/plano/aceite pendentes. Ser projeto real não autoriza implementar funcionalidades nem efeitos externos. Consulte references/README.md e a governança em tools/${name}.IA.Toolkit/fabrica/governance.md.\n`);
  files.set('references/README.md', `# Retomada de ${name}\n\nProjeto real, com nome e problema já informados. Leia project.json, business-context.json e project-state.json. Não repetir perguntas já respondidas nem voltar ao onboarding do modelo. Continue a descoberta pelas dúvidas do contexto.\n\nDesign exige contexto validado; business exige plano e aceite documentados. Adoção não representa aprovação funcional. Preserve os fatos originais e registre novas decisões explicitamente.\n`);
  files.set('README.md', files.get('README.md').replace('O problema de negócio ainda não foi definido.', 'Projeto real com contexto inicial registrado em references/business-context.json. Continue a descoberta a partir dos fatos já informados.').replace('Nenhum remoto, credencial, aprovação ou evidência de outro projeto foi herdado.', 'Git, remotos existentes e arquivos pessoais foram preservados. Adoção não autoriza push, deploy ou implementação sem os gates aplicáveis.'));
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
  if (dryRun) return { status: 'planned', name, root, operations: operations.map(op => ({ path: op.path, action: op.after === null ? 'remove' : op.before === null ? 'create' : 'replace' })) };
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
    journal.status = 'applied'; save();
  } catch (error) {
    journal.status = 'recovery_required';
    try { save(); } catch { /* Previous complete journal remains usable. */ }
    try { restoreAdoption(journalPath); } catch { throw new Error(`adoção interrompida; recuperação local necessária: ${journalPath}`); }
    throw error;
  }
  return { status: 'adopted', name, root, journal: journalPath, recovery: join(run, 'recover.mjs'), next_step: 'Continuar discovery a partir do contexto já informado, sem repetir onboarding.' };
}
