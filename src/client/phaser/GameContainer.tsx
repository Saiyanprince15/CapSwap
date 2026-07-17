// ─── CapSwap: Phaser ↔ React Bridge & Container ──────────────────────────────

import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { createPhaserConfig } from './config';
import { GameState } from '../utils/gameState';
import { DifficultyId } from '../constants';

export interface GameBridge {
  play: (difficulty?: DifficultyId) => void;
  confirm: () => void;
  /** Toggles GLOBAL mute (music + all SFX). Returns the new muted state. */
  toggleMute: () => boolean;
  /** Play a UI sound effect from React overlays (respects global mute). */
  sfx: (name: 'hover' | 'click') => void;
  exit: () => void;
  resume: () => void;
  onStateChange: ((state: GameState) => void) | null;
  onTriesChange: ((tries: number) => void) | null;
  onCorrectChange: ((count: number) => void) | null;
  onStreakChange: ((current: number, best: number) => void) | null;
  onGameConfig:
    | ((difficulty: DifficultyId, bottleCount: number, maxTries: number) => void)
    | null;
}

interface GameContainerProps {
  onBridge: (bridge: GameBridge) => void;
}

export function GameContainer({ onBridge }: GameContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const bridge: GameBridge = {
      play: () => {},
      confirm: () => {},
      toggleMute: () => false,
      sfx: () => {},
      exit: () => {},
      resume: () => {},
      onStateChange: null,
      onTriesChange: null,
      onCorrectChange: null,
      onStreakChange: null,
      onGameConfig: null,
    };

    const config = createPhaserConfig(containerRef.current, bridge);
    gameRef.current = new Phaser.Game(config);

    onBridge(bridge);

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [onBridge]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%' }}
    />
  );
}
