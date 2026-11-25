import { COUNTRIES } from '../data/countries';
import type { Country, GameConfig, QuestionFormat } from '../types/game';

export function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function normalizeText(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim();
}

export function buildGameDeck(config: GameConfig): Country[] {
  const pool =
    config.region === 'All'
      ? COUNTRIES
      : COUNTRIES.filter((c) => c.continent === config.region);

  const shuffled = shuffle(pool);
  if (config.length === 'all') {
    return shuffled;
  }
  return shuffled.slice(0, Math.min(config.length, shuffled.length));
}

export function pickQuestionFormat(mode: GameConfig['mode']): QuestionFormat {
  if (mode === 'type-in') return 'type-in';
  return Math.random() < 0.5 ? 'flag-to-name' : 'name-to-flag';
}

/**
 * Picks 4 multiple-choice country options (1 correct + 3 distractors).
 * Prefers 1-2 distractors from the same continent to make learning sharper,
 * plus 1-2 from elsewhere so it stays balanced and fair.
 */
export function buildCountryChoices(target: Country): Country[] {
  const sameContinent = shuffle(
    COUNTRIES.filter((c) => c.code !== target.code && c.continent === target.continent)
  );
  const otherContinents = shuffle(
    COUNTRIES.filter((c) => c.code !== target.code && c.continent !== target.continent)
  );

  const distractors: Country[] = [];
  if (sameContinent.length >= 2) {
    distractors.push(sameContinent[0], sameContinent[1]);
    distractors.push(otherContinents[0]);
  } else {
    distractors.push(...sameContinent, ...otherContinents.slice(0, 3 - sameContinent.length));
  }

  return shuffle([target, ...distractors.slice(0, 3)]);
}

/**
 * Picks 4 unique capital choices (1 correct + 3 plausible distractors).
 * Prefers 2 capitals from the same continent so you genuinely learn regional capitals!
 */
export function buildCapitalChoices(target: Country): string[] {
  const seen = new Set<string>([target.capital.toLowerCase()]);

  const sameContinent = shuffle(
    COUNTRIES.filter((c) => c.code !== target.code && c.continent === target.continent)
  );
  const otherContinents = shuffle(
    COUNTRIES.filter((c) => c.code !== target.code && c.continent !== target.continent)
  );

  const distractors: string[] = [];

  for (const c of sameContinent) {
    if (distractors.length >= 2) break;
    const key = c.capital.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      distractors.push(c.capital);
    }
  }

  for (const c of otherContinents) {
    if (distractors.length >= 3) break;
    const key = c.capital.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      distractors.push(c.capital);
    }
  }

  return shuffle([target.capital, ...distractors]);
}

/**
 * Smart autocomplete for Type-In mode:
 * - Typing "H" lists all countries starting with "H" (alphabetical) first!
 * - Also checks aliases (e.g. "UK" -> United Kingdom, "USA" -> United States)
 * - Secondary word-start matches (e.g. "Guinea" -> Papua New Guinea, Equatorial Guinea)
 *   appear below primary prefix matches once query is >= 2 chars.
 */
export function filterCountrySuggestions(query: string): Country[] {
  const q = normalizeText(query);
  if (!q) return [];

  const startsWithName: Country[] = [];
  const startsWithAlias: Country[] = [];
  const wordBoundaryMatch: Country[] = [];
  const includesMatch: Country[] = [];

  for (const c of COUNTRIES) {
    const normName = normalizeText(c.name);
    const normAliases = (c.aliases ?? []).map(normalizeText);

    if (normName.startsWith(q)) {
      startsWithName.push(c);
    } else if (q.length >= 2 && normAliases.some((a) => a.startsWith(q))) {
      startsWithAlias.push(c);
    } else if (q.length >= 2) {
      const words = normName.split(/[\s-]+/);
      if (words.some((w) => w.startsWith(q))) {
        wordBoundaryMatch.push(c);
      } else if (normName.includes(q) || normAliases.some((a) => a.includes(q))) {
        includesMatch.push(c);
      }
    }
  }

  const byAlpha = (a: Country, b: Country) => a.name.localeCompare(b.name);
  startsWithName.sort(byAlpha);
  startsWithAlias.sort(byAlpha);
  wordBoundaryMatch.sort(byAlpha);
  includesMatch.sort(byAlpha);

  return [...startsWithName, ...startsWithAlias, ...wordBoundaryMatch, ...includesMatch];
}

export function isMatchingCountryInput(input: string, target: Country): boolean {
  const q = normalizeText(input);
  if (!q) return false;
  if (normalizeText(target.name) === q) return true;
  return (target.aliases ?? []).some((a) => normalizeText(a) === q);
}
