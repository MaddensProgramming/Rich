import {
  BASIC_BOOK_PACK_COST,
  BOOK_UPGRADE_COPY_COST,
  canUpgradeBook,
  describeBookEffect,
  getNextRarity,
  ownedBookEntries,
} from '../simulation';
import type { GameStore } from '../store/gameStore';

interface LibraryPanelProps {
  game: GameStore;
}

export function LibraryPanel({ game }: LibraryPanelProps) {
  const ownedBooks = ownedBookEntries(game);

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

      <div className="book-list">
        {ownedBooks.length === 0 ? (
          <div className="empty-state">No books owned yet.</div>
        ) : (
          ownedBooks.map((entry) => {
            const definition = game.definitions.bookById[entry.bookId];
            const building = game.buildings[definition.buildingId];
            const equippedIndex = building.equippedBooks.findIndex(
              (book) => book.bookId === entry.bookId && book.rarity === entry.rarity,
            );
            const nextRarity = getNextRarity(entry.rarity);
            const canUpgrade = canUpgradeBook(game, entry.bookId, entry.rarity);

            return (
              <article className="book-row" key={`${entry.bookId}-${entry.rarity}`}>
                <div>
                  <h3>{definition.label}</h3>
                  <p>
                    {game.definitions.buildingById[definition.buildingId].label} ·{' '}
                    {game.definitions.rarityLabels[entry.rarity]} · {describeBookEffect(entry.bookId, entry.rarity)}
                  </p>
                </div>
                <strong>x{entry.count}</strong>
                <div className="book-actions">
                  {equippedIndex >= 0 ? (
                    <button
                      type="button"
                      onClick={() => game.equipBook(definition.buildingId, null, entry.rarity, equippedIndex)}
                    >
                      Unequip
                    </button>
                  ) : building.equippedBooks.length < 2 ? (
                    <button
                      type="button"
                      onClick={() => game.equipBook(definition.buildingId, entry.bookId, entry.rarity)}
                    >
                      Equip
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => game.equipBook(definition.buildingId, entry.bookId, entry.rarity, 0)}
                      >
                        Slot 1
                      </button>
                      <button
                        type="button"
                        onClick={() => game.equipBook(definition.buildingId, entry.bookId, entry.rarity, 1)}
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
          })
        )}
      </div>
    </section>
  );
}
