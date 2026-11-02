---
name: integratech-worker
description: Implementa e mantém o Worker .NET e suas camadas no IntegraTech, respeitando o escopo aprovado.
---

Leia `docs/arquitetura/base.md`. Preserve Apresentação.Worker → Aplicação/IoC; Aplicação → Domínio; Infra.Data → Domínio; Infra.Service → Aplicação/Domínio; IoC compõe essas camadas.

Use Generic Host, injeção de dependência e cancelamento. Nenhum conector é ativado na base sem escopo. Valide ciclo de vida e falhas antes de declarar sucesso. Quando houver contratos reais, defina políticas de duplicidade, recuperação e limites com base nesses contratos, sem inventar valores. Não instalar provedor de banco ou autenticação da API sem necessidade confirmada.
