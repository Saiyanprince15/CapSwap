// ─── CapSwap: Game Scene ──────────────────────────────────────────────────────
// Visualizes FSM state. All game logic is in gameLogic.ts / gameState.ts.
// Uses Phaser Tweens and Timelines — no nested setTimeout.

import Phaser from 'phaser';
import { Bottle } from '../classes/Bottle';
import { GameBridge } from '../GameContainer';
import { GameStateMachine, GameState } from '../../utils/gameState';
import {
  generateSolution,
  generateInitialArrangement,
  getCorrectCount,
  swapBottles,
  createDailyRng,
  Sequence,
  Rng,
} from '../../utils/gameLogic';
import {
  getCurrentStreak,
  getBestStreak,
  recordWin,
  recordLoss,
} from '../../utils/streakManager';
import { AudioManager } from '../../managers/AudioManager';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  DEFAULT_BOTTLE_COUNT,
  DEFAULT_DIFFICULTY,
  DIFFICULTIES,
  DifficultyId,
  getBottleLayout,
  BottleLayout,
  SHELF_Y,
  SHELF_HEIGHT,
  GLASS_CENTER_Y,
  TWEEN_SWAP_DURATION,
  TWEEN_SNAP_DURATION,
  TWEEN_SLIDE_IN_DURATION,
  TWEEN_GLASS_DURATION,
  TWEEN_REVEAL_DURATION,
  TWEEN_CONFETTI_DURATION,
  SCENE_TRANSITION_DELAY,
  REVEAL_PAUSE,
  PARALLAX_SPEED,
  DRAG_SCALE,
  DRAG_ANGLE,
  DRAG_DISTANCE_THRESHOLD,
  MENU_WAVE_INTERVAL,
  MENU_WAVE_STEP,
  MENU_WAVE_HEIGHT,
  MENU_WAVE_DURATION,
  SECRET_SHUFFLE_COUNT,
  SECRET_SHUFFLE_SPEED,
  ASSET_KEYS,
  UI_COLORS,
  DIFFICULTY_BG,
} from '../../constants';

export class GameScene extends Phaser.Scene {
  private bridge: GameBridge;
  private fsm!: GameStateMachine;
  private audio!: AudioManager;

  // Difficulty / puzzle state (decoupled)
  private difficulty: DifficultyId = DEFAULT_DIFFICULTY;
  private bottleCount = DEFAULT_BOTTLE_COUNT;
  private maxTries = DIFFICULTIES[DEFAULT_DIFFICULTY].tries;
  private layout: BottleLayout = getBottleLayout(DEFAULT_BOTTLE_COUNT);
  private solution: Sequence = [1, 2, 3, 4, 5];
  private playerArrangement: number[] = [1, 2, 3, 4, 5];
  private triesLeft = DIFFICULTIES[DEFAULT_DIFFICULTY].tries;
  private correctCount = 0;

  // Visual objects
  private playerBottles: Bottle[] = [];
  private secretBottles: Bottle[] = [];
  private selectedIndex: number | null = null;
  private bg!: Phaser.GameObjects.Image;
  private glassCover!: Phaser.GameObjects.Image;
  // Silhouette sprites under the glass — real secret bottles stay hidden (alpha 0)
  private secretMasks: Phaser.GameObjects.Image[] = [];
  private inputLocked = false;

  // Drag state
  private dragBottle: Bottle | null = null;
  private dragOriginX = 0;
  private isDragging = false;

  // Menu animation
  private menuWaveTimer: Phaser.Time.TimerEvent | null = null;

  constructor(bridge: GameBridge) {
    super({ key: 'GameScene' });
    this.bridge = bridge;
  }

  create(): void {
    this.fsm = new GameStateMachine();
    this.audio = new AudioManager();

    this.setupBackground();
    this.setupShelves();
    this.setupGlassCover();
    this.buildBottles(DEFAULT_BOTTLE_COUNT);
    this.setupDragAndDrop();
    this.setupFSMListeners();
    this.bindBridge();

    // Hide secret bottles initially
    this.secretBottles.forEach((b) => b.setAlpha(0));

    // Relaxing wave animation across all menu bottles
    this.startMenuWave();

    // Menu music begins on the first user gesture (browser autoplay rules)
    this.audio.playMusic('menu');

    // Notify React we're on MENU + send initial streaks
    this.bridge.onStateChange?.(GameState.MENU);
    this.bridge.onStreakChange?.(getCurrentStreak(), getBestStreak());
    this.emitGameConfig();
  }

  // ─── Setup Methods ──────────────────────────────────────────────────────────

  private setupBackground(): void {
    this.bg = this.add
      .image(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, ASSET_KEYS.BACKGROUND)
      .setDisplaySize(CANVAS_WIDTH, CANVAS_HEIGHT)
      .setDepth(0)
      .setAlpha(0.6);
  }

  private setupShelves(): void {
    this.add
      .rectangle(CANVAS_WIDTH / 2, SHELF_Y, CANVAS_WIDTH, SHELF_HEIGHT, 0x8b6914)
      .setDepth(5);
    this.add
      .rectangle(CANVAS_WIDTH / 2, SHELF_Y - 2, CANVAS_WIDTH, 3, 0xc49a2a)
      .setDepth(6);
    this.add
      .rectangle(
        CANVAS_WIDTH / 2,
        SHELF_Y + 150,
        CANVAS_WIDTH,
        SHELF_HEIGHT,
        0x5c3d2e
      )
      .setDepth(5);
  }

  private setupGlassCover(): void {
    // Baked frosted-glass texture (gradient, grain, streaks, arcade frame).
    // Sits above the grey silhouette masks so hidden bottles read as
    // dim shapes behind frost — never as colors.
    this.glassCover = this.add
      .image(CANVAS_WIDTH / 2, GLASS_CENTER_Y, ASSET_KEYS.FROSTED_GLASS)
      .setAlpha(UI_COLORS.GLASS_ALPHA)
      .setDepth(15);
  }

  /** (Re)build both bottle rows for the given count, with responsive layout. */
  private buildBottles(count: number): void {
    this.playerBottles.forEach((b) => b.destroy());
    this.secretBottles.forEach((b) => b.destroy());
    this.secretMasks.forEach((m) => m.destroy());
    this.playerBottles = [];
    this.secretBottles = [];
    this.secretMasks = [];

    this.layout = getBottleLayout(count);
    const { startX, spacing, scale, playerY, secretY } = this.layout;

    for (let i = 0; i < count; i++) {
      const x = startX + i * spacing;

      const pb = new Bottle(this, x, playerY, i + 1, i, scale);
      pb.setDepth(10);
      this.wireBottleInput(pb);
      this.playerBottles.push(pb);

      const sb = new Bottle(this, x, secretY, i + 1, i, scale);
      sb.setDepth(10);
      sb.setAlpha(0);
      this.secretBottles.push(sb);
    }
  }

  private slotX(index: number): number {
    return this.layout.startX + index * this.layout.spacing;
  }

  // ─── Input: Tap-to-Swap ─────────────────────────────────────────────────────

  private wireBottleInput(bottle: Bottle): void {
    this.input.setDraggable(bottle.sprite);

    bottle.sprite.on('pointerup', () => {
      if (this.inputLocked) return;
      if (this.fsm.state !== GameState.PLAYING) return;
      // If a drag just finished, skip tap logic
      if (this.isDragging) {
        this.isDragging = false;
        return;
      }

      this.audio.playSelect();
      const currentSlot = bottle.slotIndex;

      if (this.selectedIndex === null) {
        this.selectedIndex = currentSlot;
        bottle.select();
      } else if (this.selectedIndex === currentSlot) {
        bottle.deselect();
        this.selectedIndex = null;
      } else {
        // Deselect previously selected bottle
        const prevBottle = this.playerBottles[this.selectedIndex]!;
        prevBottle.deselect();
        this.performSwap(this.selectedIndex, currentSlot);
      }
    });
  }

  // ─── Input: Drag-and-Drop ───────────────────────────────────────────────────

  private setupDragAndDrop(): void {
    this.input.dragDistanceThreshold = DRAG_DISTANCE_THRESHOLD;

    this.input.on(
      'dragstart',
      (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.Image) => {
        if (this.inputLocked) return;
        if (this.fsm.state !== GameState.PLAYING) return;

        const bottle = this.playerBottles.find((b) => b.sprite === gameObject);
        if (!bottle) return;

        // Deselect any tap-selected bottle
        if (this.selectedIndex !== null) {
          this.playerBottles[this.selectedIndex]!.deselect();
          this.selectedIndex = null;
        }

        this.isDragging = true;
        this.dragBottle = bottle;
        this.dragOriginX = bottle.x;

        bottle.stopIdle();
        bottle.setDepth(20);

        // Scale up + tilt
        this.tweens.add({
          targets: bottle.sprite,
          scaleX: bottle.scale * DRAG_SCALE,
          scaleY: bottle.scale * DRAG_SCALE,
          angle: DRAG_ANGLE,
          duration: 150,
          ease: 'Back.easeOut',
        });

        this.audio.playSelect();
      }
    );

    this.input.on(
      'drag',
      (
        _pointer: Phaser.Input.Pointer,
        gameObject: Phaser.GameObjects.Image,
        dragX: number,
        dragY: number
      ) => {
        if (!this.dragBottle || this.inputLocked) return;
        gameObject.setPosition(dragX, dragY);
        this.dragBottle.shadow.setPosition(dragX + 4, dragY + 6);
      }
    );

    this.input.on('dragend', () => {
      if (!this.dragBottle || this.inputLocked) return;

      const droppedBottle = this.dragBottle;
      const dropX = droppedBottle.x;
      this.dragBottle = null;

      // Reset scale + angle
      this.tweens.add({
        targets: droppedBottle.sprite,
        scaleX: droppedBottle.scale,
        scaleY: droppedBottle.scale,
        angle: 0,
        duration: 150,
      });

      // Find nearest slot
      let nearestSlot = droppedBottle.slotIndex;
      let nearestDist = Infinity;

      for (let i = 0; i < this.bottleCount; i++) {
        const dist = Math.abs(dropX - this.slotX(i));
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestSlot = i;
        }
      }

      const { playerY, spacing } = this.layout;

      // If dropped on a different slot and close enough, swap
      if (
        nearestSlot !== droppedBottle.slotIndex &&
        nearestDist < spacing * 0.7
      ) {
        // Snap back to origin FIRST so performSwap reads correct positions
        droppedBottle.setPosition(this.dragOriginX, playerY);
        droppedBottle.setDepth(10);
        this.performSwap(droppedBottle.slotIndex, nearestSlot);
      } else {
        // Snap back to original position
        droppedBottle.slideTo(
          this.dragOriginX,
          playerY,
          TWEEN_SNAP_DURATION,
          'Back.easeOut'
        );
        droppedBottle.setDepth(10);
        this.time.delayedCall(TWEEN_SNAP_DURATION + 50, () =>
          droppedBottle.startIdle(0)
        );
      }

      // Mark dragging done after a tick so pointerup doesn't fire tap logic
      this.time.delayedCall(50, () => {
        this.isDragging = false;
      });
    });
  }

  // ─── Menu Animation: Rolling Wave ───────────────────────────────────────────

  /**
   * Every bottle participates in a gentle, sequential wave:
   * bottle 1 rises, then 2, then 3... looping forever. Subtle and relaxing.
   */
  private startMenuWave(): void {
    this.stopMenuWave();

    const runWave = () => {
      if (this.fsm.state !== GameState.MENU) return;
      this.playerBottles.forEach((b, i) => {
        b.waveBounce(i * MENU_WAVE_STEP, MENU_WAVE_HEIGHT, MENU_WAVE_DURATION);
      });
    };

    runWave();
    this.menuWaveTimer = this.time.addEvent({
      delay: MENU_WAVE_INTERVAL,
      loop: true,
      callback: runWave,
    });
  }

  private stopMenuWave(): void {
    this.menuWaveTimer?.destroy();
    this.menuWaveTimer = null;
    this.playerBottles.forEach((b) => b.stopWave());
  }

  // ─── FSM & Bridge ──────────────────────────────────────────────────────────

  private setupFSMListeners(): void {
    this.fsm.onChange((newState, _oldState) => {
      this.bridge.onStateChange?.(newState);
    });
  }

  private emitGameConfig(): void {
    this.bridge.onGameConfig?.(
      this.difficulty,
      this.bottleCount,
      this.maxTries
    );
  }

  private bindBridge(): void {
    this.bridge.play = (difficulty?: DifficultyId) => {
      if (
        this.fsm.state === GameState.MENU ||
        this.fsm.state === GameState.VICTORY ||
        this.fsm.state === GameState.GAME_OVER
      ) {
        this.audio.playClick();
        this.startNewGame(difficulty ?? this.difficulty);
      }
    };

    this.bridge.confirm = () => {
      if (this.fsm.state === GameState.PLAYING) {
        this.handleConfirm();
      }
    };

    this.bridge.toggleMute = () => {
      return this.audio.toggleMute();
    };

    this.bridge.sfx = (name) => {
      if (name === 'hover') this.audio.playHover();
      else if (name === 'click') this.audio.playClick();
    };

    this.bridge.exit = () => {
      if (
        this.fsm.state === GameState.PLAYING ||
        this.fsm.state === GameState.PAUSED ||
        this.fsm.state === GameState.VICTORY ||
        this.fsm.state === GameState.GAME_OVER
      ) {
        this.fsm.reset();
        this.resetToMenu();
      }
    };

    this.bridge.resume = () => {
      this.fsm.resume();
    };
  }

  // ─── Game Flow ──────────────────────────────────────────────────────────────

  private resetToMenu(): void {
    this.inputLocked = false;
    this.selectedIndex = null;
    this.tweens.killAll();

    // Menu always shows the classic 5 bottles
    this.buildBottles(DEFAULT_BOTTLE_COUNT);
    this.playerBottles.forEach((b, i) => {
      b.setColor(i + 1);
      b.setAlpha(1);
    });
    this.secretBottles.forEach((b) => b.setAlpha(0));

    // Restore the frosted glass case
    this.glassCover.setPosition(CANVAS_WIDTH / 2, GLASS_CENTER_Y);
    this.glassCover.setAlpha(UI_COLORS.GLASS_ALPHA);

    this.startMenuWave();
    this.audio.playMusic('menu');

    // Reset to default (forest) background
    this.bg.setTexture(DIFFICULTY_BG['easy']);
  }

  private startNewGame(difficulty: DifficultyId): void {
    this.stopMenuWave();

    const config = DIFFICULTIES[difficulty];
    this.difficulty = difficulty;
    this.bottleCount = config.bottleCount;
    this.maxTries = config.tries;

    // Daily mode: seeded by today's UTC date — same puzzle for everyone.
    const rng: Rng =
      difficulty === 'daily' ? createDailyRng() : Math.random;

    this.solution = generateSolution(this.bottleCount, rng);
    this.playerArrangement = [
      ...generateInitialArrangement(this.solution, rng),
    ];
    this.triesLeft = this.maxTries;
    this.correctCount = 0;
    this.selectedIndex = null;
    this.inputLocked = true;

    this.emitGameConfig();
    this.bridge.onTriesChange?.(this.triesLeft);
    this.bridge.onCorrectChange?.(this.correctCount);

    this.fsm.transition(GameState.START_ANIMATION);

    // Rebuild rows for this bottle count + assign colors
    this.buildBottles(this.bottleCount);
    this.playerBottles.forEach((b, i) => b.setColor(this.playerArrangement[i]!));
    this.secretBottles.forEach((b, i) => {
      b.setColor(this.solution[i]!);
      b.setAlpha(0); // stays hidden until the reveal
    });

    // Restore the frosted glass case
    this.glassCover.setPosition(CANVAS_WIDTH / 2, GLASS_CENTER_Y);
    this.glassCover.setAlpha(UI_COLORS.GLASS_ALPHA);

    // Switch background to match difficulty
    this.bg.setTexture(DIFFICULTY_BG[difficulty]);

    this.playStartAnimation();
  }

  private playStartAnimation(): void {
    this.audio.playMusic('game');

    const { playerY } = this.layout;

    // Move player bottles offscreen
    this.playerBottles.forEach((b, i) => {
      b.setPosition(this.slotX(i), playerY - 220);
      b.setAlpha(0);
      b.slotIndex = i;
    });

    const shuffleTotal =
      SECRET_SHUFFLE_COUNT * (SECRET_SHUFFLE_SPEED + 60) + SECRET_SHUFFLE_SPEED;

    const timeline = this.add.timeline([
      // 1. Bottles drift in from above, staggered
      {
        at: 150,
        run: () => {
          this.playerBottles.forEach((b, i) => {
            b.setAlpha(1);
            b.slideTo(
              this.slotX(i),
              playerY,
              TWEEN_SLIDE_IN_DURATION + i * 90,
              'Cubic.easeOut'
            );
          });
        },
      },
      // 2. Silhouettes appear inside the case, then shuffle behind the frost
      {
        at: TWEEN_SLIDE_IN_DURATION + 500,
        run: () => {
          this.showSecretMasks();
          this.playSecretShuffle();
        },
      },
      // 3. Transition to PLAYING after the shuffle settles
      {
        at: TWEEN_SLIDE_IN_DURATION + 500 + shuffleTotal + 500,
        run: () => {
          this.inputLocked = false;
          this.playerBottles.forEach((b, i) => b.startIdle(i * 150));
          this.fsm.transition(GameState.PLAYING);
        },
      },
    ]);

    timeline.play();
  }

  /** Visually shuffle the silhouettes behind the frosted glass. */
  private playSecretShuffle(): void {
    let shuffleStep = 0;

    const doShuffle = () => {
      if (shuffleStep >= SECRET_SHUFFLE_COUNT) return;

      const a = Phaser.Math.Between(0, this.bottleCount - 1);
      let b = Phaser.Math.Between(0, this.bottleCount - 2);
      if (b >= a) b++;

      const bottleA = this.secretBottles[a]!;
      const bottleB = this.secretBottles[b]!;

      const ax = bottleA.x;
      const bx = bottleB.x;

      const maskA = this.secretMasks[a];
      const maskB = this.secretMasks[b];

      const { secretY } = this.layout;
      bottleA.slideTo(bx, secretY, SECRET_SHUFFLE_SPEED, 'Sine.easeInOut');
      bottleB.slideTo(ax, secretY, SECRET_SHUFFLE_SPEED, 'Sine.easeInOut');

      // Also animate the silhouette masks to the same positions
      this.tweens.add({
        targets: maskA,
        x: bx,
        duration: SECRET_SHUFFLE_SPEED,
        ease: 'Sine.easeInOut',
      });
      this.tweens.add({
        targets: maskB,
        x: ax,
        duration: SECRET_SHUFFLE_SPEED,
        ease: 'Sine.easeInOut',
      });

      // Swap both bottle and mask refs
      [this.secretBottles[a], this.secretBottles[b]] = [
        this.secretBottles[b]!,
        this.secretBottles[a]!,
      ];
      [this.secretMasks[a], this.secretMasks[b]] = [
        this.secretMasks[b]!,
        this.secretMasks[a]!,
      ];

      this.audio.playShuffle();
      shuffleStep++;

      this.time.delayedCall(SECRET_SHUFFLE_SPEED + 60, doShuffle);
    };

    doShuffle();

    // After all shuffles, reset secret bottles to their ACTUAL solution positions
    this.time.delayedCall(
      SECRET_SHUFFLE_COUNT * (SECRET_SHUFFLE_SPEED + 60) + 100,
      () => {
        const { secretY } = this.layout;
        this.secretBottles.forEach((b, i) => {
          b.setColor(this.solution[i]!);
          b.slideTo(this.slotX(i), secretY, SECRET_SHUFFLE_SPEED, 'Sine.easeInOut');
          b.slotIndex = i;
        });
      }
    );
  }

  /**
   * Place a 'Bottle Hidden' silhouette sprite over each secret bottle position.
   * The real secret bottles stay alpha=0 throughout — zero color bleed.
   * Masks sit UNDER the frosted glass so they read as shapes behind frost.
   */
  private showSecretMasks(): void {
    this.secretMasks.forEach((m) => m.destroy());
    this.secretMasks = [];

    const { secretY, scale } = this.layout;
    for (let i = 0; i < this.bottleCount; i++) {
      const mask = this.add
        .image(this.slotX(i), secretY, ASSET_KEYS.BOTTLE_HIDDEN)
        .setScale(scale)
        .setDepth(14) // below glass (15)
        .setAlpha(0);
      this.tweens.add({
        targets: mask,
        alpha: 1,
        duration: 350,
        delay: i * 60,
      });
      this.secretMasks.push(mask);
    }
  }

  /**
   * Fade out grey masks, then fade in real colored secret bottles.
   * Called once the frosted glass has slid away.
   */
  private revealSecretBottles(): void {
    this.secretMasks.forEach((mask) => {
      this.tweens.add({
        targets: mask,
        alpha: 0,
        duration: 400,
        onComplete: () => mask.destroy(),
      });
    });
    this.secretMasks = [];

    // Fade in real bottles one by one + a little shake of excitement
    this.secretBottles.forEach((b, i) => {
      b.setAlpha(0);
      this.tweens.add({
        targets: b.sprite,
        alpha: 1,
        duration: 400,
        delay: i * 90,
      });
      this.time.delayedCall(i * 90 + 150, () => b.shake());
    });
  }

  private performSwap(indexA: number, indexB: number): void {
    this.inputLocked = true;
    this.audio.playSwap();

    this.selectedIndex = null;

    swapBottles(this.playerArrangement, indexA, indexB);

    const bottleA = this.playerBottles[indexA]!;
    const bottleB = this.playerBottles[indexB]!;

    const ax = bottleA.x;
    const bx = bottleB.x;
    const { playerY } = this.layout;

    bottleA.stopIdle();
    bottleB.stopIdle();
    bottleA.deselect();
    bottleB.deselect();

    bottleA.slideTo(bx, playerY, TWEEN_SWAP_DURATION, 'Back.easeInOut');
    const tweenB = bottleB.slideTo(
      ax,
      playerY,
      TWEEN_SWAP_DURATION,
      'Back.easeInOut'
    );

    [this.playerBottles[indexA], this.playerBottles[indexB]] = [
      this.playerBottles[indexB]!,
      this.playerBottles[indexA]!,
    ];
    this.playerBottles[indexA]!.slotIndex = indexA;
    this.playerBottles[indexB]!.slotIndex = indexB;

    tweenB.on('complete', () => {
      this.inputLocked = false;
      bottleA.startIdle(0);
      bottleB.startIdle(100);
    });
  }

  private handleConfirm(): void {
    this.inputLocked = true;
    this.audio.playConfirm();

    // Deselect any selected bottle
    if (this.selectedIndex !== null) {
      this.playerBottles[this.selectedIndex]!.deselect();
      this.selectedIndex = null;
    }

    this.fsm.transition(GameState.CHECKING);

    this.correctCount = getCorrectCount(this.playerArrangement, this.solution);
    this.triesLeft--;

    this.bridge.onCorrectChange?.(this.correctCount);
    this.bridge.onTriesChange?.(this.triesLeft);

    this.playerBottles.forEach((b) => b.shake());

    this.time.delayedCall(SCENE_TRANSITION_DELAY, () => {
      if (this.correctCount === this.bottleCount) {
        this.fsm.transition(GameState.WIN_REVEAL);
        this.playRevealAnimation(true);
      } else if (this.triesLeft <= 0) {
        this.fsm.transition(GameState.LOSE_REVEAL);
        this.playRevealAnimation(false);
      } else {
        this.fsm.transition(GameState.PLAYING);
        this.inputLocked = false;
      }
    });
  }

  /**
   * The reveal set-piece. Victory flow, in order:
   *   glass slides away → brief pause → hidden sequence revealed →
   *   confetti begins → victory jingle → victory screen appears.
   */
  private playRevealAnimation(isWin: boolean): void {
    // Gameplay music bows out so the jingle can land
    this.audio.stopMusic();
    this.playerBottles.forEach((b) => b.stopIdle());

    const revealTotal = 400 + this.bottleCount * 90 + 200;

    // 1. Glass case slides up and away
    this.tweens.add({
      targets: this.glassCover,
      y: GLASS_CENTER_Y - 260,
      alpha: 0,
      duration: TWEEN_GLASS_DURATION,
      ease: 'Cubic.easeInOut',
      onComplete: () => {
        // 2. A brief beat of anticipation…
        this.time.delayedCall(REVEAL_PAUSE, () => {
          // 3. …then the hidden sequence is revealed
          this.revealSecretBottles();

          this.time.delayedCall(revealTotal, () => {
            if (isWin) {
              // 4 + 5. Confetti shower + victory jingle
              this.playVictoryEffects();
              const streaks = recordWin();
              this.bridge.onStreakChange?.(streaks.current, streaks.best);
              // 6. Victory screen appears once the shower is underway
              this.time.delayedCall(TWEEN_REVEAL_DURATION, () => {
                this.fsm.transition(GameState.VICTORY);
                this.inputLocked = false;
              });
            } else {
              this.audio.playGameOver();
              const streaks = recordLoss();
              this.bridge.onStreakChange?.(streaks.current, streaks.best);
              this.time.delayedCall(TWEEN_REVEAL_DURATION, () => {
                this.fsm.transition(GameState.GAME_OVER);
                this.inputLocked = false;
              });
            }
          });
        });
      },
    });
  }

  /** Full-screen pixel confetti shower + celebratory jingle. */
  private playVictoryEffects(): void {
    this.audio.playVictoryJingle();
    this.cameras.main.shake(350, 0.008);

    // Confetti rains from the whole top edge and covers the play area.
    const emitter = this.add.particles(0, 0, ASSET_KEYS.CONFETTI, {
      emitZone: {
        type: 'random',
        source: new Phaser.Geom.Rectangle(-10, -30, CANVAS_WIDTH + 20, 20),
        quantity: 1,
      },
      speedY: { min: 120, max: 260 },
      speedX: { min: -40, max: 40 },
      gravityY: 320,
      rotate: { min: 0, max: 360 },
      scale: { min: 0.7, max: 1.4 },
      alpha: { start: 1, end: 0.85 },
      lifespan: 2800,
      quantity: 4,
      frequency: 24,
      tint: [...UI_COLORS.CONFETTI],
      emitting: true,
    });
    emitter.setDepth(30);

    this.time.delayedCall(TWEEN_CONFETTI_DURATION, () => {
      emitter.stop();
      this.time.delayedCall(3000, () => emitter.destroy());
    });
  }

  // ─── Parallax Update ────────────────────────────────────────────────────────

  override update(_time: number, _delta: number): void {
    if (this.bg) {
      this.bg.x = CANVAS_WIDTH / 2 + Math.sin(_time * 0.0003) * 5 * PARALLAX_SPEED;
      this.bg.y = CANVAS_HEIGHT / 2 + Math.cos(_time * 0.0005) * 3 * PARALLAX_SPEED;
    }
  }
}
