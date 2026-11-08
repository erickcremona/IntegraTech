# Validação: especialista de domínio e coerência final

Implementação do desenho aprovado em docs/superpowers/specs/2026-11-08-domain-specialist-design.md.

## Resultados observados

- `npm test`: 76 testes passaram, zero falhas ou skips no modelo.
- `npm run check`: adaptadores válidos.
- `eval --mode local`: 8 casos passaram; são avaliações determinísticas, não comprovam comportamento de modelos externos.
- `npm run verify`: passou baseline, suíte Node, consistência dos adaptadores, avaliações locais, varredura de padrões, build e ciclo de vida principal. Para worker/API/console gerados, passaram consistência, suíte Node própria, build e ciclo de vida. API/console adotados passaram consistência, build e ciclo de vida.
- Fontes reais consultadas com HTTPS/TLS habilitado: W3C WCAG Labels or Instructions (`https://raw.githubusercontent.com/w3c/wcag/main/guidelines/sc/20/labels-or-instructions.html`, 240 bytes) e documentação Microsoft Web API (`https://raw.githubusercontent.com/dotnet/AspNetCore.Docs/main/aspnetcore/web-api/index.md`, 69.594 bytes). Respostas HTTP 200 e SHA-256 registrados em preparação temporária, sem credenciais ou contexto privado.
- Smoke em projeto temporário: coleta e reconsulta real → criação API com todos os provedores → consulta do especialista registrada/validada → quatro verificações obrigatórias → relatório global → `coherence-check` e `coherence-status` ready, estado completed. Aprovação da fixture era explicitamente sintética; não representa aceite de negócio de um usuário.

## Revisão e regressões

Revisão independente encontrou criação parcial em falha de escrita, rollback que perdia edição concorrente e ausência de comprovante técnico verificável. Os três casos foram reproduzidos em testes que falharam antes das correções e passaram depois. A criação agora usa staging; atualização usa journal/recuperação com hashes e preserva conflitos. Teste de interrupção real de subprocesso comprovou recuperação explícita.

O smoke detectou também substituição global preexistente que transformava exemplos Worker de testes em Api/Console. A substituição de apresentação foi restrita aos artefatos pertinentes; `verify` passou a executar a suíte Node dos projetos gerados, evitando deixar essa inconsistência fora do CI.

O teste de instruções comparou os mesmos cenários antes/depois: urgência com seleção manual e internet indisponível, e desenho em projeto sem especialista. As instruções anteriores permitiam continuar; as novas orientações bloquearam os dois casos. Isso não é avaliação externa `--live` nem garantia de cumprimento por qualquer modelo.

## Decisões e limites

- Mantidas APIs síncronas com requisições curl limitadas para preservar geração/adoção existentes; a CLI aguarda cada consulta dentro dos limites documentados.
- Com proxy HTTPS gerenciado, DNS/política de destinos pertencem ao proxy; sem proxy, há verificação de DNS público local. Endereços privados literais e redirecionamentos indevidos são rejeitados. O transporte usa a confiança TLS herdada.
- Todas as referências técnicas da opção selecionada precisam constar da preparação como fontes obrigatórias com comprovantes e cobertura, além da pesquisa de domínio.
- Suficiência semântica, relevância das referências, leitura da skill e revisão/otimização funcional continuam sendo trabalho do agente. Contratos, hashes e comandos verificam integridade, acesso e consistência; não autenticam análise ou aprovação humana. O toolkit bloqueia ausência dos artefatos exigidos e inconsistências detectáveis.
- Nenhum gerador de nova stack, pesquisa paga obrigatória, avaliação de modelo externo, commit ou push foi executado. O modelo canônico continua modelo. Artefatos de execução temporários não são herdados por novos projetos.
