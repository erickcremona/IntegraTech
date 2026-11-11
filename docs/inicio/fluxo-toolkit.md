# Fluxo de uso do toolkit

Este guia acompanha o modelo e os projetos criados a partir dele. Você descreve o que precisa no Codex, Claude Code ou Cursor; o agente principal organiza o trabalho e usa o núcleo do toolkit para registrar contexto, decisões, tarefas e verificações. Você continua responsável por esclarecer dúvidas e aprovar decisões e entregas.

## 1. Abra sua cópia e apresente a ideia

Crie seu próprio repositório a partir do template ou baixe uma cópia. Configure Node.js >=22, SDK .NET 8 e a ferramenta de IA escolhida com sua autenticação. Abra a pasta do projeto. Para incluir os três conjuntos de adaptadores ao criar/adotar, peça `--provider all`; `both` inclui Codex e Claude, sem Cursor.

Exemplo de primeira mensagem:

> Meu projeto se chamará AgendaFacil. Quero resolver o problema de agendamentos feitos por mensagens, com horários duplicados e dificuldade para confirmar atendimentos. Ajude-me a entender o contexto e pesquise as tecnologias adequadas antes de implementar.

Informe, quando souber, quem usa, como trabalha hoje, o resultado esperado, restrições, dados e integrações. Não precisa escolher a arquitetura nem editar JSON manualmente: peça ao agente que prepare os registros a partir dos fatos informados. Evite credenciais e dados pessoais reais.

O toolkit aproveita o que já foi respondido e pergunta o que faltar. Se `project.json` indicar um projeto real, continua o contexto existente; não reinicia onboarding ou renomeação.

## 2. Entenda o contexto e escolha a base

O agente pesquisa referências externas, registra alternativas e recomenda tecnologias conforme o problema e as restrições. Ele prepara um especialista de domínio, que deverá ser consultado antes do desenho de cada funcionalidade. Você recebe a decisão para revisão e aceite técnico.

> Compare as alternativas para este contexto, explique a recomendação e mostre o que preciso decidir.

Worker é opcional: permanece apenas para processamento em segundo plano justificado. Os geradores atuais materializam .NET Worker, API ou Console. Uma recomendação fora dessas stacks não é convertida em aproximação .NET; demanda um gerador próprio. Pesquisa essencial indisponível ou contexto insuficiente interrompem a materialização até resolução.

Com a decisão aprovada, o toolkit pode personalizar sua cópia na mesma pasta ou gerar em outra pasta vazia. Preserva customizações e apresenta conflitos; o repositório canônico continua reutilizável. Consulte [adoção](adotar-projeto.md), [decisão tecnológica](decisao-tecnologica.md) e [especialista de domínio](especialista-dominio.md).

Se houver interface, o agente registra plataforma/framework/versão e escolhas visuais separadamente do backend. Após o aceite técnico, prepara a especialização de UI; não instala dependências nem gera negócio nessa etapa. Perfis e capacidades são explícitos: orientação de uma stack não implica gerador disponível. Veja [interfaces conforme a tecnologia](interfaces.md).

## 3. Revise o plano antes de implementar

O contexto registrado serve de base ao desenho, às funcionalidades, às fases e aos critérios de aceite. O especialista é consultado por funcionalidade. Você deve conseguir entender o que será entregue, o que fica fora, como será validado e quais dúvidas permanecem.

> Prepare um plano por fases, com escopo, critérios de aceite, riscos e validações. Aguarde minha aprovação antes de implementar o negócio.

O aceite técnico da base não aprova funcionalidades. O agente registra o aceite humano efetivo do plano e verifica os documentos e hashes. Contexto ou plano alterados exigem reavaliação; o toolkit não fabrica aprovação.

## 4. Execute uma tarefa e acompanhe o resultado

> Implemente a primeira fase aprovada. Registre a tarefa e seus arquivos autorizados, mantenha o grafo e apresente testes, revisão e pendências.

O agente principal atua como CTO: encaminha análise, implementação, QA, revisão e rastreabilidade aos papéis adequados. A implementação ocorre na sessão nativa da ferramenta escolhida. O loop assistido registra o candidato e vincula testes e pareceres à mesma versão do código; não é um executor automático de implementação.

O grafo conecta relações explícitas entre contexto, requisitos, decisões, tarefas, componentes, testes, evidências e aceites. O agente de rastreabilidade sincroniza dados existentes e aponta vínculos que precisam de revisão. Relações ambíguas são propostas, não inventadas. Veja [grafo e impacto](grafo-rastreabilidade.md).

Peça status em linguagem comum:

> O que já foi concluído, o que falta e qual é o próximo passo? Mostre também os bloqueios e as aprovações necessárias.

## 5. Valide, revise e receba a entrega

A entrega deve indicar arquivos alterados, verificações executadas, resultados e limitações. No loop, `delivery_valid=true` é a confirmação atual; um status histórico não basta se o código ou as evidências mudaram. Revisões negativas exigem tratamento e nova validação. A conclusão inclui revisão global e os checks de coerência aplicáveis ao projeto real.

Testes isolados dependem de capacidade comprovada do ambiente. O executor disponível usa Linux/Bubblewrap; sem namespaces funcionando, a validação fica bloqueada. Não execute o mesmo perfil no host para contornar esse bloqueio. Os testes originais são preservados como referência de regressão; novos critérios também precisam ser avaliados.

O dispatcher automatiza revisões Codex/Claude sobre um pacote explícito autorizado, com provedores disponíveis e compatíveis. Cursor usa seus adaptadores e a sessão nativa; não possui dispatcher automatizado. Testes locais ou simulações não comprovam execução nos aplicativos externos. Consulte [loop assistido](loop-engenharia.md) e [confiabilidade](confiabilidade.md).

Receber uma entrega não publica o produto. Push, merge, deploy e alterações externas precisam de autorização aplicável. Exemplo de próximo pedido, após revisar o resultado:

> Envie as alterações validadas para a branch que combinamos.

## 6. Retome ou evolua o projeto

> Retome o projeto a partir dos registros existentes. Confira contexto, plano, tarefa, evidências e próximo passo antes de continuar.

Ao trocar de ferramenta, o agente prepara o handoff e revalida o snapshot. No loop, usa `loop-handoff`; o registro preserva evidências sem repetir ações. Uma revisão interrompida com descendentes possivelmente ativos permanece bloqueada para reconciliação; não apague locks ou registros para liberar tentativas.

Se o problema mudar, informe a mudança e peça análise de impacto antes da implementação. Contexto, pesquisa/especialista, decisão, plano, grafo e aceites são atualizados conforme o impacto, preservando o histórico necessário.

## Onde consultar o andamento

| Registro | Para que serve |
|---|---|
| `project.json` | Identidade, apresentação e indicação de modelo/projeto real |
| `references/business-context.json` | Problema, usuários, escopo, restrições e dúvidas |
| `references/domain-specialist.json` | Especialista de domínio e referências para consulta |
| `references/technology-decision.json` | Alternativas e decisão tecnológica, quando registrada |
| `references/project-state.json` | Fase, referências de plano e aceite |
| `references/traceability-graph.json` | Relações e análise de impacto dos itens registrados |
| `qa-artifacts/loops/` e `qa-artifacts/agents/` | Tarefas, resultados e pareceres locais; ignorados pelo Git |

O agente prepara os detalhes operacionais. Para operar diretamente, consulte o [manual do toolkit](../../tools/IntegraTech.IA.Toolkit/README.md), o [passo a passo de negócio](primeiro-projeto.md) e a [retomada](../../references/README.md).

## Como este guia acompanha a evolução

Mudanças no funcionamento, comandos, fases, provedores ou limites devem atualizar o README principal, este guia e os manuais afetados na mesma entrega. O README gerado aponta para este guia, que acompanha criação e adoção. A revisão deve conferir exemplos e links; ausência de impacto na documentação precisa ser justificada no relatório da mudança.

Projetos já criados não recebem atualizações silenciosas do modelo. Sua documentação deve evoluir junto com o toolkit instalado, preservando personalizações. O mapa mental do README do modelo também deve refletir mudanças materiais no fluxo.


Na etapa de UX/UI, peça uma sugestão visual moderna ou apresente sua referência. Você pode solicitar novas opções até gostar de uma. A opção aprovada vira o padrão de interface do produto; o toolkit deve segui-la nas próximas telas e preservar o padrão vigente enquanto explora alternativas ainda não aprovadas.


Execução SDD: em produtos novos, use especificação funcional e desenho técnico vinculados ao contexto, plano business v2 com tarefas/dependências antes do aceite e os comandos sdd-plan, sdd-task, sdd-complete e sdd-status após aprovação. Consulte [SDD](sdd.md). Planos v1 são legados e não equivalem a esse fluxo; não migrar ou aprovar automaticamente.


Sistema legado externo: quando o usuário informar que o produto já existe, siga [sistemas existentes](sistemas-existentes.md). Solicite o local acessível se faltar, registre o vínculo externo e mantenha o fonte na origem e os registros na gestão separada. Não use adoção do modelo sobre esse sistema.
