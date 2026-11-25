import React, { useEffect, useState } from 'react';
import { HomeScreen } from './components/HomeScreen';
import { QuizScreen } from './components/QuizScreen';
import { StatsModal } from './components/StatsModal';
import { SummaryScreen } from './components/SummaryScreen';
import { buildGameDeck, shuffle } from './utils/quiz';
import {
  emptyStatsStore,
  loadStatsStore,
  recordGameResult,
  saveStatsStore,
  type StatsStore,
} from './utils/stats';
import type { Country, GameConfig, RoundResult } from './types/game';

type Screen = 'home' | 'quiz' | 'summary';

export const App: React.FC = () => {
  const [screen, setScreen] = useState<Screen>('home');
  const [showStats, setShowStats] = useState(false);
  const [config, setConfig] = useState<GameConfig>({
    mode: 'mixed',
    length: 10,
    region: 'All',
  });
  const [deck, setDeck] = useState<Country[]>([]);
  const [isCustomRetry, setIsCustomRetry] = useState(false);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [lastMaxStreak, setLastMaxStreak] = useState(0);
  const [muted, setMuted] = useState(false);
  const [stats, setStats] = useState<StatsStore>(loadStatsStore);

  useEffect(() => {
    saveStatsStore(stats);
  }, [stats]);

  const startQuiz = (overrideConfig?: GameConfig, customDeck?: Country[]) => {
    const activeConfig = overrideConfig ?? config;
    if (overrideConfig) {
      setConfig(overrideConfig);
    }
    const nextDeck = customDeck ?? buildGameDeck(activeConfig);
    setIsCustomRetry(Boolean(customDeck));
    setDeck(nextDeck);
    setResults([]);
    setLastMaxStreak(0);
    setShowStats(false);
    setScreen('quiz');
  };

  const handleFinish = (finalResults: RoundResult[], maxStreak: number) => {
    setResults(finalResults);
    setLastMaxStreak(maxStreak);
    setStats((prev) =>
      recordGameResult(prev, config, finalResults, maxStreak, isCustomRetry)
    );
    setScreen('summary');
  };

  if (screen === 'quiz' && deck.length > 0) {
    return (
      <QuizScreen
        deck={deck}
        config={config}
        muted={muted}
        onToggleMute={() => setMuted((m) => !m)}
        onQuit={() => setScreen('home')}
        onFinish={handleFinish}
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
        onOpenStats={() => setShowStats(true)}
        stats={stats}
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
