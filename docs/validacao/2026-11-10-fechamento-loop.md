# Loop assistido — validação de 2026-11-10

## Implementação

O incremento fecha os vínculos locais de candidato, validação e revisão. Inventário identifica inclusões, alterações e exclusões fora do ownership; fontes Node em bin/ não são confundidas com outputs .NET. Fontes são somente leitura na cópia descartável. Testes originais e helpers de test/ ou tests/ são congelados antes da implementação, verificados por hash e sobrepostos somente dentro do candidato descartável. Node executa apenas entradas congeladas em processos separados, exige resumo terminal do reporter pai e recusa fallback de arquivo encerrado sem testes. .NET usa restore offline, build e harness original de arquitetura.

Validação fixa digest de candidato/perfil/oráculos, critérios e ambiente. Revisões de código e segurança fixam pacote, candidato, run_id e digest do parecer. Achados ou resultado negativo impedem entrega; alteração posterior de código, perfil, oráculo ou parecer invalida delivery_valid. Correções têm limite persistido de duas, validações de três e atividade total de 600 segundos. Cada tipo de revisão tem uma tentativa por candidato, persistida antes do despacho. Handoff explícito não reaplica ações.

Interrupção de validação reconcilia estado sem replay após comprovar término do escritor; o processo isolado usa --die-with-parent/namespace PID. Revisão externa interrompida preserva lock/estado: morte do orquestrador não comprova término dos descendentes. A reconciliação desse caso exige operador/ambiente; não há desbloqueio por alegação nem exclusão automática de registros.

## Verificação

A rodada final estabilizada de `npm run verify` terminou com código de saída 0. Passaram baseline (192 arquivos controlados), suíte completa do toolkit, validação dos três adaptadores, oito avaliações locais, varredura de padrões, build/ciclo da solução, testes/build/ciclo dos três projetos gerados (Worker/API/Console) e consistência/build/ciclo das adoções API/Console. A varredura incluiu todos os arquivos novos após staging: 227 textuais, um binário ignorado, nenhuma ocorrência. As regressões adicionais de test/ e bin/ também passaram individualmente. Uma rodada intermediária foi invalidada na adoção porque uma fixture mudou durante a revisão; a rodada final usou baseline regenerado e fontes estabilizadas.

Revisão independente inicial e revisão global final identificaram os casos acima; as correções foram reavaliadas sem achados Critical/Important restantes. Nenhum provedor externo foi acionado para emitir esses pareceres do dispatcher. O teste de interpretação da skill comparou instruções anteriores e atuais em contextos separados; verificou comandos de candidato, falha sem progresso, revisão já tentada, descendentes incertos e handoff Cursor. Não representa execução nos aplicativos reais.

## Matriz e limitações

| Capacidade | Evidência observada |
|---|---|
| Núcleo/CLI Node | Testes determinísticos com fixtures; simulações explicitamente identificadas |
| Isolamento Linux | Bubblewrap instalado; namespace falha com uid map em filesystem somente leitura. Validação real bloqueada; nenhum fallback no host |
| Codex CLI | 0.167.0-alpha.4, flags compatíveis; autenticação/modelo/isolamento do revisor não verificados |
| Claude CLI | Ausente neste ambiente |
| Cursor | Adaptadores consistentes; automação de revisão indisponível por projeto; aplicativo não validado |
| Windows | Adaptadores compartilhados; executor isolado não implementado e operação neste SO não demonstrada |
| .NET offline isolado | Perfil implementado; execução isolada real não demonstrada por bloqueio dos namespaces. Dependências externas indisponíveis não são buscadas |
| Pilotos de modelo/eficiência | Não executados; sem alegação de ganho, tokens ou custo |
| Coerência de negócio | coherence-run bloqueou por especialista ausente/contexto canônico vazio; precheck toolkit ready. Não inventar contexto para manutenção |

Os registros locais não são autenticados contra processos com escrita no workspace. Os oráculos protegem regressões contra enfraquecimento dos testes candidatos, mas não provam novos critérios de negócio ou a honestidade de programas arbitrariamente maliciosos. Implementação automática continua desabilitada. Pilotos reais exigem autorização explícita e ambiente capaz; validações de Claude/Cursor/Windows dependem dos respectivos aplicativos/ambientes. O grafo e o agente de rastreabilidade permanecem implementados; outras stacks não recebem geração aproximada.
