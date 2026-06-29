import { useState } from 'react';
import type { ResourceId } from '../simulation';
import type { GameStore } from '../store/gameStore';
import { formatNumber } from './format';

interface MarketPanelProps {
  game: GameStore;
}

const TRADE_QUANTITY_OPTIONS = [1, 10, 100, 1000];

const getDefaultBuyThreshold = (resourceId: ResourceId) => {
  if (resourceId === 'iron_bars' || resourceId === 'bows' || resourceId === 'swords') {
    return 3;
  }

  return resourceId === 'food' ? 25 : 20;
};

const getDefaultSellThreshold = (resourceId: ResourceId) => {
  if (resourceId === 'iron_bars' || resourceId === 'bows' || resourceId === 'swords') {
    return 8;
  }

  return resourceId === 'food' ? 80 : 100;
};

const parseOptionalAmount = (value: string) => {
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
};

export function MarketPanel({ game }: MarketPanelProps) {
  const [tradeQuantity, setTradeQuantity] = useState(10);
  const [showAutomation, setShowAutomation] = useState(false);
  const normalizedTradeQuantity = Math.max(1, Math.trunc(tradeQuantity));

  return (
    <section className="panel market-panel" aria-label="Market">
      <div className="panel-heading">
        <div>
          <h2>Market</h2>
          <p>Prices react to buying and selling, then drift back over time.</p>
        </div>
        <div className="quantity-control" aria-label="Trade quantity">
          {TRADE_QUANTITY_OPTIONS.map((quantity) => (
            <button
              className={normalizedTradeQuantity === quantity ? 'active' : ''}
              key={quantity}
              type="button"
              onClick={() => setTradeQuantity(quantity)}
            >
              x{quantity}
            </button>
          ))}
          <label>
            x
            <input
              min="1"
              type="number"
              value={tradeQuantity}
              onChange={(event) => setTradeQuantity(Math.max(1, Number(event.currentTarget.value) || 1))}
            />
          </label>
          <button
            className={showAutomation ? 'active' : ''}
            type="button"
            onClick={() => setShowAutomation((value) => !value)}
          >
            Auto
          </button>
        </div>
      </div>

      <div className="market-table">
        <div className="market-header">
          <span>Resource</span>
          <span>Owned</span>
          <span>Prices</span>
          <span>Pressure</span>
          <span>Trade</span>
          <span>Automation</span>
        </div>
        {game.definitions.resources.map((resource) => {
          const price = game.marketPrices[resource.id];
          const canBuy = game.money >= price.buy * normalizedTradeQuantity;
          const canSell = game.resources[resource.id] >= normalizedTradeQuantity;
          const rule = game.marketAutomation[resource.id];
          const autoBuyEnabled = rule.buyBelow !== null;
          const autoSellEnabled = rule.sellAbove !== null;

          return (
            <div className={showAutomation ? 'market-row automation-visible' : 'market-row'} key={resource.id}>
              <span className="market-resource-name">{resource.label}</span>
              <strong>{formatNumber(game.resources[resource.id])}</strong>
              <span className="price-stack">
                <span>Sell ${formatNumber(price.sell, 2)}</span>
                <span>Buy ${formatNumber(price.buy, 2)}</span>
              </span>
              <span>{game.market[resource.id].pressure.toFixed(2)}x</span>
              <span className="trade-actions">
                <button
                  type="button"
                  onClick={() => game.sellResource(resource.id, normalizedTradeQuantity)}
                  disabled={!canSell}
                >
                  Sell x{normalizedTradeQuantity}
                </button>
                <button
                  type="button"
                  onClick={() => game.buyResource(resource.id, normalizedTradeQuantity)}
                  disabled={!canBuy}
                >
                  Buy x{normalizedTradeQuantity}
                </button>
              </span>
              {showAutomation ? (
                <div className="auto-market-controls">
                  <div className="auto-market-grid">
                  <label className="checkbox-line">
                    <input
                      type="checkbox"
                      checked={autoBuyEnabled}
                      onChange={(event) =>
                        game.setMarketAutomationRule(resource.id, {
                          buyBelow: event.currentTarget.checked
                            ? rule.buyBelow ?? getDefaultBuyThreshold(resource.id)
                            : null,
                        })
                      }
                    />
                    Buy below
                  </label>
                  <input
                    aria-label={`${resource.label} auto-buy below`}
                    disabled={!autoBuyEnabled}
                    min="0"
                    type="number"
                    value={rule.buyBelow ?? ''}
                    onChange={(event) =>
                      game.setMarketAutomationRule(resource.id, {
                        buyBelow: parseOptionalAmount(event.currentTarget.value),
                      })
                    }
                  />
                  <label className="checkbox-line">
                    <input
                      type="checkbox"
                      checked={autoSellEnabled}
                      onChange={(event) =>
                        game.setMarketAutomationRule(resource.id, {
                          sellAbove: event.currentTarget.checked
                            ? rule.sellAbove ?? getDefaultSellThreshold(resource.id)
                            : null,
                        })
                      }
                    />
                    Sell above
                  </label>
                  <input
                    aria-label={`${resource.label} auto-sell above`}
                    disabled={!autoSellEnabled}
                    min="0"
                    type="number"
                    value={rule.sellAbove ?? ''}
                    onChange={(event) =>
                      game.setMarketAutomationRule(resource.id, {
                        sellAbove: parseOptionalAmount(event.currentTarget.value),
                      })
                    }
                  />
                  <label className="batch-input">
                    Batch
                    <input
                      min="1"
                      type="number"
                      value={rule.batchSize}
                      onChange={(event) =>
                        game.setMarketAutomationRule(resource.id, {
                          batchSize: Math.max(1, Number(event.currentTarget.value) || 1),
                        })
                      }
                    />
                  </label>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
