namespace IntegraTech.Apresentacao.Worker;

/// <summary>Host inativo até que os contratos de integração sejam definidos.</summary>
public sealed class IntegrationWorker(ILogger<IntegrationWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("IntegraTech iniciado. Nenhuma integração configurada.");
        try
        {
            await Task.Delay(Timeout.InfiniteTimeSpan, stoppingToken);
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            logger.LogInformation("IntegraTech encerrado por cancelamento.");
        }
    }
}
