# Qualidade da experiência de interface

Este guia orienta desenho e revisão em qualquer frontend escolhido. A meta é uma experiência moderna e competitiva para o público do produto: tarefas claras, identidade coerente, interação confiável e uso confortável nos dispositivos reais. Um scaffold demonstra capacidade técnica; qualidade de produto exige pesquisa, desenho contextual e observação do resultado renderizado. Nem a presença deste documento nem uma nota de revisão comprovam liderança de mercado.

## Antes da composição

Leia contexto, consulta do especialista de domínio, decisão tecnológica e perfil de interface. Registre no desenho:

- Público e condições de uso: experiência, frequência, dispositivos, ambiente, necessidades de acesso e restrições conhecidas.
- Tarefas prioritárias e jornadas: objetivo, entrada, passos, decisão principal, sucesso e recuperação. Diferencie fatos, hipóteses e perguntas abertas.
- Conteúdo realista: dados representativos, rótulos do domínio, volumes, textos longos, localização e informações necessárias para decidir. Placeholders não validam compreensão.
- Critérios observáveis: o que a pessoa deve conseguir concluir, em quais dispositivos, e quais limites de acessibilidade e desempenho serão avaliados.

Pesquise referências reais comparáveis por público, tarefa ou modelo de interação, além da documentação da tecnologia. Registre URL, data de acesso, fluxo/tela efetivamente observado, por que funciona e o que não se aplica ao produto. Uma landing page atraente pode não informar um fluxo operacional complexo. Observe arquitetura da informação, densidade, hierarquia, conteúdo, feedback e comportamento mobile. Analise princípios e limitações; não copie identidade, telas ou padrões sem avaliar seu contexto. Pesquisa indisponível deve ser declarada, sem simular consultas ou achados.

## Direção visual e comportamento

Proponha uma direção reconhecível e explique como atende às tarefas e à marca. Preserve um design system existente quando adequado; documente adaptações. Defina:

- Tipografia com papéis e escala legíveis, comprimento de linha e contraste entre títulos, conteúdo e metadados.
- Grid, largura de conteúdo, alinhamentos, espaçamento e densidade para leitura e ação; prioridade visual consistente com a prioridade da tarefa.
- Cores/tokens semânticos, contraste, superfícies, foco, bordas e variantes de componentes; significado não depende só de cor.
- Iconografia e imagens com função e tratamento coerentes, nomes acessíveis e alternativas quando necessárias.
- Conteúdo e microcopy que explicam ação, consequência, progresso e recuperação; erros ajudam a corrigir e ações destrutivas deixam o efeito claro.
- Motion que comunica relação, mudança de estado ou orientação, com duração proporcional e alternativa reduced motion. Efeito decorativo não pode atrasar a tarefa.

Dashboard, grade de cards, gradiente, glassmorphism, dark mode ou fonte da moda não constituem uma direção por si. Escolha composição, densidade e expressividade pelo contexto: um serviço público, um produto editorial e uma ferramenta operacional podem exigir soluções diferentes e igualmente cuidadas.

Desenhe caminhos felizes e estados aplicáveis: carregamento inicial e parcial, vazio inicial e sem resultados, erro recuperável e indisponibilidade, sucesso, validação, permissão negada, conteúdo extenso e operação em andamento. Preserve entradas quando houver falha e ofereça próximo passo claro. Em mobile, repense ordem, navegação, entrada de dados, toque, teclado virtual e ações persistentes para concluir a jornada; reduzir a largura do desktop não basta.

## Registro, protótipo e refinamento

1. Use `ui-design-init` para iniciar o rascunho de `references/interface-design.json`. Preencha os campos do contrato com o contexto atual, referências consultadas, jornadas, direção, estados, critérios e evidências. O comando não pesquisa, desenha ou aprova por conta própria.
2. Produza um protótipo renderizável das jornadas prioritárias na stack aprovada, com conteúdo representativo e estados que permitam avaliar decisões. Registre as hipóteses que o protótipo pretende verificar.
3. Abra o resultado em browser ou ferramenta nativa disponível e autorizada. Inspecione desktop e dispositivos/viewport representativos, incluindo mobile, conteúdo longo, zoom, foco e teclado. Capture evidências identificáveis por revisão do protótipo, jornada, estado e viewport/dispositivo. Build e testes de strings não demonstram aparência.
4. Faça crítica visual explícita: onde a atenção chega, qual ação parece principal, onde há ruído, inconsistência, densidade ou texto confuso. Observe a execução das tarefas e registre passos, hesitações, erros e recuperação. Uma inspeção por especialista é uma observação de especialista; só alegue pesquisa com usuários se ela ocorreu e houver método e participantes documentados sem dados pessoais.
5. Refine hierarquia, composição, conteúdo e interação a partir dos problemas observados. Renderize e inspecione novamente os pontos alterados e jornadas afetadas. Registre problemas, alterações e resultados; não transforme uma captura única em prova de um ciclo de refinamento.
6. Apresente o desenho e evidências para o aceite humano aplicável. Registre o aceite efetivamente recebido e execute `ui-design-check` antes de registrar candidato de UI. Contexto, decisão ou perfil alterados exigem reavaliar o registro e as evidências afetadas. A validação estrutural não autentica o aprovador nem substitui a análise visual.

O desenho é um gate adicional ao plano/aceite de negócio. `ui-generate` continua fornecendo uma referência técnica neutra; seu uso não aprova o desenho ou o produto. O toolkit não fornece novos renderizadores por este fluxo: use ferramentas realmente disponíveis para a stack, com suas permissões e limites. Ausência de browser/ferramenta nativa ou evidência visual suficiente bloqueia a conclusão que depende dessa observação.

## Critérios da revisão independente

A revisão `ux_accessibility` usa os sete critérios abaixo. Para `approved`, o contrato exige `ux_assessment`, com exatamente uma entrada por critério, `score` inteiro de 1 a 5 e `evidence` como lista de strings verificáveis. Todos devem atingir pelo menos 4; uma média não compensa falha localizada.

| Critério | O que precisa ser observado e fundamentado |
|---|---|
| `task_clarity` | Público e tarefa principal orientam navegação, rótulos, conteúdo, passos, conclusão e recuperação; observações da jornada sustentam o parecer. |
| `visual_hierarchy` | Prioridade, tipografia, grid, alinhamento, espaçamento e densidade tornam leitura e ação claras em telas e estados representativos. |
| `visual_identity` | A direção aprovada tem expressão contextual e coerente; tokens, componentes, imagens e conteúdo formam um sistema, com relação justificada às referências. |
| `interaction_states` | Ações e transições têm feedback compreensível; estados aplicáveis, formulários, prevenção/recuperação de erros e motion foram observados. |
| `responsive_behavior` | Jornadas prioritárias podem ser concluídas em desktop e mobile relevantes, com toque, teclado, conteúdo e navegação adequados. |
| `accessibility` | Evidências automáticas e manuais adequadas ao escopo cobrem semântica, nomes, contraste, teclado/foco, zoom e recursos da plataforma; limites são explícitos. |
| `performance` | Método, ambiente, orçamento e medições relevantes sustentam carregamento, resposta às ações e estabilidade visual; não há inferência por aparência ou build. |

Notas: **1** = falha grave que impede uso; **2** = problemas importantes; **3** = funcional, com fraquezas relevantes; **4** = critérios atendidos com evidência suficiente e sem fraqueza material pendente; **5** = execução especialmente cuidadosa e consistente no escopo observado, sustentada por evidências. Evidência insuficiente exige `blocked`; não atribua 4 por falta de problema conhecido. As notas não certificam WCAG, superioridade sobre concorrentes ou resultados reais de negócio.

## Aplicabilidade e resultado do gate

Classifique o impacto da tarefa na delegação como `direct`, `indirect`, `not_applicable` ou `unknown`, com justificativa e jornadas afetadas quando aplicável. Mudança direta inclui interface, navegação, conteúdo, feedback e interação. Mudança indireta inclui regras, respostas, permissões ou dados que alterem uma jornada mesmo sem editar arquivos de UI. `unknown` bloqueia a classificação do candidato. `not_applicable` exige motivo específico; uma mudança de UI detectada em código contradiz essa classificação e bloqueia o candidato. A ausência de contexto/perfil para um impacto direto ou indireto também bloqueia.

O avaliador `evaluateUxGate` registra um resultado explícito: `approved`, `approved_with_remarks`, `rejected`, `not_applicable` ou `blocked`. `approved_with_findings` é elegível a `approved_with_remarks` apenas para achados médios/baixos completos e acionáveis. `blocker`, `critical` e `high`, `changes_required`, falta de revisão, evidência insuficiente ou dependência necessária indisponível impedem aprovação. Uma alternativa equivalente só conta quando realmente executada e suas evidências estão disponíveis; ausência do plugin Product Design não é aprovação automática.

Achados UX ativos incluem `finding_id` único, `title`, `evidence`, `affected_feature`, `affected_flow`, `impact`, `severity`, prioridade `P0`–`P3`, `cause_hypothesis`, `recommendation`, `dependencies`, `acceptance_criteria`, `owner`, `required_tests` e `resolution_status`. Registre a hipótese como desconhecida quando a causa ainda não tiver sido investigada. O relatório mantém o plano de correção mesmo quando a entrega é aprovada com ressalvas. Após implementar, marque `awaiting_revalidation`; somente uma nova revisão independente que não reproduza o achado permite registrar `verified_resolved`. Código alterado sem reobservação não resolve o achado.

| Resultado | Condição |
|---|---|
| `approved` | Impacto direto/indireto, validação e revisão UX independente presentes; todos os sete critérios >= 4; nenhum achado. |
| `approved_with_remarks` | Revisão aprovada com achados médios/baixos estruturados, responsáveis e plano de correção; sem achado impeditivo. |
| `rejected` | Revisor exige alteração ou há achado blocker/critical/high. |
| `not_applicable` | Classificação explícita, sem conflito com arquivos/fluxos observados e com justificativa. |
| `blocked` | Classificação, evidência, revisão ou dependência necessária ausente/indisponível; não equivale a aprovação. |

A auditoria cobre as jornadas afetadas e as conexões relevantes com áreas existentes, em proporção ao risco e à abrangência. Em marcos de release, amplie a amostra para navegação, regressões e coerência entre módulos. Alterações críticas/altas não podem receber gate aprovado; qualquer exceção requer justificativa formal e autorização da governança competente quando admissível.

Cada evidência deve permitir localizar o artefato e entender a observação, por exemplo: captura do candidato e viewport, estado/jornada observado, relatório de interação, medição e seu ambiente. Um caminho de screenshot não significa que o revisor viu a imagem. O dispatcher textual precisa bloquear julgamento visual quando não tiver acesso efetivo às imagens ou ao protótipo. Não invente capturas, consultas, observações, métricas ou aceites.

Achados da revisão identificam jornada/estado, impacto, gravidade, evidência, correção esperada e o que precisa ser reobservado. O implementador refina; o revisor independente reavalia o candidato e as evidências correspondentes. Testes de componentes, Playwright/axe, screenshots e inspeção manual se complementam. Nenhum deles sozinho comprova usabilidade ou conformidade integral.


## Propostas de interface e padrão aprovado

Ao escolher uma tecnologia de frontend, o toolkit deve sugerir ao usuário uma interface moderna adequada ao contexto, apresentando uma proposta visual concreta (protótipo renderizado, telas ou imagens) e explicando suas decisões de UX/UI. Não basta listar frameworks ou descrever uma estética em texto.

O usuário pode pedir novas sugestões e variações até gostar de uma delas, sem limite artificial de alternativas de design. Aproveite o feedback e os fatos existentes, registre versões e o que mudou, sem tratar exploração de design como tentativas de correção do loop de implementação. O usuário também pode fornecer sua própria referência: site, imagem, PDF, protótipo ou design system. Nesse caso, esclareça quais elementos devem ser preservados/adaptados e use essa referência como base da proposta. Referências próprias/autorizadas podem definir a identidade do produto; não imponha a estética do gerador.

Enquanto nenhuma proposta for aceita, o design permanece draft. Após aceite humano efetivo, registre a proposta escolhida e o protótipo correspondente em design_reference: proposal_id, origin (toolkit ou user), revision, prototype_path e usage_rules. O protótipo escolhido deve estar em prototypes com seu hash. references admite URL HTTPS ou referência local do usuário com origin=user, path e sha256, sempre com accessed_at, analysis e application. Arquivos locais não precisam ser publicados na internet.

A referência aprovada passa a ser o padrão de interface do produto: novas telas, componentes, navegação, tipografia, cores, espaçamento, estados e responsividade devem seguir a direção e as regras registradas. A revisão UX deve comparar a implementação com esse padrão e apontar desvios; o template técnico não o substitui. Ajustes dentro do padrão não exigem escolher outro design; mudanças materiais de direção exigem nova proposta e novo aceite vinculado ao conteúdo/protótipos.

Após aprovação, explore alternativas em rascunhos/protótipos separados e preserve a versão e os artefatos aprovados. Pedir uma sugestão nova não revoga nem sobrescreve o padrão ativo. Só promova a substituição após novo aceite explícito, preservando o histórico sanitizado de versões e decisões. Não reaproveite o aceite antigo para trocar a referência.
