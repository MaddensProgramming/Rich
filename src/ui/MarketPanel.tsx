import type { GameStore } from '../store/gameStore';
import { formatNumber } from './format';

interface MarketPanelProps {
  game: GameStore;
}

export function MarketPanel({ game }: MarketPanelProps) {
  return (
    <section className="panel market-panel" aria-label="Market">
      <div className="panel-heading">
        <div>
          <h2>Market</h2>
          <p>Prices react to buying and selling, then drift back over time.</p>
        </div>
      </div>

      <div className="market-table">
        <div className="market-header">
          <span>Resource</span>
          <span>Owned</span>
          <span>Sell</span>
          <span>Buy</span>
          <span>Pressure</span>
          <span>Trade</span>
        </div>
        {game.definitions.resources.map((resource) => {
          const price = game.marketPrices[resource.id];
          const quantity = resource.category === 'processed' ? 1 : 10;
          const canBuy = game.money >= price.buy * quantity;
          const canSell = game.resources[resource.id] >= quantity;

          return (
            <div className="market-row" key={resource.id}>
              <span>{resource.label}</span>
              <strong>{formatNumber(game.resources[resource.id])}</strong>
              <span>${formatNumber(price.sell, 2)}</span>
              <span>${formatNumber(price.buy, 2)}</span>
              <span>{game.market[resource.id].pressure.toFixed(2)}x</span>
              <span className="trade-actions">
                <button
                  type="button"
                  onClick={() => game.sellResource(resource.id, quantity)}
                  disabled={!canSell}
                >
                  Sell {quantity}
                </button>
                <button
                  type="button"
                  onClick={() => game.buyResource(resource.id, quantity)}
                  disabled={!canBuy}
                >
                  Buy {quantity}
                </button>
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
