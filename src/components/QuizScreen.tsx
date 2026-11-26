import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Check,
  Flame,
  Globe2,
  MapPin,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { CapitalMemoryCard } from './CapitalMemoryCard';
import { FlagImage } from './FlagImage';
import { GlobeReveal } from './GlobeReveal';
import { TypeInQuestion } from './TypeInQuestion';
import { getCapitalImageUrl } from '../data/capitalDetails';
import {
  buildCapitalChoices,
  buildCountryChoices,
  pickQuestionFormat,
} from '../utils/quiz';
import { playCorrectSound, playGlobePopSound, playWrongSound } from '../utils/sound';
import type {
  Country,
  GameConfig,
  QuestionFormat,
  RoundPhase,
  RoundResult,
} from '../types/game';

interface QuizScreenProps {
  deck: Country[];
  config: GameConfig;
  isDaily?: boolean;
  dailyDateLabel?: string;
  forcedFormats?: QuestionFormat[];
  muted: boolean;
  onToggleMute: () => void;
  onQuit: () => void;
  onFinish: (results: RoundResult[], maxStreak: number, elapsedMs: number) => void;
}

export const QuizScreen: React.FC<QuizScreenProps> = ({
  deck,
  config,
  isDaily = false,
  dailyDateLabel,
  forcedFormats,
  muted,
  onToggleMute,
  onQuit,
  onFinish,
}) => {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<RoundPhase>('question');
  const [results, setResults] = useState<RoundResult[]>([]);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const startedAtRef = useRef<number>(Date.now());
  const detailsEnteredAtRef = useRef<number | null>(null);
  const pausedMsRef = useRef<number>(0);

  // Per-round state
  const [selectedCountryCode, setSelectedCountryCode] = useState<string | null>(null);
  const [submittedFlagText, setSubmittedFlagText] = useState<string>('');
  const [flagCorrect, setFlagCorrect] = useState<boolean>(false);

  const [selectedCapital, setSelectedCapital] = useState<string | null>(null);
  const [capitalCorrect, setCapitalCorrect] = useState<boolean>(false);

  const timerRef = useRef<number | null>(null);

  const currentCountry = deck[index];

  // Preload the current country's landmark photo early so "Learn More" opens instantaneously
  useEffect(() => {
    if (!currentCountry) return;
    const img = new Image();
    img.src = getCapitalImageUrl(currentCountry.code);
  }, [currentCountry]);

  // Generate question format + options deterministically for each round index
  const roundData = useMemo(() => {
    const format: QuestionFormat =
      forcedFormats?.[index] ?? pickQuestionFormat(config.mode);
    const countryChoices = buildCountryChoices(currentCountry);
    const capitalChoices = buildCapitalChoices(currentCountry);
    return { format, countryChoices, capitalChoices };
  }, [currentCountry, config.mode, forcedFormats, index]);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return clearTimer;
  }, [clearTimer]);

  const advanceToNextRound = useCallback(
    (latestCapitalChoice: string, latestCapitalCorrect: boolean) => {
      clearTimer();
      if (detailsEnteredAtRef.current !== null) {
        pausedMsRef.current += Math.max(0, Date.now() - detailsEnteredAtRef.current);
        detailsEnteredAtRef.current = null;
      }
      const roundResult: RoundResult = {
        country: currentCountry,
        format: roundData.format,
        flagCorrect,
        capitalCorrect: latestCapitalCorrect,
        userFlagAnswer: submittedFlagText,
        userCapitalAnswer: latestCapitalChoice,
      };
      const updatedResults = [...results, roundResult];

      if (index + 1 >= deck.length) {
        const elapsedMs = Math.max(
          500,
          Date.now() - startedAtRef.current - pausedMsRef.current
        );
        onFinish(updatedResults, maxStreak, elapsedMs);
      } else {
        setResults(updatedResults);
        setIndex((i) => i + 1);
        setPhase('question');
        setSelectedCountryCode(null);
        setSubmittedFlagText('');
        setFlagCorrect(false);
        setSelectedCapital(null);
        setCapitalCorrect(false);
      }
    },
    [
      clearTimer,
      currentCountry,
      roundData.format,
      flagCorrect,
      submittedFlagText,
      results,
      index,
      deck.length,
      onFinish,
      maxStreak,
    ]
  );

  // Handle Multiple-Choice Flag/Country answer
  const handleSelectCountryOption = (chosen: Country) => {
    if (phase !== 'question') return;
    const correct = chosen.code === currentCountry.code;
    setSelectedCountryCode(chosen.code);
    setSubmittedFlagText(chosen.name);
    setFlagCorrect(correct);
    setPhase('question-feedback');

    if (correct) {
      playCorrectSound(muted);
      setStreak((s) => {
        const next = s + 1;
        setMaxStreak((m) => Math.max(m, next));
        return next;
      });
    } else {
      playWrongSound(muted);
      setStreak(0);
    }

    // Crisp quick pause to register green/red feedback, then launch 3D globe!
    const delay = correct ? 480 : 820;
    clearTimer();
    timerRef.current = window.setTimeout(() => {
      playGlobePopSound(muted);
      setPhase('globe-reveal');
    }, delay);
  };

  // Handle Type-In Flag answer
  const handleSubmitTypeIn = (chosenName: string, correct: boolean) => {
    if (phase !== 'question') return;
    setSubmittedFlagText(chosenName);
    setFlagCorrect(correct);
    setPhase('question-feedback');

    if (correct) {
      playCorrectSound(muted);
      setStreak((s) => {
        const next = s + 1;
        setMaxStreak((m) => Math.max(m, next));
        return next;
      });
    } else {
      playWrongSound(muted);
      setStreak(0);
    }

    const delay = correct ? 450 : 800;
    clearTimer();
    timerRef.current = window.setTimeout(() => {
      playGlobePopSound(muted);
      setPhase('globe-reveal');
    }, delay);
  };

  // Called right when the <=1.8s 3D globe zoom finishes (or user skips)
  const handleGlobeComplete = useCallback(() => {
    setPhase((prev) => (prev === 'globe-reveal' ? 'capital' : prev));
  }, []);

  // Handle Capital multiple-choice answer
  const handleSelectCapital = (capital: string) => {
    if (phase !== 'capital') return;
    const correct = capital === currentCountry.capital;
    setSelectedCapital(capital);
    setCapitalCorrect(correct);
    setPhase('capital-feedback');

    if (correct) {
      playCorrectSound(muted);
    } else {
      playWrongSound(muted);
    }

    // 2s window to press "Learn More" or "Continue" while green progress bar sweeps across
    clearTimer();
    timerRef.current = window.setTimeout(() => {
      advanceToNextRound(capital, correct);
    }, 2000);
  };

  // Pause auto-advance and open the Capital Memory Card
  const handleOpenCapitalDetails = useCallback(() => {
    if (phase !== 'capital-feedback') return;
    clearTimer();
    detailsEnteredAtRef.current = Date.now();
    setPhase('capital-details');
  }, [phase, clearTimer]);

  // Keyboard shortcuts: Space/Enter to skip globe animation or continue; L to open Learn More
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (phase === 'globe-reveal' && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
        handleGlobeComplete();
      } else if (
        phase === 'capital-feedback' &&
        selectedCapital &&
        (e.key === 'l' || e.key === 'L')
      ) {
        e.preventDefault();
        handleOpenCapitalDetails();
      } else if (
        (phase === 'capital-feedback' || phase === 'capital-details') &&
        selectedCapital &&
        (e.key === ' ' || e.key === 'Enter')
      ) {
        e.preventDefault();
        advanceToNextRound(selectedCapital, capitalCorrect);
      } else if (phase === 'capital' && ['1', '2', '3', '4'].includes(e.key)) {
        const idx = Number(e.key) - 1;
        if (roundData.capitalChoices[idx]) {
          handleSelectCapital(roundData.capitalChoices[idx]);
        }
      } else if (
        phase === 'question' &&
        roundData.format !== 'type-in' &&
        ['1', '2', '3', '4'].includes(e.key)
      ) {
        const idx = Number(e.key) - 1;
        if (roundData.countryChoices[idx]) {
          handleSelectCountryOption(roundData.countryChoices[idx]);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    phase,
    handleGlobeComplete,
    handleOpenCapitalDetails,
    advanceToNextRound,
    selectedCapital,
    capitalCorrect,
    roundData,
  ]);

  // Progress bar advances smoothly across rounds
  const progressPct =
    ((index + (phase === 'capital-feedback' || phase === 'capital-details' ? 1 : 0.15)) /
      deck.length) *
    100;
  const showGlobe =
    phase === 'globe-reveal' || phase === 'capital' || phase === 'capital-feedback';

  return (
    <div className="min-h-screen w-full flex flex-col items-center bg-[radial-gradient(ellipse_at_top,_#1b2a42_0%,_#11141a_52%,_#0b0d12_100%)] px-3 sm:px-4 py-4 sm:py-6">
      <div className="w-full max-w-[460px] flex flex-col gap-3.5">
        {/* Sleek Floating Dark Glass Top Bar */}
        <header className="w-full flex items-center justify-between gap-2 px-0.5">
          {isDaily ? (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/12 border border-emerald-400/25 text-emerald-200 backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
              <span className="text-xs sm:text-sm font-bold tracking-tight">
                Daily Challenge{dailyDateLabel ? ` · ${dailyDateLabel}` : ''}
              </span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.06] border border-white/10 text-slate-200 backdrop-blur-md">
              <Globe2 className="w-3.5 h-3.5 text-[#38a0ff] shrink-0" />
              <span className="text-xs sm:text-sm font-bold tracking-tight">
                Flag Guessr · {config.mode === 'type-in' ? 'Type-In' : 'Mixed'}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2">
            {streak >= 2 && (
              <div className="flex items-center gap-1 bg-amber-400/15 border border-amber-300/35 rounded-full px-2.5 py-1 text-xs font-bold text-amber-200 animate-pop-in">
                <Flame className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                <span>{streak}</span>
              </div>
            )}

            <button
              type="button"
              onClick={onToggleMute}
              className="w-9 h-9 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 flex items-center justify-center text-slate-300 hover:text-white transition cursor-pointer backdrop-blur-md"
              aria-label={muted ? 'Unmute sounds' : 'Mute sounds'}
              title={muted ? 'Unmute sounds' : 'Mute sounds'}
            >
              {muted ? (
                <VolumeX className="w-4 h-4 text-slate-400" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>

            <button
              type="button"
              onClick={onQuit}
              className="w-9 h-9 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 flex items-center justify-center text-slate-300 hover:text-white transition cursor-pointer backdrop-blur-md"
              aria-label="Quit quiz"
              title="Back to Home"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Main Frosted Dark Glass Quiz Card */}
        <main className="w-full">
          <div className="w-full bg-[#1a1d24]/90 backdrop-blur-xl rounded-3xl px-4 sm:px-6 pt-4 pb-6 shadow-[0_24px_60px_rgba(0,0,0,0.5)] border border-white/[0.08] flex flex-col">
            {/* Clean Slim Progress Bar + Counter */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden relative">
                <div
                  className={`h-full rounded-full transition-all duration-300 ease-out ${
                    isDaily
                      ? 'bg-gradient-to-r from-sky-400 to-emerald-400'
                      : 'bg-gradient-to-r from-[#0A84FF] to-sky-400'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(4, progressPct))}%` }}
                />
              </div>

              <span className="text-xs font-bold text-slate-300 tabular-nums min-w-[38px] text-right">
                {index + 1}/{deck.length}
              </span>
            </div>

            {/* =========================================================
                STAGE 1: FLAG / COUNTRY QUESTION
            ========================================================== */}
            {(phase === 'question' || phase === 'question-feedback') && (
              <div className="py-2 flex flex-col justify-center">
              {/* FORMAT A: TYPE-IN (Flag Only + Autocomplete) */}
              {roundData.format === 'type-in' && (
                <TypeInQuestion
                  country={currentCountry}
                  locked={phase === 'question-feedback'}
                  submittedAnswer={submittedFlagText}
                  isCorrect={phase === 'question-feedback' ? flagCorrect : null}
                  onSubmitCountry={handleSubmitTypeIn}
                />
              )}

              {/* FORMAT B: COUNTRY NAME -> 2x2 FLAGS (Matches Screensho_GeoGuru.jpg!) */}
              {roundData.format === 'name-to-flag' && (
                <div className="flex flex-col items-center animate-fade-slide-up">
                  <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-7 tracking-tight">
                    {currentCountry.name}
                  </h2>

                  <div className="grid grid-cols-2 gap-3.5 sm:gap-4 w-full max-w-[340px]">
                    {roundData.countryChoices.map((choice) => {
                      const isSelected = selectedCountryCode === choice.code;
                      const isTarget = choice.code === currentCountry.code;
                      const locked = phase === 'question-feedback';

                      let cardBg = 'bg-[#090a0d] hover:bg-[#14171f] border-transparent';
                      if (locked) {
                        if (isTarget) {
                          cardBg = 'bg-[#8BC34A] border-[#a3e635] shadow-[0_0_24px_rgba(139,195,74,0.45)]';
                        } else if (isSelected && !isTarget) {
                          cardBg = 'bg-[#EF5350] border-red-300';
                        } else {
                          cardBg = 'bg-[#090a0d]/60 border-transparent opacity-55';
                        }
                      }

                      return (
                        <button
                          key={choice.code}
                          type="button"
                          disabled={locked}
                          onClick={() => handleSelectCountryOption(choice)}
                          className={`relative aspect-square rounded-2xl p-4 sm:p-5 flex items-center justify-center border-2 transition-all duration-150 active:scale-[0.97] cursor-pointer disabled:cursor-default overflow-hidden ${cardBg}`}
                        >
                          <FlagImage
                            code={choice.code}
                            name={choice.name}
                            className="w-full rounded-xl shadow-md"
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* FORMAT C: FLAG -> 4 COUNTRY NAMES (Matches Screen_Recording_GeoGuru.mp4!) */}
              {roundData.format === 'flag-to-name' && (
                <div className="flex flex-col items-center animate-fade-slide-up">
                  <div className="mb-7 flex justify-center">
                    <div className="rounded-2xl overflow-hidden shadow-[0_12px_32px_rgba(0,0,0,0.45)] ring-1 ring-white/10">
                      <FlagImage
                        code={currentCountry.code}
                        name="Country flag"
                        className="w-[164px] sm:w-[186px] rounded-2xl"
                      />
                    </div>
                  </div>

                  <div className="w-full flex flex-col gap-3">
                    {roundData.countryChoices.map((choice) => {
                      const isSelected = selectedCountryCode === choice.code;
                      const isTarget = choice.code === currentCountry.code;
                      const locked = phase === 'question-feedback';

                      let btnClasses =
                        'bg-[#090a0d] hover:bg-[#14171f] text-white border-transparent';
                      let sweepColor = '';

                      if (locked) {
                        if (isTarget) {
                          btnClasses = 'bg-[#8BC34A]/35 text-[#0f1708] border-[#8BC34A]';
                          sweepColor = 'bg-[#8BC34A]';
                        } else if (isSelected && !isTarget) {
                          btnClasses = 'bg-[#EF5350] text-white border-red-300';
                        } else {
                          btnClasses = 'bg-[#090a0d]/60 text-slate-400 border-transparent opacity-60';
                        }
                      }

                      return (
                        <button
                          key={choice.code}
                          type="button"
                          disabled={locked}
                          onClick={() => handleSelectCountryOption(choice)}
                          className={`relative w-full py-4 px-5 rounded-2xl font-semibold text-base sm:text-[17px] border transition-all duration-150 active:scale-[0.99] cursor-pointer disabled:cursor-default overflow-hidden ${btnClasses}`}
                        >
                          {locked && isTarget && (
                            <span
                              className={`absolute inset-0 ${sweepColor} animate-answer-sweep`}
                              style={
                                {
                                  '--sweep-duration': flagCorrect ? '460ms' : '780ms',
                                } as React.CSSProperties
                              }
                            />
                          )}
                          <span className="relative z-10 flex items-center justify-center gap-2">
                            {choice.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =========================================================
              STAGE 2 & 3: 3D GLOBE LOCATION REVEAL + CAPITAL QUIZ
          ========================================================== */}
          {showGlobe && (
            <div className="flex-1 flex flex-col gap-4 animate-fade-slide-up">
              {/* Compact Country Header Strip */}
              <div className="flex items-center justify-between bg-[#1b1d22] rounded-2xl px-3.5 py-2.5 border border-white/8">
                <div className="flex items-center gap-3 min-w-0">
                  <FlagImage
                    code={currentCountry.code}
                    name={currentCountry.name}
                    className="w-11 rounded-md shadow shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="font-bold text-base text-white truncate">
                      {currentCountry.name}
                    </div>
                    <div className="text-xs text-slate-400">{currentCountry.continent}</div>
                  </div>
                </div>

                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold shrink-0 ${
                    flagCorrect
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                      : 'bg-red-500/20 text-red-300 border border-red-400/30'
                  }`}
                >
                  {flagCorrect ? (
                    <>
                      <Check className="w-3.5 h-3.5" /> Flag
                    </>
                  ) : (
                    <>
                      <X className="w-3.5 h-3.5" /> Missed
                    </>
                  )}
                </span>
              </div>

              {/* 3D Orthographic Globe (spins to continent -> zooms in -> highlights country in <=1.75s, then docks neatly above capital choices!) */}
              <GlobeReveal
                country={currentCountry}
                compact={phase === 'capital' || phase === 'capital-feedback'}
                onAnimationComplete={handleGlobeComplete}
                onSkip={handleGlobeComplete}
              />

              {/* Subtle status text while globe is zooming */}
              {phase === 'globe-reveal' && (
                <div className="flex-1 flex items-center justify-center">
                  <div className="inline-flex items-center gap-2 text-xs sm:text-sm text-slate-300/90 bg-black/25 px-3.5 py-2 rounded-full border border-white/8">
                    <MapPin className="w-4 h-4 text-emerald-400 animate-bounce" />
                    <span>
                      Locating <strong className="text-white">{currentCountry.name}</strong> in{' '}
                      {currentCountry.continent}...
                    </span>
                  </div>
                </div>
              )}

              {/* Capital Multiple Choice */}
              {(phase === 'capital' || phase === 'capital-feedback') && (
                <div className="flex flex-col gap-3 animate-fade-slide-up">
                  <div className="flex items-center justify-between px-0.5">
                    <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-[#0A84FF]" />
                      <span>What is the capital of {currentCountry.name}?</span>
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    {roundData.capitalChoices.map((cap) => {
                      const locked = phase === 'capital-feedback';
                      const isTarget = cap === currentCountry.capital;
                      const isSelected = selectedCapital === cap;

                      let btnClasses =
                        'bg-[#090a0d] hover:bg-[#14171f] text-white border-transparent';

                      if (locked) {
                        if (isTarget) {
                          btnClasses = 'bg-[#8BC34A]/35 text-[#0f1708] border-[#8BC34A]';
                        } else if (isSelected && !isTarget) {
                          btnClasses = 'bg-[#EF5350] text-white border-red-300';
                        } else {
                          btnClasses =
                            'bg-[#090a0d]/60 text-slate-400 border-transparent opacity-60';
                        }
                      }

                      return (
                        <button
                          key={cap}
                          type="button"
                          disabled={locked}
                          onClick={() => handleSelectCapital(cap)}
                          className={`relative w-full py-3.5 px-5 rounded-2xl font-semibold text-[15px] sm:text-base border transition-all duration-150 active:scale-[0.99] cursor-pointer disabled:cursor-default overflow-hidden ${btnClasses}`}
                        >
                          {locked && isTarget && (
                            <span
                              className="absolute inset-0 bg-[#8BC34A] animate-answer-sweep"
                              style={
                                {
                                  '--sweep-duration': '2000ms',
                                } as React.CSSProperties
                              }
                            />
                          )}
                          <span className="relative z-10 flex items-center justify-center gap-2">
                            {cap}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* 2s Action Row: "Learn More" or "Continue" with synchronized green countdown bar */}
                  {phase === 'capital-feedback' && selectedCapital && (
                    <div className="mt-1 grid grid-cols-2 gap-2.5 animate-pop-in">
                      <button
                        type="button"
                        onClick={handleOpenCapitalDetails}
                        className="py-3 px-3 rounded-2xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/40 text-sky-200 hover:text-white font-bold text-sm flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <BookOpen className="w-4 h-4 text-sky-300 shrink-0" />
                        <span>Learn More</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => advanceToNextRound(selectedCapital, capitalCorrect)}
                        className="relative overflow-hidden py-3 px-3 rounded-2xl bg-[#101319] border border-[#8BC34A]/55 text-white font-bold text-sm flex items-center justify-center gap-1.5 transition cursor-pointer hover:brightness-110"
                      >
                        <span
                          className="absolute inset-0 bg-[#8BC34A]/80 animate-answer-sweep"
                          style={
                            {
                              '--sweep-duration': '2000ms',
                            } as React.CSSProperties
                          }
                        />
                        <span className="relative z-10 flex items-center justify-center gap-1.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)]">
                          <span>{index + 1 >= deck.length ? 'See Results' : 'Continue'}</span>
                          <ArrowRight className="w-4 h-4" />
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* =========================================================
              STAGE 4 (Optional): CAPITAL MEMORY CARD ("Learn More")
          ========================================================== */}
          {phase === 'capital-details' && selectedCapital && (
            <CapitalMemoryCard
              country={currentCountry}
              capitalCorrect={capitalCorrect}
              userCapitalAnswer={selectedCapital}
              actionLabel={index + 1 >= deck.length ? 'See Results' : 'Continue'}
              onContinue={() => advanceToNextRound(selectedCapital, capitalCorrect)}
            />
          )}
        </div>
      </main>
      </div>
    </div>
  );
};
