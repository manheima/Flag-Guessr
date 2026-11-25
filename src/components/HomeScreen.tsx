import React, { useState } from 'react';
import {
  BarChart3,
  Calendar,
  ChevronDown,
  Crown,
  Keyboard,
  Play,
  Shuffle,
  SlidersHorizontal,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react';
import { COUNTRIES } from '../data/countries';
import { HeroGlobe } from './HeroGlobe';
import { getCategoryBest, type StatsStore } from '../utils/stats';
import {
  formatDateShort,
  type DailyStats,
  type SavedTodayDaily,
} from '../utils/daily';
import type { GameConfig, GameLength, QuizMode, RegionFilter } from '../types/game';

interface HomeScreenProps {
  config: GameConfig;
  onChangeConfig: (next: GameConfig) => void;
  onStart: () => void;
  onStartDaily: () => void;
  onViewDailyLeaderboard: () => void;
  onOpenStats: () => void;
  stats: StatsStore;
  todayDateKey: string;
  dailyOverview: DailyStats | null;
  savedTodayDaily: SavedTodayDaily | null;
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
  onStartDaily,
  onViewDailyLeaderboard,
  onOpenStats,
  stats,
  todayDateKey,
  dailyOverview,
  savedTodayDaily,
}) => {
  const [practiceOpen, setPracticeOpen] = useState(false);

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

  const todayCount = dailyOverview?.totalPlayers ?? 0;
  const regionShortLabel =
    REGIONS.find((r) => r.value === config.region)?.label ?? 'All World';

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[radial-gradient(ellipse_at_top,_#1b2a42_0%,_#11141a_52%,_#0b0d12_100%)] px-4 py-7">
      <div className="w-full max-w-[440px] flex flex-col gap-5">
        {/* Minimal Floating Stats Button */}
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={onOpenStats}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-xs font-semibold text-slate-200 hover:text-white transition cursor-pointer backdrop-blur-md"
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

        {/* Big Centered Rotating 3D Globe Hero */}
        <div className="flex flex-col items-center text-center -mt-4">
          <HeroGlobe size={136} />
          <h1 className="mt-2.5 text-3xl sm:text-[34px] font-extrabold tracking-tight text-white">
            Flag Guessr
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Flags · 3D World Map · Capitals
          </p>
        </div>

        {/* PROMINENT FEATURED CARD: PLAY TODAY'S DAILY (5 COUNTRIES) */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0e3e6e] via-[#0c2949] to-[#101c2f] border border-sky-400/35 p-5 shadow-[0_22px_55px_rgba(10,132,255,0.24)]">
          {/* Ambient soft glow */}
          <div className="pointer-events-none absolute -top-12 -right-12 w-40 h-40 rounded-full bg-emerald-400/20 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-12 -left-10 w-36 h-36 rounded-full bg-sky-400/15 blur-2xl" />

          <div className="relative z-10 flex flex-col gap-3.5">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-400/20 border border-emerald-300/35 text-emerald-200 text-[11px] font-bold uppercase tracking-wider">
                <Sparkles className="w-3 h-3" />
                Daily Challenge
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-200/85">
                <Calendar className="w-3.5 h-3.5" />
                {formatDateShort(todayDateKey)}
              </span>
            </div>

            <div>
              <h2 className="text-xl font-extrabold text-white tracking-tight">
                Play Today&apos;s Daily
              </h2>
              <p className="text-xs text-sky-100/75 mt-1 flex items-center gap-2 flex-wrap">
                <span>5 countries · Compare against everyone today</span>
                {todayCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-emerald-300 font-semibold">
                    <Users className="w-3 h-3" />
                    {todayCount} {todayCount === 1 ? 'player' : 'players'}
                  </span>
                )}
              </p>
            </div>

            {savedTodayDaily ? (
              <div className="flex flex-col gap-2.5 pt-0.5">
                <div className="flex items-center justify-between rounded-2xl bg-black/30 border border-white/10 px-3.5 py-2.5 text-xs">
                  <span className="text-slate-300">
                    Completed as{' '}
                    <strong className="text-white">{savedTodayDaily.entry.playerName}</strong>
                  </span>
                  <span className="font-extrabold text-emerald-300 text-sm tabular-nums">
                    {savedTodayDaily.entry.score}/10
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={onViewDailyLeaderboard}
                    className="py-3 rounded-2xl bg-emerald-400 hover:bg-emerald-300 active:scale-[0.99] text-[#071b12] font-extrabold text-sm shadow-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Crown className="w-4 h-4" />
                    Leaderboard
                  </button>
                  <button
                    type="button"
                    onClick={onStartDaily}
                    className="py-3 rounded-2xl bg-white/12 hover:bg-white/20 text-white font-bold text-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Play Again
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={onStartDaily}
                className="w-full py-3.5 rounded-2xl bg-emerald-400 hover:bg-emerald-300 active:scale-[0.99] text-[#071b12] font-extrabold text-base shadow-[0_10px_28px_rgba(52,211,153,0.38)] transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Play Today&apos;s Daily · 5 Countries</span>
              </button>
            )}
          </div>
        </section>

        {/* COLLAPSIBLE PRACTICE MODE ACCORDION (Collapsed by default) */}
        <section className="rounded-3xl bg-[#1a1d24]/90 backdrop-blur-xl border border-white/[0.08] shadow-[0_16px_40px_rgba(0,0,0,0.4)] overflow-hidden transition-colors">
          <button
            type="button"
            onClick={() => setPracticeOpen((open) => !open)}
            aria-expanded={practiceOpen}
            className="w-full px-5 py-4 flex items-center justify-between gap-3 text-left hover:bg-white/[0.03] transition cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-2xl bg-[#0A84FF]/15 border border-[#0A84FF]/25 text-[#38a0ff] flex items-center justify-center shrink-0">
                <SlidersHorizontal className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[15px] font-bold text-white leading-tight">
                  Practice Mode
                </div>
                <div className="text-xs text-slate-400 mt-0.5 truncate">
                  {config.mode === 'mixed' ? 'Mixed' : 'Type-In'} · {actualCount} countries ·{' '}
                  {regionShortLabel}
                </div>
              </div>
            </div>

            <div className="w-8 h-8 rounded-full bg-white/[0.05] flex items-center justify-center text-slate-300 shrink-0">
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-250 ease-out ${
                  practiceOpen ? 'rotate-180 text-white' : ''
                }`}
              />
            </div>
          </button>

          {/* Smoothly Expandable Drawer */}
          <div
            className={`grid transition-[grid-template-rows,opacity] duration-250 ease-out ${
              practiceOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
            }`}
          >
            <div className="overflow-hidden">
              <div className="px-5 pb-5 pt-2 border-t border-white/[0.06] flex flex-col gap-4">
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

                {/* Length Selector */}
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

                {/* Practice Start Button */}
                <div className="pt-0.5">
                  <button
                    type="button"
                    onClick={onStart}
                    className="w-full py-3.5 rounded-2xl bg-[#0A84FF] hover:bg-[#1c90ff] active:scale-[0.99] text-white font-bold text-sm sm:text-base shadow-[0_8px_24px_rgba(10,132,255,0.38)] transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Start · {actualCount} Countries</span>
                  </button>

                  {selectedBest && (
                    <button
                      type="button"
                      onClick={onOpenStats}
                      className="mt-2.5 w-full flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition cursor-pointer"
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
        </section>
      </div>
    </div>
  );
};
