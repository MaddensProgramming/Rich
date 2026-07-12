import { resourceById, resourceIds } from '../data/resources';
import type { GameState, MarketAutomationRule, MarketPrice, ResourceId } from './types';
import { getMarketSellImpactMultiplier } from './books';
import { asFiniteNumber, clamp, cloneGameState } from './utils';

export const MARKET_PRESSURE_MIN = 0.25;
export const MARKET_PRESSURE_MAX = 4;
export const BUY_PRICE_MARKUP = 1.1;
export const MARKET_PRESSURE_IMPACT = 0.12;
export const MARKET_PRESSURE_RETURN_RATE = 0.0025;
export const AUTO_MARKET_INTERVAL_SECONDS = 1;

export const getSellPrice = (state: GameState, resourceId: ResourceId) =>
  resourceById[resourceId].basePrice * state.market[resourceId].pressure;

export const getBuyPrice = (state: GameState, resourceId: ResourceId) =>
  getSellPrice(state, resourceId) * BUY_PRICE_MARKUP;

export const getMarketPrice = (state: GameState, resourceId: ResourceId): MarketPrice => ({
  sell: getSellPrice(state, resourceId),
  buy: getBuyPrice(state, resourceId),
});

export const getMarketPrices = (state: GameState) =>
  Object.fromEntries(
    resourceIds.map((resourceId) => [resourceId, getMarketPrice(state, resourceId)]),
  ) as Record<ResourceId, MarketPrice>;

const getPressureDelta = (resourceId: ResourceId, quantity: number) =>
  (quantity / resourceById[resourceId].marketDepth) * MARKET_PRESSURE_IMPACT;

// Trades execute against every marginal price crossed by the order, rather than
// valuing the whole batch at its opening quote.  This is the integral of the
// (clamped) linear pressure curve and is deliberately shared by manual and
// automated trades.
const getIntegratedPressure = (start: number, pressureDelta: number) => {
  if (pressureDelta === 0) return start;
  const end = clamp(start + pressureDelta, MARKET_PRESSURE_MIN, MARKET_PRESSURE_MAX);
  const moved = end - start;
  const flat = pressureDelta - moved;
  return ((start + end) * 0.5 * moved + end * flat) / pressureDelta;
};

const getBuyCost = (state: GameState, resourceId: ResourceId, quantity: number) =>
  quantity * resourceById[resourceId].basePrice * BUY_PRICE_MARKUP *
  getIntegratedPressure(state.market[resourceId].pressure, getPressureDelta(resourceId, quantity));

const getSellRevenue = (state: GameState, resourceId: ResourceId, quantity: number) => {
  const delta = -getPressureDelta(resourceId, quantity) * getMarketSellImpactMultiplier(state, resourceId);
  return quantity * resourceById[resourceId].basePrice *
    getIntegratedPressure(state.market[resourceId].pressure, delta);
};

const normalizeThreshold = (
  value: number | null | undefined,
  fallback: number | null,
  allowZero: boolean,
) => {
  if (value === undefined) {
    return fallback;
  }

  if (value === null) {
    return null;
  }

  const amount = asFiniteNumber(value, Number.NaN);
  const minimum = allowZero ? 0 : Number.MIN_VALUE;
  return Number.isFinite(amount) && amount >= minimum ? amount : fallback;
};

const buyResourceInPlace = (state: GameState, resourceId: ResourceId, requestedQuantity: number) => {
  const quantity = Math.max(0, asFiniteNumber(requestedQuantity, 0));
  let low = 0;
  let high = quantity;
  for (let iteration = 0; iteration < 48; iteration += 1) {
    const midpoint = (low + high) / 2;
    if (getBuyCost(state, resourceId, midpoint) <= state.money) low = midpoint;
    else high = midpoint;
  }
  const actualQuantity = low;

  if (actualQuantity <= 0) {
    return false;
  }

  state.money = Math.max(0, state.money - getBuyCost(state, resourceId, actualQuantity));
  state.resources[resourceId] += actualQuantity;
  state.market[resourceId].pressure = clamp(
    state.market[resourceId].pressure + getPressureDelta(resourceId, actualQuantity),
    MARKET_PRESSURE_MIN,
    MARKET_PRESSURE_MAX,
  );

  return true;
};

const sellResourceInPlace = (state: GameState, resourceId: ResourceId, requestedQuantity: number) => {
  const quantity = Math.max(0, asFiniteNumber(requestedQuantity, 0));
  const actualQuantity = Math.min(quantity, state.resources[resourceId]);

  if (actualQuantity <= 0) {
    return false;
  }

  state.resources[resourceId] = Math.max(0, state.resources[resourceId] - actualQuantity);
  state.money += getSellRevenue(state, resourceId, actualQuantity);
  state.market[resourceId].pressure = clamp(
    state.market[resourceId].pressure -
      getPressureDelta(resourceId, actualQuantity) * getMarketSellImpactMultiplier(state, resourceId),
    MARKET_PRESSURE_MIN,
    MARKET_PRESSURE_MAX,
  );

  return true;
};

export const driftMarketPressureInPlace = (state: GameState, deltaSeconds: number) => {
  const drift = 1 - Math.exp(-MARKET_PRESSURE_RETURN_RATE * Math.max(0, deltaSeconds));

  for (const resourceId of resourceIds) {
    const pressure = asFiniteNumber(state.market[resourceId]?.pressure, 1);
    state.market[resourceId].pressure = clamp(
      pressure + (1 - pressure) * drift,
      MARKET_PRESSURE_MIN,
      MARKET_PRESSURE_MAX,
    );
  }
};

export const buyResource = (
  state: GameState,
  resourceId: ResourceId,
  requestedQuantity: number,
): GameState => {
  if (!state.campaign.unlockedSystems.market) {
    return state;
  }

  const next = cloneGameState(state);
  if (!buyResourceInPlace(next, resourceId, requestedQuantity)) {
    return state;
  }

  return next;
};

export const sellResource = (
  state: GameState,
  resourceId: ResourceId,
  requestedQuantity: number,
): GameState => {
  if (!state.campaign.unlockedSystems.market) {
    return state;
  }

  const next = cloneGameState(state);
  if (!sellResourceInPlace(next, resourceId, requestedQuantity)) {
    return state;
  }

  return next;
};

export const setMarketAutomationRule = (
  state: GameState,
  resourceId: ResourceId,
  patch: Partial<Omit<MarketAutomationRule, 'lastRunAt'>>,
): GameState => {
  if (!state.campaign.unlockedSystems.market) {
    return state;
  }

  const current = state.marketAutomation[resourceId];
  const next = cloneGameState(state);
  const batchSize = Math.trunc(asFiniteNumber(patch.batchSize, current.batchSize));

  next.marketAutomation[resourceId] = {
    buyBelow: normalizeThreshold(patch.buyBelow, current.buyBelow, false),
    sellAbove: normalizeThreshold(patch.sellAbove, current.sellAbove, true),
    batchSize: clamp(batchSize, 1, 1000),
    lastRunAt: current.lastRunAt,
  };

  return next;
};

export const applyMarketAutomation = (state: GameState): GameState => {
  if (!state.campaign.unlockedSystems.market) {
    return state;
  }

  const hasDueRule = resourceIds.some((resourceId) => {
    const rule = state.marketAutomation[resourceId];
    const ruleEnabled = rule.buyBelow !== null || rule.sellAbove !== null;
    return (
      ruleEnabled &&
      (state.totalGameSeconds < rule.lastRunAt ||
        state.totalGameSeconds - rule.lastRunAt >= AUTO_MARKET_INTERVAL_SECONDS)
    );
  });

  if (!hasDueRule) {
    return state;
  }

  const next = cloneGameState(state);

  for (const resourceId of resourceIds) {
    const rule = next.marketAutomation[resourceId];
    const ruleEnabled = rule.buyBelow !== null || rule.sellAbove !== null;
    const due =
      next.totalGameSeconds < rule.lastRunAt ||
      next.totalGameSeconds - rule.lastRunAt >= AUTO_MARKET_INTERVAL_SECONDS;

    if (!ruleEnabled || !due) {
      continue;
    }

    if (rule.sellAbove !== null && next.resources[resourceId] > rule.sellAbove) {
      sellResourceInPlace(
        next,
        resourceId,
        Math.min(rule.batchSize, next.resources[resourceId] - rule.sellAbove),
      );
    } else if (rule.buyBelow !== null && next.resources[resourceId] < rule.buyBelow) {
      buyResourceInPlace(
        next,
        resourceId,
        Math.min(rule.batchSize, rule.buyBelow - next.resources[resourceId]),
      );
    }

    rule.lastRunAt = next.totalGameSeconds;
  }

  return next;
};
