// ─── CapSwap: Phaser Configuration ────────────────────────────────────────────

import Phaser from 'phaser';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { GameBridge } from './GameContainer';

export function createPhaserConfig(
  parent: HTMLElement,
  bridge: GameBridge
): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    parent,
    backgroundColor: '#1a1a2e',
    pixelArt: true,
    roundPixels: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [
      new BootScene(),
      new GameScene(bridge),
    ],
  };
}
