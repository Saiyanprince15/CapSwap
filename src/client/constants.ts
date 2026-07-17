// ─── CapSwap: Centralized Constants ───────────────────────────────────────────
// All configurable values live here. Nothing is hardcoded in game code.

// ─── Canvas ──────────────────────────────────────────────────────────────────
export const CANVAS_WIDTH = 450;
export const CANVAS_HEIGHT = 800;

// ─── Bottles ─────────────────────────────────────────────────────────────────
/** Bottles shown on the menu / used by Daily mode. */
export const DEFAULT_BOTTLE_COUNT = 5;
export const BOTTLE_SCALE = 0.032;
export const BOTTLE_SRC_WIDTH = 1992;
export const BOTTLE_SRC_HEIGHT = 3968;
export const PLAYER_SHELF_Y = 420;
export const SECRET_SHELF_Y = 580;

/** Baseline (bottom edge) each row of bottles sits on, matched to the shelves. */
export const PLAYER_BOTTOM_Y =
  PLAYER_SHELF_Y + (BOTTLE_SRC_HEIGHT * BOTTLE_SCALE) / 2;
export const SECRET_BOTTOM_Y =
  SECRET_SHELF_Y + (BOTTLE_SRC_HEIGHT * BOTTLE_SCALE) / 2;

// ─── Responsive Bottle Layout ────────────────────────────────────────────────
export interface BottleLayout {
  /** X of the first bottle slot. */
  startX: number;
  /** Distance between slot centers. */
  spacing: number;
  /** Sprite scale for this bottle count. */
  scale: number;
  /** Bottle center Y on the player shelf. */
  playerY: number;
  /** Bottle center Y on the secret shelf. */
  secretY: number;
}

/**
 * Compute a centered, evenly-spaced layout for any bottle count.
 * Bottles shrink as the row gets denser so they never overlap,
 * and always sit flush on their shelf.
 */
export function getBottleLayout(count: number): BottleLayout {
  const edge = count <= 5 ? 80 : 60;
  const spacing =
    count <= 1 ? 0 : Math.min(80, (CANVAS_WIDTH - edge * 2) / (count - 1));
  const scale = Math.min(
    BOTTLE_SCALE,
    (spacing * 0.88) / BOTTLE_SRC_WIDTH
  );
  const span = spacing * (count - 1);
  const startX = (CANVAS_WIDTH - span) / 2;
  const halfHeight = (BOTTLE_SRC_HEIGHT * scale) / 2;
  return {
    startX,
    spacing,
    scale,
    playerY: PLAYER_BOTTOM_Y - halfHeight,
    secretY: SECRET_BOTTOM_Y - halfHeight,
  };
}

// ─── Difficulty ──────────────────────────────────────────────────────────────
export type DifficultyId = 'easy' | 'medium' | 'hard' | 'daily';

export interface DifficultyConfig {
  id: DifficultyId;
  label: string;
  tagline: string;
  bottleCount: number;
  tries: number;
}

export const DIFFICULTIES: Record<DifficultyId, DifficultyConfig> = {
  easy: {
    id: 'easy',
    label: 'Easy',
    tagline: 'A gentle warm-up',
    bottleCount: 4,
    tries: 14,
  },
  medium: {
    id: 'medium',
    label: 'Medium',
    tagline: 'The classic challenge',
    bottleCount: 6,
    tries: 10,
  },
  hard: {
    id: 'hard',
    label: 'Hard',
    tagline: 'For master sorters',
    bottleCount: 8,
    tries: 8,
  },
  daily: {
    id: 'daily',
    label: 'Daily Puzzle',
    tagline: 'Same puzzle for everyone today',
    bottleCount: 5,
    tries: 12,
  },
};

export const DEFAULT_DIFFICULTY: DifficultyId = 'daily';

// ─── Shelf ───────────────────────────────────────────────────────────────────
export const SHELF_Y = 480;
export const SHELF_HEIGHT = 14;

// ─── Frosted Glass Cover ─────────────────────────────────────────────────────
export const GLASS_WIDTH = CANVAS_WIDTH;
export const GLASS_HEIGHT = 180;
export const GLASS_CENTER_Y = SECRET_SHELF_Y - 20;

// ─── Drag / Select ───────────────────────────────────────────────────────────
export const DRAG_SCALE = 1.15;
export const DRAG_ANGLE = 8;
export const DRAG_DISTANCE_THRESHOLD = 10;
export const SELECT_SCALE = 1.1;
export const SELECT_BOUNCE_Y = -12;

// ─── Menu Wave Animation ─────────────────────────────────────────────────────
export const MENU_WAVE_INTERVAL = 2400; // full loop period (ms)
export const MENU_WAVE_STEP = 110; // per-bottle stagger (ms)
export const MENU_WAVE_HEIGHT = 9; // subtle rise (px)
export const MENU_WAVE_DURATION = 460; // up (then yoyo down) (ms)

// ─── Secret Shuffle (behind frosted glass) ───────────────────────────────────
export const SECRET_SHUFFLE_COUNT = 6;
export const SECRET_SHUFFLE_SPEED = 300;

// ─── Animation Durations (ms) ────────────────────────────────────────────────
// Deliberately slower than typical: smooth, readable, satisfying.
export const TWEEN_SWAP_DURATION = 500;
export const TWEEN_SNAP_DURATION = 260;
export const TWEEN_BOUNCE_DURATION = 260;
export const TWEEN_REVEAL_DURATION = 850;
export const TWEEN_SLIDE_IN_DURATION = 650;
export const TWEEN_GLASS_DURATION = 900;
export const TWEEN_IDLE_DURATION = 2000;
export const TWEEN_SHAKE_DURATION = 300;
export const TWEEN_CONFETTI_DURATION = 2600;
export const SCENE_TRANSITION_DELAY = 600;
export const REVEAL_PAUSE = 400; // beat between glass gone and reveal

// ─── Parallax ────────────────────────────────────────────────────────────────
export const PARALLAX_SPEED = 0.15;

// ─── Colors ──────────────────────────────────────────────────────────────────
export enum BottleColor {
  ORANGE = 1,
  BLUE = 2,
  GREEN = 3,
  PURPLE = 4,
  RED = 5,
  CYAN = 6,
  PINK = 7,
  YELLOW = 8,
}

export const MAX_BOTTLE_COLORS = 8;

export const BOTTLE_COLOR_NAMES: Record<BottleColor, string> = {
  [BottleColor.ORANGE]: 'Orange',
  [BottleColor.BLUE]: 'Blue',
  [BottleColor.GREEN]: 'Green',
  [BottleColor.PURPLE]: 'Purple',
  [BottleColor.RED]: 'Red',
  [BottleColor.CYAN]: 'Cyan',
  [BottleColor.PINK]: 'Pink',
  [BottleColor.YELLOW]: 'Yellow',
};

// ─── Asset Keys ──────────────────────────────────────────────────────────────
export const ASSET_KEYS = {
  BOTTLE_1: 'bottle-1',
  BOTTLE_2: 'bottle-2',
  BOTTLE_3: 'bottle-3',
  BOTTLE_4: 'bottle-4',
  BOTTLE_5: 'bottle-5',
  BOTTLE_6: 'bottle-6',
  BOTTLE_7: 'bottle-7',
  BOTTLE_8: 'bottle-8',
  BOTTLE_HIDDEN: 'bottle-hidden',
  BACKGROUND: 'background',
  BG_CYBERPUNK: 'bg-cyberpunk',
  BG_VOLCANO: 'bg-volcano',
  FROSTED_GLASS: 'frosted-glass',
  CONFETTI: 'confetti-pixel',
} as const;

export const BOTTLE_ASSET_MAP: Record<BottleColor, string> = {
  [BottleColor.ORANGE]: ASSET_KEYS.BOTTLE_1,
  [BottleColor.BLUE]: ASSET_KEYS.BOTTLE_2,
  [BottleColor.GREEN]: ASSET_KEYS.BOTTLE_3,
  [BottleColor.PURPLE]: ASSET_KEYS.BOTTLE_4,
  [BottleColor.RED]: ASSET_KEYS.BOTTLE_5,
  [BottleColor.CYAN]: ASSET_KEYS.BOTTLE_6,
  [BottleColor.PINK]: ASSET_KEYS.BOTTLE_7,
  [BottleColor.YELLOW]: ASSET_KEYS.BOTTLE_8,
};

// ─── Asset Paths (served from publicDir = Assets/) ───────────────────────────
export const ASSET_PATHS = {
  BOTTLE_1: 'Bottles/Bottle 1.png',
  BOTTLE_2: 'Bottles/Bottle 2.png',
  BOTTLE_3: 'Bottles/Bottle 3.png',
  BOTTLE_4: 'Bottles/Bottle 4.png',
  BOTTLE_5: 'Bottles/Bottle 5.png',
  BOTTLE_6: 'Bottles/Bottle 6.png',
  BOTTLE_7: 'Bottles/Bottle 7.png',
  BOTTLE_8: 'Bottles/Bottle 8.png',
  BOTTLE_HIDDEN: 'Bottles/Bottle Hidden.png',
  BACKGROUND: 'Background/Pixel Forest.png',
  BG_CYBERPUNK: 'Background/Cyberpunk City.png',
  BG_VOLCANO: 'Background/Volcano.png',
  FONT: 'Font/Ithaca-LVB75.ttf',
} as const;

// ─── UI Theme ────────────────────────────────────────────────────────────────
export const UI_COLORS = {
  BG_DARK: '#1a1a2e',
  SHELF_BROWN: '#5c3d2e',
  SHELF_LIGHT: '#8b6914',
  GLASS_ALPHA: 0.92,
  TEXT_CYAN: '#5ce1e6',
  TEXT_YELLOW: '#f0c040',
  TEXT_PINK: '#e07080',
  TEXT_WHITE: '#ffffff',
  BUTTON_BG: '#3a6060',
  BUTTON_BORDER: '#5ce1e6',
  CONFETTI: [
    0xff6b35, 0x5ce1e6, 0x44dd44, 0xaa55ff, 0xff4444, 0xf0c040, 0xff8ac2,
    0xffffff,
  ],
} as const;

export const FONT_FAMILY = 'Ithaca';

// ─── Per-Difficulty Background Maps ──────────────────────────────────────────
/** Phaser asset key for each difficulty's gameplay background. */
export const DIFFICULTY_BG: Record<DifficultyId, string> = {
  easy: ASSET_KEYS.BACKGROUND,
  medium: ASSET_KEYS.BG_CYBERPUNK,
  hard: ASSET_KEYS.BG_VOLCANO,
  daily: ASSET_KEYS.BACKGROUND,
};

/** Image URL path for each difficulty's button background preview. */
export const DIFFICULTY_BG_PATH: Record<DifficultyId, string> = {
  easy: ASSET_PATHS.BACKGROUND,
  medium: ASSET_PATHS.BG_CYBERPUNK,
  hard: ASSET_PATHS.BG_VOLCANO,
  daily: ASSET_PATHS.BACKGROUND,
};
