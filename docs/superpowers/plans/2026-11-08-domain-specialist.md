# Domain Specialist Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Bloquear projetos sem contexto e pesquisa, gerar especialista de domínio e exigir coerência e consulta no desenho.

**Architecture:** Módulos Node independentes validam preparação, coletam evidência HTTPS e geram arquivos. Criação e adoção compartilham os gates; registros versionados vinculam contexto, skill, desenho e coerência por hashes. A pesquisa e análise de domínio são orientadas na sessão e verificadas pela CLI.

**Tech Stack:** Node.js >=22, módulos ESM, testes nativos Node, .NET 8 existente. Sem dependências adicionais.

**Spec:** docs/superpowers/specs/2026-11-08-domain-specialist-design.md (aprovado pelo usuário).

## Global Constraints

- Contexto incompleto ou impossibilidade de consulta devem bloquear a criação até a resolução.
- Criação e adoção usam os mesmos requisitos, inclusive quando a apresentação é selecionada manualmente.
- Não criar buscador comercial, agente autônomo ilimitado, novos geradores de stack nem integrações pagas obrigatórias.
- Não executar avaliações de modelos externos sem solicitação.
- Preservar trabalho local e proteção do modelo canônico.
- Não alegar que hashes comprovam compreensão semântica ou leitura humana.

## Review Focus

- Rede redirecionando para destino privado deve bloquear sem consultar o destino.
- Conteúdo de fonte alterado deve exigir revisão, sem atualizar síntese automaticamente.
- Criação manual e chamadas diretas não podem contornar os gates.
- Atualização de especialista não pode sobrescrever edição local silenciosamente.
- Relatório final antigo não pode concluir fluxo após mudança no repositório.

## Task 1: Contexto e preparação versionada

**Files:** criar `scripts/lib/domain-specialist.mjs`, `fabrica/team/contracts/domain-preparation.schema.json`, `fabrica/templates/domain-preparation.json`, `tests/domain.test.mjs`; modificar `scripts/lib/contracts.mjs`. Todos sob `tools/IntegraTech.IA.Toolkit/`.

**Interfaces:** `assessContext(context) -> {status, questions, context_sha256}`; `inspectPreparation({context, preparation}) -> {context_sha256, preparation_sha256}`; `specialistFiles({name, provider, context, preparation}) -> Map<string,string>`.

- [x] Escrever testes: campos essenciais ausentes retornam perguntas específicas; placeholders e perguntas críticas bloqueiam; síntese sem fonte e cobertura sem justificativa falham; contexto divergente invalida preparação.
- [x] Executar `node --test tools/IntegraTech.IA.Toolkit/tests/domain.test.mjs` e observar falha antes da implementação.
- [x] Implementar contrato e funções, com limites de documentos e referências, separando fatos de propostas.
- [x] Executar testes e confirmar aprovação.

## Task 2: Evidência HTTPS e revalidação

**Files:** criar `scripts/lib/domain-research.mjs`, `tests/domain-research.test.mjs`; modificar `scripts/toolkit.mjs`.

**Interfaces:** `collectResearch({preparation, context, request?}) -> Promise<preparation>`; `verifyResearch({preparation, context, request?}) -> Promise<void>`. Transporte padrão via curl com proxy/TLS herdados, HTTPS público, limites e redirecionamentos explicitamente verificados. Receipts incluem hash de conteúdo e URL final.

- [x] Testar HTTP inválido, resposta vazia, timeout, redirecionamento privado, mudança de conteúdo, evidência ausente e sucesso; transporte controlado sem internet em CI.
- [x] Executar e observar falhas; implementar transporte e validação.
- [x] Adicionar `research-collect --context-file --preparation-file --output` e `specialist-check --context-file --preparation-file`.
- [x] Verificar testes; executar uma consulta HTTPS real a documentação oficial sem contexto privado.

## Task 3: Gates e geração transacional

**Files:** modificar `scripts/lib/project-generator.mjs`, `scripts/lib/project-adoption.mjs`, `scripts/lib/installer.mjs`, `scripts/toolkit.mjs`, fixtures e testes de criação/adoção, `scripts/verify-model.mjs`, manifesto do modelo.

**Interfaces:** criação/adoção passam a ser assíncronas para revalidar acesso; argumentos `preparation` e `researchRequest` (injeção apenas em API para testes de transporte; nunca opção CLI para pular gates). Preparação/decisão/contexto são sempre obrigatórios e validados mesmo em dry-run. Geração em memória produz skill e adaptadores; estado registra caminhos e hashes.

- [x] Testar ausência de documentos e apresentação manual como desvio, funções diretas e CLI; nenhum arquivo de destino escrito.
- [x] Atualizar chamadas e fixtures para preparação válida e transporte local controlado explícito, preservando significado dos testes anteriores.
- [x] Implementar revalidação de fontes antes de qualquer escrita; não expor bypass de CLI nem variável de ambiente para ignorá-la.
- [x] Testar skill nos três provedores, ausência de herança, proteção canônica, recuperação da adoção e artefatos finais.
- [x] Adicionar `specialist-prepare --repo --preparation-file` para projetos existentes: validar/reconsultar, preparar todos arquivos, rejeitar conflitos locais e gravar transacionalmente.

## Task 4: Consulta por funcionalidade e coerência final

**Files:** criar `scripts/lib/domain-workflow.mjs`, contratos de consulta e coerência e `tests/domain-workflow.test.mjs`; modificar governança, CLI e estado gerado.

**Interfaces:** `inspectSpecialist(repo)`, `recordConsultation({repo, record})`, `inspectConsultation(repo, record)`, `inspectCoherence({repo, report})`. Precheck design exige especialista atual; business exige referência da consulta no plano. `coherence-check --repo --report-file` valida relatório vinculado a inventário do repositório, contexto e skill; conclusão é explícita e repetível.

- [x] Testar consulta ausente/divergente, contexto alterado, skill adulterada e adaptadores inconsistentes.
- [x] Testar relatório com verificações pendentes/falhas, contradições, arquivos alterados, arquivos novos, preservação de modificações locais e caso sem ajustes necessários.
- [x] Implementar inventário seguro que exclui .git, caches e o próprio relatório; exigir categorias de revisão e evidência de comandos concluídos.
- [x] Documentar simplificações com justificativa e limites; não executar exclusões ou refatorações arbitrárias.

## Task 5: Fluxo assistido, documentação e validação

**Files:** governança, skills de arquitetura/planejamento/fábrica, docs de início, README, `scripts/verify-model.mjs`, manifesto e baseline.

- [x] Atualizar orientação para descoberta → pesquisa → especialista → materialização → coerência; instruções claras de retomada em bloqueios e migração de projetos existentes.
- [x] Gerar adaptadores pelo mecanismo existente; atualizar baseline após revisão como manutenção explícita do modelo.
- [x] Executar `npm test`, `npm run check`, `npm run verify`, com SDK local ativado.
- [x] Fazer revisão independente do conjunto, corrigir achados e repetir verificações afetadas.
- [x] Entregar mudanças e evidências, distinguindo validação estrutural, testes simulados e acesso externo real. Commits/push não são necessários para esta entrega local.

## Método de execução

Execução nativa nesta sessão e revisão independente ao final. O desenho já foi aprovado e o usuário autorizou prosseguir; decisões de implementação deste plano seguem essa autorização.
