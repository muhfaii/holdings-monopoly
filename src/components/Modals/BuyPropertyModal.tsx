import type { Decision } from '../../engine/core/state';
import { useGameStore } from '../../store/gameStore';
import { BOARD } from '../../engine/data/board';

interface Props {
  decision: Decision & { type: 'AWAIT_BUY_DECISION' };
}

export function BuyPropertyModal({ decision }: Props) {
  const dispatch = useGameStore(s => s.dispatch);
  const player = useGameStore(s => s.gameState!.players[decision.playerId]);
  const square = BOARD[decision.propertyId];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-stone-800 rounded-xl p-6 max-w-sm w-full border border-stone-600 shadow-2xl">
        <h2 className="text-lg font-bold text-stone-100 mb-1">{square.name}</h2>
        <p className="text-sm text-stone-400 mb-4">
          Price: <span className="text-amber-400 font-bold">${square.price}</span>
        </p>

        <div className="text-xs text-stone-500 mb-4">
          {square.type === 'railroad' && 'Railroad — rent scales with number owned'}
          {square.type === 'utility' && 'Utility — rent is 4× or 10× dice roll'}
          {square.group && (
            <div>
              <div>Rent ladder:</div>
              <div className="font-mono mt-1">
                Base: ${square.rentLadder?.[0]} | Monopoly: ${square.rentLadder?.[1]} |
                1🏠: ${square.rentLadder?.[2]} | 2🏠: ${square.rentLadder?.[3]} | 3🏠: ${square.rentLadder?.[4]} |
                4🏠: ${square.rentLadder?.[5]} | 🏨: ${square.rentLadder?.[6]}
              </div>
            </div>
          )}
        </div>

        <div className="text-sm text-stone-300 mb-4">
          Your cash: <span className="font-mono text-emerald-400">${player.cash}</span>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => dispatch({ type: 'BUY_PROPERTY' })}
            disabled={player.cash < square.price}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-stone-600 disabled:text-stone-500 text-white font-bold py-2 rounded-lg text-sm transition-colors"
          >
            Buy (${square.price})
          </button>
          <button
            onClick={() => dispatch({ type: 'DECLINE_PURCHASE' })}
            className="flex-1 bg-stone-600 hover:bg-stone-500 text-stone-200 py-2 rounded-lg text-sm transition-colors"
          >
            Auction
          </button>
        </div>
      </div>
    </div>
  );
}
