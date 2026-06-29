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

const getBookInitials = (label: string) =>
  label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();

export function LibraryPanel({ game }: LibraryPanelProps) {
  const ownedBooks = ownedBookEntries(game);
  const hasAnyUpgradable = ownedBooks.some((entry) => canUpgradeBook(game, entry.bookId, entry.rarity));
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
        <button
          type="button"
          onClick={game.upgradeAllPossibleBooks}
          disabled={!hasAnyUpgradable}
          title="Upgrade every book as far as duplicates allow"
        >
          Upgrade All Possible
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
            return (
              <section className="book-building-group" key={building.id}>
                <div className="book-building-heading">
                  <h3>{building.label}</h3>
                  <span>
                    {game.buildings[building.id as BuildingId].equippedBooks.length}/2 equipped
                  </span>
                  <button
                    type="button"
                    className="book-group-upgrade-all"
                    onClick={() => {
                      const bookIds = new Set(entries.map((entry) => entry.bookId));
                      bookIds.forEach((bookId) => game.upgradeAllBooks(bookId));
                    }}
                    disabled={!entries.some((entry) => canUpgradeBook(game, entry.bookId, entry.rarity))}
                    title="Upgrade all books for this building"
                  >
                    Upgrade All
                  </button>
                </div>
                <div className="book-shelf" aria-label={`${building.label} books`}>
                  {entries.map((entry) => {
                    const definition = game.definitions.bookById[entry.bookId];
                    const buildingState = game.buildings[definition.buildingId];
                    const equippedIndex = buildingState.equippedBooks.findIndex(
                      (book) => book.bookId === entry.bookId && book.rarity === entry.rarity,
                    );
                    const nextRarity = getNextRarity(entry.rarity);
                    const canUpgrade = canUpgradeBook(game, entry.bookId, entry.rarity);
                    const effectLabel = effectKindLabels[definition.effect.type];
                    const effectText = describeBookEffect(entry.bookId, entry.rarity);
                    const tooltip = [
                      `${definition.label} · ${game.definitions.rarityLabels[entry.rarity]}`,
                      definition.description,
                      effectText,
                      `Owned: ${entry.count}${nextRarity ? ` / ${BOOK_UPGRADE_COPY_COST} to upgrade` : ''}`,
                      equippedIndex >= 0 ? `Equipped in slot ${equippedIndex + 1}` : 'Click to equip.',
                    ].join('\n');

                    return (
                      <article
                        className={`book-tile-wrap${equippedIndex >= 0 ? ' equipped' : ''}`}
                        data-tooltip={tooltip}
                        key={`${entry.bookId}-${entry.rarity}`}
                      >
                        <button
                          className={`book-tile rarity-${entry.rarity} effect-${definition.effect.type}`}
                          type="button"
                          onClick={() =>
                            equippedIndex >= 0
                              ? game.equipBook(definition.buildingId, null, entry.rarity, equippedIndex)
                              : buildingState.equippedBooks.length < 2
                                ? game.equipBook(definition.buildingId, entry.bookId, entry.rarity)
                                : game.equipBook(definition.buildingId, entry.bookId, entry.rarity, 0)
                          }
                          aria-label={tooltip}
                          title={tooltip}
                        >
                          <span className="book-cover" aria-hidden="true">
                            <span className="book-spine" />
                            <span className="book-rarity-mark">{game.definitions.rarityLabels[entry.rarity][0]}</span>
                            <strong>{getBookInitials(definition.label)}</strong>
                            <span>{effectLabel}</span>
                          </span>
                          <span className="book-copy-badge">x{entry.count}</span>
                        </button>
                        <div className="book-tile-actions">
                          {equippedIndex >= 0 ? (
                            <button
                              type="button"
                              onClick={() =>
                                game.equipBook(definition.buildingId, null, entry.rarity, equippedIndex)
                              }
                              title="Unequip this book"
                            >
                              Off
                            </button>
                          ) : buildingState.equippedBooks.length < 2 ? (
                            <button
                              type="button"
                              onClick={() => game.equipBook(definition.buildingId, entry.bookId, entry.rarity)}
                              title="Equip this book"
                            >
                              Eq
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => game.equipBook(definition.buildingId, entry.bookId, entry.rarity, 0)}
                                title="Replace equipped slot 1"
                              >
                                1
                              </button>
                              <button
                                type="button"
                                onClick={() => game.equipBook(definition.buildingId, entry.bookId, entry.rarity, 1)}
                                title="Replace equipped slot 2"
                              >
                                2
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => game.upgradeBook(entry.bookId, entry.rarity)}
                            disabled={!canUpgrade}
                            title={
                              canUpgrade
                                ? `Upgrade to ${game.definitions.rarityLabels[nextRarity!]}`
                                : nextRarity
                                  ? `Needs ${BOOK_UPGRADE_COPY_COST} copies`
                                  : 'Already max rarity'
                            }
                          >
                            Up
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })
        )}
      </div>
    </section>
  );
}
