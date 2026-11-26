# OWASP-Oriented Security Review Implementation Plan

> **For agentic workers:** implement this plan incrementally and validate each change.

**Goal:** Make CTO-triggered security decisions and code reviews use an evidence-based OWASP lens through the existing read-only security reviewer.

**Architecture:** Extend the canonical security skill and existing reviewer instructions; add an explicit OWASP reference field for security findings and validate it in the review contract. Preserve the existing dispatcher and security review gate; do not add a duplicate agent or install scanners globally.

**Tech Stack:** Markdown skills and governance, JSON Schema, Node.js tests, existing provider adapter generation.

**Spec:** User request on 2026-11-25 to create a CTO-directed OWASP code review skill/agent.

## Global Constraints

- Reuse `security-reviewer`; it remains read-only and independent from implementation.
- CTO invokes security review for security decisions and applicable code changes; unavailable review blocks rather than approves.
- OWASP Top 10 is an awareness lens, not a complete control standard or certification.
- Select OWASP ASVS/project controls for the actual product type and version; do not impose web controls on non-web products.
- Findings require source evidence and an OWASP reference; do not invent vulnerabilities or citations.
- Manual review complements, and does not replace, automated scans and security testing.

## Review Focus

- Security finding without an OWASP reference must fail contract validation.
- Security review without findings must remain valid without fabricated references.
- Generated Codex, Claude, and Cursor security reviewer adapters must point to the same canonical skill.
- Provider/tool unavailability must remain a blocked review, not an approval.
- OWASP guidance must be contextual and must not imply certification or scanner execution.

## Tasks

### Task 1: Enforce traceable OWASP references in security findings

**Files:** `tools/IntegraTech.IA.Toolkit/tests/security-review.test.mjs`, `tools/IntegraTech.IA.Toolkit/fabrica/team/contracts/review.schema.json`, `tools/IntegraTech.IA.Toolkit/scripts/lib/contracts.mjs`

- [x] Add failing tests: security findings without `security_reference` are rejected; findings with OWASP reference validate; empty approved security review validates.
- [x] Run the focused test and observe the expected failure.
- [x] Add optional `security_reference` string to generic finding schema and require it for every finding in `review_type: security`; values must identify an OWASP reference.
- [x] Run the focused test and confirm pass.

### Task 2: Wire the OWASP review into CTO governance and provider artifacts

**Files:** canonical `integratech-seguranca` skill, `governance.md`, adoption and SDD/loop docs, generated reviewer adapters, `project-template.json`, `template-baseline.json`, relevant README/flow docs.

- [x] Specify CTO triggers for architecture/security decisions and security-relevant code changes.
- [x] Document contextual OWASP references and reviewer limits in the canonical skill.
- [x] Ensure provider adapters inherit the canonical security reviewer instructions without creating a second agent.
- [x] Update factory entry guidance, adoption materials, SDD and operational flow.
- [x] Regenerate/check the model baseline and run focused contract/installer tests plus provider validation.

## Validation record

- Focused contract, router, provider-materialization and engineering-loop tests: 31 passed, 0 failed.
- `npm run toolkit -- validate --provider all`: valid, 16 roles.
- `update-template-baseline.mjs`: valid, 289 controlled files.
- `git diff --check`: passed.
- `npm run verify`: baseline gate passed; the full suite did not produce observable TAP progress and was interrupted. Overall verification remains incomplete.
- The implementation provides agent-guided manual review and contract enforcement. It does not install or execute SAST/DAST, dependency scanners, penetration tests, or certify OWASP compliance.
