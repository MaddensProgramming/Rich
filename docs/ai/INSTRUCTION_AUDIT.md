# Agent Instruction Audit

Run this after adopting the workflow, changing models, importing persistent instructions, or observing agents that widen scope or persist without progress.

## Checklist

1. Search `AGENTS.md`, `.codex/`, and relevant personal skills for instructions such as `never stop`, `do whatever it takes`, `at all costs`, `bypass`, `assume approval`, or broad proactive-delegation requirements.
2. Replace unbounded persistence with explicit scope, authorization, and stopping conditions.
3. Ensure implementation workers cannot delegate and parallelism is limited to independent tasks with non-overlapping writes.
4. Remove project history, completed task logs, raw architecture dumps, and temporary incidents from persistent instructions.
5. Verify that agents cannot substitute environments, accounts, branches, resources, or credential sources and cannot claim unobserved validation.
6. Confirm that normal work starts at the low or medium tier and that high-effort roles require a recorded reasoning-limited trigger and evidence.
7. Check that `AGENTS.md`, agent TOMLs, `CODEX_WORKFLOW.md`, and the plan templates agree on role names and workflow.

Record the audit date, reviewed files, risky wording removed, routing changes, and any follow-up measurement in the relevant change or plan.
