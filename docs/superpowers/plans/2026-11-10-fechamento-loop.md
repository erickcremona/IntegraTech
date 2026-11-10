# Fechamento do loop assistido

**Objetivo:** executar o plano de evolução de 2026-11-09 nos pontos solicitados pelo usuário: candidato, validação observada, revisão vinculada, correções limitadas e avaliações determinísticas.

**Desenho:** manter a sessão nativa como implementador. O núcleo aceita um candidato explícito após comparar o inventário completo com o ownership original; testes e pareceres pertencem ao mesmo digest. Usar perfis fixos e Bubblewrap Linux com ambiente vazio, candidato descartável e sem rede. Canários devem passar antes dos comandos do candidato. Ausência de isolamento retorna bloqueio, nunca execução no host como fallback. A automação de escrita permanece desabilitada.

**Decisões de execução:** aprovação do usuário refere-se aos pontos da auditoria e ao plano existente; não repetir aprovação. Implementação nativa seguida de revisão independente. Provedores/aplicativos ausentes e medições com modelos reais serão registrados como não demonstrados, sem fabricar resultados. Outras stacks requerem desenho próprio e não serão geradas como aproximação .NET.

## Tarefas
- [x] Inventário limitado, candidato e detecção de escrita fora do ownership; preservar retomada e invalidar evidências após mudanças.
- [x] Perfis versionados e validação descartável com canários de rede, filesystem, ambiente e acesso aos registros; persistir resultado sanitizado por digest.
- [x] Revisão pelo dispatcher, tipos fixados antes da execução, vínculo de digest e rejeição de parecer negativo/antigo.
- [x] Orçamento persistido, progresso, correções limitadas, reconciliação de interrupção sem replay.
- [x] CLI, testes determinísticos, geração/adoção, baseline e documentação/checklists.
- [x] Verificação integral e revisão independente; registrar limitações de ambiente e validação externa.

## Evidências e decisões

Revisão independente encontrou testes enfraquecidos, replay de revisão, recuperação sem prova dos descendentes, helpers em test/ e exclusão indevida de fontes Node em bin/. Corrigidos com regressões observadas em falha e sucesso. Testes originais são congelados antes da implementação e executados em processos separados; candidato acrescentado não substitui os oráculos. Revisão interrompida permanece bloqueada quando não há prova de término dos descendentes. Não criar mecanismo de desbloqueio baseado em alegação do chamador.

A mudança da skill foi precedida por teste de interpretação com instruções anteriores: faltavam comandos de candidato/validação/revisão e limites explícitos. Com a skill atualizada, um contexto novo aplicou o procedimento e bloqueou os cinco cenários indevidos. Isso não é avaliação real dos aplicativos/provedores.

Verificação final: npm run verify exit_code=0, 192 arquivos no baseline, oito evals locais, builds/ciclos da solução, dos três modelos gerados e das duas adoções aprovados. Varredura dos arquivos novos após staging aprovada. Limitações de isolamento real, Windows e aplicativos/provedores registradas no relatório, sem habilitar execução automática.
