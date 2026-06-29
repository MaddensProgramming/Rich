import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { OFFLINE_BOOST_MULTIPLIER } from '../simulation';
import { useGameStore } from '../store/gameStore';
import { ResourceBar } from './ResourceBar';
import { TownContextPopup, readCampaignDisplay } from './TownContextPopup';
import { TownView } from './TownView';
import type { TownHotspotSelection } from './townHotspots';
import { formatNumber } from './format';

export function App() {
  const game = useGameStore();
  const [activeHotspot, setActiveHotspot] = useState<TownHotspotSelection | null>(null);
  const [activeHotspotVersion, setActiveHotspotVersion] = useState(0);
  const townInputBlockedUntilRef = useRef(0);

  const campaign = useMemo(() => readCampaignDisplay(game), [game]);

  const selectHotspot = useCallback((selection: TownHotspotSelection) => {
    if (performance.now() < townInputBlockedUntilRef.current) {
      return;
    }

    setActiveHotspot(selection);
    setActiveHotspotVersion((version) => version + 1);
  }, []);

  const blockTownInputBriefly = useCallback(() => {
    townInputBlockedUntilRef.current = performance.now() + 180;
  }, []);

  const closePopup = useCallback(() => {
    blockTownInputBriefly();
    setActiveHotspot(null);
  }, [blockTownInputBriefly]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closePopup();
      }
    };

    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [closePopup]);

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

  return (
    <div className="app-shell">
      <section className="top-hud" aria-label="Town status">
        <header className="topbar">
          <div className="brand-block">
            <h1>St. Moritz</h1>
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
              <strong>
                {game.offline.active ? `${OFFLINE_BOOST_MULTIPLIER}x` : `${game.stats.gameSpeed.toFixed(1)}x`}
              </strong>
            </div>
          </div>
        </header>

        <div className="hud-status-row">
          <ResourceBar game={game} />

          <section className="campaign-strip" aria-label="Campaign progress">
            <div className="campaign-copy">
              <span>{campaign.chapterLabel}</span>
              <strong>{campaign.projectLabel}</strong>
              <p>{campaign.unlockLabel}</p>
            </div>
            <button
              className="campaign-progress campaign-button"
              type="button"
              onClick={() =>
                selectHotspot({
                  id: 'project',
                  kind: 'project',
                  label: 'Town Project',
                })
              }
            >
              <div className="boost-topline">
                <span>Project progress</span>
                <strong>{campaign.progressLabel}</strong>
              </div>
              <div className="boost-bar campaign-progress-bar" aria-label="Chapter progress">
                <span style={{ width: `${(campaign.progressRatio ?? 0) * 100}%` }} />
              </div>
              <p>{campaign.statusLabel}</p>
            </button>
            <div className="campaign-selection">
              <span>Selection</span>
              <strong>{activeHotspot?.label ?? 'None selected'}</strong>
              <p>{activeHotspot?.kind ?? 'Click a town hotspot to open its popup'}</p>
            </div>
          </section>
        </div>
      </section>

      <main className="main-stage">
        <section
          className={activeHotspot ? 'town-section town-stage popup-open' : 'town-section town-stage'}
          aria-label="Town view"
        >
          <TownView
            game={game}
            selectedHotspotId={activeHotspot?.id ?? null}
            inputLocked={Boolean(activeHotspot)}
            onSelectHotspot={selectHotspot}
          />
          {activeHotspot ? (
            <TownContextPopup
              game={game}
              selection={activeHotspot}
              selectionVersion={activeHotspotVersion}
              onClose={closePopup}
              onPopupPointer={blockTownInputBriefly}
              onOpenHotspot={selectHotspot}
            />
          ) : null}
        </section>
      </main>
    </div>
  );
}
