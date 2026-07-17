// ─── CapSwap: Boot Scene (Asset Preloader + Generated Textures) ───────────────

import Phaser from 'phaser';
import {
  ASSET_KEYS,
  ASSET_PATHS,
  GLASS_WIDTH,
  GLASS_HEIGHT,
} from '../../constants';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Bottles (1–5 hand-made, 6–8 recolored from the same base art)
    this.load.image(ASSET_KEYS.BOTTLE_1, ASSET_PATHS.BOTTLE_1);
    this.load.image(ASSET_KEYS.BOTTLE_2, ASSET_PATHS.BOTTLE_2);
    this.load.image(ASSET_KEYS.BOTTLE_3, ASSET_PATHS.BOTTLE_3);
    this.load.image(ASSET_KEYS.BOTTLE_4, ASSET_PATHS.BOTTLE_4);
    this.load.image(ASSET_KEYS.BOTTLE_5, ASSET_PATHS.BOTTLE_5);
    this.load.image(ASSET_KEYS.BOTTLE_6, ASSET_PATHS.BOTTLE_6);
    this.load.image(ASSET_KEYS.BOTTLE_7, ASSET_PATHS.BOTTLE_7);
    this.load.image(ASSET_KEYS.BOTTLE_8, ASSET_PATHS.BOTTLE_8);
    this.load.image(ASSET_KEYS.BOTTLE_HIDDEN, ASSET_PATHS.BOTTLE_HIDDEN);

    // Backgrounds (one per difficulty)
    this.load.image(ASSET_KEYS.BACKGROUND, ASSET_PATHS.BACKGROUND);
    this.load.image(ASSET_KEYS.BG_CYBERPUNK, ASSET_PATHS.BG_CYBERPUNK);
    this.load.image(ASSET_KEYS.BG_VOLCANO, ASSET_PATHS.BG_VOLCANO);
  }

  create(): void {
    this.generateFrostedGlassTexture();
    this.generateConfettiTexture();
    this.scene.start('GameScene');
  }

  /**
   * Bake a pixel-art frosted glass panel: cool blue-white gradient bands,
   * grainy frost speckles, diagonal reflection streaks, and an arcade
   * display-case frame with corner rivets. Semi-transparent, so the grey
   * bottle silhouettes underneath read as shapes — never colors.
   */
  private generateFrostedGlassTexture(): void {
    if (this.textures.exists(ASSET_KEYS.FROSTED_GLASS)) return;

    const w = GLASS_WIDTH;
    const h = GLASS_HEIGHT;
    const g = this.add.graphics();

    // 1. Gradient base: horizontal 6px bands, lighter at the top
    const bands = Math.ceil(h / 6);
    for (let i = 0; i < bands; i++) {
      const t = i / (bands - 1);
      const color = Phaser.Display.Color.Interpolate.ColorWithColor(
        new Phaser.Display.Color(0xbe, 0xd8, 0xec),
        new Phaser.Display.Color(0x7f, 0xa2, 0xc4),
        bands - 1,
        i
      );
      const hex = Phaser.Display.Color.GetColor(color.r, color.g, color.b);
      g.fillStyle(hex, 0.5 + t * 0.14);
      g.fillRect(0, i * 6, w, 6);
    }

    // 2. Frost grain: scattered pixel speckles (light and dark)
    for (let i = 0; i < 420; i++) {
      const x = Math.floor(Math.random() * (w / 3)) * 3;
      const y = Math.floor(Math.random() * (h / 3)) * 3;
      const light = Math.random() > 0.35;
      g.fillStyle(light ? 0xffffff : 0x51708f, light ? 0.09 : 0.08);
      g.fillRect(x, y, 3, 3);
    }

    // 3. Diagonal reflection streaks (classic glass highlight)
    const streak = (xTop: number, width: number, alpha: number) => {
      g.fillStyle(0xffffff, alpha);
      g.beginPath();
      g.moveTo(xTop, 0);
      g.lineTo(xTop + width, 0);
      g.lineTo(xTop + width - h * 0.45, h);
      g.lineTo(xTop - h * 0.45, h);
      g.closePath();
      g.fillPath();
    };
    streak(w * 0.22, 26, 0.13);
    streak(w * 0.34, 10, 0.1);
    streak(w * 0.78, 18, 0.11);

    // 4. Display-case frame
    g.fillStyle(0x1c2a38, 0.95); // outer frame
    g.fillRect(0, 0, w, 6);
    g.fillRect(0, h - 6, w, 6);
    g.fillRect(0, 0, 6, h);
    g.fillRect(w - 6, 0, 6, h);
    g.fillStyle(0xdfeeff, 0.35); // inner light bevel
    g.fillRect(6, 6, w - 12, 2);
    g.fillRect(6, 6, 2, h - 12);
    g.fillStyle(0x0d1520, 0.6); // inner dark bevel
    g.fillRect(6, h - 8, w - 12, 2);
    g.fillRect(w - 8, 6, 2, h - 12);

    // Corner rivets
    g.fillStyle(0x36495c, 1);
    const rivetPositions: [number, number][] = [
      [10, 10],
      [w - 18, 10],
      [10, h - 18],
      [w - 18, h - 18],
    ];
    for (const [rx, ry] of rivetPositions) {
      g.fillRect(rx, ry, 8, 8);
      g.fillStyle(0x9fb8d0, 1);
      g.fillRect(rx + 2, ry + 2, 3, 3);
      g.fillStyle(0x36495c, 1);
    }

    g.generateTexture(ASSET_KEYS.FROSTED_GLASS, w, h);
    g.destroy();
  }

  /** Small white square used (tinted) for pixel confetti particles. */
  private generateConfettiTexture(): void {
    if (this.textures.exists(ASSET_KEYS.CONFETTI)) return;
    const g = this.add.graphics();
    g.fillStyle(0xffffff);
    g.fillRect(0, 0, 6, 6);
    g.generateTexture(ASSET_KEYS.CONFETTI, 6, 6);
    g.destroy();
  }
}
