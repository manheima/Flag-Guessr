import { AFRICA_CAPITALS } from './capitals/africa';
import { ASIA_CAPITALS } from './capitals/asia';
import { EUROPE_CAPITALS } from './capitals/europe';
import { AMERICAS_OCEANIA_CAPITALS } from './capitals/americasOceania';
import type { CapitalDetail } from '../types/game';

export const CAPITAL_DETAILS: Record<string, CapitalDetail> = {
  ...AFRICA_CAPITALS,
  ...ASIA_CAPITALS,
  ...EUROPE_CAPITALS,
  ...AMERICAS_OCEANIA_CAPITALS,
};

export function getCapitalDetail(code: string): CapitalDetail | undefined {
  return CAPITAL_DETAILS[code.toLowerCase()];
}

export function getCapitalImageUrl(code: string): string {
  return `/capitals/${code.toLowerCase()}.jpg`;
}
