# Execução SDD faseada

Implementar especificação e desenho versionados, plano v2 com fases/dependências/tarefas e rastreabilidade de requisitos/cenários/testes. O plano aprovado é a autoridade; sua decomposição é determinística, sem executar strings de comandos.

Novos projetos exigem sdd-v2 no estado. Planos v1 existentes permanecem identificados como legados, sem alegação de SDD; migração exige documentos e novo aceite, nunca alteração silenciosa. Tarefas v2 ficam vinculadas ao plano e à decomposição; dependências exigem checkpoints de conclusão observada, sem reaplicar implementação. Conclusão de fase depende de todas suas tarefas. Mudança de especificação/desenho/plano invalida vínculos e aprovação anteriores.

- Contratos/validação de DAG e cobertura: módulo sdd-plan.
- Materialização de action-plan e delegações, controle de dependências e checkpoints: sdd-workflow/sdd-completion.
- Integração nos gates, loop, geração, grafo e CLI.
- Testes determinísticos, documentação/adaptadores/baseline e verificação completa.

Limites existentes de isolamento, autorização externa, autenticação de aceites e registros locais continuam aplicáveis. Checkpoint preserva o histórico aprovado de cada incremento; não confundir snapshot histórico de tarefa anterior com o código após incrementos posteriores.
