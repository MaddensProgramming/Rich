# St. Moritz

St. Moritz is a browser idle and management game about rebuilding a mountain settlement, campaigning beyond the pass, and carrying hard-won Experience into faster future settlements.

The game combines a finite chapter-based town campaign with a repeatable expedition and legacy loop. It uses Vite, React, TypeScript, Phaser, Zustand, and Vitest, runs entirely in the browser, and saves progress to `localStorage`.

The project currently targets desktop browsers only. Mobile layout and touch-first ergonomics are not a product focus.

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
- Hamlet, Village, Mountain Town, and the Great Hall project are defined in data for the campaign path. The Hamlet-to-Village milestone requires 160 wood, 160 stone, 53 food, and 80 coal.
- Requirements are tuned with the worker-second effort model in `src/simulation/balance.ts`, which keeps every requirement line meaningful (between 8% and 60% of a project's total effort), keeps total effort rising each chapter, and reports strong or weak recipe and book value production.
- A deterministic baseline-player simulator runs the real construction, hiring, trading, production, food, contracts, library books, offline boost, and project-delivery rules at configurable decision intervals. It reports chapter duration, the last requirement completed, inherited stockpiles, systems used, and model-versus-playtest timing drift.
- Campaign state is owned by the simulation layer and saved with the rest of the game.

### Beyond the Pass

- Completing the Great Hall unlocks Act II and a switchable mountain map while the original town remains available for production.
- A dedicated Barracks can be constructed for 100 wood, 80 stone, and 20 tools.
- Unassigned workers can enlist as militia, archers, or guards. Military equipment is now a major production commitment: militia cost 30 food, 6 tools, and $50; archers cost 40 food, 4 bows, 2 tools, and $100; guards cost 60 food, 4 swords, 8 iron bars, 2 tools, and $200.
- Enlisted troops remain part of the population used to price new worker hires. Turning townspeople into soldiers therefore no longer lowers the worker price and cannot be used to refill the town cheaply.
- The map contains 12 branching locations. Securing prerequisite locations opens deeper routes and grants one-time resources and money.
- Battles are deterministic: the UI shows exact army power, enemy power, the expected result, and expected casualties before the player commits.
- Losing a map battle costs troops but does not end the run; the location can be attempted again after rebuilding.

### Sonnenburg Raid And Invasion

- Sonnenburg is the final map location and is explicitly presented as a point of no return.
- A successful raid grants $5,000, a large military stockpile, a legendary Weapon Contracts book, and the Crown of the Pass, which adds 25% army power for the rest of that run.
- Only winning the Sonnenburg raid triggers the Northern Host invasion. Losing the raid does not start it.
- The invasion advances over four real-time minutes. Offline Boost accelerates production but does not shorten the warning.
- The Northern Host is a real deterministic final battle with 2,200 power. A first-run victory is technically possible but requires roughly 93 Crown-boosted guards, making it wildly impractical without legacy progression.
- A maximum Battle Wisdom legacy reduces the approximate requirement to 53 guards, making victory a demanding long-term objective rather than a scripted impossibility.
- Equipping the roughly 93 Crown-boosted guards needed for a first-run victory now costs about 5,580 food, 372 swords, 744 iron bars, 186 tools, and $18,600 before replacing campaign casualties.
- The player can inspect the exact final-stand result and casualties before committing, or prepare an evacuation caravan with food, wood, and tools and leave without fighting.
- Losing the final stand ends the run in escape and still awards Experience. Winning leaves St. Moritz standing, awards $25,000 and 20 bonus Experience, and permanently ends that invasion.
- If the invasion timer expires before either choice, the town falls automatically.

### Experience And New Settlements

- Defeat awards Experience based on map progress, securing the Crown, and preparing the evacuation.
- Experience is never awarded twice for the same run and can be saved or spent before beginning the next settlement.
- Four permanent perks have five levels each: Pioneering Spirit adds starting workers, Prepared Stores adds starting supplies, Merchant Contacts adds starting money, and Battle Wisdom increases army power.
- Beginning another settlement resets the town, campaign, Barracks, army, and map while preserving Experience, perk levels, total Experience, and run number.
- The normal hard-reset control still erases all progress, including the legacy.

### Manual Gathering And Construction

- Arrival supports manual resource props for wood, stone, and berries layered directly over the town picture.
- Clicking a resource prop adds 1 matching resource, shows a floating +1, and consumes the matching finite clearing pool.
- Each visible resource prop represents a 10-click cache. When its cache is exhausted, it disappears; if that clearing pool still has resources left, the next cache appears elsewhere on the town picture.
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

Money is tracked separately from physical resources. Resource definitions include compact fallback labels, while the React UI renders stylized SVG resource icons in the resource bar, contracts, and project delivery rows. Manual gathering uses bitmap resource prop art on the Phaser town layer.

### Market

- The market is locked until its chapter system unlocks.
- All resources can be bought and sold once the market is available.
- Buy prices are 10% higher than sell prices.
- Buying raises market pressure and prices.
- Selling lowers market pressure and prices.
- Market pressure drifts back toward normal over time.
- Optional auto-buy and auto-sell rules can be configured per resource once market access is unlocked.
- The progression optimizer reports repeatable batch sell/buy profit separately. With the current pre-impact batch pricing, a sufficiently large sale followed by a matching purchase can return the same stock at a profit; this is treated as a balance warning, not silently counted as ordinary production.

### Library And Books

- The library is locked until Village.
- Book packs cost $120 and contain 3 random books once unlocked.
- The library also offers a buy-10-packs control for $1,200.
- Each building has exactly 2 building-specific book titles.
- The best owned rarity of each building book is equipped automatically, up to one copy of each title.
- Duplicate books can be upgraded at a rate of 5 copies into 1 copy of the next rarity.
- Library cards are grouped by building and show one tile per title, per-rarity ownership counts, and the tile color of the highest owned rarity.
- Library cards include "Upgrade All" per building and an "Upgrade All Possible" control for the whole library.
- Book effects are ignored until the library system is unlocked.

### Storyteller

- Elder Bertram, a painted town chronicler, narrates each chapter and the final victory.
- His dialogue introduces the new stage and states the current upgrade goal.
- Selected expedition victories and defeats now include short character reactions in the latest-battle report.
- The storyteller opens automatically on a new chapter and when the Great Hall reveals the mountain campaign, and can be reopened from the campaign strip.
- Seen chapters and the victory message are tracked in saved campaign state so intros are not repeated.

### Contracts

- Town requests unlock in Village and continue into Mountain Town.
- Each contract lists required goods and pays money, sometimes plus a book reward.
- The finite contract queue contains 10 total contracts and shows at most 2 available offers at a time.
- Accept a contract to track it, deliver when goods are in stock, or abandon it.
- Contracts give weapons and surplus goods a midgame purpose and a money sink.

### Save, Load, And Offline Boost

- The game saves to browser `localStorage` under `st-moritz-save-v3`.
- The previous `st-moritz-save-v2` and `mountain-factory-idle-save-v1` keys are still read as migration fallbacks.
- Save loading sanitizes invalid or outdated data into the current save shape.
- Saves include campaign, expedition, invasion, Experience, resources, money, workers, housing, buildings, recipes, market, books, offline charge, and timestamps.
- Offline boost is locked in Arrival and unlocks after the settlement reaches Hamlet.
- Closing or pausing the game earns offline charge only after offline boost is unlocked.
- Once Sonnenburg has been raided, elapsed wall time also advances the invasion across background tabs and reloads.

### UI

- React displays resources, popups, market, library, contracts, town controls, and campaign project progress.
- Phaser renders the town backdrop, clickable town hotspots, and clickable manual gathering props.
- The town image is now the main interaction layer, with generated stage-specific backdrops for Arrival, Hamlet, Village, and Mountain Town. Hamlet uses a dedicated early-settlement scene aligned to its mine, logging, farm, cookhouse, market, and project hotspots.
- Clicking a hotspot opens one contextual popup at a time. Clicking wood, stone, or berry props gathers directly without opening a popup.
- Escape or the close button dismisses the popup.
- Translucent building labels on the town image, building cards, and building popups include + and - worker buttons for direct assignment.
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
- Save/load preserves the Barracks, army, map, invasion, evacuation, and permanent Experience state.
- Legacy saves migrate into a valid chapter state.
- Hamlet food production works after construction.
- Market and library actions respect chapter locks.
- Storyteller seen-chapter and victory tracking survive save/load.
- Library pack batches, automatic best-book equipment, upgrade-all, and upgrade-all-possible promote duplicates correctly.
- Contracts unlock by chapter, show up to two offers at a time, consume goods, and grant money and book rewards.
- Barracks construction and troop training respect their gates and exact costs, and enlisted troops cannot reduce subsequent worker hire prices.
- Battle previews match deterministic outcomes and map rewards cannot be collected twice.
- Only a successful Sonnenburg raid starts the invasion and awards the unique treasure.
- The invasion uses real seconds even during Offline Boost.
- The final-stand preview exactly matches its casualties and outcome; first-run armies lose while a sufficiently developed legacy army can win.
- Final-stand defeat, voluntary evacuation, timer defeat, and true victory each award their intended one-time outcomes.
- Defeat awards Experience once, perks affect the next settlement, and the next-run reset preserves legacy progress.
- Contract balance checks keep the finite queue at 10 requests and prevent money rewards from falling below market sell value unless book rewards offset part of the value.
- The balance model keeps every project requirement line between 8% and 60% of total effort, with total effort rising each chapter, and includes per-recipe and book value production diagnostics.
- The baseline progression simulator completes the campaign deterministically, records inherited stockpiles and bottlenecks, targets the observed 12/24/40-worker growth profile, and retains active-play timestamps for direct model-versus-playtest comparisons.
- The goal planner recursively expands project, construction, housing, food, troop, and money needs through the live recipe graph, then assigns workers to reduce the longest projected production bottleneck.
- The first-invasion simulator builds the Barracks, equips an army using current troop costs and power, clears all 12 map locations, and records the time Sonnenburg starts the invasion.
- The policy optimizer searches check-in intervals, worker targets, book purchases, contract timing, production policies, and allowed market actions under a 60-actions-per-minute assumption. Regression coverage keeps the current-rules result below the 2,000-second playtest benchmark and explicitly verifies when that result depends on market round trips.

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

Run the baseline progression simulation:

```bash
npm run simulate:progression
```

The default policy checks the town every 60 seconds, makes up to eight construction, hiring, housing, or building-upgrade investments, and performs 12 manual clearing actions while those pools remain. Its goal planner re-evaluates the current project, buildings, housing, food reserve, contracts, and money need on every check-in; expands finished goods into all recipe inputs; equips purchased books automatically; and reallocates recipes and workers toward the projected bottleneck. It targets 12 workers in Hamlet, 24 in Village, and 40 in Mountain Town, completes all 10 contracts before project delivery, and buys 5 deterministic book packs.

The July 2026 active-play benchmark is Hamlet completed at 520 seconds with 12 workers, Village at 1,300 seconds with 24 workers, the Great Hall at 1,800 seconds with 40 workers, and the first invasion at 2,000 seconds. The baseline report displays those observed timestamps beside its own result; the current conservative 12/24/40 policy completes the Great Hall in about 52 minutes. It is useful as a stable comparison, not as a fastest-player estimate. Fresh runs begin with zero offline charge; earned charge can be supplied explicitly for comparison.

Alternative check-in and manual-play assumptions can be compared without editing code:

```bash
npm run simulate:progression -- --interval=120 --manual-actions=6 --max-investments=4 --book-packs=3 --offline-charge=1200 --max-hours=8
```

Search for faster human-scale policies and simulate them through the first invasion:

```bash
npm run optimize:progression
```

The optimizer prints two leaderboards against the same live game data. The normal-economy search disables repeatable sell/buy round trips; its current best reaches the Great Hall at 31m40s and the invasion at 37m00s with 6/12/16 workers. The fastest current-rules search reaches the Great Hall at 28m20s and the invasion at 31m00s with 8/16/24 workers, 10 book packs, and two completed contracts. That sub-2,000-second result makes about $26,944 through repeatable batch market round trips, so it demonstrates a real balance exploit rather than a sustainable production pace. Both results are heuristic upper-quality player policies, not mathematical proofs of the global optimum.

## Architecture Notes

Simulation logic is kept separate from React and Phaser.

- `src/simulation/` contains deterministic game rules, campaign and expedition state, combat previews and results, invasion/Experience rules, save shape handling, tick logic, market math, books, workers, housing, food, offline boost behavior, the worker-second balance model (`balance.ts`), the baseline campaign simulator (`progressionSimulator.ts`), the recursive goal planner (`productionPlanner.ts`), the first-invasion simulator (`invasionSimulator.ts`), and the policy search (`policyOptimizer.ts`).
- `src/data/` contains resource, building, recipe, book, chapter project, troop, map node, and Experience perk definitions.
- `src/store/` connects the simulation layer to Zustand and browser storage.
- `src/ui/` contains React panels, resource bars, contextual popups, and controls.
- `src/game/` contains the Phaser town scene and hotspot rendering.

UI code should display state and dispatch actions. Production rules, chapter advancement, market math, food penalties, books, save/load shape, and offline boost behavior should stay in the simulation layer.
