import { useGameStore } from '../../store/gameStore';

export function HUD() {
  const gameState = useGameStore(s => s.gameState)!;
  const dispatch = useGameStore(s => s.dispatch);
  const currentPlayer = gameState.players[gameState.turn.currentPlayerId];
  const lastEvent = gameState.history[gameState.history.length - 1];

  const diceEvent = [...gameState.history].reverse().find(
    e => e.type === 'DICE_ROLLED' && e.playerId === currentPlayer?.id,
  );

  const { hasRolledThisTurn, jailRoll, pendingDecision } = gameState.turn;
  const lastRollDoubles = diceEvent?.type === 'DICE_ROLLED' && diceEvent.die1 === diceEvent.die2;
  // Can roll if: no pending decision AND (haven't rolled yet, OR rolled doubles outside jail)
  const canRoll =
    !pendingDecision &&
    gameState.phase === 'active' &&
    (!hasRolledThisTurn || (lastRollDoubles && !jailRoll));
  // Can end turn if: no pending decision AND already rolled AND not eligible to roll again
  const canEndTurn =
    !pendingDecision &&
    gameState.phase === 'active' &&
    hasRolledThisTurn &&
    !(lastRollDoubles && !jailRoll);

  return (
    <div className="bg-stone-800 rounded-lg p-3 border border-stone-600 flex items-center justify-between">
      {/* Current player */}
      <div className="flex items-center gap-3">
        <div className="text-sm text-stone-400">Current turn:</div>
        <div className="text-lg font-bold text-amber-400">{currentPlayer?.name}</div>
      </div>

      {/* Dice display */}
      <div className="flex items-center gap-4">
        {diceEvent && diceEvent.type === 'DICE_ROLLED' && (
          <div className="flex gap-2">
            <Die face={diceEvent.die1} />
            <Die face={diceEvent.die2} />
          </div>
        )}

        {/* Kopitiam pot */}
        <div className="bg-stone-700 rounded px-3 py-1">
          <span className="text-xs text-stone-400">Kopitiam Pot: </span>
          <span className="text-amber-400 font-bold font-mono">${gameState.kopitiamPot}</span>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          {canRoll && (
            <button
              onClick={() => dispatch({ type: 'ROLL_DICE' })}
              className="bg-amber-500 hover:bg-amber-400 text-stone-900 font-bold px-4 py-1.5 rounded text-sm transition-colors"
            >
              Roll Dice
            </button>
          )}
          {canEndTurn && diceEvent && (
            <button
              onClick={() => dispatch({ type: 'END_TURN' })}
              className="bg-stone-600 hover:bg-stone-500 text-stone-200 px-3 py-1.5 rounded text-sm transition-colors"
            >
              End Turn
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Die({ face }: { face: number }) {
  return (
    <div className="w-8 h-8 bg-white rounded-md flex items-center justify-center shadow-inner border border-stone-300">
      <span className="text-stone-900 font-bold text-sm">{face}</span>
    </div>
  );
}