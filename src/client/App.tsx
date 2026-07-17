// ─── CapSwap: React App Shell ─────────────────────────────────────────────────

import { useState, useCallback, useRef } from 'react';
import { GameContainer, GameBridge } from './phaser/GameContainer';
import { GameState } from './utils/gameState';
import { getCurrentStreak, getBestStreak } from './utils/streakManager';
import { dailyPuzzleKey } from './utils/gameLogic';
import {
  DIFFICULTIES,
  DEFAULT_DIFFICULTY,
  DifficultyId,
  DIFFICULTY_BG_PATH,
} from './constants';

// ─── Button Asset Paths (served from publicDir = Assets/) ─────────────────────
const BTN = {
  PLAY_IDLE: 'Buttons/Play Button/Play Button Idle.png',
  PLAY_HOVER: 'Buttons/Play Button/Play Button Hovering.png',
  CONFIRM_IDLE: 'Buttons/Confirm Button/Confirm Button Idle.png',
  CONFIRM_HOVER: 'Buttons/Confirm Button/Confirm Button Idle-1.png',
  EXIT: 'Buttons/Exit Button/Exit Button.png',
  MUSIC_ON: 'Buttons/Music Button/Music Enabled.png',
  MUSIC_OFF: 'Buttons/Music Button/Music Disabled.png',
} as const;

const DIFFICULTY_ORDER: DifficultyId[] = ['easy', 'medium', 'hard', 'daily'];

type MenuStep = 'title' | 'difficulty';

export default function App() {
  const [screen, setScreen] = useState<GameState>(GameState.MENU);
  const [menuStep, setMenuStep] = useState<MenuStep>('title');
  const [difficulty, setDifficulty] = useState<DifficultyId>(DEFAULT_DIFFICULTY);
  const [bottleCount, setBottleCount] = useState(
    DIFFICULTIES[DEFAULT_DIFFICULTY].bottleCount
  );
  const [maxTries, setMaxTries] = useState(
    DIFFICULTIES[DEFAULT_DIFFICULTY].tries
  );
  const [triesLeft, setTriesLeft] = useState(maxTries);
  const [correctCount, setCorrectCount] = useState(0);
  const [muted, setMuted] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(getCurrentStreak());
  const [bestStreak, setBestStreak] = useState(getBestStreak());
  const bridgeRef = useRef<GameBridge | null>(null);

  const handleBridge = useCallback((bridge: GameBridge) => {
    bridgeRef.current = bridge;

    bridge.onStateChange = (state: GameState) => {
      setScreen(state);
      if (state === GameState.MENU) setMenuStep('title');
    };
    bridge.onTriesChange = (tries: number) => {
      setTriesLeft(tries);
    };
    bridge.onCorrectChange = (count: number) => {
      setCorrectCount(count);
    };
    bridge.onStreakChange = (current: number, best: number) => {
      setCurrentStreak(current);
      setBestStreak(best);
    };
    bridge.onGameConfig = (
      diff: DifficultyId,
      bottles: number,
      tries: number
    ) => {
      setDifficulty(diff);
      setBottleCount(bottles);
      setMaxTries(tries);
    };
  }, []);

  const hover = useCallback(() => bridgeRef.current?.sfx('hover'), []);

  const handleShowDifficulty = useCallback(() => {
    bridgeRef.current?.sfx('click');
    setMenuStep('difficulty');
  }, []);

  const handleBackToTitle = useCallback(() => {
    bridgeRef.current?.sfx('click');
    setMenuStep('title');
  }, []);

  const handlePlayDifficulty = useCallback((id: DifficultyId) => {
    bridgeRef.current?.play(id);
  }, []);

  const handlePlayAgain = useCallback(() => {
    // Replays the same difficulty as the last round
    bridgeRef.current?.play();
  }, []);

  const handleConfirm = useCallback(() => {
    bridgeRef.current?.confirm();
  }, []);

  const handleMute = useCallback(() => {
    const newMuted = bridgeRef.current?.toggleMute() ?? false;
    setMuted(newMuted);
  }, []);

  const handleExit = useCallback(() => {
    bridgeRef.current?.sfx('click');
    bridgeRef.current?.exit();
  }, []);

  const handleResume = useCallback(() => {
    bridgeRef.current?.sfx('click');
    bridgeRef.current?.resume();
  }, []);

  const isPlaying =
    screen === GameState.PLAYING || screen === GameState.CHECKING;
  const isStartAnim = screen === GameState.START_ANIMATION;
  const difficultyLabel = DIFFICULTIES[difficulty].label;

  const streakPanel = (
    <div className="streak-container">
      <div className="streak-item">
        <div className="streak-label">Streak</div>
        <div className="streak-value">{currentStreak}</div>
      </div>
      <div className="streak-divider" />
      <div className="streak-item">
        <div className="streak-label">Best</div>
        <div className="streak-value streak-best">{bestStreak}</div>
      </div>
    </div>
  );

  return (
    <div className="app-container">
      <div className="game-wrapper">
        <GameContainer onBridge={handleBridge} />

        {/* ─── HUD: Top bar ─── */}
        {(isPlaying || isStartAnim) && (
          <div className="hud-overlay">
            <div className="hud-top">
              <button
                className="img-btn hud-icon-btn"
                onClick={handleExit}
                onMouseEnter={hover}
              >
                <img src={BTN.EXIT} alt="Exit to menu" />
              </button>
              <button
                className="img-btn hud-icon-btn"
                onClick={handleMute}
                onMouseEnter={hover}
              >
                <img
                  src={muted ? BTN.MUSIC_OFF : BTN.MUSIC_ON}
                  alt={muted ? 'Unmute all sound' : 'Mute all sound'}
                />
              </button>
            </div>
          </div>
        )}

        {/* ─── HUD: Center info ─── */}
        {isPlaying && (
          <>
            <div className="hud-center">
              <div className="hud-game-title">
                Cap<span style={{ color: '#f0c040' }}>Swap</span>
              </div>
              <div className="hud-badges">
                <div className="hud-difficulty">{difficultyLabel}</div>
                <div className="hud-tries">Tries Left : {triesLeft}</div>
              </div>
            </div>
            <div className="hud-feedback">
              <div className="hud-correct-label">Correct</div>
              <div className="hud-correct-value">
                {correctCount}/{bottleCount}
              </div>
            </div>
            <div className="confirm-area">
              <button
                className="img-btn confirm-img-btn"
                onClick={handleConfirm}
                onMouseEnter={hover}
              >
                <img
                  src={BTN.CONFIRM_IDLE}
                  alt="Confirm arrangement"
                  className="btn-img-idle"
                />
                <img
                  src={BTN.CONFIRM_HOVER}
                  alt="Confirm arrangement"
                  className="btn-img-hover"
                />
              </button>
            </div>
          </>
        )}

        {/* ─── Menu Screen: Title ─── */}
        {screen === GameState.MENU && menuStep === 'title' && (
          <div className="screen-overlay overlay-bg-menu">
            <div className="screen-title">
              Cap<span className="accent">Swap</span>
            </div>
            <div className="screen-subtitle">8-bit Bottle Sorting</div>

            {streakPanel}

            <button
              className="img-btn play-img-btn"
              onClick={handleShowDifficulty}
              onMouseEnter={hover}
            >
              <img src={BTN.PLAY_IDLE} alt="Play" className="btn-img-idle" />
              <img src={BTN.PLAY_HOVER} alt="Play" className="btn-img-hover" />
            </button>
          </div>
        )}

        {/* ─── Menu Screen: Difficulty Select ─── */}
        {screen === GameState.MENU && menuStep === 'difficulty' && (
          <div className="screen-overlay overlay-bg-menu">
            <div className="screen-title screen-title-small">
              Select <span className="accent">Difficulty</span>
            </div>

            <div className="difficulty-list">
              {DIFFICULTY_ORDER.map((id) => {
                const cfg = DIFFICULTIES[id];
                return (
                  <button
                    key={id}
                    className={`difficulty-btn difficulty-${id}`}
                    onClick={() => handlePlayDifficulty(id)}
                    onMouseEnter={hover}
                  >
                    <div
                      className="difficulty-bg"
                      style={{ backgroundImage: `url('${DIFFICULTY_BG_PATH[id]}')` }}
                    />
                    <span className="difficulty-name">{cfg.label}</span>
                    <span className="difficulty-meta">
                      {cfg.bottleCount} bottles · {cfg.tries} guesses
                    </span>
                    <span className="difficulty-tag">
                      {id === 'daily' ? dailyPuzzleKey() : cfg.tagline}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              className="text-btn back-btn"
              onClick={handleBackToTitle}
              onMouseEnter={hover}
            >
              ← Back
            </button>
          </div>
        )}

        {/* ─── Victory Screen ─── */}
        {screen === GameState.VICTORY && (
          <div className="screen-overlay overlay-bg">
            <div className="victory-text">Victory!</div>
            <div className="result-text">
              You sorted all {bottleCount} bottles!
            </div>
            <div className="result-subtext">{difficultyLabel} cleared</div>
            <div style={{ marginTop: 12 }}>{streakPanel}</div>
            <button
              className="img-btn play-img-btn"
              onClick={handlePlayAgain}
              onMouseEnter={hover}
            >
              <img
                src={BTN.PLAY_IDLE}
                alt="Play Again"
                className="btn-img-idle"
              />
              <img
                src={BTN.PLAY_HOVER}
                alt="Play Again"
                className="btn-img-hover"
              />
            </button>
            <button
              className="text-btn"
              onClick={handleExit}
              onMouseEnter={hover}
            >
              Main Menu
            </button>
          </div>
        )}

        {/* ─── Game Over Screen ─── */}
        {screen === GameState.GAME_OVER && (
          <div className="screen-overlay overlay-bg">
            <div className="gameover-text">Game Over</div>
            <div className="result-text">
              You got {correctCount}/{bottleCount} correct
            </div>
            <div className="result-subtext">{difficultyLabel}</div>
            <div style={{ marginTop: 12 }}>{streakPanel}</div>
            <button
              className="img-btn play-img-btn"
              onClick={handlePlayAgain}
              onMouseEnter={hover}
            >
              <img
                src={BTN.PLAY_IDLE}
                alt="Try Again"
                className="btn-img-idle"
              />
              <img
                src={BTN.PLAY_HOVER}
                alt="Try Again"
                className="btn-img-hover"
              />
            </button>
            <button
              className="text-btn"
              onClick={handleExit}
              onMouseEnter={hover}
            >
              Main Menu
            </button>
          </div>
        )}

        {/* ─── Pause Screen ─── */}
        {screen === GameState.PAUSED && (
          <div className="screen-overlay overlay-bg">
            <div className="screen-title screen-title-small">Paused</div>
            <button
              className="img-btn play-img-btn"
              onClick={handleResume}
              onMouseEnter={hover}
            >
              <img src={BTN.PLAY_IDLE} alt="Resume" className="btn-img-idle" />
              <img
                src={BTN.PLAY_HOVER}
                alt="Resume"
                className="btn-img-hover"
              />
            </button>
            <button
              className="text-btn"
              onClick={handleExit}
              onMouseEnter={hover}
            >
              Main Menu
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
