# Contextual Technology Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Escolher tecnologias pelo contexto antes de materializar modelos opcionais.
**Architecture:** Decisão validada independente dos modelos; geração recebe seleção explícita. Adoção usa transação existente para limpeza e recuperação.
**Tech Stack:** Node.js >=22, ESM, node:test; modelos .NET 8.
**Spec:** docs/superpowers/specs/2026-11-07-contextual-technology-design.md

## Global Constraints
Preservar arquivos do desenvolvedor, remotos e proteção canônica. Não instalar dependências externas. Não publicar. Nenhuma seleção automática de stack por palavras-chave. Gerar somente .NET worker/api/console validados.

## Review Focus
- Contexto alterado invalida recomendação anterior.
- Pesquisa indisponível não se apresenta como consulta realizada.
- Stack sem gerador nunca cai silenciosamente no worker.
- Worker modificado impede limpeza e preserva todo o estado.
- Projetos descendentes não herdam decisões ou aceites.

### Task 1: Decisão independente
Files: scripts/lib/technology-decision.mjs, fabrica/team/contracts/technology-decision.schema.json, tests/technology.test.mjs (sob tools/IntegraTech.IA.Toolkit).
Interfaces: technologyContextHash(context), inspectTechnologyDecision({decision,context,repo,requireApproval}), selectionForGeneration(args).
- [x] Escrever testes para decisão válida, contexto divergente, fontes indisponíveis/inválidas, aceite ausente e stack não suportada.
- [x] Executar node --test tools/IntegraTech.IA.Toolkit/tests/technology.test.mjs; observar falhas.
- [x] Implementar contrato, normalização compartilhada do contexto e validação sem rede/efeitos externos.
- [x] Executar testes; esperar todos passarem.

### Task 2: Geração e adoção
Files: scripts/lib/project-generator.mjs, project-adoption.mjs; scripts/toolkit.mjs; tests/generator.test.mjs, adoption.test.mjs, cli.test.mjs.
Interfaces: createProject/adoptProject recebem technologyDecision/context/presentation; CLI technology-check --context-file --decision-file; --technology-file em geração/adoção.
- [x] Testar ausência de default, decisão aplicada persistida sem herança, worker→api/console, conflitos e restauração.
- [x] Observar falhas antes das alterações.
- [x] Aplicar seleção antes de escrita; reaproveitar transação de adoção; CLI com leitura sanitizada.
- [x] Rodar npm test e corrigir regressões; verificar arquivos .sln/csproj e hosts gerados.

### Task 3: Fluxo da fábrica e verificação
Files: governança, skills canônicas/adaptadores, docs de adoção/início, README, manifesto e baseline; scripts/verify-model.mjs.
- [x] Documentar descoberta, pesquisa, decisão, aprovação, seleção e limpeza segura, com fontes da pesquisa anterior.
- [x] Atualizar manifesto e regenerar adaptadores/baseline como manutenção explícita do modelo.
- [x] Executar npm test, npm run check, npm run verify, git diff --check.
- [x] Revisão final independente focada no contrato e proteção dos arquivos. Entregar diff sem push/publicação.
