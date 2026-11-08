# Cursor Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Adicionar adaptação nativa Cursor preservando os provedores atuais.
**Architecture:** Seleção centralizada de ferramentas; installer renderiza arquivos a partir do núcleo; generator/adoption consomem a mesma seleção. Metadados de automação separados do suporte editor.
**Tech Stack:** Node.js >=22, ESM, node:test, Markdown/MDC; modelos .NET 8 existentes.
**Spec:** docs/superpowers/specs/2026-11-07-cursor-support-design.md

## Global Constraints
Sem dependências externas, publicação, credenciais ou alteração de arquivos personalizados. Preservar both=Codex+Claude e defaults existentes. Cursor CLI/SDK não executa revisões. Trabalhar no checkout cloud isolado existente, preservando as mudanças da evolução tecnológica anterior.

## Review Focus
- Adaptadores Cursor não vazam para codex/claude/both nem vice-versa.
- all não modifica o significado legado de both.
- Arquivos Cursor personalizados e links não são sobrescritos.
- Renomeação e adoção atualizam referências Cursor e preservam recuperação.
- Diagnóstico não alega execução real ou isolamento de Cursor não verificados.

### Task 1: Seleção e instalação
Files sob tools/IntegraTech.IA.Toolkit: scripts/lib/provider-selection.mjs (novo), installer.mjs; tests/cursor.test.mjs (novo).
Interfaces: selectedProviders(selection) -> nomes; providerLabel(selection) -> rótulo; providerFiles/expectedFiles/install/validateInstalled reutilizam seleção.
- [x] Escrever testes de matriz (cinco seleções), regra MDC, skills/perfis, defaults, idempotência, conflitos, diretórios personalizados e junctions.
- [x] Executar node --test tools/IntegraTech.IA.Toolkit/tests/cursor.test.mjs; confirmar RED por ausência de cursor/all.
- [x] Implementar seleção central e adapters .cursor, manifesto com provider e inferência de seleção na validação.
- [x] Executar testes direcionados; esperar GREEN.

### Task 2: Projeto e capacidades
Files: project-generator.mjs, project-adoption.mjs, providers.mjs, dispatcher.mjs, evaluations.mjs; toolkit.mjs; fabrica/providers/cursor.json; handoff.schema.json; wrapper PowerShell.
Interfaces: provider cursor|all em criação/adoção/instalação/validação; provider Cursor em handoff; diagnóstico unsupported e nenhum processo Cursor iniciado.
- [x] Escrever testes de geração/regeneração, adoção Cursor e recovery; CLI em processo real; handoff e bloqueio de dispatch/eval sem runner/probe.
- [x] Observar RED, implementar e executar testes até GREEN.
- [x] Rodar npm test, preservando comportamento dos dois provedores antigos.

### Task 3: Distribuição e verificação
Files: docs/inicio/cursor.md, READMEs, governança; manifesto/baseline; verify-model.mjs.
- [x] Documentar escolhas, entrada no Cursor, limites editor/CLI e referências oficiais pesquisadas.
- [x] Gerar adapters locais all com instalação protegida; atualizar manifesto e baseline como manutenção explícita.
- [x] Executar npm test, npm run check, npm run verify e git diff --check.
- [x] Revisão independente final e correções com testes; entregar alterações locais sem publicação.
