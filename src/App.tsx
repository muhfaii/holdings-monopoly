import { useGameStore } from './store/gameStore';
import { Setup } from './components/Setup';
import { GameBoard } from './components/GameBoard';

export default function App() {
  const gameState = useGameStore(s => s.gameState);

  if (gameState.phase === 'setup') {
    return <Setup />;
  }

  return <GameBoard />;
}
