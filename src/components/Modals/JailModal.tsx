import type { Decision } from '../../engine/core/state';
import { useGameStore } from '../../store/gameStore';

interface Props {
  decision: Decision & { type: 'AWAIT_JAIL_DECISION' };
}

export function JailModal({ decision }: Props) {
  const dispatch = useGameStore(s => s.dispatch);
  const player = useGameStore(s => s.gameState!.players[decision.playerId]);
  const canPayFine = player.cash >= 50;
  const hasCard = player.getOutOfJailCards > 0;
  // jailTurns is 0-indexed: 0 = 1st turn, 1 = 2nd turn, 2 = 3rd (final) turn
  const turnsServed = player.jailTurns + 1;
  const isFinalTurn = player.jailTurns >= 2;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-stone-800 rounded-xl p-6 max-w-sm w-full border border-stone-600 shadow-2xl">
        <h2 className="text-lg font-bold text-red-300 mb-1">In Jail</h2>
        <p className="text-sm text-stone-400 mb-1">Turn {turnsServed} of 3</p>

        {isFinalTurn ? (
          <p className="text-xs text-amber-400 mb-3">
            Final turn — roll for doubles or pay to leave. No doubles = released free.
          </p>
        ) : (
          <p className="text-xs text-stone-500 mb-3">
            Pay $50 to leave now, or roll for doubles to escape free.
          </p>
        )}

        <div className="text-sm text-stone-300 mb-4">
          Your cash: <span className="font-mono text-emerald-400">${player.cash}</span>
        </div>

        <div className="space-y-2">
          {/* Pay fine */}
          <button
            onClick={() => dispatch({ type: 'PAY_JAIL_FINE' })}
            disabled={!canPayFine}
            className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-stone-600 disabled:text-stone-500 text-stone-900 font-bold py-2 rounded-lg text-sm transition-colors"
          >
            Pay $50 Fine &amp; Roll
          </button>

          {/* Use card */}
          {hasCard && (
            <button
              onClick={() => dispatch({ type: 'USE_JAIL_CARD' })}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg text-sm transition-colors"
            >
              Use Get Out of Jail Free Card
            </button>
          )}

          {/* Roll for doubles */}
          <button
            onClick={() => dispatch({ type: 'ROLL_DICE' })}
            className="w-full bg-stone-600 hover:bg-stone-500 text-stone-100 py-2 rounded-lg text-sm transition-colors"
          >
            🎲 Roll for Doubles
          </button>
        </div>
      </div>
    </div>
  );
}
