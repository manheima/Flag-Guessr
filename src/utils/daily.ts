import { COUNTRIES } from '../data/countries';
import type { Country, QuestionFormat, RoundResult } from '../types/game';

export interface DailyLeaderboardRow {
  rank: number;
  id: number;
  playerName: string;
  isCustomName: boolean;
  score: number;
  flagScore: number;
  capitalScore: number;
  elapsedMs: number;
}

export interface DailyStats {
  dateKey: string;
  totalPlayers: number;
  averageScore: number;
  averageFlagPct: number;
  averageCapitalPct: number;
  scoreDistribution: number[]; // length 11 (scores 0..10)
  rank: number | null;
  percentile: number | null;
  targetScore: number | null;
  top5: DailyLeaderboardRow[];
}

export interface DailyEntry {
  id: number;
  dateKey: string;
  seqNum: number;
  playerName: string;
  defaultName: string;
  isCustomName: boolean;
  editToken: string;
  score: number;
  flagScore: number;
  capitalScore: number;
  elapsedMs: number;
}

export interface SavedTodayDaily {
  dateKey: string;
  entry: DailyEntry;
  results: RoundResult[];
}

const DAILY_CACHE_KEY = 'flag-guessr-daily-today-v1';

export function getTodayDateKey(): string {
  return new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local timezone
}

export function formatDateShort(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  if (!y || !m || !d) return dateKey;
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatElapsed(ms: number): string {
  const secs = Math.max(0.1, ms / 1000);
  if (secs < 60) return `${secs.toFixed(1)}s`;
  const mins = Math.floor(secs / 60);
  const rem = Math.round(secs % 60)
    .toString()
    .padStart(2, '0');
  return `${mins}m ${rem}s`;
}

// Deterministic FNV-1a string hash -> Mulberry32 PRNG
function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
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
 * Deterministically picks the exact same 5 countries and 5 question formats
 * for everyone playing on `dateKey`.
 */
export function buildDailyDeck(dateKey: string): {
  countries: Country[];
  formats: QuestionFormat[];
} {
  const rng = mulberry32(hashSeed(`flag-guessr-daily::${dateKey}`));

  const pool = [...COUNTRIES];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  // Pick 5 countries, preferring distinct continents for variety!
  const chosen: Country[] = [];
  const usedContinents = new Set<string>();
  for (const c of pool) {
    if (chosen.length >= 5) break;
    if (!usedContinents.has(c.continent)) {
      chosen.push(c);
      usedContinents.add(c.continent);
    }
  }
  for (const c of pool) {
    if (chosen.length >= 5) break;
    if (!chosen.includes(c)) chosen.push(c);
  }

  // Deterministic mix of 3 flag-to-name & 2 name-to-flag (shuffled per day)
  const formats: QuestionFormat[] = [
    'flag-to-name',
    'name-to-flag',
    'flag-to-name',
    'name-to-flag',
    rng() < 0.5 ? 'flag-to-name' : 'name-to-flag',
  ];
  for (let i = formats.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [formats[i], formats[j]] = [formats[j], formats[i]];
  }

  return { countries: chosen, formats };
}

export function loadSavedTodayDaily(dateKey: string): SavedTodayDaily | null {
  try {
    const raw = localStorage.getItem(DAILY_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedTodayDaily;
    if (parsed.dateKey === dateKey && parsed.entry) {
      return parsed;
    }
  } catch {
    // ignore
  }
  return null;
}

export function saveTodayDaily(record: SavedTodayDaily): void {
  try {
    localStorage.setItem(DAILY_CACHE_KEY, JSON.stringify(record));
  } catch {
    // ignore
  }
}

export async function fetchDailyOverview(
  dateKey: string,
  entryId?: number
): Promise<DailyStats> {
  const params = new URLSearchParams({ date: dateKey });
  if (entryId !== undefined) {
    params.set('entryId', String(entryId));
  }
  const res = await fetch(`/api/daily/today?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to load daily stats');
  return res.json();
}

export async function submitDailyScore(payload: {
  dateKey: string;
  flagScore: number;
  capitalScore: number;
  elapsedMs: number;
  playerName?: string;
}): Promise<{ entry: DailyEntry; stats: DailyStats }> {
  const res = await fetch('/api/daily/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to submit daily score');
  return res.json();
}

export async function updateDailyPlayerName(
  entryId: number,
  editToken: string,
  playerName: string
): Promise<{ entry: DailyEntry; stats: DailyStats }> {
  const res = await fetch(`/api/daily/entry/${entryId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ editToken, playerName }),
  });
  if (!res.ok) throw new Error('Failed to save player name');
  return res.json();
}
