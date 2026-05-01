import type { PlayerState } from '../../engine/core/state';
import { useGameStore } from '../../store/gameStore';
import { BOARD } from '../../engine/data/board';

interface Props {
  player: PlayerState;
}

const PLAYER_COLORS = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

export function PlayerDash({ player }: Props) {
  const gameState = useGameStore(s => s.gameState)!;
  const isCurrentPlayer = gameState.turn.currentPlayerId === player.id;
  const idx = Object.keys(gameState.players).indexOf(player.id);

  if (player.bankrupt) {
    return (
      <div className="bg-stone-800/50 rounded-lg p-3 border border-stone-700 opacity-60">
        <div className="text-sm font-bold text-stone-500 line-through">{player.name}</div>
        <div className="text-xs text-red-400">BANKRUPT</div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg p-3 border-2 transition-colors ${
        isCurrentPlayer ? 'border-amber-400 bg-stone-800' : 'border-stone-700 bg-stone-800/70'
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-3 h-3 rounded-full border border-stone-600"
          style={{ backgroundColor: PLAYER_COLORS[idx % PLAYER_COLORS.length] }}
        />
        <span className="text-sm font-bold text-stone-100">{player.name}</span>
        {player.isAI && (
          <span className="ml-auto text-[10px] text-blue-400 font-semibold tracking-wide">🤖 CPU</span>
        )}
      </div>

      <div className="space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-stone-400">Cash</span>
          <span className="text-emerald-400 font-mono font-bold">${player.cash}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-stone-400">Properties</span>
          <span className="text-stone-300">{player.properties.length}</span>
        </div>
        {player.inJail && (
          <div className="flex justify-between">
            <span className="text-red-400">In Jail</span>
            <span className="text-red-400">{player.jailTurns + 1}/3 turns</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-stone-400">GO passes</span>
          <span className="text-stone-300">{player.laps}</span>
        </div>
        {player.laps === 0 && (
          <div className="text-[10px] text-amber-500 italic">
            Must pass GO before buying
          </div>
        )}

        {/* Owned properties list */}
        {player.properties.length > 0 && (
          <div className="mt-2 pt-2 border-t border-stone-700">
            <div className="text-stone-500 mb-1">Properties:</div>
            <div className="space-y-0.5 max-h-32 overflow-y-auto">
              {player.properties.map(propId => {
                const square = BOARD[propId];
                const property = gameState.properties[propId];
                return (
                  <div key={propId} className="flex items-center gap-1 text-[10px]">
                    {square.group && (
                      <div
                        className="w-2 h-2 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: PLAYER_COLORS[idx % PLAYER_COLORS.length] }}
                      />
                    )}
                    <span className="text-stone-400 truncate">{square.name}</span>
                    {property.mortgaged && (
                      <span className="text-red-400 text-[9px] ml-auto">MORT</span>
                    )}
                    {property.houses > 0 && property.houses <= 4 && (
                      <span className="text-emerald-400 text-[9px] ml-auto">
                        {'🏠'.repeat(property.houses)}
                      </span>
                    )}
                    {property.houses === 5 && (
                      <span className="text-red-400 text-[9px] ml-auto">🏨</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}