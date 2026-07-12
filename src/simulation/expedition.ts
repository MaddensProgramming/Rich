import {
  BARRACKS_CONSTRUCTION_COST,
  EVACUATION_COST,
  EXPEDITION_ENEMY_POWER_MULTIPLIER,
  INVASION_DURATION_SECONDS,
  MAX_EXPERIENCE_PERK_LEVEL,
  NORTHERN_HOST_POWER,
  NORTHERN_HOST_REWARD_EXPERIENCE,
  NORTHERN_HOST_REWARD_MONEY,
  expeditionNodeById,
  expeditionNodes,
  troopById,
} from '../data/expedition';
import type {
  BattleReport,
  ExperiencePerkId,
  GameState,
  ResourceMap,
  TroopId,
} from './types';
import {
  canAffordResources,
  cloneGameState,
  spendResources,
  sumAssignedWorkers,
} from './utils';
import { createInitialGameState } from './gameState';
import { autoEquipBestBooks } from './books';

export interface BattlePreview extends BattleReport {
  accessible: boolean;
  alreadyDefeated: boolean;
  reason: string | null;
}

export type InvasionBattlePreview = BattleReport;

const troopIds: TroopId[] = ['militia', 'archer', 'guard'];

const multiplyCost = (cost: ResourceMap, quantity: number): ResourceMap =>
  Object.fromEntries(
    Object.entries(cost).map(([resourceId, amount]) => [resourceId, (amount ?? 0) * quantity]),
  ) as ResourceMap;

export const getUnassignedWorkerCount = (state: GameState) =>
  Math.max(0, state.workers.total - sumAssignedWorkers(state.buildings));

export const getArmyPower = (state: GameState) => {
  const basePower = troopIds.reduce(
    (total, troopId) => total + state.expedition.troops[troopId] * troopById[troopId].power *
      (1 + state.expedition.trainingLevels[troopId] * 0.1),
    0,
  );
  const experienceMultiplier = 1 + state.legacy.perks.battle_wisdom * 0.25;
  const relicMultiplier = state.expedition.relicSecured ? 1.25 : 1;
  return Math.round(basePower * experienceMultiplier * relicMultiplier);
};

export const isExpeditionNodeAccessible = (state: GameState, nodeId: string) => {
  const node = expeditionNodeById[nodeId];
  if (!node || !state.campaign.campaignComplete || !state.expedition.barracksConstructed) {
    return false;
  }
  if (state.expedition.phase === 'defeated' || state.expedition.defeatedNodeIds.includes(nodeId)) {
    return false;
  }
  return node.prerequisiteIds.every((id) => state.expedition.defeatedNodeIds.includes(id));
};

const getCasualtyCounts = (
  state: GameState,
  enemyPower: number,
  armyPower: number,
  victory: boolean,
): Record<TroopId, number> => {
  const totalTroops = troopIds.reduce((total, troopId) => total + state.expedition.troops[troopId], 0);
  const casualtyRate = victory
    ? Math.min(0.48, (enemyPower / Math.max(1, armyPower)) * 0.34)
    : Math.min(0.85, 0.5 + (enemyPower / Math.max(1, armyPower)) * 0.15);
  let remaining = Math.min(totalTroops, Math.max(victory ? 0 : 1, Math.floor(totalTroops * casualtyRate)));
  const casualties: Record<TroopId, number> = { militia: 0, archer: 0, guard: 0 };

  for (const troopId of troopIds) {
    const lost = Math.min(state.expedition.troops[troopId], remaining);
    casualties[troopId] = lost;
    remaining -= lost;
  }

  return casualties;
};

export const getBattlePreview = (state: GameState, nodeId: string): BattlePreview | null => {
  const node = expeditionNodeById[nodeId];
  if (!node) {
    return null;
  }

  const alreadyDefeated = state.expedition.defeatedNodeIds.includes(nodeId);
  const accessible = isExpeditionNodeAccessible(state, nodeId);
  const armyPower = getArmyPower(state);
  const enemyPower = Math.round(node.enemyPower * EXPEDITION_ENEMY_POWER_MULTIPLIER);
  const victory = armyPower >= enemyPower;
  let reason: string | null = null;

  if (!state.campaign.campaignComplete) {
    reason = 'Complete the Great Hall to unlock the mountain map.';
  } else if (!state.expedition.barracksConstructed) {
    reason = 'Construct the Barracks first.';
  } else if (alreadyDefeated) {
    reason = 'This location has already been secured.';
  } else if (state.expedition.phase === 'defeated') {
    reason = 'This expedition ended when St. Moritz fell.';
  } else {
    const missing = node.prerequisiteIds.filter(
      (id) => !state.expedition.defeatedNodeIds.includes(id),
    );
    if (missing.length > 0) {
      reason = `Secure ${missing.map((id) => expeditionNodeById[id]?.label ?? id).join(' and ')} first.`;
    }
  }

  return {
    nodeId,
    victory,
    armyPower,
    enemyPower,
    casualties: getCasualtyCounts(state, enemyPower, armyPower, victory),
    accessible,
    alreadyDefeated,
    reason,
  };
};

export const canConstructBarracks = (state: GameState) =>
  state.campaign.campaignComplete &&
  state.expedition.phase !== 'defeated' &&
  !state.expedition.barracksConstructed &&
  canAffordResources(state.resources, BARRACKS_CONSTRUCTION_COST);

export const constructBarracks = (state: GameState): GameState => {
  if (!canConstructBarracks(state)) {
    return state;
  }
  const next = cloneGameState(state);
  if (!spendResources(next.resources, BARRACKS_CONSTRUCTION_COST)) {
    return state;
  }
  next.expedition.barracksConstructed = true;
  return next;
};

export const canTrainTroops = (state: GameState, troopId: TroopId, requestedQuantity = 1) => {
  const quantity = Math.max(0, Math.trunc(requestedQuantity));
  const troop = troopById[troopId];
  return Boolean(
    troop &&
      quantity > 0 &&
      state.expedition.barracksConstructed &&
      state.expedition.phase !== 'defeated' &&
      getUnassignedWorkerCount(state) >= quantity &&
      state.money + 1e-9 >= troop.moneyCost * quantity &&
      canAffordResources(state.resources, multiplyCost(troop.cost, quantity)),
  );
};

export const trainTroops = (
  state: GameState,
  troopId: TroopId,
  requestedQuantity = 1,
): GameState => {
  const quantity = Math.max(0, Math.trunc(requestedQuantity));
  if (!canTrainTroops(state, troopId, quantity)) {
    return state;
  }
  const troop = troopById[troopId];
  const next = cloneGameState(state);
  if (!spendResources(next.resources, multiplyCost(troop.cost, quantity))) {
    return state;
  }
  next.money -= troop.moneyCost * quantity;
  next.workers.total -= quantity;
  next.expedition.troops[troopId] += quantity;
  return next;
};

export const getTroopTrainingCost = (state: GameState, troopId: TroopId) => {
  const level = state.expedition.trainingLevels[troopId];
  const count = state.expedition.troops[troopId];
  return { money: (level + 1) * count * 40, food: (level + 1) * count * 8 };
};

export const trainTroopFormation = (state: GameState, troopId: TroopId): GameState => {
  const cost = getTroopTrainingCost(state, troopId);
  if (!state.expedition.barracksConstructed || state.expedition.troops[troopId] <= 0 ||
      state.expedition.trainingLevels[troopId] >= 10 || state.money < cost.money ||
      state.resources.food < cost.food) return state;
  const next = cloneGameState(state);
  next.money -= cost.money;
  next.resources.food -= cost.food;
  next.expedition.trainingLevels[troopId] += 1;
  return next;
};

export const attackExpeditionNode = (state: GameState, nodeId: string): GameState => {
  const node = expeditionNodeById[nodeId];
  const preview = getBattlePreview(state, nodeId);
  if (!node || !preview?.accessible) {
    return state;
  }

  const next = cloneGameState(state);
  for (const troopId of troopIds) {
    next.expedition.troops[troopId] = Math.max(
      0,
      next.expedition.troops[troopId] - preview.casualties[troopId],
    );
  }
  next.expedition.lastBattle = {
    nodeId,
    victory: preview.victory,
    armyPower: preview.armyPower,
    enemyPower: preview.enemyPower,
    casualties: { ...preview.casualties },
  };

  if (!preview.victory) {
    return next;
  }

  next.expedition.defeatedNodeIds.push(nodeId);
  for (const [resourceId, amount] of Object.entries(node.reward)) {
    next.resources[resourceId as keyof typeof next.resources] += amount ?? 0;
  }
  next.money += node.rewardMoney;
  for (const reward of node.rewardBooks ?? []) {
    const key = `${reward.bookId}:${reward.rarity}` as const;
    next.books.owned[key] = (next.books.owned[key] ?? 0) + reward.count;
  }

  if (node.isRaidTown) {
    next.expedition.phase = 'invasion';
    next.expedition.invasionSecondsRemaining = INVASION_DURATION_SECONDS;
    next.expedition.relicSecured = true;
    next.books.owned['weapon_contracts:legendary'] =
      (next.books.owned['weapon_contracts:legendary'] ?? 0) + 1;
    return autoEquipBestBooks(next);
  }

  return next;
};

export const canPrepareEvacuation = (state: GameState) =>
  state.expedition.phase === 'invasion' &&
  !state.expedition.evacuationPrepared &&
  canAffordResources(state.resources, EVACUATION_COST);

export const prepareEvacuation = (state: GameState): GameState => {
  if (!canPrepareEvacuation(state)) {
    return state;
  }
  const next = cloneGameState(state);
  if (!spendResources(next.resources, EVACUATION_COST)) {
    return state;
  }
  next.expedition.evacuationPrepared = true;
  return next;
};

const getRunExperienceReward = (state: GameState) =>
  2 +
  Math.floor(state.expedition.defeatedNodeIds.length / 3) +
  (state.expedition.relicSecured ? 4 : 0) +
  (state.expedition.evacuationPrepared ? 3 : 0);

export const getInvasionBattlePreview = (state: GameState): InvasionBattlePreview => {
  const armyPower = getArmyPower(state);
  const victory = armyPower >= NORTHERN_HOST_POWER;
  return {
    nodeId: 'northern_host',
    victory,
    armyPower,
    enemyPower: NORTHERN_HOST_POWER,
    casualties: getCasualtyCounts(state, NORTHERN_HOST_POWER, armyPower, victory),
  };
};

const finishExpeditionInPlace = (state: GameState) => {
  if (state.expedition.phase === 'defeated') {
    return;
  }
  const reward = getRunExperienceReward(state);
  state.expedition.phase = 'defeated';
  state.expedition.invasionSecondsRemaining = 0;
  state.expedition.experienceEarnedThisRun = reward;
  state.legacy.experiencePoints += reward;
  state.legacy.totalExperienceEarned += reward;
};

export const defendTown = (state: GameState): GameState => {
  if (state.expedition.phase !== 'invasion') {
    return state;
  }

  const preview = getInvasionBattlePreview(state);
  const next = cloneGameState(state);
  for (const troopId of troopIds) {
    next.expedition.troops[troopId] = Math.max(
      0,
      next.expedition.troops[troopId] - preview.casualties[troopId],
    );
  }
  next.expedition.lastBattle = {
    ...preview,
    casualties: { ...preview.casualties },
  };

  if (!preview.victory) {
    finishExpeditionInPlace(next);
    return next;
  }

  const experienceReward = getRunExperienceReward(next) + NORTHERN_HOST_REWARD_EXPERIENCE;
  next.expedition.phase = 'victorious';
  next.expedition.invasionSecondsRemaining = 0;
  next.expedition.experienceEarnedThisRun = experienceReward;
  next.money += NORTHERN_HOST_REWARD_MONEY;
  next.legacy.experiencePoints += experienceReward;
  next.legacy.totalExperienceEarned += experienceReward;
  return next;
};

export const evacuateTown = (state: GameState): GameState => {
  if (state.expedition.phase !== 'invasion' || !state.expedition.evacuationPrepared) {
    return state;
  }
  const next = cloneGameState(state);
  finishExpeditionInPlace(next);
  return next;
};

export const advanceInvasionInPlace = (state: GameState, deltaSeconds: number) => {
  if (state.expedition.phase !== 'invasion') {
    return;
  }
  state.expedition.invasionSecondsRemaining = Math.max(
    0,
    state.expedition.invasionSecondsRemaining - Math.max(0, deltaSeconds),
  );
  if (state.expedition.invasionSecondsRemaining <= 1e-9) {
    finishExpeditionInPlace(state);
  }
};

export const getExperiencePerkUpgradeCost = (state: GameState, perkId: ExperiencePerkId) =>
  state.legacy.perks[perkId] + 1;

export const buyExperiencePerk = (state: GameState, perkId: ExperiencePerkId): GameState => {
  const level = state.legacy.perks[perkId];
  const cost = getExperiencePerkUpgradeCost(state, perkId);
  if (
    (state.expedition.phase !== 'defeated' && state.expedition.phase !== 'victorious') ||
    level >= MAX_EXPERIENCE_PERK_LEVEL ||
    state.legacy.experiencePoints < cost
  ) {
    return state;
  }
  const next = cloneGameState(state);
  next.legacy.experiencePoints -= cost;
  next.legacy.perks[perkId] += 1;
  return next;
};

export const startNextRun = (state: GameState, now = Date.now()): GameState => {
  if (state.expedition.phase !== 'defeated' && state.expedition.phase !== 'victorious') {
    return state;
  }
  const legacy = {
    ...state.legacy,
    runNumber: state.legacy.runNumber + 1,
    perks: { ...state.legacy.perks },
  };
  return createInitialGameState(now, legacy);
};

export const getClearedExpeditionCount = (state: GameState) =>
  state.expedition.defeatedNodeIds.length;

export const getTotalExpeditionNodeCount = () => expeditionNodes.length;
