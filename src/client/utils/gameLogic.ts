// ─── CapSwap: Pure Puzzle Logic ───────────────────────────────────────────────
// 100% decoupled from Phaser. Fully unit-testable.
// Supports variable bottle counts (difficulty) and seeded generation (daily).

import { MAX_BOTTLE_COLORS } from '../constants';

/** A sequence of bottle-color IDs (1..MAX_BOTTLE_COLORS). */
export type Sequence = number[];

/** Uniform random in [0, 1). Defaults to Math.random; daily mode injects a seeded RNG. */
export type Rng = () => number;

// ─── Seeded RNG (Daily Puzzle) ───────────────────────────────────────────────

/** xmur3 string hash → 32-bit seed. */
export function hashString(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  h ^= h >>> 16;
  return h >>> 0;
}

/** mulberry32 — small, fast, deterministic PRNG. */
export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Today's puzzle key, in UTC so every player worldwide
 * gets the same puzzle on the same calendar day.
 */
export function dailyPuzzleKey(date: Date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Seeded RNG for today's daily puzzle. */
export function createDailyRng(date: Date = new Date()): Rng {
  return createRng(hashString(`capswap-daily-${dailyPuzzleKey(date)}`));
}

// ─── Core Puzzle Logic ───────────────────────────────────────────────────────

/** Fisher-Yates shuffle (in-place, returns same array). */
function shuffle<T>(arr: T[], rng: Rng): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

/** The color pool for a given bottle count: colors 1..count. */
function colorPool(count: number): number[] {
  const clamped = Math.max(2, Math.min(count, MAX_BOTTLE_COLORS));
  return Array.from({ length: clamped }, (_, i) => i + 1);
}

/** Returns true if no element at index i matches between a and b. */
function isDerangement(a: readonly number[], b: readonly number[]): boolean {
  for (let i = 0; i < a.length; i++) {
    if (a[i] === b[i]) return false;
  }
  return true;
}

/** Generate a random solution sequence for the given bottle count. */
export function generateSolution(
  count: number,
  rng: Rng = Math.random
): Sequence {
  return shuffle(colorPool(count), rng);
}

/**
 * Generate an initial arrangement that is a complete derangement
 * of the given solution — 0 correct positions guaranteed.
 * Reshuffles until the condition is met.
 */
export function generateInitialArrangement(
  solution: Sequence,
  rng: Rng = Math.random
): Sequence {
  let arrangement: number[];
  do {
    arrangement = shuffle(colorPool(solution.length), rng);
  } while (!isDerangement(arrangement, solution));
  return arrangement;
}

/** Count how many positions match between current and solution. */
export function getCorrectCount(
  current: readonly number[],
  solution: readonly number[]
): number {
  let count = 0;
  const len = Math.min(current.length, solution.length);
  for (let i = 0; i < len; i++) {
    if (current[i] === solution[i]) count++;
  }
  return count;
}

/** Swap two indices in a mutable array and return it. */
export function swapBottles(arr: number[], i: number, j: number): number[] {
  [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  return arr;
}
