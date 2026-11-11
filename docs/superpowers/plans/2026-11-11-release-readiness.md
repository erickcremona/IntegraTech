# Publicação e prontidão de distribuição

Autorização: implementar a recomendação aprovada na conversa. Node ESM, sem dependências adicionais.

1. Criar release-workflow.mjs e testes: draft privado por versão em qa-artifacts, métricas por critério bloqueador, vínculos com fonte/contexto/identidade/artefato e destino. Entrega observada do loop e conclusão SDD são obrigatórias; registros humanos de operação permanecem explicitamente distintos de execução automatizada.
2. Automação inicial: copiar artefato único para destino local aprovado, sem sobrescrita, sem executar shell, sem ativar serviço, sem efeitos no fonte. Reavaliar gates e hashes; reservar lock e registrar recibo. Homologação e produção exigem aceites distintos por estágio, manifest e artefato. Destinos externos não suportados mantêm orientação manual.
3. Agente release-engineer, skill, comandos release-init/check/deploy, seleção --project para sistemas anexados. Documentação, mapa, distribuição e adaptadores atualizados. Pesquisa e alternativas de destino segundo contexto, custos e operação; sem recomendar fornecedor por padrão.
4. Testes RED→GREEN, revisão independente, suíte completa, secret-scan e npm run verify; commit local sem push ou publicação.

Limites: métricas são critérios atendidos/aplicáveis, não percentuais de segurança. Campos preenchidos não autenticam humanos nem certificam operação; prontidão de produção requer evidência de homologação e inspeção dos responsáveis. Automação local comprova distribuição de bytes, não aplicação online. Não publicar o toolkit nem criar infraestrutura nesta implementação.
