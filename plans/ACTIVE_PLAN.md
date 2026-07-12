# Active Plan: Act II balance, market, contracts, legacy, and prepared save

## Scope

Fix batch market arbitrage; expose and verify contract book rewards; add repeatable soldier training; rebalance expedition attrition, enemies, and rewards so the deterministic Act II baseline takes 20–30 minutes; update optimizer; replace/tune legacy choices; and prepare a browser save at Great Hall completion.

## Tasks

1. **Economy and contract correctness** (parallel-safe, simulation scope): integrate market prices across batch impact so round trips cannot profit; add regression tests; verify book grants and add a completion receipt suitable for UI visibility.
2. **Act II simulation and persistence** (simulation scope): add soldier training state/actions and effects; rebalance nodes/casualties/rewards; add legacy perks (Battle Wisdom 25%/level, Book of Wisdom 10% worker efficiency/level, tiered starting money, villager discount 5%/level); sanitize/migrate saves; update simulator/optimizer and tests; tune measured Great Hall-to-invasion time to 1200–1800 seconds.
3. **UI** (after state contracts settle): show contract book rewards and completion confirmation; expose soldier training; present revised legacy perks and expedition rewards.
4. **Documentation and validation**: update README; run focused tests, `npm test`, and `npm run build`.
5. **Browser/save artifact**: run local app, load a crafted compatible state at Great Hall completion with 30 workers, all buildings at max level, and abundant books; export/save the JSON artifact and verify in browser.
6. **Reviews/handoff**: code-reviewer final review; persistence-qa because save shape changes; record results in HANDOFF and archive plan.

## Acceptance criteria

- Any same-resource sell/buy batch round trip yields no positive profit, including large batches and automation.
- Contract offers visibly name book title, rarity, and count; completion visibly confirms it; exact inventory grant is tested.
- Soldier training is an explicit post-enlistment investment with persisted progression and visible cost/effect.
- Expedition requires rebuilding after meaningful casualties, has stronger encounters and useful varied rewards, and the deterministic optimizer reaches the invasion in 20–30 minutes from Great Hall completion.
- Legacy has Battle Wisdom at +25% army power/level, Book of Wisdom at +10% worker efficiency/level, starting-money levels 200/700/2000/7000/20000, and villager cost -5%/level; old saves hydrate safely.
- Full tests and production build pass; prepared save loads in the local browser at the requested state.

## Validation

`npx vitest run src/simulation/market.test.ts src/simulation/simulation.test.ts src/simulation/expedition.test.ts src/simulation/policyOptimizer.test.ts`

`npm test`

`npm run build`

## Risks

- Persistent perk keys need additive defaults/migration; never reinterpret an existing purchased perk silently.
- Market integration must preserve fractional quantities and affordability.
- Timing target is measured from Great Hall completion, not total campaign duration.
