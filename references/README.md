# Retomada da fábrica

1. Leia project.json, SOLUTION_CONTEXT.md, project-state.json e business-context.json.
2. Sem contexto definido, use discovery e o guia docs/inicio/primeiro-projeto.md.
3. Para desenho, valide o contexto em design. Para implementar, exija plano/aceite e precheck business.
4. Para manter o toolkit, use toolkit. Essa fase não libera implementação de negócio.
5. Ao alternar Codex/Claude Code/Cursor, confira handoff, arquivos e autorização atuais.

Novos projetos não herdam resultados, contexto, evidências ou aprovações do modelo. Integrações, persistência e autenticação só entram quando necessárias ao problema.

Após `project.json` deixar de ser modelo (`is_model=false`), avalie se o contexto e a decisão aprovada justificam instalar Playwright, Supabase, Strix, SkillUI ou Context7. Instale somente os necessários; confira fonte oficial, compatibilidade e permissões e registre adiamentos ou bloqueios. Veja `docs/inicio/adotar-projeto.md`.

Rastreabilidade: mantenha traceability-graph.json como índice dos documentos existentes; consulte graph impact antes de mudar itens registrados e graph validate após atualizar vínculos. Índice vazio não valida cobertura nem autoriza tarefas. Veja docs/inicio/grafo-rastreabilidade.md.

Preenchimento: o agente traceability-maintainer usa graph sync --dry-run/graph sync. Revise needs_review e aprovações afetadas antes de reconhecer atualizações de fontes; inferências ficam em propostas separadas.

Orientação ao usuário: consulte README.md e docs/inicio/fluxo-toolkit.md para o fluxo completo, exemplos de pedidos, decisões e limites. Atualize esses materiais junto com mudanças no funcionamento do toolkit.

Interface: quando houver seleção estruturada aprovada, consulte references/interface-profile.json e ui-status antes de retomar; leia docs/inicio/interfaces.md. Não repetir geração sobre frontend personalizado nem converter diagnóstico local em aprovação isolada.
