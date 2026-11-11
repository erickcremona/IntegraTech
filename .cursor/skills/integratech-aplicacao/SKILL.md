---
name: integratech-aplicacao
description: Implementa aplicações .NET em camadas a partir do problema e do plano aprovados, com apresentação Worker, API ou Console.
---

Leia project.json, SOLUTION_CONTEXT.md e docs/arquitetura/base.md. A apresentação inicial é uma escolha técnica, não define o negócio. Execute precheck business antes de implementar funcionalidades.

Se a decisão aprovada contiver interface, consulte ui-status e encaminhe o trabalho de UI a ui-engineer conforme o catálogo; preserve o backend e use a especialização registrada, sem escolher frontend por menção textual. Perfil ausente ou divergente bloqueia a implementação de interface.

Para apresentação Worker, carregue também a skill `integratech-worker`. Não a carregue para API ou Console.

Obtenha casos de uso, regras e aceite do contexto/plano. Mantenha Domínio independente, Aplicação responsável pela orquestração, adaptadores em Infra e composição no IoC. Não adicionar banco, autenticação, integração ou mensageria sem necessidade confirmada.

Valide a fase aprovada com testes relevantes e o ciclo do host. Para mudar apresentação ou arquitetura materialmente, documente a decisão e obtenha o aceite aplicável. Não confunda compilação com validação funcional.
