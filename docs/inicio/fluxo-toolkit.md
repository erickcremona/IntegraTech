# Fluxo de uso do toolkit

Este guia acompanha o modelo e os projetos criados a partir dele. Você descreve o que precisa no Codex, Claude Code ou Cursor; o agente principal organiza o trabalho e usa o núcleo do toolkit para registrar contexto, decisões, tarefas e verificações. Você continua responsável por esclarecer dúvidas e aprovar decisões e entregas.

## 1. Abra sua cópia e apresente a ideia

Crie seu próprio repositório a partir do template ou baixe uma cópia. Configure Node.js >=22 para o toolkit e a ferramenta de IA escolhida com sua autenticação. Runtimes/SDKs do produto dependem da tecnologia que vier a ser aprovada. Abra a pasta do projeto. Para incluir os três conjuntos de adaptadores ao criar/adotar, peça `--provider all`; `both` inclui Codex e Claude, sem Cursor.

No primeiro uso, o agente executa `npm run toolkit -- doctor --quick`. O comando verifica runtime, ferramenta de pesquisa e presença das skills/agentes selecionados. Se faltar um arquivo de adaptador, fornece preview e comando `install` protegido contra sobrescrita de personalizações. O CTO pode usar a skill canônica diretamente ou trabalhar sem delegar enquanto o adaptador é recuperado; a ausência de um especialista não interrompe discovery ou tarefas independentes. `curl` ausente bloqueia apenas pesquisa externa até instalação; o agente deve seguir a regra de pesquisa indisponível e não inventar fontes.

Em demandas de produto, registre o impacto na experiência como direto, indireto, não aplicável ou desconhecido, com justificativa. UI alterada é direta; mudança backend/regra/dado que modifique uma jornada pode ser indireta. Aplique `evaluateUxGate`: desconhecido, evidência/revisão necessária indisponível ou dependência necessária sem alternativa executada resulta em bloqueado. Não aplicável precisa de justificativa e não pode contrariar mudanças de UI observadas. Achados recebem identificador, impacto, severidade, prioridade, responsável, solução, aceite e testes; após correção, a revisão independente verifica resolução antes do fechamento.

Exemplo de primeira mensagem:

> Meu projeto se chamará AgendaFacil. Quero resolver o problema de agendamentos feitos por mensagens, com horários duplicados e dificuldade para confirmar atendimentos. Ajude-me a entender o contexto e pesquise as tecnologias adequadas antes de implementar.

Informe, quando souber, quem usa, como trabalha hoje, o resultado esperado, restrições, dados e integrações. Não precisa escolher a arquitetura nem editar JSON manualmente: peça ao agente que prepare os registros a partir dos fatos informados. Evite credenciais e dados pessoais reais.

O toolkit aproveita o que já foi respondido e pergunta o que faltar. Se `project.json` indicar um projeto real, continua o contexto existente; não reinicia onboarding ou renomeação.

Após a adoção (`is_model=false`), avalie pelo contexto e pela decisão técnica a necessidade de Playwright, Supabase, Strix, SkillUI e Context7. Instale somente os que o escopo aprovado justificar, depois de conferir fontes oficiais, compatibilidade e permissões; registre os que forem adiados e qualquer bloqueio de instalação. Veja [adoção](adotar-projeto.md).

## 2. Entenda o contexto e escolha a base

O agente pesquisa referências externas via HTTPS, registra alternativas e recomenda tecnologias conforme o problema e as restrições. O levantamento também avalia plugins, skills, agents e ferramentas, vinculando cada indicação ao contexto, às alternativas, aos riscos e às fontes oficiais consultadas. Cada categoria pode concluir que nada adicional é necessário. O coletor confirma DNS público em Windows e Linux, valida os endereços antes da conexão, preserva TLS e grava SHA-256 para revalidação. Quando uma página muda, escolha uma publicação oficial equivalente, revise os achados e colete novo comprovante. Ele prepara um especialista de domínio, que deverá ser consultado antes do desenho de cada funcionalidade. Você recebe a decisão e as recomendações contextuais antes da materialização; nada é instalado por essa análise.

> Compare as alternativas para este contexto, explique a recomendação e mostre o que preciso decidir.

O toolkit não inclui uma stack ou scaffold de produto. Criação e adoção preservam as decisões pesquisadas e aprovadas e preparam os registros e a governança. Após a aprovação do plano do produto, a implementação segue a tecnologia escolhida e as capacidades observadas; .NET continua elegível quando o contexto justificar. Pesquisa essencial indisponível ou contexto insuficiente interrompem a materialização até resolução.

Na implementação e refatoração, a fábrica carrega a skill Ponytail para preferir a menor solução completa que cumpra o plano, reutilizando padrões e recursos nativos antes de adicionar abstrações/dependências. Ela complementa os especialistas: não retira escopo aprovado, testes, segurança, acessibilidade ou gates. A fábrica não instala hooks/plugins do Ponytail nem persiste modos globais.

Com a decisão aprovada, antes de criar ou adotar execute `npm run toolkit -- dependencies --provider <codex|claude|cursor|both|all>` e `npm run verify`; corrija falhas no modelo e repita até passar. A verificação mostra motivo, fonte oficial e comando sugerido para requisitos centrais ausentes/incompatíveis, sem instalar automaticamente; aguarde autorização explícita, instale e repita o diagnóstico. `verification_required` bloqueia criação/adoção até uma inspeção possível. A ausência de CLI Codex/Claude limita apenas o dispatcher de revisão independente; a sessão nativa continua disponível e a instalação da CLI é opcional. Durante a pesquisa contextual, plugins, skills, agents e ferramentas são avaliados com vínculo ao problema, às restrições e às fontes; recomendações não instalam componentes. Para produto com interface/jornadas, Product Design é candidato opcional e sua disponibilidade precisa ser verificada em cada superfície; não suponha compatibilidade entre ChatGPT/Codex, CLI, Claude Code ou Cursor. Criação e adoção exigem evidência vinculada por hash ao conteúdo verificado quando aplicável. O toolkit pode personalizar sua cópia na mesma pasta ou gerar em outra pasta vazia. Ambos os caminhos geram um relatório de prontidão e um relatório contextual de recomendações; apresente ambos ao usuário antes do trabalho do produto. Preserva customizações e apresenta conflitos; o repositório canônico continua reutilizável. Consulte [adoção](adotar-projeto.md), [decisão tecnológica](decisao-tecnologica.md) e [especialista de domínio](especialista-dominio.md).

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

Os perfis executam no sistema operacional da sessão de desenvolvimento usando comandos fixos, ambiente reduzido, cópia temporária e limites de tempo/saída. A execução tem as permissões do usuário local; o resultado registra `host_controlled` e isolamento `unverified`. Os testes originais são preservados como referência de regressão; novos critérios também precisam ser avaliados.

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

Para consultar a superfície CLI vigente, use `npm run toolkit -- help`; categorias de rota, ações de política e tipos de contrato são derivados das definições instaladas. `npm run check` confere adaptadores, papéis e todos os esquemas de contrato suportados.

## Como este guia acompanha a evolução

Mudanças no funcionamento, comandos, fases, provedores ou limites devem atualizar o README principal, este guia e os manuais afetados na mesma entrega. O README gerado aponta para este guia, que acompanha criação e adoção. A revisão deve conferir exemplos e links; ausência de impacto na documentação precisa ser justificada no relatório da mudança.

Projetos já criados não recebem atualizações silenciosas do modelo. Sua documentação deve evoluir junto com o toolkit instalado, preservando personalizações. O mapa mental do README do modelo também deve refletir mudanças materiais no fluxo.


Na etapa de UX/UI, peça uma sugestão visual moderna ou apresente sua referência. Você pode solicitar novas opções até gostar de uma. A opção aprovada vira o padrão de interface do produto; o toolkit deve segui-la nas próximas telas e preservar o padrão vigente enquanto explora alternativas ainda não aprovadas.


Execução SDD: em produtos novos, use especificação funcional e desenho técnico vinculados ao contexto, plano business v2 com tarefas/dependências antes do aceite e os comandos sdd-plan, sdd-task, sdd-complete e sdd-status após aprovação. Consulte [SDD](sdd.md). Planos v1 são legados e não equivalem a esse fluxo; não migrar ou aprovar automaticamente.


Sistema legado externo: quando o usuário informar que o produto já existe, siga [sistemas existentes](sistemas-existentes.md). Solicite o local acessível se faltar, registre o vínculo externo e mantenha o fonte na origem e os registros na gestão separada. Não use adoção do modelo sobre esse sistema.

Na manutenção de legado, finalizar a coerência preserva a entrega se apenas os metadados de encerramento mudarem. Candidatos com sinais de UI sem perfil aprovado são bloqueados até a classificação e preparação da interface; mudanças de backend sem esses sinais continuam pelo fluxo normal. Veja [sistemas existentes](sistemas-existentes.md).


Código e segurança são revisados em paralelo sobre o mesmo candidato, aguardando ambos os resultados; UX continua depois da aprovação dos dois. Análises independentes somente de leitura podem ser delegadas pelo CTO na sessão nativa, até duas por produto, com entradas fixadas e consolidação. Não há executor automático dessas análises. Implementação permanece sequencial. Recomendações devem explicar fundamentos, alternativas, custos e limites, inclusive quando for melhor simplificar, adiar ou não implementar.


Publicação: após criar a solução, planeje distribuição com release-engineer e acompanhe os critérios de prontidão por ambiente. Entrega técnica não aprova produção. Consulte [publicação e prontidão](publicacao.md); somente o destino local de artefato tem automação neste incremento, com aceite específico.


Design gráfico: rota graphic-design/visual-assets/motion-design aciona graphic-designer e a skill integratech-design-grafico para imagens e animações conforme as ferramentas disponíveis. Veja [guia de design gráfico](design-grafico.md).


Pedidos visuais são reconhecidos pela linguagem da conversa: “crie uma imagem”, “melhore o mapa mental” ou “anime este fluxo” acionam a skill de design gráfico e a coordenação de graphic-designer, sem o usuário precisar conhecer nomes técnicos. Revisões curtas usam o material anterior quando ele está definido; ambiguidades reais exigem esclarecimento. A triagem auxiliar route --request TEXT [--last-asset image|animation|diagram] usa regras limitadas; o CTO interpreta o contexto e não confunde criação de arte com implementação de upload/armazenamento de imagens. A chamada ao responsável ocorre na sessão nativa, conforme capacidades/permissões, sem automatizar publicação ou fingir geração.


Consulte [arquitetura contextual](arquitetura-contextual.md) para escolher o menor perfil adequado, registrar decisão/aceite e reavaliar evolução. Criação/adoção exigem `--architecture-file PATH`; planos SDD de produtos com arquitetura gerenciada exigem `architecture_sha256` e classificação N0–N4 por tarefa. N2+ chama revisão arquitetural independente; persistência inclui revisão de dados. Selecione fitness functions e ferramentas conforme a stack aprovada e preserve evidências no plano. Migrações dependem de aprovação, fases, compatibilidade, recuperação e entrega validada antes de distribuição.


O system design é avaliado pelos riscos registrados na especificação; quando necessário, seu registro integrado cobre componentes, dados, integrações, falhas, segurança, observabilidade, validação e pontos de UX e fica coberto pelo aceite do plano. Consulte [system design](system-design.md).
