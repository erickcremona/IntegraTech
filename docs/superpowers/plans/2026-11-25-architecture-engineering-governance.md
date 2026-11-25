# Architecture Engineering & Governance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrar classificação de impacto arquitetural e revisão proporcional ao fluxo SDD/engenharia existente, preservando decisões contextualizadas e validadores por stack.

**Architecture:** Reutilizar architecture-decision, architecture-inspection, SDD v2, code-reviewer e data-migration-reviewer. Um módulo puro calcula o piso N0–N4; o SDD vincula a avaliação à tarefa; o loop seleciona revisões e mantém achados no contrato de review. N4 reusa o gate de migração aprovado. Não há runtime ou dependência nova.

**Tech Stack:** Node.js ESM >=22, JSON Schema local, Node test runner; validadores de produto continuam contextuais.

**Spec:** `docs/superpowers/specs/2026-11-25-architecture-engineering-governance.md`

## Global Constraints

- Preservar projetos legados sem exigir readoção ou migração de contrato.
- Não escolher stack, ferramenta ou padrão de arquitetura universal.
- Não executar comandos arbitrários definidos por plano/produto.
- N4 exige decisão `mode: evolution`, baseline atual, compatibilidade, rollback reversível e fases SDD aprovadas.
- Falha ou indisponibilidade de revisão necessária bloqueia a entrega.
- Contextos e artefatos de produtos distintos permanecem isolados.

## Review Focus

- Sinais contraditórios ou ausentes: teste que bloqueia classificação artificialmente baixa.
- Arquivos de contrato, migração, autorização ou integração: teste de piso automático conservador quando a extensão/caminho for inequívoco.
- Projeto sem decisão arquitetural gerenciada: teste de compatibilidade legada.
- N4 em decisão inicial ou baseline obsoleto: teste de bloqueio.
- Revisor indisponível ou achado alto/crítico: teste de gate bloqueado e revalidação do candidato corrigido.

## Diagnóstico consolidado

- Existe fluxo contextual completo para avaliação/aceite inicial, hashes e decisão de evolução vinculada ao SDD v2.
- O módulo de módulos já rejeita ciclos; decisões exigem pesquisa, justificativa, alternativas e estratégia de validação.
- `system-design` já é condicionado a sinais verificáveis e seu hash integra o plano.
- A lacuna objetiva é que tarefas SDD não classificam seu impacto arquitetural e o loop não exige revisão arquitetural/dados por nível.
- O guia `docs/arquitetura/base.md` e a skill `integratech-arquitetura` já cobrem revisão contextual; não criar agente, skill ou ferramenta duplicada.
- Não há necessidade de instalar Structurizr, ArchUnit, Sonar, Semgrep, CodeQL ou serviços externos na base. A automação de código deve ser selecionada no produto após stack e plano aprovados.

## Revisão adversarial do plano

- **Risco de falsa precisão:** N0–N4 não podem ser inferidos apenas de um rótulo do agente. Mitigação: sinais obrigatórios, evidência por requisitos, piso determinístico e revisão comparada aos arquivos alterados.
- **Risco de mudar contratos congelados:** exigir nova propriedade em todos os produtos quebraria legados. Mitigação: ativar o campo quando há decisão arquitetural gerenciada; contratos de documentos existentes continuam versionados.
- **Risco de duplicar ADR:** o registro de decisão já contém alternativas, pesquisa, consequências via justificativa, aceite e histórico Git. Mitigação: tratá-lo como mecanismo ADR existente; evoluções geram decisão vinculada, sem criar outro repositório de ADRs.
- **Risco de escolher ferramenta sem conhecer stack:** ferramentas candidatas variam por linguagem/licença/runtime. Mitigação: nenhum pacote global; ligar a validação de código ao perfil aprovado para produto.
- **Risco de revisão cosmética ou autorrevisão:** review arquitetural precisa ser distinto do papel de implementação. Mitigação: usar `code-reviewer` read-only em tipo separado, com rubric arquitetural e candidato/hash idênticos; bloquear repetição da revisão do mesmo candidato.
- **Risco de marcar execução estrutural sem prova:** `architectureStatus` permanece `not_run` sem validador do produto. Mitigação: não alterar essa semântica; novo gate só atesta classificação/plano/revisão.

## Task 1: Classificador e contrato de impacto

**Files:** Create `tools/IntegraTech.IA.Toolkit/scripts/lib/architecture-impact.mjs`; create `tools/IntegraTech.IA.Toolkit/fabrica/team/contracts/architecture-impact.schema.json`; create `tools/IntegraTech.IA.Toolkit/tests/architecture-impact.test.mjs`; modify `scripts/lib/contracts.mjs` and `fabrica/team/contracts/business-plan-v2.schema.json`.

**Interface:** `assessArchitectureImpact({impact, requirementIds, writeFiles}) -> {status, classification, minimum, required_reviews, checks}`. Sinais: `documentation_only`, `local_change`, `single_module`, `multiple_modules`, `domain_rules`, `public_contract`, `data_persistence`, `external_integration`, `security_boundary`, `quality_attribute`, `architecture_decision`, `technology_change`, `migration`, `unknown`. Sinais arquiteturais recebem pisos N0–N4; `unknown`, justificativa vazia, referência de requisito ausente ou class abaixo do piso retorna `blocked`. Contratos/migrações em caminhos inequívocos elevam o piso mesmo se o sinal foi omitido.

- [ ] Escrever testes de pisos, referências inválidas, sinal desconhecido, caminho de contrato/migração e tentativa de subclassificação.
- [ ] Executar `node --test tools/IntegraTech.IA.Toolkit/tests/architecture-impact.test.mjs` e observar falha.
- [ ] Implementar avaliador puro e schema; N0 não pode usar apenas lista vazia de sinais.
- [ ] Rodar o teste focal e validar schema inválido/legado sem regressão.

## Task 2: Vincular impacto ao plano e à tarefa SDD

**Files:** Modify `sdd-plan.mjs`, `sdd-workflow.mjs`, `business-plan-v2.schema.json`, `delegation.schema.json`, tests `sdd-plan.test.mjs`, `sdd-workflow.test.mjs`.

**Interface:** tarefa SDD de produto gerenciado inclui `architecture_impact` com a forma do contrato. `inspectSDDPlan` valida cada tarefa contra `requirement_ids` e `write_files`; N4 requer decisão aprovada `mode:evolution` e tarefa/fase compatível com a migração. `sddDelegation` transporta a mesma avaliação sem permitir edição fora do plano/hash aprovado.

- [ ] Adicionar casos RED: propriedade ausente, piso insuficiente, requisito não referenciado, N4 sem evolução, contexto legado sem decisão.
- [ ] Executar os testes focais SDD e confirmar falhas.
- [ ] Implementar integração e mensagens de bloqueio objetivas.
- [ ] Reexecutar testes e verificar delegação derivada idêntica à avaliação aprovada.

## Task 3: Revisões independentes e achados acionáveis

**Files:** Modify `engineering-loop.mjs`, `review.schema.json`, `contracts.mjs`, `integratech-arquitetura/SKILL.md`, tests `engineering-loop.test.mjs`, `interface.test.mjs`.

**Interface:** N2+ adiciona review `architecture` ao conjunto obrigatório; `data_persistence` adiciona `data`. O tipo `architecture` usa `code-reviewer` read-only com objetivo/contexto arquitetural específico; `data` reutiliza `data-migration-reviewer`. Arquitetura só passa quando há parecer `approved` sem achados; achados exigem IDs únicos e campos operacionais completos.

- [ ] Testar reserva de revisores, ordem de execução e bloqueio por indisponibilidade/achado.
- [ ] Testar que N0/N1 não recebem revisão adicional e N2/N3/N4 recebem arquitetura; persistência inclui dados.
- [ ] Implementar roteamento/rubrica e validação de achados sem permitir segunda tentativa no mesmo candidato.
- [ ] Revalidar candidato corrigido em nova revisão com hash distinto.

## Task 4: Integração de adoção, documentação e baseline

**Files:** Modify `fabrica/governance.md`, `docs/inicio/arquitetura-contextual.md`, `docs/inicio/sdd.md`, native instructions/adapters and `fabrica/project-template.json` only where canonical content requires; regenerate mirrors/baseline.

- [ ] Documentar fluxo N0–N4, condições de acionamento, limites de automação, mecanismo ADR existente e seleção de fitness functions por produto.
- [ ] Verificar adoção/materialização: nova capacidade aparece; projetos existentes seguem compatíveis.
- [ ] Sincronizar espelhos por gerador oficial, atualizar baseline e validar o inventário.

## Task 5: Validação final e limites

- [ ] Rodar suites arquiteturais, SDD, loop, contrato, adoção e cenários UX relacionados.
- [ ] Rodar `npm run check`, `npm run toolkit -- validate --provider all`, `npm run verify` e `git diff --check`.
- [ ] Confirmar hash de recibo atual; registrar cenários não executados, ferramentas não instaladas e que código de produto sem stack não recebe validação estrutural fictícia.

## Fases explicitamente contextuais

- C4/Mermaid/ADR são selecionados por utilidade e stack; não há instalação ou formato único obrigatório.
- Fitness Functions de código, APIs, banco, desempenho e telemetria pertencem ao plano/stack de cada produto. Esta alteração torna os pontos de decisão e revisão operacionais, sem adicionar scanners ou runtimes globais.
- Observabilidade, dívida técnica operacional, auditoria de produção, migração e rollback reais exigem contexto e autorização do produto; não são simulados no toolkit modelo.

## Estado da execução e limites verificados

- Implementados: classificador N0–N4 com pisos por evidência/caminho; vínculo ao plano SDD e decisão vigente; N4 vinculado a evolução/fase; revisão arquitetural N2+ e revisão de dados para persistência; achados arquiteturais com campos de rastreabilidade e bloqueio crítico/alto; encerramento de migração usa perfil de validação registrado em vez de pressupor .NET.
- Documentação e adoção: princípios permanentes, fluxo, skill canônica, documentação e manifesto do produto atualizados; baseline verificado com 288 arquivos controlados.
- Testes observados: classificador 4/4; loop/revisões 18/18; cenários de migração selecionados 2/2; adoção/Cursor 19/19; diagnóstico seguro de conflito no CLI 1/1. A verificação oficial final passou: 337/337 testes, baseline, validação de todos os providers, oito avaliações locais e varredura de padrões de segredo. Quatro binários foram ignorados pela varredura; testes sintéticos da fábrica não certificam produto real.
- Espelhos reconciliados: `.agents`, `.claude` e `.cursor` correspondiam exatamente à skill versionada anterior, sem alterações personalizadas adicionais. O manifesto local estava desatualizado; após conferir os três conteúdos e executar preview, o instalador oficial atualizou somente esses três arquivos. `npm run check`, `validate --provider all` e `doctor --quick` passaram; doctor indicou Node/curl/adaptadores prontos.
- Coerência global do domínio continua bloqueada por projeto-modelo: `project.json` mantém `is_model:true` e não há especialista de domínio/contexto de produto preparado. `coherence-run` retornou “Especialista ausente; complete contexto e pesquisa com specialist-prepare.” Não inventar produto ou aprovação só para liberar esse gate; a checagem deve ser feita durante adoção/design de um produto real.
- Ainda contextuais/planejados: registro executável de Fitness Functions por produto, scanners e ferramentas de arquitetura, C4/Structurizr, observabilidade, auditoria runtime e Red Team real. Dependem de produto, stack, fontes/licenças e execução revisora disponíveis; as verificações simuladas dos testes provam o fluxo do contrato/estado, não a integração externa nem a qualidade de arquitetura de um produto real.
- Corrigido no CLI um problema encontrado na revisão: `install` agora mostra o erro controlado de conflito sem expor conteúdo do arquivo; teste de processo comprovou a saída sanitizada.
- Rollback: reverter os arquivos versionados deste incremento pelo controle de versão; a sincronização dos três espelhos pode ser refeita pelo instalador a partir da skill canônica. Nenhuma dependência externa, instalação global, alteração de credencial, publicação ou efeito em produto real foi executado.
