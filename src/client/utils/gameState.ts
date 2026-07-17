// ─── CapSwap: Finite State Machine ────────────────────────────────────────────
// Controls the entire game lifecycle. All transitions flow through here.

export enum GameState {
  MENU = 'MENU',
  START_ANIMATION = 'START_ANIMATION',
  PLAYING = 'PLAYING',
  CHECKING = 'CHECKING',
  WIN_REVEAL = 'WIN_REVEAL',
  VICTORY = 'VICTORY',
  LOSE_REVEAL = 'LOSE_REVEAL',
  GAME_OVER = 'GAME_OVER',
  PAUSED = 'PAUSED',
}

/** Valid transitions map: from → allowed destinations. */
const TRANSITIONS: Record<GameState, GameState[]> = {
  [GameState.MENU]: [GameState.START_ANIMATION],
  [GameState.START_ANIMATION]: [GameState.PLAYING],
  [GameState.PLAYING]: [GameState.CHECKING, GameState.PAUSED],
  [GameState.CHECKING]: [GameState.WIN_REVEAL, GameState.PLAYING, GameState.LOSE_REVEAL],
  [GameState.WIN_REVEAL]: [GameState.VICTORY],
  [GameState.VICTORY]: [GameState.MENU, GameState.START_ANIMATION],
  [GameState.LOSE_REVEAL]: [GameState.GAME_OVER],
  [GameState.GAME_OVER]: [GameState.MENU, GameState.START_ANIMATION],
  [GameState.PAUSED]: [GameState.PLAYING, GameState.MENU],
};

export type StateChangeListener = (
  newState: GameState,
  oldState: GameState
) => void;

export class GameStateMachine {
  private _state: GameState = GameState.MENU;
  private _listeners: StateChangeListener[] = [];
  private _previousPlayState: GameState = GameState.PLAYING;

  get state(): GameState {
    return this._state;
  }

  /** Subscribe to state changes. Returns an unsubscribe function. */
  onChange(listener: StateChangeListener): () => void {
    this._listeners.push(listener);
    return () => {
      this._listeners = this._listeners.filter((l) => l !== listener);
    };
  }

  /** Attempt a state transition. Throws if invalid. */
  transition(to: GameState): void {
    const allowed = TRANSITIONS[this._state];
    if (!allowed || !allowed.includes(to)) {
      console.warn(
        `[FSM] Invalid transition: ${this._state} → ${to}. Allowed: ${allowed?.join(', ')}`
      );
      return;
    }

    // Track state before pausing so we can resume to it
    if (to === GameState.PAUSED) {
      this._previousPlayState = this._state;
    }

    const old = this._state;
    this._state = to;

    for (const listener of this._listeners) {
      listener(to, old);
    }
  }

  /** Convenience: go back from PAUSED to the state we came from. */
  resume(): void {
    if (this._state === GameState.PAUSED) {
      this.transition(this._previousPlayState);
    }
  }

  /** Hard reset to MENU (used on full restart). */
  reset(): void {
    const old = this._state;
    this._state = GameState.MENU;
    for (const listener of this._listeners) {
      listener(GameState.MENU, old);
    }
  }

  /** Remove all listeners. */
  destroy(): void {
    this._listeners = [];
  }
}
