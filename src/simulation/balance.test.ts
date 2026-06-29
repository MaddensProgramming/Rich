import { describe, expect, it } from 'vitest';
import { chapterUpgradeProjects } from '../data/chapterProjects';
import {
  MAX_SHARE,
  MIN_SHARE,
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
