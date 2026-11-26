import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Camera,
  Check,
  Flag,
  Globe2,
  Landmark,
  Volume2,
  X,
} from 'lucide-react';
import { FlagImage } from './FlagImage';
import { GlobeReveal } from './GlobeReveal';
import { getCapitalDetail, getCapitalImageUrl } from '../data/capitalDetails';
import type { Country } from '../types/game';

interface CapitalMemoryCardProps {
  country: Country;
  capitalCorrect?: boolean;
  userCapitalAnswer?: string | null;
  actionLabel: string;
  onContinue: () => void;
}

export const CapitalMemoryCard: React.FC<CapitalMemoryCardProps> = ({
  country,
  capitalCorrect,
  userCapitalAnswer,
  actionLabel,
  onContinue,
}) => {
  const [mediaTab, setMediaTab] = useState<'photo' | 'globe'>('photo');
  const [imgFailed, setImgFailed] = useState(false);

  const detail = getCapitalDetail(country.code);
  const imageUrl = getCapitalImageUrl(country.code);

  useEffect(() => {
    setMediaTab('photo');
    setImgFailed(false);
  }, [country.code]);

  const showResultBadge = typeof capitalCorrect === 'boolean';

  return (
    <div className="flex flex-col gap-3 animate-fade-slide-up">
      {/* Flag -> Country -> Capital Triad Header */}
      <div className="flex items-center justify-between gap-2.5 bg-[#1b1d22] rounded-2xl px-3.5 py-2.5 border border-white/8">
        <div className="flex items-center gap-3 min-w-0">
          <FlagImage
            code={country.code}
            name={country.name}
            className="w-12 rounded-lg shadow-md shrink-0 ring-1 ring-white/10"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap leading-tight">
              <span className="text-xs font-semibold text-slate-400 truncate">
                {country.name}
              </span>
              <span className="text-slate-600 text-xs">→</span>
              <span className="text-[15px] sm:text-base font-extrabold text-white tracking-tight">
                {country.capital}
              </span>
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 flex-wrap text-[11px] text-slate-400">
              {detail?.pronunciation && (
                <span className="inline-flex items-center gap-1 text-sky-300/90 font-medium">
                  <Volume2 className="w-3 h-3 shrink-0" />
                  {detail.pronunciation}
                </span>
              )}
              <span>· {country.continent}</span>
              {showResultBadge && !capitalCorrect && userCapitalAnswer && (
                <span className="text-red-300/80 line-through">
                  {userCapitalAnswer}
                </span>
              )}
            </div>
          </div>
        </div>

        {showResultBadge && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold shrink-0 ${
              capitalCorrect
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                : 'bg-red-500/20 text-red-300 border border-red-400/30'
            }`}
          >
            {capitalCorrect ? (
              <>
                <Check className="w-3.5 h-3.5" /> Correct
              </>
            ) : (
              <>
                <X className="w-3.5 h-3.5" /> Missed
              </>
            )}
          </span>
        )}
      </div>

      {/* Hero Landmark Photo / 3D Globe Toggle Frame */}
      <div className="relative w-full h-[180px] sm:h-[200px] rounded-2xl overflow-hidden bg-[#0e1522] border border-white/10 shadow-xl">
        {mediaTab === 'photo' && !imgFailed ? (
          <>
            <img
              src={imageUrl}
              alt={detail ? `${detail.landmarkName} in ${country.capital}` : country.capital}
              onError={() => setImgFailed(true)}
              className="w-full h-full object-cover object-center"
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/85 via-black/45 to-transparent" />
            <div className="pointer-events-none absolute bottom-2.5 left-3 right-3 flex items-end justify-between gap-2">
              <div className="min-w-0">
                <div className="text-xs sm:text-[13px] font-bold text-white leading-snug drop-shadow">
                  {detail?.landmarkName ?? country.capital}
                </div>
                <div className="text-[10.5px] text-slate-300/90">
                  {country.capital}, {country.name}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="w-full h-full [&>div]:h-full [&>div]:rounded-none [&>div]:border-0">
            <GlobeReveal country={country} compact skipIntro showReplay={false} />
          </div>
        )}

        {/* Photo / Globe Switcher Pill */}
        {!imgFailed && (
          <div className="absolute top-2.5 right-2.5 z-10 inline-flex items-center p-0.5 rounded-full bg-black/65 backdrop-blur-md border border-white/15 shadow-lg">
            <button
              type="button"
              onClick={() => setMediaTab('photo')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition cursor-pointer ${
                mediaTab === 'photo'
                  ? 'bg-white text-[#0e1014] shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Camera className="w-3 h-3" />
              <span>Photo</span>
            </button>
            <button
              type="button"
              onClick={() => setMediaTab('globe')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition cursor-pointer ${
                mediaTab === 'globe'
                  ? 'bg-white text-[#0e1014] shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Globe2 className="w-3 h-3" />
              <span>Globe</span>
            </button>
          </div>
        )}
      </div>

      {/* Compact 3-Part Memory Association Panel */}
      {detail && (
        <div className="rounded-2xl bg-[#13161c] border border-white/[0.08] divide-y divide-white/[0.06]">
          {/* 1. Capital Name Origin */}
          <div className="px-3.5 py-2.5 flex items-start gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-amber-400/15 border border-amber-400/25 text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
              <BookOpen className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0 text-xs sm:text-[12.5px] leading-snug text-slate-200">
              <span className="font-bold text-amber-300 mr-1.5">Origin:</span>
              <span>{detail.origin}</span>
            </div>
          </div>

          {/* 2. Famous Landmark */}
          <div className="px-3.5 py-2.5 flex items-start gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-sky-400/15 border border-sky-400/25 text-sky-300 flex items-center justify-center shrink-0 mt-0.5">
              <Landmark className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0 text-xs sm:text-[12.5px] leading-snug text-slate-200">
              <span className="font-bold text-sky-300 mr-1.5">Landmark:</span>
              <span>{detail.landmarkDescription}</span>
            </div>
          </div>

          {/* 3. Flag Origin & Color Meaning */}
          <div className="px-3.5 py-2.5 flex items-start gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-emerald-400/15 border border-emerald-400/25 text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
              <Flag className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0 text-xs sm:text-[12.5px] leading-snug text-slate-200">
              <span className="font-bold text-emerald-300 mr-1.5">Flag:</span>
              <span>{detail.flagMeaning}</span>
            </div>
          </div>
        </div>
      )}

      {/* Continue Button */}
      <button
        type="button"
        onClick={onContinue}
        className="w-full py-3.5 rounded-2xl bg-[#0A84FF] hover:bg-[#1c90ff] active:scale-[0.99] text-white font-bold text-sm sm:text-[15px] shadow-[0_8px_24px_rgba(10,132,255,0.35)] flex items-center justify-center gap-2 transition cursor-pointer"
      >
        <span>{actionLabel}</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
};
