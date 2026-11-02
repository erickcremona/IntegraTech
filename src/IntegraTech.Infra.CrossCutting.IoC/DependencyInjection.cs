using Microsoft.Extensions.DependencyInjection;

namespace IntegraTech.Infra.CrossCutting.IoC;

public static class DependencyInjection
{
    /// <summary>Ponto de composição das camadas; sem conectores ou banco na base.</summary>
    public static global::Microsoft.Extensions.DependencyInjection.IServiceCollection AddIntegraTech(
        this global::Microsoft.Extensions.DependencyInjection.IServiceCollection services)
    {
        global::System.ArgumentNullException.ThrowIfNull(services);
        return services;
    }
}
