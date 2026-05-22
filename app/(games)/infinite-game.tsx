import { FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import LottieView from 'lottie-react-native';
import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Vibration,
  View,
  Easing,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AnimatedMathBackground from '@/components/ui/AnimatedMathBackground';
import InfiniteGameModeButton from '@/components/ui/InfiniteGameModeButton';
import { LayeredAvatar } from '@/components/LayeredAvatar';
import { useAuth } from '@/contexts/AuthContext';
import { useAvatar } from '@/contexts/AvatarContext';
import { useFontContext } from '@/contexts/FontsContext';
import { useOfflineStorage } from '@/contexts/OfflineStorageContext';
import { TUTORIAL_STEPS, useTutorial } from '@/contexts/TutorialContext';
import { updateUserStreak } from '@/services/SupabaseService';
import {
  generateQuestion,
  getDifficultyFromScore,
  getRandomCategory
} from '@/utils/generateQuestions';

const { width, height } = Dimensions.get('window');
const isSmallScreen = height < 750;
const scaleFactor = isSmallScreen ? 0.82 : 1.0; // Adjusted for better fit on all devices

// Mascot animations
const mascotAnimations = {
  Suma: require('@/assets/lotties/mascots/Plusito/1v1_Idle.json'),
  Resta: require('@/assets/lotties/mascots/Restin/1v1_Idle.json'),
  Multiplicación: require('@/assets/lotties/mascots/Porfix/1v1_Idle.json'),
  División: require('@/assets/lotties/mascots/Dividin/1v1_Idle.json'),
  Totalin: require('@/assets/lotties/mascots/Totalin/1v1_Idle.json'),
};

// Custom numpad layout
const NUMPAD = [
  [1, 2, 3],
  [4, 5, 6],
  [7, 8, 9],
  ['−', 0, '⌫'],
];

type GameMode = number; // Time in minutes

const CATEGORIES = [
  { id: 'Suma', name: 'SUMAS', lottie: mascotAnimations.Suma, colors: ['#4ade80', '#22c55e'] },
  { id: 'Resta', name: 'RESTAS', lottie: mascotAnimations.Resta, colors: ['#60a5fa', '#3b82f6'] },
  { id: 'Multiplicación', name: 'MULTIPLICACIÓN', lottie: mascotAnimations.Multiplicación, colors: ['#f87171', '#ef4444'] },
  { id: 'División', name: 'DIVISIÓN', lottie: mascotAnimations.División, colors: ['#facc15', '#eab308'] },
  { id: 'mix', name: 'TODO EN UNO', icon: 'brain', colors: ['#9333ea', '#7e22ce'] },
];

const TIMES = [
  { id: 0.5, name: '30 SEG' },
  { id: 1, name: '1 MIN' },
  { id: 2, name: '2 MIN' },
  { id: 3, name: '3 MIN' },
];

const DIFFICULTIES = [
  { id: 1, name: 'PRINCIPIANTE' },
  { id: 2, name: 'EXPERTO' }
];

type InfiniteGameProps = {
  onPlayedToday?: () => void;
};

const PLAY_DAYS_STORAGE_KEY = 'infiniteGamePlayDays';

function toISODate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function recordPlayDay(): Promise<void> {
  try {
    const todayKey = toISODate(new Date());
    const existing = await AsyncStorage.getItem(PLAY_DAYS_STORAGE_KEY);
    const arr: string[] = existing ? JSON.parse(existing) : [];
    if (!arr.includes(todayKey)) {
      arr.push(todayKey);
      await AsyncStorage.setItem(PLAY_DAYS_STORAGE_KEY, JSON.stringify(arr));
    }
  } catch (e) {
    console.error('Failed to record play day', e);
  }
}

export default function InfiniteGameScreen({ onPlayedToday }: InfiniteGameProps) {
  const { fontsLoaded } = useFontContext();

  const renderQuestionText = (text: string) => {
    if (!text) return '';
    if (text.includes('÷')) {
      const parts = text.split('÷');
      return (
        <Text>
          {parts.map((part, idx) => (
            <React.Fragment key={idx}>
              {part}
              {idx < parts.length - 1 && (
                <Text style={{ fontFamily: 'Gilroy-Black' }}>÷</Text>
              )}
            </React.Fragment>
          ))}
        </Text>
      );
    }
    return text;
  };

  const safeHaptic = (style: Haptics.ImpactFeedbackStyle) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(style).catch(() => {});
    }
  };

  const { avatar: userAvatar } = useAvatar();
  const { user } = useAuth();
  const { addHighScore, getTopScores, getTopScoresToday, highScores } = useOfflineStorage();
  const { setDynamicSpotlight, isVisible, currentStepIndex, startTutorial } = useTutorial();

  // Tutorial spotlights (Modo Infinito)
  // Use section-level refs (title + controls) for stable, "fixed" spotlights.
  const operationSectionRef = useRef<View>(null);
  const timeSectionRef = useRef<View>(null);
  const difficultySectionRef = useRef<View>(null);
  const startSectionRef = useRef<View>(null);
  const selectionScrollRef = useRef<ScrollView>(null);
  const scrollOffsetYRef = useRef(0);
  const [scrollViewportH, setScrollViewportH] = useState(0);
  const lastEnsureKeyRef = useRef<string | null>(null);
  const [sectionLayout, setSectionLayout] = useState<Record<string, { y: number; h: number }>>({});

  // Game state
  const [gameMode, setGameMode] = useState<GameMode | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('Suma');
  const [selectedDifficulty, setSelectedDifficulty] = useState(1);
  const [currentDifficulty, setCurrentDifficulty] = useState(1);
  const [selectedTime, setSelectedTime] = useState<number | null>(0.5);
  const [timeLeft, setTimeLeft] = useState(0);
  const [score, setScore] = useState(0);
  const [wrongAnswers, setWrongAnswers] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [isGameActive, setIsGameActive] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [answerHistory, setAnswerHistory] = useState<Array<{
    question: string;
    userAnswer: string;
    correctAnswer: number;
    isCorrect: boolean;
    timestamp: number;
  }>>([]);
  const [correctFlash, setCorrectFlash] = useState(false);
  const [incorrectFlash, setIncorrectFlash] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  // Leaderboard modal
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  
  // Alias input for game end
  const [aliasInput, setAliasInput] = useState('');
  const [isExiting, setIsExiting] = useState(false);
  const [gameOverStats, setGameOverStats] = useState({ score: 0, questionsAnswered: 0, accuracy: 0 });

  const [newRankData, setNewRankData] = useState<{ name: string; icon: string | null; color: string } | null>(null);
  const [unlockedFrameImage, setUnlockedFrameImage] = useState<string | null>(null);

  // Countdown state
  const [countdown, setCountdown] = useState(3);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const countdownScale = useRef(new Animated.Value(1)).current;
  const countdownOpacity = useRef(new Animated.Value(1)).current;

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const mascotPulse = useRef(new Animated.Value(1)).current;
  const ringRotation = useRef(new Animated.Value(0)).current;

  // Mascot Animations
  useEffect(() => {
    // Pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(mascotPulse, { toValue: 1.15, duration: 2500, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(mascotPulse, { toValue: 1, duration: 2500, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ])
    ).start();

    // Rotation
    Animated.loop(
      Animated.timing(ringRotation, { toValue: 1, duration: 10000, useNativeDriver: true, easing: Easing.linear })
    ).start();
  }, []);

  const spin = ringRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  const spinRev = ringRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['360deg', '0deg'],
  });

  // Theme based on selection
  const currentTheme = useMemo(() => {
    const cat = CATEGORIES.find(c => c.id === selectedCategory);
    return cat?.colors || ['#31C45A', '#8A56FE'];
  }, [selectedCategory]);

  const themeColor = useMemo(() => {
    return currentTheme[0];
  }, [currentTheme]);

  const bestScore = useMemo(() => {
    const relevant = highScores.filter((s: any) => 
      s.category === selectedCategory && 
      s.difficulty === selectedDifficulty &&
      s.mode === selectedTime
    );
    if (relevant.length === 0) return 0;
    return Math.max(...relevant.map((s: any) => s.score));
  }, [highScores, selectedCategory, selectedDifficulty, selectedTime]);

  // Timer ref
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Refs to track current score for endGame
  const scoreRef = useRef(0);
  const questionsAnsweredRef = useRef(0);

  const measureRef = (
    id: string,
    ref: React.RefObject<any>,
    radius: number,
    padding: number = 10
  ) => {
    if (!ref.current) return;
    ref.current.measure((x: any, y: any, w: any, h: any, pageX: any, pageY: any) => {
      const pad = Math.max(0, padding);
      const sx = Math.max(pageX - pad, 0);
      const sy = Math.max(pageY - pad, 0);
      const sw = Math.min(w + pad * 2, width - sx);
      const sh = Math.min(h + pad * 2, height - sy);

      setDynamicSpotlight(id, {
        x: sx,
        y: sy,
        w: sw,
        h: sh,
        radius: radius + Math.min(pad, 14),
      });
    });
  };

  const getSectionRef = (id: string): React.RefObject<any> | null => {
    switch (id) {
      case 'infinite_operation': return operationSectionRef;
      case 'infinite_time': return timeSectionRef;
      case 'infinite_difficulty': return difficultySectionRef;
      case 'infinite_start': return startSectionRef;
      default: return null;
    }
  };

  const ensureSectionVisible = (stepId: string) => {
    if (!selectionScrollRef.current) return;
    if (scrollViewportH <= 0) return;

    const entry = sectionLayout[stepId];
    if (!entry) return;

    const sectionTopInViewport = entry.y - scrollOffsetYRef.current;
    const sectionBottomInViewport = sectionTopInViewport + entry.h;

    // Margins so it looks good with the tutorial card
    const marginTop = 140;   // card is at top for these steps
    const marginBottom = 80;

    const alreadyVisible =
      sectionTopInViewport >= marginTop &&
      sectionBottomInViewport <= scrollViewportH - marginBottom;
    if (alreadyVisible) return;

    // Anchor the section's center around a stable viewport position (not too low).
    const anchor =
      stepId === 'infinite_start'
        ? 0.62
        : 0.42; // time/difficulty higher so they don't end up "muy abajo"

    const sectionCenterY = entry.y + entry.h / 2;
    const desiredCenterY = scrollViewportH * anchor;
    const targetScrollY = Math.max(sectionCenterY - desiredCenterY, 0);

    // Avoid huge jumps; it should feel like a gentle assist.
    const delta = targetScrollY - scrollOffsetYRef.current;
    const clampedDelta = Math.max(Math.min(delta, 260), -260);
    const nextY = Math.max(scrollOffsetYRef.current + clampedDelta, 0);

    selectionScrollRef.current.scrollTo({ y: nextY, animated: true });
  };

  const measureAll = useCallback(() => {
    const stepId = TUTORIAL_STEPS?.[currentStepIndex]?.id as string | undefined;
    if (!stepId) return;

    if (
      stepId !== 'infinite_operation' &&
      stepId !== 'infinite_time' &&
      stepId !== 'infinite_difficulty' &&
      stepId !== 'infinite_start'
    ) return;

    const ref = getSectionRef(stepId);
    if (!ref) return;

    const pad = stepId === 'infinite_start' ? 14 : 12;
    const rad =
      stepId === 'infinite_operation' ? 24 :
      stepId === 'infinite_start' ? 30 :
      20;

    measureRef(stepId, ref, rad, pad);
    ensureSectionVisible(stepId);
  }, [currentStepIndex, isVisible]);

  // When a tutorial step is on the selection screen, measure the highlighted control.
  useEffect(() => {
    if (!isVisible || gameMode) return;
    const t = setTimeout(measureAll, 200);
    return () => clearTimeout(t);
  }, [isVisible, currentStepIndex, gameMode, measureAll]);

  // Re-measure on tutorial visibility change
  useEffect(() => {
    if (isVisible) {
      const t = setTimeout(measureAll, 600);
      return () => clearTimeout(t);
    }
  }, [isVisible, measureAll]);


  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Save answer history to AsyncStorage
  const saveAnswerHistory = async (history: typeof answerHistory) => {
    try {
      await AsyncStorage.setItem('infiniteGameAnswerHistory', JSON.stringify(history));
    } catch (error) {
      console.error('Error saving answer history:', error);
    }
  };

  // Load answer history from AsyncStorage
  useEffect(() => {
    const loadAnswerHistory = async () => {
      try {
        const savedHistory = await AsyncStorage.getItem('infiniteGameAnswerHistory');
        if (savedHistory) {
          setAnswerHistory(JSON.parse(savedHistory));
        }
      } catch (error) {
        console.error('Error loading answer history:', error);
      }
    };
    loadAnswerHistory();
  }, []);

  const startGame = (mode: number, category?: string, diff?: number) => {
    const finalCategory = category || selectedCategory;
    const finalDiff = diff || selectedDifficulty;
    
    setGameMode(mode);
    // Don't overwrite category/difficulty if they are already set in state
    if (category) setSelectedCategory(category);
    if (diff) {
      setSelectedDifficulty(diff);
      setCurrentDifficulty(diff);
    } else {
      setCurrentDifficulty(selectedDifficulty);
    }
    
    setTimeLeft(mode * 60); // Convert minutes to seconds
    setScore(0);
    scoreRef.current = 0;
    setWrongAnswers(0);
    setQuestionsAnswered(0);
    questionsAnsweredRef.current = 0;
    setAnswerHistory([]);
    setUserAnswer('');
    setGameEnded(false);
    setIsGameActive(true);
    setShowGameOverModal(false);
    
    // Reset visual feedback
    setCorrectFlash(false);
    setIncorrectFlash(false);
    flashOpacity.setValue(0);
    
    // Reset refs
    scoreRef.current = 0;
    questionsAnsweredRef.current = 0;
    
    generateNewQuestion(finalCategory, finalDiff);
    
    // Start countdown instead of immediate timer
    setIsCountingDown(true);
    setCountdown(3);
    countdownScale.setValue(1);
    countdownOpacity.setValue(1);

    // Record that the user played today and notify parent
    recordPlayDay().finally(() => {
      try { onPlayedToday && onPlayedToday(); } catch {}
    });
  };

  // Countdown effect
  useEffect(() => {
    if (!isCountingDown) return;

    // Pulse animation for the current number
    Animated.sequence([
      Animated.parallel([
        Animated.timing(countdownScale, { toValue: 2, duration: 800, useNativeDriver: true }),
        Animated.timing(countdownOpacity, { toValue: 0, duration: 800, useNativeDriver: true }),
      ])
    ]).start();

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsCountingDown(false);
          startTimer(); // START GAME TIMER HERE
          return 0;
        }
        
        // Reset animations for next number
        countdownScale.setValue(1);
        countdownOpacity.setValue(1);
        
        Animated.sequence([
          Animated.parallel([
            Animated.timing(countdownScale, { toValue: 2, duration: 800, useNativeDriver: true }),
            Animated.timing(countdownOpacity, { toValue: 0, duration: 800, useNativeDriver: true }),
          ])
        ]).start();

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isCountingDown]);

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Use a small delay to ensure state updates are captured
          setTimeout(() => endGame(), 100);
          return 0;
        }
        return prev - 1;
      });
    }, 1000) as unknown as NodeJS.Timeout;
  };

  const togglePause = () => {
    if (!isGameActive || gameEnded || isCountingDown) return;
    
    if (isPaused) {
      // Resume
      setIsPaused(false);
      startTimer();
    } else {
      // Pause
      setIsPaused(true);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const generateNewQuestion = (forceCat?: string, forceDiff?: number) => {
    const baseDiff = forceDiff || selectedDifficulty;
    const baseCat = forceCat || selectedCategory;

    // Progressive difficulty logic
    let dynamicDiff = baseDiff;
    if (baseDiff === 1) {
      if (score >= 20) dynamicDiff = 2;
    }

    setCurrentDifficulty(dynamicDiff);

    const currentCat = baseCat === 'mix' ? getRandomCategory() : baseCat;
    
    // Create a truly fresh question
    const question = generateQuestion(currentCat as any, dynamicDiff as any);
    
    // Force state update with a new object reference
    setCurrentQuestion({ ...question, _timestamp: Date.now() });
    setUserAnswer('');
  };

  const checkAnswer = () => {
    if (!currentQuestion || !userAnswer.trim() || !isGameActive || wrongAnswers >= 3) return;

    const userNum = parseInt(userAnswer.trim());
    const isCorrect = userNum === currentQuestion.correctAnswer;

    // Save answer to history
    const newAnswer = {
      question: currentQuestion.question,
      userAnswer: userAnswer.trim(),
      correctAnswer: currentQuestion.correctAnswer,
      isCorrect,
      timestamp: Date.now(),
    };
    
    const updatedHistory = [...answerHistory, newAnswer];
    setAnswerHistory(updatedHistory);
    saveAnswerHistory(updatedHistory);

    if (isCorrect) {
      // Correct answer
      setScore(prev => {
        const newScore = prev + 1;
        scoreRef.current = newScore;
        return newScore;
      });
      setQuestionsAnswered(prev => {
        const newCount = prev + 1;
        questionsAnsweredRef.current = newCount;
        return newCount;
      });
      
      // Flash screen green
      setCorrectFlash(true);
      Animated.sequence([
        Animated.timing(flashOpacity, { toValue: 0.3, duration: 50, useNativeDriver: true }),
        Animated.timing(flashOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();

      // Pulse animation for correct answer
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();

      setTimeout(() => setCorrectFlash(false), 250);

      // Generate new question after a short delay
      setTimeout(() => {
        generateNewQuestion();
      }, 300); // Super fast transition
    } else {
      // Wrong answer
      setWrongAnswers(prev => prev + 1);
      setQuestionsAnswered(prev => {
        const newCount = prev + 1;
        questionsAnsweredRef.current = newCount;
        return newCount;
      });

      // Clear answer immediately so they can type the NEXT one
      setUserAnswer('');

      // Flash screen red
      setIncorrectFlash(true);
      Animated.sequence([
        Animated.timing(flashOpacity, { toValue: 0.5, duration: 50, useNativeDriver: true }),
        Animated.timing(flashOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();

      // Shake animation for wrong answer
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 20, duration: 40, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -20, duration: 40, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 20, duration: 40, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -20, duration: 40, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
      ]).start();

      if (Platform.OS !== 'web') {
        Vibration.vibrate([0, 100, 50, 100]);
      }
      setTimeout(() => setIncorrectFlash(false), 600);

      // Check if game should end (3 wrong answers)
      if (wrongAnswers + 1 >= 3) {
        setTimeout(() => {
          endGame();
        }, 800);
      } else {
        // Generate new question after delay
        setTimeout(() => {
          generateNewQuestion();
        }, 800); // Reduced from 1200ms
      }
    }
  };

  const endGame = async () => {
    setIsGameActive(false);
    setGameEnded(true);
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Use refs to get the most current values
    const finalQuestionsAnswered = questionsAnsweredRef.current;
    const finalScore = scoreRef.current;
    const accuracy = finalQuestionsAnswered > 0 ? (finalScore / finalQuestionsAnswered) * 100 : 0;

    // Store stats for modal
    setGameOverStats({
      score: finalScore,
      questionsAnswered: finalQuestionsAnswered,
      accuracy
    });

    // Show game over modal with alias input
    setShowGameOverModal(true);
  };

  const saveGameScore = async () => {
    if (user && gameMode) {
      try {
        await addHighScore({
          score: scoreRef.current,
          mode: gameMode as any,
          username: user.username || aliasInput || 'Invitado',
          questionsAnswered: questionsAnsweredRef.current,
          accuracy: questionsAnsweredRef.current > 0 ? (scoreRef.current / questionsAnsweredRef.current) * 100 : 0,
          category: selectedCategory,
          difficulty: selectedDifficulty
        });
        
        await updateUserStreak();
      } catch (err) {
        console.error("Error saving score/streak:", err);
      }
    }

    // Reset for next game
    // Note: We don't close modal here, we wait for user to press "SALIR" or "REINTENTAR"
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleNumpadPress = (val: string | number) => {
    safeHaptic(Haptics.ImpactFeedbackStyle.Light);
    
    if (val === '⌫') {
      // Backspace
      setUserAnswer(prev => prev.slice(0, -1));
    } else if (val === '−') {
      // Toggle negative sign - ALLOWED IF CURRENT DIFFICULTY IS 3
      if (currentDifficulty !== 3) return;
      
      setUserAnswer(prev => {
        if (prev.startsWith('-')) {
          return prev.slice(1);
        } else if (prev === '') {
          return '-';
        } else {
          return '-' + prev;
        }
      });
    } else {
      // Number key
      setUserAnswer(prev => prev + val);
    }
  };

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  // Mode selection screen
  if (!gameMode) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[themeColor, '#8A56FE']}
          style={styles.gradientBackground}
        />
        <AnimatedMathBackground />

        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
          {/* 1. Top Section: Title & Mascot */}
          <View style={styles.topSection}>
            <View style={styles.titleInfo}>
              <Text style={[styles.mainTitleSmall, { fontFamily: 'Digitalt' }]}>MODO INFINITO</Text>
            </View>
            
            {/* Mascot Stage: Styled like Avatar Container */}
            <View style={styles.headerMascot}>
               {/* Background Glow */}
               <Animated.View style={[
                 styles.mascotGlowMini, 
                 { 
                   backgroundColor: themeColor,
                   shadowColor: themeColor,
                   transform: [{ scale: mascotPulse }],
                   opacity: 0.15
                 }
               ]} />
               
               {/* Avatar-style circular container */}
               <View style={[styles.avatarStyleContainer, { borderColor: themeColor + '60' }]}>
                  <LinearGradient
                    colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.05)']}
                    style={styles.avatarStyleGradient}
                  />
               </View>
               
               {CATEGORIES.find(c => c.id === selectedCategory)?.lottie ? (
                  <Animated.View style={{ transform: [{ scale: mascotPulse }], zIndex: 3 }}>
                    <LottieView
                      source={CATEGORIES.find(c => c.id === selectedCategory)?.lottie}
                      autoPlay
                      loop
                      style={styles.miniMascot}
                    />
                  </Animated.View>
               ) : CATEGORIES.find(c => c.id === selectedCategory)?.icon ? (
                  <Animated.View style={{ transform: [{ scale: mascotPulse }], zIndex: 3 }}>
                    <FontAwesome5 
                      name={CATEGORIES.find(c => c.id === selectedCategory)?.icon} 
                      size={32} 
                      color="#fff" 
                      style={{ textShadowColor: themeColor, textShadowRadius: 10 }}
                    />
                  </Animated.View>
               ) : null}
            </View>
          </View>

          {/* 2. Selection Area (Flex-Grow to fill space) */}
          <View style={styles.centerSection}>
            <View style={styles.glassCard}>
               <LinearGradient
                  colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.05)']}
                  style={styles.glassGradient}
               >
                  {/* Operations Grid */}
                  <View style={styles.sectionInner} ref={operationSectionRef}>
                    <Text style={[styles.miniLabel, { fontFamily: 'Gilroy-Black' }]}>¿QUÉ VAMOS A PRACTICAR?</Text>
                    <View style={styles.operationGrid}>
                      {CATEGORIES.map(cat => (
                         <TouchableOpacity 
                          key={cat.id}
                          onPress={() => {
                            safeHaptic(Haptics.ImpactFeedbackStyle.Medium);
                            setSelectedCategory(cat.id);
                          }}
                          style={[
                            styles.opCard,
                            selectedCategory === cat.id && { backgroundColor: themeColor, borderColor: '#fff' }
                          ]}
                         >
                            <Text style={[styles.opText, { fontFamily: 'Digitalt' }]}>{cat.name}</Text>
                          </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.dividerHorizontal} />

                  {/* Settings Panel */}
                  <View style={styles.settingsPanel}>
                     <View style={styles.setGroup} ref={timeSectionRef}>
                        <Text style={[styles.miniLabel, { fontFamily: 'Gilroy-Black' }]}>TIEMPO</Text>
                        <View style={styles.chipRow}>
                           {TIMES.map(t => (
                              <TouchableOpacity 
                               key={t.id}
                               onPress={() => {
                                 safeHaptic(Haptics.ImpactFeedbackStyle.Light);
                                 setSelectedTime(t.id);
                               }}
                               style={[styles.chipLarge, selectedTime === t.id && { backgroundColor: themeColor }]}
                              >
                                 <Text style={[styles.chipTextLarge, { fontFamily: 'Digitalt', color: selectedTime === t.id ? '#fff' : 'rgba(255,255,255,0.7)' }]}>{t.name}</Text>
                              </TouchableOpacity>
                           ))}
                        </View>
                     </View>

                     <View style={styles.dividerSpacer} />

                     <View style={styles.setGroup} ref={difficultySectionRef}>
                        <Text style={[styles.miniLabel, { fontFamily: 'Gilroy-Black' }]}>NIVEL</Text>
                        <View style={styles.chipRow}>
                          {DIFFICULTIES.map(d => {
                            const isSelected = selectedDifficulty === d.id;
                            let diffColor = '#22C55E'; // Default Principiante (id: 1)
                            if (d.id === 2) diffColor = '#F97316'; // Experto (Orange)

                            return (
                              <TouchableOpacity 
                                key={d.id}
                                onPress={() => {
                                  safeHaptic(Haptics.ImpactFeedbackStyle.Medium);
                                  setSelectedDifficulty(d.id);
                                  setCurrentDifficulty(d.id);
                                }}
                                style={[
                                  styles.chipLarge, 
                                  isSelected && { backgroundColor: diffColor, borderColor: '#fff' }
                                ]}
                              >
                                  <Text style={[
                                    styles.chipTextLarge, 
                                    { fontFamily: 'Digitalt', color: isSelected ? '#fff' : 'rgba(255,255,255,0.7)' }
                                  ]}>{d.name}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                     </View>
                  </View>
               </LinearGradient>
            </View>
          </View>

          {/* 3. Bottom Section: Action & Footer */}
          <View style={styles.bottomSection}>
            <TouchableOpacity 
              style={styles.actionBtn}
              onPress={() => selectedTime && startGame(selectedTime)}
              activeOpacity={0.8}
              ref={startSectionRef}
            >
              <LinearGradient 
                colors={['#22C55E', '#16A34A']} 
                style={styles.actionGradient}
              >
                <FontAwesome5 name="play" size={18} color="#fff" />
                <Text style={[styles.actionBtnText, { fontFamily: 'Digitalt' }]}>¡A JUGAR!</Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.utilFooter}>
              <TouchableOpacity style={styles.utilIconBtn} onPress={() => startTutorial('infinite')}>
                <FontAwesome5 name="info-circle" size={20} color="#fff" />
                <Text style={[styles.utilIconText, { fontFamily: 'Gilroy-Black' }]}>CÓMO JUGAR</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // Game screen
  return (
    <Modal
      visible={isGameActive || gameEnded}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={() => {
        setIsGameActive(false);
        setGameEnded(false);
        setGameMode(null);
      }}
    >
      <View style={styles.container}>
      <LinearGradient
        colors={['#A855F7', '#7C3AED']}
        style={styles.gradientBackground}
      />
      <AnimatedMathBackground />

      <SafeAreaView style={styles.safeArea}>
        {/* Countdown Overlay */}
        {isCountingDown && (
          <View style={styles.countdownOverlay}>
            <Animated.Text 
              style={[
                styles.countdownText, 
                { 
                  fontFamily: 'Digitalt',
                  transform: [{ scale: countdownScale }],
                  opacity: countdownOpacity
                }
              ]}
            >
              {countdown}
            </Animated.Text>
          </View>
        )}
        {/* Top bar with timer and score */}
        <View style={styles.gameTopBar}>
          <TouchableOpacity 
            style={styles.pauseButton}
            onPress={() => {
              if (isGameActive && !gameEnded && !isCountingDown) {
                togglePause();
              } else {
                setGameMode(null);
                setIsGameActive(false);
              }
            }}
          >
            <LinearGradient
              colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.1)']}
              style={styles.pauseButtonGradient}
            >
              <FontAwesome5 name={isGameActive && !gameEnded ? "pause" : "arrow-left"} size={16} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
          
          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Text style={[styles.statLabel, { fontFamily: 'Digitalt' }]}>TIEMPO</Text>
              <Text style={[styles.statValue, { fontFamily: 'Digitalt' }]}>{formatTime(timeLeft)}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statLabel, { fontFamily: 'Digitalt' }]}>PUNTOS</Text>
              <Text style={[styles.statValue, { fontFamily: 'Digitalt' }]}>{score}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statLabel, { fontFamily: 'Digitalt' }]}>VIDAS</Text>
              <View style={styles.heartsRow}>
                {[1, 2, 3].map((h) => (
                  <FontAwesome5 
                    key={h} 
                    name="heart" 
                    size={16} 
                    color={h > 3 - wrongAnswers ? '#4b5563' : '#ef4444'} 
                    solid={h <= 3 - wrongAnswers}
                    style={h > 3 - wrongAnswers ? styles.heartBroken : null}
                  />
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Visual Feedback Overlays */}
        <Animated.View 
          pointerEvents="none"
          style={[
            styles.flashOverlay, 
            { 
              backgroundColor: correctFlash ? '#22c55e' : (incorrectFlash ? '#ef4444' : 'transparent'),
              opacity: flashOpacity 
            }
          ]} 
        />

        {correctFlash && (
          <View pointerEvents="none" style={styles.feedbackIconOverlay}>
            <FontAwesome5 name="check-circle" size={100} color="#22c55e" />
          </View>
        )}
        {incorrectFlash && (
          <View pointerEvents="none" style={styles.feedbackIconOverlay}>
            <FontAwesome5 name="times-circle" size={100} color="#ef4444" />
          </View>
        )}

        {/* Main Content - Using Proportion-based layout */}
        <View style={styles.gameMainWrapper}>
          {/* Question area (Proportional) */}
          <View style={styles.gameQuestionSection}>
            <View style={styles.mascotsRow}>
              {Object.entries(mascotAnimations).map(([key, animation]) => {
                const isActive = key === selectedCategory || (selectedCategory === 'mix' && (key === 'Totalin' || key === currentQuestion?.category));
                return (
                  <View key={key} style={styles.mascotWrapper}>
                    <LottieView
                      source={animation}
                      autoPlay={Platform.OS === 'web' ? isActive : true}
                      loop={Platform.OS === 'web' ? isActive : true}
                      style={styles.mascotAnimation}
                    />
                  </View>
                );
              })}
            </View>

            <View style={styles.questionContainer}>
              {currentQuestion && (
                <Animated.View style={[
                  styles.questionBox,
                  { 
                    transform: [
                      { scale: pulseAnim },
                      { translateX: shakeAnim }
                    ]
                  }
                ]}>
                  <Text style={[styles.categoryText, { fontFamily: 'Digitalt' }]}>
                    {currentQuestion.category}
                  </Text>
                  <Text style={[styles.questionText, { fontFamily: 'Digitalt' }]}>
                    {renderQuestionText(currentQuestion.question)}
                  </Text>
                </Animated.View>
              )}
            </View>
          </View>

          {/* Answer Display (Proportional) */}
          <View style={styles.gameAnswerSection}>
            <Animated.View style={[
              styles.answerDisplay,
              { transform: [{ scale: pulseAnim }] }
            ]}>
              <Text style={[
                styles.answerText,
                userAnswer === '' && styles.answerTextEmpty,
                correctFlash && styles.answerTextCorrectFlash,
                { fontFamily: 'Digitalt' }
              ]}>
                {userAnswer || '0'}
              </Text>
            </Animated.View>
          </View>

          {/* Controls section (Proportional) */}
          <View style={styles.gameControlsSection}>
            <View style={styles.numpadContainer}>
              {NUMPAD.map((row, i) => (
                <View key={i} style={styles.numpadRow}>
                  {row.map((val, j) => {
                    const isNegative = val === '−';
                    const isDisabledNegative = isNegative && currentDifficulty !== 3;
                    
                    return (
                      <TouchableOpacity
                        key={j}
                        style={[
                          styles.numpadButton,
                          isDisabledNegative && { opacity: 0.3 }
                        ]}
                        onPress={() => {
                          if (!isDisabledNegative) {
                            safeHaptic(Haptics.ImpactFeedbackStyle.Light);
                            handleNumpadPress(val);
                          }
                        }}
                        disabled={isDisabledNegative}
                      >
                        <View style={styles.numpadButtonInner}>
                          <Text style={[styles.numpadButtonText, { fontFamily: 'Digitalt' }]}>
                            {val}
                          </Text>
                        </View>
                        <View style={styles.numpadButtonShadow} />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.submitButton, (!userAnswer.trim() || !isGameActive || wrongAnswers >= 3) && styles.submitButtonDisabled]}
              onPress={checkAnswer}
              disabled={!userAnswer.trim() || !isGameActive || wrongAnswers >= 3}
            >
              <LinearGradient
                colors={(userAnswer.trim() && isGameActive && wrongAnswers < 3) ? ['#FFA65A', '#FF5EA3'] : ['#666', '#444']}
                style={styles.submitButtonGradient}
              >
                <Text style={[styles.submitButtonText, { fontFamily: 'Digitalt' }]}>
                  ENVIAR
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {/* Removed confetti overlay per request */}

      

      {/* Game Over Modal with Alias Input */}
      <Modal
        visible={showGameOverModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.gameOverModal}>
            <Text style={[styles.gameOverTitle, { fontFamily: 'Digitalt' }]}>
              ¡JUEGO TERMINADO!
            </Text>
            
            <View style={styles.gameOverStatsContainer}>
              <View style={styles.gameOverStatItem}>
                <Text style={[styles.gameOverStatValue, { fontFamily: 'Digitalt' }]}>
                  {gameOverStats.score}
                </Text>
                <Text style={[styles.gameOverStatLabel, { fontFamily: 'Gilroy-Black' }]}>
                  Puntos
                </Text>
              </View>
              <View style={styles.gameOverStatItem}>
                <Text style={[styles.gameOverStatValue, { fontFamily: 'Digitalt' }]}>
                  {gameOverStats.score}/{gameOverStats.questionsAnswered}
                </Text>
                <Text style={[styles.gameOverStatLabel, { fontFamily: 'Gilroy-Black' }]}>
                  Correctas
                </Text>
              </View>
              <View style={styles.gameOverStatItem}>
                <Text style={[styles.gameOverStatValue, { fontFamily: 'Digitalt' }]}>
                  {gameOverStats.accuracy.toFixed(1)}%
                </Text>
                <Text style={[styles.gameOverStatLabel, { fontFamily: 'Gilroy-Black' }]}>
                  Precisión
                </Text>
              </View>
            </View>
            

            <View style={styles.gameOverButtons}>
              

              <TouchableOpacity
                style={styles.gameOverButton}
                onPress={() => {
                  saveGameScore();
                  if (gameMode) {
                    // Reset flashes before restarting
                    setCorrectFlash(false);
                    setIncorrectFlash(false);
                    flashOpacity.setValue(0);
                    startGame(gameMode);
                  }
                }}
              >
                <LinearGradient
                  colors={['#8EF06E', '#31C45A']}
                  style={styles.gameOverButtonGradient}
                >
                  <Text style={[styles.gameOverButtonText, { fontFamily: 'Digitalt' }]}>
                    JUGAR DE NUEVO
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.gameOverButton}
                onPress={() => {
                  saveGameScore();
                  // Reset all states to go back to MODE SELECTION (inside this screen)
                  setGameMode(null);
                  setIsGameActive(false);
                  setGameEnded(false);
                  setScore(0);
                  setWrongAnswers(0);
                  setQuestionsAnswered(0);
                  setUserAnswer('');
                  setShowGameOverModal(false);
                  
                  // Reset flashes
                  setCorrectFlash(false);
                  setIncorrectFlash(false);
                  flashOpacity.setValue(0);
                }}
              >
                <LinearGradient
                  colors={['#A855F7', '#7C3AED']}
                  style={styles.gameOverButtonGradient}
                >
                  <Text style={[styles.gameOverButtonText, { fontFamily: 'Digitalt' }]}>
                    VOLVER AL MENÚ
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Pause / Confirmation Modal */}
      <Modal
        visible={isPaused}
        transparent={true}
        animationType="fade"
        onRequestClose={togglePause}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.gameOverModal}>
            <Text style={[styles.gameOverTitle, { fontFamily: 'Digitalt' }]}>
              ¡JUEGO EN PAUSA!
            </Text>
            
            <Text style={[styles.aliasPrompt, { textAlign: 'center', alignSelf: 'center', marginBottom: 30, fontSize: 16 }]}>
              ¿Seguro que quieres salir?{'\n'}No se guardará el progreso actual.
            </Text>

            <View style={styles.gameOverButtons}>
              <TouchableOpacity
                style={styles.gameOverButton}
                onPress={togglePause}
              >
                <LinearGradient
                  colors={['#8EF06E', '#31C45A']}
                  style={styles.gameOverButtonGradient}
                >
                  <Text style={[styles.gameOverButtonText, { fontFamily: 'Digitalt' }]}>
                    CONTINUAR JUGANDO
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.gameOverButton}
                onPress={() => {
                  setIsPaused(false);
                  setIsGameActive(false);
                  setGameMode(null);
                  setGameEnded(false);
                }}
              >
                <LinearGradient
                  colors={['#FF6B6B', '#EE5253']}
                  style={styles.gameOverButtonGradient}
                >
                  <Text style={[styles.gameOverButtonText, { fontFamily: 'Digitalt' }]}>
                    SALIR DE LA PARTIDA
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradientBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: height,
  },
  safeArea: {
    flex: 1,
  },
  pauseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    marginRight: 12,
  },
  pauseButtonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdownText: {
    color: '#FFD616',
    fontSize: 120 * scaleFactor,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 4, height: 4 },
    textShadowRadius: 15,
  },
  gameTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    marginBottom: 10,
  },
  statsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20 * scaleFactor,
    paddingVertical: isSmallScreen ? 10 : 14,
    paddingHorizontal: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  statBox: {
    alignItems: 'center',
  },
  statLabel: {
    color: '#E0E7FF',
    fontSize: 10,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  statValue: {
    color: '#fff',
    fontSize: 22,
    letterSpacing: 1,
  },
  mascotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    position: 'absolute',
    top: isSmallScreen ? 20 : 35,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  mascotWrapper: {
    width: (width / 5) * scaleFactor, 
    height: 60 * scaleFactor, 
    marginHorizontal: 1,
  },
  gameMainWrapper: {
    flex: 1,
    width: '100%',
    justifyContent: 'space-between',
    paddingBottom: 15 * scaleFactor,
  },
  gameQuestionSection: {
    flex: 1.1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 10,
  },
  gameAnswerSection: {
    flex: 0.5,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gameControlsSection: {
    flex: 1.8,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mascotAnimation: {
    width: '100%',
    height: '100%',
  },
  questionContainer: {
    width: '100%',
    paddingTop: isSmallScreen ? 15 : 25,
  },
  questionBox: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 32,
    paddingVertical: 24 * scaleFactor, 
    paddingHorizontal: 32 * scaleFactor,
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  categoryText: {
    color: '#FFD45E',
    fontSize: 14 * scaleFactor,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 8 * scaleFactor,
  },
  questionText: {
    color: '#fff',
    fontSize: 28 * scaleFactor,
    fontWeight: 'bold',
    letterSpacing: 2,
    textAlign: 'center',
  },
  answerDisplay: {
    backgroundColor: '#fff',
    borderRadius: 22 * scaleFactor,
    paddingVertical: 8 * scaleFactor,
    paddingHorizontal: 30 * scaleFactor,
    width: '85%',
    alignItems: 'center',
    marginVertical: 10 * scaleFactor,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  answerText: {
    color: '#1E1B4B',
    fontSize: 38 * scaleFactor,
    letterSpacing: 3,
  },
  answerTextEmpty: {
    color: '#9ca3af',
  },
  answerTextCorrectFlash: {
    color: '#16a34a',
  },
  numpadContainer: {
    width: '100%',
    paddingHorizontal: 10,
  },
  numpadRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
    gap: 10,
  },
  numpadButton: {
    width: width * 0.22,
    height: 50 * scaleFactor,
    position: 'relative',
  },
  numpadButtonInner: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 18,
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    zIndex: 2,
  },
  numpadButtonShadow: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 18,
    width: '100%',
    height: '100%',
    position: 'absolute',
    bottom: -4,
    left: 0,
    zIndex: 1,
  },
  numpadButtonText: {
    color: '#fff',
    fontSize: 28,
  },
  submitButton: {
    width: '85%',
    height: 54 * scaleFactor,
    borderRadius: 18,
    overflow: 'hidden',
    marginTop: 20 * scaleFactor,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 22,
    letterSpacing: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gameOverModal: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
  },
  gameOverTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#A855F7',
    marginBottom: 20,
  },
  gameOverStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 25,
  },
  gameOverStatItem: {
    alignItems: 'center',
  },
  gameOverStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  gameOverStatLabel: {
    fontSize: 12,
    color: '#666',
  },
  aliasPrompt: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  gameOverButtons: {
    width: '100%',
    gap: 10,
  },
  gameOverButton: {
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
  },
  gameOverButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gameOverButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  heartsRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 8,
  },
  heartBroken: {
    opacity: 0.3,
    transform: [{ scale: 0.8 }],
  },
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9998,
  },
  feedbackIconOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  aliasInput: {
    width: '100%',
    height: 50,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 15,
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  topSection: {
    flex: 0.12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 25,
    paddingTop: 10,
  },
  titleInfo: {
    flex: 1,
  },
  mainTitleSmall: {
    color: '#fff',
    fontSize: isSmallScreen ? 20 : 26,
    letterSpacing: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 8,
  },
  recordPillSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: isSmallScreen ? 4 : 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignSelf: 'flex-start',
    paddingHorizontal: isSmallScreen ? 8 : 12,
    paddingVertical: isSmallScreen ? 2 : 4,
    borderRadius: 12,
    marginTop: isSmallScreen ? 2 : 6,
  },
  recordTextSmall: {
    color: '#FFD45E',
    fontSize: isSmallScreen ? 10 : 12,
  },
  headerMascot: {
    width: isSmallScreen ? 60 : 80,
    height: isSmallScreen ? 60 : 80,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarStyleContainer: {
    position: 'absolute',
    width: isSmallScreen ? 50 : 70,
    height: isSmallScreen ? 50 : 70,
    borderRadius: isSmallScreen ? 25 : 35,
    overflow: 'hidden',
    borderWidth: isSmallScreen ? 1.5 : 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    zIndex: 1,
  },
  avatarStyleGradient: {
    flex: 1,
  },
  mascotGlowMini: {
    position: 'absolute',
    width: isSmallScreen ? 40 : 60,
    height: isSmallScreen ? 40 : 60,
    borderRadius: isSmallScreen ? 20 : 30,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: isSmallScreen ? 15 : 25,
    elevation: 20,
  },
  miniMascot: {
    width: isSmallScreen ? 75 : 100,
    height: isSmallScreen ? 75 : 100,
    zIndex: 3,
  },
  centerSection: {
    flex: 0.65,
    paddingHorizontal: isSmallScreen ? 12 : 16,
    justifyContent: 'center',
  },
  glassCard: {
    borderRadius: isSmallScreen ? 20 : 28,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
    elevation: 15,
  },
  glassGradient: {
    padding: isSmallScreen ? 12 : 22,
  },
  sectionInner: {
    marginBottom: isSmallScreen ? 10 : 20,
  },
  miniLabel: {
    color: '#fff',
    fontSize: isSmallScreen ? 11 : 13,
    letterSpacing: 2,
    marginBottom: isSmallScreen ? 8 : 12,
    textAlign: 'center',
    opacity: 0.9,
  },
  operationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: isSmallScreen ? 6 : 10,
    justifyContent: 'center',
  },
  opCard: {
    paddingHorizontal: isSmallScreen ? 10 : 16,
    paddingVertical: isSmallScreen ? 8 : 12,
    borderRadius: isSmallScreen ? 12 : 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
    minWidth: '45%',
    alignItems: 'center',
  },
  opText: {
    color: '#fff',
    fontSize: isSmallScreen ? 14 : 16,
    letterSpacing: 1,
  },
  dividerHorizontal: {
    height: 1.5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginVertical: isSmallScreen ? 10 : 20,
  },
  settingsPanel: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  setGroup: {
    flex: 1,
    alignItems: 'center',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: isSmallScreen ? 4 : 8,
    justifyContent: 'center',
  },
  chipLarge: {
    paddingHorizontal: isSmallScreen ? 8 : 12,
    paddingVertical: isSmallScreen ? 6 : 8,
    borderRadius: isSmallScreen ? 10 : 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    minWidth: isSmallScreen ? 45 : 55,
    alignItems: 'center',
  },
  chipTextLarge: {
    fontSize: isSmallScreen ? 10 : 12,
    letterSpacing: 1,
  },
  dividerSpacer: {
    width: 1.5,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginHorizontal: isSmallScreen ? 8 : 12,
  },
  bottomSection: {
    flex: 0.23,
    paddingHorizontal: 20,
    justifyContent: 'center',
    gap: isSmallScreen ? 10 : 15,
  },
  actionBtn: {
    height: isSmallScreen ? 50 : 68,
    borderRadius: isSmallScreen ? 16 : 22,
    overflow: 'hidden',
    elevation: 12,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  actionGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: isSmallScreen ? 10 : 14,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: isSmallScreen ? 18 : 24,
    letterSpacing: 2,
  },
  utilFooter: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  utilIconBtn: {
    alignItems: 'center',
    gap: 4,
    padding: 6,
  },
  utilIconText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: isSmallScreen ? 8 : 10,
    letterSpacing: 1,
  },
});
