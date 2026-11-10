# Loop de engenharia da fábrica — validação de 2026-11-09

## Resultado do incremento

O toolkit agora possui um registro durável de tarefa em `qa-artifacts/loops`, com validação do contrato `task-run`, revisão esperada para transições, snapshot dos arquivos declarados, rechecagem de política/precheck e recuperação fail-closed de locks. A identidade `task_id` é idempotente: repetir a mesma delegação encontra o mesmo loop; reutilizar a identidade com delegação, fase ou provedor diferentes é rejeitado. A ação `implement_toolkit` está restrita a `platform-engineer` na fase `toolkit`. O gerador e a adoção passam a transportar o novo runtime e o contrato.

O loop não executa a implementação, não valida um candidato em cópia isolada, não integra pareceres do dispatcher ao registro e não pode promover a tarefa para `ready_for_delivery`. O evento disponível (`gate_checked`) apenas pede ao núcleo que refaça as verificações atuais. O schema aceita somente estados que o runtime pode produzir; estados de validação, revisão e entrega não são válidos. Este incremento, portanto, melhora persistência e retomada, mas ainda não implementa o ciclo completo de engenharia aprovado no plano. O registro local não é autenticado contra edição direta por um processo com escrita no workspace e não deve ser tratado como prova resistente a adulteração.

## Verificações observadas

- `npm test`: 87/87 testes passaram na base atualizada de `main`, incluindo Cursor, domínio, adoção e os 8 testes de `task-loop.mjs`.
- `npm run verify`: passou nos 24 critérios. Incluiu baseline, 87 testes, 8 avaliações locais, secret scan, build/ciclo da solução, testes/build/ciclo dos projetos Worker, API e Console gerados e consistência/build/ciclo das adoções API e Console. Um arquivo binário foi ignorado pela varredura.
- `npm run toolkit -- doctor`: Codex e Claude indisponíveis neste ambiente; Cursor suporta somente sessão nativa, sem dispatcher/automação de revisão. Autenticação e isolamento efetivo não foram verificados.
- `npm run toolkit -- eval --mode local`: 8/8 casos passaram. O resultado não comprova comportamento do modelo nem desenvolvimento ponta a ponta.
- Avaliação com modelo real não executada. O plano exige opt-in explícito; nenhuma chamada `--live` foi feita.

## Gaps para fechar o plano

1. Executar comandos de validação somente em candidato descartável com isolamento efetivo observado; bloquear se o ambiente não conseguir restringir rede, escrita e credenciais.
2. Registrar evidências de validação observadas e associar cada resultado ao digest do candidato, perfil e ambiente; impedir que o CLI aceite alegações de sucesso.
3. Integrar o dispatcher de revisão independente ao estado da tarefa, fixando digest do pacote/candidato, tipos obrigatórios, veredito e resolução de achados.
4. Implementar orçamento persistido, limite de correções, detecção de repetição sem progresso e reconciliação de ações interrompidas.
5. Criar evals determinísticas do ciclo completo e medições comparativas. Evals com modelo real continuam separadas e exigem autorização explícita.
6. Repetir a suíte integral e `npm run verify` após as correções; executar revisão independente antes de habilitar qualquer executor automático.

O executor automático permanece desabilitado. A disponibilidade do CLI Codex, sem autenticação e isolamento demonstrados, não satisfaz o gate de habilitação por provedor.
