import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { OFFLINE_BOOST_MULTIPLIER } from '../simulation';
import { useGameStore } from '../store/gameStore';
import { ResourceBar } from './ResourceBar';
import { Storyteller } from './Storyteller';
import { storySegmentById, type StorySegmentId } from '../data/story';
import { TownContextPopup, readCampaignDisplay } from './TownContextPopup';
import { TownView } from './TownView';
import type { TownHotspotSelection } from './townHotspots';
import type { TownGatherableSnapshot } from '../game/scenes/TownScene';
import { formatNumber } from './format';
import { ExpeditionPanel } from './ExpeditionPanel';

export function App() {
  const game = useGameStore();
  const [activeHotspot, setActiveHotspot] = useState<TownHotspotSelection | null>(null);
  const [activeHotspotVersion, setActiveHotspotVersion] = useState(0);
  const [activeView, setActiveView] = useState<'town' | 'map'>('town');
  const townInputBlockedUntilRef = useRef(0);

  const campaign = useMemo(() => readCampaignDisplay(game), [game]);

  const [storyOverride, setStoryOverride] = useState<StorySegmentId | null>(null);

  const autoStorySegment: StorySegmentId | null = game.campaign.campaignComplete && !game.campaign.seenVictory
    ? 'victory'
    : game.campaign.seenStoryChapters.includes(game.campaign.chapterId)
      ? null
      : game.campaign.chapterId;

  const activeStorySegment = storyOverride ?? autoStorySegment;

  useEffect(() => {
    if (game.campaign.campaignComplete) {
      setActiveView('map');
      setActiveHotspot(null);
    }
  }, [game.campaign.campaignComplete]);

  useEffect(() => {
    if (game.expedition.phase === 'defeated') {
      setActiveView('map');
      setActiveHotspot(null);
    }
  }, [game.expedition.phase]);

  const dismissStory = useCallback(() => {
    if (autoStorySegment) {
      game.markStorySeen(autoStorySegment);
    }
    setStoryOverride(null);
  }, [autoStorySegment, game.markStorySeen]);

  const openStory = useCallback(() => {
    setStoryOverride(
      game.campaign.campaignComplete ? 'victory' : game.campaign.chapterId,
    );
  }, [game.campaign.campaignComplete, game.campaign.chapterId]);

  const selectHotspot = useCallback((selection: TownHotspotSelection) => {
    if (performance.now() < townInputBlockedUntilRef.current) {
      return;
    }

    setActiveHotspot(selection);
    setActiveHotspotVersion((version) => version + 1);
  }, []);

  const openHotspotFromPopup = useCallback((selection: TownHotspotSelection) => {
    setActiveHotspot(selection);
    setActiveHotspotVersion((version) => version + 1);
  }, []);

  const gatherResource = useCallback((resourceId: TownGatherableSnapshot['resourceId']) => {
    if (performance.now() < townInputBlockedUntilRef.current) {
      return;
    }

    if (resourceId === 'wood') {
      game.gatherClearingWood();
      return;
    }

    if (resourceId === 'stone') {
      game.gatherLooseStone();
      return;
    }

    game.forageVegetables();
  }, [game.gatherClearingWood, game.gatherLooseStone, game.forageVegetables]);

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
            <div className={game.legacy.experiencePoints > 0 ? 'metric-boost' : ''}>
              <span>Run · XP</span>
              <strong>{game.legacy.runNumber} · {game.legacy.experiencePoints}</strong>
            </div>
          </div>
        </header>

        <div className="hud-status-row">
          <ResourceBar game={game} />

          <section className="campaign-strip" aria-label="Campaign progress">
            <div className="campaign-copy">
              <span>{game.campaign.campaignComplete ? 'Act II' : campaign.chapterLabel}</span>
              <strong>{game.campaign.campaignComplete ? 'Beyond the Pass' : campaign.projectLabel}</strong>
              <p>{game.campaign.campaignComplete ? 'Build a Barracks, secure the map, and choose when to raid Sonnenburg.' : campaign.unlockLabel}</p>
              <button className="story-reopen" type="button" onClick={openStory}>
                Storyteller
              </button>
              {game.campaign.campaignComplete ? (
                <div className="view-switcher" aria-label="Choose view">
                  <button type="button" className={activeView === 'town' ? 'active' : ''} onClick={() => setActiveView('town')}>Town</button>
                  <button type="button" className={activeView === 'map' ? 'active' : ''} onClick={() => { setActiveHotspot(null); setActiveView('map'); }}>Map</button>
                </div>
              ) : null}
            </div>
            <button
              className="campaign-progress campaign-button"
              type="button"
              onClick={() => game.campaign.campaignComplete
                ? setActiveView('map')
                : selectHotspot({ id: 'project', kind: 'project', label: 'Town Project' })}
            >
              <div className="boost-topline">
                <span>{game.campaign.campaignComplete ? 'Map secured' : 'Project progress'}</span>
                <strong>{game.campaign.campaignComplete ? `${game.expedition.defeatedNodeIds.length} / 12` : campaign.progressLabel}</strong>
              </div>
              <div className="boost-bar campaign-progress-bar" aria-label="Chapter progress">
                <span style={{ width: `${game.campaign.campaignComplete ? game.expedition.defeatedNodeIds.length / 12 * 100 : (campaign.progressRatio ?? 0) * 100}%` }} />
              </div>
              <p>{game.campaign.campaignComplete
                ? game.expedition.phase === 'invasion'
                  ? 'The Northern Host is marching.'
                  : game.expedition.phase === 'defeated'
                    ? 'The town has fallen. Spend Experience.'
                    : 'The mountain campaign is open.'
                : campaign.statusLabel}</p>
            </button>
            <div className="campaign-selection">
              <span>Selection</span>
              <strong>{activeHotspot?.label ?? 'None selected'}</strong>
              <p>{activeHotspot?.kind ?? 'Click a town hotspot to open its popup'}</p>
            </div>
          </section>
        </div>
      </section>

      {game.campaign.campaignComplete && game.expedition.phase === 'invasion' && activeView === 'town' ? (
        <button type="button" className="town-invasion-warning" onClick={() => setActiveView('map')}>
          <span>The Northern Host is approaching</span>
          <strong>{Math.ceil(game.expedition.invasionSecondsRemaining)} seconds remain · Return to map</strong>
        </button>
      ) : null}

      <main className="main-stage">
        {activeView === 'map' && game.campaign.campaignComplete ? (
          <ExpeditionPanel game={game} />
        ) : <section
          className={activeHotspot ? 'town-section town-stage popup-open' : 'town-section town-stage'}
          aria-label="Town view"
        >
          <TownView
            game={game}
            selectedHotspotId={activeHotspot?.id ?? null}
            inputLocked={Boolean(activeHotspot)}
            onSelectHotspot={selectHotspot}
            onGatherResource={gatherResource}
          />
          {activeHotspot ? (
            <TownContextPopup
              game={game}
              selection={activeHotspot}
              selectionVersion={activeHotspotVersion}
              onClose={closePopup}
              onPopupPointer={blockTownInputBriefly}
              onOpenHotspot={openHotspotFromPopup}
            />
          ) : null}
        </section>}
      </main>

      {activeStorySegment ? (
        <Storyteller segment={storySegmentById[activeStorySegment]} onDismiss={dismissStory} />
      ) : null}
    </div>
  );
}
