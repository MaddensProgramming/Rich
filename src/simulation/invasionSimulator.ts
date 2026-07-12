import { buildingIds } from '../data/buildings';
import {
  BARRACKS_CONSTRUCTION_COST,
  expeditionNodes,
  troopById,
  troops,
} from '../data/expedition';
import { assignWorkers, getWorkerHireCost, hireWorker } from './actions';
import { getMoneyUnitCost, getResourceUnitCost } from './balance';
import {
  attackExpeditionNode,
  canConstructBarracks,
  canTrainTroops,
  constructBarracks,
  getArmyPower,
  getBattlePreview,
  getTroopTrainingCost,
  isExpeditionNodeAccessible,
  trainTroops,
  trainTroopFormation,
} from './expedition';
import { applyProductionPlan, createProductionPlan } from './productionPlanner';
import {
  simulatePlayerProgression,
  sellForMoney,
  type ProgressionSimulationResult,
  type ProgressionSimulatorOptions,
} from './progressionSimulator';
import { tickGame } from './tick';
import type { GameState, ResourceId, ResourceMap, TroopId } from './types';

export interface FirstInvasionSimulatorOptions extends ProgressionSimulatorOptions {
  expeditionDecisionIntervalSeconds?: number;
  maxExpeditionSeconds?: number;
  refillCivilianWorkers?: boolean;
}

export interface ExpeditionTimelineEntry {
  atSeconds: number;
  armyPower: number;
  civilians: number;
  defeatedLocations: number;
  actions: string[];
}

export interface FirstInvasionSimulationResult {
  completed: boolean;
  invasionStartedAtSeconds: number | null;
  campaign: ProgressionSimulationResult;
  expeditionTimeline: ExpeditionTimelineEntry[];
  finalState: GameState;
}

const getTroopEffortPerPower = (troopId: TroopId) => {
  const troop = troopById[troopId];
  let effort = troop.moneyCost * getMoneyUnitCost();
  for (const [resourceId, amount] of Object.entries(troop.cost)) {
    effort += (amount ?? 0) * getResourceUnitCost(resourceId as ResourceId);
  }
  return effort / troop.power;
};

const preferredTroopIds = [...troops]
  .sort((left, right) => getTroopEffortPerPower(left.id) - getTroopEffortPerPower(right.id))
  .map((troop) => troop.id);

const getNextAccessibleNode = (state: GameState) =>
  expeditionNodes.find((node) => isExpeditionNodeAccessible(state, node.id)) ?? null;

const getTrainingDemand = (state: GameState): { troopId: TroopId; quantity: number } | null => {
  const node = getNextAccessibleNode(state);
  if (!node) return null;
  const missingPower = Math.max(0, (getBattlePreview(state, node.id)?.enemyPower ?? node.enemyPower) - getArmyPower(state));
  if (missingPower <= 0) return null;
  const troopId = preferredTroopIds[0];
  return { troopId, quantity: Math.ceil(missingPower / troopById[troopId].power) };
};

const getBestFormationTraining = (state: GameState) => {
  const before = getArmyPower(state);
  return preferredTroopIds
    .filter((troopId) => state.expedition.troops[troopId] > 0 && state.expedition.trainingLevels[troopId] < 10)
    .map((troopId) => {
      const cost = getTroopTrainingCost(state, troopId);
      const trained = trainTroopFormation({
        ...state,
        money: Math.max(state.money, cost.money),
        resources: { ...state.resources, food: Math.max(state.resources.food, cost.food) },
      }, troopId);
      const powerGain = Math.max(1, getArmyPower(trained) - before);
      return { troopId, cost, effortPerPower: (cost.money * getMoneyUnitCost() + cost.food * getResourceUnitCost('food')) / powerGain };
    })
    .sort((left, right) => left.effortPerPower - right.effortPerPower)[0] ?? null;
};

const addScaledCost = (target: ResourceMap, cost: ResourceMap, quantity = 1) => {
  for (const [resourceId, amount] of Object.entries(cost)) {
    target[resourceId as ResourceId] =
      (target[resourceId as ResourceId] ?? 0) + (amount ?? 0) * quantity;
  }
};

const unassignAllWorkers = (input: GameState) => {
  let state = input;
  for (const buildingId of buildingIds) state = assignWorkers(state, buildingId, 0);
  return state;
};

const trainAffordableQuantity = (
  state: GameState,
  troopId: TroopId,
  requestedQuantity: number,
) => {
  for (let quantity = requestedQuantity; quantity >= 1; quantity -= 1) {
    if (canTrainTroops(state, troopId, quantity)) {
      return { state: trainTroops(state, troopId, quantity), quantity };
    }
  }
  return { state, quantity: 0 };
};

const runExpeditionActions = (
  input: GameState,
  refillCivilianWorkers: boolean,
): { state: GameState; actions: string[] } => {
  let state = unassignAllWorkers(input);
  const actions: string[] = [];

  if (canConstructBarracks(state)) {
    state = constructBarracks(state);
    actions.push('constructed Barracks');
  }
  if (!state.expedition.barracksConstructed) return { state, actions };

  for (let action = 0; action < 50; action += 1) {
    const node = getNextAccessibleNode(state);
    if (!node) break;
    const preview = getBattlePreview(state, node.id);
    if (preview?.victory) {
      state = attackExpeditionNode(state, node.id);
      actions.push(`secured ${node.label}`);
      if (state.expedition.phase === 'invasion') break;
      continue;
    }

    const training = getTrainingDemand(state);
    if (!training) break;
    const formation = getBestFormationTraining(state);
    if (formation && formation.effortPerPower < getTroopEffortPerPower(training.troopId) &&
        state.money >= formation.cost.money && state.resources.food >= formation.cost.food) {
      state = trainTroopFormation(state, formation.troopId);
      actions.push(`trained ${troopById[formation.troopId].label} formation`);
      continue;
    }
    const trainingMoney = troopById[training.troopId].moneyCost * training.quantity;
    if (state.money + 1e-6 < trainingMoney) {
      const trade = sellForMoney(state, trainingMoney);
      state = trade.state;
      if (trade.sold.length > 0) actions.push(`sold ${trade.sold.join(', ')} for training`);
    }
    const trained = trainAffordableQuantity(state, training.troopId, training.quantity);
    if (trained.quantity <= 0) break;
    state = trained.state;
    actions.push(`trained ${trained.quantity} ${troopById[training.troopId].label}`);
  }

  if (refillCivilianWorkers && state.expedition.phase !== 'invasion') {
    for (let hire = 0; hire < 50 && state.workers.total < state.workers.housingCapacity; hire += 1) {
      const cost = getWorkerHireCost(state);
      if (state.money + 1e-6 < cost) break;
      const hired = hireWorker(state);
      if (hired === state) break;
      state = hired;
      actions.push('hired replacement worker');
    }
  }
  return { state, actions };
};

const configureExpeditionProduction = (
  state: GameState,
  decisionIntervalSeconds: number,
): GameState => {
  const additionalDemand: ResourceMap = {};
  let moneyTarget = state.money;
  if (!state.expedition.barracksConstructed) {
    addScaledCost(additionalDemand, BARRACKS_CONSTRUCTION_COST);
  } else {
    const training = getTrainingDemand(state);
    if (training) {
      const formation = getBestFormationTraining(state);
      if (formation && formation.effortPerPower < getTroopEffortPerPower(training.troopId)) {
        additionalDemand.food = (additionalDemand.food ?? 0) + formation.cost.food;
        moneyTarget += formation.cost.money;
      } else {
        addScaledCost(additionalDemand, troopById[training.troopId].cost, training.quantity);
        moneyTarget += troopById[training.troopId].moneyCost * training.quantity;
      }
    }
  }
  return applyProductionPlan(
    state,
    createProductionPlan(state, {
      additionalDemand,
      foodHorizonSeconds: Math.max(120, decisionIntervalSeconds * 3),
      includeContractDemand: false,
      moneyTarget,
    }),
  );
};

export const simulateToFirstInvasion = (
  options: FirstInvasionSimulatorOptions = {},
): FirstInvasionSimulationResult => {
  const campaign = simulatePlayerProgression(options);
  let state = campaign.finalState;
  let elapsedSeconds = campaign.elapsedSeconds;
  const decisionIntervalSeconds = Math.max(1, options.expeditionDecisionIntervalSeconds ?? 10);
  const deadline = elapsedSeconds + Math.max(0, options.maxExpeditionSeconds ?? 30 * 60);
  const expeditionTimeline: ExpeditionTimelineEntry[] = [];

  if (!campaign.completed) {
    return {
      completed: false,
      invasionStartedAtSeconds: null,
      campaign,
      expeditionTimeline,
      finalState: state,
    };
  }

  while (state.expedition.phase !== 'invasion' && elapsedSeconds <= deadline) {
    const decision = runExpeditionActions(state, options.refillCivilianWorkers ?? true);
    state = decision.state;
    expeditionTimeline.push({
      atSeconds: elapsedSeconds,
      armyPower: getArmyPower(state),
      civilians: state.workers.total,
      defeatedLocations: state.expedition.defeatedNodeIds.length,
      actions: decision.actions,
    });
    if (state.expedition.phase === 'invasion') break;
    state = configureExpeditionProduction(state, decisionIntervalSeconds);
    state = tickGame(state, decisionIntervalSeconds);
    elapsedSeconds += decisionIntervalSeconds;
  }

  return {
    completed: state.expedition.phase === 'invasion',
    invasionStartedAtSeconds: state.expedition.phase === 'invasion' ? elapsedSeconds : null,
    campaign,
    expeditionTimeline,
    finalState: state,
  };
};
