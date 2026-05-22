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
  TouchableOpacity,
  Vibration,
  View,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LayeredAvatar } from '@/components/LayeredAvatar';
import AnimatedMathBackground from '@/components/ui/AnimatedMathBackground';
import { useAuth } from '@/contexts/AuthContext';
import { useAvatar } from '@/contexts/AvatarContext';
import { useFontContext } from '@/contexts/FontsContext';
import { useOfflineStorage } from '@/contexts/OfflineStorageContext';
import { categories } from '@/data/static/categories';
import {
  generateQuestion
} from '@/utils/generateQuestions';

const { width, height } = Dimensions.get('window');
const isSmallScreen = height < 700;
const scaleFactor = isSmallScreen ? 0.8 : 1;

// Adventure Level Structure
interface AdventureLevel {
  id: string;
  world: number;
  level: number;
  title: string;
  description: string;
  category: keyof typeof categories;
  difficulty: 1 | 2 | 3;
  questionsNeeded: number;
  reward: {
    coins: number;
    xp: number;
  };
  unlocked: boolean;
  completed: boolean;
  stars: 0 | 1 | 2 | 3; // 0 = not completed, 1-3 = stars earned
}

interface AdventureWorld {
  id: number;
  title: string;
  description: string;
  gradientColors: [string, string];
  levels: AdventureLevel[];
  unlocked: boolean;
  completed: boolean;
}

// Adventure Data
const adventureWorlds: AdventureWorld[] = [
  {
    id: 1,
    title: "Mundo de la Suma",
    description: "Aprende los fundamentos de la suma con Plusito",
    gradientColors: ["#6FFF8C", "#00F715"],
    unlocked: true,
    completed: false,
    levels: [
      {
        id: "world1_level1",
        world: 1,
        level: 1,
        title: "Sumas Básicas",
        description: "Suma números del 1 al 10",
        category: "suma",
        difficulty: 1,
        questionsNeeded: 5,
        reward: { coins: 10, xp: 50 },
        unlocked: true,
        completed: false,
        stars: 0
      },
      {
        id: "world1_level2",
        world: 1,
        level: 2,
        title: "Sumas Intermedias",
        description: "Suma números del 10 al 99",
        category: "suma",
        difficulty: 2,
        questionsNeeded: 7,
        reward: { coins: 15, xp: 75 },
        unlocked: false,
        completed: false,
        stars: 0
      },
      {
        id: "world1_level3",
        world: 1,
        level: 3,
        title: "Sumas Avanzadas",
        description: "Suma números del 100 al 999",
        category: "suma",
        difficulty: 3,
        questionsNeeded: 10,
        reward: { coins: 25, xp: 100 },
        unlocked: false,
        completed: false,
        stars: 0
      }
    ]
  },
  {
    id: 2,
    title: "Mundo de la Resta",
    description: "Domina la resta con Restin",
    gradientColors: ["#537BFD", "#7EE1FF"],
    unlocked: false,
    completed: false,
    levels: [
      {
        id: "world2_level1",
        world: 2,
        level: 1,
        title: "Restas Básicas",
        description: "Resta números del 1 al 20",
        category: "resta",
        difficulty: 1,
        questionsNeeded: 5,
        reward: { coins: 12, xp: 60 },
        unlocked: false,
        completed: false,
        stars: 0
      },
      {
        id: "world2_level2",
        world: 2,
        level: 2,
        title: "Restas Intermedias",
        description: "Resta números del 20 al 99",
        category: "resta",
        difficulty: 2,
        questionsNeeded: 7,
        reward: { coins: 18, xp: 85 },
        unlocked: false,
        completed: false,
        stars: 0
      },
      {
        id: "world2_level3",
        world: 2,
        level: 3,
        title: "Restas Avanzadas",
        description: "Resta números del 100 al 999",
        category: "resta",
        difficulty: 3,
        questionsNeeded: 10,
        reward: { coins: 28, xp: 110 },
        unlocked: false,
        completed: false,
        stars: 0
      }
    ]
  },
  {
    id: 3,
    title: "Mundo de la Multiplicación",
    description: "Conquista la multiplicación con Porfix",
    gradientColors: ["#FF171B", "#FF5659"],
    unlocked: false,
    completed: false,
    levels: [
      {
        id: "world3_level1",
        world: 3,
        level: 1,
        title: "Tablas Básicas",
        description: "Multiplica números del 1 al 5",
        category: "multiplicacion",
        difficulty: 1,
        questionsNeeded: 8,
        reward: { coins: 15, xp: 70 },
        unlocked: false,
        completed: false,
        stars: 0
      },
      {
        id: "world3_level2",
        world: 3,
        level: 2,
        title: "Tablas Intermedias",
        description: "Multiplica números del 6 al 9",
        category: "multiplicacion",
        difficulty: 2,
        questionsNeeded: 10,
        reward: { coins: 22, xp: 95 },
        unlocked: false,
        completed: false,
        stars: 0
      },
      {
        id: "world3_level3",
        world: 3,
        level: 3,
        title: "Multiplicación Avanzada",
        description: "Multiplica números de dos dígitos",
        category: "multiplicacion",
        difficulty: 3,
        questionsNeeded: 12,
        reward: { coins: 35, xp: 125 },
        unlocked: false,
        completed: false,
        stars: 0
      }
    ]
  },
  {
    id: 4,
    title: "Mundo de la División",
    description: "Aprende la división con Dividin",
    gradientColors: ["#FFDD6F", "#F2F700"],
    unlocked: false,
    completed: false,
    levels: [
      {
        id: "world4_level1",
        world: 4,
        level: 1,
        title: "Divisiones Básicas",
        description: "Divide números simples",
        category: "division",
        difficulty: 1,
        questionsNeeded: 6,
        reward: { coins: 18, xp: 80 },
        unlocked: false,
        completed: false,
        stars: 0
      },
      {
        id: "world4_level2",
        world: 4,
        level: 2,
        title: "Divisiones Intermedias",
        description: "Divide números más complejos",
        category: "division",
        difficulty: 2,
        questionsNeeded: 8,
        reward: { coins: 25, xp: 105 },
        unlocked: false,
        completed: false,
        stars: 0
      },
      {
        id: "world4_level3",
        world: 4,
        level: 3,
        title: "Divisiones Avanzadas",
        description: "Divide números grandes",
        category: "division",
        difficulty: 3,
        questionsNeeded: 10,
        reward: { coins: 40, xp: 140 },
        unlocked: false,
        completed: false,
        stars: 0
      }
    ]
  },
  {
    id: 5,
    title: "Mundo Combinado",
    description: "El desafío final con Totalin",
    gradientColors: ["#DF5ED0", "#C71BED"],
    unlocked: false,
    completed: false,
    levels: [
      {
        id: "world5_level1",
        world: 5,
        level: 1,
        title: "Operaciones Mixtas",
        description: "Combina todas las operaciones",
        category: "combinada",
        difficulty: 2,
        questionsNeeded: 15,
        reward: { coins: 50, xp: 150 },
        unlocked: false,
        completed: false,
        stars: 0
      },
      {
        id: "world5_level2",
        world: 5,
        level: 2,
        title: "Desafío Maestro",
        description: "El nivel más difícil",
        category: "combinada",
        difficulty: 3,
        questionsNeeded: 20,
        reward: { coins: 75, xp: 200 },
        unlocked: false,
        completed: false,
        stars: 0
      }
    ]
  }
];

// Mascot animations
const mascotAnimations: { [key: string]: any } = {
  suma: require('@/assets/lotties/mascots/Plusito/1v1_Idle.json'),
  resta: require('@/assets/lotties/mascots/Restin/1v1_Idle.json'),
  multiplicacion: require('@/assets/lotties/mascots/Porfix/1v1_Idle.json'),
  division: require('@/assets/lotties/mascots/Dividin/1v1_Idle.json'),
};

// Custom numpad layout
const NUMPAD = [
  [1, 2, 3],
  [4, 5, 6],
  [7, 8, 9],
  ['−', 0, '⌫'],
];

export default function AdventureGameScreen() {
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
                <Text style={{ fontFamily: Platform.select({ ios: 'Arial', android: 'sans-serif', default: 'sans-serif' }), fontWeight: 'bold' }}>÷</Text>
              )}
            </React.Fragment>
          ))}
        </Text>
      );
    }
    return text;
  };

  const { avatar: userAvatar } = useAvatar();
  const { user } = useAuth();
  const { addHighScore } = useOfflineStorage();

  // Adventure state
  const [worlds, setWorlds] = useState<AdventureWorld[]>(adventureWorlds);
  const [selectedLevel, setSelectedLevel] = useState<AdventureLevel | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const countdownScale = useRef(new Animated.Value(1)).current;
  const countdownOpacity = useRef(new Animated.Value(1)).current;

  const [showLevelComplete, setShowLevelComplete] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);
  const [levelStats, setLevelStats] = useState({ correct: 0, total: 0, stars: 0 });

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const correctFlash = useRef(new Animated.Value(0)).current;

  // Load adventure progress from AsyncStorage
  useEffect(() => {
    loadAdventureProgress();
  }, []);

  const loadAdventureProgress = async () => {
    try {
      const savedProgress = await AsyncStorage.getItem('adventureProgress');
      if (savedProgress) {
        const progress = JSON.parse(savedProgress);
        setWorlds(progress);
      }
    } catch (error) {
      console.error('Error loading adventure progress:', error);
    }
  };

  const saveAdventureProgress = async (updatedWorlds: AdventureWorld[]) => {
    try {
      await AsyncStorage.setItem('adventureProgress', JSON.stringify(updatedWorlds));
    } catch (error) {
      console.error('Error saving adventure progress:', error);
    }
  };

  const startLevel = (level: AdventureLevel) => {
    setSelectedLevel(level);
    setQuestionsAnswered(0);
    setCorrectAnswers(0);
    setUserAnswer('');
    setIsPlaying(true);
    setGameEnded(false);
    generateNewQuestion(level);

    // Start countdown
    setIsCountingDown(true);
    setCountdown(3);
    countdownScale.setValue(1);
    countdownOpacity.setValue(1);
  };

  // Countdown effect
  useEffect(() => {
    if (!isCountingDown) return;

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
          return 0;
        }
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

  const generateNewQuestion = (level: AdventureLevel) => {
    const category = level.category as any;
    const question = generateQuestion(category, level.difficulty as any);
    setCurrentQuestion(question);
    setUserAnswer('');
  };

  const checkAnswer = () => {
    if (!currentQuestion || !userAnswer.trim()) return;

    const userNum = parseInt(userAnswer.trim());
    const isCorrect = userNum === currentQuestion.correctAnswer;

    setQuestionsAnswered(prev => prev + 1);
    
    if (isCorrect) {
      setCorrectAnswers(prev => prev + 1);
      
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

      // Green flash animation
      Animated.sequence([
        Animated.timing(correctFlash, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(correctFlash, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      // Shake animation for wrong answer
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();

      Vibration.vibrate(200);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }

    // Check if level is complete
    if (questionsAnswered + 1 >= selectedLevel!.questionsNeeded) {
      setTimeout(() => {
        completeLevel();
      }, 1000);
    } else {
      // Generate new question after delay
      setTimeout(() => {
        generateNewQuestion(selectedLevel!);
      }, isCorrect ? 500 : 1000);
    }
  };

  const completeLevel = async () => {
    if (!selectedLevel) return;

    setIsPlaying(false);
    setGameEnded(true);

    // Calculate stars based on accuracy
    const accuracy = (correctAnswers / selectedLevel.questionsNeeded) * 100;
    let stars = 0;
    if (accuracy >= 80) stars = 3;
    else if (accuracy >= 60) stars = 2;
    else if (accuracy >= 40) stars = 1;

    setLevelStats({
      correct: correctAnswers,
      total: selectedLevel.questionsNeeded,
      stars
    });

    // Update adventure progress
    const updatedWorlds = worlds.map(world => {
      if (world.id === selectedLevel.world) {
        const updatedLevels = world.levels.map(level => {
          if (level.id === selectedLevel.id) {
            const updatedLevel = {
              ...level,
              completed: true,
              stars: stars as 0 | 1 | 2 | 3
            };
            
            // Unlock next level
            const nextLevel = world.levels.find(l => l.level === level.level + 1);
            if (nextLevel) {
              const nextLevelIndex = world.levels.findIndex(l => l.id === nextLevel.id);
              world.levels[nextLevelIndex].unlocked = true;
            }
            
            return updatedLevel;
          }
          return level;
        });

        // Check if world is completed
        const worldCompleted = updatedLevels.every(level => level.completed);
        
        // Unlock next world
        const nextWorld = worlds.find(w => w.id === world.id + 1);
        if (nextWorld && worldCompleted) {
          const nextWorldIndex = worlds.findIndex(w => w.id === nextWorld.id);
          worlds[nextWorldIndex].unlocked = true;
        }

        return {
          ...world,
          levels: updatedLevels,
          completed: worldCompleted
        };
      }
      return world;
    });

    setWorlds(updatedWorlds);
    await saveAdventureProgress(updatedWorlds);
    setShowLevelComplete(true);

    // Save high score for leaderboard
    await addHighScore({
      mode: 'adventure' as any,
      score: correctAnswers,
      accuracy: accuracy,
      questionsAnswered: selectedLevel.questionsNeeded,
      alias: user?.username,
      username: user?.username,
    });
  };

  const handleNumpadPress = (val: string | number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (val === '⌫') {
      setUserAnswer(prev => prev.slice(0, -1));
    } else if (val === '−') {
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
      setUserAnswer(prev => prev + val);
    }
  };

  const renderStars = (count: number) => {
    return Array.from({ length: 3 }, (_, i) => (
      <FontAwesome5
        key={i}
        name="star"
        size={12}
        color={i < count ? "#FFD45E" : "#ccc"}
        solid={i < count}
      />
    ));
  };

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  // Level selection screen
  if (!isPlaying) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#A855F7', '#7C3AED']}
          style={styles.gradientBackground}
        />
        <AnimatedMathBackground />

        <SafeAreaView style={styles.safeArea}>
          {/* Back button */}
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <FontAwesome5 name="arrow-left" size={20} color="#fff" />
          </TouchableOpacity>

          {/* Top bar with avatar and coins */}
          <View style={styles.topBar}>
            <View style={styles.avatarBlock}>
              <View style={styles.avatarCircle}>
                <LayeredAvatar avatar={userAvatar} size={64} style={styles.layeredAvatar} />
              </View>
              <View style={styles.coinsRow}>
                <FontAwesome5 name="coins" size={16} color="#FFD45E" />
                <Text style={styles.coinsText}>300</Text>
              </View>
            </View>
          </View>

          {/* Title */}
          <View style={styles.titleWrap}>
            <Text style={[styles.title, { fontFamily: 'Digitalt' }]}>MODO AVENTURA</Text>
            <Text style={[styles.subtitle, { fontFamily: 'Gilroy-Black' }]}>
              Completa niveles para desbloquear nuevos mundos
            </Text>
          </View>

          {/* Worlds */}
          <ScrollView style={styles.worldsContainer} showsVerticalScrollIndicator={false}>
            {worlds.map((world) => (
              <View key={world.id} style={styles.worldCard}>
                <LinearGradient
                  colors={world.unlocked ? world.gradientColors : ['#666', '#444']}
                  style={styles.worldGradient}
                >
                  <View style={styles.worldHeader}>
                    <View style={styles.worldTitleContainer}>
                      <Text style={[styles.worldTitle, { fontFamily: 'Digitalt' }]}>
                        {world.title}
                      </Text>
                      <Text style={[styles.worldDescription, { fontFamily: 'Gilroy-Black' }]}>
                        {world.description}
                      </Text>
                    </View>
                    <View style={styles.worldIcon}>
                      <FontAwesome5 
                        name={world.unlocked ? "globe" : "lock"} 
                        size={24} 
                        color="#fff" 
                      />
                    </View>
                  </View>

                  <View style={styles.levelsContainer}>
                    {world.levels.map((level) => (
                      <TouchableOpacity
                        key={level.id}
                        style={[
                          styles.levelButton,
                          !level.unlocked && styles.levelButtonLocked
                        ]}
                        onPress={() => level.unlocked && startLevel(level)}
                        disabled={!level.unlocked}
                      >
                        <View style={styles.levelInfo}>
                          <Text style={[styles.levelTitle, { fontFamily: 'Digitalt' }]}>
                            {level.title}
                          </Text>
                          <Text style={[styles.levelDescription, { fontFamily: 'Gilroy-Black' }]}>
                            {level.description}
                          </Text>
                          <View style={styles.levelReward}>
                            <FontAwesome5 name="coins" size={12} color="#FFD45E" />
                            <Text style={[styles.rewardText, { fontFamily: 'Gilroy-Black' }]}>
                              {level.reward.coins} monedas
                            </Text>
                          </View>
                        </View>
                        
                        <View style={styles.levelStatus}>
                          {level.completed ? (
                            <View style={styles.starsContainer}>
                              {renderStars(level.stars)}
                            </View>
                          ) : level.unlocked ? (
                            <FontAwesome5 name="play-circle" size={24} color="#fff" />
                          ) : (
                            <FontAwesome5 name="lock" size={20} color="#999" />
                          )}
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </LinearGradient>
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // Game screen
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={selectedLevel ? categories[selectedLevel.category].bgColor1 && categories[selectedLevel.category].bgColor2 ? 
          [categories[selectedLevel.category].bgColor1, categories[selectedLevel.category].bgColor2] : 
          ['#A855F7', '#7C3AED'] : ['#A855F7', '#7C3AED']}
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
        {/* Game header */}
        <View style={styles.gameHeader}>
          <TouchableOpacity 
            style={styles.gameBackButton}
            onPress={() => {
              setIsPlaying(false);
              setSelectedLevel(null);
            }}
          >
            <FontAwesome5 name="arrow-left" size={20} color="#fff" />
          </TouchableOpacity>
          
          <View style={styles.gameStats}>
            <View style={styles.statBox}>
              <Text style={[styles.statLabel, { fontFamily: 'Digitalt' }]}>PREGUNTA</Text>
              <Text style={[styles.statValue, { fontFamily: 'Digitalt' }]}>
                {questionsAnswered + 1}/{selectedLevel?.questionsNeeded}
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statLabel, { fontFamily: 'Digitalt' }]}>CORRECTAS</Text>
              <Text style={[styles.statValue, { fontFamily: 'Digitalt' }]}>{correctAnswers}</Text>
            </View>
          </View>
        </View>

        {/* Main content - Using Proportion-based layout */}
        <View style={styles.gameMainWrapper}>
          {/* Question section (Proportional) */}
          <View style={styles.gameQuestionSection}>
            <View style={styles.mascotContainer}>
              {selectedLevel && mascotAnimations[selectedLevel.category] && (
                <LottieView
                  source={mascotAnimations[selectedLevel.category]}
                  autoPlay
                  loop
                  style={styles.mascotAnimation}
                />
              )}
            </View>

            <Animated.View style={[
              styles.questionContainer,
              { 
                transform: [
                  { scale: pulseAnim },
                  { translateX: shakeAnim }
                ]
              }
            ]}>
              {currentQuestion && (
                <>
                  <Text style={[styles.categoryText, { fontFamily: 'Digitalt' }]}>
                    {currentQuestion.category}
                  </Text>
                  <Text style={[styles.questionText, { fontFamily: 'Digitalt' }]}>
                    {renderQuestionText(currentQuestion.question)}
                  </Text>
                </>
              )}
            </Animated.View>
          </View>

          {/* Answer section (Proportional) */}
          <View style={styles.gameAnswerSection}>
            <Animated.View style={[
              styles.answerDisplay,
              { 
                transform: [{ scale: pulseAnim }],
                backgroundColor: correctFlash.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['#fff', '#90EE90']
                })
              }
            ]}>
              <Text style={[
                styles.answerText,
                userAnswer === '' && styles.answerTextEmpty,
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
                  {row.map((val, j) => (
                    <TouchableOpacity
                      key={j}
                      style={styles.numpadButton}
                      onPress={() => handleNumpadPress(val)}
                    >
                      <Text style={[styles.numpadButtonText, { fontFamily: 'Digitalt' }]}>
                        {val}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.submitButton, !userAnswer.trim() && styles.submitButtonDisabled]}
              onPress={checkAnswer}
              disabled={!userAnswer.trim()}
            >
              <LinearGradient
                colors={userAnswer.trim() ? ['#FFA65A', '#FF5EA3'] : ['#666', '#444']}
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

      {/* Level Complete Modal */}
      <Modal
        visible={showLevelComplete}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.levelCompleteModal}>
            <Text style={[styles.levelCompleteTitle, { fontFamily: 'Digitalt' }]}>
              ¡NIVEL COMPLETADO!
            </Text>
            
            <View style={styles.levelCompleteStats}>
              <View style={styles.levelCompleteStatItem}>
                <Text style={[styles.levelCompleteStatValue, { fontFamily: 'Digitalt' }]}>
                  {levelStats.correct}/{levelStats.total}
                </Text>
                <Text style={[styles.levelCompleteStatLabel, { fontFamily: 'Gilroy-Black' }]}>
                  Correctas
                </Text>
              </View>
              <View style={styles.levelCompleteStatItem}>
                <Text style={[styles.levelCompleteStatValue, { fontFamily: 'Digitalt' }]}>
                  {Math.round((levelStats.correct / levelStats.total) * 100)}%
                </Text>
                <Text style={[styles.levelCompleteStatLabel, { fontFamily: 'Gilroy-Black' }]}>
                  Precisión
                </Text>
              </View>
            </View>

            <View style={styles.starsEarned}>
              <Text style={[styles.starsTitle, { fontFamily: 'Gilroy-Black' }]}>
                Estrellas obtenidas:
              </Text>
              <View style={styles.starsContainer}>
                {renderStars(levelStats.stars)}
              </View>
            </View>

            <View style={styles.levelCompleteButtons}>
              <TouchableOpacity
                style={styles.levelCompleteButton}
                onPress={() => {
                  setShowLevelComplete(false);
                  setIsPlaying(false);
                  setSelectedLevel(null);
                }}
              >
                <LinearGradient
                  colors={['#8EF06E', '#31C45A']}
                  style={styles.levelCompleteButtonGradient}
                >
                  <Text style={[styles.levelCompleteButtonText, { fontFamily: 'Digitalt' }]}>
                    CONTINUAR
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
  backButton: {
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
  topBar: {
    paddingHorizontal: 20,
    paddingTop: 60,
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
    backgroundColor: '#FFD616',
    paddingHorizontal: 30,
    paddingVertical: 15,
    marginTop: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
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
    paddingTop: 20,
    paddingBottom: 12,
  },
  title: {
    color: '#fff',
    fontSize: 28,
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
  worldsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  worldCard: {
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  worldGradient: {
    padding: 20,
  },
  worldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  worldTitleContainer: {
    flex: 1,
  },
  worldTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  worldDescription: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.9,
    marginTop: 4,
  },
  worldIcon: {
    marginLeft: 15,
  },
  levelsContainer: {
    gap: 10,
  },
  levelButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 15,
    padding: 15,
  },
  levelButtonLocked: {
    opacity: 0.5,
  },
  levelInfo: {
    flex: 1,
  },
  levelTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  levelDescription: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.8,
    marginTop: 2,
  },
  levelReward: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  rewardText: {
    color: '#FFD45E',
    fontSize: 12,
    fontWeight: 'bold',
  },
  levelStatus: {
    marginLeft: 15,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  // Game screen styles
  gameHeader: {
    paddingHorizontal: 15,
    paddingTop: 10,
    position: 'relative',
    height: 70, 
  },
  gameBackButton: {
    position: 'absolute',
    top: 10,
    left: 0,
    zIndex: 1000,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 20,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 10,
  },
  gameStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 15,
    width: '90%',
    alignSelf: 'center',
    transform: [{ scale: 0.8 }],
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
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginTop: 4,
  },
  gameMainWrapper: {
    flex: 1,
    paddingHorizontal: 15,
  },
  gameQuestionSection: {
    flex: 0.35, // 35% del espacio
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: isSmallScreen ? 10 : 0,
  },
  gameAnswerSection: {
    flex: 0.15, // 15% del espacio
    justifyContent: 'center',
    alignItems: 'center',
  },
  gameControlsSection: {
    flex: 0.5, // 50% del espacio para teclado y botón
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  questionAreaWrapper: {
    alignItems: 'center',
    width: '100%',
  },
  mascotContainer: {
    width: 70 * scaleFactor, 
    height: 70 * scaleFactor,
    marginBottom: -65 * scaleFactor, // Integración profunda con la tarjeta
    zIndex: 10,
  },
  mascotAnimation: {
    width: '100%',
    height: '100%',
  },
  questionContainer: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    padding: 15 * scaleFactor, 
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    width: '100%',
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
    paddingVertical: 10 * scaleFactor,
    paddingHorizontal: 40 * scaleFactor,
    width: '85%',
    alignItems: 'center',
    marginVertical: 8 * scaleFactor,
  },
  answerText: {
    color: '#1f2937',
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  answerTextEmpty: {
    color: '#9ca3af',
  },
  numpadContainer: {
    width: '100%',
    paddingHorizontal: 5,
  },
  numpadRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 6,
    gap: 8,
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
    width: '90%',
    height: 44 * scaleFactor,
    borderRadius: 22,
    overflow: 'hidden',
    marginTop: 5 * scaleFactor,
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelCompleteModal: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
  },
  levelCompleteTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#A855F7',
    marginBottom: 20,
  },
  levelCompleteStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
  },
  levelCompleteStatItem: {
    alignItems: 'center',
  },
  levelCompleteStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  levelCompleteStatLabel: {
    fontSize: 12,
    color: '#666',
  },
  starsEarned: {
    alignItems: 'center',
    marginBottom: 25,
  },
  starsTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  levelCompleteButtons: {
    width: '100%',
  },
  levelCompleteButton: {
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
  },
  levelCompleteButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelCompleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});

