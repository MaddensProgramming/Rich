# Active Plan: Expedition UI and legacy cleanup

## Goal

Make the expedition UI truthful and viewport-contained: node cards show the effective battle power used by simulation, only the four current legacy perks remain purchasable, battle reactions use the chapter-style storyteller modal, and the command rail scrolls without stretching the map or page.

## Acceptance criteria

- [ ] Every uncleared map node and selected-node header displays the same effective enemy power returned by `getBattlePreview`; no stale base number is shown.
- [ ] Defeat/victory legacy UI offers only Battle Wisdom, Book of Wisdom, Starting Capital, and Village Bonds.
- [ ] Saves containing removed `pioneering_spirit`, `prepared_stores`, or `merchant_contacts` hydrate safely without crashes or accidentally applying those effects; current perk levels remain intact.
- [ ] Expedition victory and defeat reactions open in the same storyteller portrait/modal presentation used by chapter welcomes, once per new battle result, while the battle report retains factual casualties.
- [ ] At desktop viewport heights, the expedition layout stays within the available app viewport; the right command rail scrolls internally and does not increase map/page height.
- [ ] Focused tests, full `npm test`, `npm run build`, and browser QA pass.

## Planning and escalation

- **Starting planner:** `st-moritz-architect`
- **Escalate only when:** save-key removal conflicts with compatibility, or modal triggering cannot distinguish a newly completed battle from a hydrated prior report without adding persisted state.
- **Observed trigger/evidence:** None.

## Constraints and architecture

- Simulation remains authoritative. UI must render `getBattlePreview(...).enemyPower`, not duplicate enemy scaling.
- Preserve save compatibility; sanitize legacy perk records into the current four-key shape. Removed perk purchases must have no continuing gameplay effect. Do not alter earned/spendable Experience unless a product decision explicitly requests refunds.
- Reuse `Storyteller` presentation and storyteller data conventions; avoid a second visually similar modal system.
- Desktop only. Do not rebalance battles, rewards, training, or expedition timing in this follow-up.
- Avoid unrelated cleanup and dependency changes.

## Tasks

### Task 1 — Effective power and legacy model cleanup

- **Status:** Not started
- **Preferred agent:** `economy-simulation`
- **Parallel-safe:** No
- **Depends on:** None
- **Context packet:** `src/data/expedition.ts` perk definitions/node data; `src/simulation/expedition.ts` battle previews and perk effects; `src/simulation/types.ts` perk IDs; initial-state/save sanitation code including `src/simulation/utils.ts`; focused expedition/save tests.
- **Allowed scope:** expedition data/types/simulation, initialization/hydration, and focused tests.
- **Do not change:** battle power balance, XP costs, rewards, or timing.
- **Implementation notes:** make the four requested perk IDs the canonical runtime set. Explicitly pick/sanitize known keys rather than spreading arbitrary saved perk keys. Old removed keys may be ignored during hydration; document this compatibility behavior in tests.
- **Acceptance criteria:** preview exposes the effective power used to resolve combat; only four perks are enumerable/purchasable; legacy and malformed saves hydrate to valid current perk records.
- **Validation:** `npx vitest run src/simulation/expedition.test.ts src/simulation/simulation.test.ts`

### Task 2 — Expedition presentation and contained layout

- **Status:** Not started
- **Preferred agent:** `game-ui`
- **Parallel-safe:** No
- **Depends on:** Task 1 contracts
- **Context packet:** `src/ui/ExpeditionPanel.tsx`; `src/ui/Storyteller.tsx`; `src/ui/App.tsx`; `src/data/story.ts`; expedition/story/layout sections of `src/styles.css`.
- **Allowed scope:** targeted React UI, story data/types, CSS, and UI tests if present.
- **Do not change:** simulation outcomes or persistent state unless Task 1 establishes a narrowly required battle-message marker.
- **Implementation notes:** render node powers from per-node previews. Convert battle reaction copy into a `StorySegment`-compatible modal flow using Elder Bertram portrait/card/actions; trigger on a newly observed battle result and avoid reopening merely because React rerenders. Give the expedition container a definite available height/minmax chain, keep the map panel at that height, and set the command panel to `min-height: 0; overflow-y: auto`; preserve the single-column breakpoint without trapping page scrolling.
- **Acceptance criteria:** both win and loss reactions use storyteller modal; selected and map-node powers match forecasts; command content scrolls inside its rail at short desktop heights with the map image unchanged.
- **Validation:** `npm run build` plus browser QA below.

### Task 3 — Documentation, integration, and handoff

- **Status:** Not started
- **Preferred agent:** root agent
- **Parallel-safe:** No
- **Depends on:** Tasks 1–2
- **Allowed scope:** `README.md`, tests, `plans/HANDOFF.md`, plan archive.
- **Acceptance criteria:** README lists only four current perks and describes storyteller battle reactions; validation evidence is recorded; final `code-reviewer` review has no actionable findings.
- **Validation:** `npm test` and `npm run build`.

## Browser QA

- Load the prepared Great Hall save and open the expedition at a normal desktop viewport and a short desktop viewport (about 1280×720).
- Compare at least three map-node labels and the selected card against their battle forecast power, including a locked/deeper node.
- Win one battle and lose/retry one battle; verify the storyteller modal appears with correct outcome copy and does not reopen after dismissal or ordinary rerender/navigation.
- Reach the defeat/victory legacy dialog and verify exactly four perk cards, correct descriptions, purchase behavior, and no old choices.
- Confirm wheel/trackpad scrolling over the right rail reveals all cards while the map height and overall page remain fixed; check browser console for errors.

## Risks and rollback

- **Risk:** old paid perk levels disappear without refund. **Decision:** preserve XP balances and current perks, ignore obsolete keys; do not invent refund economics without authorization.
- **Risk:** `lastBattle` alone can replay dialogue after reload. Prefer a UI session marker keyed by battle result; add persisted acknowledgement only if reload semantics explicitly require it.
- **Rollback:** revert only files changed for this plan; retain prior balance and prepared-save work.
