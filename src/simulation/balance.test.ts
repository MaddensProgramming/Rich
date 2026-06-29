import { describe, expect, it } from 'vitest';
import { contracts } from '../data/contracts';
import { chapterUpgradeProjects } from '../data/chapterProjects';
import {
  MAX_SHARE,
  MIN_CONTRACT_REWARD_TO_SELL_VALUE,
  MIN_CONTRACT_REWARD_TO_SELL_VALUE_WITH_BOOKS,
  MIN_SHARE,
  getAllContractEconomyReports,
  getAllBuildingValueProductionReports,
  getAllProjectBalanceReports,
  getProjectEffort,
} from './balance';

describe('chapter project balance', () => {
  it('keeps every requirement line within a meaningful effort share', () => {
    const reports = getAllProjectBalanceReports();
    for (const report of reports) {
      for (const line of report.lines) {
        expect(
          line.share,
          `${report.projectId} line ${String(line.key)} share ${(line.share * 100).toFixed(1)}%`,
        ).toBeGreaterThanOrEqual(MIN_SHARE);
        expect(
          line.share,
          `${report.projectId} line ${String(line.key)} share ${(line.share * 100).toFixed(1)}%`,
        ).toBeLessThanOrEqual(MAX_SHARE);
      }
      expect(report.flags, `${report.projectId} balance flags`).toEqual([]);
    }
  });

  it('scales total project effort monotonically across the campaign', () => {
    const totals = chapterUpgradeProjects.map((project) => getProjectEffort(project).total);
    for (let index = 1; index < totals.length; index += 1) {
      expect(totals[index]).toBeGreaterThan(totals[index - 1]);
    }
  });
});

describe('contract balance', () => {
  it('keeps the finite contract queue at ten requests', () => {
    expect(contracts).toHaveLength(10);
  });

  it('keeps contract money rewards competitive with market sell value', () => {
    const reports = getAllContractEconomyReports();

    for (const report of reports) {
      const minimum = report.hasBookRewards
        ? MIN_CONTRACT_REWARD_TO_SELL_VALUE_WITH_BOOKS
        : MIN_CONTRACT_REWARD_TO_SELL_VALUE;

      expect(
        report.rewardToSellValue,
        `${report.contractId} pays ${(report.rewardToSellValue * 100).toFixed(1)}% of market sell value`,
      ).toBeGreaterThanOrEqual(minimum);
    }
  });
});

describe('building value production balance', () => {
  it('reports each building by best villager value production', () => {
    const reports = getAllBuildingValueProductionReports();

    expect(reports.map((report) => report.buildingId)).toEqual([
      'mine',
      'lumberjack',
      'farm',
      'food_maker',
      'smelter',
      'blacksmith',
      'stonemason',
    ]);

    for (const report of reports) {
      expect(report.recipes.length, `${report.buildingId} recipes`).toBeGreaterThan(0);
      expect(
        Number.isFinite(report.valuePerWorkerSecond),
        `${report.buildingId} value per worker-second`,
      ).toBe(true);
      expect(Number.isFinite(report.relativeToMedian), `${report.buildingId} relative value`).toBe(true);
    }
  });
});
