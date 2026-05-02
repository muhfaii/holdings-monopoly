import type { GameState } from '../core/state';

const CURRENT_VERSION = 2;

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let current = state as any;
  while (current.version < CURRENT_VERSION) {
    current = applyMigration(current);
  }
  return current as GameState;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyMigration(state: any): any {
  switch (state.version) {
    case 0:
      state = { ...state, version: 1 };
      break;

    case 1: {
      // v2: add goojfCardSources to all players + cardRentOverride to TurnState
      const updatedPlayers: Record<string, unknown> = {};
      for (const [id, player] of Object.entries(state.players as Record<string, any>)) {
        updatedPlayers[id] = {
          ...player,
          goojfCardSources: player.goojfCardSources ?? [],
        };
      }
      state = {
        ...state,
        version: 2,
        players: updatedPlayers,
        turn: {
          ...state.turn,
          cardRentOverride: state.turn?.cardRentOverride ?? null,
        },
      };
      break;
    }
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
