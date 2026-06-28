import {
  BASIC_BOOK_PACK_COST,
  BOOK_UPGRADE_COPY_COST,
  canUpgradeBook,
  describeBookEffect,
  getNextRarity,
  ownedBookEntries,
} from '../simulation';
import type { BookEffect, BuildingId } from '../simulation';
import type { GameStore } from '../store/gameStore';

interface LibraryPanelProps {
  game: GameStore;
}

const effectKindLabels: Record<BookEffect['type'], string> = {
  outputMultiplier: 'Output',
  inputMultiplier: 'Input',
  efficiencyExponent: 'Efficiency',
  foodConsumptionMultiplier: 'Food',
  marketImpactMultiplier: 'Market',
};

export function LibraryPanel({ game }: LibraryPanelProps) {
  const ownedBooks = ownedBookEntries(game);
  const groupedBooks = game.definitions.buildings
    .map((building) => ({
      building,
      entries: ownedBooks.filter(
        (entry) => game.definitions.bookById[entry.bookId].buildingId === building.id,
      ),
    }))
    .filter((group) => group.entries.length > 0);

  return (
    <section className="panel library-panel" aria-label="Library">
      <div className="panel-heading">
        <div>
          <h2>Library</h2>
          <p>Equip up to two books per building. Five duplicates upgrade to the next rarity.</p>
        </div>
        <button type="button" onClick={game.buyBookPack} disabled={game.money < BASIC_BOOK_PACK_COST}>
          Buy Pack ${BASIC_BOOK_PACK_COST}
        </button>
      </div>

      {game.recentBookPack.length > 0 ? (
        <div className="recent-pack">
          {game.recentBookPack.map((book, index) => (
            <span key={`${book.bookId}-${book.rarity}-${index}`}>
              {game.definitions.bookById[book.bookId].label} · {game.definitions.rarityLabels[book.rarity]}
            </span>
          ))}
        </div>
      ) : null}

      <div className="book-groups">
        {ownedBooks.length === 0 ? (
          <div className="empty-state">No books owned yet.</div>
        ) : (
          groupedBooks.map(({ building, entries }) => {
            const entriesByKind = entries.reduce(
              (groups, entry) => {
                const definition = game.definitions.bookById[entry.bookId];
                const kind = definition.effect.type;
                groups[kind] = [...(groups[kind] ?? []), entry];
                return groups;
              },
              {} as Partial<Record<BookEffect['type'], typeof entries>>,
            );

            return (
              <section className="book-building-group" key={building.id}>
                <div className="book-building-heading">
                  <h3>{building.label}</h3>
                  <span>
                    {game.buildings[building.id as BuildingId].equippedBooks.length}/2 equipped
                  </span>
                </div>
                <div className="book-kind-grid">
                  {Object.entries(entriesByKind).map(([kind, kindEntries]) => (
                    <div className="book-kind-group" key={kind}>
                      <span className="book-kind-label">
                        {effectKindLabels[kind as BookEffect['type']]}
                      </span>
                      {kindEntries.map((entry) => {
                        const definition = game.definitions.bookById[entry.bookId];
                        const buildingState = game.buildings[definition.buildingId];
                        const equippedIndex = buildingState.equippedBooks.findIndex(
                          (book) => book.bookId === entry.bookId && book.rarity === entry.rarity,
                        );
                        const nextRarity = getNextRarity(entry.rarity);
                        const canUpgrade = canUpgradeBook(game, entry.bookId, entry.rarity);

                        return (
                          <article className="book-row" key={`${entry.bookId}-${entry.rarity}`}>
                            <div className="book-main">
                              <strong>{definition.label}</strong>
                              <span>
                                {game.definitions.rarityLabels[entry.rarity]} ·{' '}
                                {describeBookEffect(entry.bookId, entry.rarity)}
                              </span>
                            </div>
                            <span className="copy-count">
                              x{entry.count}
                              {nextRarity ? ` / ${BOOK_UPGRADE_COPY_COST}` : ''}
                            </span>
                            <div className="book-actions">
                              {equippedIndex >= 0 ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    game.equipBook(
                                      definition.buildingId,
                                      null,
                                      entry.rarity,
                                      equippedIndex,
                                    )
                                  }
                                >
                                  Unequip
                                </button>
                              ) : buildingState.equippedBooks.length < 2 ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    game.equipBook(definition.buildingId, entry.bookId, entry.rarity)
                                  }
                                >
                                  Equip
                                </button>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      game.equipBook(definition.buildingId, entry.bookId, entry.rarity, 0)
                                    }
                                  >
                                    Slot 1
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      game.equipBook(definition.buildingId, entry.bookId, entry.rarity, 1)
                                    }
                                  >
                                    Slot 2
                                  </button>
                                </>
                              )}
                              <button
                                type="button"
                                onClick={() => game.upgradeBook(entry.bookId, entry.rarity)}
                                disabled={!canUpgrade}
                              >
                                Upgrade
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </section>
            );
          })
        )}
      </div>
    </section>
  );
}
