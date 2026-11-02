---
name: integratech-planejamento
description: Descobre o problema de negócio, organiza o contexto e produz desenho e plano faseado antes da implementação.
---

Comece por `docs/inicio/primeiro-projeto.md` e `references/business-context.json`. Pergunte qual problema existe, quem é afetado, como funciona hoje, que resultado se espera e como medir sucesso. Registre escopo, exclusões, regras, dados, restrições, dúvidas e hipóteses explícitas. Integrações são opcionais.

Use discovery para contexto incompleto, design para contexto estruturado válido e business somente após plano e aceite documentados. Não presumir solução, banco ou transporte antes do problema. A fábrica propõe caminhos e pede decisão quando ela muda o produto.

O plano segue o contrato business-plan e contém o hash do contexto. O aceite segue approval, referencia hashes do contexto/plano e o registro humano. Use `toolkit hash --file PATH` para obter hashes; não fabricar aprovação nem alterar gates para contorná-la.
