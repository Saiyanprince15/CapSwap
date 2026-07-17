// ─── CapSwap: Bottle Sprite Class ─────────────────────────────────────────────
// Visual representation only. Manages sprite, shadow, and tween animations.
// Scale is per-instance so dense layouts (Hard mode) can shrink bottles.

import Phaser from 'phaser';
import {
  BOTTLE_SCALE,
  BOTTLE_ASSET_MAP,
  TWEEN_IDLE_DURATION,
  SELECT_SCALE,
  SELECT_BOUNCE_Y,
  TWEEN_BOUNCE_DURATION,
  BottleColor,
} from '../../constants';

export class Bottle {
  public sprite: Phaser.GameObjects.Image;
  public shadow: Phaser.GameObjects.Image;
  public colorId: number;
  public slotIndex: number;
  /** Base sprite scale for this bottle (layout-dependent). */
  public readonly scale: number;
  private scene: Phaser.Scene;
  private baseY: number;
  private idleTween: Phaser.Tweens.Tween | null = null;
  private waveTween: Phaser.Tweens.Tween | null = null;
  private _selected = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    colorId: number,
    slotIndex: number,
    scale: number = BOTTLE_SCALE
  ) {
    this.scene = scene;
    this.colorId = colorId;
    this.slotIndex = slotIndex;
    this.scale = scale;
    this.baseY = y;

    const textureKey = BOTTLE_ASSET_MAP[colorId as BottleColor];

    // Shadow (slightly offset, tinted dark, lower alpha)
    this.shadow = scene.add
      .image(x + 4, y + 6, textureKey)
      .setScale(scale)
      .setTint(0x000000)
      .setAlpha(0.25);

    // Main sprite
    this.sprite = scene.add
      .image(x, y, textureKey)
      .setScale(scale)
      .setInteractive({ draggable: false, useHandCursor: true });
  }

  get x(): number {
    return this.sprite.x;
  }
  get y(): number {
    return this.sprite.y;
  }
  get selected(): boolean {
    return this._selected;
  }

  /** Update base position (used after swaps). */
  setBasePosition(_x: number, y: number): void {
    this.baseY = y;
  }

  /** Update the bottle's color/texture without creating a new object. */
  setColor(colorId: number): void {
    this.colorId = colorId;
    const textureKey = BOTTLE_ASSET_MAP[colorId as BottleColor];
    this.sprite.setTexture(textureKey);
    this.shadow.setTexture(textureKey);
  }

  /** Start subtle idle floating animation. */
  startIdle(delay = 0): void {
    this.stopIdle();
    this.idleTween = this.scene.tweens.add({
      targets: [this.sprite],
      y: this.baseY - 3,
      duration: TWEEN_IDLE_DURATION,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay,
    });
  }

  stopIdle(): void {
    this.idleTween?.destroy();
    this.idleTween = null;
  }

  /**
   * One rise-and-settle bounce from the base position (menu wave).
   * Staggered across all bottles, this creates a relaxing rolling wave.
   */
  waveBounce(delay: number, height: number, duration: number): void {
    this.waveTween?.destroy();
    this.waveTween = this.scene.tweens.add({
      targets: this.sprite,
      y: this.baseY - height,
      duration,
      yoyo: true,
      ease: 'Sine.easeInOut',
      delay,
      onComplete: () => {
        this.sprite.y = this.baseY;
      },
    });
  }

  stopWave(): void {
    this.waveTween?.destroy();
    this.waveTween = null;
    this.sprite.y = this.baseY;
  }

  /** Visual select bounce (tap-to-swap mode). */
  select(): void {
    this._selected = true;
    this.scene.tweens.add({
      targets: this.sprite,
      y: this.baseY + SELECT_BOUNCE_Y,
      scaleX: this.scale * SELECT_SCALE,
      scaleY: this.scale * SELECT_SCALE,
      duration: TWEEN_BOUNCE_DURATION,
      ease: 'Back.easeOut',
    });
    this.scene.tweens.add({
      targets: this.shadow,
      alpha: 0.35,
      duration: TWEEN_BOUNCE_DURATION,
    });
  }

  /** Deselect — snap back to base. */
  deselect(): void {
    this._selected = false;
    this.scene.tweens.add({
      targets: this.sprite,
      y: this.baseY,
      scaleX: this.scale,
      scaleY: this.scale,
      duration: TWEEN_BOUNCE_DURATION,
      ease: 'Back.easeOut',
    });
    this.scene.tweens.add({
      targets: this.shadow,
      alpha: 0.25,
      duration: TWEEN_BOUNCE_DURATION,
    });
  }

  /** Animate sliding to a new position. Returns the tween for chaining. */
  slideTo(
    x: number,
    y: number,
    duration: number,
    ease = 'Power2'
  ): Phaser.Tweens.Tween {
    this.baseY = y;

    this.scene.tweens.add({
      targets: this.shadow,
      x: x + 4,
      y: y + 6,
      duration,
      ease,
    });

    return this.scene.tweens.add({
      targets: this.sprite,
      x,
      y,
      scaleX: this.scale,
      scaleY: this.scale,
      duration,
      ease,
    });
  }

  /** Quick shake animation (used on confirm feedback). */
  shake(): void {
    this.scene.tweens.add({
      targets: [this.sprite, this.shadow],
      x: this.sprite.x + 4,
      duration: 50,
      yoyo: true,
      repeat: 3,
      ease: 'Sine.easeInOut',
    });
  }

  /** Set visibility for both sprite and shadow. */
  setVisible(visible: boolean): void {
    this.sprite.setVisible(visible);
    this.shadow.setVisible(visible);
  }

  /** Set alpha for both sprite and shadow. */
  setAlpha(alpha: number): void {
    this.sprite.setAlpha(alpha);
    this.shadow.setAlpha(alpha * 0.25);
  }

  /** Position instantly (no tween). */
  setPosition(x: number, y: number): void {
    this.baseY = y;
    this.sprite.setPosition(x, y);
    this.shadow.setPosition(x + 4, y + 6);
  }

  /** Depth ordering. */
  setDepth(depth: number): void {
    this.shadow.setDepth(depth - 1);
    this.sprite.setDepth(depth);
  }

  destroy(): void {
    this.stopIdle();
    this.stopWave();
    this.sprite.destroy();
    this.shadow.destroy();
  }
}
