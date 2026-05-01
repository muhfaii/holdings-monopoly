import type { GameState } from '../core/state';

const CURRENT_VERSION = 1;

export function serialize(state: GameState): string {
  return JSON.stringify(state);
}

export function deserialize(json: string): GameState | null {
  try {
    const parsed = JSON.parse(json);
    if (!parsed.version || !parsed.players || !parsed.properties) {
      return null;
    }
    return migrate(parsed);
  } catch {
    return null;
  }
}

export function migrate(state: GameState): GameState {
  let current = state;
  while (current.version < CURRENT_VERSION) {
    current = applyMigration(current);
  }
  return current;
}

function applyMigration(state: GameState): GameState {
  switch (state.version) {
    case 0:
      state = { ...state, version: 1 };
      break;
  }
  return state;
}

export function saveToLocalStorage(key: string, state: GameState): void {
  try {
    localStorage.setItem(key, serialize(state));
  } catch {
    // localStorage full or unavailable
  }
}

export function loadFromLocalStorage(key: string): GameState | null {
  try {
    const json = localStorage.getItem(key);
    if (!json) return null;
    return deserialize(json);
  } catch {
    return null;
  }
}
