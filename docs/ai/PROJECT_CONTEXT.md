# St. Moritz Project Context

Keep this document durable and concise. `README.md` remains the detailed product and implementation source of truth.

## Project summary

- **Product:** Desktop browser idle/management game about rebuilding St. Moritz, campaigning beyond the pass, and carrying Experience into later settlements.
- **Runtime:** React UI plus Phaser town rendering, backed by a Zustand store and deterministic TypeScript simulation.
- **Persistence:** Browser `localStorage`, current key `st-moritz-save-v3`, with legacy-key migrations.

## Architecture map

| Component | Path | Responsibility |
|---|---|---|
| Simulation | `src/simulation/` | Rules, deterministic transitions, serializable state, hydration, time, combat, balance, and optimizers |
| Game data | `src/data/` | Resources, buildings, recipes, chapters, troops, map nodes, books, contracts, and perks |
| Store | `src/store/` | Thin Zustand and browser-persistence integration |
| React UI | `src/ui/` | Panels, controls, popups, resource display, and action dispatch |
| Phaser | `src/game/` | Town scene, hotspots, props, and visual runtime lifecycle |
| Styling/assets | `src/styles.css`, `src/assets/` | Desktop presentation and visual assets |
| Tooling | `scripts/` | Progression simulation and policy optimization entry points |

## Important boundaries

- Rules and serializable state belong in `src/simulation/`; UI and Phaser render state and dispatch actions.
- Data definitions should remain tunable and separate from runtime presentation.
- Simulation should prefer pure functions and explicit time inputs.
- Save hydration must sanitize partial or outdated data and preserve compatibility unless an explicit migration changes it.
- Avoid mobile-specific layout and touch work unless requested.
- GitHub Pages deployment and any action affecting external systems require explicit scope.

## Commands

- **Focused test:** `npx vitest run <test-file>`
- **Full test:** `npm test`
- **Type/static and production build:** `npm run build`
- **Progression simulation:** `npm run simulate:progression`
- **Policy optimizer:** `npm run optimize:progression`
- **Final integration check:** `npm test` followed by `npm run build`

There is no separate formatting command. Match existing TypeScript, React, and CSS style.

## Definition of done

- Acceptance criteria are satisfied with no unrelated changes.
- Rules remain in the simulation layer and relevant focused tests pass.
- `npm test` and `npm run build` pass after relevant changes.
- Save compatibility and browser-time effects are reviewed when affected.
- Gameplay, architecture, setup, deployment, or testing changes are reflected in `README.md`.
- Completion claims cite directly observed evidence.
