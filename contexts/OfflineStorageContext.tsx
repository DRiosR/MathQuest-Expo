import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

export type HighScore = {
  id: string;
  mode: number; // Time in minutes (flexible)
  score: number;
  accuracy: number;
  questionsAnswered: number;
  timestamp: string;
  synced: boolean;
  alias?: string; 
  username?: string;
  category?: string;
  difficulty?: number;
};

type OfflineStorageContextType = {
  highScores: HighScore[];
  addHighScore: (score: Omit<HighScore, 'id' | 'timestamp' | 'synced'>) => Promise<void>;
  getTopScores: (mode?: number, limit?: number) => HighScore[];
  getTopScoresToday: (mode?: number, limit?: number) => HighScore[];
  clearAllScores: () => Promise<void>;
  getUnsyncedScores: () => HighScore[];
  markAsSynced: (id: string) => Promise<void>;
  isLoaded: boolean;
};

const OfflineStorageContext = createContext<OfflineStorageContextType | undefined>(undefined);

const STORAGE_KEY = 'mathquest_highscores';

export const OfflineStorageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [highScores, setHighScores] = useState<HighScore[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load scores from AsyncStorage on mount
  useEffect(() => {
    loadScores();
  }, []);

  const loadScores = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const scores = JSON.parse(stored) as HighScore[];
        setHighScores(scores);
      }
    } catch (error) {
      console.error('Error loading high scores:', error);
    } finally {
      setIsLoaded(true);
    }
  };

  const saveScores = async (scores: HighScore[]) => {
    try {
      // Keep only last 50 scores to avoid bloating storage
      const trimmedScores = scores
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 50);
      
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedScores));
      setHighScores(trimmedScores);
    } catch (error) {
      console.error('Error saving high scores:', error);
    }
  };

  const addHighScore = async (scoreData: Omit<HighScore, 'id' | 'timestamp' | 'synced'>) => {
    const newScore: HighScore = {
      ...scoreData,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      synced: false,
    };

    const updatedScores = [...highScores, newScore];
    await saveScores(updatedScores);
  };

  const getTopScores = (mode?: number, limit: number = 10): HighScore[] => {
    let filtered = highScores;
    
    if (mode) {
      filtered = highScores.filter(score => score.mode === mode);
    }

    return filtered
      .sort((a, b) => {
        // Sort by score first, then by accuracy, then by timestamp
        if (b.score !== a.score) return b.score - a.score;
        if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      })
      .slice(0, limit);
  };

  const getTopScoresToday = (mode?: number, limit: number = 3): HighScore[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayScores = highScores.filter(score => {
      const scoreDate = new Date(score.timestamp);
      scoreDate.setHours(0, 0, 0, 0);
      const isSameDay = scoreDate.getTime() === today.getTime();
      const modeMatches = mode ? score.mode === mode : true;
      return isSameDay && modeMatches;
    });
    
    return todayScores
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      })
      .slice(0, limit);
  };

  const getUnsyncedScores = (): HighScore[] => {
    return highScores.filter(score => !score.synced);
  };

  const markAsSynced = async (id: string) => {
    const updatedScores = highScores.map(score =>
      score.id === id ? { ...score, synced: true } : score
    );
    await saveScores(updatedScores);
  };

  const clearAllScores = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      setHighScores([]);
    } catch (error) {
      console.error('Error clearing scores:', error);
    }
  };

  const value: OfflineStorageContextType = {
    highScores,
    addHighScore,
    getTopScores,
    getTopScoresToday,
    clearAllScores,
    getUnsyncedScores,
    markAsSynced,
    isLoaded,
  };

  return (
    <OfflineStorageContext.Provider value={value}>
      {children}
    </OfflineStorageContext.Provider>
  );
};

export const useOfflineStorage = () => {
  const context = useContext(OfflineStorageContext);
  if (context === undefined) {
    throw new Error('useOfflineStorage must be used within an OfflineStorageProvider');
  }
  return context;
};
