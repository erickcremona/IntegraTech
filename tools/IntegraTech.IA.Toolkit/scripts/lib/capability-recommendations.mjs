import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const recommendationCategories = Object.freeze(['plugins', 'skills', 'agents', 'tools']);
const contextFields = new Set(['problem', 'current_situation', 'stakeholders', 'desired_outcomes', 'success_criteria', 'scope', 'out_of_scope', 'known_rules', 'data', 'constraints', 'integrations']);
const recommendationsFor = preparation => preparation.capability_recommendations;
const markdownText = value => String(value).replace(/[\r\n]+/g, ' ').replace(/[\\`*_{}\[\]()<>#+.!|]/g, '\\$&');

export function inspectCapabilityRecommendations({ repo, preparation }) {
  const assessment = recommendationsFor(preparation);
  if (!assessment || !Array.isArray(assessment.categories) || !Array.isArray(assessment.items))
    throw new Error('Avalie plugins, skills, agents e ferramentas no levantamento antes de criar/adotar o projeto.');

  const categoryIds = assessment.categories.map(item => item.category);
  if (categoryIds.length !== recommendationCategories.length || new Set(categoryIds).size !== categoryIds.length
    || recommendationCategories.some(category => !categoryIds.includes(category)))
    throw new Error('A avaliação deve cobrir exatamente plugins, skills, agents e ferramentas.');

  const sourceIds = new Set(preparation.sources.map(source => source.id));
  const itemIds = new Set();
  for (const item of assessment.items) {
    if (itemIds.has(item.id)) throw new Error('IDs de recomendação duplicados.');
    itemIds.add(item.id);
    if (!contextFields.has(item.context_refs[0]) || item.context_refs.some(field => !contextFields.has(field)))
      throw new Error(`Recomendação ${item.id} precisa apontar para campos do contexto analisado.`);
    if (item.source_ids.some(id => !sourceIds.has(id))) throw new Error(`Recomendação ${item.id} aponta para fonte inexistente.`);
    if (item.scope === 'toolkit_builtin') {
      if (!['skills', 'agents'].includes(item.category)) throw new Error('Capacidade interna do toolkit deve ser skill ou agent.');
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.name)) throw new Error(`Identificador interno inválido: ${item.name}.`);
      const identity = JSON.parse(readFileSync(join(repo, 'project.json'), 'utf8'));
      const factory = join(repo, `tools/${identity.name}.IA.Toolkit/fabrica`);
      const catalogPath = join(factory, 'team/catalog.yaml');
      const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
      const known = item.category === 'agents'
        ? catalog.specialists.some(role => role.name === item.name)
        : existsSync(join(factory, 'skills', item.name, 'SKILL.md'));
      if (!known) throw new Error(`Capacidade interna não encontrada no catálogo do toolkit: ${item.name}.`);
    } else if (['recommend', 'evaluate'].includes(item.decision)) {
      if (!item.source_ids.length) throw new Error(`Recomendação externa ${item.id} exige fonte consultada com comprovante.`);
      for (const sourceId of item.source_ids) {
        const source = preparation.sources.find(candidate => candidate.id === sourceId);
        if (!source?.receipt) throw new Error(`Recomendação externa ${item.id} exige comprovante de consulta para ${sourceId}.`);
      }
    }
  }

  for (const category of assessment.categories) {
    if (category.item_ids.some(id => !itemIds.has(id))) throw new Error(`Categoria ${category.category} referencia recomendação inexistente.`);
    const belonging = assessment.items.filter(item => item.category === category.category).map(item => item.id).sort();
    if ([...category.item_ids].sort().join('\0') !== belonging.join('\0')) throw new Error(`Cobertura de recomendações divergente na categoria ${category.category}.`);
    if (category.outcome === 'none' && belonging.length) throw new Error(`Categoria ${category.category} declara ausência de recomendações, mas possui itens.`);
    if (category.outcome !== 'none' && !belonging.length) throw new Error(`Categoria ${category.category} precisa justificar a ausência de itens como none.`);
    if (category.outcome === 'recommend' && !assessment.items.some(item => item.category === category.category && item.decision === 'recommend')) throw new Error(`Categoria ${category.category} precisa conter item com decisão recommend.`);
    if (category.outcome === 'evaluate' && !assessment.items.some(item => item.category === category.category && item.decision === 'evaluate')) throw new Error(`Categoria ${category.category} precisa conter item com decisão evaluate.`);
    if (category.outcome === 'defer' && assessment.items.some(item => item.category === category.category && item.decision !== 'defer')) throw new Error(`Categoria ${category.category} declara adiamento, mas contém decisão diferente.`);
  }
  return assessment;
}

export function renderCapabilityRecommendations({ name, context, preparation }) {
  const assessment = recommendationsFor(preparation);
  const renderItem = item => {
    const sources = item.source_ids.length ? item.source_ids.map(id => {
      const source = preparation.sources.find(entry => entry.id === id);
      return `[${markdownText(source.title)}](<${new URL(source.url).href}>) — ${markdownText(source.publisher)}; autoridade declarada: ${markdownText(source.authority)}; consulta: ${source.receipt?.accessed_at ?? 'sem recibo'}; SHA-256: ${source.receipt?.content_sha256 ?? 'sem recibo'}`;
    }).join(', ') : 'Catálogo interno do toolkit.';
    return [
      `### ${markdownText(item.name)}`,
      `- Decisão sugerida: ${item.decision}`,
      `- Onde se aplica: ${item.scope}`,
      `- Relação com o contexto: ${markdownText(item.rationale)} (campos: ${item.context_refs.join(', ')})`,
      `- Alternativas: ${item.alternatives.map(markdownText).join('; ')}`,
      `- Riscos e limites: ${item.risks.length ? item.risks.map(markdownText).join('; ') : 'Nenhum risco adicional registrado.'}`,
      `- Fontes: ${sources}`
    ].join('\n\n');
  };
  const categories = assessment.categories.map(category => {
    const items = assessment.items.filter(item => item.category === category.category);
    const summary = `## ${category.category[0].toUpperCase()}${category.category.slice(1)}\n\nResultado da análise: **${category.outcome}**. ${markdownText(category.rationale)}`;
    return [summary, items.length ? items.map(renderItem).join('\n\n') : 'Nenhuma capacidade adicional foi recomendada para esta categoria, conforme a análise acima.'].join('\n\n');
  }).join('\n\n');
  return `# Recomendações para ${markdownText(name)}\n\nContexto analisado: ${markdownText(preparation.assessment.domain)}. Fluxo principal: ${markdownText(preparation.assessment.main_flow)}.\n\nProblema informado: ${markdownText(context.problem)}\n\nEste relatório está vinculado ao contexto SHA-256 \`${preparation.context_sha256}\`. As sugestões são candidatas contextualizadas, não instalações, conexões ou aprovações. Cada instalação ou serviço externo depende de revisão e autorização aplicável. Recomendações externas incluem fontes consultadas; skills e agents internos são conferidos contra o catálogo do toolkit. A análise não substitui decisão do responsável pelo produto.\n\n${categories}\n`;
}
