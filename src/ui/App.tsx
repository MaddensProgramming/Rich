import { useCallback, useEffect, useMemo, useState } from 'react';
import { OFFLINE_BOOST_MULTIPLIER } from '../simulation';
import type { BuildingId } from '../simulation';
import { useGameStore } from '../store/gameStore';
import { BuildingPanel } from './BuildingPanel';
import { LibraryPanel } from './LibraryPanel';
import { MarketPanel } from './MarketPanel';
import { ResourceBar } from './ResourceBar';
import { TownView } from './TownView';
import { WorkerPanel } from './WorkerPanel';
import { formatNumber } from './format';

type PanelId = 'buildings' | 'market' | 'library' | 'town';

export function App() {
  const game = useGameStore();
  const [activePanel, setActivePanel] = useState<PanelId>('buildings');
  const [selectedBuildingId, setSelectedBuildingId] = useState<BuildingId | null>(null);
  const [selectedBuildingVersion, setSelectedBuildingVersion] = useState(0);

  const selectBuildingFromTown = useCallback((buildingId: BuildingId) => {
    setSelectedBuildingId(buildingId);
    setSelectedBuildingVersion((version) => version + 1);
    setActivePanel('buildings');
  }, []);

  useEffect(() => {
    let frameId = 0;

    const frame = () => {
      game.advanceTime();
      frameId = requestAnimationFrame(frame);
    };

    frameId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(frameId);
  }, [game.advanceTime]);

  useEffect(() => {
    const intervalId = window.setInterval(game.saveNow, 10_000);
    const saveBeforeUnload = () => game.saveNow();
    window.addEventListener('beforeunload', saveBeforeUnload);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('beforeunload', saveBeforeUnload);
    };
  }, [game.saveNow]);

  const activePanelContent = useMemo(() => {
    if (activePanel === 'market') {
      return <MarketPanel game={game} />;
    }

    if (activePanel === 'library') {
      return <LibraryPanel game={game} />;
    }

    if (activePanel === 'town') {
      return <WorkerPanel game={game} />;
    }

    return (
      <BuildingPanel
        game={game}
        selectedBuildingId={selectedBuildingId}
        selectedBuildingVersion={selectedBuildingVersion}
      />
    );
  }, [activePanel, game, selectedBuildingId, selectedBuildingVersion]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <h1>Mountain Factory Idle</h1>
          <span>Game time {formatNumber(game.totalGameSeconds, 0)}s</span>
        </div>
        <div className="topbar-metrics">
          <div>
            <span>Money</span>
            <strong>${formatNumber(game.money)}</strong>
          </div>
          <div>
            <span>Workers</span>
            <strong>
              {game.workers.total}/{game.workers.housingCapacity}
            </strong>
          </div>
          <div className={game.stats.globalProductionMultiplier < 1 ? 'metric-danger' : ''}>
            <span>Food</span>
            <strong>{formatNumber(game.resources.food)}</strong>
          </div>
          <div className={game.offline.active ? 'metric-boost' : ''}>
            <span>Speed</span>
            <strong>{game.offline.active ? `${OFFLINE_BOOST_MULTIPLIER}x` : `${game.stats.gameSpeed.toFixed(1)}x`}</strong>
          </div>
        </div>
      </header>

      <ResourceBar game={game} />

      <main className="main-layout">
        <section className="town-section" aria-label="Town view">
          <TownView game={game} onSelectBuilding={selectBuildingFromTown} />
        </section>

        <section className="control-section">
          <nav className="panel-tabs" aria-label="Panels">
            {[
              ['buildings', 'Buildings'],
              ['market', 'Market'],
              ['library', 'Library'],
              ['town', 'Town'],
            ].map(([id, label]) => (
              <button
                className={activePanel === id ? 'active' : ''}
                key={id}
                type="button"
                onClick={() => setActivePanel(id as PanelId)}
              >
                {label}
              </button>
            ))}
          </nav>
          {activePanelContent}
        </section>
      </main>
    </div>
  );
}
