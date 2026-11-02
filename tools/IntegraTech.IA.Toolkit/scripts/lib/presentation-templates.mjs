export const presentationNames = { worker: 'Worker', api: 'Api', console: 'Console' };
export function presentationFiles(name, presentation) {
  const kind = presentationNames[presentation];
  if (!kind) throw new Error('apresentação inválida');
  const ns = `${name}.Apresentacao.${kind}`;
  const prefix = `src/${name}.Apresentacao/${ns}/`;
  const files = new Map();
  const usings = `using Microsoft.Extensions.Hosting;\nusing Microsoft.Extensions.DependencyInjection;\nusing ${name}.Infra.CrossCutting.IoC;\n`;
  let factory;
  if (presentation === 'api') {
    factory = `${usings}using Microsoft.AspNetCore.Builder;\nnamespace ${ns};\npublic static class ApplicationHost\n{\n    public static global::Microsoft.AspNetCore.Builder.WebApplication Build(string[] args)\n    {\n        var builder = global::Microsoft.AspNetCore.Builder.WebApplication.CreateBuilder(args);\n        builder.Services.Add${name}();\n        return builder.Build();\n    }\n}\n`;
  } else {
    factory = `${usings}namespace ${ns};\npublic static class ApplicationHost\n{\n    public static global::Microsoft.Extensions.Hosting.IHost Build(string[] args)\n    {\n        var builder = global::Microsoft.Extensions.Hosting.Host.CreateApplicationBuilder(args);\n        builder.Services.Add${name}();\n${presentation === 'worker' ? '        builder.Services.AddHostedService<ApplicationWorker>();\n' : ''}        return builder.Build();\n    }\n}\n`;
  }
  files.set(`${prefix}ApplicationHost.cs`, factory);
  files.set(`${prefix}Program.cs`, `using ${ns};\nusing Microsoft.Extensions.Hosting;\n\nusing var host = ApplicationHost.Build(args);\n${presentation === 'console' ? 'await host.StartAsync();\nawait host.StopAsync();\nSystem.Console.WriteLine("Base pronta. Nenhum caso de uso configurado.");' : 'await host.RunAsync();'}\n`);
  const sdk = presentation === 'api' ? 'Microsoft.NET.Sdk.Web' : presentation === 'worker' ? 'Microsoft.NET.Sdk.Worker' : 'Microsoft.NET.Sdk';
  files.set(`${prefix}${ns}.csproj`, `<Project Sdk="${sdk}">\n  <PropertyGroup><OutputType>Exe</OutputType></PropertyGroup>\n  <ItemGroup>\n${presentation !== 'api' ? '    <PackageReference Include="Microsoft.Extensions.Hosting" Version="8.0.1" />\n' : ''}    <ProjectReference Include="../../${name}.Aplicacao/${name}.Aplicacao/${name}.Aplicacao.csproj" />\n    <ProjectReference Include="../../${name}.Infra.CrossCutting.IoC/${name}.Infra.CrossCutting.IoC.csproj" />\n  </ItemGroup>\n</Project>\n`);
  if (presentation === 'worker') files.set(`${prefix}ApplicationWorker.cs`, `using Microsoft.Extensions.Hosting;\nnamespace ${ns};\npublic sealed class ApplicationWorker : global::Microsoft.Extensions.Hosting.BackgroundService\n{\n    protected override async global::System.Threading.Tasks.Task ExecuteAsync(global::System.Threading.CancellationToken stoppingToken)\n    {\n        try { await global::System.Threading.Tasks.Task.Delay(global::System.Threading.Timeout.InfiniteTimeSpan, stoppingToken); }\n        catch (global::System.OperationCanceledException) when (stoppingToken.IsCancellationRequested) { }\n    }\n}\n`);
  const lifecycleTest = `${usings}using ${ns};\n${presentation === 'api' ? 'using Microsoft.AspNetCore.Hosting.Server;\nusing Microsoft.AspNetCore.Hosting.Server.Features;\n' : ''}
using var timeout = new global::System.Threading.CancellationTokenSource(global::System.TimeSpan.FromSeconds(15));
using var host = ApplicationHost.Build([]);
${presentation === 'api' ? 'host.Urls.Add("http://127.0.0.1:0");' : ''}
await host.StartAsync(timeout.Token);
var lifetime = host.Services.GetRequiredService<global::Microsoft.Extensions.Hosting.IHostApplicationLifetime>();
if (!lifetime.ApplicationStarted.IsCancellationRequested) throw new global::System.InvalidOperationException("Host não iniciou.");
${presentation === 'worker' ? 'var worker = host.Services.GetServices<global::Microsoft.Extensions.Hosting.IHostedService>().OfType<ApplicationWorker>().Single();\nif (worker.ExecuteTask is null || worker.ExecuteTask.IsCompleted) throw new global::System.InvalidOperationException("Worker não aguardou cancelamento.");' : ''}
${presentation === 'api' ? 'var address = host.Services.GetRequiredService<global::Microsoft.AspNetCore.Hosting.Server.IServer>().Features.Get<global::Microsoft.AspNetCore.Hosting.Server.Features.IServerAddressesFeature>()!.Addresses.Single();\nusing var client = new global::System.Net.Http.HttpClient();\nusing var response = await client.GetAsync(address, timeout.Token);\nif (response.StatusCode != System.Net.HttpStatusCode.NotFound) throw new global::System.InvalidOperationException("API deve iniciar sem endpoint de negócio.");' : ''}
await host.StopAsync(timeout.Token);
if (!lifetime.ApplicationStopped.IsCancellationRequested) throw new global::System.InvalidOperationException("Host não encerrou.");
${presentation === 'worker' ? 'if (!worker.ExecuteTask!.IsCompleted) throw new global::System.InvalidOperationException("Worker não encerrou.");' : ''}
System.Console.WriteLine("PASS: ${presentation} inicia e encerra sem negócio configurado.");
`;
  files.set(`tests/${name}.Arquitetura.Tests/Program.cs`, lifecycleTest);
  return files;
}
