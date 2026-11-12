# Toolkit Neutro Quanto à Tecnologia Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remover o produto de exemplo .NET do modelo e deixar criação, adoção e validação do toolkit sem stack de produto predeterminada.

**Architecture:** O toolkit continua em Node.js. Criação/adoção materializa o núcleo, contexto, decisões pesquisadas/aprovadas, governança e relatório de prontidão, sem gerar código de produto. Arquitetura e validação do toolkit registram capacidades; não convertem stack nem simulam build de produto.

**Tech Stack:** Node.js >=22, npm, contratos JSON, testes `node:test`; runtimes de produto não são dependências do `npm run verify`.

**Spec:** `docs/superpowers/specs/2026-11-12-toolkit-neutro-stack-design.md`

## Global Constraints

- Preservar a implementação do toolkit em Node.js e as alterações locais do coletor de pesquisa.
- A decisão de tecnologia permanece pesquisada, vinculada ao hash do contexto e aprovada antes da criação/adoção.
- Criação/adoção não gera código, dependências, estrutura ou instruções de produto específicas de uma stack.
- Nunca substituir a stack escolhida por outra para satisfazer um gerador ou validador.
- A verificação do toolkit não exige SDK .NET nem apresenta verificações de produto não executadas.
- Não atualizar projetos reais existentes automaticamente; manter o manifesto e os limites de adoção atuais.

## Review Focus

- Decisão aprovada não .NET passa por `technology-check` e criação sem `generator_supported` falso-negativo, sem scaffold ou instruções .NET.
- Criação/adoção mantém hash, fontes e aprovação vinculados, sem aceitar ausência de decisão por uma apresentação manual.
- Adoção remove arquivos de exemplo controlados do modelo, preservando arquivo local desconhecido ou personalizado.
- `npm run verify` passa sem invocar `dotnet` e ainda testa criação, adoção e contratos.
- Perfis opcionais de validação do produto não viram requisito global nem liberam resultado quando não executados.

---

### Task 1: Tornar decisões e materialização independentes da stack

**Files:**
- Modify: `tools/IntegraTech.IA.Toolkit/scripts/lib/technology-decision.mjs`
- Modify: `tools/IntegraTech.IA.Toolkit/scripts/lib/project-generator.mjs`
- Modify: `tools/IntegraTech.IA.Toolkit/scripts/lib/project-adoption.mjs`
- Modify: `tools/IntegraTech.IA.Toolkit/scripts/lib/product-entry.mjs`
- Modify: `tools/IntegraTech.IA.Toolkit/scripts/toolkit.mjs`
- Modify: `tools/IntegraTech.IA.Toolkit/scripts/lib/governance.mjs`
- Modify: `tools/IntegraTech.IA.Toolkit/fabrica/team/contracts/technology-decision.schema.json`
- Test: `tools/IntegraTech.IA.Toolkit/tests/technology.test.mjs`
- Test: `tools/IntegraTech.IA.Toolkit/tests/generator.test.mjs`
- Test: `tools/IntegraTech.IA.Toolkit/tests/adoption.test.mjs`

**Interfaces:**
- Keep `inspectTechnologyDecision({ decision, context, repo, requireApproval })` returning selected option, approval status and context hash; remove generator availability as a gate.
- `prepareProject(...)` consumes the approved technology and architecture decisions and returns a map containing toolkit/product records only.
- CLI `create-project` and `adopt-project` keep research/decision/approval inputs; remove `--presentation`, `presentation` from generated `project.json`, and the Worker/API/Console enum. Keep an optional contextual presentation description in technology alternatives as free text, without a default.

- [ ] **Step 1: Add failing regressions** named `decision aceita apresentação contextual sem catálogo de hosts`, `criação neutra preserva a stack aprovada sem scaffold` and `adoção neutra remove exemplo controlado e preserva arquivos desconhecidos`. Assert approved decision fields remain equivalent, an unrecognized contextual presentation string validates, generated `project.json` has no presentation default, no `.sln`, `.csproj` or `dotnet` instructions are emitted, and unknown files survive adoption.
- [ ] **Step 2: Run the focused tests** with `node --test --test-isolation=none` on the three test files. Confirm the new cases fail against current generator/presentation requirements.
- [ ] **Step 3: Remove presentation/generator gates** from decision inspection, CLI usage/options, governance, generator/adoption and generated product documents. Materialization requires approved researched decisions but does not require a built-in stack generator.
- [ ] **Step 4: Run focused tests** and confirm existing source-preservation, adoption-recovery and approval-binding regressions still pass.

### Task 2: Remove architecture-specific product scaffolds

**Files:**
- Delete: `tools/IntegraTech.IA.Toolkit/scripts/lib/presentation-templates.mjs`
- Delete: `tools/IntegraTech.IA.Toolkit/scripts/lib/architecture-profiles.mjs` after removing its product-code generation contract
- Modify: `tools/IntegraTech.IA.Toolkit/scripts/lib/architecture-decision.mjs`
- Modify: `tools/IntegraTech.IA.Toolkit/scripts/lib/architecture-inspection.mjs`
- Modify: `tools/IntegraTech.IA.Toolkit/scripts/lib/architecture-oracles.mjs`
- Modify: `tools/IntegraTech.IA.Toolkit/scripts/lib/task-loop.mjs`
- Modify: `tools/IntegraTech.IA.Toolkit/scripts/lib/sdd-workflow.mjs`
- Modify: `tools/IntegraTech.IA.Toolkit/fabrica/team/contracts/task-run.schema.json`
- Test: `tools/IntegraTech.IA.Toolkit/tests/architecture-*.test.mjs`, `tests/task-loop.test.mjs` and `tests/sdd-workflow.test.mjs`

**Interfaces:**
- Architecture assessment/decision continues to bind the researched technology decision and context hash.
- Architecture inspection reports contextual decision validity; it never reports a generated scaffold unless one was generated and validated by a separately supported capability.
- `architectureStatus({ repo })` reports `decision_recorded` and `validation_status: "not_run"` for a prepared product with no product source; it does not claim structural consistency or delivery.

- [ ] **Step 1: Add failing tests** named `decisão arquitetural neutra aceita stack aprovada sem layout gerado` and `mudança de arquitetura não cria nem compara scaffold .NET`. Assert arbitrary stack names remain recorded, and unsupported source-generation transition paths return explicit capability limits without altering code.
- [ ] **Step 2: Run architecture and SDD focused tests** to observe failures in the current .NET template coupling.
- [ ] **Step 3: Remove calls that create/compare fixed C# source layouts** from architecture assessment, source graph inspection and SDD oracle transitions; retain context, module graph, approval, baseline, rollback and compatibility gates as records/checks independent from emitted C#.
- [ ] **Step 4: Update status and task-run contracts** so an approved but unimplemented architecture reports `decision_recorded`/`not_run`, never `consistent` or delivered. Preserve ordinary frozen regression oracles; remove only auto-generated C# scaffold transitions.
- [ ] **Step 5: Run architecture, traceability, task-loop and SDD test files**. Keep optional isolated product validators only where they validate user-selected source; they must not be part of creation or model verification.

### Task 3: Remove the root .NET example and neutralize model verification

**Files:**
- Delete: `IntegraTech.sln`, `global.json`, `Directory.Build.props`, `src/IntegraTech.Aplicacao/IntegraTech.Aplicacao/IntegraTech.Aplicacao.csproj`, `src/IntegraTech.Apresentacao/IntegraTech.Apresentacao.Worker/IntegraTech.Apresentacao.Worker.csproj`, `src/IntegraTech.Apresentacao/IntegraTech.Apresentacao.Worker/IntegrationWorker.cs`, `src/IntegraTech.Apresentacao/IntegraTech.Apresentacao.Worker/Program.cs`, `src/IntegraTech.Dominio/IntegraTech.Dominio/IntegraTech.Dominio.csproj`, `src/IntegraTech.Infra.CrossCutting.IoC/DependencyInjection.cs`, `src/IntegraTech.Infra.CrossCutting.IoC/IntegraTech.Infra.CrossCutting.IoC.csproj`, `src/IntegraTech.Infra.Data/IntegraTech.Infra.Data/IntegraTech.Infra.Data.csproj`, `src/IntegraTech.Infra.Service/IntegraTech.Infra.Service.csproj`, `tests/IntegraTech.Arquitetura.Tests/IntegraTech.Arquitetura.Tests.csproj`, `tests/IntegraTech.Arquitetura.Tests/Program.cs`
- Modify: `tools/IntegraTech.IA.Toolkit/scripts/verify-model.mjs`
- Modify: `tools/IntegraTech.IA.Toolkit/tests` verification coverage
- Modify: `.github/workflows/validate.yml`
- Modify: `package.json` only if `verify` or other root commands retain product-build assumptions

**Interfaces:**
- `npm run verify` reports toolkit checks plus neutral create/adopt validation and writes hash-bound evidence only after every required check passes.
- The verification sequence does not invoke `dotnet` or create Worker/API/Console sample descendants.

- [ ] **Step 1: Add a failing verification-plan regression** named `verificação integral não requer runtime nem projetos de produto`; assert command inventory includes Node toolkit tests/checks and excludes dotnet and sample presentations. Add a repository-template assertion that the manifest does not list deleted project files.
- [ ] **Step 2: Run the focused test** and observe that current verification schedules solution builds and generated .NET examples.
- [ ] **Step 3: Remove root example projects and product build/sample stages**. Keep Node test suite, provider/adaptor validation, local evaluations and secret scanning; keep CI dependencies limited to the toolkit runtime.
- [ ] **Step 4: Run `npm run verify`** on Windows and record the final check inventory and status. If runtime cannot finish, record the observed blocking stage without claiming full success.

### Task 4: Remove technology bias from manuals, generated guides and baselines

**Files:**
- Modify: `README.md`, `docs/inicio/fluxo-toolkit.md`, `docs/inicio/decisao-tecnologica.md`, `docs/inicio/arquitetura-contextual.md`, `docs/inicio/confiabilidade.md`, `docs/inicio/loop-engenharia.md`, `docs/inicio/sistemas-existentes.md`
- Modify: `tools/IntegraTech.IA.Toolkit/README.md`, `tools/IntegraTech.IA.Toolkit/fabrica/toolkit-manual.md`, `fabrica/governance.md`, templates and generated product documentation
- Modify: `tools/IntegraTech.IA.Toolkit/fabrica/project-template.json`
- Regenerate: `tools/IntegraTech.IA.Toolkit/fabrica/template-baseline.json`
- Test: `tools/IntegraTech.IA.Toolkit/tests/generator.test.mjs`, `tests/cursor.test.mjs`, `tests/adoption.test.mjs`

- [ ] **Step 1: Add documentation/generation assertions** that fresh model copies contain no stack-specific product build commands or example product structure and explain how product planning follows the approved decision.
- [ ] **Step 2: Run the focused regression tests** and confirm current README/generated-product claims fail.
- [ ] **Step 3: Update manuals and provider instructions** to say stack choice comes from context/research/approval; distinguish toolkit Node requirements from product runtimes/capabilities; remove .NET Worker/API/Console availability claims while permitting .NET as a researched option when context supports it.
- [ ] **Step 4: Update the controlled-file manifest and regenerate the baseline** with `node tools/IntegraTech.IA.Toolkit/scripts/update-template-baseline.mjs --write`.
- [ ] **Step 5: Run final verification**: `npm run verify`, `npm run check`, `node tools/IntegraTech.IA.Toolkit/scripts/update-template-baseline.mjs`, and `git diff --check`; verify at least one approved non-.NET technology decision creates/adopts without stack-specific scaffold and confirm all existing user changes remain present.
