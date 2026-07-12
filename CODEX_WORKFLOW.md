# St. Moritz Agent Workflow

This repository adapts the evidence-gated, cost-conscious approach from [Jogan/soluna-workflow](https://github.com/Jogan/soluna-workflow) to St. Moritz's existing specialists.

## Routing ladder

| Stage | Agent | Default effort |
|---|---|---|
| Coordination | root | Sol Low |
| Planning | `st-moritz-architect` | Sol Medium |
| Difficult planning | `st-moritz-architect-deep` | Sol High |
| Tiny edit | `mechanical-worker` | Luna Low |
| Simulation implementation | `economy-simulation` | Luna Medium |
| UI implementation | `game-ui` | Luna Medium |
| Blocked implementation | `implementation-escalation` | Luna High |
| Persistence review | `persistence-qa` | Sol High, read-only |
| Integration review | `code-reviewer` | Sol High, read-only |

Escalate one task, not the entire run. Two workers may run in parallel only when the active plan explicitly marks their tasks parallel-safe and their write scopes do not overlap.

The repository pins both model and reasoning effort for each role. An explicit model selection in the app or CLI can still override the root session, while spawned custom agents use their role-specific model settings.

## Plan non-trivial work

Ask `st-moritz-architect` to investigate the request and replace `plans/ACTIVE_PLAN.md` from `plans/TASK_TEMPLATE.md`. It should define exact context packets, constraints, authorization boundaries, acceptance criteria, validation evidence, dependencies, and escalation triggers without implementing production code.

Use `st-moritz-architect-deep` only when the normal architect has recorded an unresolved reasoning-limited design problem and supporting evidence.

## Implement

Pass an implementation agent only one task section and its context packet. Route game rules, data, balance, save shaping, and deterministic tests to `economy-simulation`. Route React, Phaser, CSS, and thin Zustand integration to `game-ui`. Use `mechanical-worker` only when the edit is obvious and fully specified.

If a worker is blocked, first repair missing context, unclear acceptance criteria, permissions, dependencies, or environment failures. Use `implementation-escalation` only when direct evidence shows a bounded reasoning problem remains.

## Review and hand off

After implementation, run focused checks followed by `npm test` and `npm run build` when relevant. Workers return evidence to the root, which is the sole writer of `plans/HANDOFF.md`.

Ask `code-reviewer` to compare the original request, active plan, handoff, diff, and validation evidence. Also ask `persistence-qa` when persistent state, migrations, offline progress, invasion wall time, or browser lifecycle behavior changed.

Archive a completed plan as `plans/completed/YYYY-MM-DD-short-feature-name.md`, then reset the active plan and handoff. Start a fresh task for a distinct feature instead of carrying the full transcript forward.
