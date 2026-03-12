import { router } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

export default function QuizScreen() {
  useEffect(() => {
    router.replace('/(games)/matchmaking-screen');
  }, []);
  return <View />;
}

{/* 
import { LayeredAvatar } from '@/components/LayeredAvatar';
import GradientBackground from '@/components/ui/GradientBackground';
import { useAuth } from '@/contexts/AuthContext';
import { useAvatar } from '@/contexts/AvatarContext';
import { useFontContext } from '@/contexts/FontsContext';
import { useGame } from '@/contexts/GameContext';
import { competitiveMascotAnimations } from '@/data/static/lotties';
import { useWebSocket } from '@/hooks/useWebSocket';
import { FontAwesome5 } from '@expo/vector-icons';
import DrawPad, { DrawPadHandle } from "expo-drawpad";
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams } from 'expo-router';
import LottieView from 'lottie-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSharedValue } from 'react-native-reanimated';
import { categories } from '../../data/static/categories';
import { Question } from '../../types/question';


const INITIAL_USER_1 = {
  name: 'GRASSYOG',
  avatar: 'G',
  hasPlus: true,
};
const INITIAL_USER_2 = {
  name: 'TESTUSER',
  avatar: 'T',
  hasPlus: false,
};

const NUMPAD = [
  [1, 2, 3],
  [4, 5, 6],
  [7, 8, 9],
  ['x', 0, 'OK'],
];


const { width, height } = Dimensions.get('window');

// Quiz UI state management

export default function QuizScreen() {
  const params = useLocalSearchParams();
  const categoryId = params.categoryId as string || 'resta';
  const bgColor1 = params.bgColor1 as string || '#537BFD';
  const bgColor2 = params.bgColor2 as string || '#7EE1FF';
  const questionsParam = params.questions as string;
  const matchId = params.matchId as string;
  const matchDataParam = params.matchData as string;
  
  
  // Parse match data if available
  const matchData = matchDataParam ? JSON.parse(matchDataParam) : null;
  
  const { avatar: userAvatar } = useAvatar();
  const { user } = useAuth();
  const { gameState, submitAnswer, nextQuestion, getCurrentQuestion, getOpponent: gameGetOpponent } = useGame();
  const category = categories[categoryId] || categories.resta;
  
  // Get opponent data from match data
  const getOpponent = () => {
    if (!matchData || !user?.id) return null;
    
    const opponent = matchData.players.find((player: any) => player.id !== user.id);
    return opponent;
  };
  
  const opponent = getOpponent();
  
  // WebSocket integration for 1v1 round results
  const { sendFinishedQuiz, sendReadyToViewResults, roundResult, showResults, matchData: liveMatchData, opponentFinished, timeRemaining: wsTimeRemaining } = useWebSocket(
    user?.id,
    user?.username,
    userAvatar,
    matchData
  );

  // When server sends results for the round, reveal result screen
  useEffect(() => {
    if (showResults && roundResult) {
      setIsFinished(true);
    }
  }, [showResults, roundResult]);


  // Use matchData from params
  const effectiveMatchData = matchData;
  
  // Parse questions from params
  const questions: Question[] = questionsParam ? JSON.parse(questionsParam) : [];
  

  // Game state management
  const [input, setInput] = useState('');
  const [showDrawPad, setShowDrawPad] = useState(false);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userScore, setUserScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(15);
  // After finishing, wait 1s and then request results from server if not received yet
  const hasRequestedResultsRef = useRef(false);
  useEffect(() => {
    if (isFinished && !roundResult && !hasRequestedResultsRef.current) {
      hasRequestedResultsRef.current = true;
      const t = setTimeout(() => {
        try {
          sendReadyToViewResults();
        } catch (_) {}
      }, 1000);
      return () => clearTimeout(t);
    }

    if (roundResult) {
      hasRequestedResultsRef.current = false;
    }
  }, [isFinished, roundResult, sendReadyToViewResults]);


  
  const drawPadRef = useRef<DrawPadHandle>(null);
  const currentQuestion = questions[currentQuestionIndex] || null;
  const gameUser = gameState.players[0];
  const matchOpponent = getOpponent();
  const { fontsLoaded } = useFontContext();
  const bounceAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(height)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;




  // Simple UI state management
  const uiState: 'playing' | 'finished' = isFinished ? 'finished' : 'playing';


  
  // DrawPad shared values
  const pathLength = useSharedValue(0);
  const playing = useSharedValue(false);
  const signed = useSharedValue(false);

  const triggerBounceAnimation = () => {
    Animated.sequence([
      Animated.timing(bounceAnim, {
        toValue: 1.1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(bounceAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const showDrawPadModal = () => {
    // Reset animation values before showing
    slideAnim.setValue(height);
    overlayOpacity.setValue(0);
    
    setShowDrawPad(true);
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 8,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const hideDrawPadModal = () => {
    // Immediately hide modal to prevent touch blocking
    setShowDrawPad(false);
    
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: height,
        useNativeDriver: true,
        tension: 65,
        friction: 8,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleDrawPadClear = () => {
    drawPadRef.current?.erase();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleDrawPadOK = () => {
    drawPadRef.current?.erase();
    hideDrawPadModal();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const checkAnswer = () => {
    if (!currentQuestion || input.trim() === '') return;
    
    const isCorrect = input.trim() === currentQuestion.respuestaCorrecta;
    setIsAnswerCorrect(isCorrect);
    setShowResult(true);
    
    if (isCorrect) {
      setUserScore(prev => prev + 1);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    // Auto advance after 2 seconds
    setTimeout(() => {
      if (currentQuestionIndex < questions.length - 1) {
        // Move to next question
        setCurrentQuestionIndex(prev => prev + 1);
        setInput('');
        setIsAnswerCorrect(null);
        setShowResult(false);
      } else {
        // Quiz finished
        const finalScore = userScore + (isCorrect ? 1 : 0);
        setIsFinished(true);
        // Notify server with final score for round result
        try {
          sendFinishedQuiz(finalScore);
        } catch (e) {
          // no-op if not connected
        }
        // Also request to view results after a brief delay
        setTimeout(() => {
          try {
            sendReadyToViewResults();
          } catch (_) {}
        }, 1000);
        
        // Quiz finished
        
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
    }, 2000);
  };

  const handlePress = (val: string | number) => {
    if (showResult) return; // Don't allow input while showing result
    
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (val === 'x') {
      setInput(input.slice(0, -1));
      triggerBounceAnimation();
    } else if (val === 'OK') {
      checkAnswer();
    } else {
      setInput(input + val);
      triggerBounceAnimation();
    }
  };

  // Waiting for Opponent Component (shown when you finished but server hasn't sent results yet)
  const renderWaitingForOpponent = () => {
    return (
      <View style={styles.bothReadyContainer}>
        <Text style={[styles.bothReadyText, { fontFamily: 'Digitalt' }]}>Esperando al oponente...</Text>
        {typeof wsTimeRemaining === 'number' && wsTimeRemaining > 0 && (
          <View style={styles.countdownContainer}>
            {(() => {
              const seconds = wsTimeRemaining > 1000 ? Math.ceil(wsTimeRemaining / 1000) : Math.ceil(wsTimeRemaining);
              return (
                <Text style={[styles.countdownText, { fontFamily: 'Digitalt' }]}>
                  {seconds}
                </Text>
              );
            })()}
          </View>
        )}
      </View>
    );
  };

  // Result Screen Component
  const renderResultScreen = () => {
    // Prefer server-declared winner if available
    const serverSaysWinnerId = roundResult?.winnerId;
    const isWinner = serverSaysWinnerId
      ? serverSaysWinnerId === user?.id
      : userScore > (matchOpponent?.score || 0);

    // Prefer server scores if available
    const myId = user?.id ?? '';
    // Resolve opponent from live match data if available
    const livePlayers = liveMatchData?.players || matchData?.players || [];
    const opponentFromLive = livePlayers.find((p: any) => p.id !== myId);
    const opponentId = opponentFromLive?.id ?? opponent?.id ?? '';
    const myScoreFromServer = roundResult?.scores?.[myId]?.score;
    const oppScoreFromServer = opponentId ? roundResult?.scores?.[opponentId]?.score : undefined;
    const myDisplayScore = typeof myScoreFromServer === 'number' ? myScoreFromServer : userScore;
    const oppDisplayScore = typeof oppScoreFromServer === 'number' ? oppScoreFromServer : (matchOpponent?.score || 0);
    
    return (
      <View style={styles.resultScreenContainer}>
        <View style={styles.resultHeader}>
          <Text style={[styles.resultTitle, { fontFamily: 'Digitalt' }]}>
            {isWinner ? '¡GANASTE!' : '¡PERDISTE!'}
          </Text>
          <Text style={[styles.resultSubtitle, { fontFamily: 'Digitalt' }]}>
            {serverSaysWinnerId ? 'Resultados de la ronda' : 'Quiz Completado'}
          </Text>
        </View>
        
        <View style={styles.resultScores}>
          <View style={styles.playerResult}>
            <LayeredAvatar avatar={userAvatar} size={50} />
            <Text style={[styles.playerName, { fontFamily: 'Digitalt' }]}>{user?.username || 'Tú'}</Text>
            <Text style={[styles.scoreText, { fontFamily: 'Digitalt' }]}>{myDisplayScore}</Text>
            <Text style={[styles.detailText, { fontFamily: 'Digitalt' }]}>
              {myDisplayScore}/{questions.length} correctas
            </Text>
          </View>
          
          <Text style={[styles.vsText, { fontFamily: 'Digitalt' }]}>VS</Text>
          
          <View style={styles.playerResult}>
            <LayeredAvatar avatar={opponentFromLive?.avatar || matchOpponent?.avatar || userAvatar} size={50} />
            <Text style={[styles.playerName, { fontFamily: 'Digitalt' }]}>
              {opponentFromLive?.username || matchOpponent?.username || 'Oponente'}
            </Text>
            <Text style={[styles.scoreText, { fontFamily: 'Digitalt' }]}>
              {oppDisplayScore}
            </Text>
            <Text style={[styles.detailText, { fontFamily: 'Digitalt' }]}>
              {oppDisplayScore}/{questions.length} correctas
            </Text>
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.continueButton}
          onPress={() => {
            // Reset game state for next round
            setCurrentQuestionIndex(0);
            setInput('');
            setIsAnswerCorrect(null);
            setShowResult(false);
            setIsFinished(false);
            setUserScore(0);
          }}
        >
          <Text style={[styles.continueButtonText, { fontFamily: 'Digitalt' }]}>
            CONTINUAR
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Match End Screen Component
  const renderMatchEndScreen = () => {
    return (
      <View style={styles.matchEndContainer}>
        <View style={styles.matchEndHeader}>
          <Text style={[styles.matchEndTitle, { fontFamily: 'Digitalt' }]}>
            ¡BUEN JUEGO!
          </Text>
          <Text style={[styles.matchEndSubtitle, { fontFamily: 'Digitalt' }]}>
            Quiz completado
          </Text>
        </View>
        
        <View style={styles.finalScores}>
          <View style={styles.finalPlayerScore}>
            <LayeredAvatar avatar={userAvatar} size={60} />
            <Text style={[styles.finalPlayerName, { fontFamily: 'Digitalt' }]}>{user?.username || 'Tú'}</Text>
            <Text style={[styles.finalScore, { fontFamily: 'Digitalt' }]}>
              {userScore}
            </Text>
            <Text style={[styles.finalDetail, { fontFamily: 'Digitalt' }]}>
              {userScore}/{questions.length} respuestas correctas
            </Text>
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.playAgainButton}
          onPress={() => {
            // Navigate back to lobby or main menu
            // This would need to be implemented based on your navigation structure
            console.log('Play again pressed');
          }}
        >
          <Text style={[styles.playAgainButtonText, { fontFamily: 'Digitalt' }]}>
            JUGAR DE NUEVO
          </Text>
        </TouchableOpacity>
      </View>
    );
  };



  if (!fontsLoaded) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Text>Loading...</Text></View>;
  }

  
  // Simple rendering logic
  // If server results are available, prefer showing them immediately
  if (roundResult) {
    return (
      <GradientBackground colors={[bgColor1, bgColor2]}>
        {renderResultScreen()}
      </GradientBackground>
    );
  }
  // If user finished but results are not yet available, show waiting for opponent
  if (uiState === 'finished') {
    return (
      <GradientBackground colors={[bgColor1, bgColor2]}>
        {renderWaitingForOpponent()}
      </GradientBackground>
    );
  }

  return (
    <GradientBackground colors={[bgColor1, bgColor2]}>
      <View style={styles.headerContainer}>
          <View style={styles.competitiveHeader}>
            <View style={styles.playerSection}>
              <View style={styles.playerRow}>
                <View style={styles.avatarEmojiContainer}>
                  <LayeredAvatar 
                    avatar={userAvatar}
                    size={35}
                  />
                </View>
                <View style={styles.playerInfo}>
                  <Text style={[styles.playerName, { fontFamily: 'Digitalt' }]}>{user?.username || gameUser?.name || INITIAL_USER_1.name}</Text>
                  <Text style={[styles.playerScore, { fontFamily: 'Digitalt' }]}>{userScore.toString().padStart(2, '0')}</Text>
                </View>
              </View>
            </View>
            

            <View style={styles.progressSection}>
              <Text style={[styles.progressText, { fontFamily: 'Digitalt' }]}>
                {currentQuestionIndex + 1}/{questions.length}
              </Text>
            </View>
            
            <View style={styles.playerSection}>
              <View style={styles.playerRow}>
                <View style={styles.avatarEmojiContainer}>
                  <LayeredAvatar 
                    avatar={matchOpponent?.avatar || userAvatar}
                    size={35}
                  />
                </View>
                <View style={styles.playerInfo}>
                  <Text style={[styles.playerName, { fontFamily: 'Digitalt' }]}>{matchOpponent?.username || INITIAL_USER_2.name}</Text>
                  <Text style={[styles.playerScore, { fontFamily: 'Digitalt' }]}>{matchOpponent?.score?.toString().padStart(2, '0') || '00'}</Text>
                </View>
              </View>
            </View>
          </View>
      </View>


      <View style={styles.mainContent}>


        <View style={styles.lottieContainer}>
          <LottieView
            source={competitiveMascotAnimations[category.mascotName as keyof typeof competitiveMascotAnimations]}
            autoPlay
            loop
            style={styles.lottieAnimation}
          />
        </View>


        <View style={styles.questionContainer}>
          <Text style={[styles.questionText, { fontFamily: 'Digitalt' }]}>
            {currentQuestion?.texto || 'Loading...'}
          </Text>
        </View>
        


        

        {showResult && isAnswerCorrect && (
          <View style={styles.confettiContainer}>
            <LottieView
              source={require('@/assets/lotties/extras/Confetti_quick.json')}
              autoPlay
              loop={false}
              style={styles.confettiAnimation}
            />
          </View>
        )}


        <Animated.View style={[
          styles.answerContainer,
          { transform: [{ scale: bounceAnim }] },
          showResult && isAnswerCorrect ? styles.answerContainerCorrect : null,
          showResult && !isAnswerCorrect ? styles.answerContainerIncorrect : null,
        ]}>
          <Text style={[
            styles.answerText,
            input === '' ? styles.answerTextEmpty : null,
            showResult && isAnswerCorrect ? styles.answerTextCorrect : null,
            showResult && !isAnswerCorrect ? styles.answerTextIncorrect : null,
            { fontFamily: 'Digitalt' }
          ]}>
            {input || '0'}
          </Text>
        </Animated.View>

        <View style={styles.calculatorGrid}>
          {NUMPAD.map((row, i) => (
            <View key={i} style={styles.calculatorRow}>
              {row.map((val, j) => (
                <TouchableOpacity
                  key={j}
                  style={[
                    styles.calculatorButton,
                    val === 'OK' ? styles.okButton : null
                  ]}
                  onPress={() => handlePress(val)}
                >
                  {val === 'x' ? (
                    <FontAwesome5 name="backspace" size={24} color="#fff" />
                  ) : (
                    <Text style={[
                      styles.calculatorButtonText,
                      val === 'OK' ? styles.okButtonText : null,
                      { fontFamily: 'Digitalt' }
                    ]}>
                      {val}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>


        <View style={styles.bottomToolbar}>
          <TouchableOpacity style={styles.toolbarButton} onPress={showDrawPadModal}>
            <FontAwesome5 name="chalkboard" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolbarButton}>
            <FontAwesome5 name="lightbulb" size={24} color="#fff" />
            <View style={styles.notificationBadge}>
              <Text style={[styles.notificationText, { fontFamily: 'Digitalt' }]}>2</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>


      <Modal
        visible={showDrawPad}
        transparent={true}
        animationType="none"
        onRequestClose={hideDrawPadModal}
      >
        <Animated.View style={[
          styles.modalOverlay,
          { opacity: overlayOpacity }
        ]}>
          <Animated.View style={[
            styles.drawPadContainer,
            { transform: [{ translateY: slideAnim }] }
          ]}>

            <View style={styles.drawPadHeader}>
              <View style={styles.headerLeft}>
                <FontAwesome5 name="chalkboard" size={18} color="#fff" />
                <Text style={[styles.drawPadTitle, { fontFamily: 'Digitalt' }]}>PIZARRÓN</Text>
              </View>
              <TouchableOpacity onPress={hideDrawPadModal} style={styles.closeButton}>
                <FontAwesome5 name="times" size={20} color="#fff" />
              </TouchableOpacity>
            </View>


            <View style={styles.drawPadCanvas}>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <DrawPad
                  ref={drawPadRef}
                  stroke="#000000"
                  strokeWidth={3}
                  pathLength={pathLength}
                  playing={playing}
                  signed={signed}
                />
              </GestureHandlerRootView>
            </View>


            <View style={styles.drawPadControls}>
              <TouchableOpacity style={styles.controlButton} onPress={handleDrawPadClear}>
                <FontAwesome5 name="eraser" size={18} color="#fff" />
                <Text style={[styles.controlButtonText, { fontFamily: 'Digitalt' }]}>CLEAR</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.controlButton, styles.okControlButton]} onPress={handleDrawPadOK}>
                <FontAwesome5 name="check" size={18} color="#fff" />
                <Text style={[styles.controlButtonText, { fontFamily: 'Digitalt' }]}>OK</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: height,
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 0,
  },
  safeAreaHeader: {
    backgroundColor: 'transparent',
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 20,
    alignItems: 'center',
    paddingTop: 100, // Reduced to move content up
  },
  // Competitive Header Styles
  competitiveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingTop: 20,
    paddingHorizontal: 30,
  },
  playerSection: {
    alignItems: 'flex-start',
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  playerInfo: {
    alignItems: 'flex-start',
  },
  avatarEmoji: {
    fontSize: 32,
    backgroundColor: '#4f46e5',
    borderRadius: 20,
    width: 40,
    height: 40,
    textAlign: 'center',
    lineHeight: 40,
  },
  avatarEmojiContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  playerName: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  playerScore: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  progressSection: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  timerText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#fff',
  },
  // Lottie Character Styles
  lottieContainer: {
    alignItems: 'center',
  },
  lottieAnimation: {
    width: 200,
    height: 120,
  },
  // Question and Answer Styles
  questionContainer: {
    backgroundColor: '#000000',
    borderRadius: 30,
    paddingVertical: 15,
    paddingHorizontal: 40,
    marginBottom: 15,
    width: '85%',
    alignItems: 'center',
    opacity: 0.5,
  },
  questionText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  timerContainer: {
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    borderRadius: 15,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: '#fff',
  },
  waitingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  answerContainer: {
    backgroundColor: '#fff',
    borderRadius: 25,
    paddingVertical: 15,
    paddingHorizontal: 30,
    marginBottom: 25,
    width: '85%',
    alignItems: 'center',
  },
  answerText: {
    color: '#1f2937',
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  answerContainerEmpty: {
    opacity: 0.8,
  },
  answerTextEmpty: {
    color: '#9ca3af',
  },
  answerContainerCorrect: {
    backgroundColor: '#dcfce7', // Light green background
    borderWidth: 2,
    borderColor: '#22c55e', // Green border
  },
  answerContainerIncorrect: {
    backgroundColor: '#fef2f2', // Light red background
    borderWidth: 2,
    borderColor: '#ef4444', // Red border
  },
  answerTextCorrect: {
    color: '#15803d', // Dark green text
  },
  answerTextIncorrect: {
    color: '#dc2626', // Dark red text
  },
  confettiContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    pointerEvents: 'none',
  },
  confettiAnimation: {
    width: '100%',
    height: '100%',
  },
  timeAnimationOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  timeAnimation: {
    width: 300,
    height: 300,
  },
  opponentFinishContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  opponentFinishText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 20,
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#fff',
  },
  // Calculator Styles
  calculatorGrid: {
    marginBottom: 20,
  },
  calculatorRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
    gap: 16,
  },
  calculatorButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 26,
    width: 86,
    height: 65,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calculatorButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  okButton: {
    backgroundColor: '#ec4899',
  },
  okButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  // Bottom Toolbar Styles
  bottomToolbar: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    flexDirection: 'row',
    gap: 15,
  },
  toolbarButton: {
    backgroundColor: '#374151',
    borderRadius: 12,
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#000000',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  // DrawPad Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  drawPadContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    height: height * 0.7,
    paddingTop: 20,
  },
  drawPadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 25,
    paddingBottom: 20,
    backgroundColor: '#4f46e5',
    marginHorizontal: 20,
    borderRadius: 15,
    paddingVertical: 15,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  drawPadTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  closeButton: {
    padding: 5,
  },
  drawPadCanvas: {
    flex: 1,
    margin: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#e9ecef',
  },
  drawPadControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingBottom: 30,
    gap: 15,
  },
  controlButton: {
    backgroundColor: '#6b7280',
    borderRadius: 15,
    paddingVertical: 15,
    paddingHorizontal: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'center',
  },
  okControlButton: {
    backgroundColor: '#ec4899',
  },
  controlButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  // Result Screen Styles
  resultScreenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  resultHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  resultTitle: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  resultSubtitle: {
    color: '#fff',
    fontSize: 18,
    opacity: 0.8,
    textAlign: 'center',
  },
  resultScores: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 40,
  },
  playerResult: {
    alignItems: 'center',
    flex: 1,
  },
  scoreText: {
    color: '#fff',
    fontSize: 48,
    fontWeight: 'bold',
    marginTop: 10,
  },
  detailText: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.8,
    marginTop: 5,
  },
  vsText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginHorizontal: 20,
  },
  continueButton: {
    backgroundColor: '#ec4899',
    borderRadius: 25,
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderWidth: 2,
    borderColor: '#fff',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  // Match End Screen Styles
  matchEndContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  matchEndHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  matchEndTitle: {
    color: '#fff',
    fontSize: 42,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  matchEndSubtitle: {
    color: '#fff',
    fontSize: 20,
    opacity: 0.8,
    textAlign: 'center',
  },
  finalScores: {
    alignItems: 'center',
    marginBottom: 40,
  },
  finalPlayerScore: {
    alignItems: 'center',
  },
  finalPlayerName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 15,
  },
  finalScore: {
    color: '#fff',
    fontSize: 64,
    fontWeight: 'bold',
    marginTop: 10,
  },
  finalDetail: {
    color: '#fff',
    fontSize: 16,
    opacity: 0.8,
    marginTop: 5,
  },
  playAgainButton: {
    backgroundColor: '#22c55e',
    borderRadius: 25,
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderWidth: 2,
    borderColor: '#fff',
  },
  playAgainButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  // Both Ready Screen Styles
  bothReadyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  bothReadyAnimation: {
    width: 300,
    height: 300,
    marginBottom: 30,
  },
  bothReadyText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  bothReadySubtext: {
    color: '#fff',
    fontSize: 18,
    opacity: 0.8,
    textAlign: 'center',
    marginBottom: 20,
  },
  countdownContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 50,
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  countdownText: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
  },
  // Waiting Screen Styles
  waitingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  waitingAnimation: {
    width: 200,
    height: 200,
    marginBottom: 30,
  },
  waitingText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  waitingSubtext: {
    color: '#fff',
    fontSize: 18,
    opacity: 0.8,
    textAlign: 'center',
  },
  // LISTO Button Styles (similar to roulette screen)
  listoButton: {
    backgroundColor: '#FFD616',
    borderRadius: 25,
    paddingHorizontal: 30,
    paddingVertical: 15,
    marginTop: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  listoButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
    textAlign: 'center',
  },
});

*/}