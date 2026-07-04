# St. Moritz

St. Moritz is a browser idle and management game about rebuilding a mountain settlement through finite campaign chapters.

St. Moritz is a finite, chapter-based browser management game. It uses Vite, React, TypeScript, Phaser, Zustand, and Vitest. The game runs entirely in the browser and saves progress to `localStorage`.

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
- The first upgrade project is **Upgrade to Hamlet**, which requires delivering 40 wood and 35 stone.
- Upgrade projects use strict per-resource requirements: each project lists the exact amounts of resources (and sometimes money) that must be delivered. Deliveries are clamped so the player can never over-deliver, and the project advances only when every line is fully met.
- Filling a project does not auto-advance the chapter. The player chooses when to advance.
- Hamlet, Village, Mountain Town, and the Great Hall project are defined in data for the campaign path.
- Requirements are tuned with the worker-second effort model in `src/simulation/balance.ts`, which keeps every requirement line meaningful (between 8% and 60% of a project's total effort), keeps total effort rising each chapter, and reports strong or weak recipe and book value production.
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
- Stonemason (Mountain Town only)

Implemented production chains include:

- Mine produces stone in Arrival, then coal, iron ore, and stone in later chapters.
- Logging Camp produces wood once constructed, and can saw wood into planks in Mountain Town.
- Farm produces vegetables.
- Food Maker turns vegetables into food.
- Smelter turns iron ore and coal into iron bars.
- Blacksmith turns iron bars into swords, wood into bows, or iron bars and planks into tools.
- Stonemason dresses stone and tools into stone blocks for the final Great Hall project.

The Mountain Town chapter adds a finished-goods tier: planks (from wood), tools (iron bars + planks), and stone blocks (stone + tools). The Great Hall demands these refined goods, so the final stage forces the player to balance the whole production pyramid and use the multi-recipe slots to split buildings between raw and finished output.

Buildings that reach level 3 and have at least two recipes available in the current chapter unlock a second recipe slot. A worker-split slider divides the building's workers between the primary and secondary recipe so one building can run two production chains at once.

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
- Planks (Mountain Town finished good)
- Tools (Mountain Town finished good)
- Stone Blocks (Mountain Town finished good)

Money is tracked separately from physical resources. Resource definitions include compact fallback labels, while the React UI renders stylized SVG resource icons in the resource bar, contracts, gathering UI, and project delivery rows.

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
- Library cards are grouped by building, with "Upgrade All" per building and an "Upgrade All Possible" control for the whole library.
- Book effects are ignored until the library system is unlocked.

### Storyteller

- Elder Bertram, a painted town chronicler, narrates each chapter and the final victory.
- His dialogue introduces the new stage and states the current upgrade goal.
- The storyteller opens automatically on a new chapter and on campaign completion, and can be reopened from the campaign strip.
- Seen chapters and the victory message are tracked in saved campaign state so intros are not repeated.

### Contracts

- Town requests unlock in Village and continue into Mountain Town.
- Each contract lists required goods and pays money, sometimes plus a book reward.
- The finite contract queue contains 10 total contracts and shows at most 2 available offers at a time.
- Accept a contract to track it, deliver when goods are in stock, or abandon it.
- Contracts give weapons and surplus goods a midgame purpose and a money sink.

### Save, Load, And Offline Boost

- The game saves to browser `localStorage` under `st-moritz-save-v2`.
- The previous `mountain-factory-idle-save-v1` key is still read as a legacy fallback.
- Save loading sanitizes invalid or outdated data into the current save shape.
- Saves include campaign state, resources, money, workers, housing, buildings, recipes, market state, books, offline charge, and timestamps.
- Offline boost is locked in Arrival and unlocks after the settlement reaches Hamlet.
- Closing or pausing the game earns offline charge only after offline boost is unlocked.

### UI

- React displays resources, popups, market, library, contracts, town controls, and campaign project progress.
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
- Arrival project delivery does not auto-advance the chapter.
- Resource and money deliveries are clamped so a project can never be over-delivered.
- Save/load preserves campaign state.
- Legacy saves migrate into a valid chapter state.
- Hamlet food production works after construction.
- Market and library actions respect chapter locks.
- Storyteller seen-chapter and victory tracking survive save/load.
- Library upgrade-all and upgrade-all-possible promote duplicates correctly.
- Contracts unlock by chapter, show up to two offers at a time, consume goods, and grant money and book rewards.
- Contract balance checks keep the finite queue at 10 requests and prevent money rewards from falling below market sell value unless book rewards offset part of the value.
- The balance model keeps every project requirement line between 8% and 60% of total effort, with total effort rising each chapter, and includes per-recipe and book value production diagnostics.

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

- `src/simulation/` contains deterministic game rules, campaign state, save shape handling, tick logic, market math, books, workers, housing, food, offline boost behavior, and the worker-second balance model (`balance.ts`) used to tune project requirements.
- `src/data/` contains resource, building, recipe, book, and chapter project definitions.
- `src/store/` connects the simulation layer to Zustand and browser storage.
- `src/ui/` contains React panels, resource bars, contextual popups, and controls.
- `src/game/` contains the Phaser town scene and hotspot rendering.

UI code should display state and dispatch actions. Production rules, chapter advancement, market math, food penalties, books, save/load shape, and offline boost behavior should stay in the simulation layer.

## Not Yet Implemented

- Dedicated chapter-specific town artwork.
