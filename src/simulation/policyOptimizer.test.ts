import { describe, expect, it } from 'vitest';
import { buildingIds } from '../data/buildings';
import { createInitialGameState } from './gameState';
import { simulateToFirstInvasion } from './invasionSimulator';
import { optimizePolicyToFirstInvasion } from './policyOptimizer';

const createGreatHallFixture = () => {
  const state = createInitialGameState(0);
  state.campaign.chapterId = 'mountain_town';
  state.campaign.campaignComplete = true;
  state.campaign.unlockedSystems = {
    construction: true, manualGather: true, market: true, library: true,
    offlineBoost: true, contracts: true,
  };
  state.workers.total = 30;
  state.workers.housingCapacity = 40;
  state.money = 1_000;
  for (const buildingId of buildingIds) {
    state.campaign.constructedBuildings[buildingId] = true;
    state.buildings[buildingId].level = 5;
  }
  return state;
};

describe('first-invasion policy optimizer', () => {
  it('takes 20–30 minutes from the Great Hall baseline to the invasion', () => {
    const result = simulateToFirstInvasion({
      initialState: createGreatHallFixture(),
      maxGameSeconds: 1,
      maxExpeditionSeconds: 30 * 60,
      expeditionDecisionIntervalSeconds: 10,
    });

    expect(result.completed).toBe(true);
    expect(result.campaign.elapsedSeconds).toBe(0);
    expect(result.invasionStartedAtSeconds).toBeGreaterThanOrEqual(1_200);
    expect(result.invasionStartedAtSeconds).toBeLessThanOrEqual(1_800);
    expect(result.finalState.expedition.defeatedNodeIds).toHaveLength(12);
    expect(Object.values(result.finalState.expedition.trainingLevels).some((level) => level > 0)).toBe(true);
  });

  it('evaluates deterministic policies without relying on market round trips', () => {
    const optimization = optimizePolicyToFirstInvasion({
      maxActionsPerMinute: 60,
      maxEvaluations: 4,
      allowMarketRoundTrips: false,
    });

    expect(optimization.evaluatedPolicies).toBe(4);
    // Incomplete candidates are intentionally excluded from the leaderboard.
    for (const entry of optimization.leaderboard) {
      expect(entry.policy.maxMarketRoundTripsPerDecision).toBe(0);
      expect(entry.result.campaign.systemsUsed.marketArbitrageProfit).toBe(0);
    }
  });

  it('reports no round-trip profit even when a legacy policy requests attempts', () => {
    const result = simulateToFirstInvasion({
      maxGameSeconds: 120,
      decisionIntervalSeconds: 20,
      manualGatherActionsPerDecision: 20,
      maxMarketRoundTripsPerDecision: 20,
    });
    expect(result.campaign.systemsUsed.marketArbitrageProfit).toBe(0);
  });
});
