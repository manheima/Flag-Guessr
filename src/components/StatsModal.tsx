import React, { useState } from 'react';
import {
  BarChart3,
  Flame,
  Globe2,
  Keyboard,
  Play,
  Shuffle,
  Trash2,
  Trophy,
  X,
} from 'lucide-react';
import { COUNTRIES } from '../data/countries';
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
  onClose: () => void;
  onQuickPlay: (config: GameConfig) => void;
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
  onClose,
  onQuickPlay,
  onResetStats,
}) => {
  const [mode, setMode] = useState<QuizMode>(initialMode);
  const [region, setRegion] = useState<RegionFilter>(initialRegion);
  const [view, setView] = useState<'lengths' | 'regions'>('lengths');
  const [confirmReset, setConfirmReset] = useState(false);

  const regionPoolCount = (r: RegionFilter) =>
    r === 'All' ? COUNTRIES.length : COUNTRIES.filter((c) => c.continent === r).length;

  const poolCount = regionPoolCount(region);

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
              <h2 className="text-base font-bold text-white leading-tight">Best Scores &amp; Stats</h2>
              <p className="text-[11px] text-slate-400">Personal records by mode, length &amp; region</p>
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

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
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
        </div>

        {/* Footer */}
        {store.totalGames > 0 && (
          <div className="px-5 py-3 border-t border-white/8 flex items-center justify-between shrink-0 bg-[#181a20]">
            {!confirmReset ? (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-red-400 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Reset Stats
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-300 font-medium">Clear all best scores?</span>
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
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white transition cursor-pointer"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
