import { create } from 'zustand';
import type { GameState } from '../engine/core/state';
import type { Action, ActionResult } from '../engine/core/actions';
import { reducer, createSetupState } from '../engine/core/reducer';
import { saveToLocalStorage, loadFromLocalStorage } from '../engine/persistence/serialize';

const AUTOSAVE_KEY = 'holdings:autosave';

interface GameStore {
  gameState: GameState;
  dispatch: (action: Action) => ActionResult;
  initGame: (players: Array<{ name: string; isAI: boolean }>) => ActionResult;
  newGame: () => void;
  loadGame: () => boolean;
  saveGame: (slot?: number) => void;
  loadSlot: (slot: number) => boolean;
}

export const useGameStore = create<GameStore>((set, get) => ({
  // Boot into a real setup-phase state so the engine is the single source of truth
  // from the first frame. No more nullable state.
  gameState: createSetupState(),

  dispatch: (action: Action): ActionResult => {
    const state = get().gameState;
    const result = reducer(state, action);

    if (result.errors && result.errors.length > 0) {
      return result;
    }

    set({ gameState: result.state });
    // Autosave only persists meaningful states (not the empty setup boot state).
    if (result.state.phase !== 'setup') {
      saveToLocalStorage(AUTOSAVE_KEY, result.state);
    }
    return result;
  },

  initGame: (players: Array<{ name: string; isAI: boolean }>): ActionResult => {
    return get().dispatch({ type: 'START_GAME', players });
  },

  newGame: () => {
    get().dispatch({ type: 'NEW_GAME' });
    // Clear autosave so the user gets a clean Setup screen next reload.
    try {
      localStorage.removeItem(AUTOSAVE_KEY);
    } catch {
      // Ignore storage errors (e.g. private mode quotas)
    }
  },

  loadGame: () => {
    const saved = loadFromLocalStorage(AUTOSAVE_KEY);
    if (saved) {
      set({ gameState: saved });
      return true;
    }
    return false;
  },

  saveGame: (slot?: number) => {
    const state = get().gameState;
    if (state.phase === 'setup') return;
    if (slot !== undefined) {
      saveToLocalStorage(`holdings:slot:${slot}`, state);
    }
    saveToLocalStorage(AUTOSAVE_KEY, state);
  },

  loadSlot: (slot: number) => {
    const saved = loadFromLocalStorage(`holdings:slot:${slot}`);
    if (saved) {
      set({ gameState: saved });
      return true;
    }
    return false;
  },
}));
