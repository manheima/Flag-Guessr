export type Continent =
  | 'Africa'
  | 'Asia'
  | 'Europe'
  | 'North America'
  | 'South America'
  | 'Oceania';

export interface Country {
  code: string; // ISO 3166-1 alpha-2 lowercase (matches flag-icons)
  numericId: string; // ISO numeric 3-digit string (matches world-atlas)
  mapName?: string; // fallback match against world-atlas properties.name
  name: string;
  aliases?: string[];
  capital: string;
  continent: Continent;
  lat: number;
  lon: number;
  zoom: number; // Relative globe zoom multiplier (1.6 huge -> 5.8 microstate)
  isMicrostate?: boolean;
}

export type QuizMode = 'mixed' | 'type-in';

export type QuestionFormat = 'flag-to-name' | 'name-to-flag' | 'type-in';

export type GameLength = 10 | 20 | 30 | 'all';

export type RegionFilter = 'All' | Continent;

export type RoundPhase =
  | 'question'
  | 'question-feedback'
  | 'globe-reveal'
  | 'capital'
  | 'capital-feedback';

export interface RoundResult {
  country: Country;
  format: QuestionFormat;
  flagCorrect: boolean;
  capitalCorrect: boolean;
  userFlagAnswer: string;
  userCapitalAnswer: string;
}

export interface GameConfig {
  mode: QuizMode;
  length: GameLength;
  region: RegionFilter;
}
