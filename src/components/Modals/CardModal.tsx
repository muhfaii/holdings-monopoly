import type { Decision } from '../../engine/core/state';
import { useGameStore } from '../../store/gameStore';

interface Props {
  decision: Decision & { type: 'AWAIT_CARD_ACKNOWLEDGEMENT' };
}

export function CardModal({ decision }: Props) {
  const dispatch = useGameStore(s => s.dispatch);
  const player = useGameStore(s => s.gameState!.players[decision.playerId]);

  const isChance = decision.deckType === 'chance';

  // Colour theme: Chance = orange, Community Chest = green (per PRD §7.1)
  const headerBg = isChance ? 'bg-amber-500' : 'bg-emerald-600';
  const borderColor = isChance ? 'border-amber-600' : 'border-emerald-700';
  const labelText = isChance ? 'text-amber-400' : 'text-emerald-400';
  const label = isChance ? 'Chance' : 'Community Chest';

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className={`bg-stone-800 rounded-xl w-full max-w-sm border ${borderColor} shadow-2xl overflow-hidden`}>
        {/* Header strip */}
        <div className={`${headerBg} px-6 py-3`}>
          <span className="text-sm font-bold text-white uppercase tracking-widest">{label}</span>
        </div>

        {/* Card text */}
        <div className="px-6 py-6">
          <p className="text-stone-100 text-base leading-relaxed">{decision.cardText}</p>
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex items-center justify-between">
          <span className={`text-xs font-mono ${labelText}`}>{decision.cardId}</span>
          <button
            onClick={() => dispatch({ type: 'ACKNOWLEDGE_CARD' })}
            className={`${isChance ? 'bg-amber-500 hover:bg-amber-400' : 'bg-emerald-600 hover:bg-emerald-500'} text-white font-bold py-2 px-6 rounded-lg text-sm transition-colors`}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
