import React, { useState } from 'react';
import {
  Award,
  BookOpen,
  Check,
  Clock,
  Crown,
  Home,
  RotateCcw,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { CapitalMemoryCard } from './CapitalMemoryCard';
import { FlagImage } from './FlagImage';
import {
  formatDateShort,
  formatElapsed,
  type DailyEntry,
  type DailyStats,
} from '../utils/daily';
import type { RoundResult } from '../types/game';

interface DailySummaryScreenProps {
  dateKey: string;
  entry: DailyEntry | null;
  stats: DailyStats | null;
  results: RoundResult[];
  submitting: boolean;
  error: string | null;
  onSaveName: (name: string) => Promise<void>;
  onPlayCustom: () => void;
  onReplayDaily: () => void;
  onHome: () => void;
}

export const DailySummaryScreen: React.FC<DailySummaryScreenProps> = ({
  dateKey,
  entry,
  stats,
  results,
  submitting,
  error,
  onSaveName,
  onPlayCustom,
  onReplayDaily,
  onHome,
}) => {
  const [nameInput, setNameInput] = useState(
    entry?.isCustomName ? entry.playerName : ''
  );
  const [savingName, setSavingName] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [inspectResult, setInspectResult] = useState<RoundResult | null>(null);

  const flagScore = entry
    ? entry.flagScore
    : results.filter((r) => r.flagCorrect).length;
  const capitalScore = entry
    ? entry.capitalScore
    : results.filter((r) => r.capitalCorrect).length;
  const score = entry ? entry.score : flagScore + capitalScore;
  const elapsedMs = entry?.elapsedMs ?? 0;

  const flagPct = Math.round((flagScore / 5) * 100);
  const capitalPct = Math.round((capitalScore / 5) * 100);

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entry || savingName) return;
    setSavingName(true);
    setSavedNotice(false);
    try {
      await onSaveName(nameInput.trim());
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 2400);
    } finally {
      setSavingName(false);
    }
  };

  const maxDist = stats ? Math.max(1, ...stats.scoreDistribution) : 1;

  return (
    <div className="min-h-screen w-full flex flex-col items-center bg-[radial-gradient(ellipse_at_top,_#1b2a42_0%,_#11141a_52%,_#0b0d12_100%)] px-3 sm:px-4 py-4 sm:py-6">
      <div className="w-full max-w-[480px] flex flex-col gap-3.5">
        {/* Floating Dark Glass Header */}
        <header className="w-full flex items-center justify-between gap-2 px-0.5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/12 border border-emerald-400/25 text-emerald-200 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
            <span className="text-xs sm:text-sm font-bold tracking-tight">
              Daily Challenge · {formatDateShort(dateKey)}
            </span>
          </div>
          <button
            type="button"
            onClick={onHome}
            className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 px-3.5 py-2 rounded-full text-slate-200 hover:text-white transition cursor-pointer backdrop-blur-md"
          >
            <Home className="w-3.5 h-3.5" />
            Home
          </button>
        </header>

        <main className="w-full pb-8">
          <div className="w-full bg-[#1a1d24]/90 backdrop-blur-xl rounded-3xl p-5 sm:p-6 shadow-[0_24px_60px_rgba(0,0,0,0.5)] border border-white/[0.08] flex flex-col gap-5">
          {/* Score Hero */}
          <div className="text-center pt-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs font-bold mb-2">
              <Award className="w-3.5 h-3.5" />
              {submitting
                ? 'Saving score...'
                : stats && stats.rank !== null
                ? stats.totalPlayers === 1
                  ? 'First score on the board today!'
                  : `Rank #${stats.rank} of ${stats.totalPlayers} today · Better than ${stats.percentile}%`
                : 'Daily Complete'}
            </div>

            <div className="flex items-baseline justify-center gap-1.5 mt-1">
              <span className="text-5xl font-black tracking-tight text-white tabular-nums">
                {score}
              </span>
              <span className="text-xl font-bold text-slate-400">/ 10</span>
            </div>

            <div className="mt-2 flex items-center justify-center gap-4 text-xs text-slate-300">
              <span>
                Flags <strong className="text-emerald-400">{flagScore}/5</strong>
              </span>
              <span className="text-slate-600">·</span>
              <span>
                Capitals <strong className="text-sky-400">{capitalScore}/5</strong>
              </span>
              {elapsedMs > 0 && (
                <>
                  <span className="text-slate-600">·</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <strong>{formatElapsed(elapsedMs)}</strong>
                  </span>
                </>
              )}
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-red-500/15 border border-red-400/30 px-3.5 py-2.5 text-xs text-red-200 text-center">
              {error}
            </div>
          )}

          {/* Save Player Name Card */}
          {entry && (
            <form
              onSubmit={handleNameSubmit}
              className="rounded-2xl bg-[#16181e] border border-white/10 p-3.5 flex flex-col gap-2.5"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200">
                  Save your name to today&apos;s leaderboard
                </span>
                <span className="text-slate-400">
                  Listed as{' '}
                  <strong className="text-emerald-300">{entry.playerName}</strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  maxLength={24}
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder={`Enter name (defaults to ${entry.defaultName})`}
                  className="flex-1 min-w-0 rounded-xl bg-[#0e1014] border border-white/12 focus:border-[#0A84FF] focus:outline-none px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 transition"
                />
                <button
                  type="submit"
                  disabled={savingName}
                  className="px-4 py-2.5 rounded-xl bg-[#0A84FF] hover:bg-[#1a8fff] disabled:opacity-60 text-white font-bold text-sm transition cursor-pointer shrink-0 flex items-center gap-1.5"
                >
                  {savedNotice ? (
                    <>
                      <Check className="w-4 h-4" />
                      Saved
                    </>
                  ) : savingName ? (
                    'Saving...'
                  ) : (
                    'Save'
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Compare vs Everyone Today */}
          {stats && (
            <section className="rounded-2xl bg-[#16181e] border border-white/8 p-4 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-sky-400" />
                  Compared to Today&apos;s Players
                </h3>
                <span className="text-xs text-slate-400">
                  {stats.totalPlayers}{' '}
                  {stats.totalPlayers === 1 ? 'player' : 'players'} today
                </span>
              </div>

              {/* 3 Comparison Metrics */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-[#101217] border border-white/6 p-2.5 text-center">
                  <div className="text-sm font-extrabold text-white tabular-nums">
                    {score}/10
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Avg {stats.averageScore}/10
                  </div>
                </div>
                <div className="rounded-xl bg-[#101217] border border-white/6 p-2.5 text-center">
                  <div className="text-sm font-extrabold text-emerald-400 tabular-nums">
                    {flagPct}%
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Avg Flags {stats.averageFlagPct}%
                  </div>
                </div>
                <div className="rounded-xl bg-[#101217] border border-white/6 p-2.5 text-center">
                  <div className="text-sm font-extrabold text-sky-400 tabular-nums">
                    {capitalPct}%
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Avg Caps {stats.averageCapitalPct}%
                  </div>
                </div>
              </div>

              {/* Score Distribution Histogram (0..10) */}
              <div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2">
                  <span>Score Distribution (0–10)</span>
                  <span className="text-emerald-400 font-semibold">● Your score</span>
                </div>
                <div className="grid grid-cols-11 gap-1 items-end h-[76px] pt-2">
                  {stats.scoreDistribution.map((count, bucket) => {
                    const isMine = bucket === score;
                    const heightPct =
                      count === 0 ? 6 : Math.max(16, Math.round((count / maxDist) * 100));
                    return (
                      <div
                        key={bucket}
                        className="flex flex-col items-center gap-1 h-full justify-end"
                        title={`Score ${bucket}/10: ${count} ${count === 1 ? 'player' : 'players'}`}
                      >
                        <div className="w-full flex-1 flex items-end justify-center">
                          <div
                            className={`w-full rounded-t-md transition-all duration-300 ${
                              isMine
                                ? 'bg-emerald-400 shadow-[0_0_12px_rgba(74,222,128,0.55)]'
                                : count > 0
                                ? 'bg-[#0A84FF]/60'
                                : 'bg-white/8'
                            }`}
                            style={{ height: `${heightPct}%` }}
                          />
                        </div>
                        <span
                          className={`text-[10px] tabular-nums ${
                            isMine ? 'text-emerald-300 font-bold' : 'text-slate-500'
                          }`}
                        >
                          {bucket}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {/* Top 5 Scores of the Day */}
          {stats && (
            <section className="rounded-2xl bg-[#16181e] border border-white/8 p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 text-amber-300" />
                  Top 5 Today
                </h3>
                <span className="text-[11px] text-slate-500">Ranked by score, then speed</span>
              </div>

              {stats.top5.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-3">
                  No scores recorded yet today.
                </p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {stats.top5.map((row) => {
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
                        className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 border transition ${
                          isMe
                            ? 'bg-emerald-500/15 border-emerald-400/40'
                            : 'bg-[#101217] border-white/6'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`w-6 h-6 rounded-lg border text-xs font-extrabold flex items-center justify-center shrink-0 ${rankBadge}`}
                          >
                            {row.rank}
                          </span>
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-white truncate flex items-center gap-1.5">
                              <span>{row.playerName}</span>
                              {isMe && (
                                <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-400/20 text-emerald-300">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {row.flagScore}/5 flags · {row.capitalScore}/5 caps ·{' '}
                              {formatElapsed(row.elapsedMs)}
                            </div>
                          </div>
                        </div>

                        <div className="text-base font-black text-white tabular-nums shrink-0">
                          {row.score}
                          <span className="text-xs font-semibold text-slate-400">/10</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* Today's 5 Countries Breakdown */}
          {results.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Today&apos;s 5 Countries
                </h3>
                <span className="text-[11px] text-slate-500">Tap any country to learn more</span>
              </div>
              <div className="flex flex-col gap-1.5">
                {results.map((r, i) => (
                  <button
                    key={`${r.country.code}-${i}`}
                    type="button"
                    onClick={() => setInspectResult(r)}
                    className="w-full text-left flex items-center justify-between gap-3 rounded-xl bg-[#16181e] hover:bg-[#1e222b] border border-white/6 hover:border-sky-400/35 px-3 py-2 transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FlagImage
                        code={r.country.code}
                        name={r.country.name}
                        className="w-9 rounded shadow shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-white truncate">
                          {r.country.name}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {r.country.capital} · {r.country.continent}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[11px] font-bold ${
                          r.flagCorrect
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-red-500/20 text-red-300'
                        }`}
                      >
                        {r.flagCorrect ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        Flag
                      </span>
                      <span
                        className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[11px] font-bold ${
                          r.capitalCorrect
                            ? 'bg-sky-500/20 text-sky-300'
                            : 'bg-red-500/20 text-red-300'
                        }`}
                      >
                        {r.capitalCorrect ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <X className="w-3 h-3" />
                        )}
                        Cap
                      </span>
                      <BookOpen className="w-3.5 h-3.5 text-slate-500 ml-0.5" />
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Footer Actions */}
          <div className="flex gap-2.5 pt-1">
            <button
              type="button"
              onClick={onPlayCustom}
              className="flex-1 py-3 rounded-2xl bg-[#0A84FF] hover:bg-[#1a8fff] text-white font-bold text-sm transition cursor-pointer"
            >
              Play Custom Quiz
            </button>
            <button
              type="button"
              onClick={onReplayDaily}
              className="px-4 py-3 rounded-2xl bg-white/8 hover:bg-white/14 text-slate-200 font-semibold text-sm flex items-center justify-center gap-1.5 transition cursor-pointer"
              title="Play today's 5 countries again"
            >
              <RotateCcw className="w-4 h-4" />
              Replay
            </button>
          </div>
        </div>
        </main>
      </div>

      {/* Capital Memory Card Modal */}
      {inspectResult && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-4"
          onClick={() => setInspectResult(null)}
        >
          <div
            className="w-full max-w-[460px] bg-[#1a1d24] rounded-3xl p-4 sm:p-5 border border-white/12 shadow-[0_28px_70px_rgba(0,0,0,0.65)] max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <CapitalMemoryCard
              country={inspectResult.country}
              capitalCorrect={inspectResult.capitalCorrect}
              userCapitalAnswer={inspectResult.userCapitalAnswer}
              actionLabel="Close"
              onContinue={() => setInspectResult(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
