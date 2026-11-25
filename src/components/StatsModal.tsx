import React, { useState } from 'react';
import {
  Award,
  BarChart3,
  Clock,
  Crown,
  Flame,
  Globe2,
  Keyboard,
  Play,
  Shuffle,
  Sparkles,
  Trash2,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import { COUNTRIES } from '../data/countries';
import {
  formatDateShort,
  formatElapsed,
  type DailyStats,
  type SavedTodayDaily,
} from '../utils/daily';
import {
  getBestForRegion,
  getCategoryBest,
  type StatsStore,
} from '../utils/stats';
import type { GameConfig, GameLength, QuizMode, RegionFilter } from '../types/game';

interface StatsModalProps {
  store: StatsStore;
  initialMode: QuizMode;
  initialRegion: RegionFilter;
  todayDateKey: string;
  dailyStats: DailyStats | null;
  savedTodayDaily: SavedTodayDaily | null;
  loadingDaily: boolean;
  onClose: () => void;
  onQuickPlay: (config: GameConfig) => void;
  onStartDaily: () => void;
  onViewDailyLeaderboard: () => void;
  onResetStats: () => void;
}

const LENGTHS: GameLength[] = [10, 20, 30, 'all'];

const REGIONS: { value: RegionFilter; label: string }[] = [
  { value: 'All', label: 'All World' },
  { value: 'Europe', label: 'Europe' },
  { value: 'Asia', label: 'Asia' },
  { value: 'Africa', label: 'Africa' },
  { value: 'North America', label: 'N. America' },
  { value: 'South America', label: 'S. America' },
  { value: 'Oceania', label: 'Oceania' },
];

export const StatsModal: React.FC<StatsModalProps> = ({
  store,
  initialMode,
  initialRegion,
  todayDateKey,
  dailyStats,
  savedTodayDaily,
  loadingDaily,
  onClose,
  onQuickPlay,
  onStartDaily,
  onViewDailyLeaderboard,
  onResetStats,
}) => {
  const [section, setSection] = useState<'daily' | 'practice'>('daily');
  const [mode, setMode] = useState<QuizMode>(initialMode);
  const [region, setRegion] = useState<RegionFilter>(initialRegion);
  const [view, setView] = useState<'lengths' | 'regions'>('lengths');
  const [confirmReset, setConfirmReset] = useState(false);

  const regionPoolCount = (r: RegionFilter) =>
    r === 'All' ? COUNTRIES.length : COUNTRIES.filter((c) => c.continent === r).length;

  const poolCount = regionPoolCount(region);

  const entry = savedTodayDaily?.entry ?? null;
  const myScore = entry?.score ?? null;
  const myFlagPct = entry ? Math.round((entry.flagScore / 5) * 100) : null;
  const myCapitalPct = entry ? Math.round((entry.capitalScore / 5) * 100) : null;
  const scoreDelta =
    entry && dailyStats && dailyStats.totalPlayers > 0
      ? Number((entry.score - dailyStats.averageScore).toFixed(1))
      : null;

  const maxDist = dailyStats ? Math.max(1, ...dailyStats.scoreDistribution) : 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4 animate-fade-slide-up"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] bg-[#1e2026] border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#0A84FF]/15 text-[#38a0ff] flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">Stats &amp; Best Scores</h2>
              <p className="text-[11px] text-slate-400">
                Today&apos;s Daily comparison &amp; Practice records
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/8 transition cursor-pointer"
            aria-label="Close stats"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top-Level Section Tabs: Today's Daily vs Practice Bests */}
        <div className="px-5 pt-3.5 pb-1 shrink-0">
          <div className="grid grid-cols-2 p-1 rounded-2xl bg-[#14161b] border border-white/8">
            <button
              type="button"
              onClick={() => setSection('daily')}
              className={`py-2 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                section === 'daily'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/35 shadow-sm'
                  : 'text-slate-400 hover:text-white border border-transparent'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Today&apos;s Daily</span>
              {entry && (
                <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 text-[10px] font-extrabold tabular-nums">
                  {entry.score}/10
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setSection('practice')}
              className={`py-2 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                section === 'practice'
                  ? 'bg-[#0A84FF] text-white border border-[#38a0ff]/40 shadow-sm'
                  : 'text-slate-400 hover:text-white border border-transparent'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Practice Bests</span>
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
          {/* ===============================================================
              TAB 1: TODAY'S DAILY STATS & COMPARISON
          =============================================================== */}
          {section === 'daily' && (
            <div className="flex flex-col gap-4">
              {/* Player's Daily Performance Card */}
              {entry ? (
                <div className="rounded-2xl bg-gradient-to-br from-[#0e365c] via-[#10263f] to-[#141923] border border-sky-400/30 p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-sky-200 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
                      Daily · {formatDateShort(todayDateKey)}
                    </span>
                    <span className="text-xs text-slate-300">
                      Saved as <strong className="text-white">{entry.playerName}</strong>
                    </span>
                  </div>

                  {/* Score + Relative Standing */}
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-black text-white tabular-nums">
                          {entry.score}
                        </span>
                        <span className="text-base font-bold text-slate-400">/ 10</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2.5 text-[11px] text-slate-300">
                        <span>
                          Flags <strong className="text-emerald-400">{entry.flagScore}/5</strong>
                        </span>
                        <span className="text-slate-600">·</span>
                        <span>
                          Caps <strong className="text-sky-400">{entry.capitalScore}/5</strong>
                        </span>
                        <span className="text-slate-600">·</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {formatElapsed(entry.elapsedMs)}
                        </span>
                      </div>
                    </div>

                    {/* Relative Rank / Percentile Pill */}
                    {dailyStats && dailyStats.rank !== null ? (
                      <div className="text-right flex flex-col items-end gap-1">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-400/20 border border-emerald-300/35 text-emerald-200 text-xs font-extrabold">
                          <Award className="w-3.5 h-3.5" />
                          #{dailyStats.rank} of {dailyStats.totalPlayers}
                        </span>
                        <span className="text-[11px] font-semibold text-sky-200/90">
                          {dailyStats.totalPlayers === 1
                            ? 'Top score so far today'
                            : `Better than ${dailyStats.percentile}% today`}
                        </span>
                      </div>
                    ) : loadingDaily ? (
                      <span className="text-xs text-slate-400">Refreshing rank...</span>
                    ) : null}
                  </div>

                  {/* Delta vs Today's Average */}
                  {scoreDelta !== null && dailyStats && dailyStats.totalPlayers > 0 && (
                    <div className="rounded-xl bg-black/30 border border-white/8 px-3 py-2 flex items-center justify-between text-xs">
                      <span className="text-slate-300">
                        Relative to today&apos;s average ({dailyStats.averageScore}/10)
                      </span>
                      <span
                        className={`font-extrabold tabular-nums ${
                          scoreDelta > 0
                            ? 'text-emerald-400'
                            : scoreDelta < 0
                            ? 'text-amber-300'
                            : 'text-sky-300'
                        }`}
                      >
                        {scoreDelta > 0
                          ? `+${scoreDelta} above avg`
                          : scoreDelta < 0
                          ? `${scoreDelta} vs avg`
                          : 'Right on avg'}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl bg-[#14161b] border border-white/8 p-4 text-center flex flex-col items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-400/25 text-emerald-300 flex items-center justify-center">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">
                      You haven&apos;t played today&apos;s Daily yet
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Complete today&apos;s 5 countries ({formatDateShort(todayDateKey)}) to see
                      your rank and compare against everyone else.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onStartDaily}
                    className="mt-1 px-4 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-[#071b12] font-extrabold text-xs flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Play Today&apos;s Daily · 5 Countries
                  </button>
                </div>
              )}

              {/* Community Comparison + Score Distribution */}
              {dailyStats && (
                <div className="rounded-2xl bg-[#14161b] border border-white/6 p-4 flex flex-col gap-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-sky-400" />
                      Compared to Today&apos;s Players
                    </span>
                    <span className="text-xs text-slate-400">
                      {dailyStats.totalPlayers}{' '}
                      {dailyStats.totalPlayers === 1 ? 'player' : 'players'}
                    </span>
                  </div>

                  {dailyStats.totalPlayers > 0 ? (
                    <>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="rounded-xl bg-[#101217] border border-white/6 p-2.5 text-center">
                          <div className="text-sm font-extrabold text-white tabular-nums">
                            {myScore !== null ? `${myScore}/10` : '—'}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Avg {dailyStats.averageScore}/10
                          </div>
                        </div>
                        <div className="rounded-xl bg-[#101217] border border-white/6 p-2.5 text-center">
                          <div className="text-sm font-extrabold text-emerald-400 tabular-nums">
                            {myFlagPct !== null ? `${myFlagPct}%` : '—'}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Avg Flags {dailyStats.averageFlagPct}%
                          </div>
                        </div>
                        <div className="rounded-xl bg-[#101217] border border-white/6 p-2.5 text-center">
                          <div className="text-sm font-extrabold text-sky-400 tabular-nums">
                            {myCapitalPct !== null ? `${myCapitalPct}%` : '—'}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Avg Caps {dailyStats.averageCapitalPct}%
                          </div>
                        </div>
                      </div>

                      {/* 0–10 Distribution Bars */}
                      <div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
                          <span>Today&apos;s Score Distribution (0–10)</span>
                          {myScore !== null && (
                            <span className="text-emerald-400 font-semibold">● You</span>
                          )}
                        </div>
                        <div className="grid grid-cols-11 gap-1 items-end h-[64px] pt-1">
                          {dailyStats.scoreDistribution.map((count, bucket) => {
                            const isMine = myScore === bucket;
                            const heightPct =
                              count === 0
                                ? 6
                                : Math.max(18, Math.round((count / maxDist) * 100));
                            return (
                              <div
                                key={bucket}
                                className="flex flex-col items-center gap-1 h-full justify-end"
                                title={`Score ${bucket}/10: ${count} ${count === 1 ? 'player' : 'players'}`}
                              >
                                <div className="w-full flex-1 flex items-end justify-center">
                                  <div
                                    className={`w-full rounded-t-md transition-all ${
                                      isMine
                                        ? 'bg-emerald-400 shadow-[0_0_10px_rgba(74,222,128,0.5)]'
                                        : count > 0
                                        ? 'bg-[#0A84FF]/60'
                                        : 'bg-white/8'
                                    }`}
                                    style={{ height: `${heightPct}%` }}
                                  />
                                </div>
                                <span
                                  className={`text-[10px] tabular-nums ${
                                    isMine
                                      ? 'text-emerald-300 font-bold'
                                      : 'text-slate-500'
                                  }`}
                                >
                                  {bucket}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-slate-500 text-center py-2">
                      No scores recorded yet today — be the first on the leaderboard!
                    </p>
                  )}
                </div>
              )}

              {/* Top 5 Today Preview */}
              {dailyStats && dailyStats.top5.length > 0 && (
                <div className="rounded-2xl bg-[#14161b] border border-white/6 p-4 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <Crown className="w-3.5 h-3.5 text-amber-300" />
                      Top 5 Today
                    </span>
                    {entry && (
                      <button
                        type="button"
                        onClick={onViewDailyLeaderboard}
                        className="text-[11px] font-semibold text-[#38a0ff] hover:text-sky-300 transition cursor-pointer"
                      >
                        Edit name / Details →
                      </button>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    {dailyStats.top5.map((row) => {
                      const isMe = entry && row.id === entry.id;
                      const rankBadge =
                        row.rank === 1
                          ? 'bg-amber-400/20 text-amber-300 border-amber-400/40'
                          : row.rank === 2
                          ? 'bg-slate-300/20 text-slate-200 border-slate-300/35'
                          : row.rank === 3
                          ? 'bg-orange-400/20 text-orange-300 border-orange-400/35'
                          : 'bg-white/6 text-slate-400 border-white/10';
                      return (
                        <div
                          key={row.id}
                          className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2 border ${
                            isMe
                              ? 'bg-emerald-500/15 border-emerald-400/35'
                              : 'bg-[#101217] border-white/6'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={`w-5 h-5 rounded-md border text-[11px] font-extrabold flex items-center justify-center shrink-0 ${rankBadge}`}
                            >
                              {row.rank}
                            </span>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                                <span>{row.playerName}</span>
                                {isMe && (
                                  <span className="text-[9px] font-bold uppercase px-1 py-0.5 rounded bg-emerald-400/20 text-emerald-300">
                                    You
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {row.flagScore}/5 flags · {row.capitalScore}/5 caps ·{' '}
                                {formatElapsed(row.elapsedMs)}
                              </div>
                            </div>
                          </div>
                          <span className="text-sm font-black text-white tabular-nums shrink-0">
                            {row.score}
                            <span className="text-[11px] font-semibold text-slate-400">/10</span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===============================================================
              TAB 2: PRACTICE MODE CATEGORY BESTS
          =============================================================== */}
          {section === 'practice' && (
            <>
              {/* Lifetime Overview Strip */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="rounded-2xl bg-[#14161b] border border-white/6 p-3 text-center">
                  <div className="text-lg font-extrabold text-white">{store.totalGames}</div>
                  <div className="text-[11px] text-slate-400">Quizzes</div>
                </div>
                <div className="rounded-2xl bg-[#14161b] border border-white/6 p-3 text-center">
                  <div className="text-lg font-extrabold text-sky-400">
                    {store.totalCountriesAnswered}
                  </div>
                  <div className="text-[11px] text-slate-400">Countries</div>
                </div>
                <div className="rounded-2xl bg-[#14161b] border border-white/6 p-3 text-center">
                  <div className="text-lg font-extrabold text-amber-300 flex items-center justify-center gap-1">
                    <Flame className="w-4 h-4 fill-amber-300" />
                    {store.overallBestStreak}
                  </div>
                  <div className="text-[11px] text-slate-400">Best Streak</div>
                </div>
              </div>

              {/* Mode Segmented Toggle */}
              <div className="grid grid-cols-2 p-1 rounded-xl bg-[#14161b] border border-white/6">
                <button
                  type="button"
                  onClick={() => setMode('mixed')}
                  className={`py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    mode === 'mixed'
                      ? 'bg-[#0A84FF] text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  Mixed Mode
                </button>
                <button
                  type="button"
                  onClick={() => setMode('type-in')}
                  className={`py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    mode === 'type-in'
                      ? 'bg-[#0A84FF] text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Keyboard className="w-3.5 h-3.5" />
                  Type-In Mode
                </button>
              </div>

              {/* View Switch: By Length vs By Region */}
              <div className="flex items-center justify-between">
                <div className="inline-flex rounded-lg bg-[#14161b] p-0.5 border border-white/6">
                  <button
                    type="button"
                    onClick={() => setView('lengths')}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                      view === 'lengths'
                        ? 'bg-white/12 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    By Length
                  </button>
                  <button
                    type="button"
                    onClick={() => setView('regions')}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                      view === 'regions'
                        ? 'bg-white/12 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    By Region
                  </button>
                </div>

                {view === 'lengths' && (
                  <span className="text-[11px] text-slate-400">
                    {region === 'All' ? 'All World' : region} ({poolCount})
                  </span>
                )}
              </div>

              {/* Region Filter Pills when viewing By Length */}
              {view === 'lengths' && (
                <div className="flex flex-wrap gap-1.5">
                  {REGIONS.map((r) => {
                    const selected = region === r.value;
                    const hasPlays = getBestForRegion(store, mode, r.value) !== null;
                    return (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => setRegion(r.value)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition cursor-pointer border ${
                          selected
                            ? 'bg-white text-[#14161a] border-white'
                            : 'bg-[#14161b] text-slate-300 border-white/8 hover:border-white/25'
                        }`}
                      >
                        <span>{r.label}</span>
                        {hasPlays && (
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              selected ? 'bg-[#0A84FF]' : 'bg-emerald-400'
                            }`}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Category Rows: By Length */}
              {view === 'lengths' && (
                <div className="flex flex-col gap-2">
                  {LENGTHS.map((len) => {
                    const record = getCategoryBest(store, mode, region, len);
                    const label =
                      len === 'all' ? `All Countries (${poolCount})` : `${len} Countries`;
                    const disabledByRegion = typeof len === 'number' && len > poolCount;

                    return (
                      <div
                        key={String(len)}
                        className={`rounded-2xl bg-[#14161b] border border-white/6 px-3.5 py-3 flex items-center justify-between gap-3 ${
                          disabledByRegion ? 'opacity-45' : ''
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-bold text-white">{label}</span>
                            {record ? (
                              <span className="inline-flex items-center gap-1 text-sm font-extrabold text-emerald-400 tabular-nums">
                                <Trophy className="w-3.5 h-3.5 text-amber-300" />
                                {record.bestPct}%
                              </span>
                            ) : (
                              <span className="text-xs text-slate-500">Not played</span>
                            )}
                          </div>

                          {record ? (
                            <>
                              <div className="mt-1.5 h-1.5 w-full rounded-full bg-white/8 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-[#0A84FF] to-emerald-400"
                                  style={{ width: `${Math.max(4, record.bestPct)}%` }}
                                />
                              </div>
                              <div className="mt-1.5 flex items-center gap-3 text-[11px] text-slate-400">
                                <span>Flags {record.bestFlagPct}%</span>
                                <span>Capitals {record.bestCapitalPct}%</span>
                                <span>Streak {record.bestStreak}</span>
                                <span className="ml-auto text-slate-500">
                                  {record.gamesPlayed} {record.gamesPlayed === 1 ? 'run' : 'runs'}
                                </span>
                              </div>
                            </>
                          ) : (
                            <div className="mt-1 text-[11px] text-slate-500">
                              {disabledByRegion
                                ? `Region has ${poolCount} countries`
                                : 'Complete a quiz to record your best score'}
                            </div>
                          )}
                        </div>

                        {!disabledByRegion && (
                          <button
                            type="button"
                            onClick={() => onQuickPlay({ mode, region, length: len })}
                            className="p-2 rounded-xl bg-white/6 hover:bg-[#0A84FF] text-slate-300 hover:text-white transition cursor-pointer shrink-0"
                            title={`Play ${label}`}
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Category Rows: By Region */}
              {view === 'regions' && (
                <div className="flex flex-col gap-2">
                  {REGIONS.map((r) => {
                    const summary = getBestForRegion(store, mode, r.value);
                    const count = regionPoolCount(r.value);
                    return (
                      <div
                        key={r.value}
                        className="rounded-2xl bg-[#14161b] border border-white/6 px-3.5 py-3 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-bold text-white flex items-center gap-2">
                              <Globe2 className="w-3.5 h-3.5 text-sky-400" />
                              {r.label}
                              <span className="text-xs font-normal text-slate-500">({count})</span>
                            </span>
                            {summary ? (
                              <span className="inline-flex items-center gap-1 text-sm font-extrabold text-emerald-400 tabular-nums">
                                <Trophy className="w-3.5 h-3.5 text-amber-300" />
                                {summary.bestPct}%
                              </span>
                            ) : (
                              <span className="text-xs text-slate-500">Not played</span>
                            )}
                          </div>

                          {summary ? (
                            <>
                              <div className="mt-1.5 h-1.5 w-full rounded-full bg-white/8 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-[#0A84FF] to-emerald-400"
                                  style={{ width: `${Math.max(4, summary.bestPct)}%` }}
                                />
                              </div>
                              <div className="mt-1.5 flex items-center gap-3 text-[11px] text-slate-400">
                                <span>Best Streak {summary.bestStreak}</span>
                                <span className="ml-auto text-slate-500">
                                  {summary.gamesPlayed} {summary.gamesPlayed === 1 ? 'run' : 'runs'}
                                </span>
                              </div>
                            </>
                          ) : (
                            <div className="mt-1 text-[11px] text-slate-500">
                              No runs recorded in {r.label} yet
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setRegion(r.value);
                            setView('lengths');
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-white/6 hover:bg-white/14 text-xs font-semibold text-slate-300 hover:text-white transition cursor-pointer shrink-0"
                        >
                          Details
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/8 flex items-center justify-between shrink-0 bg-[#181a20]">
          {section === 'practice' && store.totalGames > 0 ? (
            !confirmReset ? (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-red-400 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Reset Practice Stats
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-300 font-medium">Clear practice records?</span>
                <button
                  type="button"
                  onClick={() => {
                    onResetStats();
                    setConfirmReset(false);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-red-500/80 hover:bg-red-500 text-xs font-bold text-white transition cursor-pointer"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-medium text-slate-300 transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )
          ) : (
            <span className="text-[11px] text-slate-500">
              {section === 'daily'
                ? `Updated live · ${formatDateShort(todayDateKey)}`
                : 'Best scores saved locally'}
            </span>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
