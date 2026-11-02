// Model-maintainer operation. Never run automatically during onboarding/adoption.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expectedFiles, repoRoot } from './lib/installer.mjs';
import { baselineHash } from './lib/project-adoption.mjs';
import { contained } from './lib/paths.mjs';

try {
  const identity = JSON.parse(readFileSync(join(repoRoot, 'project.json'), 'utf8'));
  if (!identity.is_model) throw new Error('Somente manutenção explícita do modelo.');
  const relativePath = `tools/${identity.name}.IA.Toolkit/fabrica/template-baseline.json`;
  const path = contained(repoRoot, relativePath);
  const previous = JSON.parse(readFileSync(path, 'utf8'));
  const manifest = JSON.parse(readFileSync(contained(repoRoot, `tools/${identity.name}.IA.Toolkit/fabrica/project-template.json`), 'utf8'));
  const selected = new Set([...manifest.files, ...expectedFiles(identity.provider).keys()]);
  const files = {};
  for (const file of [...selected].sort()) if (file !== relativePath) files[file] = baselineHash(readFileSync(contained(repoRoot, file)));
  const same = JSON.stringify(previous.files) === JSON.stringify(files);
  if (process.argv.slice(2).length === 1 && process.argv[2] === '--write') {
    writeFileSync(path, JSON.stringify({ version: 1, canonical_repository: previous.canonical_repository, files }, null, 2) + '\n');
    console.log(JSON.stringify({ status: 'updated', controlled_files: Object.keys(files).length }));
  } else if (process.argv.length === 2) {
    console.log(JSON.stringify({ status: same ? 'valid' : 'stale', controlled_files: Object.keys(files).length }));
    if (!same) process.exitCode = 2;
  } else throw new Error('Use sem argumentos para verificar ou --write para atualizar após revisão.');
} catch (error) { console.error(error.message); process.exitCode = 2; }
