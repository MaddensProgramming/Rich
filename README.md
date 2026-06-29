# St. Moritz

St. Moritz is a browser idle and management game about rebuilding a mountain settlement through finite campaign chapters.

The current version is a playable first cut of the gameplay overhaul. It uses Vite, React, TypeScript, Phaser, Zustand, and Vitest. The game runs entirely in the browser and saves progress to `localStorage`.

## Play Online

The GitHub Pages deployment is configured for:

```text
https://maddensprogramming.github.io/Rich/
```

GitHub Pages must be enabled in the repository settings with **Source** set to **GitHub Actions** before the deployment workflow can publish the site.

## What Is Implemented

### Campaign Chapters

- New saves start in Chapter 1, Arrival.
- Arrival begins with 1 worker, no constructed buildings, a larger starter food cushion, manual gathering, and finite clearing pools for wood, stone, and vegetables.
- The first upgrade project is **Upgrade to Hamlet** with 75 progress required.
- Wood and stone can be contributed to the Arrival project.
- Filling a project does not auto-advance the chapter. The player chooses when to advance.
- Hamlet, Village, Mountain Town, and the Great Hall project are defined in data for the campaign path.
- Campaign state is owned by the simulation layer and saved with the rest of the game.

### Manual Gathering And Construction

- Arrival supports manual actions for chopping wood, gathering stone, and foraging vegetables.
- Manual gathering adds 1 resource per click and consumes the matching finite clearing pool.
- Buildings start unconstructed and must be built before workers can be assigned or production can run.
- Arrival exposes the Mine Entrance and Logging Camp as the first buildable sites.
- Farm and Cookhouse unlock in Hamlet.
- Smelter, Blacksmith, Market, and Library are staged behind later chapter systems.

### Town And Workers

- Workers consume food over time.
- If food runs out, production drops to 25%.
- Worker output uses diminishing returns, so extra workers help but are less efficient when stacked into one building.
- Workers can be hired and housing can be expanded once the player can afford it.

### Buildings And Production

The current production building set is:

- Mine
- Lumberjack / Logging Camp
- Farm
- Food Maker / Cookhouse
- Smelter
- Blacksmith

Implemented production chains include:

- Mine produces stone in Arrival, then coal, iron ore, and stone in later chapters.
- Logging Camp produces wood once constructed.
- Farm produces vegetables.
- Food Maker turns vegetables into food.
- Smelter turns iron ore and coal into iron bars.
- Blacksmith turns iron bars into swords or wood into bows.

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

Money is tracked separately from physical resources. Resource definitions include compact icon labels for the top resource bar and contribution UI.

### Market

- The market is locked until its chapter system unlocks.
- All resources can be bought and sold once the market is available.
- Buy prices are 10% higher than sell prices.
- Buying raises market pressure and prices.
- Selling lowers market pressure and prices.
- Market pressure drifts back toward normal over time.
- Optional auto-buy and auto-sell rules can be configured per resource once market access is unlocked.

### Library And Books

- The library is locked until Village.
- Book packs cost $120 and contain 3 random books once unlocked.
- Books are specific to buildings.
- Each building can equip up to 2 books.
- Duplicate books can be upgraded at a rate of 5 copies into 1 copy of the next rarity.
- Book effects are ignored until the library system is unlocked.

### Save, Load, And Offline Boost

- The game saves to browser `localStorage` under `st-moritz-save-v2`.
- The previous `mountain-factory-idle-save-v1` key is still read as a legacy fallback.
- Save loading sanitizes invalid or outdated data into the current save shape.
- Saves include campaign state, resources, money, workers, housing, buildings, recipes, market state, books, offline charge, and timestamps.
- Offline boost is locked in Arrival and unlocks after the settlement reaches Hamlet.
- Closing or pausing the game earns offline charge only after offline boost is unlocked.

### UI

- React displays resources, popups, market, library, town controls, and campaign project progress.
- Phaser renders the town backdrop and clickable town hotspots.
- The town image is now the main interaction layer, with generated stage-specific backdrops for Arrival, Hamlet, Village, and Mountain Town.
- Clicking a hotspot opens one contextual popup at a time.
- Escape or the close button dismisses the popup.
- The top bar keeps critical status visible.
- The project strip shows the current chapter, project progress, and selected hotspot.

### Tests

Vitest covers the current campaign and economy behavior:

- Fresh saves start in Arrival with no constructed buildings.
- Manual gathering and finite clearing pools work.
- Buildings cannot produce before construction.
- Arrival project contribution does not auto-advance the chapter.
- Save/load preserves campaign state.
- Legacy saves migrate into a valid chapter state.
- Hamlet food production works after construction.
- Market and library actions respect chapter locks.

Current test command:

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

- `src/simulation/` contains deterministic game rules, campaign state, save shape handling, tick logic, market math, books, workers, housing, food, and offline boost behavior.
- `src/data/` contains resource, building, recipe, book, and chapter project definitions.
- `src/store/` connects the simulation layer to Zustand and browser storage.
- `src/ui/` contains React panels, resource bars, contextual popups, and controls.
- `src/game/` contains the Phaser town scene and hotspot rendering.

UI code should display state and dispatch actions. Production rules, chapter advancement, market math, food penalties, books, save/load shape, and offline boost behavior should stay in the simulation layer.

## Not Yet Implemented

- Contracts and town requests.
- Multi-recipe production slots.
- Grouped book-card library polish and upgrade-all controls.
- Dedicated chapter-specific town artwork.
- Final victory popup polish.
- Additional late-game resources beyond the current production chains.
- Full balance pass for the 1.5 to 2 hour campaign target.
