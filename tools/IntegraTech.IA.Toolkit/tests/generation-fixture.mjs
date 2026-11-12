import {architectureDigest,architectureTechnologyHash} from '../scripts/lib/architecture-decision.mjs';
import {fingerprint} from '../scripts/lib/candidate.mjs';
// Explicit test data: only network I/O is simulated; all production gates run.
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, unlinkSync, rmdirSync, existsSync, lstatSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createProject as generate } from '../scripts/lib/project-generator.mjs';
import { adoptProject as adopt } from '../scripts/lib/project-adoption.mjs';
import { fullContext, preparationFor, researchRequest } from './domain-fixture.mjs';
import { decisionFor } from './technology-fixture.mjs';
import { toolkitSourceFingerprint } from '../scripts/lib/toolkit-audit.mjs';
export function generationOptions(args) {
  const context = { ...fullContext, ...(typeof args.context === 'string' ? { problem: args.context } : args.context ?? {}) };
  const decisionRepo = args.decisionRepo ?? args.repo ?? mkdtempSync(join(tmpdir(), 'fixture-approval-'));
  if (existsSync(decisionRepo) && !lstatSync(decisionRepo).isSymbolicLink()) {
    mkdirSync(join(decisionRepo, 'references'), { recursive: true });
    if (!existsSync(join(decisionRepo, 'references/aceite-tecnologia.md'))) writeFileSync(join(decisionRepo, 'references/aceite-tecnologia.md'), 'Test fixture: usuário aprovou a apresentação selecionada.');
  }
  const technologyDecision = args.technologyDecision ?? (args.presentation ? decisionFor(context, args.presentation) : undefined);
  let architectureDecision=args.architectureDecision;
  if(!architectureDecision&&technologyDecision){
    const selection=technologyDecision.options.find(o=>o.id===technologyDecision.selected_option);
    const evidence='Synthetic architecture approval for generation fixture only.';
    if(existsSync(decisionRepo)&&!lstatSync(decisionRepo).isSymbolicLink())writeFileSync(join(decisionRepo,'references/architecture-fixture-approval.md'),evidence);
    architectureDecision={schema_version:1,mode:'initial',profile:'layered-monolith',layout:{name:args.name,presentation:selection?.presentation??'Contextual',stack:selection?.stack},context_sha256:fingerprint(context),technology_sha256:architectureTechnologyHash(technologyDecision),source_binding_sha256:null,requirements:{schema_version:1,context_sha256:fingerprint(context),domain_complexity:'simple',modules:[],drivers:[],unknowns:[]},rationale:['Synthetic backwards-compatible layered fixture'],alternatives:[{profile:'simple-application',reason:'Fixture tests the existing layered layout'}],research:[{url:'https://example.com/synthetic',accessed_at:'2026-01-01',findings:'Synthetic fixture, not actual research'}],validation_strategy:['Build and structural lifecycle tests'],migration:null};
    architectureDecision.approval={status:'approved',decision_sha256:architectureDigest(architectureDecision),approved_by:'Synthetic owner',approved_at:new Date().toISOString(),source_reference:'references/architecture-fixture-approval.md',source_reference_sha256:fingerprint(evidence)};
  }
  return { ...args, architectureDecision, context, decisionRepo, technologyDecision, preparation: args.preparation ?? preparationFor(context), researchRequest: args.researchRequest ?? researchRequest };
}
export const createProject = args => generate(generationOptions(args));
export const adoptProject = args => {
  let evidencePath;
  let createdScratch = false;
  if (args.repo && !args.dryRun) {
    const repo = args.repo;
    const identityPath = join(repo, 'project.json');
    if (existsSync(identityPath) && JSON.parse(readFileSync(identityPath, 'utf8')).is_model === true) {
      const evidence = { status: 'passed', completed_at: 'fixture-only', checks: [{ check: 'synthetic_test_fixture', status: 'passed' }], source_sha256: toolkitSourceFingerprint(repo) };
      const scratch = join(repo, '.scratch');
      createdScratch = !existsSync(scratch);
      mkdirSync(scratch, { recursive: true });
      evidencePath = join(scratch, 'toolkit-verification.json');
      writeFileSync(evidencePath, JSON.stringify(evidence));
    }
  }
  try { return adopt(generationOptions(args)); }
  catch (error) {
    if (evidencePath && existsSync(evidencePath)) unlinkSync(evidencePath);
    if (createdScratch && args.repo && readdirSync(join(args.repo, '.scratch')).length === 0) rmdirSync(join(args.repo, '.scratch'));
    throw error;
  }
};
