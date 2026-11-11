# Paralelismo de revisão e recomendações fundamentadas

Código e segurança iniciam juntos sobre o mesmo candidato imutável. As duas reservas são persistidas antes dos envios; Promise.allSettled aguarda o par e preserva o lock mesmo após falha de um revisor. Cada resposta é validada com seu task_id, tipo, hash de candidato e pacote. Bloqueios prevalecem sobre correções e aprovações. UX só começa após aprovação de ambos. Orçamentos e proibição de repetição do candidato permanecem.

Análises/pesquisas independentes somente de leitura são coordenadas pelo CTO na sessão nativa, até duas por produto e com entradas fixadas. Não foi criado executor automático de analistas. Implementação continua sequencial por produto. A governança e as skills exigem fundamentos, alternativas, custos e limites, diferenciando fatos, hipóteses e referências; concordância automática não é justificativa. Essas instruções orientam os provedores, sem certificar que todo julgamento futuro será correto.

Os dois novos testes reproduziram falhas antes da implementação e passaram depois: início concorrente com barreira determinística, e espera pelo revisor restante após rejeição do par. Revisores são simulados; nenhum ganho real de latência/custo nem disponibilidade de serviço externo foi comprovado. As duas chamadas são consumidas mesmo quando uma identifica bloqueio, custo documentado.

Suíte completa: 246 testes passaram. npm run verify: exit 0, 24 verificações passaram, incluindo testes, avaliações locais, builds, ciclo de vida, geração e adoção. Adaptadores all e baseline válidos. Revisão independente não encontrou problemas importantes. README, mapa, guias e adaptadores de skills atualizados. Sem avaliações com modelos externos, push ou publicação nesta entrega.
