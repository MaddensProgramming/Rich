import { formatProgressionDuration } from '../src/simulation/progressionSimulator';
import { simulateToFirstInvasion } from '../src/simulation/invasionSimulator';

const packCounts = process.argv.slice(2).map(Number).filter(Number.isFinite);
const requestedPackCounts = packCounts.length > 0 ? packCounts : [20, 25, 30, 40, 50];
const scenarios = [
  {
    label: 'Normal economy',
    decisionIntervalSeconds: 30,
    targetWorkersByChapter: { arrival: 1, hamlet: 6, village: 12, mountain_town: 16 },
    maxMarketRoundTripsPerDecision: 0,
  },
  {
    label: 'Current market rules',
    decisionIntervalSeconds: 20,
    targetWorkersByChapter: { arrival: 1, hamlet: 8, village: 16, mountain_town: 22 },
    maxMarketRoundTripsPerDecision: 10,
  },
] as const;

for (const scenario of scenarios) {
  const rows = requestedPackCounts.map((bookPacksToBuy) => {
      const result = simulateToFirstInvasion({
        maxGameSeconds: 45 * 60,
        maxExpeditionSeconds: 30 * 60,
        decisionIntervalSeconds: scenario.decisionIntervalSeconds,
        expeditionDecisionIntervalSeconds: 10,
        manualGatherActionsPerDecision: scenario.decisionIntervalSeconds,
        maxInvestmentsPerDecision: scenario.decisionIntervalSeconds,
        targetWorkersByChapter: scenario.targetWorkersByChapter,
        targetBuildingLevelByChapter: { arrival: 1, hamlet: 2, village: 2, mountain_town: 3 },
        completeContractsBeforeProjects: false,
        deliverWhileGrowing: false,
        productionPolicy: 'goal',
        maxMarketRoundTripsPerDecision: scenario.maxMarketRoundTripsPerDecision,
        bookPacksToBuy,
        bookPurchaseTiming: 'workforce-target',
      });
      return {
        requested: bookPacksToBuy,
        purchased: result.campaign.systemsUsed.bookPacksPurchased,
        firstPurchase: formatProgressionDuration(
          result.campaign.systemsUsed.firstBookPurchaseAtSeconds,
        ),
        greatHall: formatProgressionDuration(result.campaign.elapsedSeconds),
        invasion: formatProgressionDuration(result.invasionStartedAtSeconds),
        arbitrageProfit: Math.round(result.campaign.systemsUsed.marketArbitrageProfit),
      };
    });
  console.log(`\n${scenario.label}`);
  console.table(rows);
}
