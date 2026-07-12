import { buildingById, buildingIds } from '../data/buildings';
import { chapterById, chapterIds } from '../data/chapterProjects';
import { resourceById, resourceIds } from '../data/resources';
import {
  activateOfflineBoost,
  advanceChapter,
  assignWorkers,
  canConstructBuilding,
  constructBuilding,
  contributeToUpgradeProject,
  getBuildingUpgradeCost,
  getCurrentUpgradeProject,
  getCurrentUpgradeProjectProgress,
  getHousingUpgradeCost,
  getUpgradeProjectDeliveries,
  getUpgradeProjectMoneyDelivered,
  getWorkerHireCost,
  hireWorker,
  isUpgradeProjectComplete,
  setRecipe,
  setSecondaryRecipe,
  setWorkerShare,
  upgradeBuilding,
  upgradeHousing,
} from './actions';
import { BASIC_BOOK_PACK_COST, buyBookPack, upgradeAllPossibleBooks } from './books';
import {
  acceptContract,
  canCompleteContract,
  completeContract,
  getActiveContracts,
  getAvailableContracts,
} from './contracts';
import {
  createInitialGameState,
  FOOD_CONSUMPTION_PER_WORKER,
  isBuildingConstructed,
} from './gameState';
import { buyResource, getSellPrice, sellResource } from './market';
import { applyProductionPlan, createProductionPlan } from './productionPlanner';
import { tickGame } from './tick';
import type { BuildingId, ChapterId, GameState, RecipeId, ResourceId } from './types';
import { canAffordResources, cloneGameState } from './utils';

export interface ProgressionSimulatorOptions {
  /** How often the modeled player checks the town and makes decisions. */
  decisionIntervalSeconds?: number;
  /** Safety limit for a stalled or badly tuned economy. */
  maxGameSeconds?: number;
  /** Manual clearing clicks made at every decision while clearing resources remain. */
  manualGatherActionsPerDecision?: number;
  /** Desired population before the policy stops treating hiring as an investment. */
  targetWorkersByChapter?: Partial<Record<ChapterId, number>>;
  /** Desired building level in each chapter. */
  targetBuildingLevelByChapter?: Partial<Record<ChapterId, number>>;
  /** Maximum construction, housing, hiring, or upgrade actions at one check-in. */
  maxInvestmentsPerDecision?: number;
  /** Book packs bought after reaching the chapter workforce target. */
  bookPacksToBuy?: number;
  /** Buy books immediately in Village, or retain the baseline workforce-target gate. */
  bookPurchaseTiming?: 'workforce-target' | 'village-early';
  /** Optional earned charge for scenarios that begin with offline boost available. */
  offlineChargeSeconds?: number;
  /** Finish profitable town contracts before donating overlapping goods to chapter projects. */
  completeContractsBeforeProjects?: boolean;
  /** Deliver project surplus while still saving enough market value for the next hire. */
  deliverWhileGrowing?: boolean;
  /** Static priorities remain available for comparison; goal uses recursive recipe demand. */
  productionPolicy?: 'static' | 'goal';
  /** Human-achievable sell/buy round trips allowed per decision when current market math yields profit. */
  maxMarketRoundTripsPerDecision?: number;
  /** Optional state for legacy-run or hand-crafted scenario comparisons. */
  initialState?: GameState;
}

export interface ProgressionTimelineEntry {
  atSeconds: number;
  chapterId: ChapterId;
  projectProgress: number;
  workers: number;
  money: number;
  actions: string[];
}

export interface ChapterProgressionReport {
  chapterId: ChapterId;
  label: string;
  startedAtSeconds: number;
  completedAtSeconds: number | null;
  durationSeconds: number | null;
  decisionCount: number;
  workersAtStart: number;
  workersAtEnd: number | null;
  startingMoney: number;
  endingMoney: number | null;
  startingStockpile: Partial<Record<ResourceId, number>>;
  endingStockpile: Partial<Record<ResourceId, number>> | null;
  lastRequirement: ResourceId | 'money' | null;
}

export interface ProgressionSimulationResult {
  completed: boolean;
  elapsedSeconds: number;
  decisions: number;
  chapters: ChapterProgressionReport[];
  timeline: ProgressionTimelineEntry[];
  finalState: GameState;
  systemsUsed: {
    bookPacksPurchased: number;
    firstBookPurchaseAtSeconds: number | null;
    contractsCompleted: number;
    offlineBoostGameSecondsUsed: number;
    marketArbitrageProfit: number;
  };
}

export interface ActivePlaytestBenchmark {
  chapterId: 'hamlet' | 'village' | 'mountain_town';
  completedAtSeconds: number;
  workers: number;
}

/** Observed July 2026 active-play milestones used to expose policy/model drift. */
export const ACTIVE_PLAYTEST_BENCHMARKS: ActivePlaytestBenchmark[] = [
  { chapterId: 'hamlet', completedAtSeconds: 520, workers: 12 },
  { chapterId: 'village', completedAtSeconds: 1_300, workers: 24 },
  { chapterId: 'mountain_town', completedAtSeconds: 1_800, workers: 40 },
];

export const ACTIVE_PLAYTEST_COMBAT_COMPLETED_AT_SECONDS = 2_000;

const defaultTargetWorkers: Record<ChapterId, number> = {
  arrival: 1,
  hamlet: 12,
  village: 24,
  mountain_town: 40,
};

const defaultTargetLevels: Record<ChapterId, number> = {
  arrival: 1,
  hamlet: 2,
  village: 2,
  mountain_town: 3,
};

const workerOrderByChapter: Record<ChapterId, BuildingId[]> = {
  arrival: ['mine', 'lumberjack'],
  hamlet: ['mine', 'lumberjack', 'farm', 'food_maker', 'farm', 'mine', 'lumberjack', 'food_maker'],
  village: ['mine', 'lumberjack', 'farm', 'food_maker', 'smelter', 'blacksmith', 'mine', 'smelter'],
  mountain_town: [
    'mine',
    'lumberjack',
    'farm',
    'food_maker',
    'smelter',
    'blacksmith',
    'stonemason',
    'mine',
    'lumberjack',
    'smelter',
    'blacksmith',
    'stonemason',
  ],
};

const growthWorkerOrderByChapter: Record<ChapterId, BuildingId[]> = {
  arrival: ['mine', 'lumberjack'],
  hamlet: ['mine', 'lumberjack', 'mine', 'lumberjack', 'mine', 'lumberjack', 'farm', 'food_maker'],
  village: ['mine', 'mine', 'mine', 'lumberjack', 'smelter', 'blacksmith', 'farm', 'food_maker'],
  mountain_town: [
    'mine',
    'mine',
    'mine',
    'lumberjack',
    'smelter',
    'blacksmith',
    'farm',
    'food_maker',
  ],
};

const snapshotStockpile = (state: GameState): Partial<Record<ResourceId, number>> =>
  Object.fromEntries(
    resourceIds
      .filter((resourceId) => state.resources[resourceId] >= 0.01)
      .map((resourceId) => [resourceId, Number(state.resources[resourceId].toFixed(2))]),
  );

const getRemainingFraction = (state: GameState, resourceId: ResourceId) => {
  const project = getCurrentUpgradeProject(state);
  const required = project.requirements[resourceId] ?? 0;
  if (required <= 0) {
    return 0;
  }

  const delivered = getUpgradeProjectDeliveries(state, project.id)[resourceId] ?? 0;
  return Math.max(0, required - delivered) / required;
};

const getProductionNeedFraction = (state: GameState, resourceId: ResourceId) => {
  const project = getCurrentUpgradeProject(state);
  const projectRequired = project.requirements[resourceId] ?? 0;
  const projectDelivered = getUpgradeProjectDeliveries(state, project.id)[resourceId] ?? 0;
  const contractRequired = getActiveContracts(state).reduce(
    (total, contract) => total + (contract.requiredResources[resourceId] ?? 0),
    0,
  );
  const totalRequired = Math.max(0, projectRequired - projectDelivered) + contractRequired;
  return totalRequired > 0
    ? Math.max(0, totalRequired - state.resources[resourceId]) / totalRequired
    : 0;
};

const getManualGatherNeed = (
  state: GameState,
  resourceId: 'wood' | 'stone' | 'vegetables',
) => {
  const chapter = chapterById[state.campaign.chapterId];
  const constructionRequired = chapter.availableBuildingIds.reduce(
    (total, buildingId) =>
      total +
      (isBuildingConstructed(state, buildingId)
        ? 0
        : (buildingById[buildingId].constructionCost?.[resourceId] ?? 0)),
    0,
  );
  const constructionShortage = Math.max(0, constructionRequired - state.resources[resourceId]);
  const constructionNeed = constructionRequired > 0 ? constructionShortage / constructionRequired : 0;
  return constructionNeed * 5 + getRemainingFraction(state, resourceId);
};

const chooseMineRecipe = (state: GameState): RecipeId => {
  if (state.campaign.chapterId === 'arrival') {
    return 'mine_stone_focus';
  }
  if (state.campaign.chapterId === 'hamlet') {
    return getProductionNeedFraction(state, 'coal') >= getProductionNeedFraction(state, 'stone')
      ? 'mine_coal_focus'
      : 'mine_stone_focus';
  }
  return 'mine_balanced';
};

const chooseBlacksmithRecipe = (state: GameState): RecipeId => {
  if (state.campaign.chapterId === 'mountain_town') {
    const toolsNeed = getProductionNeedFraction(state, 'tools');
    const swordsNeed = getProductionNeedFraction(state, 'swords');
    const bowsNeed = getProductionNeedFraction(state, 'bows');
    if (bowsNeed > Math.max(toolsNeed, swordsNeed)) return 'blacksmith_bows';
    return toolsNeed >= swordsNeed
      ? 'blacksmith_tools'
      : 'blacksmith_swords';
  }
  return getProductionNeedFraction(state, 'bows') >= getProductionNeedFraction(state, 'swords')
    ? 'blacksmith_bows'
    : 'blacksmith_swords';
};

const configureRecipes = (input: GameState, targetWorkerCount: number): GameState => {
  let state = input;
  if (isBuildingConstructed(state, 'mine')) {
    state = setRecipe(state, 'mine', chooseMineRecipe(state));
  }
  if (isBuildingConstructed(state, 'blacksmith')) {
    state = setRecipe(state, 'blacksmith', chooseBlacksmithRecipe(state));
  }

  if (state.campaign.chapterId === 'mountain_town') {
    if (isBuildingConstructed(state, 'lumberjack')) {
      state = setRecipe(state, 'lumberjack', 'lumberjack_wood');
      if (
        state.workers.housingCapacity < targetWorkerCount ||
        getProductionNeedFraction(state, 'bows') > 0
      ) {
        state = setSecondaryRecipe(state, 'lumberjack', null);
      } else {
        state = setSecondaryRecipe(state, 'lumberjack', 'lumberjack_planks');
        state = setWorkerShare(state, 'lumberjack', 0.45);
      }
    }
    if (isBuildingConstructed(state, 'blacksmith')) {
      const toolsRemaining = getProductionNeedFraction(state, 'tools');
      const swordsRemaining = getProductionNeedFraction(state, 'swords');
      const bowsRemaining = getProductionNeedFraction(state, 'bows');
      if (bowsRemaining > Math.max(toolsRemaining, swordsRemaining)) {
        state = setRecipe(state, 'blacksmith', 'blacksmith_bows');
        state = setSecondaryRecipe(state, 'blacksmith', null);
        return state;
      }
      if (toolsRemaining > 0 && swordsRemaining > 0 && state.buildings.blacksmith.level >= 3) {
        state = setRecipe(state, 'blacksmith', 'blacksmith_tools');
        state = setSecondaryRecipe(state, 'blacksmith', 'blacksmith_swords');
        state = setWorkerShare(state, 'blacksmith', 0.75);
      } else {
        state = setRecipe(
          state,
          'blacksmith',
          toolsRemaining > 0 ? 'blacksmith_tools' : 'blacksmith_swords',
        );
        state = setSecondaryRecipe(state, 'blacksmith', null);
      }
    }
  }
  return state;
};

const assignPolicyWorkers = (input: GameState, targetWorkerCount: number): GameState => {
  let state = input;
  for (const buildingId of buildingIds) {
    state = assignWorkers(state, buildingId, 0);
  }

  const policyOrder =
    state.workers.total < targetWorkerCount
      ? growthWorkerOrderByChapter[state.campaign.chapterId]
      : workerOrderByChapter[state.campaign.chapterId];
  let order = policyOrder.filter((buildingId) =>
    isBuildingConstructed(state, buildingId),
  );
  const foodBuffer = state.workers.total * 6;
  if (
    state.resources.food < foodBuffer &&
    isBuildingConstructed(state, 'farm') &&
    isBuildingConstructed(state, 'food_maker')
  ) {
    const foodRecoveryOrder: BuildingId[] =
      state.resources.vegetables >= 5
        ? ['food_maker', 'farm', 'food_maker', 'farm']
        : ['farm', 'food_maker', 'farm', 'food_maker'];
    order = [...foodRecoveryOrder, ...order];
  }
  const chapter = chapterById[state.campaign.chapterId];
  const needsIronBarsForConstruction = chapter.availableBuildingIds.some(
    (buildingId) =>
      !isBuildingConstructed(state, buildingId) &&
      (buildingById[buildingId].constructionCost?.iron_bars ?? 0) > state.resources.iron_bars,
  );
  if (needsIronBarsForConstruction && isBuildingConstructed(state, 'smelter')) {
    order = ['smelter', 'mine', 'smelter', 'mine', ...order];
  }
  const constructionShortage = (resourceId: ResourceId) =>
    chapter.availableBuildingIds.reduce(
      (total, buildingId) =>
        total +
        (isBuildingConstructed(state, buildingId)
          ? 0
          : (buildingById[buildingId].constructionCost?.[resourceId] ?? 0)),
      0,
    ) > state.resources[resourceId];
  const constructionProducers: BuildingId[] = [];
  if (constructionShortage('wood') && isBuildingConstructed(state, 'lumberjack')) {
    constructionProducers.push('lumberjack');
  }
  if (constructionShortage('stone') && isBuildingConstructed(state, 'mine')) {
    constructionProducers.push('mine');
  }
  if (constructionShortage('vegetables') && isBuildingConstructed(state, 'farm')) {
    constructionProducers.push('farm');
  }
  if (constructionProducers.length > 0) {
    order = [...constructionProducers, ...order];
  }
  if (state.workers.housingCapacity < targetWorkerCount) {
    const housingCost = getHousingUpgradeCost(state);
    const housingProducers: BuildingId[] = [];
    if (state.resources.wood < (housingCost.wood ?? 0) && isBuildingConstructed(state, 'lumberjack')) {
      housingProducers.push('lumberjack', 'lumberjack');
    }
    if (state.resources.stone < (housingCost.stone ?? 0) && isBuildingConstructed(state, 'mine')) {
      housingProducers.push('mine');
    }
    if (housingProducers.length > 0) order = [...housingProducers, ...order];
  }
  if (
    state.campaign.chapterId === 'mountain_town' &&
    getProductionNeedFraction(state, 'stone_blocks') <= 0
  ) {
    order = order.filter((buildingId) => buildingId !== 'stonemason');
  }
  const blacksmithNeeded = (['bows', 'swords', 'tools'] as ResourceId[]).some(
    (resourceId) => getProductionNeedFraction(state, resourceId) > 0,
  );
  if (!blacksmithNeeded) {
    order = order.filter((buildingId) => buildingId !== 'blacksmith');
  }
  const smelterNeeded =
    getProductionNeedFraction(state, 'iron_bars') > 0 || blacksmithNeeded;
  if (!smelterNeeded) {
    order = order.filter((buildingId) => buildingId !== 'smelter');
  }
  if (order.length === 0) {
    return state;
  }

  const counts = Object.fromEntries(buildingIds.map((buildingId) => [buildingId, 0])) as Record<
    BuildingId,
    number
  >;
  for (let index = 0; index < state.workers.total; index += 1) {
    counts[order[index % order.length]] += 1;
  }
  for (const buildingId of buildingIds) {
    state = assignWorkers(state, buildingId, counts[buildingId]);
  }
  return state;
};

const gatherManually = (
  state: GameState,
  requestedActions: number,
): { state: GameState; action: string | null } => {
  let actionsLeft = Math.max(0, Math.trunc(requestedActions));
  const gathered: Partial<Record<ResourceId, number>> = {};
  const next = cloneGameState(state);
  const candidates: Array<{
    resourceId: 'wood' | 'stone' | 'vegetables';
    pool: 'clearingWood' | 'clearingStone' | 'clearingVegetables';
  }> = [
    { resourceId: 'wood', pool: 'clearingWood' },
    { resourceId: 'stone', pool: 'clearingStone' },
    { resourceId: 'vegetables', pool: 'clearingVegetables' },
  ];

  while (actionsLeft > 0) {
    const available = candidates.filter(({ pool }) => next.campaign[pool] > 0);
    if (available.length === 0) {
      break;
    }
    const choice = available.reduce((best, candidate) => {
      const bestNeed = getManualGatherNeed(next, best.resourceId);
      const candidateNeed = getManualGatherNeed(next, candidate.resourceId);
      if (candidateNeed !== bestNeed) {
        return candidateNeed > bestNeed ? candidate : best;
      }
      return next.campaign[candidate.pool] > next.campaign[best.pool] ? candidate : best;
    });
    next.resources[choice.resourceId] += 1;
    next.campaign[choice.pool] -= 1;
    gathered[choice.resourceId] = (gathered[choice.resourceId] ?? 0) + 1;
    actionsLeft -= 1;
  }

  const summary = Object.entries(gathered)
    .map(([resourceId, amount]) => `${amount} ${resourceId.replace('_', ' ')}`)
    .join(', ');
  return { state: next, action: summary ? `gathered ${summary}` : null };
};

export const sellForMoney = (
  input: GameState,
  targetMoney: number,
  preserveProjectRequirements = false,
  preserveContractRequirements = true,
): { state: GameState; sold: string[] } => {
  let state = input;
  const sold: string[] = [];
  const foodReserve = Math.max(12, state.workers.total * 6);
  const reserve: Partial<Record<ResourceId, number>> = { food: foodReserve, vegetables: 8 };
  if (preserveProjectRequirements) {
    const project = getCurrentUpgradeProject(state);
    const deliveries = getUpgradeProjectDeliveries(state, project.id);
    for (const resourceId of resourceIds) {
      reserve[resourceId] = Math.max(
        reserve[resourceId] ?? 0,
        Math.max(0, (project.requirements[resourceId] ?? 0) - (deliveries[resourceId] ?? 0)),
      );
    }
    if (preserveContractRequirements) {
      for (const contract of getActiveContracts(state)) {
        for (const resourceId of resourceIds) {
          reserve[resourceId] =
            (reserve[resourceId] ?? 0) + (contract.requiredResources[resourceId] ?? 0);
        }
      }
    }
  }

  while (state.money + 1e-6 < targetMoney) {
    const candidate = resourceIds
      .map((resourceId) => ({
        resourceId,
        available: Math.max(0, state.resources[resourceId] - (reserve[resourceId] ?? 0)),
        price: getSellPrice(state, resourceId),
      }))
      .filter(({ available }) => available >= 0.01)
      .sort((left, right) => right.available * right.price - left.available * left.price)[0];
    if (!candidate) {
      break;
    }

    const quantity = Math.min(
      candidate.available,
      Math.max(0.01, (targetMoney - state.money) / candidate.price),
    );
    const next = sellResource(state, candidate.resourceId, quantity);
    if (next === state) {
      break;
    }
    sold.push(`${quantity.toFixed(1)} ${candidate.resourceId.replace('_', ' ')}`);
    state = next;
  }
  return { state, sold };
};

const runProfitableMarketRoundTrips = (
  input: GameState,
  requestedRoundTrips: number,
): { state: GameState; actions: string[]; profit: number } => {
  let state = input;
  const actions: string[] = [];
  const startingMoney = state.money;
  if (!state.campaign.unlockedSystems.market) return { state, actions, profit: 0 };

  for (let roundTrip = 0; roundTrip < Math.max(0, Math.trunc(requestedRoundTrips)); roundTrip += 1) {
    const best = resourceIds
      .map((resourceId) => {
        const quantity = Math.min(1_000, Math.floor(state.resources[resourceId]));
        if (quantity <= 0) return null;
        const sold = sellResource(state, resourceId, quantity);
        const bought = buyResource(sold, resourceId, quantity);
        const profit = bought.money - state.money;
        return profit > 1e-6 ? { resourceId, quantity, state: bought, profit } : null;
      })
      .filter(
        (candidate): candidate is {
          resourceId: ResourceId;
          quantity: number;
          state: GameState;
          profit: number;
        } => candidate !== null,
      )
      .sort((left, right) => right.profit - left.profit)[0];
    if (!best) break;
    state = best.state;
    actions.push(
      `market round trip ${best.quantity} ${best.resourceId.replace('_', ' ')} (+$${best.profit.toFixed(2)})`,
    );
  }
  return { state, actions, profit: state.money - startingMoney };
};

const makeOneInvestment = (
  input: GameState,
  targetWorkers: number,
  targetBuildingLevel: number,
): { state: GameState; action: string | null } => {
  let state = input;
  const chapter = chapterById[state.campaign.chapterId];

  for (const buildingId of chapter.availableBuildingIds) {
    if (canConstructBuilding(state, buildingId)) {
      state = constructBuilding(state, buildingId);
      return { state, action: `constructed ${buildingById[buildingId].label}` };
    }
  }
  const hasUnconstructedBuilding = chapter.availableBuildingIds.some(
    (buildingId) => !isBuildingConstructed(state, buildingId),
  );
  if (hasUnconstructedBuilding) {
    return { state, action: null };
  }

  if (state.workers.housingCapacity < targetWorkers) {
    const cost = getHousingUpgradeCost(state);
    if (canAffordResources(state.resources, cost)) {
      state = upgradeHousing(state);
      return { state, action: `expanded housing to ${state.workers.housingCapacity}` };
    }
    return { state, action: null };
  }

  if (state.workers.total < Math.min(targetWorkers, state.workers.housingCapacity)) {
    const hireCost = getWorkerHireCost(state);
    const trade = sellForMoney(state, hireCost);
    state = trade.state;
    const hired = hireWorker(state);
    if (hired !== state) {
      return {
        state: hired,
        action: `${trade.sold.length ? `sold ${trade.sold.join(', ')}; ` : ''}hired worker ${hired.workers.total}`,
      };
    }
  }

  const allBuildingsConstructed = chapter.availableBuildingIds.every((buildingId) =>
    isBuildingConstructed(state, buildingId),
  );
  if (allBuildingsConstructed) {
    for (const buildingId of chapter.availableBuildingIds) {
      if (state.buildings[buildingId].level >= targetBuildingLevel) {
        continue;
      }
      const cost = getBuildingUpgradeCost(state, buildingId);
      if (canAffordResources(state.resources, cost)) {
        state = upgradeBuilding(state, buildingId);
        return {
          state,
          action: `upgraded ${buildingById[buildingId].label} to level ${state.buildings[buildingId].level}`,
        };
      }
    }
  }
  return { state, action: null };
};

const runContractPolicy = (
  input: GameState,
): { state: GameState; actions: string[]; completed: number } => {
  let state = input;
  const actions: string[] = [];
  let completed = 0;

  if (!state.campaign.unlockedSystems.contracts) {
    return { state, actions, completed };
  }

  for (let pass = 0; pass < 10; pass += 1) {
    while (getActiveContracts(state).length < 2) {
      const available = getAvailableContracts(state)[0];
      if (!available) break;
      state = acceptContract(state, available.id);
      actions.push(`accepted ${available.label}`);
    }

    const chapter = chapterById[state.campaign.chapterId];
    if (
      chapter.availableBuildingIds.some((buildingId) => !isBuildingConstructed(state, buildingId))
    ) {
      break;
    }
    const completable = getActiveContracts(state).find((contract) =>
      canCompleteContract(state, contract.id),
    );
    if (!completable) break;
    state = completeContract(state, completable.id);
    actions.push(`completed ${completable.label}`);
    completed += 1;
  }

  return { state, actions, completed };
};

const contributeEverything = (
  state: GameState,
  targetWorkerCount: number,
  decisionIntervalSeconds: number,
  allowProjectContribution: boolean,
  deliverWhileGrowing: boolean,
  reserveContractRequirements: boolean,
) => {
  const project = getCurrentUpgradeProject(state);
  const chapter = chapterById[state.campaign.chapterId];
  const constructionReserve = Object.fromEntries(resourceIds.map((resourceId) => [resourceId, 0])) as Record<
    ResourceId,
    number
  >;
  for (const buildingId of chapter.availableBuildingIds) {
    if (isBuildingConstructed(state, buildingId)) continue;
    const cost = buildingById[buildingId].constructionCost ?? {};
    for (const resourceId of resourceIds) {
      constructionReserve[resourceId] += cost[resourceId] ?? 0;
    }
  }
  if (state.workers.housingCapacity < targetWorkerCount) {
    const housingCost = getHousingUpgradeCost(state);
    for (const resourceId of resourceIds) {
      constructionReserve[resourceId] += housingCost[resourceId] ?? 0;
    }
  }
  if (reserveContractRequirements) {
    for (const contract of getActiveContracts(state)) {
      for (const resourceId of resourceIds) {
        constructionReserve[resourceId] += contract.requiredResources[resourceId] ?? 0;
      }
    }
  }
  if (
    deliverWhileGrowing &&
    state.workers.total < Math.min(targetWorkerCount, state.workers.housingCapacity)
  ) {
    let hireMoneyShortfall = Math.max(0, getWorkerHireCost(state) - state.money);
    const projectResourceIds = new Set(
      resourceIds.filter((resourceId) => (project.requirements[resourceId] ?? 0) > 0),
    );
    const fundingCandidates = resourceIds
      .map((resourceId) => ({
        resourceId,
        available: Math.max(0, state.resources[resourceId] - constructionReserve[resourceId]),
        price: getSellPrice(state, resourceId),
        projectResource: projectResourceIds.has(resourceId),
      }))
      .filter((candidate) => candidate.available > 0 && candidate.price > 0)
      .sort(
        (left, right) =>
          Number(left.projectResource) - Number(right.projectResource) ||
          right.price - left.price,
      );
    for (const candidate of fundingCandidates) {
      if (hireMoneyShortfall <= 1e-6) break;
      const quantity = Math.min(candidate.available, hireMoneyShortfall / candidate.price);
      constructionReserve[candidate.resourceId] += quantity;
      hireMoneyShortfall -= quantity * candidate.price;
    }
  }
  // Keep one check-in worth of meals in town. Delivering the pantry to a project would trigger
  // the 25% starvation penalty and is not behavior a sensible baseline player should model.
  constructionReserve.food = Math.max(
    constructionReserve.food,
    state.workers.total * FOOD_CONSUMPTION_PER_WORKER * decisionIntervalSeconds,
  );
  const contributions = Object.fromEntries(
    resourceIds.map((resourceId) => [
      resourceId,
      allowProjectContribution &&
      (deliverWhileGrowing || state.workers.total >= targetWorkerCount)
        ? Math.max(0, state.resources[resourceId] - constructionReserve[resourceId])
        : 0,
    ]),
  );
  const moneyTargetReached = project.moneyRequirement
    ? allowProjectContribution && targetWorkerCount <= state.workers.total
    : true;
  return contributeToUpgradeProject(
    state,
    contributions,
    moneyTargetReached ? state.money : 0,
  );
};

const findLastRequirement = (before: GameState, after: GameState): ResourceId | 'money' | null => {
  const project = getCurrentUpgradeProject(before);
  const beforeDeliveries = getUpgradeProjectDeliveries(before, project.id);
  const afterDeliveries = getUpgradeProjectDeliveries(after, project.id);
  const newlyCompleted = resourceIds.filter((resourceId) => {
    const required = project.requirements[resourceId] ?? 0;
    return (
      required > 0 &&
      (beforeDeliveries[resourceId] ?? 0) + 1e-6 < required &&
      (afterDeliveries[resourceId] ?? 0) + 1e-6 >= required
    );
  });
  const moneyRequired = project.moneyRequirement ?? 0;
  if (
    moneyRequired > 0 &&
    getUpgradeProjectMoneyDelivered(before, project.id) + 1e-6 < moneyRequired &&
    getUpgradeProjectMoneyDelivered(after, project.id) + 1e-6 >= moneyRequired
  ) {
    return 'money';
  }
  return newlyCompleted.at(-1) ?? null;
};

const advanceBySeconds = (input: GameState, seconds: number) => {
  let state = input;
  let remaining = seconds;
  while (remaining > 1e-9) {
    const step = Math.min(60, remaining);
    state = tickGame(state, step);
    remaining -= step;
  }
  return state;
};

/**
 * Runs a deterministic, intentionally understandable baseline player. The policy makes several
 * construction/hiring/upgrade investments per decision, reassigns workers, delivers everything
 * affordable to the current project, then lets the real game tick until the next decision.
 */
export const simulatePlayerProgression = (
  options: ProgressionSimulatorOptions = {},
): ProgressionSimulationResult => {
  const decisionIntervalSeconds = Math.max(1, options.decisionIntervalSeconds ?? 60);
  const maxGameSeconds = Math.max(decisionIntervalSeconds, options.maxGameSeconds ?? 6 * 60 * 60);
  const manualActions = Math.max(0, options.manualGatherActionsPerDecision ?? 12);
  const maxInvestmentsPerDecision = Math.max(
    1,
    Math.trunc(options.maxInvestmentsPerDecision ?? 8),
  );
  const targetWorkers = { ...defaultTargetWorkers, ...options.targetWorkersByChapter };
  const targetLevels = { ...defaultTargetLevels, ...options.targetBuildingLevelByChapter };
  const bookPacksToBuy = Math.max(0, Math.trunc(options.bookPacksToBuy ?? 5));
  const bookPurchaseTiming = options.bookPurchaseTiming ?? 'workforce-target';
  const completeContractsBeforeProjects = options.completeContractsBeforeProjects ?? true;
  const deliverWhileGrowing = options.deliverWhileGrowing ?? false;
  const productionPolicy = options.productionPolicy ?? 'goal';
  const maxMarketRoundTripsPerDecision = Math.max(
    0,
    Math.trunc(options.maxMarketRoundTripsPerDecision ?? 0),
  );
  let state = options.initialState ? cloneGameState(options.initialState) : createInitialGameState(0);
  if (options.offlineChargeSeconds !== undefined) {
    state.offline.chargeSeconds = Math.max(0, options.offlineChargeSeconds);
  }
  const startingOfflineCharge = state.offline.chargeSeconds;
  let bookPacksPurchased = 0;
  let firstBookPurchaseAtSeconds: number | null = null;
  let contractsCompleted = 0;
  let marketArbitrageProfit = 0;
  let elapsedSeconds = 0;
  let decisions = 0;
  const timeline: ProgressionTimelineEntry[] = [];
  const chapters: ChapterProgressionReport[] = [];
  let activeChapter: ChapterProgressionReport = {
    chapterId: state.campaign.chapterId,
    label: chapterById[state.campaign.chapterId].label,
    startedAtSeconds: 0,
    completedAtSeconds: null,
    durationSeconds: null,
    decisionCount: 0,
    workersAtStart: state.workers.total,
    workersAtEnd: null,
    startingMoney: state.money,
    endingMoney: null,
    startingStockpile: snapshotStockpile(state),
    endingStockpile: null,
    lastRequirement: null,
  };
  chapters.push(activeChapter);

  while (!state.campaign.campaignComplete && elapsedSeconds <= maxGameSeconds) {
    const actions: string[] = [];
    if (
      state.campaign.unlockedSystems.offlineBoost &&
      state.offline.chargeSeconds > 0 &&
      !state.offline.active
    ) {
      state = activateOfflineBoost(state);
      if (state.offline.active) actions.push('activated offline boost');
    }
    const gathered = gatherManually(state, manualActions);
    state = gathered.state;
    if (gathered.action) actions.push(gathered.action);

    const contractRun = runContractPolicy(state);
    state = contractRun.state;
    actions.push(...contractRun.actions);
    contractsCompleted += contractRun.completed;

    const roundTrips = runProfitableMarketRoundTrips(state, maxMarketRoundTripsPerDecision);
    state = roundTrips.state;
    actions.push(...roundTrips.actions);
    marketArbitrageProfit += roundTrips.profit;

    for (let investmentIndex = 0; investmentIndex < maxInvestmentsPerDecision; investmentIndex += 1) {
      const investment = makeOneInvestment(
        state,
        targetWorkers[state.campaign.chapterId],
        targetLevels[state.campaign.chapterId],
      );
      state = investment.state;
      if (!investment.action) break;
      actions.push(investment.action);
    }

    if (
      state.campaign.unlockedSystems.library &&
      (bookPurchaseTiming === 'village-early' ||
        state.workers.total >= targetWorkers[state.campaign.chapterId]) &&
      bookPacksPurchased < bookPacksToBuy
    ) {
      const desiredPackCount = bookPacksToBuy - bookPacksPurchased;
      const desiredBookMoney = desiredPackCount * BASIC_BOOK_PACK_COST;
      if (state.money < desiredBookMoney) {
        const trade = sellForMoney(
          state,
          desiredBookMoney,
          true,
          completeContractsBeforeProjects,
        );
        state = trade.state;
        if (trade.sold.length > 0) actions.push(`sold ${trade.sold.join(', ')} for books`);
      }
      const packCount = Math.min(
        desiredPackCount,
        Math.floor(state.money / BASIC_BOOK_PACK_COST),
      );
      if (packCount > 0) {
        state = upgradeAllPossibleBooks(buyBookPack(state, packCount));
        bookPacksPurchased += packCount;
        firstBookPurchaseAtSeconds ??= elapsedSeconds;
        actions.push(`bought ${packCount} book pack${packCount === 1 ? '' : 's'}`);
      }
    }

    const hasPendingContracts =
      getActiveContracts(state).length > 0 || getAvailableContracts(state).length > 0;
    const currentProject = getCurrentUpgradeProject(state);
    const moneyRemaining = Math.max(
      0,
      (currentProject.moneyRequirement ?? 0) -
        getUpgradeProjectMoneyDelivered(state, currentProject.id),
    );
    const fundingTarget = Math.ceil(moneyRemaining) + (moneyRemaining > 0 ? 1 : 0);
    if (
      fundingTarget > state.money &&
      state.workers.total >= targetWorkers[state.campaign.chapterId] &&
      (!completeContractsBeforeProjects || !hasPendingContracts)
    ) {
      const trade = sellForMoney(
        state,
        fundingTarget,
        true,
        completeContractsBeforeProjects,
      );
      state = trade.state;
      if (trade.sold.length > 0) actions.push(`sold ${trade.sold.join(', ')} for project funding`);
    }

    if (productionPolicy === 'goal') {
      const targetWorkerCount = targetWorkers[state.campaign.chapterId];
      const allChapterBuildingsConstructed = chapterById[
        state.campaign.chapterId
      ].availableBuildingIds.every((buildingId) => isBuildingConstructed(state, buildingId));
      const plannerMoneyTarget =
        !allChapterBuildingsConstructed
          ? state.money
          : state.workers.total < Math.min(targetWorkerCount, state.workers.housingCapacity)
          ? getWorkerHireCost(state)
          : (currentProject.moneyRequirement ?? 0) > 0
            ? Math.max(
                state.money,
                (currentProject.moneyRequirement ?? 0) -
                  getUpgradeProjectMoneyDelivered(state, currentProject.id),
              )
            : state.money;
      state = applyProductionPlan(
        state,
        createProductionPlan(state, {
          foodHorizonSeconds: Math.max(180, decisionIntervalSeconds * 3),
          moneyTarget: plannerMoneyTarget,
          reserveNextHousingUpgrade: state.workers.housingCapacity < targetWorkerCount,
          includeContractDemand: completeContractsBeforeProjects,
        }),
      );
    } else {
      state = configureRecipes(state, targetWorkers[state.campaign.chapterId]);
      state = assignPolicyWorkers(state, targetWorkers[state.campaign.chapterId]);
    }
    const beforeContribution = state;
    state = contributeEverything(
      state,
      targetWorkers[state.campaign.chapterId],
      decisionIntervalSeconds,
      !completeContractsBeforeProjects || !hasPendingContracts,
      deliverWhileGrowing,
      completeContractsBeforeProjects,
    );
    const project = getCurrentUpgradeProject(state);
    if (state !== beforeContribution) {
      actions.push('delivered available project requirements');
    }

    activeChapter.decisionCount += 1;
    decisions += 1;
    timeline.push({
      atSeconds: elapsedSeconds,
      chapterId: state.campaign.chapterId,
      projectProgress: getCurrentUpgradeProjectProgress(state),
      workers: state.workers.total,
      money: Number(state.money.toFixed(2)),
      actions,
    });

    if (isUpgradeProjectComplete(state, project.id)) {
      activeChapter.lastRequirement = findLastRequirement(beforeContribution, state);
      activeChapter.completedAtSeconds = elapsedSeconds;
      activeChapter.durationSeconds = elapsedSeconds - activeChapter.startedAtSeconds;
      activeChapter.workersAtEnd = state.workers.total;
      activeChapter.endingMoney = Number(state.money.toFixed(2));
      activeChapter.endingStockpile = snapshotStockpile(state);
      const previousChapterId = state.campaign.chapterId;
      state = advanceChapter(state);
      actions.push(state.campaign.campaignComplete ? 'completed campaign' : 'advanced chapter');

      if (!state.campaign.campaignComplete && state.campaign.chapterId !== previousChapterId) {
        activeChapter = {
          chapterId: state.campaign.chapterId,
          label: chapterById[state.campaign.chapterId].label,
          startedAtSeconds: elapsedSeconds,
          completedAtSeconds: null,
          durationSeconds: null,
          decisionCount: 0,
          workersAtStart: state.workers.total,
          workersAtEnd: null,
          startingMoney: Number(state.money.toFixed(2)),
          endingMoney: null,
          startingStockpile: snapshotStockpile(state),
          endingStockpile: null,
          lastRequirement: null,
        };
        chapters.push(activeChapter);
      }
    }

    if (state.campaign.campaignComplete) {
      break;
    }
    state = advanceBySeconds(state, decisionIntervalSeconds);
    elapsedSeconds += decisionIntervalSeconds;
  }

  return {
    completed: state.campaign.campaignComplete,
    elapsedSeconds,
    decisions,
    chapters: chapters.filter((chapter) => chapterIds.includes(chapter.chapterId)),
    timeline,
    finalState: state,
    systemsUsed: {
      bookPacksPurchased,
      firstBookPurchaseAtSeconds,
      contractsCompleted,
      offlineBoostGameSecondsUsed: Math.max(0, startingOfflineCharge - state.offline.chargeSeconds),
      marketArbitrageProfit,
    },
  };
};

export const formatProgressionDuration = (seconds: number | null) => {
  if (seconds === null) return 'not reached';
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.round(seconds % 60);
  return `${minutes}m ${String(remainder).padStart(2, '0')}s`;
};
