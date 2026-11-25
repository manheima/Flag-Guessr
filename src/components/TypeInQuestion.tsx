import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, CornerDownLeft, Search, X } from 'lucide-react';
import { FlagImage } from './FlagImage';
import { filterCountrySuggestions, normalizeText } from '../utils/quiz';
import type { Country } from '../types/game';

interface TypeInQuestionProps {
  country: Country;
  locked: boolean;
  submittedAnswer: string | null;
  isCorrect: boolean | null;
  onSubmitCountry: (selectedName: string, correct: boolean) => void;
}

function highlightMatch(name: string, query: string): React.ReactNode {
  const normQ = normalizeText(query);
  if (!normQ) return name;
  const lower = name.toLowerCase();
  const idx = lower.indexOf(query.trim().toLowerCase());
  if (idx === -1) return name;
  return (
    <>
      {name.slice(0, idx)}
      <span className="text-sky-400 font-bold">{name.slice(idx, idx + query.trim().length)}</span>
      {name.slice(idx + query.trim().length)}
    </>
  );
}

export const TypeInQuestion: React.FC<TypeInQuestionProps> = ({
  country,
  locked,
  submittedAnswer,
  isCorrect,
  onSubmitCountry,
}) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const suggestions = useMemo(() => filterCountrySuggestions(query), [query]);

  useEffect(() => {
    setQuery('');
    setActiveIndex(0);
    if (!locked) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [country.code, locked]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Keep highlighted option scrolled into view
  useEffect(() => {
    const container = listRef.current;
    if (!container) return;
    const activeEl = container.querySelector(`[data-idx="${activeIndex}"]`) as HTMLElement | null;
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  const submitChoice = (chosen: Country) => {
    if (locked) return;
    setQuery(chosen.name);
    onSubmitCountry(chosen.name, chosen.code === country.code);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (locked) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (suggestions.length > 0) {
        setActiveIndex((prev) => (prev + 1) % suggestions.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (suggestions.length > 0) {
        setActiveIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
      }
    } else if (e.key === 'Tab' && suggestions.length > 0) {
      e.preventDefault();
      setQuery(suggestions[activeIndex].name);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestions.length > 0) {
        submitChoice(suggestions[activeIndex]);
      } else if (query.trim().length > 0) {
        onSubmitCountry(query.trim(), false);
      }
    }
  };

  return (
    <div className="flex flex-col items-center w-full animate-fade-slide-up">
      {/* Large GeoGuru-style centered flag */}
      <div className="mb-6 flex justify-center">
        <div className="rounded-2xl overflow-hidden shadow-[0_12px_32px_rgba(0,0,0,0.45)] ring-1 ring-white/10 bg-[#14161a]">
          <FlagImage
            code={country.code}
            name="Mystery Country"
            className="w-[176px] sm:w-[200px] rounded-2xl"
          />
        </div>
      </div>

      {/* Feedback Banner when locked */}
      {locked && (
        <div
          className={`relative overflow-hidden w-full rounded-2xl px-4 py-3.5 mb-3 border text-center font-semibold transition-all animate-pop-in ${
            isCorrect
              ? 'bg-[#8BC34A]/20 border-[#8BC34A] text-[#d9f99d]'
              : 'bg-[#EF5350]/20 border-[#EF5350] text-red-100'
          }`}
        >
          <div
            className={`absolute inset-0 ${
              isCorrect ? 'bg-[#8BC34A]/25' : 'bg-[#EF5350]/20'
            } animate-answer-sweep`}
            style={{ '--sweep-duration': isCorrect ? '450ms' : '800ms' } as React.CSSProperties}
          />
          <div className="relative z-10 flex items-center justify-center gap-2">
            {isCorrect ? (
              <>
                <Check className="w-5 h-5 text-[#8BC34A] shrink-0" />
                <span className="text-base">{country.name}</span>
              </>
            ) : (
              <>
                <X className="w-5 h-5 text-[#EF5350] shrink-0" />
                <span className="text-sm sm:text-base">
                  {submittedAnswer && submittedAnswer !== '(Skipped)' ? (
                    <>
                      <span className="line-through opacity-70 mr-2">{submittedAnswer}</span>
                      <span className="text-[#a3e635] font-bold">{country.name}</span>
                    </>
                  ) : (
                    <>
                      Answer: <span className="text-[#a3e635] font-bold">{country.name}</span>
                    </>
                  )}
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Autocomplete Input + Dropdown */}
      {!locked && (
        <div className="w-full relative">
          <div className="relative flex items-center">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Start typing country name..."
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              aria-label="Type country name"
              className="w-full rounded-2xl bg-[#0e1014] border-2 border-white/15 focus:border-[#0A84FF] focus:outline-none pl-11 pr-10 py-3.5 text-base font-medium text-white placeholder:text-slate-500 transition shadow-inner"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  inputRef.current?.focus();
                }}
                className="absolute right-3 p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                aria-label="Clear input"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Live Autocomplete Dropdown */}
          {query.trim().length > 0 && (
            <div className="mt-2 w-full rounded-2xl bg-[#111318] border border-white/12 shadow-2xl overflow-hidden">
              <div className="px-3.5 py-2 border-b border-white/8 flex items-center justify-between text-[11px] font-medium text-slate-400">
                <span>
                  {suggestions.length === 0
                    ? 'No matching countries'
                    : `${suggestions.length} matching ${suggestions.length === 1 ? 'country' : 'countries'}`}
                </span>
                {suggestions.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-slate-500">
                    <CornerDownLeft className="w-3 h-3" /> Enter to pick
                  </span>
                )}
              </div>

              {suggestions.length > 0 && (
                <div
                  ref={listRef}
                  role="listbox"
                  className="max-h-[220px] overflow-y-auto divide-y divide-white/5"
                >
                  {suggestions.map((item, idx) => {
                    const isActive = idx === activeIndex;
                    return (
                      <button
                        key={item.code}
                        type="button"
                        role="option"
                        aria-selected={isActive}
                        data-idx={idx}
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={() => submitChoice(item)}
                        className={`w-full text-left px-4 py-3 flex items-center justify-between transition cursor-pointer ${
                          isActive ? 'bg-[#0A84FF]/30 text-white' : 'text-slate-200'
                        }`}
                      >
                        <span className="text-[15px] font-medium">
                          {highlightMatch(item.name, query)}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">
                          {item.continent}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Helper footer row */}
          <div className="mt-3 flex items-center justify-between px-1">
            <span className="text-xs text-slate-400">
              Type any letter (e.g. <kbd className="px-1.5 py-0.5 rounded bg-black/50 text-slate-200 font-mono text-[11px]">H</kbd>) to filter
            </span>
            <button
              type="button"
              onClick={() => onSubmitCountry('(Skipped)', false)}
              className="text-xs font-medium text-slate-400 hover:text-white underline underline-offset-2 transition cursor-pointer"
            >
              Reveal answer
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
