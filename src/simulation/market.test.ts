import { describe, expect, it } from 'vitest';
import { createInitialGameState } from './gameState';
import { buyResource, sellResource } from './market';

describe('marginal market execution', () => {
  it.each([1, 50, 500, 5_000])('prevents profit on a %s-unit round trip', (quantity) => {
    const initial = createInitialGameState(0);
    initial.campaign.unlockedSystems.market = true;
    initial.resources.wood = quantity;
    initial.money = 1_000_000;
    const bought = buyResource(sellResource(initial, 'wood', quantity), 'wood', quantity);
    expect(bought.resources.wood).toBeCloseTo(quantity, 7);
    expect(bought.money).toBeLessThanOrEqual(initial.money + 1e-7);
  });

  it('charges marginal impact within a large batch', () => {
    const initial = createInitialGameState(0);
    initial.campaign.unlockedSystems.market = true;
    initial.money = 1_000_000;
    const bought = buyResource(initial, 'wood', 500);
    expect(initial.money - bought.money).toBeGreaterThan(500 * 2.6 * 1.1);
  });

  it.each([0.25, 4])('prevents arbitrage at the %s pressure clamp with the strongest impact book', (pressure) => {
    const initial = createInitialGameState(0);
    initial.campaign.unlockedSystems.market = true;
    initial.resources.swords = 5_000;
    initial.money = 10_000_000;
    initial.market.swords.pressure = pressure;
    initial.books.owned['weapon_contracts:legendary'] = 1;
    initial.buildings.blacksmith.equippedBooks = [
      { bookId: 'weapon_contracts', rarity: 'legendary' },
    ];

    const bought = buyResource(sellResource(initial, 'swords', 5_000), 'swords', 5_000);
    expect(bought.resources.swords).toBeCloseTo(5_000, 6);
    expect(bought.money).toBeLessThanOrEqual(initial.money + 1e-6);
  });
});
