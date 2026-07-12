# Workflow Adoption Audit

- **Date:** 2026-07-12
- **Scope reviewed:** `AGENTS.md`, `.codex/config.toml`, `.codex/agents/*.toml`, `CODEX_WORKFLOW.md`, `docs/ai/*`, and `plans/*`
- **Source:** `Jogan/soluna-workflow` at commit `b51bb2626d4b6c9067ec114236604ca205a0df30`
- **Persistent personal instructions:** Not copied into the repository; project rules explicitly yield to authorization and installed-client constraints.

## Findings resolved

- Initially removed hard-coded model slugs when Codex CLI 0.142.4 could not run them. After upgrading to CLI 0.144.1, direct read-only invocations successfully ran both `gpt-5.6-sol` and `gpt-5.6-luna`; explicit role-specific model routing was restored.
- Added explicit root `workspace-write`, `on-request`, Auto-review, and network-disabled defaults rather than inheriting potentially permissive personal settings.
- Made the root the sole writer of `plans/HANDOFF.md`, avoiding conflicts between otherwise parallel-safe workers.
- Limited concurrency to the root plus two workers and recursion depth to one.
- Kept evidence-gated escalation and removed broad or unbounded delegation triggers.

## Residual checks

- Re-run this audit after future Codex upgrades or model-routing changes.
- Confirm project trust is enabled where these project-scoped settings should load.
- Treat Auto-review as a permission-boundary reviewer, not a substitute for final code review.
