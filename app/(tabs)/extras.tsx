import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Fire } from 'phosphor-react-native';
import React, { useCallback, useEffect, useState, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import InfiniteGameScreen from '@/app/(games)/infinite-game';
import StreakModal from '@/components/modals/StreakModal';
import TutorialOverlay from '@/components/TutorialOverlay';
import { useFontContext } from '@/contexts/FontsContext';
import { useTutorial } from '@/contexts/TutorialContext';

export default function ExtrasScreen() {
  const { fontsLoaded } = useFontContext();
  const { setDynamicSpotlight } = useTutorial();
  const [showStreak, setShowStreak] = useState(false);
  const [streak, setStreak] = useState(0);

  const streakRef = useRef<View>(null);

  const measureStreak = () => {
    if (streakRef.current) {
      // Esperamos un segundo a que la pantalla cargue para que la medida no sea 0
      setTimeout(() => {
        streakRef.current?.measure((x, y, w, h, pageX, pageY) => {
          setDynamicSpotlight('infinite_streak', { x: pageX, y: pageY, w, h, radius: 16 });
        });
      }, 1000);
    }
  };

  const PLAY_DAYS_STORAGE_KEY = 'infiniteGamePlayDays';

  const toISODate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const computeCurrentStreak = (dates: string[], today: Date = new Date()) => {
    const set = new Set(dates);
    let count = 0;
    const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    while (set.has(toISODate(cursor))) {
      count += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  };

  const loadStreak = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(PLAY_DAYS_STORAGE_KEY);
      const days: string[] = raw ? JSON.parse(raw) : [];
      setStreak(computeCurrentStreak(days));
    } catch (e) {
      console.error('Failed to load streak', e);
    }
  }, []);

  useEffect(() => {
    loadStreak();
  }, [loadStreak]);

  useFocusEffect(
    useCallback(() => {
      loadStreak();
    }, [loadStreak])
  );

  if (!fontsLoaded) return null;

  return (
    <View style={styles.container}>
      {/* Reuse Infinite Game screen UI */}
      <InfiniteGameScreen onPlayedToday={() => {}} />

      <TutorialOverlay />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlaySafeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  topRightOverlay: {
    paddingHorizontal: 16,
    paddingTop: 8,
    alignItems: 'flex-end',
  },
  streakButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  streakText: {
    color: '#fff',
    fontSize: 16,
    letterSpacing: 1,
  },
});
