import { createHash } from 'node:crypto';
import { normalizeInitialContext } from '../scripts/lib/business-context.mjs';
export const fullContext = normalizeInitialContext({ problem: 'Atendentes perdem solicitações sem responsável.', current_situation: 'Controle manual em planilhas.', stakeholders: ['Atendentes de suporte'], desired_outcomes: ['Acompanhar solicitações até resolução'], success_criteria: ['Toda solicitação tem responsável e histórico'], scope: ['Registrar e acompanhar solicitações'], constraints: ['Equipe conhece .NET'], known_rules: ['Toda solicitação tem responsável'] });
export const digest = value => createHash('sha256').update(value).digest('hex');
export const sourceUrl = 'https://www.w3.org/TR/WCAG22/';
export const sourceBody = 'Accessible interfaces support identifiable controls and clear instructions.';
export const researchRequest = () => ({ status: 200, body: Buffer.from(sourceBody), location: null });
export function preparationFor(context = fullContext) {
  return {
    schema_version: 1, context_sha256: digest(JSON.stringify(normalizeInitialContext(context))),
    assessment: { domain: 'Atendimento de suporte', main_flow: 'Registrar, atribuir responsável e resolver solicitação', critical_questions: [], dimensions: ['rules', 'data', 'integrations', 'constraints', 'out_of_scope'].map(topic => ({ topic, conclusion: 'Nenhuma exigência adicional no escopo inicial informado.', origin: 'user', open_questions: [] })) },
    sources: [{ id: 'technology', url: 'https://learn.microsoft.com/en-us/aspnet/core/', title: 'ASP.NET Core', publisher: 'Microsoft', authority: 'Documentação oficial do framework', relevance: 'Host HTTP para o atendimento', findings: ['Suporte a aplicações HTTP'], required: true, receipt: { final_url: 'https://learn.microsoft.com/en-us/aspnet/core/', accessed_at: '2026-11-08', content_sha256: digest(sourceBody), bytes: Buffer.byteLength(sourceBody) } }, { id: 'accessibility', url: sourceUrl, title: 'WCAG 2.2', publisher: 'W3C', authority: 'Padrão primário de acessibilidade de interfaces', relevance: 'Formulários de registro acessíveis aos atendentes', findings: ['Identificar controles e fornecer instruções claras'], required: true, receipt: { final_url: sourceUrl, accessed_at: '2026-11-08', content_sha256: digest(sourceBody), bytes: Buffer.byteLength(sourceBody) } }],
    synthesis: [{ topic: 'Formulários de atendimento', finding: 'Prever rótulos e instruções compreensíveis', source_ids: ['accessibility'], kind: 'recommendation' }],
    coverage: [{ topic: 'Tecnologia HTTP', rationale: 'Verificar compatibilidade do host selecionado', source_ids: ['technology'] }, { topic: 'Interação principal do usuário', rationale: 'Cobrir acessibilidade dos formulários; sem regulação setorial identificada no escopo.', source_ids: ['accessibility'] }],
    risks: ['Validar fluxo com atendentes antes de implementar'], assumptions: ['Volume inicial não informado; medir antes de otimizar'],
    action_plan: [{ id: 'discovery', objective: 'Validar fluxo do atendimento', depends_on: [], deliverables: ['Mapa do fluxo e limites'], acceptance_criteria: ['Atendentes validam o fluxo'], validation: ['Revisar exemplos reais sanitizados'], risks: ['Regras privadas ainda podem mudar'] }, { id: 'coherence', objective: 'Otimizar o projeto e alinhar o repositório ao contexto aprovado', depends_on: ['discovery'], deliverables: ['Relatório de coerência e ajustes'], acceptance_criteria: ['Nenhuma contradição bloqueadora'], validation: ['Build, testes e revisão global'], risks: ['Preservar arquivos locais'] }]
  };
}
