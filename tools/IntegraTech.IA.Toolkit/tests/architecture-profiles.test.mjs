import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {architectureOracleTransition} from '../scripts/lib/architecture-oracles.mjs';
import {fingerprint} from '../scripts/lib/candidate.mjs';
import { architectureFiles } from '../scripts/lib/architecture-profiles.mjs';

const options = { name: 'Sample', presentation: 'console', profile: 'simple-application' };
test('simple profile contains only host and lifecycle project and is deterministic', () => {
  const files = architectureFiles(options);
  assert.equal([...files.keys()].filter(p => p.endsWith('.csproj')).length, 2);
  assert.deepEqual(files, architectureFiles(options));
  assert.ok(files.has('Sample.sln'));
  assert.ok(files.has('docs/architecture.md'));
  assert.doesNotMatch([...files.values()].join('\n'), /Infra.CrossCutting|AddSample|IntegraTech/);
});
test('modular profile references only contracts across declared module boundaries', () => {
  const files = architectureFiles({ ...options, profile: 'modular-monolith', modules: [{ name: 'Orders', depends_on: ['Catalog'] }, { name: 'Catalog', depends_on: [] }] });
  const project = files.get('src/Modules/Orders/Sample.Orders/Sample.Orders.csproj');
  assert.match(project, /Sample.Catalog.Contracts.csproj/);
  assert.doesNotMatch(project, /Sample.Catalog\/Sample.Catalog.csproj/);
  assert.equal([...files.keys()].filter(p => p.endsWith('.csproj')).length, 6);
});
test('rejects invalid identifiers, profiles and module graphs', () => {
  for (const change of [{ name: '../Bad' }, { profile: 'distributed-services' }, { profile: 'modular-monolith', modules: [] }, { profile: 'modular-monolith', modules: [{ name: 'Orders', depends_on: ['Missing'] }] }, { profile: 'modular-monolith', modules: [{ name: 'Orders', depends_on: ['Catalog'] }, { name: 'Catalog', depends_on: ['Orders'] }] }, { profile: 'modular-monolith', modules: [{ name: 'Orders' }, { name: 'Orders' }] }]) assert.throws(() => architectureFiles({ ...options, ...change }));
});
test('layered profile preserves five clean technical projects', () => {
  const files = architectureFiles({ ...options, profile: 'layered-monolith' });
  assert.equal([...files.keys()].filter(p => p.endsWith('.csproj')).length, 7);
  assert.ok(files.has('src/Sample.Dominio/Sample.Dominio/Sample.Dominio.csproj'));
  assert.match(files.get('src/Sample.Infra.CrossCutting.IoC/DependencyInjection.cs'), /AddSample/);
});
const dotnet = '/workspace/.integratech-dotnet/dotnet';
const available = spawnSync(dotnet, ['--version']).status === 0;
test('generated profiles build, run, and enforce boundaries', { skip: available ? false : '.NET 8 SDK unavailable' }, async () => {
  for (const profile of ['simple-application', 'modular-monolith', 'layered-monolith']) {
    const dir = await mkdtemp(path.join(tmpdir(), 'architecture-profile-'));
    try {
      const files = architectureFiles({ ...options, presentation: profile === 'simple-application' ? 'api' : 'worker', profile, modules: profile === 'modular-monolith' ? [{ name: 'Orders', depends_on: ['Catalog'] }, { name: 'Catalog' }] : [] });
      files.set('Directory.Build.props', await readFile(new URL('../../../Directory.Build.props', import.meta.url), 'utf8').catch(() => '<Project><PropertyGroup><TargetFramework>net8.0</TargetFramework><ImplicitUsings>enable</ImplicitUsings><Nullable>enable</Nullable><TreatWarningsAsErrors>true</TreatWarningsAsErrors></PropertyGroup></Project>'));
      for (const [file, content] of files) { await mkdir(path.dirname(path.join(dir, file)), { recursive: true }); await writeFile(path.join(dir, file), content); }
      await mkdir(path.join(dir,'.scratch/adoptions/before'),{recursive:true});
      await writeFile(path.join(dir,'.scratch/adoptions/before/Old.csproj'),'<Project />');
      await writeFile(path.join(dir,'.scratch/adoptions/before/Directory.Build.targets'),'<Project><Import Project="not-source.props" /></Project>');
      const run = args => spawnSync(dotnet, args, { cwd: dir, encoding: 'utf8', timeout: 120000, env: { ...process.env, DOTNET_ROOT: path.dirname(dotnet), DOTNET_CLI_HOME: '/workspace/.integratech-dotnet-home', NUGET_PACKAGES: '/workspace/.integratech-nuget' } });
      const build = run(['build', 'Sample.sln', '--nologo']);
      assert.equal(build.status, 0, build.stdout + build.stderr);
      const lifecycle = run(['run', '--no-build', '--project', 'tests/Sample.Arquitetura.Tests']);
      assert.equal(lifecycle.status, 0, lifecycle.stdout + lifecycle.stderr);
      if(profile==='layered-monolith') {
        const program='tests/Sample.Arquitetura.Tests/Program.cs';
        const from=architectureFiles({...options,presentation:'worker',profile:'simple-application'}).get(program);
        // Reproduce the old frozen-scaffold failure against the new project graph.
        await writeFile(path.join(dir,program),from);
        const oldOracle=run(['run','--project','tests/Sample.Arquitetura.Tests']);
        assert.notEqual(oldOracle.status,0);assert.match(oldOracle.stdout+oldOracle.stderr,/Unexpected project set/);
        const decision={mode:'evolution',profile,layout:{name:'Sample',presentation:'worker'},requirements:{modules:[]},migration:{from_profile:'simple-application',from_modules:[],oracle_transition:{task_id:'switch',original_sha256:fingerprint(from),target_sha256:fingerprint(files.get(program))}}};
        const transition=architectureOracleTransition({decision,taskId:'switch',baselineFiles:[{path:program,sha256:fingerprint(from)}]});
        await writeFile(path.join(dir,program),transition.content);
        const migrated=run(['run','--project','tests/Sample.Arquitetura.Tests']);assert.equal(migrated.status,0,migrated.stdout+migrated.stderr);
      }
      await writeFile(path.join(dir,'Directory.Build.targets'),'<Project><ItemGroup><ProjectReference Include="hidden.csproj" /></ItemGroup></Project>');
      const injected=run(['run','--no-build','--project','tests/Sample.Arquitetura.Tests']);
      assert.notEqual(injected.status,0);assert.match(injected.stdout+injected.stderr,/Unverified MSBuild inputs/);
      await rm(path.join(dir,'Directory.Build.targets'));
      if (profile === 'modular-monolith') {
        const leak = path.join(dir, 'src/Modules/Orders/Sample.Orders/PublicLeak.cs');
        await writeFile(leak, 'namespace Sample.Orders; public sealed class PublicLeak {}');
        const rebuilt = run(['build', 'Sample.sln', '--nologo']);
        assert.equal(rebuilt.status, 0, rebuilt.stdout + rebuilt.stderr);
        const exposed = run(['run', '--no-build', '--project', 'tests/Sample.Arquitetura.Tests']);
        assert.notEqual(exposed.status, 0);
        assert.match(exposed.stdout + exposed.stderr, /Module implementation exposes public types/);
        await rm(leak);
        const repaired = run(['build', 'Sample.sln', '--nologo']);
        assert.equal(repaired.status, 0, repaired.stdout + repaired.stderr);
      }
      const target = [...files.keys()].find(p => p.includes('Apresentacao') && p.endsWith('.csproj'));
      await writeFile(path.join(dir, target), files.get(target).replace('</Project>', '<ItemGroup><ProjectReference Include="../../../tests/Sample.Arquitetura.Tests/Sample.Arquitetura.Tests.csproj" /></ItemGroup></Project>'));
      const invalid = run(['run', '--no-build', '--project', 'tests/Sample.Arquitetura.Tests']);
      assert.notEqual(invalid.status, 0, 'architecture validation must inspect real project references');
    } finally { await rm(dir, { recursive: true, force: true }); }
  }
});
