---
name: integratech-worker
description: Use when implementing or maintaining an explicitly selected .NET Worker.
---

Leia `docs/arquitetura/base.md`, a decisão arquitetural indicada no estado e docs/inicio/arquitetura-contextual.md. Use também integratech-aplicacao para aplicar o perfil aprovado: simple-application mantém um host e DI local; modular-monolith respeita contratos e fachadas dos módulos; layered-monolith preserva Apresentação.Worker → Aplicação/IoC, Aplicação → Domínio e adaptadores em Infra. Worker define execução em background e não exige camadas. Para legado sem decisão, preserve a estrutura existente e encaminhe avaliação.

Use Generic Host, injeção de dependência e cancelamento. Nenhum conector é ativado na base sem escopo. Valide ciclo de vida e falhas antes de declarar sucesso. Quando houver contratos reais, defina políticas de duplicidade, recuperação e limites com base nesses contratos, sem inventar valores. Não instalar provedor de banco ou autenticação da API sem necessidade confirmada.
