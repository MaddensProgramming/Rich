import { describe, expect, it } from 'vitest';
import { simulateToFirstInvasion } from './invasionSimulator';
import { optimizePolicyToFirstInvasion } from './policyOptimizer';

const humanScalePolicy = {
  maxGameSeconds: 45 * 60,
  maxExpeditionSeconds: 10 * 60,
  decisionIntervalSeconds: 20,
  expeditionDecisionIntervalSeconds: 10,
  manualGatherActionsPerDecision: 20,
  maxInvestmentsPerDecision: 20,
  targetWorkersByChapter: {
    arrival: 1,
    hamlet: 8,
    village: 16,
    mountain_town: 24,
  },
  targetBuildingLevelByChapter: {
    arrival: 1,
    hamlet: 2,
    village: 2,
    mountain_town: 3,
  },
  completeContractsBeforeProjects: false,
  deliverWhileGrowing: false,
  bookPacksToBuy: 10,
  productionPolicy: 'goal' as const,
  maxMarketRoundTripsPerDecision: 10,
};

describe('first-invasion policy optimizer', () => {
  it('finds a human-cadence policy that beats the active 2,000-second playtest', () => {
    const result = simulateToFirstInvasion(humanScalePolicy);

    expect(result.completed).toBe(true);
    expect(result.invasionStartedAtSeconds).not.toBeNull();
    expect(result.invasionStartedAtSeconds!).toBeLessThan(2_000);
    expect(result.finalState.expedition.phase).toBe('invasion');
    expect(result.finalState.expedition.defeatedNodeIds).toHaveLength(12);
    expect(result.campaign.systemsUsed.marketArbitrageProfit).toBeGreaterThan(0);
  });

  it('searches data-driven policy alternatives and reports market-dependent results', () => {
    const optimization = optimizePolicyToFirstInvasion({
      maxActionsPerMinute: 60,
      maxEvaluations: 4,
    });

    expect(optimization.evaluatedPolicies).toBe(4);
    expect(optimization.best.result.completed).toBe(true);
    expect(optimization.best.result.invasionStartedAtSeconds!).toBeLessThan(2_000);
    expect(optimization.warnings.some((warning) => warning.includes('market'))).toBe(true);
  });
});
