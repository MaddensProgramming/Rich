# Mountain Factory Idle — Game Design Notes

## 1. High Concept

**Mountain Factory Idle** is a browser-based idle / management / incremental game where the player develops a small mountain town into an industrial production settlement.

The player manages workers, housing, food, production buildings, a dynamic resource market, and a library of collectible books that give unique factory bonuses.

The first version should focus on a small but complete economy loop:

> Workers gather resources → resources are processed into goods → goods are sold on the market → money is used to buy books and trade resources → resources are used to expand buildings and support more workers → books improve factories and unlock stronger strategies.

---

## 2. Target Platform and Stack

Initial target: **browser game**.

Recommended stack:

- **Phaser** for the game canvas, town view, building visuals, and small animations.
- **React** for UI panels, menus, market, library, resource tables, and worker assignment.
- **TypeScript** for all logic.
- **Vite** for development/build tooling.
- **Zustand** or another lightweight state store for shared game state.
- **localStorage or IndexedDB** for save data.
- **Vitest** for testing economy logic.

Important architecture rule:

> Keep the simulation logic separate from Phaser and React.

Suggested folder structure:

```text
src/
  simulation/
    gameState.ts
    tick.ts
    resources.ts
    buildings.ts
    workers.ts
    market.ts
    books.ts
    offlineProgress.ts

  data/
    resources.json
    buildings.json
    books.json

  game/
    scenes/
      TownScene.ts

  ui/
    App.tsx
    ResourceBar.tsx
    BuildingPanel.tsx
    MarketPanel.tsx
    LibraryPanel.tsx
    WorkerPanel.tsx
```

---

## 3. First Version Scope

The first playable version should include these buildings:

### Mine

Extracts:

- Coal
- Iron ore
- Stone

The mine can either:

1. Produce all three resources at fixed ratios, or
2. Let the player choose what the mine focuses on.

For the first prototype, option 2 is more interesting:

- Focus coal
- Focus iron ore
- Focus stone
- Balanced mining

### Lumberjack

Produces:

- Wood

### Farm

Produces:

- Vegetables

### Food Maker

Consumes:

- Vegetables

Produces:

- Food

Food is consumed by the town population.

### Smelter

Consumes:

- Iron ore
- Coal

Produces:

- Iron bars

### Blacksmith

Can produce either:

- Swords from iron bars
- Bows from wood

The player should be able to select the active production recipe.

---

## 4. Initial Resource List

### Basic resources

- Coal
- Iron ore
- Stone
- Wood
- Vegetables
- Food

### Processed resources

- Iron bars
- Swords
- Bows

### Meta resources

- Money
- Workers
- Housing capacity
- Books

---

## 5. Core Gameplay Loop

The main loop:

1. Assign workers to buildings.
2. Buildings produce resources every tick.
3. Workers and population consume food.
4. Sell excess resources on the market.
5. Buy missing resources when needed.
6. Use resources to expand and upgrade buildings.
7. Use money to buy book packs.
8. Equip books to improve factories.
9. Unlock better production chains and scale up.

The player should always have a few possible decisions:

- Add more workers to an existing building.
- Expand a building to reduce overcrowding penalties.
- Build or upgrade housing.
- Sell surplus resources.
- Buy missing resources.
- Change factory recipes.
- Equip different books.
- Buy book packs.

---

## 6. Worker and Efficiency System

Each building can employ workers.

More workers increase production, but each extra worker is less efficient when too many workers are assigned to the same building.

Example formula:

```text
effectiveWorkers = workers ^ 0.85
production = baseProduction * effectiveWorkers * buildingMultiplier * bookMultiplier
```

Example result:

| Workers | Effective Workers |
|---:|---:|
| 1 | 1.00 |
| 2 | 1.80 |
| 5 | 3.93 |
| 10 | 7.08 |
| 20 | 12.76 |

This means assigning more workers still helps, but spreading workers across multiple buildings can be better than putting everyone in one place.

Building upgrades can improve this by increasing the efficiency exponent or adding flat production bonuses.

Building upgrades should cost resources instead of money. Money remains important for market trading and book packs, but permanent building progression should push the player back into the production chains.

Example upgrade costs:

- Larger workplace: wood, stone.
- Better tools: wood, iron bars.
- Specialized equipment: stone, iron bars, coal.
- Automation: iron bars, coal, finished goods such as swords or bows.

Example upgrades:

- Larger workplace: reduces overcrowding penalty.
- Better tools: increases production multiplier.
- Specialized equipment: improves a specific resource or recipe.
- Automation: increases base production even without many workers.

---

## 7. Population, Housing, and Food

Workers need:

- Housing
- Food

Basic rules:

```text
maxWorkers = housingCapacity
foodConsumptionPerSecond = workers * foodConsumptionRate
```

If food runs out, possible penalties:

- Worker production slows down.
- New workers stop arriving.
- Happiness decreases.
- Some workers become inactive until food returns.

For the first version, keep it simple:

> If there is not enough food, all production receives a penalty.

Example:

```text
if food <= 0:
  globalProductionMultiplier = 0.25
else:
  globalProductionMultiplier = 1.0
```

---

## 8. Buildings and Recipes

### Mine Recipes

| Focus | Produces |
|---|---|
| Coal focus | Mostly coal, small stone |
| Iron focus | Mostly iron ore, small stone |
| Stone focus | Mostly stone |
| Balanced | Coal, iron ore, and stone |

Example:

```json
{
  "id": "mine_coal_focus",
  "buildingId": "mine",
  "outputs": {
    "coal": 1.0,
    "stone": 0.2
  }
}
```

### Lumberjack Recipe

```json
{
  "id": "lumberjack_wood",
  "buildingId": "lumberjack",
  "outputs": {
    "wood": 1.0
  }
}
```

### Farm Recipe

```json
{
  "id": "farm_vegetables",
  "buildingId": "farm",
  "outputs": {
    "vegetables": 1.0
  }
}
```

### Food Maker Recipe

```json
{
  "id": "food_maker_basic_food",
  "buildingId": "food_maker",
  "inputs": {
    "vegetables": 2.0
  },
  "outputs": {
    "food": 1.0
  }
}
```

### Smelter Recipe

```json
{
  "id": "smelter_iron_bars",
  "buildingId": "smelter",
  "inputs": {
    "iron_ore": 2.0,
    "coal": 1.0
  },
  "outputs": {
    "iron_bars": 1.0
  }
}
```

### Blacksmith Recipes

```json
[
  {
    "id": "blacksmith_swords",
    "buildingId": "blacksmith",
    "inputs": {
      "iron_bars": 2.0
    },
    "outputs": {
      "swords": 1.0
    }
  },
  {
    "id": "blacksmith_bows",
    "buildingId": "blacksmith",
    "inputs": {
      "wood": 3.0
    },
    "outputs": {
      "bows": 1.0
    }
  }
]
```

---

## 9. Market System

All resources can be bought and sold on the market.

Basic rule:

- Buy price is around 10% higher than sell price.
- Selling a lot of a resource lowers its price.
- Buying a lot of a resource raises its price.
- Prices slowly return toward their base price over time.

Example:

```text
sellPrice = basePrice * marketPressure
buyPrice = sellPrice * 1.10
```

Market pressure example:

```text
marketPressure starts at 1.0
selling resource lowers marketPressure
buying resource raises marketPressure
marketPressure slowly moves back toward 1.0
```

Suggested limits:

```text
minimum marketPressure = 0.25
maximum marketPressure = 4.00
```

This prevents prices from going completely insane while still making market behavior meaningful.

### Auto-buy and auto-sell

The player can configure automatic market rules.

Examples:

- Auto-buy coal if coal is below 100.
- Auto-sell wood if wood is above 1,000.
- Auto-buy vegetables if food production is blocked.
- Auto-sell swords when price is above a chosen threshold.

Auto-market rules should be unlockable after the basic market is introduced.

---

## 10. Library and Book System

The library is a progression and collection system.

The player can spend money on book packs. Books give unique bonuses to buildings.

### Core rules

- Books exist for every factory type.
- Each factory can equip 2 books at a time.
- Books have 5 rarities.
- Rarer books are stronger.
- If the player collects 10 copies of the same book, they can upgrade it to the next rarity.

### Suggested rarities

1. Common
2. Uncommon
3. Rare
4. Epic
5. Legendary

### Example book types

Books should not only be simple percentage boosts. Some can change strategy.

#### Mine books

- **Deep Veins**: increases iron ore production.
- **Coal Seams**: increases coal production.
- **Stone Surveying**: increases stone production.
- **Mine Cart Rails**: reduces worker efficiency penalty.
- **Ore Sorting Manual**: small chance to produce bonus iron ore when mining stone or coal.

#### Lumberjack books

- **Sharp Axes**: increases wood production.
- **Forest Paths**: reduces worker efficiency penalty.
- **Sustainable Cutting**: increases production but reduces market price impact from selling wood.

#### Farm books

- **Crop Rotation**: increases vegetable production.
- **Mountain Soil Guide**: increases vegetables per worker.
- **Efficient Harvesting**: reduces worker efficiency penalty.

#### Food Maker books

- **Preservation Methods**: produces more food from vegetables.
- **Efficient Kitchens**: reduces vegetable input cost.
- **Hearty Recipes**: food reduces worker consumption slightly.

#### Smelter books

- **Hotter Furnaces**: increases iron bar production.
- **Coal Efficiency**: reduces coal cost.
- **Refining Techniques**: reduces iron ore cost.

#### Blacksmith books

- **Swordsmith Manual**: increases sword output.
- **Bowyer Techniques**: increases bow output.
- **Weapon Contracts**: selling swords and bows has reduced market price impact.

---

## 11. Book Upgrade System

Basic upgrade rule:

```text
5 copies of the same book at one rarity = 1 copy of the same book at the next rarity
```

Example:

```text
5 Common Deep Veins = 1 Uncommon Deep Veins
5 Uncommon Deep Veins = 1 Rare Deep Veins
5 Rare Deep Veins = 1 Epic Deep Veins
5 Epic Deep Veins = 1 Legendary Deep Veins
```

Potential improvement for later:

- Duplicate books also give knowledge dust.
- Knowledge dust can upgrade a chosen book.
- Special factory-specific book packs allow targeting certain buildings.

For the first version, the simple duplicate system is enough.

---

## 12. Suggested First Book Pack System

### Basic Book Pack

Cost: money

Contains:

- 3 random books
- Mostly Common
- Small chance for Uncommon
- Very small chance for Rare

Example odds:

| Rarity | Chance |
|---|---:|
| Common | 80% |
| Uncommon | 17% |
| Rare | 3% |
| Epic | 0% |
| Legendary | 0% |

Later packs can add Epic and Legendary books.

---

## 13. First Version UI Screens

### Main town screen

Shows:

- Buildings
- Current workers
- Basic production status
- Resource totals

### Building panel

Shows:

- Assigned workers
- Current recipe
- Production per second
- Input consumption per second
- Equipped books
- Upgrade button with resource costs

### Market panel

Shows:

- Resource name
- Owned amount
- Sell price
- Buy price
- Buy button
- Sell button
- Current market pressure

### Library panel

Shows:

- Buy book pack button
- Owned books
- Book rarity
- Book effects
- Upgrade available indicator
- Equipped books per building

### Worker / town panel

Shows:

- Total workers
- Available workers
- Housing capacity
- Food consumption
- Food remaining

---

## 14. Save and Offline Progress

The game should save:

- Resources
- Money
- Buildings and levels
- Assigned workers
- Current recipes
- Market prices / market pressure
- Books owned
- Books equipped
- Last save timestamp

Offline progress:

1. Store timestamp when saving.
2. On load, calculate elapsed time.
3. Convert elapsed offline time into an offline progress bar.
4. Let the player spend the stored bar to run the game at up to 5x speed.
5. Cap stored offline progress at 8 hours.

Example cap:

```text
maximumOfflineProgress = 8 hours
```

### Offline speed bar

Offline progress should be represented as a fill bar instead of granting all offline production immediately on load.

Rules:

- The bar fills based on real time spent offline.
- The bar reaches 100% after 8 hours offline.
- The stored bar can be activated during play as a temporary speed boost.
- At full charge, the boost runs the game at 5x speed for 20 minutes of game time.
- Partial charge gives proportional boost duration.
- While boosted, the simulation runs faster but still uses normal production, input consumption, food consumption, market pressure, and save logic.

Example:

```text
offlineElapsed = 4 hours
barFill = 50%
boostSpeed = 5x
boostGameTimeAvailable = 10 minutes
```

Implementation note:

```text
maxOfflineElapsedSeconds = 8 * 60 * 60
maxBoostGameTimeSeconds = 20 * 60
offlineCharge = clamp(offlineElapsedSeconds / maxOfflineElapsedSeconds, 0, 1)
boostGameTimeAvailable = offlineCharge * maxBoostGameTimeSeconds
boostMultiplier = 5
```

For the first version, the boost can always run at 5x and drain until empty. Later versions can add lower-speed options or automatic activation.

---

## 15. Minimum Playable Prototype Checklist

The first prototype is complete when the player can:

- Assign workers to the mine, lumberjack, farm, food maker, smelter, and blacksmith.
- Produce coal, iron ore, stone, wood, vegetables, food, iron bars, swords, and bows.
- Consume food over time.
- Sell and buy resources on the market.
- See prices change when buying or selling resources.
- Upgrade buildings by spending resources.
- Buy random books from the library.
- Equip 2 books per building.
- Upgrade books by combining duplicates.
- Save and reload the game.
- Gain offline speed-bar charge after closing the game, then spend it for 5x game speed.

---

## 16. Recommended Development Order

1. Create resource definitions.
2. Create building definitions.
3. Implement tick-based production.
4. Implement worker assignment.
5. Implement food consumption.
6. Implement basic UI resource display.
7. Add building panels.
8. Add market sell/buy.
9. Add market price pressure.
10. Add book definitions.
11. Add book pack opening.
12. Add book equipping.
13. Add duplicate book upgrades.
14. Add save/load.
15. Add offline speed-bar charge and 5x boost spending.
16. Add basic town visuals in Phaser.
17. Improve balance.
18. Add tutorial text.
19. Upload HTML5 build to itch.io.

---

## 17. Balance Notes

The player should quickly understand the first production chain:

```text
Farm → Vegetables → Food Maker → Food → Supports Workers
```

Then introduce basic industry:

```text
Mine → Iron Ore + Coal → Smelter → Iron Bars → Blacksmith → Swords
```

And wood industry:

```text
Lumberjack → Wood → Blacksmith → Bows
```

Swords should probably be more valuable but slower and more complex to produce.

Bows should probably be easier and faster but less valuable.

Example resource value relationship:

```text
Vegetables < Food < Wood < Stone < Coal < Iron Ore < Iron Bars < Bows < Swords
```

This does not need to be exact, but it gives a useful starting point.

---

## 18. Important Design Principle

The first version should avoid too much content.

The goal is not to have 50 buildings. The goal is to make the first 6 buildings fun and understandable.

Focus on making these systems feel good:

- Worker assignment
- Production chains
- Food pressure
- Market prices
- Book bonuses
- Save/load
- Offline speed-bar charge and boost spending

Once those are fun, adding more buildings and resources will be much easier.
