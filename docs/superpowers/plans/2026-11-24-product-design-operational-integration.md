# Product Design Operational Integration Implementation Plan

> **Execution:** CTO implements inline under the user-approved scope.

**Goal:** Make UX applicability, findings, revalidation, and gate outcomes explicit in the reusable toolkit.

**Architecture:** Extend the existing UX review contract and quality guidance. Add one pure gate evaluator used by tests and documentation; do not add an agent, external dependency, plugin installer, or product-specific context to the model.

**Tech Stack:** Node.js ES modules, existing JSON contract validator, Markdown guidance.

**Spec:** User request “Integração do Product Design ao fluxo operacional da Fábrica Autônoma de Software”, approved in this conversation.

## Global Constraints

- Preserve code, security, data, and architecture review responsibilities.
- UX critical/high findings must not pass; evidence or required capability unavailable must block.
- Non-applicability requires an explicit rationale.
- Do not claim Product Design plugin execution from local skill presence.
- No credentials, new external tools, or product-specific assumptions in the toolkit model.

## Review Focus

- An unclassified or unavailable UX evaluation must not pass: cover with gate tests.
- Critical/high findings must not be accepted with reservations: cover with gate and contract tests.
- Finding IDs must be unique and include resolution ownership and revalidation evidence: cover with contract tests and workflow guidance.
- Non-UX reviews must retain their existing finding contract: cover with compatibility tests.
- Contexts for products without interface must remain isolated and explicitly not applicable: cover with outcome tests and initialization guidance.

## Files

- Modify `tools/IntegraTech.IA.Toolkit/fabrica/team/contracts/review.schema.json` and `scripts/lib/contracts.mjs` for UX finding completeness and severity.
- Add `scripts/lib/ux-gate.mjs` and `tests/ux-gate.test.mjs` for explicit applicability and outcome mapping; connect it to candidate review and delivery status.
- Add optional `experience_impact` metadata to task delegations so indirect impact can require UX review without breaking legacy callers.
- Carry SDD task impact from the approved plan into its generated delegation; omitted classifications default to `unknown` and block candidate acceptance.
- Extend `tests/ux-quality.test.mjs` for structured findings and non-UX compatibility.
- Update canonical UX skill, quality guide, governance, installer-generated entry instructions, interfaces guide, and project continuation guide.

## Tasks

### Task 1: Gate outcomes and UX finding contract

- Add failing tests for approved, approved with reservations, rejected, not applicable, blocked, critical/high rejection, missing evidence, duplicate IDs, and structured finding requirements.
- Implement the minimal pure evaluator and UX-only contract checks; preserve other review types.
- Run targeted tests, then the full toolkit suite.

### Task 2: Permanent operational guidance

- Document impact classification, proportional audit scope, structured finding lifecycle, revalidation, outcomes, and plugin/tool unavailability behavior.
- Propagate the rule through canonical governance and generated entry instructions without creating another agent or dependency.
- Run toolkit checks and inspect generated diffs for model neutrality and consistency.

### Task 3: Adversarial validation and report

- Validate the full toolkit and review traceability/coherence checks available locally.
- Report scenario coverage as synthetic contract validation, not live Product Design execution.
- Record external plugin/account/CLI and real-product scenarios that remain unverified.
