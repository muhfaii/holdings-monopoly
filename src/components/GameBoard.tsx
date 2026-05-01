import { useGameStore } from '../store/gameStore';
import { Board } from './Board/Board';
import { PlayerDash } from './Board/PlayerDash';
import { HUD } from './Board/HUD';
import { GameLog } from './Board/GameLog';
import { DecisionModalRouter } from './Modals/DecisionModalRouter';
import { useAI } from '../hooks/useAI';

export function GameBoard() {
  const gameState = useGameStore(s => s.gameState)!;
  const dispatch = useGameStore(s => s.dispatch);
  useAI();

  return (
    <div className="min-h-screen bg-stone-900 p-2 flex flex-col gap-2">
      <HUD />

      <div className="flex gap-2 flex-1 min-h-0">
        {/* Board: center */}
        <div className="flex-1">
          <Board />
        </div>

        {/* Player dashboards: right rail */}
        <div className="w-64 flex-shrink-0 space-y-2 overflow-y-auto">
          {Object.values(gameState.players).map(player => (
            <PlayerDash key={player.id} player={player} />
          ))}
        </div>
      </div>

      {/* Game log: bottom */}
      <div className="h-32 flex-shrink-0">
        <GameLog />
      </div>

      {/* Decision modals */}
      <DecisionModalRouter />
    </div>
  );
}