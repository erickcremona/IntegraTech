# Traceability Graph Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Rastrear impacto de requisitos até componentes, tarefas, testes e aceites.
**Architecture:** Grafo JSON referenciando documentos existentes; validação local e busca transitiva com visited. CLI expõe leitura sem efeitos externos.
**Tech Stack:** Node.js >=22 ESM, node:test, validador de contratos existente.
**Spec:** docs/superpowers/specs/2026-11-10-traceability-graph-design.md

## Global Constraints
Sem banco, dependências adicionais, execução de DAG ou alterações automáticas de aceites. Preservar gates, domínio/task-loop e arquivos locais. Esqueleto vazio não valida workflow nem herda contexto. Sem push/publicação automática.

## Review Focus
- Pointers inválidos/prototype e fontes ausentes não viram referências válidas.
- Escapes, links e fontes sensíveis não expõem conteúdo.
- Ciclos/diamantes não repetem nós nem a origem.
- Hash divergente bloqueia resultados de impacto confiáveis.
- Projeto descendente não herda relações/evidências.

### Task 1: Contrato e consultas
Files sob tools/IntegraTech.IA.Toolkit: scripts/lib/traceability-graph.mjs; fabrica/team/contracts/traceability-graph.schema.json; tests/graph.test.mjs.
Interfaces: validateGraph({repo,file}) e graphImpact({repo,file,id}) retornam relatórios JSON com status/errors/warnings e impacto.
- [x] Testar validação real com fontes/pointers/hashes; lacunas; vazio; ids/arestas inválidos; caminhos/links/sensíveis; ciclos e alcance transitivo/aprovações.
- [x] Rodar testes, observar RED; implementar e confirmar GREEN.

### Task 2: CLI e distribuição
Files: scripts/toolkit.mjs, lib/contracts.mjs, lib/project-generator.mjs, lib/installer.mjs; manifesto; references/traceability-graph.json; tests/graph.test.mjs.
- [x] Testar processo CLI real com graph validate/impact, erros exit 2 e geração/regeneração com esqueleto limpo.
- [x] Implementar subcomandos antes do parser de flags; registrar contrato e reset do grafo na geração/adoção.
- [x] Atualizar manifesto/baseline e rodar npm test.

### Task 3: Documentação e verificação
Files: docs/inicio/grafo-rastreabilidade.md, README, toolkit README, governança, verify-model.mjs.
- [x] Documentar formato, direção, comandos, warnings/limites e ligação com especialista/task-loop sem duplicar seus registros.
- [x] Rodar npm run check, npm run verify, git diff --check. Revisão independente final e correções necessárias com teste de regressão.
