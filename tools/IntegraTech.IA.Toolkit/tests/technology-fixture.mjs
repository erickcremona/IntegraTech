import { createHash } from 'node:crypto';
import { normalizeInitialContext } from '../scripts/lib/project-adoption.mjs';
import { fullContext } from './domain-fixture.mjs';
export const context = { ...fullContext, problem: 'Publicar catálogo web para clientes.', constraints: ['Equipe conhece .NET; operação simples.'] };
export function decisionFor(input = context, presentation = 'api') {
  return {
    schema_version: 1,
    context_sha256: createHash('sha256').update(JSON.stringify(normalizeInitialContext(input))).digest('hex'),
    drivers: ['Catálogo HTTP', 'Experiência da equipe em .NET', 'Custo de operação baixo'],
    options: [
      { id: 'web', stack: 'dotnet', presentation, technologies: ['.NET 8', 'ASP.NET Core'], rationale: 'Atende HTTP com tecnologia conhecida pela equipe.', consequences: ['Requer operação de um servidor.'], source_urls: ['https://learn.microsoft.com/en-us/aspnet/core/'] },
      { id: 'static', stack: 'static-web', presentation: 'none', technologies: ['HTML'], rationale: 'Alternativa de menor operação, limitada para consultas dinâmicas.', consequences: ['Atualizações exigem geração do catálogo.'], source_urls: ['https://learn.microsoft.com/en-us/aspnet/core/'] }
    ],
    selected_option: 'web',
    research: [{ url: 'https://learn.microsoft.com/en-us/aspnet/core/', accessed_at: '2026-11-07', status: 'consulted', findings: 'Framework para aplicações web HTTP.' }],
    validation: ['Build e requisição HTTP ao host gerado.'],
    approval: { status: 'approved', source_reference: 'references/aceite-tecnologia.md' }
  };
}
