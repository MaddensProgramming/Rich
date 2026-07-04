import { describe, expect, it } from 'vitest';
import { contracts } from '../data/contracts';
import { chapterUpgradeProjects } from '../data/chapterProjects';
import {
  MAX_SHARE,
  MIN_CONTRACT_REWARD_TO_SELL_VALUE,
  MIN_CONTRACT_REWARD_TO_SELL_VALUE_WITH_BOOKS,
  MIN_SHARE,
  getAllContractEconomyReports,
  getAllProjectBalanceReports,
  getAllRecipeValueProductionReports,
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

describe('recipe value production balance', () => {
  it('reports each recipe by villager value production', () => {
    const reports = getAllRecipeValueProductionReports();

    expect(reports.map((report) => report.recipeId)).toEqual([
      'mine_coal_focus',
      'mine_iron_focus',
      'mine_stone_focus',
      'mine_balanced',
      'lumberjack_wood',
      'farm_vegetables',
      'food_maker_basic_food',
      'smelter_iron_bars',
      'blacksmith_swords',
      'blacksmith_bows',
      'lumberjack_planks',
      'blacksmith_tools',
      'stonemason_blocks',
    ]);

    for (const report of reports) {
      expect(
        Number.isFinite(report.valuePerWorkerSecond),
        `${report.recipeId} value per worker-second`,
      ).toBe(true);
      expect(Number.isFinite(report.relativeToMedian), `${report.recipeId} relative value`).toBe(true);
    }
  });
});
