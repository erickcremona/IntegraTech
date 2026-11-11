#!/usr/bin/env node
import {initializeRelease,checkRelease,deployRelease} from './lib/release-workflow.mjs';
import {attachProject,attachedProject,listAttachedProjects} from './lib/project-attachment.mjs';
import { initializeDesign,inspectDesign,designHash } from './lib/interface-design.mjs';
import {prepareActionPlan,sddDelegation,sddStatus} from './lib/sdd-workflow.mjs';
import {completeSDDTask} from './lib/sdd-completion.mjs';
import { interfaceRegistry } from './lib/interface-selection.mjs';
import { prepareInterface, interfaceStatus, recoverInterface } from './lib/interface-profile.mjs';
import { generateInterface, validateInterface } from './lib/interface-generator.mjs';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { catalog, precheck, route, factoryRoot, sha256 } from './lib/governance.mjs';
import { validateContract, loadSchema, assertSupported } from './lib/contracts.mjs';
import { install, validateInstalled, repoRoot } from './lib/installer.mjs';
import { checkProvider, diagnoseProviders } from './lib/providers.mjs';
import { dispatch } from './lib/dispatcher.mjs';
import { createProject } from './lib/project-generator.mjs';
import { adoptProject, onboarding } from './lib/project-adoption.mjs';
import { inspectTechnologyDecision, technologyContextHash } from './lib/technology-decision.mjs';
import { assessContext, inspectPreparation } from './lib/domain-specialist.mjs';
import { collectResearch, verifyResearch } from './lib/domain-research.mjs';
import { inspectSpecialist, prepareSpecialist, recordConsultation, inspectConsultation, repositorySnapshot, runCoherenceChecks, completeCoherence, inspectCoherence, readDocument } from './lib/domain-workflow.mjs';
import { restoreAdoption } from './lib/adoption-recovery.mjs';
import { checkPolicy } from './lib/policy.mjs';
import { inspectRun, closeInterruptedRun } from './lib/runs.mjs';
import { evaluateLocal, evaluateProtocol } from './lib/evaluations.mjs';
import { syncGraph } from './lib/traceability-sync.mjs';
import { validateGraph, graphImpact } from './lib/traceability-graph.mjs';
import { scanRepository } from './lib/secret-scan.mjs';
import { acceptCandidate, validateCandidate, reviewCandidate, engineeringStatus, handoffTask } from './lib/engineering-loop.mjs';
import { startTask, inspectTask, advanceTask, recoverTask } from './lib/task-loop.mjs';

const help = `IntegraTech Toolkit — Node.js >=22
  help
  release-init --id ID [--repo PATH] [--project ID]
  release-check --id ID [--stage staging|production] [--repo PATH] [--project ID]
  release-deploy --id ID --approval-file PATH [--stage staging|production] [--dry-run] [--repo PATH] [--project ID]
  attach-project --id ID [--source PATH] [--name NOME] [--context-file PATH] [--provider codex|claude|cursor|both|all] [--dry-run] [--repo TOOLKIT]
  attached-projects [--repo TOOLKIT]
  project-status --project ID [--repo TOOLKIT]
  sdd-plan [--dry-run] [--repo PATH]
  sdd-task --id TASK_ID [--repo PATH]
  sdd-status [--repo PATH]
  sdd-complete --id TASK_ID --run-id RUN_ID [--repo PATH]
  ui-capabilities
  ui-design-hash [--repo PATH]
  ui-design-init [--repo PATH]
  ui-design-check [--repo PATH]
  ui-prepare [--repo PATH] [--dry-run]
  ui-recover [--repo PATH]
  ui-status [--repo PATH]
  ui-generate [--repo PATH] [--dry-run]
  ui-validate [--repo PATH] [--local]
  doctor
  graph sync [--repo PATH] [--file RELATIVE] [--dry-run] [--accept-changes]
  graph validate [--repo PATH] [--file RELATIVE]
  graph impact --id ID [--repo PATH] [--file RELATIVE]
  policy-check --action review|implement|adopt|discover|design --agent PAPEL --phase FASE [--repo PATH]
  eval --mode local|protocol [--provider codex|claude] [--trials 1..3] [--live]
  run-state --id RUN_ID [--repo PATH]
  loop-start --task PATH --phase FASE --provider codex|claude|cursor [--repo PATH]
  loop-candidate --id RUN_ID --revision N --profile node-tests-v1|dotnet-offline-v1 [--repo PATH]
  loop-validate --id RUN_ID --revision N [--repo PATH]
  loop-handoff --id RUN_ID --revision N --provider codex|claude|cursor [--repo PATH]
  loop-review --id RUN_ID --revision N [--files a,b] [--repo PATH]
  loop-status --id RUN_ID [--repo PATH]
  loop-recover --id RUN_ID [--repo PATH]
  loop-advance --id RUN_ID --revision N --event gate_checked [--repo PATH]
  close-interrupted-run --id RUN_ID [--repo PATH]
  secret-scan [--repo PATH]
  research-collect --context-file PATH --preparation-file PATH --output PATH
  specialist-check --context-file PATH --preparation-file PATH
  specialist-prepare --repo PATH --preparation-file PATH
  specialist-status [--repo PATH]
  consultation-record --repo PATH --file PATH
  consultation-check --repo PATH --file PATH
  coherence-snapshot [--repo PATH]
  coherence-run [--repo PATH]
  coherence-check --repo PATH --report-file PATH
  coherence-status [--repo PATH]
  technology-check --context-file PATH [--decision-file PATH] [--repo PATH]
  onboarding [--repo PATH] [--name NomeProjeto] [--context-file PATH]
  adopt-project --name NomeProjeto --context-file PATH [--provider codex|claude|cursor|both|all] --preparation-file PATH --technology-file PATH [--presentation worker|api|console] [--repo PATH] [--dry-run]
  restore-adoption --journal PATH [--dry-run]
  create-project --name NomeProjeto --target PATH [--repo RAIZ_DO_ACEITE] [--provider codex|claude|cursor|both|all] --context-file PATH --preparation-file PATH --technology-file PATH [--presentation worker|api|console] [--dry-run]
  precheck --phase toolkit|discovery|design|business [--repo PATH]
  route --category toolkit|worker|integration|qa|security|data|review|discovery|release|deployment
  providers
  hash --file PATH
  install --provider codex|claude|cursor|both|all [--target PATH] [--dry-run]
  validate [--provider codex|claude|cursor|both|all] [--repo PATH]
  contract --kind delegation|return|review|handoff|business-context|business-plan|business-plan-v2|functional-spec|technical-design|approval|technology-decision|domain-preparation|domain-consultation|domain-coherence|task-run|traceability-graph --file PATH
  dispatch --provider codex|claude --task PATH --files PATH --phase toolkit|discovery|design|business [--repo PATH] [--timeout 120000]
  resume --file PATH

--project ID seleciona explicitamente um sistema anexado nos comandos de SDD, loop,
especialista, coerência, grafo, interface, precheck e dispatch. --repo continua
apontando para a instalação do toolkit; não use o caminho do fonte como gestão.

--files aponta para JSON array de caminhos relativos explícitos. Dispatcher somente
para revisores, sobre pacote textual limitado. Implementação usa a sessão nativa
Codex/Claude Code/Cursor com os adaptadores selecionados e permissões vigentes.
Automação de revisão e avaliações externas: somente Codex/Claude. Sem fallback.
resume valida e mostra handoff; não executa ações nem transfere autorização.`;

export async function main(argv, services = {}) {
  let [command = 'help', ...args] = argv;
  if (command === 'graph') {
    const [operation, ...flags] = args;
    if (!['validate', 'impact', 'sync'].includes(operation)) throw new Error('operação de grafo inválida');
    command = `graph-${operation}`; args = flags;
  }
  const options = {};
  for (let i = 0; i < args.length; i++) {
    if (!/^--[a-z-]+$/.test(args[i])) throw new Error('argumento inválido');
    const name = args[i].slice(2);
    if (Object.hasOwn(options, name)) throw new Error('argumento duplicado');
    if (['dry-run', 'live', 'accept-changes', 'local'].includes(name)) options[name] = true;
    else {
      if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error('valor de argumento ausente');
      options[name] = args[++i];
    }
  }
  const allowed = {
    'graph-sync': ['repo', 'file', 'dry-run', 'accept-changes'],
    'graph-validate': ['repo', 'file'], 'graph-impact': ['repo', 'file', 'id'],
    'ui-recover': ['repo'], 'ui-design-hash':['repo'],'ui-design-init':['repo'],'ui-design-check':['repo'],'ui-capabilities': [], 'ui-prepare': ['repo','dry-run'], 'ui-status': ['repo'], 'ui-generate': ['repo','dry-run'], 'ui-validate': ['repo','local'],
    'release-init':['repo','id'],'release-check':['repo','id','stage'],'release-deploy':['repo','id','stage','approval-file','dry-run'],
    'sdd-plan':['repo','dry-run'],'sdd-task':['repo','id'],'sdd-status':['repo'],'sdd-complete':['repo','id','run-id'],
    'attach-project':['repo','id','source','name','provider','context-file','dry-run'], 'attached-projects':['repo'], 'project-status':['repo','project'],
    help: [], 'create-project': ['repo', 'name', 'target', 'provider', 'presentation', 'dry-run', 'context-file', 'technology-file', 'preparation-file'], precheck: ['repo', 'phase'], route: ['category'], providers: [], hash: ['file'],
    onboarding: ['repo', 'name', 'context-file'], 'adopt-project': ['repo', 'name', 'context-file', 'dry-run', 'presentation', 'technology-file', 'provider', 'preparation-file'], 'technology-check': ['repo', 'context-file', 'decision-file'], 'restore-adoption': ['journal', 'dry-run'],
    'research-collect': ['context-file', 'preparation-file', 'output'], 'specialist-check': ['context-file', 'preparation-file'], 'specialist-prepare': ['repo', 'preparation-file'], 'specialist-status': ['repo'], 'consultation-record': ['repo', 'file'], 'consultation-check': ['repo', 'file'], 'coherence-snapshot': ['repo'], 'coherence-run': ['repo'], 'coherence-check': ['repo', 'report-file'], 'coherence-status': ['repo'],
    doctor: [], 'policy-check': ['action', 'agent', 'phase', 'repo'], eval: ['mode', 'provider', 'trials', 'live'], 'run-state': ['id', 'repo'], 'close-interrupted-run': ['id', 'repo'], 'secret-scan': ['repo'],
    install: ['provider', 'target', 'dry-run'], validate: ['provider', 'repo'],
    contract: ['kind', 'file'], dispatch: ['provider', 'task', 'files', 'phase', 'repo', 'timeout'], resume: ['file'],
    'loop-handoff': ['id', 'revision', 'provider', 'repo'], 'loop-candidate': ['id', 'revision', 'profile', 'repo'], 'loop-validate': ['id', 'revision', 'repo'], 'loop-review': ['id', 'revision', 'files', 'repo'],
    'loop-start': ['task', 'phase', 'provider', 'repo'], 'loop-status': ['id', 'repo'],
    'loop-advance': ['id', 'revision', 'event', 'repo'], 'loop-recover': ['id', 'repo']
  };
  const projectCommands=['release-init','release-check','release-deploy','dispatch','precheck','policy-check','loop-start','loop-advance','loop-candidate','loop-validate','loop-review','loop-status','loop-handoff','loop-recover','run-state','close-interrupted-run','specialist-prepare','specialist-status','consultation-record','consultation-check','coherence-snapshot','coherence-run','coherence-check','coherence-status','sdd-plan','sdd-task','sdd-complete','sdd-status','graph-sync','graph-validate','graph-impact','ui-design-hash','ui-design-init','ui-design-check','ui-prepare','ui-recover','ui-status','ui-generate','ui-validate','technology-check'];
  for(const name of projectCommands)allowed[name].push('project');
  if (!Object.hasOwn(allowed, command) || Object.keys(options).some(key => !allowed[command].includes(key))) throw new Error('comando/opção desconhecido');
  const read = path => JSON.parse(readFileSync(resolve(path), 'utf8'));
  const readContext = path => {
    if (!path) return undefined;
    try {
      const text = new TextDecoder('utf-8', { fatal: true }).decode(readFileSync(resolve(path)));
      return /^[\s]*[\[{"]/.test(text) ? JSON.parse(text) : text;
    } catch { throw new Error('Não foi possível ler o contexto inicial como texto UTF-8/JSON válido.'); }
  };
  const readDecision = path => {
    if (!path) return undefined;
    try {
      const data = readFileSync(resolve(path));
      if (data.length > 128 * 1024) throw new Error();
      return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(data));
    } catch { throw new Error('Não foi possível ler a decisão tecnológica como JSON válido.'); }
  };
  if(command==='attach-project')return attachProject({repo:resolve(options.repo??repoRoot),id:options.id,source:options.source,name:options.name,provider:options.provider,context:readContext(options['context-file']),dryRun:options['dry-run']??false});
  if(command==='attached-projects')return listAttachedProjects({repo:resolve(options.repo??repoRoot)});
  if(command==='project-status'){const item=attachedProject({repo:resolve(options.repo??repoRoot),id:options.project});return {status:'attached',...item};}
  let selection;
  if(options.project){selection=attachedProject({repo:resolve(options.repo??repoRoot),id:options.project});options.repo=selection.repo;}
  const automatic = ['precheck', 'loop-start', 'loop-advance', 'specialist-status', 'coherence-run'].includes(command)
    ? syncGraph({ repo: resolve(options.repo ?? repoRoot) }) : undefined;
  const withTraceability = result => ({...result,...(automatic?{traceability:automatic}:{}),...(selection?{project_id:selection.id}:{})});
  switch (command) {
    case 'graph-sync': return syncGraph({ repo: resolve(options.repo ?? repoRoot), file: options.file, dryRun: options['dry-run'] ?? false, acceptChanges: options['accept-changes'] ?? false });
    case 'graph-validate': return validateGraph({ repo: resolve(options.repo ?? repoRoot), file: options.file });
    case 'graph-impact': if (!options.id) throw new Error('id obrigatório'); return graphImpact({ repo: resolve(options.repo ?? repoRoot), file: options.file, id: options.id });
    case 'ui-design-hash': return designHash(resolve(options.repo??repoRoot));
    case 'ui-design-init': return initializeDesign({repo:resolve(options.repo??repoRoot)});
    case 'ui-design-check': return inspectDesign(resolve(options.repo??repoRoot))??{status:'not_required'};
    case 'ui-capabilities': return interfaceRegistry();
    case 'ui-recover': return recoverInterface({repo:resolve(options.repo??repoRoot)});
    case 'ui-prepare': return prepareInterface({repo:resolve(options.repo??repoRoot),dryRun:options['dry-run']??false});
    case 'ui-status': return interfaceStatus(resolve(options.repo??repoRoot));
    case 'ui-generate': return generateInterface({repo:resolve(options.repo??repoRoot),dryRun:options['dry-run']??false});
    case 'ui-validate': return validateInterface({repo:resolve(options.repo??repoRoot),local:options.local??false});
    case 'sdd-plan': return prepareActionPlan({repo:resolve(options.repo??repoRoot),dryRun:options['dry-run']??false});
    case 'sdd-task': return sddDelegation({repo:resolve(options.repo??repoRoot),id:options.id});
    case 'sdd-status': return sddStatus({repo:resolve(options.repo??repoRoot)});
    case 'sdd-complete': return completeSDDTask({repo:resolve(options.repo??repoRoot),id:options.id,runId:options['run-id']});
    case 'release-init':return initializeRelease({repo:resolve(options.repo??repoRoot),id:options.id});
    case 'release-check':return checkRelease({repo:resolve(options.repo??repoRoot),id:options.id,stage:options.stage});
    case 'release-deploy':return deployRelease({repo:resolve(options.repo??repoRoot),id:options.id,stage:options.stage,approvalFile:options['approval-file'],dryRun:options['dry-run']??false});
    case 'help': return help;
    case 'doctor': return diagnoseProviders();
    case 'policy-check': return checkPolicy({ repo: resolve(options.repo ?? repoRoot), action: options.action, agent: options.agent, phase: options.phase });
    case 'eval': if (options.mode === 'local') return evaluateLocal(); if (options.mode === 'protocol') return evaluateProtocol({ provider: options.provider, live: options.live ?? false, trials: options.trials ? Number(options.trials) : 1 }); throw new Error('modo de avaliação inválido');
    case 'run-state': return inspectRun(resolve(options.repo ?? repoRoot), options.id);
    case 'loop-start': return withTraceability(startTask({ repo: resolve(options.repo ?? repoRoot), delegation: read(options.task), phase: options.phase, provider: options.provider }));
    case 'loop-status': return engineeringStatus({ repo: resolve(options.repo ?? repoRoot), id: options.id });
    case 'loop-handoff':
    case 'loop-candidate':
    case 'loop-validate':
    case 'loop-review': {
      if (!/^[1-9]\d*$/.test(options.revision ?? '')) throw new Error('revisão inválida');
      const input = { repo: resolve(options.repo ?? repoRoot), id: options.id, expectedRevision: Number(options.revision) };
      if (command === 'loop-handoff') return handoffTask({ ...input, provider: options.provider });
      if (command === 'loop-candidate') return acceptCandidate({ ...input, profile: options.profile });
      if (command === 'loop-validate') return validateCandidate(input);
      return reviewCandidate({ ...input, files: options.files?.split(',') });
    }
    case 'loop-recover': return recoverTask({ repo: resolve(options.repo ?? repoRoot), id: options.id });
    case 'loop-advance':
      if (!/^\d+$/.test(options.revision ?? '') || options.event !== 'gate_checked') throw new Error('transição inválida');
      return withTraceability(advanceTask({ repo: resolve(options.repo ?? repoRoot), id: options.id, expectedRevision: Number(options.revision), event: { type: options.event } }));
    case 'close-interrupted-run': return closeInterruptedRun(resolve(options.repo ?? repoRoot), options.id);
    case 'secret-scan': return scanRepository(resolve(options.repo ?? repoRoot));
    case 'research-collect': {
      if (!options.output || existsSync(resolve(options.output))) throw new Error('Informe saída nova; não sobrescreva evidência existente.');
      const preparation = collectResearch({ context: readContext(options['context-file']), preparation: readDecision(options['preparation-file']) });
      writeFileSync(resolve(options.output), JSON.stringify(preparation, null, 2) + '\n', { flag: 'wx' });
      return { status: 'collected', output: resolve(options.output), next_step: 'Revisar os achados contra o conteúdo consultado antes de criar.' };
    }
    case 'specialist-check': {
      const context = readContext(options['context-file']);
      const assessment = assessContext(context);
      if (assessment.status !== 'ready') return assessment;
      const preparation = readDecision(options['preparation-file']);
      const checked = inspectPreparation({ context, preparation });
      verifyResearch({ context, preparation }); return checked;
    }
    case 'specialist-prepare': return prepareSpecialist({ repo: resolve(options.repo ?? repoRoot), preparation: readDecision(options['preparation-file']) });
    case 'specialist-status': return withTraceability(inspectSpecialist(resolve(options.repo ?? repoRoot)));
    case 'consultation-record': return recordConsultation({ repo: resolve(options.repo ?? repoRoot), record: read(options.file) });
    case 'consultation-check': return inspectConsultation(resolve(options.repo ?? repoRoot), read(options.file));
    case 'coherence-snapshot': return { snapshot_sha256: repositorySnapshot(resolve(options.repo ?? repoRoot)) };
    case 'coherence-run': return withTraceability(runCoherenceChecks({ repo: resolve(options.repo ?? repoRoot) }));
    case 'coherence-check': return completeCoherence({ repo: resolve(options.repo ?? repoRoot), report: read(options['report-file']) });
    case 'coherence-status': {
      const repo = resolve(options.repo ?? repoRoot); return inspectCoherence({ repo, report: readDocument(repo, 'references/domain-coherence.json') });
    }
    case 'technology-check': {
      const context = readContext(options['context-file']);
      const context_sha256 = technologyContextHash(context);
      if (!options['decision-file']) return { status: 'needs_research', context_sha256, supported_generators: ['dotnet/worker', 'dotnet/api', 'dotnet/console'], next_step: 'Entender restrições e experiência da equipe, consultar fontes externas e registrar alternativas/decisão antes de gerar.' };
      return inspectTechnologyDecision({ context, decision: readDecision(options['decision-file']), repo: resolve(options.repo ?? repoRoot) });
    }
    case 'onboarding': return onboarding({ repo: resolve(options.repo ?? repoRoot), name: options.name, context: readContext(options['context-file']) });
    case 'adopt-project': return adoptProject({ provider: options.provider, repo: resolve(options.repo ?? repoRoot), name: options.name, context: readContext(options['context-file']), presentation: options.presentation, technologyDecision: readDecision(options['technology-file']), preparation: readDecision(options['preparation-file']), researchRequest: services.researchRequest, contextFile: options['context-file'] ? resolve(options['context-file']) : undefined, dryRun: options['dry-run'] ?? false });
    case 'restore-adoption': if (!options.journal) throw new Error('journal obrigatório'); return restoreAdoption(resolve(options.journal), { dryRun: options['dry-run'] ?? false });
    case 'hash': return { sha256: sha256(readFileSync(resolve(options.file))) };
    case 'create-project': return createProject({ name: options.name, target: options.target, provider: options.provider, presentation: options.presentation, context: readContext(options['context-file']), technologyDecision: readDecision(options['technology-file']), preparation: readDecision(options['preparation-file']), researchRequest: services.researchRequest, decisionRepo: resolve(options.repo ?? repoRoot), dryRun: options['dry-run'] ?? false });
    case 'precheck': return withTraceability(precheck(resolve(options.repo ?? repoRoot), options.phase));
    case 'route': return route(options.category);
    case 'providers': return Promise.all(['codex', 'claude', 'cursor'].map(provider => checkProvider(provider)));
    case 'install': return install(options.target ?? repoRoot, options.provider, { dryRun: options['dry-run'] ?? false });
    case 'contract': validateContract(options.kind, read(options.file)); return { status: 'valid', kind: options.kind };
    case 'resume': return validateContract('handoff', read(options.file));
    case 'validate': {
      const currentRoot = resolve(options.repo ?? repoRoot);
      const errors = validateInstalled(currentRoot, options.provider);
      for (const kind of ['delegation', 'return', 'review', 'handoff', 'business-context', 'business-plan', 'approval', 'technology-decision', 'domain-preparation', 'domain-consultation', 'domain-coherence', 'task-run', 'traceability-graph']) assertSupported(loadSchema(kind));
      for (const role of catalog.specialists) {
        readFileSync(new URL(`skills/${role.skill}/SKILL.md`, factoryRoot), 'utf8');
        if (role.kind === 'reviewer' && !role.read_only) errors.push('reviewer deve ser read_only');
      }
      if (catalog.entrypoint !== 'cto' || catalog.delegation_depth_max !== 1) errors.push('governança divergente');
      return { status: errors.length ? 'blocked' : 'valid', errors, roles: catalog.specialists.length };
    }
    case 'dispatch': return dispatch({ repo: resolve(options.repo ?? repoRoot), provider: options.provider,
      task: read(options.task), phase: options.phase, files: read(options.files), timeoutMs: options.timeout === undefined ? 120000 : Number(options.timeout) });
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const result = await main(process.argv.slice(2));
    console.log(typeof result === 'string' ? result : JSON.stringify(result, null, 2));
    if (['blocked', 'failed', 'needs_input', 'empty', 'needs_review', 'preparing'].includes(result?.status) || result?.failed > 0) process.exitCode = 2;
  } catch (error) {
    // Adoption errors identify controlled conflicts/recovery paths, never print file contents.
    if (['adopt-project', 'restore-adoption', 'create-project', 'research-collect', 'specialist-check', 'specialist-prepare', 'specialist-status', 'consultation-record', 'consultation-check', 'coherence-check', 'coherence-status', 'coherence-run'].includes(process.argv[2])) console.error(error instanceof SyntaxError ? 'Documento da operação inválido.' : error.message);
    else console.error('Operação rejeitada: verifique comando, arquivos, contratos e conflitos. Use help.');
    process.exitCode = 2;
  }
}
