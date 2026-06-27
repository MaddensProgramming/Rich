# Codex Project Guidance

## Project

Mountain Factory Idle is a browser idle/management game. Use `mountain_factory_idle_design.md` as the product source of truth until a fuller implementation exists.

Recommended stack:

- Phaser for the town/game canvas.
- React for UI panels and controls.
- TypeScript for game and app logic.
- Vite for local development.
- Zustand or another lightweight store for shared state.
- Vitest for simulation and economy tests.

Keep simulation logic separate from React and Phaser. UI code may display state and dispatch actions, but production rules, market math, food penalties, books, save/load shape, and offline boost behavior belong in the simulation layer.

## Useful Subagents

Custom project agents live in `.codex/agents/`.

Use subagents only when the task benefits from parallel or specialized work:

- `economy-simulation`: simulation rules, economy balance, deterministic tick logic, data definitions, and economy tests.
- `game-ui`: React/Phaser UI, layout, player controls, visual state, and frontend integration.
- `persistence-qa`: read-only review of save/load, offline progress, browser time edge cases, and storage migrations.
- `code-reviewer`: read-only implementation review focused on correctness, architecture boundaries, maintainability, and missing tests.

Good prompts:

- "Spawn `economy-simulation` and `game-ui` in parallel to inspect the plan, then summarize conflicts before implementing."
- "Use `persistence-qa` to review the save/offline implementation and wait for its findings."
- "After implementation, run `code-reviewer` and summarize only material issues."

Avoid spawning subagents for small single-file edits. Prefer read-heavy or review-heavy delegation first, and keep write-heavy work coordinated through the parent agent.

