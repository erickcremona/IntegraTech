---
name: integratech-aplicacao
description: Implementa aplicações .NET em camadas a partir do problema e do plano aprovados, com apresentação Worker, API ou Console.
---

Leia project.json, SOLUTION_CONTEXT.md e docs/arquitetura/base.md. A apresentação inicial é uma escolha técnica, não define o negócio. Execute precheck business antes de implementar funcionalidades.

Obtenha casos de uso, regras e aceite do contexto/plano. Mantenha Domínio independente, Aplicação responsável pela orquestração, adaptadores em Infra e composição no IoC. Não adicionar banco, autenticação, integração ou mensageria sem necessidade confirmada.

Valide a fase aprovada com testes relevantes e o ciclo do host. Para mudar apresentação ou arquitetura materialmente, documente a decisão e obtenha o aceite aplicável. Não confunda compilação com validação funcional.
