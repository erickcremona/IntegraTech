import { createHash } from 'node:crypto';
import path from 'node:path';
import { presentationFiles, presentationNames } from './presentation-templates.mjs';

const identifier = /^[A-Z][A-Za-z0-9]*$/;
const reserved = new Set(['Class', 'Namespace', 'System', 'Microsoft']);
function validateId(value) {
  if (typeof value !== 'string' || !identifier.test(value) || reserved.has(value)) throw new Error('Identificador arquitetural inválido.');
}
function guid(value) {
  const hex = createHash('sha256').update(value).digest('hex').slice(0, 32).toUpperCase();
  return `{${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}}`;
}
/** Generate an entire architecture scaffold without reading product source. */
export function architectureFiles({ name, presentation, profile, modules = [] }) {
  validateId(name);
  if (!['simple-application', 'modular-monolith', 'layered-monolith'].includes(profile)) throw new Error('Perfil arquitetural inválido.');
  if (!Array.isArray(modules)) throw new Error('Módulos inválidos.');
  const graph = new Map();
  for (const module of modules) {
    validateId(module?.name);
    if (graph.has(module.name) || !Array.isArray(module.depends_on ?? [])) throw new Error('Módulo duplicado ou dependências inválidas.');
    const deps = module.depends_on ?? [];
    if (new Set(deps).size !== deps.length) throw new Error('Dependência duplicada.');
    graph.set(module.name, deps);
  }
  const visited = new Set(), active = new Set();
  function visit(id) {
    if (!graph.has(id)) throw new Error('Dependência de módulo desconhecida.');
    if (active.has(id)) throw new Error('Ciclo entre módulos.');
    if (visited.has(id)) return;
    active.add(id); for (const dep of graph.get(id)) visit(dep); active.delete(id); visited.add(id);
  }
  for (const id of graph.keys()) visit(id);
  if (profile === 'modular-monolith' && !graph.size) throw new Error('Declare os módulos do produto.');
  if (profile !== 'modular-monolith' && graph.size) throw new Error('Módulos exigem perfil modular.');
  const files = presentationFiles(name, presentation);
  const kind = presentationNames[presentation];
  const host = `src/${name}.Apresentacao/${name}.Apresentacao.${kind}/${name}.Apresentacao.${kind}.csproj`;
  const tests = `tests/${name}.Arquitetura.Tests/${name}.Arquitetura.Tests.csproj`;
  const references = new Map();
  const facades = [];
  function project(file, deps = [], di = false) {
    references.set(file, deps);
    files.set(file, `<Project Sdk="Microsoft.NET.Sdk">\n  <ItemGroup>\n${di ? '    <PackageReference Include="Microsoft.Extensions.DependencyInjection.Abstractions" Version="8.0.2" />\n' : ''}${deps.map(dep => `    <ProjectReference Include="${path.posix.relative(path.posix.dirname(file), dep)}" />\n`).join('')}  </ItemGroup>\n</Project>\n`);
  }
  const hostDeps = [];
  let hostUsings = '', registration = '';
  if (profile === 'layered-monolith') {
    const domain = `src/${name}.Dominio/${name}.Dominio/${name}.Dominio.csproj`;
    const application = `src/${name}.Aplicacao/${name}.Aplicacao/${name}.Aplicacao.csproj`;
    const data = `src/${name}.Infra.Data/${name}.Infra.Data/${name}.Infra.Data.csproj`;
    const service = `src/${name}.Infra.Service/${name}.Infra.Service.csproj`;
    const ioc = `src/${name}.Infra.CrossCutting.IoC/${name}.Infra.CrossCutting.IoC.csproj`;
    project(domain); project(application, [domain]); project(data, [domain]); project(service, [application, domain]); project(ioc, [application, domain, data, service], true);
    files.set(`${path.posix.dirname(ioc)}/DependencyInjection.cs`, facade(`${name}.Infra.CrossCutting.IoC`, `Add${name}`));
    hostDeps.push(application, ioc);
    hostUsings = `using ${name}.Infra.CrossCutting.IoC;\n`; registration = `        builder.Services.Add${name}();\n`;
  }
  if (profile === 'modular-monolith') {
    const contracts = id => `src/Modules/${id}/${name}.${id}.Contracts/${name}.${id}.Contracts.csproj`;
    for (const [id, deps] of graph) {
      const implementation = `src/Modules/${id}/${name}.${id}/${name}.${id}.csproj`;
      project(contracts(id)); project(implementation, [contracts(id), ...deps.map(contracts)], true);
      const ns = `${name}.${id}`;
      files.set(`${path.posix.dirname(implementation)}/DependencyInjection.cs`, facade(ns, `Add${id}`));
      facades.push({ assembly: `${name}.${id}`, type: `${ns}.DependencyInjection` });
      hostDeps.push(implementation); hostUsings += `using ${ns};\n`; registration += `        builder.Services.Add${id}();\n`;
    }
  }
  for (const [file, content] of files) {
    if (file.endsWith('.cs')) files.set(file, content.replace(`using ${name}.Infra.CrossCutting.IoC;\n`, file.endsWith('ApplicationHost.cs') ? hostUsings : '').replace(`        builder.Services.Add${name}();\n`, registration));
  }
  references.set(host, hostDeps);
  files.set(host, files.get(host).replace(/    <ProjectReference[^\n]+\n/g, '').replace('  </ItemGroup>', hostDeps.map(dep => `    <ProjectReference Include="${path.posix.relative(path.posix.dirname(host), dep)}" />\n`).join('') + '  </ItemGroup>'));
  project(tests, [host]);
  files.set(tests, files.get(tests).replace('<ItemGroup>', '<PropertyGroup><OutputType>Exe</OutputType></PropertyGroup>\n  <ItemGroup>'));
  const program = `tests/${name}.Arquitetura.Tests/Program.cs`;
  files.set(program, files.get(program) + architectureValidation(references, facades, name));
  const projects = [...references.keys()];
  files.set(`${name}.sln`, `Microsoft Visual Studio Solution File, Format Version 12.00\n# Visual Studio Version 17\n${projects.map(file => `Project("{FAE04EC0-301F-11D3-BF4B-00C04F79EFBC}") = "${path.posix.basename(file, '.csproj')}", "${file}", "${guid(file)}"\nEndProject\n`).join('')}Global\n\tGlobalSection(SolutionConfigurationPlatforms) = preSolution\n\t\tDebug|Any CPU = Debug|Any CPU\n\t\tRelease|Any CPU = Release|Any CPU\n\tEndGlobalSection\n\tGlobalSection(ProjectConfigurationPlatforms) = postSolution\n${projects.map(file => ['Debug', 'Release'].map(config => `\t\t${guid(file)}.${config}|Any CPU.ActiveCfg = ${config}|Any CPU\n\t\t${guid(file)}.${config}|Any CPU.Build.0 = ${config}|Any CPU\n`).join('')).join('')}\tEndGlobalSection\nEndGlobal\n`);
  files.set('docs/architecture.md', `# Arquitetura\n\nPerfil: ${profile}\nApresentação: ${presentation}\n\n${profile === 'modular-monolith' ? [...graph].map(([id, deps]) => `- ${id}: contracts exposed; implementation internal; dependencies: ${deps.join(', ') || 'none'}.`).join('\n') : profile === 'simple-application' ? 'One application and its lifecycle/architecture validation project.' : 'Domain, application, infrastructure and composition projects retain explicit dependency directions.'}\n\nNo business use cases are generated. Run the architecture test executable to check lifecycle, project references, cycles and module exports. Structural checks do not certify domain semantics.\n`);
  return files;
}
function facade(ns, method) {
  return `using Microsoft.Extensions.DependencyInjection;\nnamespace ${ns};\npublic static class DependencyInjection\n{\n    public static IServiceCollection ${method}(this IServiceCollection services) => services;\n}\n`;
}
function architectureValidation(references, facades, name) {
  const entries = [...references].map(([file, deps]) => `    [${JSON.stringify(file)}] = new string[] { ${deps.map(d => JSON.stringify(d)).join(', ')} },`).join('\n');
  return `
// Inspect the current source graph, including references introduced after generation.
var root = new global::System.IO.DirectoryInfo(global::System.AppContext.BaseDirectory);
while (root is not null && !global::System.IO.File.Exists(global::System.IO.Path.Combine(root.FullName, "${name}.sln"))) root = root.Parent;
if (root is null) throw new global::System.InvalidOperationException("Solution root unavailable.");
var allowed = new global::System.Collections.Generic.Dictionary<string, string[]>
{
${entries}
};
global::System.Collections.Generic.IEnumerable<string> ArchitectureSourceFiles(string directory)
{
    foreach (var entry in global::System.IO.Directory.EnumerateFileSystemEntries(directory))
    {
        var part = global::System.IO.Path.GetFileName(entry);
        if (part is "obj" or "bin" or ".git" or ".scratch" or ".integratech" or ".superpowers" or "node_modules" or "qa-artifacts" or "runtime-publish" or ".vs" or "tools") continue;
        var attributes = global::System.IO.File.GetAttributes(entry);
        if ((attributes & global::System.IO.FileAttributes.ReparsePoint) != 0) throw new global::System.InvalidOperationException("Source links require explicit verification.");
        if ((attributes & global::System.IO.FileAttributes.Directory) != 0)
        {
            foreach (var nested in ArchitectureSourceFiles(entry)) yield return nested;
        }
        else yield return entry;
    }
}
var architectureSources = ArchitectureSourceFiles(root.FullName).ToArray();
var edges = new global::System.Collections.Generic.Dictionary<string, string[]>();
foreach (var buildInput in architectureSources.Where(p => p.EndsWith(".props", global::System.StringComparison.OrdinalIgnoreCase) || p.EndsWith(".targets", global::System.StringComparison.OrdinalIgnoreCase)))
{
    var buildXml = global::System.Xml.Linq.XDocument.Load(buildInput);
    if (buildXml.Descendants().Any(e => e.Name.LocalName is "ProjectReference" or "Import" or "Target" or "UsingTask")) throw new global::System.InvalidOperationException("Unverified MSBuild inputs.");
}
var actualProjects = architectureSources.Where(p => p.EndsWith(".csproj", global::System.StringComparison.OrdinalIgnoreCase))
    .Select(p => global::System.IO.Path.GetRelativePath(root.FullName, p).Replace('\\\\', '/')).ToArray();
if (!actualProjects.Order().SequenceEqual(allowed.Keys.Order())) throw new global::System.InvalidOperationException("Unexpected project set.");
foreach (var entry in allowed)
{
    var full = global::System.IO.Path.Combine(root.FullName, entry.Key);
    var xml = global::System.Xml.Linq.XDocument.Load(full);
    if (xml.Descendants().Any(e => e.Name.LocalName is "Import" or "Target" or "UsingTask")) throw new global::System.InvalidOperationException("Unverified MSBuild imports.");
    var dependencies = xml.Descendants().Where(e => e.Name.LocalName == "ProjectReference").Select(e => {
        var include = (string?)e.Attribute("Include") ?? throw new global::System.InvalidOperationException("Missing project reference.");
        return global::System.IO.Path.GetRelativePath(root.FullName, global::System.IO.Path.GetFullPath(global::System.IO.Path.Combine(global::System.IO.Path.GetDirectoryName(full)!, include.Replace('\\\\', '/')))).Replace('\\\\', '/');
    }).ToArray();
    if (dependencies.Distinct().Count() != dependencies.Length || !dependencies.Order().SequenceEqual(entry.Value.Order())) throw new global::System.InvalidOperationException("Forbidden project references: " + entry.Key);
    edges[entry.Key] = dependencies;
}
var visited = new global::System.Collections.Generic.HashSet<string>();
var active = new global::System.Collections.Generic.HashSet<string>();
void Visit(string project)
{
    if (active.Contains(project)) throw new global::System.InvalidOperationException("Project reference cycle.");
    if (!visited.Add(project)) return;
    active.Add(project);
    foreach (var dependency in edges[project]) Visit(dependency);
    active.Remove(project);
}
foreach (var project in edges.Keys) Visit(project);
${facades.map(({ assembly, type }) => `var exports${assembly.split('.').at(-1)} = global::System.Reflection.Assembly.Load(${JSON.stringify(assembly)}).GetExportedTypes();\nif (exports${assembly.split('.').at(-1)}.Any(t => t.FullName != ${JSON.stringify(type)}) || exports${assembly.split('.').at(-1)}.Length != 1) throw new global::System.InvalidOperationException("Module implementation exposes public types.");`).join('\n')}
System.Console.WriteLine("PASS: architecture boundaries.");
`;
}
