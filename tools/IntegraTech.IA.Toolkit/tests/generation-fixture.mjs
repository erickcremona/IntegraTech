// Explicit test data: only network I/O is simulated; all production gates run.
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, lstatSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createProject as generate } from '../scripts/lib/project-generator.mjs';
import { adoptProject as adopt } from '../scripts/lib/project-adoption.mjs';
import { fullContext, preparationFor, researchRequest } from './domain-fixture.mjs';
import { decisionFor } from './technology-fixture.mjs';
export function generationOptions(args) {
  const context = { ...fullContext, ...(typeof args.context === 'string' ? { problem: args.context } : args.context ?? {}) };
  const decisionRepo = args.decisionRepo ?? args.repo ?? mkdtempSync(join(tmpdir(), 'fixture-approval-'));
  if (existsSync(decisionRepo) && !lstatSync(decisionRepo).isSymbolicLink()) {
    mkdirSync(join(decisionRepo, 'references'), { recursive: true });
    if (!existsSync(join(decisionRepo, 'references/aceite-tecnologia.md'))) writeFileSync(join(decisionRepo, 'references/aceite-tecnologia.md'), 'Test fixture: usuário aprovou a apresentação selecionada.');
  }
  const technologyDecision = args.technologyDecision ?? (args.presentation ? decisionFor(context, args.presentation) : undefined);
  return { ...args, context, decisionRepo, technologyDecision, preparation: args.preparation ?? preparationFor(context), researchRequest: args.researchRequest ?? researchRequest };
}
export const createProject = args => generate(generationOptions(args));
export const adoptProject = args => adopt(generationOptions(args));
