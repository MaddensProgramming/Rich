# St. Moritz Story Overhaul Plan

## Direction

Shift St. Moritz from open-ended idle progression into a finite chapter-based management game.

The player should feel like they are rebuilding and expanding a mountain settlement through clear story goals:

1. Arrive at an empty mountain site.
2. Gather basic resources by hand.
3. Build the first core structures.
4. Upgrade the settlement into a working town.
5. Unlock more complex production and trade.
6. Complete a final town-scale project, then either win or unlock later chapters.

This should preserve the current strengths:

- The painted town image remains the emotional center of the game.
- Phaser keeps handling the town scene.
- React handles popups, resource bars, menus, library, market, and story panels.
- Simulation logic remains separate from React and Phaser.
- The existing buildings, resources, books, market, save/load, and offline boost should be reused where possible.
- Each chapter has one clear town-upgrade progress amount to work toward, not a checklist of separate required objectives.

## UI Timing Recommendation

Do the UI overhaul together with the gameplay overhaul, but in two layers.

First, implement a structural UI pass before or during Chapter 1:

- Make the town picture larger.
- Move building interaction into click targets on the picture.
- Replace the large right-side control panel with contextual popups.
- Keep resources and critical status at the top.
- Add current chapter and town-upgrade progress display.

This is worth doing early because the new design depends on buildings appearing, unlocking, and being clicked in the scene. If the gameplay plan is implemented first using the current panel-heavy UI, a lot of work will be thrown away.

Second, polish specialized UI after the new chapter loop works:

- Resource icons.
- Book-shaped library cards.
- Book detail popups.
- Grouped book rarities.
- Upgrade-all buttons.
- Trade popup and market automation cleanup.
- Better visual states for locked, available, active, blocked, and completed buildings.

This avoids over-polishing old systems before the new progression shape is proven.

## Target Game Shape

### Session Length

Initial target for the first complete version:

- Chapter 1: 5-10 minutes.
- Chapter 2: 20-35 minutes.
- Chapter 3: 30-60 minutes.
- Total first-play win: about 1.5-2 hours.

The goal is not infinite scaling. The goal is a satisfying first campaign that can later be expanded with more chapters.

### Core Loop

The loop changes from "optimize forever" to "solve the current settlement goal."

1. Read the current town project.
2. Click available town locations to gather, build, assign workers, or inspect production.
3. Produce goods and improve the town at the player's chosen pace.
4. Spend goods on buildings, upgrades, contracts, books, or contributions to the current town-upgrade project.
5. Advance the town stage when the single upgrade project is filled and the player presses the upgrade button.
6. Unlock new art state, buildings, recipes, story text, and a new upgrade project.

Important rule:

- Advancing a chapter should be optional once affordable. If the player wants to stay longer in a stage, upgrade buildings, stockpile resources, buy books, or tune production before advancing, the game should allow it.

### Win Condition

For the first campaign, use a concrete town project:

> Build a self-sufficient mountain town and complete the Great Hall.

The Great Hall can require advanced goods from every major chain:

- Food surplus.
- Stone and wood.
- Iron bars.
- Swords and bows.
- Money or trade reputation.
- A small number of rare/epic book upgrades or knowledge points.

After completing it, show a victory popup and allow continued play.

## Chapter Structure

### Chapter 1: Arrival

Fantasy:

The player arrives at a quiet mountain clearing with a few settlers and no real infrastructure.

Town art:

- Use the current image if necessary, but visually treat only the forest, mountain, and clearing as active.
- Later, this chapter can get a simpler "empty clearing" backdrop.

Starting state:

- No buildings constructed.
- 1 worker.
- Very little money.
- No market.
- No library.
- No automation.
- No offline boost until the town is established.

Available actions:

- Chop wood.
- Gather loose stone.
- Gather berries or vegetables.
- Build a logging camp.
- Build a mine entrance.

Suggested resources:

- Wood.
- Stone.
- Vegetables.
- Food.

Town-upgrade project:

- Upgrade to Hamlet.
- Example target: 75 Hamlet Progress.
- Example contributions: wood and stone can be contributed to the project.
- This is the only required chapter advancement target.
- Building the Logging Camp and Mine Entrance should make the progress target practical, but the player can keep gathering and building before advancing.

Implementation notes:

- Add a stage/progression state to the simulation.
- Add locked/unbuilt/active building states.
- Add manual gather actions for early resources.
- Make the first-stage hand-choppable wood a finite local resource, such as `fallen_timber` or a fixed clearing wood pool. After it is exhausted, sustained wood production must come from the Logging Camp.
- Existing Lumberjack can become "Logging Camp" in this stage.
- Existing Mine can begin as "Mine Entrance" with only stone output, then unlock coal and iron later.

### Chapter 2: Hamlet

Fantasy:

The clearing becomes a small working settlement. Workers can be assigned, food matters, and the first production chains come online.

Town art:

- Current town image works well here.
- Labels can change to more grounded early names.

Unlocked systems:

- Worker hiring.
- Housing upgrades.
- Lumber production.
- Mining stone, coal, and iron ore.
- Farming.
- Food making.
- Basic market selling and buying.

Buildings:

- Logging Camp.
- Mine.
- Farm.
- Cookhouse.
- Town Hall.

Town-upgrade project:

- Upgrade to Village.
- Example target: 450 Village Progress.
- Example contributions: wood, stone, food, coal, and iron ore can be contributed to the project.
- This is the only required chapter advancement target.
- Population, housing, building levels, and farms help the player reach the progress target faster, but they are not separate hard requirements.

Friction:

- Food shortage remains meaningful.
- Housing capacity gates population.
- Market access should be useful but not solve every requirement.

Implementation notes:

- Existing Farm and Food Maker fit this stage.
- Existing food penalty should remain.
- Market may be restricted to basic resources only until Village.

### Chapter 3: Village

Fantasy:

The settlement becomes a real production town with metalworking, trade, and specialized knowledge.

Town art:

- Use a bigger or upgraded town backdrop if available.
- If not, reuse the current image with more clickable hotspots and changed labels.

Unlocked systems:

- Smelter.
- Blacksmith.
- Library.
- Book packs.
- Contracts or town requests.
- Better market options.
- More automation.

Buildings:

- Mine.
- Lumberyard.
- Farm.
- Kitchen.
- Smelter.
- Blacksmith.
- Library.
- Market.

Town-upgrade project:

- Upgrade to Mountain Town.
- Example target: 1,200 Mountain Town Progress.
- Example contributions: wood, stone, food, iron bars, weapons, and money can be contributed to the project.
- This is the only required chapter advancement target.
- Contracts, books, and higher building levels should help but not be mandatory checkboxes unless their rewards are part of the player's chosen route.

Friction:

- Smelter and blacksmith consume enough inputs that planning matters.
- Contracts create short-term pressure.
- Books support strategy but should not replace production planning.
- Market pressure should prevent buying the whole project cheaply.
- Some buildings should support two active recipes at once, so the player can split one building between outputs instead of constantly switching recipes.

Implementation notes:

- Current Smelter, Blacksmith, Library, and Market mostly fit here.
- Add contract data and actions after stage progression is working.
- Book pack odds should be reviewed so rare/epic books do not flood the midgame.

### Chapter 4: Mountain Town

Fantasy:

The town is now established, but must prove it can survive winter and build a civic center.

Town art:

- This should ideally use the largest, most detailed town image.
- Buildings should be clickable directly from the image.

Unlocked systems:

- Advanced contracts.
- Final Great Hall project.
- Optional advanced recipes.
- Optional town happiness/needs.

Possible new resources:

- Tools.
- Planks.
- Steel.
- Medicine.
- Cloth.
- Ale.
- Glass.
- Bricks.
- Charcoal.
- Herbs.
- Leather.
- Fine meals.
- Warm clothes.

This chapter can support a larger resource set than earlier chapters. It is acceptable to add many late resources and then remove or merge the ones that do not earn their complexity during balancing.

Final project:

- Complete the Great Hall.
- This is the only required campaign-completion target.
- The player can keep expanding before completing it.

Final Great Hall example:

- Target: 3,000 Great Hall Progress.
- Contributions can include wood, stone, iron bars, swords, bows, food, money, and optional late resources such as tools, planks, steel, bricks, medicine, cloth, or ale after they exist.

Victory:

- Show a story popup.
- Unlock continued play.
- Mark the save as campaign complete.
- Later chapters can continue from this state.

## Systems To Add

### Stage Progression

Add a `townStage` or `chapter` field to `GameState`.

Suggested fields:

- `chapterId`.
- `completedUpgradeProjectIds`.
- `constructedBuildings`.
- `unlockedBuildings`.
- `unlockedRecipes`.
- `unlockedSystems`.
- `campaignComplete`.

Keep this simulation-owned. React and Phaser should only display it.

### Town Upgrade Projects

Create chapter upgrade definitions in `src/data/chapterProjects.ts` or keep them on the chapter definitions.

Each chapter should expose one active upgrade project:

- A label, such as "Upgrade to Hamlet."
- A single target progress amount.
- A list of resource or money contribution rates.
- Optional story text.
- Optional unlock preview.
- The next chapter id.

The upgrade project system should support:

- Displaying progress toward the single chapter advancement amount.
- Contributing resources or money into the project.
- Advancing only when the player chooses to press the upgrade button.
- Allowing the player to remain in the current chapter after the project is complete.
- Showing story text and unlocks on advancement.

### Building Construction And Unlocking

Current buildings always exist at level 1. Change this to staged availability.

Building display states:

- Hidden.
- Visible but locked.
- Buildable.
- Constructed.
- Upgradable.

The town scene should receive this state so it can show or hide clickable hotspots.

### No Storage Limits

Do not add storage caps or overflow rules.

Players should be allowed to stay in a chapter, build up resources, overprepare, and then advance later. Friction should come from chapter project targets, production chains, construction gates, market pressure, contracts, recipe choices, and optional late-stage complexity rather than hard inventory limits.

### Manual Gathering

Chapter 1 needs direct actions before buildings exist.

Suggested actions:

- Chop wood.
- Gather stone.
- Forage vegetables.

These can be simple buttons in a "Clearing" popup or clickable areas on the scene.

Manual gathering should become less important once buildings exist.

The first-stage wood source should be finite:

- Track a clearing wood pool in campaign state.
- Each manual chop consumes from that pool and adds wood.
- When the pool is empty, wood gathering is disabled or changes to a weak fallback.
- The Logging Camp becomes the sustainable wood source.

### Contracts

Contracts are the best midgame goal system.

Contract definition:

- Required resources.
- Optional time pressure.
- Reward money.
- Reward books, reputation, or town progress.
- Minimum chapter.

Use contracts to make weapons useful before the final project.

### Multi-Recipe Production

Some buildings should be able to run two recipes at once.

Recommended rule:

- A building has one recipe slot by default.
- Later chapters or building upgrades can unlock a second recipe slot.
- Workers are split between active recipe slots.
- Each slot has its own recipe and worker allocation.
- If the player assigns no split manually, divide workers evenly.

This is especially useful for:

- Mine producing coal and iron ore at the same time.
- Blacksmith producing swords and bows at the same time.
- Late-stage advanced buildings producing basic and advanced materials together.

### Books

Keep books, but change their role:

- Books are midgame specialization rewards, not the main endgame.
- Basic packs unlock in Village.
- Better packs require contracts or chapter progress.
- Epic and Legendary books should be much harder to obtain.

Library UI improvements:

- Show each book type as one grouped book card.
- Display rarity copies inside the card.
- Use book-shaped visual cards.
- Add hover/click popup with exact effect.
- Add "Upgrade All" per book type.
- Add "Upgrade All Possible" for the whole library.

## UI Overhaul Plan

### Main Layout

Target layout:

- Top resource/status bar.
- Large town image taking most of the screen.
- Contextual popup when clicking a building, market, library, town hall, or gather area.
- Small project/story panel that can collapse.

Avoid returning to a dashboard layout where the picture is secondary.

### Town Image

Make the picture larger and more important.

Town scene requirements:

- Use `cover` or a larger visible canvas area, not a small framed preview.
- Clickable hotspots align to meaningful areas of the art.
- Hotspots support locked, buildable, active, blocked, and completed states.
- Labels should be shorter and more visual.
- Long production details should appear in React popups, not on the canvas labels.

### Popups

Popup types:

- Building popup.
- Market popup.
- Library popup.
- Town Hall / project popup.
- Manual gathering popup.
- Story popup.
- Victory popup.

Popup rules:

- One primary popup at a time.
- Escape or close button dismisses.
- Clicking another hotspot changes popup content.
- Popups should not cover the entire town unless on mobile.

### Resource Bar

Replace long resource names with icons and compact values.

Implementation approach:

- Add an `icon` field to resource definitions.
- Use emoji or simple CSS/icon placeholders first.
- Later replace with custom art if desired.
- Tooltip or popup shows full name, amount, and net rate.

Resource bar should show only relevant resources for the current chapter. Hidden future resources should not clutter the early game.

### Market

Market can remain top-level or become a town hotspot.

Recommended:

- Market appears as a clickable building once unlocked.
- Manual buy/sell lives in the market popup.
- Auto-trade is collapsed behind an "Automation" section.
- Use resource icons in rows.

### Library

Library should visually feel like books, not a table.

Recommended card shape:

- Book title.
- Building icon or label.
- Effect category.
- Rarity row with copy counts.
- Equipped state.
- Upgrade button.
- Details popup.

Grouping rule:

- Group by book id first.
- Within each book, show Common, Uncommon, Rare, Epic, Legendary copies together.

### Building UI

Building popup should include:

- Building name and stage-specific label.
- Level.
- Worker assignment.
- Recipe selection.
- Inputs and outputs with icons.
- Upgrade cost.
- Blocked production reason.
- Equipped books.

Keep the building popup compact. Detailed book effects should open from the book itself.

## Implementation Phases

### Phase 1: Design Data And Save Shape

Goal:

Add the campaign structure without changing the whole UI yet.

Tasks:

- Add chapter/stage definitions.
- Add one upgrade project definition per chapter.
- Add constructed/unlocked building state.
- Add finite clearing resource state for the opening stage.
- Update initial game state to start at Arrival.
- Add save migration/sanitization for new fields.
- Add tests for stage progression, upgrade project contributions, and optional delayed advancement.

Do not remove existing buildings or systems yet. Gate them behind stages.

### Phase 2: Chapter 1 Playable

Goal:

Make the opening clearing work from a fresh save.

Tasks:

- Add manual gather actions.
- Add build actions for first buildings.
- Gate Mine and Lumberjack behind construction.
- Add the Arrival upgrade project.
- Add "Upgrade to Hamlet" action.
- Update README once playable.

### Phase 3: Structural UI Overhaul

Goal:

Make the town image the main interaction layer.

Tasks:

- Enlarge town canvas in layout.
- Replace persistent right panel with contextual popups.
- Add hotspot state to Phaser town scene.
- Add current chapter/project progress panel.
- Keep resource bar at top.
- Make Chapter 1 and Chapter 2 interactions usable through popups.

This should happen before adding many new systems.

### Phase 4: Hamlet And Village Progression

Goal:

Reintroduce current production systems as staged unlocks.

Tasks:

- Unlock Farm and Cookhouse in Hamlet.
- Unlock Market in Hamlet or early Village.
- Unlock Smelter, Blacksmith, and Library in Village.
- Add Hamlet and Village upgrade projects.
- Add support for two active recipe slots on selected buildings.
- Rebalance costs around finite progression.
- Restrict book odds and pack access.
- Add tests for locked systems and stage advancement.

### Phase 5: Contracts

Goal:

Give the midgame concrete goals and resource sinks.

Tasks:

- Add contract definitions.
- Add active/completed contract state.
- Add accept/complete actions.
- Add contract popup.
- Use contracts as an optional route to money, books, reputation, or rare materials.
- Add tests for contract completion and rewards.

### Phase 6: Library And Resource UI Polish

Goal:

Improve clarity and reduce text-heavy UI.

Tasks:

- Add resource icons.
- Add tooltips/detail popups for resources.
- Redesign library into grouped book cards.
- Add book effect popup.
- Add upgrade-all per book.
- Add upgrade-all possible.
- Add tests for upgrade-all book behavior.

### Phase 7: Final Chapter And Victory

Goal:

Create the first complete campaign.

Tasks:

- Add Great Hall project.
- Add broader late-stage resources as needed, then cut any that do not improve decisions.
- Add victory state.
- Add victory popup.
- Allow continued play after victory.
- Update README to describe the campaign structure.
- Run full build and tests.

## Data Model Sketch

Possible additions to `GameState`:

```ts
interface CampaignState {
  chapterId: ChapterId;
  completedUpgradeProjectIds: string[];
  upgradeProjectProgress: Partial<Record<string, number>>;
  constructedBuildings: Partial<Record<BuildingId, boolean>>;
  unlockedSystems: Partial<Record<SystemId, boolean>>;
  clearingResources: Partial<Record<ResourceId, number>>;
  completedContractIds: string[];
  activeContractIds: string[];
  campaignComplete: boolean;
}
```

Possible chapter definition:

```ts
interface ChapterDefinition {
  id: ChapterId;
  label: string;
  storyText: string;
  townBackdropKey: string;
  unlockedBuildings: BuildingId[];
  buildableBuildings: BuildingId[];
  unlockedResources: ResourceId[];
  unlockedSystems: SystemId[];
  upgradeProject: ChapterUpgradeProjectDefinition;
  nextChapterId?: ChapterId;
}
```

Possible upgrade project definition:

```ts
interface ChapterUpgradeProjectDefinition {
  id: string;
  label: string;
  description: string;
  targetProgress: number;
  resourceContributions: Partial<Record<ResourceId, number>>;
  moneyContributionRate?: number;
  completionStoryText: string;
}
```

Possible production slot state:

```ts
interface BuildingRecipeSlot {
  recipeId: RecipeId;
  workerShare: number;
}

interface BuildingState {
  id: BuildingId;
  level: number;
  workers: number;
  recipeSlots: BuildingRecipeSlot[];
  equippedBooks: EquippedBook[];
}
```

## Balance Principles

- Avoid infinite cost scaling as the main answer.
- Use upgrade project progress targets, construction gates, contracts, recipe choices, and chapter unlocks for friction.
- Keep early actions fast and satisfying.
- Make every new resource justify its existence.
- Do not unlock every system at once.
- Keep market useful but not dominant.
- Make books helpful, not mandatory for basic progression.
- Keep the final project broad enough to use the whole production chain.

## Art Plan

Keep the current painted town image style.

Minimum viable art approach:

- Reuse the current backdrop for Hamlet/Village.
- Use labels and hotspot states to imply progression.
- Make the image larger and less obscured.

Better art approach:

- Chapter 1: empty mountain clearing.
- Chapter 2: small hamlet.
- Chapter 3: active village.
- Chapter 4: large mountain town with Great Hall.

Implementation requirement:

- Each backdrop should have a stable key and a matching hotspot map.
- Hotspots should be data-driven per chapter so art can change without rewriting UI logic.

## Testing Plan

Simulation tests:

- Fresh save starts in Arrival with no constructed buildings.
- Manual gathering adds expected resources.
- Manual wood gathering consumes the finite clearing wood pool.
- Buildings cannot produce before construction.
- Upgrade projects accept contributions, show correct progress, and only advance when the player presses the upgrade button.
- A player can remain in a chapter after the upgrade project is complete.
- Chapter advancement unlocks the correct systems.
- Two-slot buildings can run two recipes with split worker allocation.
- Locked market/library actions do nothing.
- Save/load preserves campaign state.
- Old saves sanitize into a valid campaign state.
- Contracts consume resources and grant rewards.
- Victory state is stable after save/load.

UI/playtest checks:

- Town picture is larger on desktop and mobile.
- Clickable hotspots match visible buildings.
- Popups open, switch, and close correctly.
- Resource icons remain readable.
- Locked content is understandable.
- Book grouping is readable with many owned copies.
- No popup blocks the core playfield permanently on desktop.

## First Implementation Cut

The first practical cut should be:

1. Add `GAMEPLAY_OVERHAUL_PLAN.md`.
2. Add campaign state and chapter upgrade project data.
3. Start new saves in Arrival.
4. Add manual wood/stone/vegetable gathering, with finite opening wood.
5. Add construction for Logging Camp and Mine Entrance.
6. Add the Arrival upgrade project and "Upgrade to Hamlet."
7. Make the town image larger and replace the main side panel with a contextual popup.

After this cut, the game will already feel like the new genre even before every later system is polished.
