import type { Decision } from '../../engine/core/state';
import { useGameStore } from '../../store/gameStore';

interface Props {
  decision: Decision & { type: 'AWAIT_BANKRUPTCY_LIQUIDATION' };
}

export function BankruptcyModal({ decision }: Props) {
  const dispatch = useGameStore(s => s.dispatch);
  const player = useGameStore(s => s.gameState!.players[decision.playerId]);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-stone-800 rounded-xl p-6 max-w-sm w-full border border-red-500/30 shadow-2xl">
        <h2 className="text-lg font-bold text-red-400 mb-1">Bankruptcy!</h2>
        <p className="text-sm text-stone-300 mb-1">
          {player.name} cannot pay ${decision.debt}
        </p>
        <p className="text-xs text-stone-500 mb-4">
          Assets will be transferred to{' '}
          {decision.creditorId ? `creditor` : 'the bank'}
        </p>

        <div className="text-xs text-stone-500 mb-4">
          Properties: {player.properties.length} | Cash: ${player.cash}
        </div>

        <button
          onClick={() => dispatch({ type: 'RESOLVE_BANKRUPTCY_DEBT' })}
          className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-2 rounded-lg text-sm transition-colors"
        >
          Liquidate Assets
        </button>
      </div>
    </div>
  );
}
