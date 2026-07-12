# Implementation Plan: Test optimizer book counts above 20

## Goal

Run deterministic, controlled sweeps above the optimizer's current 20-pack cap to identify the best observed book-pack count and the point of diminishing or negative returns in both the normal economy and current market rules. Widen the optimizer range only when a count above 20 produces a meaningful elapsed-time improvement.

## Acceptance criteria

- [ ] Paired runs hold every non-book policy input and RNG seed constant while testing counts above 20 alongside the best current in-range baseline.
- [ ] Results report requested and actually purchased packs, Great Hall time, first-invasion time, and market-arbitrage profit for both economy modes.
- [ ] The best observed count and first plateau/regression are identified for each economy; no global-optimum claim is made.
- [ ] The optimizer cap/candidates change only if above-20 evidence improves first-invasion time; any change has deterministic regression coverage.
- [ ] Focused tests, `npm test`, and `npm run build` pass.

## Planning and escalation

- **Starting planner:** `st-moritz-architect`
- **Deep planner:** `st-moritz-architect-deep`
- **Escalate only when:** Identical controlled inputs yield inconsistent results, or available money prevents distinguishing a policy cap from actual purchase feasibility without changing unrelated economy behavior.
- **Observed trigger:** None.
- **Supporting evidence:** `src/simulation/policyOptimizer.ts` normalizes `bookPacksToBuy` to a maximum of 20 and its neighbors currently test only `0, 3, 5, 10`.

## Constraints and authorization

- **Constraints/non-goals:** Do not change book price/effects/RNG, market math, gameplay balance, saves, UI, or unrelated optimizer dimensions. Do not tune other policy inputs during the count sweep.
- **Allowed targets and environments:** This repository/workspace only.
- **External side effects:** None.
- **Destructive operations:** None.
- **Credential access:** None.
- **Stop and ask when:** New scope, permission, credential, target, destructive action, or external effect is required.

## Relevant architecture

- **Component and existing pattern:** `src/simulation/progressionSimulator.ts` buys and reports packs; `src/simulation/policyOptimizer.ts` caps, searches, and evaluates pack counts; `scripts/optimizeProgression.ts` reports both economy modes; `src/simulation/policyOptimizer.test.ts` covers deterministic results.
- **Fixed interface or decision:** First-invasion time remains the optimization score. Great Hall time, actual purchases, and arbitrage profit are diagnostics used to interpret the result.

## Tasks

### Task 1 — Sweep above-20 pack counts

- **Status:** Completed
- **Preferred agent:** `economy-simulation`
- **Escalation agent:** `implementation-escalation`
- **Escalate only when:** The simulator cannot run requested counts above 20 without first changing production optimizer behavior.
- **Observed trigger/evidence:** None.
- **Parallel-safe:** No.
- **Depends on:** None.
- **Context packet:**
  - `src/simulation/policyOptimizer.ts` — normalization, seeds, neighbors, evaluation.
  - `src/simulation/progressionSimulator.ts` — book purchase gate and `systemsUsed.bookPacksPurchased`.
  - `src/simulation/invasionSimulator.ts` — first-invasion result.
- **Allowed scope:** A temporary or retained deterministic experiment harness and minimal reporting instrumentation.
- **Do not change:** Production optimizer cap/candidates during this task or any game/economy rule.
- **Implementation notes:** Start with the best current policy in each economy. Test 20 and a bounded coarse sequence above it (for example 25, 30, 40, 50), then refine around any improving region. Stop extending after at least two successive non-improving points or when requested packs cannot actually be purchased. Repeat runs to confirm determinism.
- **Acceptance criteria:**
  - [ ] Both economies have a concise count/time table and delta from their 20-pack baseline.
  - [ ] Requested versus purchased counts make affordability limits explicit.
  - [ ] Best observed count and diminishing-return boundary are recorded.
- **Validation:** `npx vitest run src/simulation/policyOptimizer.test.ts src/simulation/progressionSimulator.test.ts`
- **Required evidence:** Deterministic comparison table for both economy modes.
- **Worker notes:** Coarse 20/25/30/40/50 and refined 20–25 sweeps completed twice; all requested packs were purchased. Normal economy peaked at 23; current-rules peaked at 20.

### Task 2 — Widen search only if it wins

- **Status:** Completed
- **Preferred agent:** `economy-simulation`
- **Escalation agent:** `implementation-escalation`
- **Escalate only when:** A winning above-20 count cannot be included without exhausting the fixed evaluation budget before meaningful candidates run.
- **Observed trigger/evidence:** None.
- **Parallel-safe:** No.
- **Depends on:** Task 1.
- **Context packet:**
  - Task 1 evidence.
  - `src/simulation/policyOptimizer.ts` — cap, candidates, cache key, evaluation budget.
  - `scripts/optimizeProgression.ts` and `README.md` — reported behavior/results.
  - `src/simulation/policyOptimizer.test.ts` — regression coverage.
- **Allowed scope:** Evidence-backed cap/candidate changes, focused tests, output/README updates, and plan/handoff notes.
- **Do not change:** Cap or candidate set when above-20 counts tie or regress; all gameplay and market rules.
- **Implementation notes:** Add the smallest candidate range that includes the observed winner and nearby boundary. Preserve useful seed coverage under `maxEvaluations`. If neither economy improves, leave production code unchanged and record the negative result.
- **Acceptance criteria:**
  - [ ] Any widened search reproduces an above-20 first-invasion improvement and remains deterministic.
  - [ ] Normal- and current-economy results remain clearly separated.
  - [ ] If no improvement exists, no optimizer widening is made.
- **Validation:** `npm run optimize:progression`
- **Required evidence:** Before/after optimizer output or an explicit evidence-backed no-change conclusion.
- **Worker notes:** Widened cap to 25, added 23/25 candidates and budget-safe seed coverage, plus deterministic regression coverage and documentation.

### Task 3 — Final integration review

- **Status:** Completed
- **Preferred agent:** `code-reviewer`
- **Escalation agent:** `implementation-escalation`
- **Escalate only when:** Review finds an unresolved correctness issue in comparison fairness or search coverage.
- **Observed trigger/evidence:** None.
- **Parallel-safe:** No.
- **Depends on:** Task 2 and integration validation.
- **Context packet:** Changed files, experiment evidence, and this plan.
- **Allowed scope:** Read-only review.
- **Do not change:** Any files.
- **Implementation notes:** Verify claimed gains use identical non-book inputs and actual pack counts, and are not merely increased market arbitrage.
- **Acceptance criteria:**
  - [ ] No unresolved correctness findings remain.
- **Validation:** Review observed commands and output.
- **Required evidence:** Concise findings with file/symbol references.
- **Worker notes:** Review reproduced sweep and README results and found no optimizer correctness issue. Stale plan/handoff records were corrected before archival.

## Integration validation

- `npx vitest run src/simulation/policyOptimizer.test.ts src/simulation/progressionSimulator.test.ts`
- `npm run optimize:progression`
- `npm test`
- `npm run build`

## Risks and rollback

- **Risk:** Requested pack counts may exceed available funds, falsely appearing equivalent; expanding candidates may dilute the fixed search budget; current-rules gains may be market-exploit dependent.
- **Rollback:** Revert only evidence-backed optimizer cap/candidate, test, output, and README changes from this plan.

## Architecture decisions

- **Decision and evidence:** Use controlled count sweeps before altering the search, because the existing cap prevents direct optimizer evidence above 20.
- **Decision and evidence:** Require actual purchase count and separate economy modes so affordability and market arbitrage are not misattributed to book value.
