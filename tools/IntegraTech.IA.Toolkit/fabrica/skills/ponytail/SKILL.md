---
name: ponytail
description: Aplique engenharia enxuta durante implementação, correção, refatoração, escolha de dependências e revisão; prefira a menor solução completa e segura.
license: MIT
source: https://github.com/DietrichGebert/ponytail
---

# Ponytail — engenharia enxuta

Skill adaptada do Ponytail para o fluxo e os gates do IntegraTech. Use durante tarefas de código; não substitui contexto de negócio, arquitetura aprovada, SDD, autorização, validação ou revisão independente.

## Entenda o escopo antes de alterar

Leia a tarefa e os arquivos relacionados. Identifique callers, testes, fixtures, configuração, exports e documentação afetados. Confira riscos de compatibilidade, exposição ou perda de dados. Não amplie o escopo com funcionalidades especulativas; complete todo o trabalho que a tarefa aprovada exige.

## Escolha a solução enxuta que funciona

Considere, nesta ordem, alternativas que satisfaçam os requisitos e critérios de aceite:

1. Remover a necessidade ou simplificar o requisito quando contexto e aceite permitirem.
2. Reutilizar helpers, componentes, dependências e padrões já existentes no projeto.
3. Usar recurso nativo da plataforma ou biblioteca padrão.
4. Usar dependência já instalada.
5. Implementar a menor solução legível e completa.

Prefira remoção a adição quando ambas resolverem o problema. Evite abstrações, wrappers, configurações ou opções especulativas. Preserve camadas e contratos aprovados. Entre soluções de tamanho parecido, prefira a que trata corretamente os casos-limite.

Uma mudança é completa quando alcança os callers e artefatos afetados e satisfaz os critérios aprovados. Comentários explicam apenas decisões que o código não revela. Um desvio conhecido deve registrar o limite e o gatilho de evolução com `shortcut: <limite>, <quando evoluir>`.

## Limites que não podem ser reduzidos

Não remova validação em fronteiras de confiança, tratamento de erros que evite perda de dados, segurança, acessibilidade, requisitos de desempenho/calibração pertinentes ou qualquer item explicitamente pedido. Não descarte testes ou controles só para reduzir linhas. Mudança funcional não trivial deve ter a validação exigida pelo plano e pelo toolkit; resultados não executados permanecem pendentes.

## Modos por tarefa

- **full** (padrão): aplicar os princípios acima à tarefa autorizada e indicar limites relevantes na entrega.
- **lite**: implementar o que foi pedido e apresentar uma alternativa menor, sem alterar o escopo aprovado automaticamente.
- **ultra**: além de full, questionar requisitos cujo benefício não esteja fundamentado; pedir decisão antes de reduzir ou retirar escopo aprovado.

Os modos são preferências locais da tarefa/sessão. Não instale hooks, não persista estado global e não trate “ultra” como autorização para contrariar gates ou decisões do usuário.

## Integração com a fábrica

O CTO carrega esta skill ao encaminhar implementação/refatoração ao `application-engineer` ou `architecture-engineer`, e em pedidos explícitos de solução simples ou redução de complexidade. O especialista aplica os princípios junto à skill da sua responsabilidade. O `code-reviewer` continua fazendo revisão independente; carregue `integratech-arquitetura` e esta skill como critérios auxiliares sem delegar escrita ao revisor. Em pedido de auditoria global, mantenha a auditoria proporcional ao risco e à evidência disponível.

Leia governança, contexto, arquitetura aprovada, plano/tarefa e arquivos autorizados. Os gates e limites de segurança do IntegraTech prevalecem sobre esta preferência por concisão. Não alegue economia de código, custo ou tempo sem baseline e medição do próprio projeto.

## Proveniência

Adaptada de [Ponytail](https://github.com/DietrichGebert/ponytail), de Dietrich Gebert, sob MIT. O IntegraTech ajustou os gatilhos, linguagem e integração aos seus contratos, agentes e gates. A skill não inclui os hooks, telemetria, comandos, benchmarks ou plugins externos do Ponytail.
