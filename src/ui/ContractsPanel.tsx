import {
  canCompleteContract,
  getActiveContracts,
  getAvailableContracts,
} from '../simulation';
import type { ResourceId } from '../simulation';
import type { GameStore } from '../store/gameStore';
import { formatNumber } from './format';
import { ResourceIcon } from './ResourceIcon';

interface ContractsPanelProps {
  game: GameStore;
}

const renderRequirements = (game: GameStore, required: Partial<Record<ResourceId, number>>) =>
  Object.entries(required)
    .filter(([, amount]) => (amount ?? 0) > 0)
    .map(([resourceId, amount]) => {
      const resource = game.definitions.resourceById[resourceId as ResourceId];
      const have = game.resources[resourceId as ResourceId];
      return (
        <span
          key={resourceId}
          className={have >= (amount ?? 0) ? 'contract-req met' : 'contract-req'}
          title={`${resource.label}: ${formatNumber(have, 0)}/${amount}`}
        >
          <ResourceIcon resourceId={resource.id} />
          {formatNumber(have, 0)}/{amount}
        </span>
      );
    });

export function ContractsPanel({ game }: ContractsPanelProps) {
  const active = getActiveContracts(game);
  const available = getAvailableContracts(game);

  return (
    <section className="panel contracts-panel" aria-label="Contracts">
      <div className="panel-heading">
        <div>
          <h2>Town Requests</h2>
          <p>Accept contracts, deliver goods, and earn money plus book rewards.</p>
        </div>
      </div>

      {active.length > 0 ? (
        <div className="contract-list">
          <h3>Active</h3>
          {active.map((contract) => {
            const ready = canCompleteContract(game, contract.id);
            return (
              <article className="contract-card" key={contract.id}>
                <strong>{contract.label}</strong>
                <p>{contract.description}</p>
                <div className="contract-reqs">{renderRequirements(game, contract.requiredResources)}</div>
                <div className="contract-reward">Reward: ${formatNumber(contract.rewardMoney, 0)}</div>
                <div className="contract-actions">
                  <button type="button" disabled={!ready} onClick={() => game.completeContract(contract.id)}>
                    Deliver
                  </button>
                  <button type="button" className="contract-abandon" onClick={() => game.abandonContract(contract.id)}>
                    Abandon
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}

      <div className="contract-list">
        <h3>Available</h3>
        {available.length === 0 ? (
          <div className="empty-state">No new requests right now.</div>
        ) : (
          available.map((contract) => (
            <article className="contract-card" key={contract.id}>
              <strong>{contract.label}</strong>
              <p>{contract.description}</p>
              <div className="contract-reqs">{renderRequirements(game, contract.requiredResources)}</div>
              <div className="contract-reward">Reward: ${formatNumber(contract.rewardMoney, 0)}</div>
              <button type="button" onClick={() => game.acceptContract(contract.id)}>
                Accept
              </button>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
