# Loop de engenharia da fábrica — validação de 2026-11-09

## Resultado do incremento

O toolkit agora possui um registro durável de tarefa em `qa-artifacts/loops`, com validação do contrato `task-run`, revisão esperada para transições, snapshot dos arquivos declarados, rechecagem de política/precheck e recuperação fail-closed de locks. A identidade `task_id` é idempotente: repetir a mesma delegação encontra o mesmo loop; reutilizar a identidade com delegação, fase ou provedor diferentes é rejeitado. A ação `implement_toolkit` está restrita a `platform-engineer` na fase `toolkit`. O gerador e a adoção passam a transportar o novo runtime e o contrato.

O loop não executa a implementação, não valida um candidato em cópia isolada, não integra pareceres do dispatcher ao registro e não pode promover a tarefa para `ready_for_delivery`. O evento disponível (`gate_checked`) apenas pede ao núcleo que refaça as verificações atuais. O schema aceita somente estados que o runtime pode produzir; estados de validação, revisão e entrega não são válidos. `loop-recover` também remove lock órfão de criação apenas após confirmar que o PID terminou; sem estado persistido, remove a pasta parcial sem links para permitir nova tentativa. Este incremento, portanto, melhora persistência e retomada, mas ainda não implementa o ciclo completo de engenharia aprovado no plano. O registro local não é autenticado contra edição direta por um processo com escrita no workspace e não deve ser tratado como prova resistente a adulteração.

## Verificações observadas

- `npm test`: 90/90 testes passaram nesta revisão, incluindo 11 testes do task loop/política e validação de finais de linha Windows.
- `npm run verify`: passou nos 24 critérios. Incluiu baseline, 90 testes, 8 avaliações locais, secret scan, build/ciclo da solução, testes/build/ciclo dos projetos Worker, API e Console gerados e consistência/build/ciclo das adoções API e Console. Um arquivo binário foi ignorado pela varredura.
- Sessão Codex nativa: disponível nesta execução. `npm run toolkit -- doctor` consulta o executável CLI externo e não detecta a sessão Codex que está conduzindo este trabalho; o resultado anterior do diagnóstico não deve ser interpretado como indisponibilidade do Codex. Claude CLI não foi detectado. Cursor oferece sessão nativa, sem dispatcher/automação de revisão. Autenticação do executor e isolamento efetivo não foram verificados.
- `npm run toolkit -- eval --mode local`: 8/8 casos passaram. O resultado não comprova comportamento do modelo nem desenvolvimento ponta a ponta.
- Avaliação com modelo real não executada. O plano exige opt-in explícito; nenhuma chamada `--live` foi feita.

## Gaps para fechar o plano

1. Executar comandos de validação somente em candidato descartável com isolamento efetivo observado; bloquear se o ambiente não conseguir restringir rede, escrita e credenciais.
2. Registrar evidências de validação observadas e associar cada resultado ao digest do candidato, perfil e ambiente; impedir que o CLI aceite alegações de sucesso.
3. Integrar o dispatcher de revisão independente ao estado da tarefa, fixando digest do pacote/candidato, tipos obrigatórios, veredito e resolução de achados.
4. Implementar orçamento persistido, limite de correções, detecção de repetição sem progresso e reconciliação de ações interrompidas.
5. Criar evals determinísticas do ciclo completo e medições comparativas. Evals com modelo real continuam separadas e exigem autorização explícita.
6. Repetir a suíte integral e `npm run verify` após as correções; executar revisão independente antes de habilitar qualquer executor automático.

O executor automático permanece desabilitado. A sessão Codex disponível permite trabalho assistido nesta execução, mas não demonstra autenticação verificável pelo runtime, isolamento do candidato nem execução de validação confinada; esses controles continuam como gates separados para habilitação por provedor.

## Correções operacionais verificadas em 2026-11-09

- `loop-recover` remove lock de criação órfão somente após confirmar PID encerrado. Sem estado persistido, limpa apenas a pasta parcial sem links; com estado persistido, valida-o antes de liberar o lock. O teste cobre nova tentativa idempotente após recuperação.
- Se o lock estiver truncado ou inválido e não identificar PID confiável, a recuperação retorna `lock inválido` e preserva lock e pasta parcial. Não há limpeza automática sem prova de que o escritor terminou.
- `validateInstalled` compara conteúdo textual normalizando CRLF para LF. Um teste converte a regra Cursor para CRLF e confirma que Windows não relata deriva falsa; diferenças de conteúdo continuam sendo detectadas.
- O baseline do modelo foi revisado e regenerado: 170 arquivos controlados. `npm run toolkit -- validate --provider all` passou.
- `npm test`: 90/90. `npm run verify`: 24 critérios aprovados, incluindo 8 evals locais; os evals não comprovam comportamento do modelo nem loop ponta a ponta.
- Revisão independente: encontrou este caso de lock truncado e divergências no checklist. O fail-closed foi coberto por teste; a contagem e a sintaxe do CLI foram corrigidas.
- `coherence-run` foi tentado e bloqueou com `Especialista ausente`. O contexto de negócio do modelo permanece vazio e `project-state.json` mantém discovery pendente; não criei contexto ou pesquisa fictícios para satisfazer a verificação global.
