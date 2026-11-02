# Fábrica de IA: comparação com referências externas

Pesquisa e inspeção em 2026-11-02. Versão local analisada: commit `06aa4f6`. Escopo: avaliar práticas e oportunidades; sem implementar mudanças funcionais, chamar modelos com o código do projeto ou alterar provedores/permissões.

## Conclusão

É possível melhorar a fábrica preservando sua arquitetura atual. Ela possui mecanismos concretos de contexto, contratos, adoção, gates e recuperação. A principal lacuna é demonstrar e controlar o comportamento dos agentes durante execuções reais e repetidas, inclusive quando há falhas ou troca de provedor.

Minha classificação é **base de desenvolvimento assistido com governança e utilitários testados; autonomia operacional de ponta a ponta ainda não demonstrada**. É uma conclusão da inspeção, não certificação, ranking de mercado ou resultado de benchmark.

As referências convergem para sistemas simples, controles executáveis, avaliação dos resultados e estado durável. A Anthropic recomenda começar com padrões simples e aumentar complexidade conforme a necessidade. Isso favorece manter o núcleo compartilhado e o roteamento atual. [Building effective agents](https://www.anthropic.com/research/building-effective-agents).

## O que já está alinhado

| Prática | Evidência no projeto | Avaliação |
|---|---|---|
| Entrada clara e contexto consultável | AGENTS.md/CLAUDE.md encaminham para governança, contexto e retomada | Preservar entradas curtas e referências específicas. A organização é compatível com o uso do repositório como fonte de conhecimento descrito pela OpenAI. [Harness engineering](https://openai.com/index/harness-engineering/) |
| Separação de responsabilidades | Catálogo com CTO, especialistas e revisores; limite de profundidade | A estrutura é explícita. Catálogo não comprova execução nem isolamento por si só. |
| Contratos e falha fechada | contracts.mjs e schemas; dispatcher rejeita saída inválida e identidade divergente | Há validação executável, além de instruções. |
| Controle da evolução do negócio | governance.mjs valida contexto, plano, hashes e referência de aceite | O vínculo documental existe; identidade/autoridade do aprovador não é autenticada por ele. |
| Operações locais recuperáveis | project-adoption.mjs e adoption-recovery.mjs usam baseline, journal, snapshots e substituição preparada | Recuperação foi implementada para adoção; não equivale a retomada de toda a execução de desenvolvimento. |
| Limites de revisão | providers.mjs/dispatcher.mjs usam argumentos separados, revisão restrita, timeout e limites de pacote/saída | São controles úteis. A eficácia das permissões reais continua dependente do ambiente/provedor. |

## Comparação e melhorias propostas

P1 significa prioridade antes de ampliar a autonomia; P2 significa evolução operacional subsequente. São prioridades propostas nesta análise.

| Prioridade | Prática externa | Situação observada | Melhoria aplicável |
|---|---|---|---|
| P1 | Avaliar agentes por tarefas, tentativas e estado final do ambiente. [Anthropic: evals](https://www.anthropic.com/research/demystifying-evals-for-ai-agents) | A validação registrada cobre utilitários/CLI. O próprio relatório de adoção declara não cobrir conversa completa com Codex/Claude. | Criar avaliações reais repetidas: receber problema/nome, adotar, planejar, implementar uma funcionalidade pequena e comprovar o resultado. |
| P1 | Aplicar políticas em pontos de execução, não depender apenas de texto. [OWASP ACS](https://genai.owasp.org/resource/agent-control-standard-acs/) | O dispatcher chama precheck, mas a implementação ocorre na sessão nativa. Não observei um ponto único de controle das ações de implementação no código da fábrica. | Definir uma política comum de capacidades por papel/fase e verificar sua aplicação pelos recursos efetivos de cada provedor. Manter permissões e autorizações humanas existentes. |
| P1 | Separar entrada não confiável de ferramentas poderosas e restringir acesso. [Anthropic: secure deployment](https://platform.claude.com/docs/en/managed-agents/secure-deployment) | Há seleção de arquivos, triagem de segredos e instrução contra prompt injection nas revisões. Isso não demonstra resistência do fluxo inteiro. | Testar contexto/README/handoff malicioso, falsa aprovação, tentativa de ler segredo e alteração fora de escopo. Usar isolamento e ferramentas mínimas compatíveis com a tarefa. |
| P1 | Transformar regras arquiteturais em verificações automáticas. [OpenAI: harness engineering](https://openai.com/index/harness-engineering/) | Existem testes locais e validador. Não existe diretório versionado .github/workflows nesta versão inspecionada. | Adicionar CI para testes, builds, geração/adoção em cópia, baseline, deriva dos adaptadores e varredura de segredos. A avaliação não verificou configurações de CI externas ao repositório. |
| P2 | Persistir progresso utilizável por outra sessão. [Anthropic: long-running agents](https://www.anthropic.com/research/effective-harnesses-for-long-running-agents) | Existem project-state, plano e handoff. Não observei máquina de estados durável para cada tarefa/tentativa de implementação. | Registrar tarefa atual, fase, dependências, commit, evidências, bloqueios e próxima ação; retomar somente após conferir o estado real. |
| P2 | Separar sessão, orquestração e ambiente de execução. [Anthropic: stable interfaces](https://www.anthropic.com/research/managed-agents) | Contratos e adaptadores já ajudam na separação. O estado de execução ainda não é um subsistema independente da sessão nativa. | Criar registros de execução e interfaces estáveis para início, pausa, cancelamento e retomada, sem obrigar migração para serviço hospedado. |
| P2 | Registrar spans, métricas e eventos de IA. [OpenTelemetry GenAI](https://github.com/open-telemetry/semantic-conventions-genai) | A pasta observability contém orientação; o dispatcher persiste parecer/handoff quando válidos. Não observei instrumentação estruturada transversal. | Introduzir eventos sanitizados por execução: decisões de gate, etapas, duração, versão do provedor/modelo e resultado. Exportação OpenTelemetry pode ser opcional e versionada. |
| P2 | Limites financeiros e forma de interromper a execução. [Anthropic: limites e segurança](https://platform.claude.com/docs/en/managed-agents/secure-deployment) | Há timeout e teto de saída por processo; não há orçamento agregado de custo/tokens ou detector de falta de progresso no runner inspecionado. | Definir limites por tarefa, tentativas e tempo total; interromper ciclos sem progresso. Quando o provedor não informar uso/custo, registrar indisponível, sem inventar valores. |

## Primeira entrega recomendada

Começar por um pacote de confiabilidade, com escopo pequeno:

1. **Catálogo de avaliações comportamentais:** cenários versionados com entrada, ambiente isolado, resultado esperado e evidência. Medir perguntas redundantes, fidelidade ao problema, identificação da cópia, adoção, respeito ao plano e resultados da funcionalidade.
2. **Matriz de conformidade dos provedores:** versão de CLI/modelo, flags/capacidades, autenticação, negação efetiva de escrita nas revisões e comportamento de erro. Hoje checkProvider verifica ajuda/flags, não esse comportamento completo.
3. **CI e políticas executáveis:** executar as verificações existentes e tornar explícitas as capacidades permitidas por fase. O agente não pode fabricar a própria autorização. A validação de JSON/aceite permanece distinta da aprovação efetiva da ação na ferramenta.

As avaliações devem repetir tentativas e verificar arquivos, compilação, testes e alterações no ambiente; a declaração do próprio agente não basta como resultado. O critério de sucesso deve ser definido antes da execução. A escolha dos limiares depende dos resultados medidos, sem prometer confiabilidade absoluta.

## Segunda entrega recomendada

Adicionar estado durável de tarefas, retomada validada e eventos estruturados. O estado mínimo deve distinguir pendente, executando, aguardando decisão, bloqueado, falhou e concluído. Relacionar evidências ao commit e invalidar conclusões quando o código/contexto mudar.

Eventos podem conter run_id, task_id, papel, fase, provedor, versões, hashes relevantes, duração, tipo de falha e resultado. Evitar credenciais, conteúdo bruto de negócio e raciocínio interno. Definir retenção e acesso. OpenTelemetry é uma opção de integração, não uma dependência obrigatória para iniciar.

Depois, calibrar orçamento, tentativas e nível de autonomia com base nas avaliações. Paralelismo deve continuar condicionado a ownership e independência de arquivos/recursos.

## Critérios para aceitar a evolução

- A mesma suíte comportamental pode ser executada por Codex e Claude, com diferenças e indisponibilidades explicitadas.
- Entrada incompleta produz perguntas necessárias; contexto fornecido é preservado; projeto real não reinicia onboarding.
- Sem aceite efetivo, a fase ou ação protegida não avança. Arquivos de referência não substituem permissões da ferramenta.
- Entrada adversarial não muda políticas, não autoriza ações e não provoca leitura/escrita fora dos limites do teste.
- Interrupção e retomada não duplicam efeitos nem aceitam estado antigo como atual.
- Evidências mostram o resultado real e sua versão; custos desconhecidos e validações não executadas são indicados como tais.

Esses critérios são propostas para testes, não afirmações de que o comportamento já foi comprovado.

## Limites desta análise

Inspeção do código e documentos versionados, mais consulta a fontes primárias públicas. Não executei novos testes, red team, modelos, escrita nos provedores ou auditoria do ambiente externo. Os 35 testes constam da evidência anterior de adoção; não são um benchmark de inteligência/autonomia.

As páginas de Managed Agents descrevem produtos específicos e, em alguns casos, em beta. As recomendações aqui aproveitam princípios arquiteturais; não pressupõem que suas APIs sejam equivalentes às CLIs locais. A publicação inicial de Building effective agents é de 2024 e foi complementada por textos de 2025/2026. O guia OWASP referenciado é de riscos/controles, não certificação do projeto. Convenções de telemetria e interfaces devem ser verificadas e fixadas por versão na implementação.

Nenhuma melhoria funcional foi aplicada nesta pesquisa. O documento é uma comparação e proposta de evolução para decisão posterior.
