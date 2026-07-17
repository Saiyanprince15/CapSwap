// ─── CapSwap: Streak Manager ──────────────────────────────────────────────────
// Persists win streaks to localStorage. Pure utility, no Phaser dependency.

const CURRENT_KEY = 'capswap_current_streak';
const BEST_KEY = 'capswap_best_streak';

export function getCurrentStreak(): number {
  return parseInt(localStorage.getItem(CURRENT_KEY) || '0', 10);
}

export function getBestStreak(): number {
  return parseInt(localStorage.getItem(BEST_KEY) || '0', 10);
}

export function recordWin(): { current: number; best: number } {
  const current = getCurrentStreak() + 1;
  const best = Math.max(current, getBestStreak());
  localStorage.setItem(CURRENT_KEY, String(current));
  localStorage.setItem(BEST_KEY, String(best));
  return { current, best };
}

export function recordLoss(): { current: number; best: number } {
  localStorage.setItem(CURRENT_KEY, '0');
  return { current: 0, best: getBestStreak() };
}
