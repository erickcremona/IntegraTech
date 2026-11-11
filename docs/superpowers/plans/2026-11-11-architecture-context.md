# Architecture context Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development ou executing-plans. Execução sequencial por componente; revisões podem ocorrer somente de leitura.

**Goal:** Escolher arquitetura contextual, gerar perfis verdadeiros e apoiar migração arquitetural SDD aprovada.
**Architecture:** Perfis independentes em architecture-profiles.mjs; decisões/sinais e checagem em módulos architecture-*; integração com geração, precheck, SDD e entradas nativas. Estado/recibos de execução separados de código.
**Tech Stack:** Node ESM >=22, .NET 8 já disponível; sem novo serviço externo.
**Spec:** docs/superpowers/specs/2026-11-11-architecture-context.md

## Global Constraints

- Canonical toolkit não é adotado; nenhum push/deploy ou migração real nesta tarefa.
- Não gerar perfil incompatível por aproximação, não inventar requisitos nem aprovação.
- Implementação sequencial; agentes revisores somente leitura.

## Review Focus

- Decisões/aceites obsoletos após mudanças de contexto/tecnologia/fonte-base.
- Recomendação de complexidade sem sinais verificáveis e capacidade operacional.
- Gerador simples/modular efetivamente compila, sem projetos ausentes ou fontes herdadas privadas.
- Migração nunca marca alvo concluído por preencher JSON; requer loop/SDD e código verificado.
- Compatibilidade de projetos existentes e separação das raízes anexadas.

### Task 1 — Perfis gerados
**Files:** scripts/lib/architecture-profiles.mjs; tests/architecture-profiles.test.mjs.
**Interface:** architectureFiles({name,presentation,profile,modules}) retorna Map de solução, src, testes e documentação de arquitetura. profile = simple-application | modular-monolith | layered-monolith; modules [{name,depends_on}]. Sem copiar fonte de produto existente. Testar RED→GREEN e builds/lifecycle das variantes.

### Task 2 — Decisão e avaliação
**Files:** scripts/lib/architecture-workflow.mjs, architecture-inspection.mjs; contratos/templates/tests correspondentes.
**Interfaces:** assessArchitecture({context,requirements}); inspectArchitectureDecision({repo,context,technologyDecision,decision,requireApproval}); architectureStatus({repo}); completeArchitecture({repo}); generator seleciona perfil aprovado.
Escrever testes de contexto/sinais, hashes, falta de aceite, módulos/ciclos, mudança de perfil e decisões obsoletas antes do código.

### Task 3 — Fluxo integrado
**Files:** project-generator/adoption, governance, sdd-plan/workflow, engenharia e CLI; fixtures sintéticas atualizadas.
Integrar aprovação na geração, vínculo por hash nos planos, evolução pelo loop existente e conclusão por SDD+verificação observada. Exercitar produto novo, legado e duas fases com falhas/rollback explicitados.

### Task 4 — Orientação e distribuição
Agentes de avaliação/implementação, skills, docs/README/mapa, manifesto/adaptadores/baseline. Revisão independente; npm test e npm run verify; commit local.
