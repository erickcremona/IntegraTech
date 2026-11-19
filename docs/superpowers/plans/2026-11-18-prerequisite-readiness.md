# Pré-requisitos sem bloqueio da fábrica Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Detectar pré-requisitos locais ausentes e impedir que skills/agentes ausentes parem o trabalho que pode continuar com capacidades disponíveis.

**Architecture:** Criar diagnóstico local puro em módulo separado, expor `doctor --quick --repo` e preservar diagnóstico existente de CLIs no modo completo. Adaptadores são reparados pelo instalador protegido; instruções da fábrica usam fonte canônica/fallback sem auto-instalação.

**Tech Stack:** Node.js >=22, módulos nativos, node:test.

**Spec:** `docs/superpowers/specs/2026-11-18-prerequisite-readiness-design.md`

## Global Constraints

- Node.js mínimo: 22.
- Não instalar ferramentas globais nem autenticar provedores.
- Não sobrescrever arquivos de adaptadores personalizados.
- Ausência de agente/skill não deve bloquear tarefas independentes ou fallback seguro.

## Review Focus

- Provedor configurado inválido ou incompleto deve receber diagnóstico acionável, sem falso `ready`.
- CLI ausente não deve ser confundida com sessão nativa indisponível.
- `curl` ausente bloqueia pesquisa externa, não discovery ou manutenção independente.
- Arquivo customizado nunca deve ser sobrescrito pela sugestão de reparo.

---

### Task 1: Diagnóstico local e CLI

**Files:** `scripts/lib/environment-readiness.mjs`, `scripts/toolkit.mjs`, `tests/environment-readiness.test.mjs`.

- [ ] Escrever testes de runtime, curl, fontes de skills, adaptadores/agents por provedor e fallback.
- [ ] Executar os testes e confirmar falha esperada antes da implementação.
- [ ] Implementar `diagnoseLocalSetup({repo, nodeVersion, runner})` com estado ready/degraded, checagens e próximos passos.
- [ ] Expor `doctor --quick [--repo PATH]`; modo completo acrescenta diagnóstico de CLIs existentes.
- [ ] Reexecutar teste focado e suíte completa.

### Task 2: Entrada, fallback e orientação

**Files:** `scripts/lib/installer.mjs`, adaptadores gerados, `fabrica/governance.md`, `docs/inicio/fluxo-toolkit.md`, `docs/inicio/confiabilidade.md`, READMEs.

- [ ] Atualizar instruções de entrada para executar doctor rápido no início, continuar com skill canônica/CTO quando possível e orientar `install --dry-run` para restaurar adaptadores.
- [ ] Regenerar os adaptadores por meio do instalador protegido.
- [ ] Atualizar guias e validar baseline/adaptadores.
- [ ] Rodar `npm test`, `npm run check`, `npm run verify` e `git diff --check`.
