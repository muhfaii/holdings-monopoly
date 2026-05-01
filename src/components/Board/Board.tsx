import { useGameStore } from '../../store/gameStore';
import { BOARD, BOARD_SIZE } from '../../engine/data/board';
import type { ColorGroup } from '../../engine/core/state';

/**
 * Maps 40 squares onto an 11x11 grid in classic Monopoly layout:
 *
 *  20 21 22 23 24 25 26 27 28 29 30   (top row: left → right)
 *  19  .  .  .  .  .  .  .  .  . 31   (right col descends)
 *  18  .                         32
 *  17  .     center (empty)      33
 *  16  .                         34
 *  15  .                         35
 *  14  .                         36
 *  13  .                         37
 *  12  .                         38
 *  11  .  .  .  .  .  .  .  .  . 39
 *  10  9  8  7  6  5  4  3  2  1  0   (bottom row: GO at bottom-right)
 */

const GRID_SIZE = 11;

function squarePosition(id: number): [number, number] | null {
  if (id === 0)              return [10, 10];             // GO: bottom-right corner
  if (id >= 1  && id <= 9)   return [10, 10 - id];        // bottom row: right → left
  if (id === 10)             return [10, 0];              // Jail / Just Visiting: bottom-left
  if (id >= 11 && id <= 19)  return [10 - (id - 10), 0]; // left column: bottom → top
  if (id === 20)             return [0, 0];               // Kopitiam: top-left corner
  if (id >= 21 && id <= 29)  return [0, id - 20];         // top row: left → right
  if (id === 30)             return [0, 10];              // Go To Jail: top-right corner
  if (id >= 31 && id <= 39)  return [id - 30, 10];        // right column: top → bottom
  return null;
}

const groupColorMap: Record<ColorGroup, string> = {
  brown: 'bg-amber-800',
  'light-blue': 'bg-sky-400',
  pink: 'bg-fuchsia-400',
  orange: 'bg-orange-400',
  red: 'bg-red-500',
  yellow: 'bg-yellow-400',
  green: 'bg-emerald-600',
  'dark-blue': 'bg-blue-800',
};

const groupColorBorderMap: Record<ColorGroup, string> = {
  brown: 'border-amber-800',
  'light-blue': 'border-sky-400',
  pink: 'border-fuchsia-400',
  orange: 'border-orange-400',
  red: 'border-red-500',
  yellow: 'border-yellow-400',
  green: 'border-emerald-600',
  'dark-blue': 'border-blue-800',
};

export function Board() {
  const gameState = useGameStore(s => s.gameState)!;
  const players = gameState.players;
  const properties = gameState.properties;

  const grid: (number | null)[][] = Array.from({ length: GRID_SIZE }, () =>
    Array(GRID_SIZE).fill(null),
  );

  for (const square of BOARD) {
    const pos = squarePosition(square.id);
    if (pos) grid[pos[0]][pos[1]] = square.id;
  }

  return (
    <div className="grid grid-cols-11 gap-0.5 bg-stone-800 p-1 rounded-lg max-w-[660px] mx-auto">
      {grid.flatMap((row, r) =>
        row.map((squareId, c) => {
          if (squareId === null) {
            return (
              <div
                key={`${r}-${c}`}
                className="aspect-square bg-stone-700/50 rounded-sm"
              />
            );
          }

          const square = BOARD[squareId];
          const property = properties[squareId];

          if (square.type === 'go') {
            return (
              <div
                key={squareId}
                className="aspect-square bg-stone-700 border border-stone-500 rounded p-0.5 flex items-center justify-center text-center"
              >
                <div>
                  <div className="text-[9px] font-bold text-amber-400">GO</div>
                  <div className="text-[7px] text-stone-400">Collect $200</div>
                </div>
              </div>
            );
          }

          if (square.type === 'jail') {
            return (
              <div
                key={squareId}
                className="aspect-square bg-stone-700 border border-orange-400/50 rounded p-1 flex items-center justify-center"
              >
                <div className="text-center">
                  <div className="text-[9px] font-bold text-orange-300">JAIL</div>
                  <div className="text-[7px] text-stone-400">Just Visiting</div>
                </div>
              </div>
            );
          }

          if (square.type === 'kopitiam') {
            return (
              <div
                key={squareId}
                className="aspect-square bg-stone-700 border border-amber-500 rounded p-1 flex items-center justify-center"
              >
                <div className="text-center">
                  <div className="text-[9px] font-bold text-amber-400">KOPITIAM</div>
                  <div className="text-[8px] text-amber-300 font-bold">
                    ${gameState.kopitiamPot}
                  </div>
                </div>
              </div>
            );
          }

          if (square.type === 'go-to-jail') {
            return (
              <div
                key={squareId}
                className="aspect-square bg-stone-700 border border-red-400/40 rounded p-1 flex items-center justify-center"
              >
                <div className="text-center">
                  <div className="text-[8px] text-red-300">Go To</div>
                  <div className="text-[9px] font-bold text-red-300">JAIL</div>
                </div>
              </div>
            );
          }

          // Property, railroad, utility, tax, card squares
          const groupColor = square.group ? groupColorMap[square.group] : '';
          const groupBorder = square.group ? groupColorBorderMap[square.group] : '';

          // Players on this square
          const playersHere = Object.values(players).filter(
            p => p.position === squareId && !p.bankrupt,
          );

          return (
            <div
              key={squareId}
              className={`aspect-square bg-stone-700 border border-stone-500 rounded p-0.5 relative overflow-hidden ${
                property?.mortgaged ? 'opacity-50' : ''
              }`}
            >
              {/* Color bar at top */}
              {square.group && (
                <div className={`h-1.5 ${groupColor} rounded-t-sm -mx-0.5 -mt-0.5 mb-0.5`} />
              )}
              {square.type === 'railroad' && (
                <div className="h-1.5 bg-stone-400 rounded-t-sm -mx-0.5 -mt-0.5 mb-0.5" />
              )}
              {square.type === 'utility' && (
                <div className="h-1.5 bg-stone-300 rounded-t-sm -mx-0.5 -mt-0.5 mb-0.5" />
              )}
              {square.type === 'tax' && (
                <div className="h-1.5 bg-red-400 rounded-t-sm -mx-0.5 -mt-0.5 mb-0.5" />
              )}
              {(square.type === 'chance' || square.type === 'community-chest') && (
                <div className="h-1.5 bg-blue-400/50 rounded-t-sm -mx-0.5 -mt-0.5 mb-0.5" />
              )}

              <div className="text-[8px] leading-tight text-center font-medium text-stone-200">
                {square.name}
              </div>

              {square.price > 0 && (
                <div className="text-[7px] text-stone-400 text-center">${square.price}</div>
              )}

              {/* House indicators */}
              {property && property.houses > 0 && property.houses <= 4 && (
                <div className="flex justify-center gap-0.5 mt-0.5">
                  {Array.from({ length: property.houses }).map((_, i) => (
                    <div key={i} className="w-1.5 h-1.5 bg-emerald-500 rounded-sm" />
                  ))}
                </div>
              )}
              {property && property.houses === 5 && (
                <div className="flex justify-center mt-0.5">
                  <div className="w-3 h-3 bg-red-500 rounded-sm" />
                </div>
              )}

              {/* Owner indicator */}
              {property?.ownerId && (
                <div
                  className="absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full border border-stone-600"
                  style={{
                    backgroundColor: PLAYER_COLORS[
                      Object.keys(players).indexOf(property.ownerId) % PLAYER_COLORS.length
                    ],
                  }}
                />
              )}

              {/* Player tokens */}
              {playersHere.length > 0 && (
                <div className="absolute bottom-0.5 left-0.5 flex -space-x-1">
                  {playersHere.map(p => {
                    const idx = Object.keys(players).indexOf(p.id);
                    return (
                      <div
                        key={p.id}
                        className="w-2.5 h-2.5 rounded-full border border-stone-900"
                        style={{
                          backgroundColor: PLAYER_COLORS[idx % PLAYER_COLORS.length],
                        }}
                        title={p.name}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          );
        }),
      )}
    </div>
  );
}

const PLAYER_COLORS = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];