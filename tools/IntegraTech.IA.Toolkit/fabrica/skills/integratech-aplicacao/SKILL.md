---
name: integratech-aplicacao
description: Use when implementing an approved .NET application with Worker, API or Console presentation.
---

Leia project.json, SOLUTION_CONTEXT.md e docs/arquitetura/base.md. A apresentação inicial é uma escolha técnica, não define o negócio. Execute precheck business antes de implementar funcionalidades.

Carregue também a skill `ponytail` para aplicar engenharia enxuta: menor solução completa e segura, respeitando requisitos, arquitetura aprovada e validações do plano. Ela complementa esta skill; não reduz escopo aprovado nem remove controles.

Se a decisão aprovada contiver interface, consulte ui-status e encaminhe o trabalho de UI a ui-engineer conforme o catálogo; preserve o backend e use a especialização registrada, sem escolher frontend por menção textual. Perfil ausente ou divergente bloqueia a implementação de interface.

Para apresentação Worker, carregue também a skill `integratech-worker`. Não a carregue para API ou Console.

Obtenha casos de uso, regras e aceite do contexto/plano. Leia a decisão arquitetural indicada no estado e docs/inicio/arquitetura-contextual.md. Aplique o perfil aprovado:

| Perfil | Regra de implementação |
|---|---|
| simple-application | Um host/aplicação; DI no host. Organize regras em tipos internos conforme necessário, sem adicionar projetos Domínio/Aplicação/Infra/IoC por padrão. |
| modular-monolith | Módulos com contratos públicos, implementação interna e dependências somente nos contratos declarados. Composição pelas fachadas aprovadas. |
| layered-monolith | Domínio independente, Aplicação orquestra, adaptadores em Infra e composição no IoC. |
| Legado sem decisão gerenciada | Preserve e analise a estrutura existente; solicite avaliação antes de propor mudança material. |

O nome da apresentação não escolhe camadas. Mudança de perfil segue migração aprovada e SDD, nunca a reaplicação do gerador. Não adicionar banco, autenticação, integração ou mensageria sem necessidade confirmada.

Valide a fase aprovada com testes relevantes e o ciclo do host. Para mudar apresentação ou arquitetura materialmente, documente a decisão e obtenha o aceite aplicável. Não confunda compilação com validação funcional.
