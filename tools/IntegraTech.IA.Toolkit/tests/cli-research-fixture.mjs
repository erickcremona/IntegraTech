import {generationOptions} from './generation-fixture.mjs';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fullContext, preparationFor, sourceBody } from './domain-fixture.mjs';
import { decisionFor } from './technology-fixture.mjs';
// A curl executable test double at the external transport boundary. It leaves
// context validation, contracts, hash checks and all filesystem transactions real.
export function cliResearchFixture() {
  const root = mkdtempSync(join(tmpdir(), 'cli-research-'));
  writeFileSync(join(root, 'curl'), `#!${process.execPath}\nimport fs from 'node:fs';\nconst a=process.argv.slice(2);fs.writeFileSync(a[a.indexOf('--output')+1],${JSON.stringify(sourceBody)});fs.writeFileSync(a[a.indexOf('--dump-header')+1],'HTTP/1.1 200 OK\\r\\n\\r\\n');process.stdout.write('200');\n`, { mode: 0o755 });
  writeFileSync(join(root, 'getent'), '#!/bin/sh\nprintf "93.184.215.14 STREAM example\\n"\n', { mode: 0o755 });
  return { env: { ...process.env, PATH: root + ':' + process.env.PATH }, prepare(repo, context = fullContext, productName = 'ViaCursor') {
    mkdirSync(join(repo, 'references'), { recursive: true });
    writeFileSync(join(repo, 'references/aceite-tecnologia.md'), 'Test fixture: API aprovada.');
    const files = { 'context.json': context, 'preparation.json': preparationFor(context), 'decision.json': decisionFor(context, 'api'), 'architecture.json':generationOptions({name:productName,presentation:'api',context,decisionRepo:repo}).architectureDecision };
    for (const [name, value] of Object.entries(files)) writeFileSync(join(repo, name), JSON.stringify(value));
    return ['--architecture-file',join(repo,'architecture.json'),'--context-file', join(repo, 'context.json'), '--preparation-file', join(repo, 'preparation.json'), '--technology-file', join(repo, 'decision.json')];
  } };
}
