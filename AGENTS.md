# St. Moritz Project Guidance

Use `README.md` as the product and implementation source of truth. Keep this file limited to rules that apply to nearly every task; durable architecture and commands belong in `docs/ai/PROJECT_CONTEXT.md`, while current work belongs in `plans/ACTIVE_PLAN.md` and `plans/HANDOFF.md`.

## Product and architecture boundaries

- Build for desktop browsers with React, Phaser, TypeScript, Vite, Zustand, and Vitest. Do not add mobile-specific work unless requested.
- Keep game rules and serializable state in `src/simulation/`. React and Phaser should only display state and dispatch actions.
- Preserve save compatibility unless a migration is explicitly part of the task.
- Update `README.md` when gameplay, architecture, setup, deployment, or testing behavior changes.

## Agent routing

Use the least expensive role that reliably fits the work:

1. Root agent: Sol Low for coordination and small, self-contained work.
2. `st-moritz-architect`: normal planning for ambiguous, multi-file, or cross-layer work.
3. `st-moritz-architect-deep`: high-effort planning only after a concrete reasoning-limited blocker is recorded.
4. `mechanical-worker`: tiny, fully specified edits.
5. `economy-simulation`: bounded simulation, data, balance, and persistence implementation.
6. `game-ui`: bounded React, Phaser, Zustand integration, and CSS implementation.
7. `implementation-escalation`: a blocked bounded implementation task only after direct failure evidence is recorded.
8. `persistence-qa`: read-only save, migration, offline-time, and browser-time review.
9. `code-reviewer`: read-only final integration review.

Do not delegate merely because agents are available. Use at most two workers in parallel, only for tasks marked parallel-safe with non-overlapping write scopes. Workers must not spawn agents. Pass a worker only its task, context packet, constraints, authorization boundaries, acceptance criteria, and validation command—not the parent transcript.

## Workflow

For non-trivial work:

1. Ask `st-moritz-architect` to create `plans/ACTIVE_PLAN.md` from `plans/TASK_TEMPLATE.md` without implementing production code.
2. Delegate each bounded task to the matching specialist. Keep overlapping write work with the root agent.
3. Escalate only the affected task when the plan records a concrete reasoning-limited failure and evidence.
4. Run focused validation first, then `npm test` and `npm run build` after relevant changes.
5. Ask `code-reviewer` for final integration review; add `persistence-qa` when save, time, offline progress, or migrations are affected.
6. The root records concise observed worker results in `plans/HANDOFF.md`. Archive completed plans under `plans/completed/`.

Tiny isolated edits may skip the full plan when scope, acceptance criteria, and validation are obvious.

## Escalation policy

Valid escalation signals include unresolved design tradeoffs, contradictory requirements, hidden cross-component coupling, repeated wrong hypotheses despite new evidence, an implementation failure with unclear cause, or high-impact uncertainty involving persistent state, compatibility, timing, or concurrency.

Do not escalate for missing context, vague acceptance criteria, missing permissions, dependency or environment failures, large logs, excess conversation history, or several unrelated requests combined together. Repair those conditions directly. Record the exact trigger and evidence in `plans/ACTIVE_PLAN.md`, and return later tasks to their normal tier.

## Context, scope, and evidence

- Prefer targeted filename, symbol, and reference searches over broad repository scans.
- Summarize logs; do not carry raw output into plans or handoffs.
- Make the smallest coherent change that satisfies the active task. Avoid unrelated cleanup, dependency upgrades, and refactors.
- Stop when progress requires new scope, permissions, credentials, targets, destructive actions, or external side effects that were not authorized.
- Never substitute another environment, account, branch, resource, or credential source because the named target failed.
- Never claim a test, build, behavior, or migration succeeded without directly observing it.
- Follow `docs/ai/INSTRUCTION_AUDIT.md` after changing models or importing persistent instructions.
