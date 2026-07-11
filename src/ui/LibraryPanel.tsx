import { useCallback, useMemo, useState } from 'react';
import {
  BASIC_BOOK_PACK_COST,
  BASIC_BOOK_PACK_SIZE,
  BOOK_UPGRADE_COPY_COST,
  canUpgradeBook,
  describeBookEffect,
  getBestOwnedBook,
  getNextRarity,
  getOwnedBookCount,
} from '../simulation';
import type { BookEffect, BookId, BookRarity } from '../simulation';
import type { GameStore } from '../store/gameStore';

interface LibraryPanelProps {
  game: GameStore;
}

interface BookTooltip {
  text: string;
  left: number;
  top: number;
  placement: 'above' | 'below';
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

const findUpgradableRarity = (game: GameStore, bookId: BookId) =>
  game.definitions.rarities.find((rarity) => canUpgradeBook(game, bookId, rarity)) ?? null;

export function LibraryPanel({ game }: LibraryPanelProps) {
  const [bookTooltip, setBookTooltip] = useState<BookTooltip | null>(null);
  const hasAnyUpgradable = game.definitions.books.some((book) =>
    game.definitions.rarities.some((rarity) => canUpgradeBook(game, book.id, rarity)),
  );
  const groupedBooks = useMemo(
    () =>
      game.definitions.buildings
        .map((building) => ({
          building,
          entries: game.definitions.books
            .filter((book) => book.buildingId === building.id)
            .map((book) => {
              const counts = game.definitions.rarities
                .map((rarity) => ({
                  rarity,
                  count: getOwnedBookCount(game, book.id, rarity),
                }))
                .filter((entry) => entry.count > 0);
              const total = counts.reduce((sum, entry) => sum + entry.count, 0);
              const bestOwned = getBestOwnedBook(game, book.id);
              const upgradableRarity = findUpgradableRarity(game, book.id);

              return {
                definition: book,
                counts,
                total,
                bestOwned,
                upgradableRarity,
              };
            })
            .filter((entry) => entry.total > 0),
        }))
        .filter((group) => group.entries.length > 0),
    [game],
  );

  const showBookTooltip = useCallback((text: string, element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const tooltipWidth = Math.min(280, window.innerWidth - 24);
    const left = Math.min(
      window.innerWidth - tooltipWidth / 2 - 12,
      Math.max(tooltipWidth / 2 + 12, rect.left + rect.width / 2),
    );
    const aboveTop = rect.top - 8;
    const belowTop = rect.bottom + 8;

    setBookTooltip({
      text,
      left,
      top: aboveTop > 96 ? aboveTop : belowTop,
      placement: aboveTop > 96 ? 'above' : 'below',
    });
  }, []);

  const hideBookTooltip = useCallback(() => setBookTooltip(null), []);

  return (
    <section className="panel library-panel" aria-label="Library">
      <div className="panel-heading">
        <div>
          <h2>Library</h2>
          <p>Two books per building auto-equip at the highest owned rarity. Five duplicates upgrade.</p>
        </div>
        <button type="button" onClick={() => game.buyBookPack()} disabled={game.money < BASIC_BOOK_PACK_COST}>
          Buy Pack ${BASIC_BOOK_PACK_COST}
        </button>
        <button
          type="button"
          onClick={() => game.buyBookPack(10)}
          disabled={game.money < BASIC_BOOK_PACK_COST * 10}
        >
          Buy 10 Packs ${BASIC_BOOK_PACK_COST * 10}
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
        {groupedBooks.length === 0 ? (
          <div className="empty-state">
            No books owned yet. Each pack contains {BASIC_BOOK_PACK_SIZE} random books.
          </div>
        ) : (
          groupedBooks.map(({ building, entries }) => {
            const equippedCount = game.buildings[building.id].equippedBooks.length;

            return (
              <section className="book-building-group" key={building.id}>
                <div className="book-building-heading">
                  <h3>{building.label}</h3>
                  <span>
                    {equippedCount}/2 auto equipped
                  </span>
                  <button
                    type="button"
                    className="book-group-upgrade-all"
                    onClick={() => entries.forEach((entry) => game.upgradeAllBooks(entry.definition.id))}
                    disabled={!entries.some((entry) => entry.upgradableRarity)}
                    title="Upgrade all books for this building"
                  >
                    Upgrade All
                  </button>
                </div>
                <div className="book-shelf" aria-label={`${building.label} books`}>
                  {entries.map(({ definition, counts, total, bestOwned, upgradableRarity }) => {
                    const displayRarity = bestOwned?.rarity ?? 'common';
                    const effectLabel = effectKindLabels[definition.effect.type];
                    const effectText = bestOwned
                      ? describeBookEffect(definition.id, bestOwned.rarity)
                      : definition.description;
                    const countText = counts
                      .map(
                        (entry) =>
                          `${game.definitions.rarityLabels[entry.rarity]}: ${entry.count}`,
                      )
                      .join('\n');
                    const nextRarity = upgradableRarity ? getNextRarity(upgradableRarity) : null;
                    const tooltip = [
                      `${definition.label} · best ${game.definitions.rarityLabels[displayRarity]}`,
                      definition.description,
                      effectText,
                      countText,
                      bestOwned ? 'Highest rarity auto-equipped.' : 'No copy owned.',
                    ].join('\n');

                    return (
                      <article
                        className="book-tile-wrap equipped"
                        key={definition.id}
                        onBlur={hideBookTooltip}
                        onFocus={(event) => showBookTooltip(tooltip, event.currentTarget)}
                        onMouseEnter={(event) => showBookTooltip(tooltip, event.currentTarget)}
                        onMouseLeave={hideBookTooltip}
                        tabIndex={0}
                        aria-label={tooltip}
                      >
                        <div className={`book-tile rarity-${displayRarity} effect-${definition.effect.type}`}>
                          <span className="book-cover" aria-hidden="true">
                            <span className="book-spine" />
                            <span className="book-rarity-mark">
                              {game.definitions.rarityLabels[displayRarity][0]}
                            </span>
                            <strong>{getBookInitials(definition.label)}</strong>
                            <span>{effectLabel}</span>
                          </span>
                        </div>
                        <div className="book-rarity-counts" aria-hidden="true">
                          {counts.map((entry) => (
                            <span className={`rarity-count rarity-${entry.rarity}`} key={entry.rarity}>
                              {game.definitions.rarityLabels[entry.rarity][0]} {entry.count}
                            </span>
                          ))}
                        </div>
                        <div className="book-tile-actions">
                          <button
                            type="button"
                            onClick={() => {
                              if (upgradableRarity) {
                                game.upgradeBook(definition.id, upgradableRarity as BookRarity);
                              }
                            }}
                            disabled={!upgradableRarity}
                            title={
                              upgradableRarity && nextRarity
                                ? `Upgrade ${BOOK_UPGRADE_COPY_COST} ${game.definitions.rarityLabels[upgradableRarity]} copies to ${game.definitions.rarityLabels[nextRarity]}`
                                : 'Needs more duplicates'
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
      {bookTooltip ? (
        <div
          className={`book-tooltip-floating ${bookTooltip.placement}`}
          style={{ left: bookTooltip.left, top: bookTooltip.top }}
          role="tooltip"
        >
          {bookTooltip.text}
        </div>
      ) : null}
    </section>
  );
}
