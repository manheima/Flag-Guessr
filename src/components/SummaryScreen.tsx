import React from 'react';
import {
  Check,
  Flame,
  Home,
  RotateCcw,
  Target,
  Trophy,
  X,
} from 'lucide-react';
import { FlagImage } from './FlagImage';
import type { Country, RoundResult } from '../types/game';

interface SummaryScreenProps {
  results: RoundResult[];
  maxStreak: number;
  onPlayAgain: () => void;
  onPracticeMissed: (missedCountries: Country[]) => void;
  onHome: () => void;
}

export const SummaryScreen: React.FC<SummaryScreenProps> = ({
  results,
  maxStreak,
  onPlayAgain,
  onPracticeMissed,
  onHome,
}) => {
  const total = results.length;
  const flagCorrectCount = results.filter((r) => r.flagCorrect).length;
  const capitalCorrectCount = results.filter((r) => r.capitalCorrect).length;
  const totalPossible = total * 2;
  const totalScore = flagCorrectCount + capitalCorrectCount;
  const overallPct = totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100) : 0;
  const flagPct = total > 0 ? Math.round((flagCorrectCount / total) * 100) : 0;
  const capitalPct = total > 0 ? Math.round((capitalCorrectCount / total) * 100) : 0;

  const missedCountries = results
    .filter((r) => !r.flagCorrect || !r.capitalCorrect)
    .map((r) => r.country);

  const headline =
    overallPct >= 90
      ? 'Geography Master!'
      : overallPct >= 75
      ? 'Sharp Knowledge!'
      : overallPct >= 50
      ? 'Solid Progress!'
      : 'Great Warm-Up!';

  return (
    <div className="min-h-screen w-full flex flex-col items-center bg-[#14161a]">
      <header className="w-full bg-[#0A84FF] shadow-md">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <span className="font-bold text-lg text-white">Quiz Complete</span>
          <button
            type="button"
            onClick={onHome}
            className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-full text-white transition cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" />
            Home
          </button>
        </div>
      </header>

      <main className="w-full max-w-lg flex-1 flex flex-col px-0 sm:px-4 pt-0 sm:pt-5 pb-8">
        <div className="w-full bg-[#2c2e33] sm:rounded-3xl rounded-t-3xl -mt-2 sm:mt-0 p-5 sm:p-6 shadow-2xl border border-white/8 flex flex-col gap-5">
          {/* Score Hero */}
          <div className="text-center py-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-400/15 border border-amber-400/30 mb-3">
              <Trophy className="w-7 h-7 text-amber-300" />
            </div>
            <h2 className="text-2xl font-extrabold text-white">{headline}</h2>
            <p className="text-sm text-slate-300 mt-1">
              You scored <strong className="text-white">{totalScore} / {totalPossible}</strong> ({overallPct}%) across {total}{' '}
              {total === 1 ? 'country' : 'countries'}
            </p>
          </div>

          {/* 3-stat breakdown */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="rounded-2xl bg-[#181a1f] border border-white/8 p-3 text-center">
              <div className="text-xl font-extrabold text-emerald-400">{flagPct}%</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Flags ({flagCorrectCount}/{total})
              </div>
            </div>
            <div className="rounded-2xl bg-[#181a1f] border border-white/8 p-3 text-center">
              <div className="text-xl font-extrabold text-sky-400">{capitalPct}%</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Capitals ({capitalCorrectCount}/{total})
              </div>
            </div>
            <div className="rounded-2xl bg-[#181a1f] border border-white/8 p-3 text-center">
              <div className="text-xl font-extrabold text-amber-300 flex items-center justify-center gap-1">
                <Flame className="w-4 h-4 fill-amber-300" />
                {maxStreak}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Flag Streak</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={onPlayAgain}
              className="flex-1 py-3.5 rounded-2xl bg-[#0A84FF] hover:bg-[#1a8fff] text-white font-bold text-sm flex items-center justify-center gap-2 transition shadow-lg cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Play Again
            </button>

            {missedCountries.length > 0 && (
              <button
                type="button"
                onClick={() => onPracticeMissed(missedCountries)}
                className="flex-1 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Target className="w-4 h-4" />
                Retry Missed ({missedCountries.length})
              </button>
            )}
          </div>

          {/* Detailed Review List */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
              Round Breakdown
            </h3>
            <div className="max-h-[340px] overflow-y-auto flex flex-col gap-2 pr-1">
              {results.map((r, i) => (
                <div
                  key={`${r.country.code}-${i}`}
                  className="flex items-center justify-between gap-3 rounded-xl bg-[#181a1f] border border-white/6 px-3 py-2.5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FlagImage
                      code={r.country.code}
                      name={r.country.name}
                      className="w-10 rounded shadow shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-white truncate">
                        {r.country.name}
                      </div>
                      <div className="text-xs text-slate-400 truncate">
                        Capital: <span className="text-slate-200">{r.country.capital}</span> ·{' '}
                        {r.country.continent}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      title={r.flagCorrect ? 'Flag correct' : `Guessed: ${r.userFlagAnswer}`}
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
                      title={
                        r.capitalCorrect
                          ? 'Capital correct'
                          : `Guessed: ${r.userCapitalAnswer}`
                      }
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
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
