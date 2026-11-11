# Do problema à primeira fase

Se você ainda está numa cópia do modelo (project.json com is_model=true), informe o nome do projeto e o problema para a fábrica. Ela entende o contexto e pesquisa [a decisão tecnológica](decisao-tecnologica.md) antes de seguir [a adoção guiada](adotar-projeto.md), sem exigir comandos ou edição manual de JSON. Se já é projeto real, leia o contexto existente e continue abaixo; não repita onboarding ou renomeação.

## 1. Descreva o problema

Abra o projeto no Codex, Claude Code ou Cursor e informe o problema em suas palavras. Exemplo de pedido:

> Quero iniciar a descoberta do negócio. Ainda não implemente funcionalidades. Ajude-me a descrever o problema, os usuários afetados, o funcionamento atual e o resultado esperado. Registre dúvidas sem inventar respostas.

A fábrica deve ler a governança, escolher business-analyst e organizar `references/business-context.json`. O arquivo começa vazio; você pode preenchê-lo diretamente ou construí-lo em conversa. Não inclua credenciais ou dados pessoais reais.

Problema é a situação que precisa mudar; tecnologia e funcionalidades são propostas posteriores. Identifique usuários/interessados, resultados, critérios de sucesso, escopo e exclusões. Regras, dados, restrições, integrações opcionais, dúvidas e hipóteses ficam explícitos. Dúvidas podem permanecer abertas se não impedirem a próxima fase.

```powershell
npm run toolkit -- precheck --phase discovery
```

Essa fase permite descobrir o contexto ainda incompleto. Não libera implementação funcional.

## 2. Valide o contexto e desenhe a solução

Depois de revisar o contexto com o responsável pelo produto, registre `scope_status: "defined"` em `references/project-state.json`. O `context_path` deve apontar para o JSON preenchido. Campos obrigatórios estão no contrato business-context. Execute:

```powershell
npm run toolkit -- precheck --phase design
```

Peça à fábrica alternativas de solução e um plano faseado. Tecnologias e apresentação devem seguir a decisão pesquisada, não o worker de exemplo. Alterar arquitetura materialmente requer decisão documentada e nova validação do contexto. Banco, autenticação, integrações e mensageria não são obrigatórios.

## 3. Registre o plano e o aceite humano

Copie os modelos business-plan.json e approval.json de `tools/IntegraTech.IA.Toolkit/fabrica/templates/` para `references/`. Preencha objetivo, escopo, entregáveis, critérios de aceite, validações e riscos. Calcule o hash do contexto e coloque em `context_sha256` do plano:

```powershell
npm run toolkit -- hash --file references/business-context.json
npm run toolkit -- hash --file references/business-plan.json
```

Após o responsável aprovar efetivamente o plano, registre o aceite em um arquivo local sanitizado, por exemplo `references/aceite-plano.md`. O JSON approval contém o responsável, data UTC, referência desse registro e hashes exatos do contexto e do plano. A fábrica não pode fabricar esse aceite.

No project-state.json, preencha `plan_path`, `approval_path` e `plan_gate: "approved"`. Execute:

```powershell
npm run toolkit -- precheck --phase business
```

O precheck verifica estrutura, documentos locais, preenchimento e hashes. Não autentica a identidade do aprovador nem substitui revisão humana. Qualquer mudança de bytes no contexto/plano invalida o vínculo; reveja o plano e o aceite antes de atualizar os hashes.

## 4. Implemente uma fase e valide

Delegue a fase aprovada com ownership, aceite e validações. A implementação usa os recursos nativos do provedor escolhido. Execute os testes necessários e obtenha revisão independente aplicável. Não apresente definição de agente ou resposta simulada como execução real.

## 5. Continue ou troque de provedor

Use o contrato handoff para registrar objetivo, fase, arquivos, testes, evidências, dúvidas e próximo passo. Valide o handoff com `resume`. Codex, Claude Code e Cursor consultam o mesmo núcleo; suas permissões e autenticação são próprias. Handoff não transfere autorização de merge, push, banco ou deploy.

Antes de materializar, complete o fluxo de [contexto pesquisado, especialista e otimização](especialista-dominio.md). Contexto incompleto ou consulta indisponível bloqueia. Em projeto existente, prepare o especialista sem readotar; toda funcionalidade deve registrar sua consulta antes de implementação.


Execução SDD: em produtos novos, use especificação funcional e desenho técnico vinculados ao contexto, plano business v2 com tarefas/dependências antes do aceite e os comandos sdd-plan, sdd-task, sdd-complete e sdd-status após aprovação. Consulte [SDD](sdd.md). Planos v1 são legados e não equivalem a esse fluxo; não migrar ou aprovar automaticamente.


Sistema legado externo: quando o usuário informar que o produto já existe, siga [sistemas existentes](sistemas-existentes.md). Solicite o local acessível se faltar, registre o vínculo externo e mantenha o fonte na origem e os registros na gestão separada. Não use adoção do modelo sobre esse sistema.


Publicação: após criar a solução, planeje distribuição com release-engineer e acompanhe os critérios de prontidão por ambiente. Entrega técnica não aprova produção. Consulte [publicação e prontidão](publicacao.md); somente o destino local de artefato tem automação neste incremento, com aceite específico.


Consulte [arquitetura contextual](arquitetura-contextual.md) para escolher o menor perfil adequado, registrar decisão/aceite e reavaliar evolução. Criação/adoção exigem `--architecture-file PATH`; planos SDD de produtos com arquitetura gerenciada exigem `architecture_sha256`. Migrações dependem de aprovação, fases, compatibilidade, recuperação e entrega validada antes de distribuição.


O system design é avaliado pelos riscos registrados na especificação; quando necessário, seu registro integrado cobre componentes, dados, integrações, falhas, segurança, observabilidade, validação e pontos de UX e fica coberto pelo aceite do plano. Consulte [system design](system-design.md).
