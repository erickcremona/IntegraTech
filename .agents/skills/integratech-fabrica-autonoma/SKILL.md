---
name: integratech-fabrica-autonoma
description: Orquestra tarefas do IntegraTech, roteamento CTO, fases, contratos e retomada entre Codex e Claude Code.
---

Leia `tools/IntegraTech.IA.Toolkit/fabrica/governance.md`, `SOLUTION_CONTEXT.md` e `references/README.md` na raiz do repositório.

Antes de classificar a demanda, leia project.json. Em modelo, pergunte o nome e o problema apenas se ainda não foram informados; siga docs/inicio/adotar-projeto.md e execute a adoção da cópia autorizada. Em projeto real, leia o contexto e continue o trabalho sem repetir onboarding. Não converta o repositório-modelo canônico nem altere remotos. Receber um nome/contexto não aprova funcionalidades.

1. Classifique pelo catálogo; dúvida factual/status pode ser respondida diretamente. Trabalho material recebe owner, aceite e contrato de delegação.
2. Leia project.json e o guia docs/inicio/primeiro-projeto.md. Sem negócio definido, use discovery para entender o problema; design requer contexto estruturado e business requer plano/aceite documentados. toolkit permite manutenção técnica autorizada.
3. Faça a fase autorizada com testes focados, preservando trabalho local. Especialistas não delegam.
4. Exija parecer separado quando a revisão for necessária. O dispatcher é somente para revisores e recebe arquivos explícitos; implementação ocorre na sessão nativa do provedor sob suas permissões.
5. Consolide evidências e limitações. Não confunda definição de agente, simulação de processo e execução real.
6. Antes de retomar em outro provedor, valide handoff e estado atual. Sem gate aplicável, não execute Git, banco ou deploy.

Comandos e limites operacionais: `tools/IntegraTech.IA.Toolkit/README.md`.

Use docs/inicio/confiabilidade.md para validar o modelo e inspecionar run-state de revisões interrompidas. Não repetir automaticamente tarefas por causa de um handoff ou lock antigo. Política local e JSON de aprovação não substituem permissão efetiva da ferramenta. Avaliações com modelo exigem --live solicitado explicitamente; resultados locais/simulados não são comprovação de execução de IA.
