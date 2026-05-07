import { FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import LottieView from 'lottie-react-native';
import React, { useEffect, useRef, useState } from 'react';
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
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AnimatedMathBackground from '@/components/ui/AnimatedMathBackground';
import InfiniteGameModeButton from '@/components/ui/InfiniteGameModeButton';
import { useAuth } from '@/contexts/AuthContext';
import { useAvatar } from '@/contexts/AvatarContext';
import { useFontContext } from '@/contexts/FontsContext';
import { useOfflineStorage } from '@/contexts/OfflineStorageContext';
import { useTutorial } from '@/contexts/TutorialContext';
import {
  generateQuestion,
  getDifficultyFromScore,
  getRandomCategory
} from '@/utils/generateQuestions';

const { width, height } = Dimensions.get('window');
const isSmallScreen = height < 750;
const scaleFactor = isSmallScreen ? 0.9 : 1.1; // Increased scale factor for better visibility

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
  { id: 1, name: 'FÁCIL', colors: ['#4ade80', '#16a34a'] },
  { id: 2, name: 'MEDIO', colors: ['#fbbf24', '#d97706'] },
  { id: 3, name: 'DIFICIL', colors: ['#f87171', '#dc2626'] },
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

  const { avatar: userAvatar } = useAvatar();
  const { user } = useAuth();
  const { addHighScore, getTopScores, getTopScoresToday } = useOfflineStorage();
  const { setDynamicSpotlight } = useTutorial();

  const mode30sRef = useRef<View>(null);

  const measure30s = () => {
    if (mode30sRef.current) {
      mode30sRef.current.measure((x, y, w, h, pageX, pageY) => {
        setDynamicSpotlight('infinite_30s', { x: pageX, y: pageY, w, h, radius: 20 });
      });
    }
  };

  // Game state
  const [gameMode, setGameMode] = useState<GameMode | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('Suma');
  const [selectedDifficulty, setSelectedDifficulty] = useState(1);
  const [currentDifficulty, setCurrentDifficulty] = useState(1);
  const [selectedTime, setSelectedTime] = useState<number | null>(null);
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
  const [gameOverStats, setGameOverStats] = useState({ score: 0, questionsAnswered: 0, accuracy: 0 });

  // Countdown state
  const [countdown, setCountdown] = useState(3);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const countdownScale = useRef(new Animated.Value(1)).current;
  const countdownOpacity = useRef(new Animated.Value(1)).current;

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const flashOpacity = useRef(new Animated.Value(0)).current;

  // Timer ref
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Refs to track current score for endGame
  const scoreRef = useRef(0);
  const questionsAnsweredRef = useRef(0);

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
    setWrongAnswers(0);
    setQuestionsAnswered(0);
    setUserAnswer('');
    setGameEnded(false);
    setIsGameActive(true);
    
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
      if (score >= 20) dynamicDiff = 3;
      else if (score >= 10) dynamicDiff = 2;
    } else if (baseDiff === 2) {
      if (score >= 10) dynamicDiff = 3;
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

      Vibration.vibrate([0, 100, 50, 100]);
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
      await addHighScore({
        score: scoreRef.current,
        mode: gameMode as any,
        username: user.username || aliasInput || 'Invitado',
        questionsAnswered: questionsAnsweredRef.current,
        accuracy: questionsAnsweredRef.current > 0 ? (scoreRef.current / questionsAnsweredRef.current) * 100 : 0,
        category: selectedCategory,
        difficulty: selectedDifficulty
      });
    }

    // Reset and close modal
    setShowGameOverModal(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleNumpadPress = (val: string | number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
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
          colors={['#31C45A', '#8A56FE']}
          style={styles.gradientBackground}
        />
        <AnimatedMathBackground />

        <SafeAreaView style={styles.safeArea}>

          

          {/* Center title */}
          <View style={styles.titleWrap}>
            <Text style={[styles.title, { fontFamily: 'Digitalt' }]}>MODO INFINITO</Text>
            <Text style={[styles.subtitle, { fontFamily: 'Gilroy-Black' }]}>
              Responde tantas preguntas como puedas antes de que se acabe el tiempo o cometas 3 errores
            </Text>
          </View>

          {/* Leaderboard Button 
          <TouchableOpacity
            style={styles.leaderboardButton}
            onPress={() => {
              console.log('Leaderboard button pressed');
              router.push('/(games)/leaderboard');
            }}
          >
            <FontAwesome5 name="trophy" size={20} color="#fff" />
            <Text style={[styles.leaderboardButtonText, { fontFamily: 'Digitalt' }]}>
              TABLA DE CLASIFICACIÓN
            </Text>
          </TouchableOpacity>
          */}
          {/* Selection UI */}
          <ScrollView 
            style={styles.selectionScrollView}
            contentContainerStyle={styles.selectionContent}
            showsVerticalScrollIndicator={false}
          >
            {/* 1. Categorías */}
            <Text style={[styles.selectionTitle, { fontFamily: 'Digitalt' }]}>1. ELIGE TU OPERACIÓN</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setSelectedCategory(cat.id)}
                  style={styles.categoryCardWrapper}
                >
                  <LinearGradient
                    colors={selectedCategory === cat.id 
                      ? [cat.colors[0] + '66', cat.colors[1] + '44'] 
                      : ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']
                    }
                    style={[
                      styles.categoryCard,
                      selectedCategory === cat.id && { borderColor: cat.colors[0], borderWidth: 2.5 }
                    ]}
                  >
                    <View style={styles.mascotContainer}>
                      {cat.lottie ? (
                        <LottieView
                          source={cat.lottie}
                          autoPlay
                          loop
                          style={styles.categoryMascot}
                        />
                      ) : (
                        <FontAwesome5 name={cat.icon} size={30 * scaleFactor} color={selectedCategory === cat.id ? "#fff" : "#a855f7"} />
                      )}
                    </View>
                    <Text style={[styles.categoryName, { fontFamily: 'Gilroy-Black' }]}>{cat.name}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>

            {/* 2. Tiempo */}
            <Text style={[styles.selectionTitle, { fontFamily: 'Digitalt', marginTop: 20 }]}>2. ¿CUÁNTO TIEMPO?</Text>
            <View style={styles.chipsRow}>
              {TIMES.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={[
                    styles.chip,
                    selectedTime === t.id && styles.chipActive
                  ]}
                  onPress={() => setSelectedTime(t.id)}
                >
                  <Text style={[styles.chipText, { fontFamily: 'Digitalt' }]}>{t.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 3. Dificultad */}
            <Text style={[styles.selectionTitle, { fontFamily: 'Digitalt', marginTop: 20 }]}>3. NIVEL DE DIFICULTAD</Text>
            <View style={styles.chipsRow}>
              {DIFFICULTIES.map((d) => (
                <TouchableOpacity
                  key={d.id}
                  style={[
                    styles.difficultyChip,
                    selectedDifficulty === d.id && { backgroundColor: d.colors[0] }
                  ]}
                  onPress={() => setSelectedDifficulty(d.id)}
                >
                  <Text style={[styles.chipText, { fontFamily: 'Digitalt' }]}>{d.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Start Button */}
            <TouchableOpacity
              style={[styles.mainStartButton, (!selectedTime) && styles.mainStartButtonDisabled]}
              onPress={() => selectedTime && startGame(selectedTime)}
              disabled={!selectedTime}
            >
              <LinearGradient
                colors={['#FFA65A', '#FF5EA3']}
                style={styles.mainStartButtonGradient}
              >
                <Text style={[styles.mainStartButtonText, { fontFamily: 'Digitalt' }]}>
                  {selectedTime ? '¡EMPEZAR DESAFÍO!' : 'ELIGE UN TIEMPO'}
                </Text>
                <FontAwesome5 name="play" size={18} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
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
              {Object.entries(mascotAnimations).map(([key, animation]) => (
                <View key={key} style={styles.mascotWrapper}>
                  <LottieView
                    source={animation}
                    autoPlay
                    loop
                    style={styles.mascotAnimation}
                  />
                </View>
              ))}
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
                    {currentQuestion.question}
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
                        onPress={() => !isDisabledNegative && handleNumpadPress(val)}
                        disabled={isDisabledNegative}
                      >
                        <Text style={[styles.numpadButtonText, { fontFamily: 'Digitalt' }]}>
                          {val}
                        </Text>
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
  modeSelectionBackButton: {
    position: 'absolute',
    top: 10,
    left: 20,
    zIndex: 1000,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 10,
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
  gameMainWrapper: {
    flex: 1,
    paddingHorizontal: 15,
  },
  gameQuestionSection: {
    flex: 0.4, // 40% del espacio para mascota + pregunta
    justifyContent: 'center',
    alignItems: 'center',
  },
  gameAnswerSection: {
    flex: 0.15, // 15% del espacio para la respuesta
    justifyContent: 'center',
    alignItems: 'center',
  },
  gameControlsSection: {
    flex: 0.45, // 45% del espacio para teclado y botón
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  subtitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'normal',
    letterSpacing: 0.5,
    textAlign: 'center',
    opacity: 0.9,
    marginTop: 8,
  },
  topBar: {
    paddingHorizontal: 20,
    paddingTop: 10,
    alignItems: 'flex-end',
  },
  avatarBlock: {
    alignItems: 'center',
    gap: 8,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#A855F7',
    paddingHorizontal: 30,
    paddingVertical: 15,
    marginTop: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
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
    fontSize: 150,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 4, height: 4 },
    textShadowRadius: 15,
  },
  layeredAvatar: {
    borderRadius: 34,
  },
  coinsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  coinsText: {
    color: '#FFD45E',
    fontWeight: 'bold',
  },
  titleWrap: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 12,
  },
  modeButtonsWrap: {
    flex: 1,
    paddingHorizontal: 20,
    gap: 16,
    justifyContent: 'center',
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
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statBox: {
    alignItems: 'center',
  },
  statLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
    opacity: 0.8,
  },
  statValue: {
    color: '#fff',
    fontSize: 20, // Reducido ligeramente
    fontWeight: 'bold',
    letterSpacing: 1,
    marginTop: 2,
  },
  questionAreaWrapper: {
    alignItems: 'center',
    width: '100%',
    position: 'relative',
  },
  mascotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    position: 'absolute',
    top: isSmallScreen ? 35 : 45, // Más integradas en el rectángulo
    left: 0,
    right: 0,
    zIndex: 10,
  },
  mascotWrapper: {
    width: (width / 4 - 15) * scaleFactor, 
    height: 70 * scaleFactor, 
    marginHorizontal: 1,
  },
  mascotAnimation: {
    width: '100%',
    height: '100%',
  },
  questionContainer: {
    width: '100%',
    paddingTop: isSmallScreen ? 15 : 25, // Menos espacio arriba para que las mascotas toquen la tarjeta
  },
  questionBox: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 15,
    paddingVertical: 12 * scaleFactor, 
    paddingHorizontal: 20 * scaleFactor,
    alignItems: 'center',
    borderWidth: 2,
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
    borderRadius: 25,
    paddingVertical: 8 * scaleFactor,
    paddingHorizontal: 30 * scaleFactor,
    width: '80%',
    alignItems: 'center',
    marginVertical: 5 * scaleFactor,
  },
  answerText: {
    color: '#1f2937',
    fontSize: 32 * scaleFactor,
    fontWeight: 'bold',
    letterSpacing: 2,
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
    gap: 12,
  },
  numpadButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 15,
    width: width * 0.22,
    height: 40 * scaleFactor, 
    alignItems: 'center',
    justifyContent: 'center',
  },
  numpadButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  submitButton: {
    width: '85%',
    height: 50 * scaleFactor,
    borderRadius: 25,
    overflow: 'hidden',
    marginTop: 10 * scaleFactor,
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
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  // Leaderboard Button Styles
  leaderboardButton: {
    width: '85%',
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    marginHorizontal: 'auto',
    marginBottom: 15,
    alignSelf: 'center',
  },
  leaderboardButtonGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  leaderboardButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Leaderboard Modal Styles
  leaderboardModal: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
  },
  leaderboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#A855F7',
    padding: 20,
  },
  leaderboardTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  leaderboardContent: {
    flex: 1,
    padding: 20,
  },
  leaderboardSection: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  scoreRank: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    backgroundColor: '#A855F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scoreInfo: {
    flex: 1,
  },
  scoreName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  scoreDetail: {
    fontSize: 12,
    color: '#666',
  },
  scoreBadge: {
    marginLeft: 8,
  },
  modeBadge: {
    backgroundColor: '#A855F7',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
  },
  modeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
    marginTop: 10,
  },
  closeLeaderboardButton: {
    margin: 15,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
  },
  closeButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  // Game Over Modal Styles
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
  // New Selection Styles
  selectionScrollView: {
    flex: 1,
    marginTop: 10,
  },
  selectionContent: {
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  selectionTitle: {
    color: '#fff',
    fontSize: 20 * scaleFactor,
    marginBottom: 12 * scaleFactor,
    letterSpacing: 1,
    opacity: 0.9,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  categoryCardWrapper: {
    width: '48%',
    marginBottom: 12,
  },
  categoryCard: {
    width: '100%',
    borderRadius: 24 * scaleFactor,
    padding: 12 * scaleFactor,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
  },
  mascotContainer: {
    width: 70 * scaleFactor,
    height: 70 * scaleFactor,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryMascot: {
    width: 80 * scaleFactor,
    height: 80 * scaleFactor,
  },
  categoryName: {
    color: '#fff',
    fontSize: 11 * scaleFactor,
    textAlign: 'center',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 15,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  chipActive: {
    borderColor: '#FFA65A',
    backgroundColor: 'rgba(255,166,90,0.2)',
  },
  chipText: {
    color: '#fff',
    fontSize: 15 * scaleFactor,
  },
  difficultyChip: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 18,
    paddingVertical: 12 * scaleFactor,
    paddingHorizontal: 18 * scaleFactor,
  },
  mainStartButton: {
    marginTop: 30 * scaleFactor,
    height: 65 * scaleFactor,
    borderRadius: 32 * scaleFactor,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  mainStartButtonDisabled: {
    opacity: 0.5,
  },
  mainStartButtonGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  mainStartButtonText: {
    color: '#fff',
    fontSize: 20 * scaleFactor,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
});
