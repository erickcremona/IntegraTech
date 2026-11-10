# Traceability Maintainer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Agente de rastreabilidade com preenchimento automático confiável e revisão de mudanças.
**Architecture:** Extrator de documentos + reconciliador com ownership e validação em memória; CLI/hook nativo; agente decide apenas ambiguidades. Sem banco/LLM embutido.
**Tech Stack:** Node.js >=22 ESM, node:test, JSON e adaptadores existentes.
**Spec:** docs/superpowers/specs/2026-11-10-traceability-maintainer-design.md

## Global Constraints
Preservar alterações anteriores e vínculos manuais. Não inventar aprovação/evidência. Fontes alteradas não recebem novos hashes sem reconhecimento explícito. Modelo não recebe grafo de negócio artificial. Sem push/publicação.

## Review Focus
- Reordenação e mudança de texto não reassociam requisitos diferentes.
- Ownership inválido/colisões e arestas manuais impedem perda de trabalho.
- Dry-run/erro não deixam escritas; locks/snapshots protegem concorrência.
- Sincronização não altera aceites nem invalida snapshots por feedback de estados operacionais.
- Geradores/adoção/adaptadores usam nomes/contexto novo, sem herança privada.

### Task 1: Extrator/reconciliador
- [x] Escrever graph-sync.test.mjs: contexto/decisão/plano/aceites, estabilidade, idempotência, dry-run, atualização/remoção reconhecida, conflitos, segurança e rollback de erro.
- [x] Observar RED. Implementar traceability-sync.mjs e traceability-sources.mjs; reutilizar leitura/validação de grafo com suporte a mapa em memória.
- [x] Confirmar GREEN sem regressões graph validate/impact.

### Task 2: Agente e integração
- [x] Testar CLI graph sync e geração automática, reset em descendentes e hooks de retomada sem writes no modelo.
- [x] Implementar CLI, integração em prepareProject e hooks; adicionar metadata de ownership ao schema.
- [x] Registrar traceability-maintainer/rota/skill, validar cenários antes/depois e gerar adaptadores a partir do núcleo.

### Task 3: Documentação e verificação
- [x] Atualizar guias/governança/manifesto/baseline, preservando campos manuais.
- [x] Rodar npm test, check, verify, diff --check e revisão independente; corrigir falhas com regressão.
