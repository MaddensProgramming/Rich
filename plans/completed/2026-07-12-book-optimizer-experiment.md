# Implementation Plan: Test earlier and larger optimizer book purchases

## Goal

Determine with deterministic, apples-to-apples optimizer runs whether buying library book packs earlier and/or buying more than the current searched set reduces time to the Great Hall or first invasion. If the evidence shows an improvement, incorporate the smallest general policy/search change that exposes the winning timing and quantity; otherwise retain current behavior and record the negative result without changing gameplay rules.

## Acceptance criteria

- [ ] A reproducible experiment compares the current optimizer behavior with book quantities spanning zero, the current candidates, and values above 10, while holding non-book assumptions constant for each comparison.
- [ ] The experiment tests purchase timing independently of pack count, including the current post-workforce-target gate and at least one earlier Village purchase strategy.
- [ ] Results report Great Hall time, first-invasion time, packs actually purchased, and market-arbitrage profit for both normal economy and current market rules so book gains are not mistaken for market-exploit gains.
- [ ] Any winning policy is represented in the optimizer's search/output and protected by focused deterministic regression coverage; if no tested variant wins, no production policy change is required.
- [ ] Required focused validation, `npm test`, and `npm run build` pass.

## Planning and escalation

- **Starting planner:** `st-moritz-architect`
- **Deep planner:** `st-moritz-architect-deep`
- **Escalate only when:** Controlled runs produce contradictory rankings under identical seeds/options, or implementing an earlier purchase policy reveals an unresolved tradeoff between book funding and project/contract resource reservation that cannot be expressed through the existing simulator policy interface.
- **Observed trigger:** None
- **Supporting evidence:** `progressionSimulator.ts` currently gates purchases on reaching the chapter workforce target, while `policyOptimizer.ts` searches only pack counts `0, 3, 5, 10` (normalized up to 20); timing is therefore not currently an independently searched policy dimension.

## Constraints and authorization

- **Constraints/non-goals:** Do not change book prices, effects, rarity odds, RNG, gameplay balance data, save shape, UI, market math, or production rules. Do not claim a global optimum; this is a deterministic heuristic comparison. Preserve identical seeds and all non-book settings within each controlled comparison.
- **Allowed targets and environments:** This repository/workspace only; simulation, optimizer, scripts, tests, README, and plan/handoff files as needed.
- **External side effects:** None.
- **Destructive operations:** None.
- **Credential access:** None.
- **Stop and ask when:** New scope, permission, credential, target, destructive action, or external effect is required.

## Relevant architecture

- **Component and existing pattern:** `src/simulation/progressionSimulator.ts` executes book buying; `src/simulation/invasionSimulator.ts` carries progression options through the first invasion; `src/simulation/policyOptimizer.ts` defines, normalizes, mutates, evaluates, and keys searched policies; `scripts/optimizeProgression.ts` presents leaderboards; `src/simulation/policyOptimizer.test.ts` provides deterministic optimizer regression coverage.
- **Fixed interface or decision:** Keep policy decisions and experiment logic in `src/simulation/`. React, Phaser, persistent game state, and live book mechanics remain untouched. Compare both `allowMarketRoundTrips: false` and `true`, and treat first-invasion time as the optimizer score while retaining Great Hall time as a diagnostic.

## Tasks

### Task 1 — Establish controlled book count and timing evidence

- **Status:** Completed
- **Preferred agent:** `economy-simulation`
- **Escalation agent:** `implementation-escalation`
- **Escalate only when:** Identical policy inputs are nondeterministic or the simulator cannot expose actual purchase timing/count without modifying gameplay state.
- **Observed trigger/evidence:** None.
- **Parallel-safe:** No.
- **Depends on:** None.
- **Context packet:**
  - `src/simulation/progressionSimulator.ts` — `ProgressionSimulatorOptions` and the library purchase block in `simulatePlayerProgression`.
  - `src/simulation/policyOptimizer.ts` — `OptimizedPolicy`, `createSeedPolicies`, `createNeighbors`, and `evaluate`.
  - `src/simulation/invasionSimulator.ts` — progression option forwarding and result shape.
  - `scripts/optimizeProgression.ts` — current two-economy leaderboard output.
- **Allowed scope:** Add a temporary or retained deterministic experiment/test harness and only the minimal result instrumentation needed to observe timing, packs purchased, completion times, and arbitrage profit.
- **Do not change:** Book/game balance, market mechanics, RNG seed, unrelated policy dimensions, UI, saves, or production recipes.
- **Implementation notes:** Use paired sweeps so each book variant shares the same interval, workers, levels, contracts, delivery, production, and market settings. Include pack counts at least `0, 3, 5, 10, 15, 20`. Model timing as an explicit policy criterion (for example, a workforce fraction/threshold or named purchase phase) rather than silently reordering the simulator. Capture the best baseline and earlier-buy variant under both economy modes.
- **Acceptance criteria:**
  - [ ] A reproducible command or focused test emits/records the controlled comparison.
  - [ ] Evidence identifies whether count, timing, both, or neither improves Great Hall and first-invasion time.
  - [ ] Actual packs purchased and arbitrage profit are included for interpretation.
- **Validation:** `npx vitest run src/simulation/policyOptimizer.test.ts src/simulation/progressionSimulator.test.ts`
- **Required evidence:** A concise table or test output with paired completion times and deltas for normal economy and current market rules.
- **Worker notes:** Added paired deterministic count/timing experiment and purchase-time instrumentation. Earlier Village buying helps some policies; larger pack counts provide the strongest overall gain.

### Task 2 — Integrate only the evidence-backed optimizer improvement

- **Status:** Completed
- **Preferred agent:** `economy-simulation`
- **Escalation agent:** `implementation-escalation`
- **Escalate only when:** The best timing cannot be encoded as a bounded serializable optimizer policy without coupling to internal simulator action ordering or causing unstable search results within the evaluation budget.
- **Observed trigger/evidence:** None.
- **Parallel-safe:** No.
- **Depends on:** Task 1.
- **Context packet:**
  - `src/simulation/policyOptimizer.ts` — policy type, key, normalization, seeds, neighbors, and evaluation forwarding.
  - `src/simulation/progressionSimulator.ts` — policy option and library purchase eligibility.
  - `scripts/optimizeProgression.ts` — leaderboard fields.
  - `src/simulation/policyOptimizer.test.ts` — deterministic regression pattern.
  - `README.md` — optimizer description and current reported best results.
- **Allowed scope:** Add the smallest explicit timing policy/search dimension, broaden evidence-backed pack candidates, report the dimension in optimizer output, add focused tests, and update README results/behavior if observed outputs change.
- **Do not change:** Gameplay library behavior, book definitions, pack RNG, save compatibility, market exploit behavior, or unrelated optimizer policies.
- **Implementation notes:** Keep policy keys complete so timing variants do not collide in cache. Respect `maxEvaluations`; ensure seeds include meaningful early-book alternatives so a larger neighbor space does not prevent evaluation. If Task 1 finds no improvement, document the result in worker/handoff notes and skip production changes.
- **Acceptance criteria:**
  - [ ] The optimizer evaluates the winning earlier/more-books strategy, if one exists, in both economy modes.
  - [ ] The winning result improves first-invasion time versus its paired baseline; ties or regressions are not presented as wins.
  - [ ] Leaderboard output distinguishes book count and timing and remains deterministic.
  - [ ] Focused tests protect policy normalization/cache identity and the observed improvement without relying on market profit for the normal-economy case.
- **Validation:** `npx vitest run src/simulation/policyOptimizer.test.ts src/simulation/progressionSimulator.test.ts && npm run optimize:progression`
- **Required evidence:** Directly observed optimizer leaderboards and focused-test results, including before/after time deltas.
- **Worker notes:** Optimizer now searches 0/3/5/10/15/20 packs, explicitly seeds early high-count combinations within budget, keys timing separately, and reports timing in leaderboards.

### Task 3 — Final read-only integration review

- **Status:** Completed
- **Preferred agent:** `code-reviewer`
- **Escalation agent:** `implementation-escalation`
- **Escalate only when:** Review finds a correctness defect whose fix is unclear within the existing simulator/optimizer boundaries.
- **Observed trigger/evidence:** None.
- **Parallel-safe:** No.
- **Depends on:** Task 2 and integration validation.
- **Context packet:**
  - Changed files from Tasks 1–2.
  - `README.md` — reported optimizer behavior/results.
  - `plans/ACTIVE_PLAN.md` — acceptance criteria and evidence requirements.
- **Allowed scope:** Read-only review of determinism, fair comparison, search coverage, result claims, and unrelated-change risk.
- **Do not change:** Any files.
- **Implementation notes:** Confirm any claimed gain is not merely a different market-round-trip allowance or other changed policy input, and confirm README numbers match observed output.
- **Acceptance criteria:**
  - [ ] No unresolved correctness findings remain, or findings are returned with exact file/symbol evidence.
- **Validation:** Review observed focused/full validation and optimizer output; no new mutation.
- **Required evidence:** Concise reviewer findings with severity and file/symbol references.
- **Worker notes:** Review found timing/count combinations could be skipped under budget; fixed with prioritized seeds and optimizer-level regression coverage. No unresolved findings remain.

## Integration validation

- `npx vitest run src/simulation/policyOptimizer.test.ts src/simulation/progressionSimulator.test.ts`
- `npm run optimize:progression`
- `npm test`
- `npm run build`

## Risks and rollback

- **Risk:** A larger policy neighborhood can exhaust the fixed evaluation budget before useful timing variants run; early purchases may also look better only because another policy input or market arbitrage changed. Extra pack candidates can increase runtime.
- **Rollback:** Revert only the explicit optimizer timing/count search, result-output, focused-test, and README changes from this plan; gameplay state and book mechanics should require no rollback.

## Architecture decisions

- **Decision and evidence:** Treat purchase timing as a first-class optimizer policy dimension because the current simulator hard-gates all purchases until the workforce target, so increasing `bookPacksToBuy` alone cannot answer the user's earlier-books hypothesis.
- **Decision and evidence:** Require paired normal-economy and current-rules results because README and current tests show the fastest policy can depend on repeatable market round trips; book value must be separated from that exploit.
- **Decision and evidence:** Use deterministic observed timings rather than the balance model's abstract book value reports, because the requested outcome is elapsed-time improvement through the integrated campaign and invasion simulator.
