import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../../', import.meta.url));
const project = JSON.parse(readFileSync(resolve(root, 'project.json'), 'utf8'));
const hostKind = { worker: 'Worker', api: 'Api', console: 'Console' }[project.presentation];
const projects = {
  'IntegraTech.Dominio': 'src/IntegraTech.Dominio/IntegraTech.Dominio/IntegraTech.Dominio.csproj',
  'IntegraTech.Aplicacao': 'src/IntegraTech.Aplicacao/IntegraTech.Aplicacao/IntegraTech.Aplicacao.csproj',
  'IntegraTech.Infra.Data': 'src/IntegraTech.Infra.Data/IntegraTech.Infra.Data/IntegraTech.Infra.Data.csproj',
  'IntegraTech.Infra.Service': 'src/IntegraTech.Infra.Service/IntegraTech.Infra.Service.csproj',
  'IntegraTech.Infra.CrossCutting.IoC': 'src/IntegraTech.Infra.CrossCutting.IoC/IntegraTech.Infra.CrossCutting.IoC.csproj',
  [`IntegraTech.Apresentacao.${hostKind}`]: `src/IntegraTech.Apresentacao/IntegraTech.Apresentacao.${hostKind}/IntegraTech.Apresentacao.${hostKind}.csproj`
};
const dependencies = {
  'IntegraTech.Dominio': [],
  'IntegraTech.Aplicacao': ['IntegraTech.Dominio'],
  'IntegraTech.Infra.Data': ['IntegraTech.Dominio'],
  'IntegraTech.Infra.Service': ['IntegraTech.Aplicacao', 'IntegraTech.Dominio'],
  'IntegraTech.Infra.CrossCutting.IoC': ['IntegraTech.Aplicacao', 'IntegraTech.Dominio', 'IntegraTech.Infra.Data', 'IntegraTech.Infra.Service'],
  [`IntegraTech.Apresentacao.${hostKind}`]: ['IntegraTech.Aplicacao', 'IntegraTech.Infra.CrossCutting.IoC']
};
test('arquitetura: seis camadas preservam o grafo e referências existem', () => {
  for (const [name, path] of Object.entries(projects)) {
    const full = resolve(root, path);
    assert.ok(existsSync(full), `projeto ausente: ${name}`);
    const text = readFileSync(full, 'utf8');
    const refs = [...text.matchAll(/ProjectReference Include="([^"]+)"/g)].map(match => resolve(dirname(full), match[1].replaceAll('\\', '/')));
    refs.forEach(ref => assert.ok(existsSync(ref), ref));
    assert.deepEqual(refs.map(ref => basename(ref, '.csproj')).sort(), dependencies[name].sort(), name);
  }
  assert.ok(readFileSync(resolve(root, 'Directory.Build.props'), 'utf8').includes('net8.0'));
});
