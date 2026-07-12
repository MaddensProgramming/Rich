import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BARRACKS_CONSTRUCTION_COST,
  EVACUATION_COST,
  INVASION_DURATION_SECONDS,
  NORTHERN_HOST_REWARD_EXPERIENCE,
  NORTHERN_HOST_REWARD_MONEY,
  expeditionNodeById,
  expeditionNodes,
  experiencePerks,
  troops,
} from '../data/expedition';
import {
  canConstructBarracks,
  canPrepareEvacuation,
  canTrainTroops,
  getArmyPower,
  getBattlePreview,
  getExperiencePerkUpgradeCost,
  getInvasionBattlePreview,
  getTroopTrainingCost,
  getUnassignedWorkerCount,
} from '../simulation';
import type { ResourceMap, TroopId } from '../simulation';
import type { GameStore } from '../store/gameStore';
import { formatNumber } from './format';
import { Storyteller } from './Storyteller';
import { storyteller, type StorySegment } from '../data/story';

interface ExpeditionPanelProps {
  game: GameStore;
}

const formatCost = (cost: ResourceMap, money = 0) => {
  const parts = Object.entries(cost)
    .filter(([, amount]) => (amount ?? 0) > 0)
    .map(([id, amount]) => `${formatNumber(amount ?? 0, 0)} ${id.replaceAll('_', ' ')}`);
  if (money > 0) {
    parts.push(`$${formatNumber(money, 0)}`);
  }
  return parts.join(' · ');
};

const formatTime = (seconds: number) => {
  const whole = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
};

const casualtyText = (casualties: Record<TroopId, number>) =>
  troops
    .filter((troop) => casualties[troop.id] > 0)
    .map((troop) => `${casualties[troop.id]} ${troop.label.toLowerCase()}`)
    .join(', ') || 'none';

export function ExpeditionPanel({ game }: ExpeditionPanelProps) {
  const firstUncleared = expeditionNodes.find(
    (node) => !game.expedition.defeatedNodeIds.includes(node.id),
  );
  const [selectedNodeId, setSelectedNodeId] = useState(firstUncleared?.id ?? expeditionNodes[0].id);
  const [raidConfirmationOpen, setRaidConfirmationOpen] = useState(false);
  const [finalStandConfirmationOpen, setFinalStandConfirmationOpen] = useState(false);
  const [battleStory, setBattleStory] = useState<StorySegment | null>(null);
  const battleEventId = game.expedition.lastBattle?.eventId ?? null;
  const observedBattleEventId = useRef(battleEventId);
  const selectedNode = expeditionNodeById[selectedNodeId] ?? expeditionNodes[0];
  const preview = useMemo(
    () => getBattlePreview(game, selectedNode.id),
    [game, selectedNode.id],
  );
  const armyPower = getArmyPower(game);
  const invasionPreview = getInvasionBattlePreview(game);
  const unassignedWorkers = getUnassignedWorkerCount(game);
  const invasionProgress =
    game.expedition.phase === 'invasion'
      ? game.expedition.invasionSecondsRemaining / INVASION_DURATION_SECONDS
      : 0;

  useEffect(() => {
    if (!battleEventId) {
      observedBattleEventId.current = null;
      return;
    }
    if (observedBattleEventId.current === battleEventId) return;
    observedBattleEventId.current = battleEventId;
    const report = game.expedition.lastBattle;
    if (!report || report.nodeId === 'northern_host') return;
    const node = expeditionNodeById[report.nodeId];
    const dialogue = node?.eventDialogue;
    if (!node || !dialogue) return;
    const line = report.victory ? dialogue.victory : dialogue.defeat;
    setBattleStory({
      id: `battle-${battleEventId}`,
      speaker: storyteller.name,
      title: `${report.victory ? 'Victory' : 'Defeat'} at ${node.label}`,
      lines: [line.replace(/^[^:]+:\s*/, '')],
      goal: report.victory ? 'Choose the next route through the pass.' : 'Rebuild the army before another attempt.',
    });
  }, [battleEventId, game.expedition.lastBattle]);

  const attackSelected = () => {
    game.attackExpeditionNode(selectedNode.id);
    setRaidConfirmationOpen(false);
  };

  return (
    <section className="expedition-stage" aria-label="Mountain expedition map">
      {game.expedition.phase === 'invasion' ? (
        <div className="invasion-banner" role="alert">
          <div>
            <span>The Northern Host is marching</span>
            <strong>{formatTime(game.expedition.invasionSecondsRemaining)} until the Host reaches St. Moritz</strong>
          </div>
          <div className="invasion-track" aria-label="Time before invasion">
            <span style={{ width: `${invasionProgress * 100}%` }} />
          </div>
        </div>
      ) : null}

      <div className="expedition-layout">
        <div className="world-map-panel">
          <header className="expedition-heading">
            <div>
              <span>Act II · Beyond the Pass</span>
              <h2>Mountain Campaign</h2>
            </div>
            <div className="army-power-badge">
              <span>Army power</span>
              <strong>{armyPower}</strong>
            </div>
          </header>

          <div className="world-map">
            <svg className="map-routes" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              {expeditionNodes.flatMap((node) =>
                node.prerequisiteIds.map((prerequisiteId) => {
                  const prerequisite = expeditionNodeById[prerequisiteId];
                  return (
                    <line
                      key={`${prerequisiteId}-${node.id}`}
                      x1={prerequisite.x}
                      y1={prerequisite.y}
                      x2={node.x}
                      y2={node.y}
                      className={
                        game.expedition.defeatedNodeIds.includes(prerequisiteId)
                          ? 'route-cleared'
                          : undefined
                      }
                    />
                  );
                }),
              )}
            </svg>
            {expeditionNodes.map((node) => {
              const nodePreview = getBattlePreview(game, node.id);
              const cleared = game.expedition.defeatedNodeIds.includes(node.id);
              const available = Boolean(nodePreview?.accessible);
              const classNames = [
                'map-node',
                cleared ? 'cleared' : available ? 'available' : 'locked',
                node.isRaidTown ? 'raid-town' : '',
                selectedNode.id === node.id ? 'selected' : '',
              ]
                .filter(Boolean)
                .join(' ');
              return (
                <button
                  key={node.id}
                  type="button"
                  className={classNames}
                  style={{ left: `${node.x}%`, top: `${node.y}%` }}
                  onClick={() => setSelectedNodeId(node.id)}
                  aria-label={`${node.label}, ${cleared ? 'secured' : available ? 'available' : 'locked'}`}
                >
                  <span>{cleared ? '✓' : node.isRaidTown ? '♜' : '◆'}</span>
                  <strong>{node.label}</strong>
                  <small>{nodePreview?.enemyPower ?? node.enemyPower} power</small>
                </button>
              );
            })}
            <div className="map-home-marker"><span>⌂</span><strong>St. Moritz</strong></div>
          </div>
        </div>

        <aside className="expedition-command-panel">
          <section className="command-card barracks-card">
            <div className="command-card-heading">
              <div>
                <span>Military building</span>
                <h3>Barracks</h3>
              </div>
              <strong>{game.expedition.barracksConstructed ? 'Built' : 'Not built'}</strong>
            </div>
            {!game.expedition.barracksConstructed ? (
              <>
                <p>Train townspeople into an expedition army. Only unassigned workers can enlist.</p>
                <div className="command-cost">{formatCost(BARRACKS_CONSTRUCTION_COST)}</div>
                <button
                  type="button"
                  onClick={game.constructBarracks}
                  disabled={!canConstructBarracks(game)}
                >
                  Construct Barracks
                </button>
              </>
            ) : (
              <>
                <div className="army-summary">
                  {troops.map((troop) => (
                    <div key={troop.id}>
                      <span>{troop.label}</span>
                      <strong>{game.expedition.troops[troop.id]}</strong>
                      <small>{troop.power} power each</small>
                    </div>
                  ))}
                </div>
                <p className="command-note">{unassignedWorkers} unassigned workers can enlist.</p>
                <div className="training-list">
                  {troops.map((troop) => (
                    <div className="training-row" key={troop.id}>
                      <div>
                        <strong>{troop.label}</strong>
                        <span>{troop.description}</span>
                        <small>{formatCost(troop.cost, troop.moneyCost)}</small>
                      </div>
                      <div>
                        <button
                          type="button"
                          onClick={() => game.trainTroops(troop.id, 1)}
                          disabled={!canTrainTroops(game, troop.id, 1)}
                        >
                          Train 1
                        </button>
                        <button
                          type="button"
                          onClick={() => game.trainTroops(troop.id, 5)}
                          disabled={!canTrainTroops(game, troop.id, 5)}
                        >
                          Train 5
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="formation-training">
                  <div>
                    <strong>Formation training</strong>
                    <small>Improve one troop type by 10% power per level (maximum level 10).</small>
                  </div>
                  {troops.map((troop) => {
                    const level = game.expedition.trainingLevels[troop.id];
                    const cost = getTroopTrainingCost(game, troop.id);
                    const canTrain = level < 10 && game.expedition.troops[troop.id] > 0 &&
                      game.money >= cost.money && game.resources.food >= cost.food;
                    return (
                      <div className="formation-training-row" key={troop.id}>
                        <div>
                          <strong>{troop.label} · Level {level}/10</strong>
                          <small>+{level * 10}% power · Next: {cost.food} food · ${formatNumber(cost.money, 0)}</small>
                        </div>
                        <button type="button" disabled={!canTrain} onClick={() => game.trainTroopFormation(troop.id)}>
                          Train formation
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </section>

          <section className={`command-card node-card ${selectedNode.isRaidTown ? 'node-card-danger' : ''}`}>
            <div className="command-card-heading">
              <div>
                <span>{selectedNode.isRaidTown ? 'Prosperous town' : selectedNode.enemyLabel}</span>
                <h3>{selectedNode.label}</h3>
              </div>
              <strong>{preview?.enemyPower ?? selectedNode.enemyPower} power</strong>
            </div>
            <p>{selectedNode.description}</p>
            <div className="battle-reward">
              <span>Reward</span>
              <strong>${formatNumber(selectedNode.rewardMoney, 0)} · {formatCost(selectedNode.reward)}</strong>
              {selectedNode.isRaidTown ? (
                <small>Also: Crown of the Pass (+25% army power) and a legendary Weapon Contracts book.</small>
              ) : null}
            </div>
            {preview ? (
              <div className={`battle-forecast ${preview.victory ? 'forecast-win' : 'forecast-loss'}`}>
                <span>Battle forecast</span>
                <strong>{preview.victory ? 'Victory expected' : 'Defeat expected'}</strong>
                <p>Your {preview.armyPower} power vs. {preview.enemyPower}. Expected losses: {casualtyText(preview.casualties)}.</p>
              </div>
            ) : null}
            {preview?.reason ? <p className="command-note">{preview.reason}</p> : null}
            <button
              type="button"
              className={selectedNode.isRaidTown ? 'danger-button' : undefined}
              disabled={!preview?.accessible}
              onClick={() =>
                selectedNode.isRaidTown ? setRaidConfirmationOpen(true) : attackSelected()
              }
            >
              {selectedNode.isRaidTown ? 'Raid Sonnenburg' : 'Attack'}
            </button>
          </section>

          {game.expedition.lastBattle ? (
            <section className="command-card battle-report-card">
              <span>Latest battle</span>
              <strong>
                {game.expedition.lastBattle.victory ? 'Victory at ' : 'Defeat at '}
                {game.expedition.lastBattle.nodeId === 'northern_host'
                  ? 'the Battle for St. Moritz'
                  : expeditionNodeById[game.expedition.lastBattle.nodeId]?.label}
              </strong>
              <p>Casualties: {casualtyText(game.expedition.lastBattle.casualties)}.</p>
            </section>
          ) : null}

          {game.expedition.phase === 'invasion' ? (
            <section className={`command-card final-stand-card ${invasionPreview.victory ? 'stand-ready' : ''}`}>
              <span>Final battle</span>
              <h3>The Northern Host</h3>
              <p>
                Your entire army can meet the invaders outside St. Moritz. A loss ends this settlement,
                but its survivors still escape with the Experience earned this run.
              </p>
              <div className={`battle-forecast ${invasionPreview.victory ? 'forecast-win' : 'forecast-loss'}`}>
                <span>Final-stand forecast</span>
                <strong>{invasionPreview.victory ? 'A historic victory is possible' : 'Overwhelming defeat expected'}</strong>
                <p>
                  Your {invasionPreview.armyPower} power vs. {invasionPreview.enemyPower}. Expected losses: {casualtyText(invasionPreview.casualties)}.
                </p>
              </div>
              <div className="battle-reward host-reward">
                <span>Victory reward</span>
                <strong>${formatNumber(NORTHERN_HOST_REWARD_MONEY, 0)} and +{NORTHERN_HOST_REWARD_EXPERIENCE} bonus Experience</strong>
                <small>Victory ends the invasion permanently and leaves St. Moritz standing.</small>
              </div>
              <button type="button" className="danger-button" onClick={() => setFinalStandConfirmationOpen(true)}>
                Make the final stand
              </button>
            </section>
          ) : null}

          {game.expedition.phase === 'invasion' ? (
            <section className="command-card evacuation-card">
              <span>Alternative</span>
              <h3>Prepare the evacuation</h3>
              <p>Do not risk the final battle. Pack supplies and get the survivors clear before the Host arrives.</p>
              {!game.expedition.evacuationPrepared ? (
                <>
                  <div className="command-cost">{formatCost(EVACUATION_COST)}</div>
                  <button
                    type="button"
                    onClick={game.prepareEvacuation}
                    disabled={!canPrepareEvacuation(game)}
                  >
                    Prepare caravan
                  </button>
                </>
              ) : (
                <button type="button" className="danger-button" onClick={game.evacuateTown}>
                  Evacuate St. Moritz
                </button>
              )}
            </section>
          ) : null}

          {game.expedition.phase === 'victorious' ? (
            <section className="command-card invasion-victory-card">
              <span>True victory</span>
              <h3>The Northern Host is broken</h3>
              <p>
                St. Moritz survived. The Host left ${formatNumber(NORTHERN_HOST_REWARD_MONEY, 0)} in captured pay chests,
                and this run earned {game.expedition.experienceEarnedThisRun} Experience.
              </p>
              <div className="victory-perks">
                {experiencePerks.map((perk) => {
                  const level = game.legacy.perks[perk.id];
                  const cost = getExperiencePerkUpgradeCost(game, perk.id);
                  return (
                    <button
                      key={perk.id}
                      type="button"
                      onClick={() => game.buyExperiencePerk(perk.id)}
                      disabled={level >= 5 || game.legacy.experiencePoints < cost}
                    >
                      {perk.label} {level}/5 · {cost} XP
                    </button>
                  );
                })}
              </div>
              <button type="button" className="begin-run-button" onClick={game.startNextRun}>
                Begin another settlement
              </button>
              <small>You may also return to town and continue this victorious settlement.</small>
            </section>
          ) : null}
        </aside>
      </div>

      {raidConfirmationOpen ? (
        <div className="blocking-dialog-shell" role="dialog" aria-modal="true" aria-labelledby="raid-title">
          <div className="blocking-dialog-card raid-dialog">
            <span>Point of no return</span>
            <h2 id="raid-title">Raid Sonnenburg?</h2>
            <p>
              Victory takes Saint Verena’s war chest, $5,000, a legendary book, and the Crown of the Pass.
              It also summons the Northern Host. The invasion begins immediately; only evacuation or an extraordinary military victory can end it.
            </p>
            <div className="dialog-actions">
              <button type="button" onClick={() => setRaidConfirmationOpen(false)}>Cancel</button>
              <button type="button" className="danger-button" onClick={attackSelected}>Begin the raid</button>
            </div>
          </div>
        </div>
      ) : null}

      {finalStandConfirmationOpen && game.expedition.phase === 'invasion' ? (
        <div className="blocking-dialog-shell" role="dialog" aria-modal="true" aria-labelledby="stand-title">
          <div className="blocking-dialog-card final-stand-dialog">
            <span>{invasionPreview.victory ? 'Victory forecast' : 'Defeat forecast'}</span>
            <h2 id="stand-title">Commit the army to a final stand?</h2>
            <p>
              The Northern Host has {invasionPreview.enemyPower} power against your {invasionPreview.armyPower}.
              The result is deterministic: <strong>{invasionPreview.victory ? 'St. Moritz will win.' : 'St. Moritz will fall.'}</strong>
              {game.expedition.evacuationPrepared
                ? ' Your prepared caravan ensures the full evacuation bonus even if the defense fails.'
                : ' If the defense fails, survivors escape without the prepared-caravan bonus.'}
            </p>
            <p>Expected casualties: {casualtyText(invasionPreview.casualties)}.</p>
            <div className="dialog-actions">
              <button type="button" onClick={() => setFinalStandConfirmationOpen(false)}>Wait and prepare</button>
              <button type="button" className="danger-button" onClick={() => { game.defendTown(); setFinalStandConfirmationOpen(false); }}>
                Fight the Northern Host
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {battleStory ? <Storyteller segment={battleStory} onDismiss={() => setBattleStory(null)} /> : null}

      {game.expedition.phase === 'defeated' ? (
        <div className="blocking-dialog-shell defeat-shell" role="dialog" aria-modal="true" aria-labelledby="defeat-title">
          <div className="blocking-dialog-card defeat-dialog">
            <span>Run {game.legacy.runNumber} complete</span>
            <h2 id="defeat-title">St. Moritz has fallen. Its people remember.</h2>
            <p>
              You escaped with the Crown of the Pass and earned <strong>{game.expedition.experienceEarnedThisRun} Experience</strong>.
              Spend Experience now or save it for a stronger lesson later.
            </p>
            <div className="experience-balance">
              <span>Unspent Experience</span>
              <strong>{game.legacy.experiencePoints}</strong>
            </div>
            <div className="perk-grid">
              {experiencePerks.map((perk) => {
                const level = game.legacy.perks[perk.id];
                const cost = getExperiencePerkUpgradeCost(game, perk.id);
                return (
                  <article className="perk-card" key={perk.id}>
                    <span>Level {level}/5</span>
                    <h3>{perk.label}</h3>
                    <p>{perk.description}</p>
                    <small>{perk.levelDescription}</small>
                    <button
                      type="button"
                      onClick={() => game.buyExperiencePerk(perk.id)}
                      disabled={level >= 5 || game.legacy.experiencePoints < cost}
                    >
                      {level >= 5 ? 'Mastered' : `Learn · ${cost} XP`}
                    </button>
                  </article>
                );
              })}
            </div>
            <button type="button" className="begin-run-button" onClick={game.startNextRun}>
              Begin settlement {game.legacy.runNumber + 1}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
