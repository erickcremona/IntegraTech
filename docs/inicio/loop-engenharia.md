# Loop assistido de engenharia

A implementação continua na sessão nativa de Codex, Claude ou Cursor. O núcleo registra um candidato, observa validação isolada e exige revisões de código e segurança antes de marcar `ready_for_delivery`. Isso não autoriza push, deploy ou aceite de negócio.

## Procedimento

1. Prepare a delegação com ownership de leitura/escrita e critérios verificáveis. Execute `loop-start --task delegation.json --phase toolkit --provider codex`. Use os mesmos argumentos em retomadas; identidade reaproveitada com outro conteúdo é rejeitada.
2. Execute `loop-advance --id ID --revision N --event gate_checked` nas revisões retornadas até `implementation_pending`. Os gates são observados pelo núcleo, nunca declarados como aprovação pelo chamador.
3. Implemente os arquivos autorizados na sessão nativa. Execute `loop-candidate --id ID --revision N --profile node-tests-v1` ou `dotnet-offline-v1`. O inventário identifica inclusões, modificações e exclusões; escrita fora do ownership original bloqueia. Registros legados sem inventário exigem nova tarefa.
4. Execute `loop-validate --id ID --revision N`. Os comandos do perfil são fixos, sem shell fornecido pela delegação. O executor prepara uma cópia temporária do inventário e limita ambiente herdado, saída e tempo. O processo roda com as permissões do usuário atual: pode acessar arquivos e rede permitidos ao usuário. O registro usa `execution_mode=host_controlled` e `isolation=unverified`; isso não comprova isolamento do sistema operacional. O perfil Node executa entradas de teste originais congeladas antes da implementação. Mudanças nos testes candidatos não substituem os oráculos. O perfil .NET restaura a partir de uma fonte vazia, compila e executa o harness congelado. Uma migração aprovada pode alterar exclusivamente o oráculo estrutural de scaffold conhecido, com hashes e tarefa explícitos conforme [arquitetura contextual](arquitetura-contextual.md); os demais testes originais permanecem congelados. Dependências externas ausentes bloqueiam/falham.
5. Com `review_pending`, execute `loop-review --id ID --revision N [--files src/a.mjs,tests/a.test.mjs]`. O pacote deve cobrir todas as alterações, inclusive exclusões, respeitar ownership e limites do dispatcher (1–80 arquivos textuais permitidos). Por padrão inclui as alterações. Acrescente contexto suficiente para revisão; se insuficiente, o revisor deve bloquear. O comando chama provedores externos e exige autorização aplicável ao envio do pacote. Cursor não possui dispatcher automatizado.
6. `loop-status --id ID` recalcula `delivery_valid`. Código, perfil, oráculos ou artefatos divergentes invalidam a entrega; `effective_status=stale` distingue o registro histórico da situação atual. `ready_for_delivery` exige validação observada e ambos os pareceres `approved` sem achados. Aceites de risco não são inferidos.

Todos os comandos aceitam `--repo PATH`. Use a revisão retornada por cada comando; operações longas registram início e término em revisões separadas.

## Falhas, orçamento e retomada

Falha de teste ou revisão negativa gera `correction_pending`. Corrija o candidato e repita `loop-candidate`; o mesmo digest ou um digest já tentado é recusado. Há no máximo três validações, duas correções e 600 segundos de atividade de validação/revisão por tarefa. Tempo humano de implementação não é somado como consumo de subprocesso. A validação local controlada não equivale a sandbox nem impede acesso a arquivos/rede permitidos ao usuário atual.

Cada tipo de revisão tem uma única tentativa por candidato, registrada antes do despacho. `review_blocked` não permite repetir o mesmo envio, mesmo que outro parecer já tenha aprovado. Uma nova revisão exige candidato diferente dentro do orçamento e autorização vigente. Os registros não são apagados para zerar orçamento.

Use `loop-handoff --id ID --revision N --provider cursor` (ou codex/claude) para troca explícita de provedor com snapshot atual. O comando preserva evidências e não reaplica ações. Não habilita dispatcher Cursor.

`loop-recover --id ID` comprova encerramento do escritor antes de reconciliar criação/validação interrompidas. Em revisão externa interrompida, a morte do orquestrador não comprova término dos descendentes: o lock e o estado permanecem bloqueados para reconciliação pelo operador/ambiente. Não remover locks, editar registros ou iniciar nova tentativa enquanto o processo anterior puder continuar ativo.

## Capacidades e limites

O executor acompanha o sistema operacional ativo da sessão de desenvolvimento. Ele usa comandos fixos, ambiente reduzido, cópia temporária, limite de saída e prazo, mas executa sob as permissões locais do usuário; relatórios não alegam isolamento. O SDK .NET deve estar instalado em local suportado, sem links ou arquivos de credenciais na árvore verificada.

Os testes determinísticos usam fixtures e dependências simuladas identificadas como tal. Comprovam transições e bloqueios, não autenticação nem qualidade de modelos externos. Pilotos reais, validação nos aplicativos Cursor/Claude/Windows e medições comparativas de eficiência continuam separados. Não executar avaliações `--live` sem solicitação explícita. O executor automático de implementação permanece desabilitado.

Os registros em `qa-artifacts/loops` são locais, ignorados pelo Git e não autenticados contra quem pode escrever no workspace. Oráculos congelados protegem regressões contra enfraquecimento dos testes do candidato; não comprovam sozinhos novos critérios de negócio nem a honestidade de um programa arbitrariamente malicioso. Revisão independente e aceites aplicáveis continuam necessários. Não há banco, credenciais ou publicações herdados.


Código e segurança são revisados em paralelo sobre o mesmo candidato, aguardando ambos os resultados; UX continua depois da aprovação dos dois. Análises independentes somente de leitura podem ser delegadas pelo CTO na sessão nativa, até duas por produto, com entradas fixadas e consolidação. Não há executor automático dessas análises. Implementação permanece sequencial. Recomendações devem explicar fundamentos, alternativas, custos e limites, inclusive quando for melhor simplificar, adiar ou não implementar.

Troca de custo/tempo: as duas revisões são iniciadas, mesmo se uma delas identificar bloqueio. Isso pode consumir mais chamadas que o fluxo sequencial que interrompia antes da segunda. O limite é de dois revisores simultâneos; ambas as respostas são consolidadas e a revisão UX só começa quando o par aprova. Os testes de concorrência verificam o protocolo com revisores simulados, não demonstram ganho real de latência/custo de provedores.
