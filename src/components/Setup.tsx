import { useState } from 'react';
import { useGameStore } from '../store/gameStore';

interface PlayerConfig {
  name: string;
  isAI: boolean;
}

const DEFAULT_CONFIGS: PlayerConfig[] = [
  { name: '', isAI: false },
  { name: '', isAI: true  },
  { name: '', isAI: true  },
  { name: '', isAI: true  },
  { name: '', isAI: true  },
  { name: '', isAI: true  },
];

export function Setup() {
  const initGame = useGameStore(s => s.initGame);
  const loadGame = useGameStore(s => s.loadGame);
  const [playerCount, setPlayerCount] = useState(2);
  const [configs, setConfigs] = useState<PlayerConfig[]>(DEFAULT_CONFIGS);
  const [errors, setErrors] = useState<string[]>([]);
  const hasAutosave = !!localStorage.getItem('holdings:autosave');

  const updateName = (i: number, name: string) => {
    const next = [...configs];
    next[i] = { ...next[i], name };
    setConfigs(next);
    if (errors.length > 0) setErrors([]);
  };

  const toggleAI = (i: number) => {
    const next = [...configs];
    next[i] = { ...next[i], isAI: !next[i].isAI };
    setConfigs(next);
  };

  const updateCount = (n: number) => {
    setPlayerCount(n);
    if (errors.length > 0) setErrors([]);
  };

  const start = () => {
    const result = initGame(configs.slice(0, playerCount));
    if (result.errors && result.errors.length > 0) {
      setErrors(result.errors);
    }
  };

  const canStart = playerCount >= 2 && playerCount <= 6;

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-900 p-4">
      <div className="bg-stone-800 rounded-xl p-8 max-w-md w-full shadow-2xl border border-stone-600">
        <h1 className="text-3xl font-bold text-center mb-2 text-amber-400">Holdings</h1>
        <p className="text-center text-stone-400 mb-6">KL Edition</p>

        {/* Player count */}
        <div className="mb-5">
          <label className="block text-sm text-stone-300 mb-2">Players</label>
          <div className="flex gap-2">
            {[2, 3, 4, 5, 6].map(n => (
              <button
                key={n}
                onClick={() => updateCount(n)}
                className={`w-10 h-10 rounded font-bold ${
                  playerCount === n
                    ? 'bg-amber-500 text-stone-900'
                    : 'bg-stone-700 text-stone-300 hover:bg-stone-600'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Player rows */}
        <div className="space-y-2 mb-5">
          {Array.from({ length: playerCount }).map((_, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                value={configs[i]?.name || ''}
                onChange={e => updateName(i, e.target.value)}
                placeholder={configs[i]?.isAI ? `Computer ${i + 1}` : `Player ${i + 1}`}
                className="flex-1 bg-stone-700 border border-stone-600 rounded px-3 py-2 text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500 text-sm"
              />
              <button
                onClick={() => toggleAI(i)}
                title={configs[i]?.isAI ? 'Switch to human' : 'Switch to computer'}
                className={`flex-shrink-0 w-24 py-2 rounded text-xs font-semibold transition-colors ${
                  configs[i]?.isAI
                    ? 'bg-blue-600 hover:bg-blue-500 text-white'
                    : 'bg-stone-600 hover:bg-stone-500 text-stone-200'
                }`}
              >
                {configs[i]?.isAI ? '🤖 Computer' : '👤 Human'}
              </button>
            </div>
          ))}
        </div>

        {/* Error banner */}
        {errors.length > 0 && (
          <div className="mb-3 rounded border border-red-500 bg-red-950/40 px-3 py-2 text-sm text-red-200">
            {errors.map((err, i) => <div key={i}>{err}</div>)}
          </div>
        )}

        <button
          onClick={start}
          disabled={!canStart}
          className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-stone-600 disabled:text-stone-500 text-stone-900 font-bold py-3 rounded-lg transition-colors"
        >
          Start Game
        </button>

        {hasAutosave && (
          <button
            onClick={loadGame}
            className="w-full mt-2 bg-stone-700 hover:bg-stone-600 text-stone-300 py-2 rounded-lg transition-colors text-sm"
          >
            Resume Saved Game
          </button>
        )}
      </div>
    </div>
  );
}
