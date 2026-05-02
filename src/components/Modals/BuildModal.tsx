import { useGameStore } from '../../store/gameStore';
import { BOARD } from '../../engine/data/board';
import { canBuyHouse, canSellHouse } from '../../engine/rules/buildings';
import type { ColorGroup } from '../../engine/core/state';

interface BuildModalProps {
  onClose: () => void;
}

/** Human-readable group label. */
const GROUP_LABELS: Record<ColorGroup, string> = {
  brown: 'Brown',
  'light-blue': 'Light Blue',
  pink: 'Pink',
  orange: 'Orange',
  red: 'Red',
  yellow: 'Yellow',
  green: 'Green',
  'dark-blue': 'Dark Blue',
};

/** Tailwind colour classes for each group swatch. */
const GROUP_COLOURS: Record<ColorGroup, string> = {
  brown: 'bg-amber-900',
  'light-blue': 'bg-sky-400',
  pink: 'bg-pink-400',
  orange: 'bg-orange-500',
  red: 'bg-red-600',
  yellow: 'bg-yellow-400',
  green: 'bg-green-600',
  'dark-blue': 'bg-blue-800',
};

/** Return a house/hotel emoji string for a count (0-5). */
function housesDisplay(count: number): string {
  if (count === 0) return '—';
  if (count === 5) return '🏨';
  return '🏠'.repeat(count);
}

export function BuildModal({ onClose }: BuildModalProps) {
  const gameState = useGameStore(s => s.gameState)!;
  const dispatch = useGameStore(s => s.dispatch);

  const playerId = gameState.turn.currentPlayerId;
  const player = gameState.players[playerId];

  // Gather colour groups that belong to this player (full monopoly groups only)
  const monopolyGroups = new Set<ColorGroup>();
  for (const propId of player.properties) {
    const sq = BOARD[propId];
    if (!sq?.group) continue;
    const group = sq.group;
    // Check if player owns ALL properties in this group
    const groupIds = BOARD.filter(s => s.type === 'property' && s.group === group).map(s => s.id);
    if (groupIds.every(id => gameState.properties[id]?.ownerId === playerId)) {
      monopolyGroups.add(group);
    }
  }

  const groups = [...monopolyGroups];

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-stone-800 border border-stone-600 rounded-xl shadow-2xl w-[480px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-600">
          <h2 className="text-lg font-bold text-amber-400">🏠 Build Houses &amp; Hotels</h2>
          <div className="flex items-center gap-4 text-sm text-stone-400">
            <span>Houses: <span className="text-amber-300 font-mono">{gameState.houseSupply}/32</span></span>
            <span>Hotels: <span className="text-amber-300 font-mono">{gameState.hotelSupply}/12</span></span>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
          {groups.length === 0 ? (
            <p className="text-stone-400 text-sm text-center py-4">
              You don't own any complete colour groups yet.
            </p>
          ) : (
            groups.map(group => {
              const groupProps = BOARD.filter(sq => sq.type === 'property' && sq.group === group);
              return (
                <div key={group} className="space-y-2">
                  {/* Group heading */}
                  <div className="flex items-center gap-2">
                    <span className={`w-4 h-4 rounded-sm ${GROUP_COLOURS[group]}`} />
                    <span className="text-stone-300 font-semibold text-sm">{GROUP_LABELS[group]}</span>
                    <span className="text-stone-500 text-xs ml-1">· ${groupProps[0]?.houseCost}/house</span>
                  </div>

                  {/* Properties */}
                  {groupProps.map(sq => {
                    const prop = gameState.properties[sq.id];
                    const houses = prop?.houses ?? 0;
                    const buyResult = canBuyHouse(gameState, playerId, sq.id);
                    const sellResult = canSellHouse(gameState, playerId, sq.id);

                    return (
                      <div
                        key={sq.id}
                        className="flex items-center justify-between bg-stone-700 rounded-lg px-3 py-2"
                      >
                        {/* Name + houses */}
                        <div className="flex-1 min-w-0">
                          <div className="text-stone-200 text-sm font-medium truncate">{sq.name}</div>
                          <div className="text-lg leading-tight mt-0.5">{housesDisplay(houses)}</div>
                        </div>

                        {/* +/- controls */}
                        <div className="flex items-center gap-2 ml-3">
                          <button
                            onClick={() => dispatch({ type: 'SELL_HOUSE', propertyId: sq.id })}
                            disabled={!sellResult.ok}
                            title={sellResult.reason}
                            className="w-7 h-7 rounded bg-stone-600 hover:bg-stone-500 disabled:opacity-30 disabled:cursor-not-allowed text-stone-200 font-bold text-base flex items-center justify-center transition-colors"
                          >
                            −
                          </button>
                          <span className="text-stone-300 font-mono text-sm w-4 text-center">
                            {houses === 5 ? 'H' : houses}
                          </span>
                          <button
                            onClick={() => dispatch({ type: 'BUY_HOUSE', propertyId: sq.id })}
                            disabled={!buyResult.ok}
                            title={buyResult.reason}
                            className="w-7 h-7 rounded bg-amber-600 hover:bg-amber-500 disabled:opacity-30 disabled:cursor-not-allowed text-stone-900 font-bold text-base flex items-center justify-center transition-colors"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-stone-600 flex items-center justify-between">
          <div className="text-sm text-stone-400">
            Cash: <span className="text-amber-300 font-mono font-bold">${player.cash}</span>
          </div>
          <button
            onClick={onClose}
            className="bg-stone-600 hover:bg-stone-500 text-stone-200 px-5 py-1.5 rounded text-sm font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
