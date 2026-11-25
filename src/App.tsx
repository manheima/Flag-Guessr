import React, { useCallback, useEffect, useState } from 'react';
import { DailySummaryScreen } from './components/DailySummaryScreen';
import { HomeScreen } from './components/HomeScreen';
import { QuizScreen } from './components/QuizScreen';
import { StatsModal } from './components/StatsModal';
import { SummaryScreen } from './components/SummaryScreen';
import { buildGameDeck, shuffle } from './utils/quiz';
import {
  buildDailyDeck,
  fetchDailyOverview,
  formatDateShort,
  getTodayDateKey,
  loadSavedTodayDaily,
  saveTodayDaily,
  submitDailyScore,
  updateDailyPlayerName,
  type DailyEntry,
  type DailyStats,
  type SavedTodayDaily,
} from './utils/daily';
import {
  emptyStatsStore,
  loadStatsStore,
  recordGameResult,
  saveStatsStore,
  type StatsStore,
} from './utils/stats';
import type { Country, GameConfig, QuestionFormat, RoundResult } from './types/game';

type Screen = 'home' | 'quiz' | 'summary' | 'daily-summary';

export const App: React.FC = () => {
  const [screen, setScreen] = useState<Screen>('home');
  const [showStats, setShowStats] = useState(false);
  const [config, setConfig] = useState<GameConfig>({
    mode: 'mixed',
    length: 10,
    region: 'All',
  });
  const [deck, setDeck] = useState<Country[]>([]);
  const [forcedFormats, setForcedFormats] = useState<QuestionFormat[] | undefined>(
    undefined
  );
  const [isDailyRun, setIsDailyRun] = useState(false);
  const [isCustomRetry, setIsCustomRetry] = useState(false);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [lastMaxStreak, setLastMaxStreak] = useState(0);
  const [muted, setMuted] = useState(false);
  const [stats, setStats] = useState<StatsStore>(loadStatsStore);

  // Daily Challenge state
  const [todayDateKey] = useState<string>(() => getTodayDateKey());
  const [dailyOverview, setDailyOverview] = useState<DailyStats | null>(null);
  const [savedTodayDaily, setSavedTodayDaily] = useState<SavedTodayDaily | null>(() =>
    loadSavedTodayDaily(getTodayDateKey())
  );
  const [activeDailyEntry, setActiveDailyEntry] = useState<DailyEntry | null>(null);
  const [activeDailyStats, setActiveDailyStats] = useState<DailyStats | null>(null);
  const [dailySubmitting, setDailySubmitting] = useState(false);
  const [dailyError, setDailyError] = useState<string | null>(null);

  useEffect(() => {
    saveStatsStore(stats);
  }, [stats]);

  const refreshDailyOverview = useCallback(
    async (entryId?: number) => {
      try {
        const data = await fetchDailyOverview(todayDateKey, entryId);
        setDailyOverview(data);
        return data;
      } catch {
        return null;
      }
    },
    [todayDateKey]
  );

  useEffect(() => {
    if (screen === 'home') {
      refreshDailyOverview(savedTodayDaily?.entry.id);
    }
  }, [screen, refreshDailyOverview, savedTodayDaily?.entry.id]);

  const startQuiz = (overrideConfig?: GameConfig, customDeck?: Country[]) => {
    const activeConfig = overrideConfig ?? config;
    if (overrideConfig) {
      setConfig(overrideConfig);
    }
    const nextDeck = customDeck ?? buildGameDeck(activeConfig);
    setIsDailyRun(false);
    setForcedFormats(undefined);
    setIsCustomRetry(Boolean(customDeck));
    setDeck(nextDeck);
    setResults([]);
    setLastMaxStreak(0);
    setShowStats(false);
    setScreen('quiz');
  };

  const startDaily = () => {
    const { countries, formats } = buildDailyDeck(todayDateKey);
    setIsDailyRun(true);
    setForcedFormats(formats);
    setIsCustomRetry(false);
    setDeck(countries);
    setResults([]);
    setLastMaxStreak(0);
    setDailyError(null);
    setShowStats(false);
    setScreen('quiz');
  };

  const openSavedDailyLeaderboard = async () => {
    if (!savedTodayDaily) return;
    setResults(savedTodayDaily.results);
    setActiveDailyEntry(savedTodayDaily.entry);
    setDailyError(null);
    setScreen('daily-summary');
    setDailySubmitting(true);
    try {
      const fresh = await fetchDailyOverview(todayDateKey, savedTodayDaily.entry.id);
      setActiveDailyStats(fresh);
      setDailyOverview(fresh);
    } catch {
      setDailyError('Could not refresh today’s leaderboard from the server.');
    } finally {
      setDailySubmitting(false);
    }
  };

  const handleFinish = async (
    finalResults: RoundResult[],
    maxStreak: number,
    elapsedMs: number
  ) => {
    setResults(finalResults);
    setLastMaxStreak(maxStreak);

    if (isDailyRun) {
      const flagScore = finalResults.filter((r) => r.flagCorrect).length;
      const capitalScore = finalResults.filter((r) => r.capitalCorrect).length;

      setActiveDailyEntry(null);
      setActiveDailyStats(null);
      setDailyError(null);
      setDailySubmitting(true);
      setScreen('daily-summary');

      try {
        const res = await submitDailyScore({
          dateKey: todayDateKey,
          flagScore,
          capitalScore,
          elapsedMs,
        });
        setActiveDailyEntry(res.entry);
        setActiveDailyStats(res.stats);
        setDailyOverview(res.stats);

        const saved: SavedTodayDaily = {
          dateKey: todayDateKey,
          entry: res.entry,
          results: finalResults,
        };
        setSavedTodayDaily(saved);
        saveTodayDaily(saved);
      } catch {
        setDailyError(
          'Could not reach the daily leaderboard database. Make sure the API server is running.'
        );
      } finally {
        setDailySubmitting(false);
      }
      return;
    }

    setStats((prev) =>
      recordGameResult(prev, config, finalResults, maxStreak, isCustomRetry)
    );
    setScreen('summary');
  };

  const handleSaveDailyName = async (playerName: string) => {
    if (!activeDailyEntry) return;
    setDailyError(null);
    try {
      const res = await updateDailyPlayerName(
        activeDailyEntry.id,
        activeDailyEntry.editToken,
        playerName
      );
      setActiveDailyEntry(res.entry);
      setActiveDailyStats(res.stats);
      setDailyOverview(res.stats);

      const updatedSaved: SavedTodayDaily = {
        dateKey: todayDateKey,
        entry: res.entry,
        results,
      };
      setSavedTodayDaily(updatedSaved);
      saveTodayDaily(updatedSaved);
    } catch {
      setDailyError('Failed to save your name. Please try again.');
    }
  };

  if (screen === 'quiz' && deck.length > 0) {
    return (
      <QuizScreen
        deck={deck}
        config={config}
        isDaily={isDailyRun}
        dailyDateLabel={formatDateShort(todayDateKey)}
        forcedFormats={forcedFormats}
        muted={muted}
        onToggleMute={() => setMuted((m) => !m)}
        onQuit={() => setScreen('home')}
        onFinish={handleFinish}
      />
    );
  }

  if (screen === 'daily-summary') {
    return (
      <DailySummaryScreen
        dateKey={todayDateKey}
        entry={activeDailyEntry}
        stats={activeDailyStats}
        results={results}
        submitting={dailySubmitting}
        error={dailyError}
        onSaveName={handleSaveDailyName}
        onPlayCustom={() => startQuiz()}
        onReplayDaily={startDaily}
        onHome={() => setScreen('home')}
      />
    );
  }

  if (screen === 'summary') {
    return (
      <SummaryScreen
        results={results}
        maxStreak={lastMaxStreak}
        onPlayAgain={() => startQuiz()}
        onPracticeMissed={(missed) => startQuiz(undefined, shuffle(missed))}
        onHome={() => setScreen('home')}
      />
    );
  }

  return (
    <>
      <HomeScreen
        config={config}
        onChangeConfig={setConfig}
        onStart={() => startQuiz()}
        onStartDaily={startDaily}
        onViewDailyLeaderboard={openSavedDailyLeaderboard}
        onOpenStats={() => setShowStats(true)}
        stats={stats}
        todayDateKey={todayDateKey}
        dailyOverview={dailyOverview}
        savedTodayDaily={savedTodayDaily}
      />

      {showStats && (
        <StatsModal
          store={stats}
          initialMode={config.mode}
          initialRegion={config.region}
          onClose={() => setShowStats(false)}
          onQuickPlay={(nextCfg) => startQuiz(nextCfg)}
          onResetStats={() => setStats(emptyStatsStore())}
        />
      )}
    </>
  );
};

export default App;
