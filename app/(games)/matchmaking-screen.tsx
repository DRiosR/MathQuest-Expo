import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Dimensions, Easing, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LayeredAvatar } from '@/components/LayeredAvatar';
import MatchEndView from '@/components/matchmaking/MatchEndView';
import MatchFoundView from '@/components/matchmaking/MatchFoundView';
import MatchmakingView from '@/components/matchmaking/MatchmakingView';
import QuizView from '@/components/matchmaking/QuizView';
import RouletteView from '@/components/matchmaking/RouletteView';
import RoundResultView from '@/components/matchmaking/RoundResultView';
import { defaultAvatar } from '@/constants/avatarAssets';
import { useAuth } from '@/contexts/AuthContext';
import { useAvatar } from '@/contexts/AvatarContext';
import { useFontContext } from '@/contexts/FontsContext';
import { useWebSocket } from '@/hooks/useWebSocket';
import { getUserAvatar, getUserElo } from '@/services/SupabaseService';
import { Avatar } from '@/types/avatar';
import LottieView from 'lottie-react-native';

type GameState = 'MATCHMAKING' | 'MATCH_FOUND' | 'ROULETTE' | 'QUIZ' | 'ROUND_RESULT' | 'MATCH_END';

function clamp(n: number, min = 0, max = 255) { return Math.min(max, Math.max(min, n)); }
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return null;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  if ([r, g, b].some((x) => Number.isNaN(x))) return null;
  return { r, g, b };
}
function rgbToHex(r: number, g: number, b: number) {
  const toHex = (v: number) => clamp(Math.round(v)).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
function lighten(hex: string, amount = 0.2) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const { r, g, b } = rgb;
  return rgbToHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount);
}
function darken(hex: string, amount = 0.2) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const { r, g, b } = rgb;
  return rgbToHex(r * (1 - amount), g * (1 - amount), b * (1 - amount));
}

// Map mascot names to their static Lottie requires (React Native requires static paths)
const MASCOT_IDLE_SOURCES: Record<string, any> = {
  Restin: require('@/assets/lotties/mascots/Restin/1v1_Idle.json'),
  Plusito: require('@/assets/lotties/mascots/Plusito/1v1_Idle.json'),
  Porfix: require('@/assets/lotties/mascots/Porfix/1v1_Idle.json'),
  Dividin: require('@/assets/lotties/mascots/Dividin/1v1_Idle.json'),
  Totalin: require('@/assets/lotties/mascots/Totalin/1v1_Idle.json'),
};

function getMascotIdleSource(mascotName?: string) {
  return (mascotName && MASCOT_IDLE_SOURCES[mascotName]) || require('@/assets/lotties/extras/Time-15.json');
}

export default function MatchmakingScreen() {
  const { fontsLoaded } = useFontContext();
  const { user } = useAuth();
  const { avatar } = useAvatar();
  const {
    isConnected,
    connectionError,
    findPlayer,
    cancelSearch,
    onPlayerFound,
    onQueueUpdate,
    onRoundStarted,
    onRoundFinished,
    onGameFinished,
    onAnswerResult,
    currentRoom,
    socketId,
    websocketService,
  } = useWebSocket();

  const [gameState, setGameState] = useState<GameState>('MATCHMAKING');
  const [queuePosition, setQueuePosition] = useState<number | undefined>();
  const [opponent, setOpponent] = useState<{ userId: string; username: string } | null>(null);
  const [gameData, setGameData] = useState<any>(null);
  const [isExitingMatchmaking, setIsExitingMatchmaking] = useState(false);
  const [isExitingMatchFound, setIsExitingMatchFound] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<{ id: string; name: string; emoji: string; color: string } | undefined>(undefined);
  const [eloInfo, setEloInfo] = useState<{ currentElo: number; beforeElo: number } | null>(null);
  const [cumulativeTotals, setCumulativeTotals] = useState<{ p1: number; p2: number }>({ p1: 0, p2: 0 });
  const [roundBeforeTotals, setRoundBeforeTotals] = useState<{ p1: number; p2: number }>({ p1: 0, p2: 0 });
  const [opponentAvatar, setOpponentAvatar] = useState<Avatar | null>(null);

  // Quiz state
  type Exercise = { id: string; question: string; answer: number; options?: number[]; category: string; startTime?: number };
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answerText, setAnswerText] = useState<string>('');
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [myRoundScore, setMyRoundScore] = useState<number>(0);
  const [hasCompletedRound, setHasCompletedRound] = useState<boolean>(false);

  // Transition overlay state
  const [isTransitioningToQuiz, setIsTransitioningToQuiz] = useState<boolean>(false);
  const [isTransitioningFromQuiz, setIsTransitioningFromQuiz] = useState<boolean>(false);
  const [transitionBgColor, setTransitionBgColor] = useState<string>('#22D3EE');
  const circleScale = useMemo(() => new Animated.Value(0.1), []);
  const circleTranslateY = useMemo(() => new Animated.Value(0), []);
  const whiteScale = useMemo(() => new Animated.Value(0), []);
  const textOpacity = useMemo(() => new Animated.Value(0), []);
  const overlayTranslateY = useMemo(() => new Animated.Value(0), []);
  const bgOpacity = useMemo(() => new Animated.Value(0), []);
  const contentOpacity = useMemo(() => new Animated.Value(0), []);
  const contentTranslateY = useMemo(() => new Animated.Value(0), []);
  const bgTranslateY = useMemo(() => new Animated.Value(0), []);
  const { height, width } = Dimensions.get('window');
  const baseCircleSize = 160; // px
  const fillScale = Math.max(width, height) / (baseCircleSize * 0.08); // big enough to cover

  const myUserId = useMemo(() => user?.id ?? `guest_${Date.now()}`, [user?.id]);
  const myUsername = useMemo(() => (user?.username || user?.email || 'Jugador').toString(), [user?.username, user?.email]);

  // ENCONTRADO!
  useEffect(() => {
    onPlayerFound((data) => {
      setOpponent(data.opponent ?? null);
      if (data.selectedCategory) setSelectedCategory(data.selectedCategory);
      const opponentId = data?.opponent?.userId;
      if (opponentId) {
        (async () => {
          try {
            const av = await getUserAvatar(opponentId);
            if (av) {
              setOpponentAvatar(av);
              setGameData((prev: any) => (prev ? { ...prev, opponentAvatar: av } : prev));
            }
          } catch {
          }
        })();
      }

      setCumulativeTotals({ p1: 0, p2: 0 });

      setIsExitingMatchmaking(true);

      websocketService.emit('start-game', {
        roomId: data.roomId,
        userId: myUserId,
        username: myUsername,
      });
    });
  }, [onPlayerFound]);


  useEffect(() => {
    onQueueUpdate((pos) => setQueuePosition(pos));
  }, [onQueueUpdate]);


  useEffect(() => {
    onRoundStarted((data) => {

      setGameData(opponentAvatar ? { ...data, opponentAvatar } : data);
      setSelectedCategory(data?.category);
      if ((data?.roundNumber || 1) === 1) {
        setCumulativeTotals({ p1: 0, p2: 0 });
      }
      setExercises(Array.isArray(data?.exercises) ? data.exercises : []);
      setQuestionIndex(0);
      setAnswerText('');
      setMyRoundScore(0);
      setHasCompletedRound(false);
      setQuestionStartTime(Date.now());
      setGameState('ROULETTE');
    });
  }, [onRoundStarted]);

  // rONNDA Terminada
  useEffect(() => {
    onRoundFinished((data) => {
      setGameData(opponentAvatar ? { ...data, opponentAvatar } : data);
      setRoundBeforeTotals({
        p1: typeof data?.player1TotalScore === 'number' && typeof data?.player1Score === 'number'
          ? Math.max(0, Number(data.player1TotalScore) - Number(data.player1Score))
          : cumulativeTotals.p1,
        p2: typeof data?.player2TotalScore === 'number' && typeof data?.player2Score === 'number'
          ? Math.max(0, Number(data.player2TotalScore) - Number(data.player2Score))
          : cumulativeTotals.p2,
      });
      setCumulativeTotals((prev) => {
        const nextP1 = typeof data?.player1TotalScore === 'number'
          ? Number(data.player1TotalScore)
          : prev.p1 + Number(data?.player1Score ?? 0);
        const nextP2 = typeof data?.player2TotalScore === 'number'
          ? Number(data.player2TotalScore)
          : prev.p2 + Number(data?.player2Score ?? 0);
        return { p1: Math.max(0, nextP1), p2: Math.max(0, nextP2) };
      });
      setIsTransitioningFromQuiz(false);
      setGameState('ROUND_RESULT');
    });
  }, [onRoundFinished]);

  // MAtch Terminado
  useEffect(() => {
    onGameFinished((data) => {

      setGameData(opponentAvatar ? { ...data, opponentAvatar } : data);
      setGameState('MATCH_END');
    });
  }, [onGameFinished]);


  useEffect(() => {
    const p1Id = (gameData as any)?.player1Id as string | undefined;
    const p2Id = (gameData as any)?.player2Id as string | undefined;
    if (!p1Id || !p2Id) return;
    // Evitar refetch si los avatares ya están presentes
    const hasP1 = Boolean((gameData as any)?.player1Avatar);
    const hasP2 = Boolean((gameData as any)?.player2Avatar);
    if (hasP1 && hasP2) return;
    let cancelled = false;
    (async () => {
      try {
        const resolveAvatar = async (id: string): Promise<Avatar | null> => {
          const fetched = await getUserAvatar(id);
          return fetched ?? null;
        };
        const [p1Av, p2Av] = await Promise.all([
          hasP1 ? Promise.resolve((gameData as any)?.player1Avatar as Avatar) : resolveAvatar(p1Id),
          hasP2 ? Promise.resolve((gameData as any)?.player2Avatar as Avatar) : resolveAvatar(p2Id),
        ]);
        if (!cancelled) {
          setGameData((prev: any) => (prev ? { ...prev, player1Avatar: p1Av || undefined, player2Avatar: p2Av || undefined } : prev));
        }
      } catch {
      }
    })();
    return () => { cancelled = true; };
  }, [(gameData as any)?.player1Id, (gameData as any)?.player2Id]);

  useEffect(() => {
    const p1 = (gameData as any)?.player1Id as string | undefined;
    const p2 = (gameData as any)?.player2Id as string | undefined;
    const myId = user?.id;
    const inferredOpponentId = myId && p1 && p2 ? (p1 === myId ? p2 : p1) : undefined;
    const knownOpponentId = opponent?.userId || inferredOpponentId;
    if (!knownOpponentId || opponentAvatar) return;
    let cancelled = false;
    (async () => {
      try {
        const av = await getUserAvatar(knownOpponentId);
        if (!cancelled && av) {
          setOpponentAvatar(av);
          setGameData((prev: any) => (prev ? { ...prev, opponentAvatar: av } : prev));
        }
      } catch {
        // ignore
      }
    })();
    return () => { cancelled = true; };
  }, [opponent?.userId, (gameData as any)?.player1Id, (gameData as any)?.player2Id, user?.id, opponentAvatar]);

  // ELO
  useEffect(() => {
    const fetchElo = async () => {
      try {
        const didWin = gameData?.winner ? gameData?.winner === socketId : false;
        const uid = user?.id;
        if (!uid) {
          setEloInfo(null);
          return;
        }
        const info = await getUserElo(uid, didWin);
        if (info) {
          const payload = { currentElo: Math.max(0, info.elo), beforeElo: Math.max(0, info.beforeElo) };
          console.log('[ELO] MATCH_END fetched:', {
            didWin,
            currentElo: payload.currentElo,
            beforeElo: payload.beforeElo,
          });
          setEloInfo(payload);
        } else {
          setEloInfo(null);
        }
      } catch {
        setEloInfo(null);
      }
    };
    if (gameState === 'MATCH_END') {
      fetchElo();
    } else {
      setEloInfo(null);
    }
  }, [gameState, gameData?.winner, socketId, user?.id]);

  useEffect(() => {
    onAnswerResult((result: { exerciseId: string; isCorrect: boolean; correctAnswer: number; currentScore?: number; totalExercises?: number }) => {
      if (typeof result?.currentScore === 'number') {
        setMyRoundScore(result.currentScore);
      }
      setAnswerText('');
    });
  }, [onAnswerResult, exercises.length]);

  // Quiz helpers
  const handleDigit = (d: string) => {
    setAnswerText((prev) => (prev.length >= 8 ? prev : (prev === '0' ? d : prev + d)));
  };
  const handleClear = () => setAnswerText('');
  const handleOk = () => {
    const current = exercises[questionIndex];
    if (!current || !currentRoom) return;
    const parsed = Number(answerText);
    if (Number.isNaN(parsed)) return;
    const payload = {
      roomId: currentRoom,
      userId: myUserId,
      exerciseId: current.id,
      answer: parsed,
      responseTime: Date.now() - questionStartTime,
    };
    websocketService.emit('answer-exercise', payload);

    setAnswerText('');
    setQuestionIndex((idx) => {
      const next = idx + 1;
      if (next >= exercises.length) {
        setHasCompletedRound(true);
        return Math.min(idx, Math.max(0, exercises.length - 1));
      } else {
        setQuestionStartTime(Date.now());
        return next;
      }
    });
  };

  // Helper animation utilities
  const runTiming = (value: Animated.Value, toValue: number, duration: number, extra: Partial<Animated.TimingAnimationConfig> = {}) =>
    new Promise<void>((resolve) => {
      Animated.timing(value, { toValue, duration, easing: Easing.out(Easing.cubic), useNativeDriver: true, ...extra }).start(() => resolve());
    });
  const runParallel = (animations: Animated.CompositeAnimation[]) => new Promise<void>((resolve) => Animated.parallel(animations).start(() => resolve()));
  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const startRouletteToQuizTransition = async () => {
    // Prepare overlay
    setIsTransitioningToQuiz(true);
    setTransitionBgColor(selectedCategory?.color || '#22D3EE');
    circleScale.setValue(0.1);
    circleTranslateY.setValue(height * 0.5); // start from bottom half
    whiteScale.setValue(0);
    textOpacity.setValue(0);
    overlayTranslateY.setValue(0);
    bgOpacity.setValue(0);
    contentOpacity.setValue(0);
    contentTranslateY.setValue(10);
    bgTranslateY.setValue(0);

    // 1) Circle rises and fills the screen
    await runParallel([
      Animated.timing(circleTranslateY, { toValue: 0, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(circleScale, { toValue: fillScale, duration: 1000, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
      Animated.timing(bgOpacity, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
    ]);

    // 2) White center pulse + title/subtitle fade-in
    await runParallel([
      Animated.timing(whiteScale, { toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(textOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(contentOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(contentTranslateY, { toValue: 0, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]);

    // 3) Hold while Lottie plays
    await delay(3000);

    // 4) Fade-down content + move background slightly down
    await runParallel([
      Animated.timing(textOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(contentOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(contentTranslateY, { toValue: 30, duration: 300, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(bgTranslateY, { toValue: 40, duration: 300, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]);
    // 5) Switch content under the overlay, then mirror the entrance:
    //    fade the background while the main circle slides down and shrinks,
    //    revealing the QUIZ underneath.
    setGameState('QUIZ');
    setQuestionStartTime(Date.now());
    await runParallel([
      Animated.timing(circleTranslateY, { toValue: height * 0.9, duration: 600, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(circleScale, { toValue: 0.08, duration: 600, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(whiteScale, { toValue: 0, duration: 300, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]);

    // Cleanup
    setIsTransitioningToQuiz(false);
    bgOpacity.setValue(0); // Hide instantly after overlay is removed to avoid flashing underlying content
    bgTranslateY.setValue(0);
    contentTranslateY.setValue(0);
    circleScale.setValue(0.1);
    circleTranslateY.setValue(0);
  };

  const startQuizToResultTransition = async () => {
    // Prepare overlay
    setIsTransitioningFromQuiz(true);
    setTransitionBgColor('#22C55E');
    circleScale.setValue(0.1);
    circleTranslateY.setValue(height * 0.5);
    whiteScale.setValue(0);
    textOpacity.setValue(0);
    overlayTranslateY.setValue(0);
    bgOpacity.setValue(0);
    contentOpacity.setValue(0);
    contentTranslateY.setValue(10);
    bgTranslateY.setValue(0);

    // 1) Circle rises and fills the screen
    await runParallel([
      Animated.timing(circleTranslateY, { toValue: 0, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(circleScale, { toValue: fillScale, duration: 1000, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
      Animated.timing(bgOpacity, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
    ]);

    // 2) White center pulse + title/subtitle fade-in
    await runParallel([
      Animated.timing(whiteScale, { toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(textOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(contentOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(contentTranslateY, { toValue: 0, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]);

    // 3) Hold while Lottie plays
    await delay(3000);

    // 4) Fade-down content + move background slightly down
    await runParallel([
      Animated.timing(textOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(contentOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(contentTranslateY, { toValue: 30, duration: 300, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(bgTranslateY, { toValue: 40, duration: 300, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]);
    // 5) Switch content under the overlay, then slide overlay off-screen to reveal it
    setGameState('ROUND_RESULT');
    await runTiming(overlayTranslateY as Animated.Value, height, 500, { easing: Easing.inOut(Easing.cubic) });

    // Cleanup
    setIsTransitioningFromQuiz(false);
    bgOpacity.setValue(0);
    bgTranslateY.setValue(0);
    contentTranslateY.setValue(0);
  };

  // Evitar llamar findPlayer múltiples veces (evita "Ya estás en la cola de espera")
  const hasInitiatedSearch = useRef(false);
  useEffect(() => {
    if (isConnected && !hasInitiatedSearch.current) {
      hasInitiatedSearch.current = true;
      findPlayer(myUserId, myUsername);
    }
  }, [isConnected, findPlayer, myUserId, myUsername]);

  const handleCancel = () => {
    cancelSearch(myUserId);
    router.back();
  };

  const handleExitMatchEnd = () => {
    websocketService.disconnect();
    router.back();
  };

  // Cuando aparece MATCH_FOUND, espera 5s luego desvanece y mueve a ROULETTE
  useEffect(() => {
    if (gameState === 'MATCH_FOUND') {
      const t = setTimeout(() => {
        setIsExitingMatchFound(true);
      }, 5000);
      return () => clearTimeout(t);
    } else {
      setIsExitingMatchFound(false);
    }
  }, [gameState]);

  // 1v1!!
  function renderContent() {
    switch (gameState) {
      case 'MATCHMAKING':
        return (
          <MatchmakingView
            username={myUsername?.toUpperCase()}
            avatarComponent={<LayeredAvatar avatar={avatar} size={92} />}
            onCancel={handleCancel}
            position={queuePosition}
            isExiting={isExitingMatchmaking}
            onExitComplete={() => {
              setGameState('MATCH_FOUND');
              setIsExitingMatchmaking(false);
            }}
          />
        );
      case 'MATCH_FOUND':
        return (
          <MatchFoundView
            me={{ username: myUsername?.toUpperCase(), avatarComponent: <LayeredAvatar avatar={avatar} size={92} /> }}
            opponent={{
              username: (opponent?.username || 'OPONENTE').toUpperCase(),
              avatarComponent: <LayeredAvatar avatar={opponentAvatar || defaultAvatar} size={92} />,
            }}
            isExiting={isExitingMatchFound}
            onExitComplete={() => {
              setGameState('ROULETTE');
            }}
          />
        );
      case 'ROULETTE':
        return (
          <View style={styles.rouletteStage}>
            {(() => {
              // Prepare faces ensuring the local player is on the left, and scores align
              const p1Username = (gameData?.player1Username || myUsername || 'P1').toString();
              const p2Username = (gameData?.player2Username || opponent?.username || 'P2').toString();
              const p1Total = (typeof gameData?.player1TotalScore === 'number' ? gameData.player1TotalScore : cumulativeTotals.p1);
              const p2Total = (typeof gameData?.player2TotalScore === 'number' ? gameData.player2TotalScore : cumulativeTotals.p2);
              // Only require player ids to decide sides; avoid depending on socketId here
              const haveIds = Boolean(gameData?.player1Id && gameData?.player2Id);
              // Decide sides using the player's userId to support being P1 or P2
              const meIsP1 = haveIds ? (gameData?.player1Id === myUserId) : true;

              const meFace = meIsP1
                ? { username: p1Username, avatarComponent: <LayeredAvatar avatar={(gameData as any)?.player1Avatar || avatar} size={56} />, totalScore: p1Total }
                : { username: p2Username, avatarComponent: <LayeredAvatar avatar={(gameData as any)?.player2Avatar || avatar} size={56} />, totalScore: p2Total };
              const oppFace = meIsP1
                ? { username: p2Username, avatarComponent: <LayeredAvatar avatar={(gameData as any)?.player2Avatar || opponentAvatar || defaultAvatar} size={56} />, totalScore: p2Total }
                : { username: p1Username, avatarComponent: <LayeredAvatar avatar={(gameData as any)?.player1Avatar || opponentAvatar || defaultAvatar} size={56} />, totalScore: p1Total };

              return (
                <RouletteView
                  selectedCategory={selectedCategory}
                  player1={{
                    userId: gameData?.player1Id,
                    username: p1Username,
                    avatarComponent: (gameData as any)?.player1Avatar ? <LayeredAvatar avatar={(gameData as any)?.player1Avatar} size={56} /> : null,
                    totalScore: p1Total
                  }}
                  player2={{
                    userId: gameData?.player2Id,
                    username: p2Username,
                    avatarComponent: (gameData as any)?.player2Avatar ? <LayeredAvatar avatar={(gameData as any)?.player2Avatar} size={56} /> : null,
                    totalScore: p2Total
                  }}
                  currentUserId={myUserId}
                  onSpinComplete={() => {
                    if (exercises.length >= 6) {
                      startRouletteToQuizTransition();
                    }
                  }}
                />
              );
            })()}
          </View>
        );
      case 'QUIZ':
        return (
          <QuizView
            roundNumber={gameData?.roundNumber || 1}
            category={selectedCategory}
            question={exercises[questionIndex]?.question ?? '...'}
            index={Math.min(questionIndex, exercises.length ? exercises.length - 1 : 0)}
            total={exercises.length || 6}
            answerText={answerText}
            localScore={myRoundScore}
            disabled={hasCompletedRound}
            onDigit={handleDigit}
            onClear={handleClear}
            onOk={handleOk}
          />
        );
      case 'ROUND_RESULT':
        return (
          <RoundResultView
            roundNumber={gameData?.roundNumber || 1}
            player1Username={gameData?.player1Username || 'P1'}
            player2Username={gameData?.player2Username || 'P2'}
            player1Score={gameData?.player1Score ?? 0}
            player2Score={gameData?.player2Score ?? 0}
            player1TotalBefore={roundBeforeTotals.p1}
            player2TotalBefore={roundBeforeTotals.p2}
            winner={gameData?.winner}
            mySocketId={socketId}
            player1Id={gameData?.player1Id}
            player2Id={gameData?.player2Id}
          />
        );
      case 'MATCH_END':
        return (
          <MatchEndView
            didWin={gameData?.winner ? gameData?.winner === socketId : false}
            player1Username={gameData?.player1Username || 'P1'}
            player2Username={gameData?.player2Username || 'P2'}
            player1TotalScore={gameData?.player1TotalScore ?? 0}
            player2TotalScore={gameData?.player2TotalScore ?? 0}
            pointsDelta={(gameData?.winner === socketId ? gameData?.globalPointsUpdate?.winner : gameData?.globalPointsUpdate?.loser) ?? 0}
            eloInfo={eloInfo || undefined}
            onExit={handleExitMatchEnd}
          />
        );
      default:
        return <View />;
    }
  }

  if (!fontsLoaded) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#9C58FE", "#6F52FD"]} style={styles.gradientBackground} />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        {connectionError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>⚠️ {connectionError}</Text>
            {!isConnected && (
              <Text style={styles.errorHint}>
                Check console logs for debugging info
              </Text>
            )}
          </View>
        )}
        {renderContent()}

        {(isTransitioningToQuiz || isTransitioningFromQuiz) && (
          <Animated.View
            pointerEvents="none"
            style={[styles.transitionOverlay, { transform: [{ translateY: overlayTranslateY }] }]}
          >
            {/* Background gradient crossfade for the transition */}
            <Animated.View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, opacity: bgOpacity, transform: [{ translateY: bgTranslateY }] }}>
              <LinearGradient
                colors={[darken(transitionBgColor, 0.25), lighten(transitionBgColor, 0.1)]}
                style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
              />
            </Animated.View>

            {/* Rising circle that fills screen */}
            <Animated.View
              style={[
                styles.transitionCircle,
                {
                  backgroundColor: isTransitioningFromQuiz ? '#22C55E' : (selectedCategory?.color || '#22D3EE'),
                  transform: [
                    { translateY: circleTranslateY },
                    { scale: circleScale },
                  ],
                },
              ]}
            />

            {/* Center white pulse */}
            <Animated.View
              style={[
                styles.centerPulse,
                {
                  transform: [{ scale: whiteScale }],
                },
              ]}
            />

            {/* Title + subtitle */}
            <Animated.View style={[styles.centerTextContainer, { opacity: textOpacity, transform: [{ translateY: contentTranslateY }] }]}>
              <Text style={styles.centerTitle}>
                {isTransitioningFromQuiz ? 'RESULTADOS' : `ROUND ${gameData?.roundNumber || 1}`}
              </Text>
              <Text style={styles.centerSubtitle}>
                {isTransitioningFromQuiz ? '¡BUEN TRABAJO!' : (selectedCategory?.name || 'SUMAS!').toUpperCase()}
              </Text>
            </Animated.View>

            {/* Lottie animation in center */}
            <Animated.View style={{ opacity: contentOpacity, transform: [{ translateY: contentTranslateY }] }}>
              <LottieView
                source={isTransitioningFromQuiz
                  ? require('@/assets/lotties/extras/Confetti_quick.json')
                  : getMascotIdleSource(selectedCategory?.emoji)}
                autoPlay
                loop={isTransitioningFromQuiz ? false : true}
                style={styles.centerLottie}
              />
            </Animated.View>
          </Animated.View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  rouletteStage: { flex: 1 },
  gradientBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#6D28D9' },
  errorContainer: {
    backgroundColor: 'rgba(255, 0, 0, 0.2)',
    padding: 12,
    margin: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF4444',
  },
  errorText: {
    color: '#FFEEEE',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorHint: {
    color: '#FFCCCC',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  // Component styles moved into respective components
  transitionOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transitionCircle: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    bottom: '15%',
  },
  centerPulse: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFFFFF',
  },
  centerTextContainer: {
    position: 'absolute',
    top: '28%',
    alignItems: 'center',
  },
  centerTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  centerSubtitle: {
    marginTop: 6,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  centerLottie: {
    width: 160,
    height: 160,
  },
});


