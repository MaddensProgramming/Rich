# St. Moritz Project Guidance

Use `README.md` as the product and implementation source of truth.

- Build for desktop browsers with React, Phaser, TypeScript, Vite, Zustand, and Vitest. Do not add mobile-specific work unless requested.
- Keep game rules and serializable state in `src/simulation/`. React and Phaser should only display state and dispatch actions.
- Run `npm test` and `npm run build` after relevant changes.
- Update `README.md` when gameplay, architecture, setup, deployment, or testing behavior changes.

Custom agents live in `.codex/agents/`: `economy-simulation` and `game-ui` can implement focused changes; `persistence-qa` and `code-reviewer` are read-only reviewers. Delegate only when specialization or parallel review is useful, and keep overlapping write work with the parent agent.
