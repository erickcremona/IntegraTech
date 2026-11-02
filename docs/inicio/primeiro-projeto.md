# Do problema à primeira fase

Se você ainda está numa cópia do modelo (project.json com is_model=true), informe o nome do projeto e o problema para a fábrica. Ela segue [a adoção guiada](adotar-projeto.md), sem exigir comandos ou edição manual de JSON. Se já é projeto real, leia o contexto existente e continue abaixo; não repita onboarding ou renomeação.

## 1. Descreva o problema

Abra o projeto no Codex ou Claude Code e informe o problema em suas palavras. Exemplo de pedido:

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

Peça à fábrica alternativas de solução e um plano faseado. A apresentação escolhida na criação é um ponto de partida; alterar arquitetura materialmente requer decisão documentada. Banco, autenticação, integrações e mensageria não são obrigatórios.

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

Use o contrato handoff para registrar objetivo, fase, arquivos, testes, evidências, dúvidas e próximo passo. Valide o handoff com `resume`. Codex e Claude Code consultam o mesmo núcleo; suas permissões e autenticação são próprias. Handoff não transfere autorização de merge, push, banco ou deploy.
