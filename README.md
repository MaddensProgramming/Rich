# Mountain Factory Idle

Mountain Factory Idle is a browser idle and management game about growing a mountain town into a small production settlement.

The current version is a playable prototype built with Vite, React, TypeScript, Phaser, Zustand, and Vitest. The game runs entirely in the browser and saves progress to `localStorage`.

## Play Online

The GitHub Pages deployment is configured for:

```text
https://maddensprogramming.github.io/Rich/
```

GitHub Pages must be enabled in the repository settings with **Source** set to **GitHub Actions** before the deployment workflow can publish the site.

## What Is Implemented

### Town and Workers

- Start with 1 worker, 8 housing capacity, money, food, and starter resources.
- Hire workers with money.
- Upgrade housing with wood and stone.
- Assign workers across six buildings.
- Food is consumed by workers over time.
- If food runs out, production drops to 25%.
- Worker output uses diminishing returns, so additional workers help but are less efficient when stacked into one building.

### Buildings and Production

The prototype includes six buildings:

- Mine
- Lumberjack
- Farm
- Food Maker
- Smelter
- Blacksmith

Implemented production chains:

- Mine produces coal, iron ore, and stone.
- Lumberjack produces wood.
- Farm produces vegetables.
- Food Maker turns vegetables into food.
- Smelter turns iron ore and coal into iron bars.
- Blacksmith turns iron bars into swords or wood into bows.

The Mine supports these recipes:

- Coal Focus
- Iron Focus
- Stone Focus
- Balanced Mining

The Blacksmith supports these recipes:

- Forge Swords
- Craft Bows

Each building can be upgraded to level 5 by spending resources. Higher levels improve production.

### Resources

Implemented resources:

- Vegetables
- Food
- Wood
- Stone
- Coal
- Iron Ore
- Iron Bars
- Bows
- Swords

Money is tracked separately from physical resources.

### Market

- All resources can be bought and sold.
- Buy prices are 10% higher than sell prices.
- Buying raises market pressure and prices.
- Selling lowers market pressure and prices.
- Market pressure drifts back toward normal over time.
- Market pressure is clamped between 0.25x and 4x.
- Optional auto-buy and auto-sell rules can be configured per resource.
- Auto-market rules include thresholds and batch sizes.

### Library and Books

- Book packs cost $120 and contain 3 random books.
- Book pack rarity odds currently produce Common, Uncommon, and Rare books.
- Books are specific to buildings.
- Each building can equip up to 2 books.
- Duplicate books can be upgraded at a rate of 5 copies into 1 copy of the next rarity.
- Rarities are Common, Uncommon, Rare, Epic, and Legendary.

Implemented book effects include:

- Resource output multipliers.
- Input cost reductions.
- Worker efficiency improvements.
- Food consumption reduction.
- Reduced market impact for weapon sales.

### Save, Load, and Offline Boost

- The game saves to browser `localStorage`.
- Saves include resources, money, workers, housing, buildings, recipes, market state, market automation, books, equipped books, offline charge, and timestamps.
- The app autosaves every 10 seconds and before page unload.
- Closing or pausing the game earns offline charge.
- Offline charge is capped from up to 8 hours away.
- Offline charge can be spent as a 5x speed boost.
- A full offline charge provides 20 minutes of boosted game time.
- Save loading sanitizes invalid or outdated data into the current save shape.

### UI

- React controls for resources, buildings, market, library, and town state.
- Phaser town view with clickable buildings.
- Building panel with worker assignment, recipe selection, production stats, upgrade costs, blocked-production messages, and equipped books.
- Market panel with prices, pressure, manual trades, and automation controls.
- Library panel with book pack opening, owned books, equip controls, and upgrades.
- Town panel for worker hiring, housing upgrades, food usage, offline boost activation, reset, and manual save controls.

### Tests

Vitest covers the simulation and economy behavior. Current test command:

```bash
npm test
```

## Local Development

Install dependencies:

```bash
npm install
```

Run the dev server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Run tests:

```bash
npm test
```

## Architecture Notes

Simulation logic is kept separate from React and Phaser.

- `src/simulation/` contains deterministic game rules, save shape handling, tick logic, market math, books, workers, housing, food, and offline boost behavior.
- `src/data/` contains resource, building, recipe, and book definitions.
- `src/store/` connects the simulation layer to Zustand and browser storage.
- `src/ui/` contains React panels and controls.
- `src/game/` contains the Phaser town scene.

UI code should display state and dispatch actions. Production rules, market math, food penalties, books, save/load shape, and offline boost behavior should stay in the simulation layer.

## Not Yet Implemented

The prototype does not yet include:

- A tutorial or onboarding flow.
- Long-term unlock progression beyond the first six buildings.
- Additional book packs for Epic and Legendary targeting.
- Custom art or animation beyond the current town view.
- Cloud saves or account-based progress.
- Advanced balancing pass for late-game pacing.
