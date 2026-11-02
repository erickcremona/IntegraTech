using IntegraTech.Apresentacao.Worker;
using IntegraTech.Infra.CrossCutting.IoC;

var builder = Host.CreateApplicationBuilder(args);
builder.Services.AddIntegraTech();
builder.Services.AddHostedService<IntegrationWorker>();
await builder.Build().RunAsync();
