import { resourceById, resourceIds } from '../data/resources';
import type { GameState, MarketPrice, ResourceId } from './types';
import { getMarketSellImpactMultiplier } from './books';
import { asFiniteNumber, clamp, cloneGameState } from './utils';

export const MARKET_PRESSURE_MIN = 0.25;
export const MARKET_PRESSURE_MAX = 4;
export const BUY_PRICE_MARKUP = 1.1;
export const MARKET_PRESSURE_IMPACT = 0.12;
export const MARKET_PRESSURE_RETURN_RATE = 0.0025;

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
  const quantity = Math.max(0, asFiniteNumber(requestedQuantity, 0));
  const buyPrice = getBuyPrice(state, resourceId);
  const affordableQuantity = buyPrice > 0 ? state.money / buyPrice : 0;
  const actualQuantity = Math.min(quantity, affordableQuantity);

  if (actualQuantity <= 0) {
    return state;
  }

  const next = cloneGameState(state);
  next.money = Math.max(0, next.money - actualQuantity * buyPrice);
  next.resources[resourceId] += actualQuantity;
  next.market[resourceId].pressure = clamp(
    next.market[resourceId].pressure + getPressureDelta(resourceId, actualQuantity),
    MARKET_PRESSURE_MIN,
    MARKET_PRESSURE_MAX,
  );

  return next;
};

export const sellResource = (
  state: GameState,
  resourceId: ResourceId,
  requestedQuantity: number,
): GameState => {
  const quantity = Math.max(0, asFiniteNumber(requestedQuantity, 0));
  const actualQuantity = Math.min(quantity, state.resources[resourceId]);

  if (actualQuantity <= 0) {
    return state;
  }

  const next = cloneGameState(state);
  const sellPrice = getSellPrice(state, resourceId);
  next.resources[resourceId] = Math.max(0, next.resources[resourceId] - actualQuantity);
  next.money += actualQuantity * sellPrice;
  next.market[resourceId].pressure = clamp(
    next.market[resourceId].pressure -
      getPressureDelta(resourceId, actualQuantity) * getMarketSellImpactMultiplier(state, resourceId),
    MARKET_PRESSURE_MIN,
    MARKET_PRESSURE_MAX,
  );

  return next;
};
