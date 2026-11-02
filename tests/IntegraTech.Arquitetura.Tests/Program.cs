using IntegraTech.Apresentacao.Worker;
using IntegraTech.Infra.CrossCutting.IoC;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

// Integration test executable, deliberately without another test-framework dependency.
using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(10));
var builder = Host.CreateApplicationBuilder(new HostApplicationBuilderSettings
{
    DisableDefaults = true
});
builder.Logging.ClearProviders();
builder.Services.AddIntegraTech();
builder.Services.AddHostedService<IntegrationWorker>();
using var host = builder.Build();
var lifetime = host.Services.GetRequiredService<IHostApplicationLifetime>();
await host.StartAsync(timeout.Token);
if (!lifetime.ApplicationStarted.IsCancellationRequested)
    throw new InvalidOperationException("Host não sinalizou inicialização.");
var hosted = host.Services.GetServices<IHostedService>().OfType<IntegrationWorker>().Single();
if (hosted.ExecuteTask is null || hosted.ExecuteTask.IsCompleted)
    throw new InvalidOperationException("Worker deve aguardar cancelamento sem executar integração.");
await host.StopAsync(timeout.Token);
if (!lifetime.ApplicationStopped.IsCancellationRequested || !hosted.ExecuteTask.IsCompleted)
    throw new InvalidOperationException("Host/Worker não encerrou no limite.");
Console.WriteLine("PASS: host inicia, Worker aguarda inativo e encerra por cancelamento sem conectores.");
