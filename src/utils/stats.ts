import type { GameConfig, GameLength, QuizMode, RegionFilter, RoundResult } from '../types/game';

export interface CategoryBest {
  mode: QuizMode;
  region: RegionFilter;
  length: GameLength;
  bestPct: number;
  bestScore: number;
  maxPossible: number;
  bestFlagPct: number;
  bestCapitalPct: number;
  bestStreak: number;
  gamesPlayed: number;
  lastPlayedAt: number;
}

export interface StatsStore {
  totalGames: number;
  totalCountriesAnswered: number;
  overallBestStreak: number;
  categories: Record<string, CategoryBest>;
}

const STORAGE_KEY = 'flag-guessr-stats-v2';

export function makeCategoryKey(
  mode: QuizMode,
  region: RegionFilter,
  length: GameLength
): string {
  return `${mode}|${region}|${String(length)}`;
}

export function emptyStatsStore(): StatsStore {
  return {
    totalGames: 0,
    totalCountriesAnswered: 0,
    overallBestStreak: 0,
    categories: {},
  };
}

export function loadStatsStore(): StatsStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StatsStore>;
      return {
        totalGames: Number(parsed.totalGames) || 0,
        totalCountriesAnswered: Number(parsed.totalCountriesAnswered) || 0,
        overallBestStreak: Number(parsed.overallBestStreak) || 0,
        categories: parsed.categories && typeof parsed.categories === 'object' ? parsed.categories : {},
      };
    }
  } catch {
    // ignore storage errors
  }
  return emptyStatsStore();
}

export function saveStatsStore(store: StatsStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // ignore storage errors
  }
}

export function recordGameResult(
  prev: StatsStore,
  config: GameConfig,
  results: RoundResult[],
  maxStreak: number,
  isCustomRetry = false
): StatsStore {
  const total = results.length;
  if (total === 0) return prev;

  const flagCorrect = results.filter((r) => r.flagCorrect).length;
  const capitalCorrect = results.filter((r) => r.capitalCorrect).length;
  const score = flagCorrect + capitalCorrect;
  const maxPossible = total * 2;
  const pct = Math.round((score / maxPossible) * 100);
  const flagPct = Math.round((flagCorrect / total) * 100);
  const capitalPct = Math.round((capitalCorrect / total) * 100);

  const next: StatsStore = {
    totalGames: prev.totalGames + 1,
    totalCountriesAnswered: prev.totalCountriesAnswered + total,
    overallBestStreak: Math.max(prev.overallBestStreak, maxStreak),
    categories: { ...prev.categories },
  };

  // Don't overwrite standard category bests with a partial "Retry Missed" deck
  if (!isCustomRetry) {
    const key = makeCategoryKey(config.mode, config.region, config.length);
    const existing = next.categories[key];
    if (!existing) {
      next.categories[key] = {
        mode: config.mode,
        region: config.region,
        length: config.length,
        bestPct: pct,
        bestScore: score,
        maxPossible,
        bestFlagPct: flagPct,
        bestCapitalPct: capitalPct,
        bestStreak: maxStreak,
        gamesPlayed: 1,
        lastPlayedAt: Date.now(),
      };
    } else {
      const isNewBest = pct > existing.bestPct || (pct === existing.bestPct && score > existing.bestScore);
      next.categories[key] = {
        ...existing,
        bestPct: isNewBest ? pct : existing.bestPct,
        bestScore: isNewBest ? score : existing.bestScore,
        maxPossible: isNewBest ? maxPossible : existing.maxPossible,
        bestFlagPct: Math.max(existing.bestFlagPct, flagPct),
        bestCapitalPct: Math.max(existing.bestCapitalPct, capitalPct),
        bestStreak: Math.max(existing.bestStreak, maxStreak),
        gamesPlayed: existing.gamesPlayed + 1,
        lastPlayedAt: Date.now(),
      };
    }
  }

  return next;
}

export function getCategoryBest(
  store: StatsStore,
  mode: QuizMode,
  region: RegionFilter,
  length: GameLength
): CategoryBest | undefined {
  return store.categories[makeCategoryKey(mode, region, length)];
}

export function getBestForRegion(
  store: StatsStore,
  mode: QuizMode,
  region: RegionFilter
): { bestPct: number; gamesPlayed: number; bestStreak: number } | null {
  let bestPct = -1;
  let gamesPlayed = 0;
  let bestStreak = 0;
  for (const cat of Object.values(store.categories)) {
    if (cat.mode === mode && cat.region === region) {
      gamesPlayed += cat.gamesPlayed;
      if (cat.bestPct > bestPct) bestPct = cat.bestPct;
      if (cat.bestStreak > bestStreak) bestStreak = cat.bestStreak;
    }
  }
  if (gamesPlayed === 0) return null;
  return { bestPct, gamesPlayed, bestStreak };
}
