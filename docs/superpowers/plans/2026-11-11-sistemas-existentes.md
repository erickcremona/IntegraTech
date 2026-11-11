# Sistemas existentes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox syntax for tracking.

**Goal:** Vincular sistemas externos e manter/evoluir seu fonte original com registros separados.
**Architecture:** Registro privado por sistema; resolver explícito de duas raízes integrado ao núcleo existente. Sem estado ativo global e sem cópia do fonte.
**Tech Stack:** Node.js >=22, ESM, testes node:test; sem dependências novas.
**Spec:** docs/superpowers/specs/2026-11-11-sistemas-existentes-design.md

## Global Constraints

- Fonte e toolkit permanecem separados; vínculo é somente leitura no sistema.
- Toda operação identifica o projeto; preservar gates, ownership, testes congelados e evidências.
- Sem publicar, push, migração de stack ou instalação de configurações no legado.

## Review Focus

- Destinos trocados/indisponíveis invalidam tarefas e não redirecionam escritas silenciosamente.
- Dois projetos com mesmo task ID não compartilham registros.
- Arquivos de contexto com nomes iguais aos do fonte não se confundem.
- Segredos, links e pastas operacionais não são importados no diagnóstico.
- Stack detectada sem executor compatível informa bloqueio, nunca aprovação fictícia.

### Task 1: Registro e resolução
**Files:** Create scripts/lib/project-locations.mjs e project-attachment.mjs no toolkit; tests/project-attachment.test.mjs.
**Interfaces:** sourceRoot(repo), sourceFile(repo,path), linkedProject(repo); attachProject({repo,id,source,name,context,provider,dryRun}), attachedProject({repo,id}), listAttachedProjects({repo}).
- [ ] Escrever e observar falha de testes de vínculo sem mutação, dry-run, múltiplos projetos, paths inválidos/links e binding editado.
- [ ] Implementar registro privado, diagnóstico bounded e entradas por produto.
- [ ] Rodar testes direcionados e registrar resultado.

### Task 2: Núcleo com duas raízes
**Files:** Modify candidate, task-loop, engineering-loop, dispatcher, runs, governance, sdd-plan/workflow/completion, domain-workflow, traceability-graph, interface-generator.
**Interfaces:** repo continua raiz de gestão; sourceRoot/sourceFile resolvem apenas código; context/evidence permanecem na gestão.
- [ ] Adaptar fixture SDD para gestão externa; observar falha antes da integração.
- [ ] Separar leitura de documentos/código, vincular fonte ao plano, resolver grafo source/, bloquear gerador UI legado e validações não suportadas.
- [ ] Rodar manutenção de duas tarefas, alteração de destino, revisão e snapshot; rodar suíte completa.

### Task 3: CLI, orientação e distribuição
**Files:** toolkit.mjs, installer, manifesto/baseline, README/mapa, guias e governança/skills de entrada.
**Interfaces:** attach-project --id --source, attached-projects, project-status --project; --project ID nos comandos existentes seleciona sua raiz de gestão.
- [ ] Testar perguntas de caminho ausente e seleção CLI sem gravar no sistema.
- [ ] Documentar fluxo legado e capacidades reais; sincronizar adaptadores e transporte.
- [ ] Rodar revisão independente, secret-scan, validação de adaptadores e npm run verify; commit local.
