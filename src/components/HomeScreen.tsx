import React from 'react';
import {
  BarChart3,
  Keyboard,
  Play,
  Shuffle,
  Trophy,
} from 'lucide-react';
import { COUNTRIES } from '../data/countries';
import { HeroGlobe } from './HeroGlobe';
import { getCategoryBest, type StatsStore } from '../utils/stats';
import type { GameConfig, GameLength, QuizMode, RegionFilter } from '../types/game';

interface HomeScreenProps {
  config: GameConfig;
  onChangeConfig: (next: GameConfig) => void;
  onStart: () => void;
  onOpenStats: () => void;
  stats: StatsStore;
}

const LENGTH_OPTIONS: { value: GameLength; label: string }[] = [
  { value: 10, label: '10' },
  { value: 20, label: '20' },
  { value: 30, label: '30' },
  { value: 'all', label: 'All' },
];

const REGIONS: { value: RegionFilter; label: string }[] = [
  { value: 'All', label: 'All World' },
  { value: 'Europe', label: 'Europe' },
  { value: 'Asia', label: 'Asia' },
  { value: 'Africa', label: 'Africa' },
  { value: 'North America', label: 'N. America' },
  { value: 'South America', label: 'S. America' },
  { value: 'Oceania', label: 'Oceania' },
];

export const HomeScreen: React.FC<HomeScreenProps> = ({
  config,
  onChangeConfig,
  onStart,
  onOpenStats,
  stats,
}) => {
  const poolCount =
    config.region === 'All'
      ? COUNTRIES.length
      : COUNTRIES.filter((c) => c.continent === config.region).length;

  const actualCount =
    config.length === 'all' ? poolCount : Math.min(config.length, poolCount);

  const selectedBest = getCategoryBest(stats, config.mode, config.region, config.length);

  const setMode = (mode: QuizMode) => onChangeConfig({ ...config, mode });
  const setLength = (length: GameLength) => onChangeConfig({ ...config, length });
  const setRegion = (region: RegionFilter) => onChangeConfig({ ...config, region });

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[radial-gradient(ellipse_at_top,_#1b2638_0%,_#111318_55%,_#0c0e12_100%)] px-4 py-6">
      <div className="w-full max-w-[440px] flex flex-col gap-5">
        {/* Minimal Floating Header Row */}
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={onOpenStats}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-xs font-semibold text-slate-200 hover:text-white transition cursor-pointer backdrop-blur-md"
          >
            <BarChart3 className="w-3.5 h-3.5 text-[#38a0ff]" />
            <span>Stats</span>
            {stats.totalGames > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-[#0A84FF]/25 text-[#7cc4ff] text-[10px] font-bold">
                {Object.keys(stats.categories).length}
              </span>
            )}
          </button>
        </div>

        {/* Hero Section with Slowly Spinning 3D Earth */}
        <div className="flex flex-col items-center text-center -mt-3">
          <HeroGlobe size={118} />
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white">
            Flag Guessr
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Flags · 3D World Map · Capitals
          </p>
        </div>

        {/* Sleek Glass Control Card */}
        <div className="rounded-3xl bg-[#1b1e25]/90 backdrop-blur-xl border border-white/[0.08] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.5)] flex flex-col gap-5">
          {/* Mode Segmented Control */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Mode
              </span>
              <span className="text-[11px] text-slate-400">
                {config.mode === 'mixed'
                  ? 'Flag ↔ Name · 4 choices'
                  : 'Flag only · Type autocomplete'}
              </span>
            </div>

            <div className="grid grid-cols-2 p-1 rounded-2xl bg-[#101217] border border-white/[0.06]">
              <button
                type="button"
                onClick={() => setMode('mixed')}
                className={`py-2.5 px-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${
                  config.mode === 'mixed'
                    ? 'bg-[#0A84FF] text-white shadow-[0_4px_14px_rgba(10,132,255,0.45)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Shuffle className="w-4 h-4" />
                <span>Mixed</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('type-in')}
                className={`py-2.5 px-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${
                  config.mode === 'type-in'
                    ? 'bg-[#0A84FF] text-white shadow-[0_4px_14px_rgba(10,132,255,0.45)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Keyboard className="w-4 h-4" />
                <span>Type-In</span>
              </button>
            </div>
          </div>

          {/* Length Selector (Single Clean Row) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Countries
              </span>
              <span className="text-[11px] text-slate-400 tabular-nums">
                {actualCount} of {poolCount}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1.5 p-1 rounded-2xl bg-[#101217] border border-white/[0.06]">
              {LENGTH_OPTIONS.map((opt) => {
                const selected = config.length === opt.value;
                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => setLength(opt.value)}
                    className={`py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                      selected
                        ? 'bg-white text-[#101217] shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Region Pills */}
          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Region
            </span>
            <div className="flex flex-wrap gap-1.5">
              {REGIONS.map((r) => {
                const selected = config.region === r.value;
                return (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRegion(r.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer border ${
                      selected
                        ? 'bg-[#0A84FF]/20 text-[#7cc4ff] border-[#0A84FF]/60'
                        : 'bg-[#101217] text-slate-400 border-white/[0.06] hover:text-slate-200 hover:border-white/15'
                    }`}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Start Button */}
          <div className="pt-1">
            <button
              type="button"
              onClick={onStart}
              className="w-full py-3.5 rounded-2xl bg-[#0A84FF] hover:bg-[#1c90ff] active:scale-[0.99] text-white font-bold text-base shadow-[0_10px_28px_rgba(10,132,255,0.42)] transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Start · {actualCount} Countries</span>
            </button>

            {/* Subtle Category Best Score Line */}
            {selectedBest && (
              <button
                type="button"
                onClick={onOpenStats}
                className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition cursor-pointer"
              >
                <Trophy className="w-3.5 h-3.5 text-amber-300" />
                <span>
                  Best for this category:{' '}
                  <strong className="text-emerald-400">{selectedBest.bestPct}%</strong>
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
