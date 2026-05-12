import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Dimensions, Easing, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LayeredAvatar } from '@/components/LayeredAvatar';
import InactivityModal from '@/components/InactivityModal';
import ConfirmModal from '@/components/ConfirmModal';
import MatchEndView from '@/components/matchmaking/MatchEndView';
import MatchFoundView from '@/components/matchmaking/MatchFoundView';
import MatchmakingView from '@/components/matchmaking/MatchmakingView';
import QuizView from '@/components/matchmaking/QuizView';
import RouletteView from '@/components/matchmaking/RouletteView';
import RoundResultView from '@/components/matchmaking/RoundResultView';
import { defaultAvatar } from '@/constants/avatarAssets';
import AnimatedMathBackground from '@/components/ui/AnimatedMathBackground';
import { useAuth } from '@/contexts/AuthContext';
import { useAvatar } from '@/contexts/AvatarContext';
import { useFontContext } from '@/contexts/FontsContext';
import { useWebSocket } from '@/hooks/useWebSocket';
import { getUserAvatar, getUserElo, getUserRankInfo, UserRankInfo } from '@/services/SupabaseService';
import { Avatar } from '@/types/avatar';
import LottieView from 'lottie-react-native';
import { Alert } from 'react-native';

type GameState = 'MATCHMAKING' | 'MATCH_FOUND' | 'COUNTDOWN' | 'ROULETTE' | 'QUIZ' | 'ROUND_RESULT' | 'MATCH_END';

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
  return (mascotName && MASCOT_IDLE_SOURCES[mascotName]) || null;
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
    onUserLeft,
    onPlayerCompleted,
    onTimerStarted,
    onMessage,
    onChatMessage,
    currentRoom,
    socketId,
    websocketService,
    forfeitGame,
    sendMessage,
    sendChatMessage,
    typingUsers,
  } = useWebSocket();

  const [gameState, setGameState] = useState<GameState>('MATCHMAKING');
  const gameStateRef = useRef<GameState>('MATCHMAKING');

  // Update ref whenever state changes
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);
  const [myRole, setMyRole] = useState<'p1' | 'p2' | null>(null);
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
  const [myRankInfo, setMyRankInfo] = useState<UserRankInfo | null>(null);
  const [opponentRankInfo, setOpponentRankInfo] = useState<UserRankInfo | null>(null);

  // Quiz state
  type Exercise = { id: string; question: string; answer: number; options?: number[]; category: string; startTime?: number };
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answerText, setAnswerText] = useState<string>('');
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [myRoundScore, setMyRoundScore] = useState<number>(0);
  const [opponentRoundScore, setOpponentRoundScore] = useState<number>(0);
  const [hasCompletedRound, setHasCompletedRound] = useState<boolean>(false);
  const [opponentFinished, setOpponentFinished] = useState<boolean>(false);
  const [finalCountdown, setFinalCountdown] = useState<number | null>(null);
  
  // Inactividad: 3 minutos
  const INACTIVITY_LIMIT = 3 * 60 * 1000;
  const lastActivityTime = useRef(Date.now());
  const matchStartTimeRef = useRef(Date.now());
  const [lastEmote, setLastEmote] = useState<{ userId: string; emote: string; timestamp: number } | null>(null);
  const [lastAnswerResult, setLastAnswerResult] = useState<{ correct: boolean; timestamp: number } | null>(null);

  // Initial countdown state
  const [countdown, setCountdown] = useState(3);
  const [isInitialCountdown, setIsInitialCountdown] = useState(false);
  const countdownScale = useRef(new Animated.Value(1)).current;
  const countdownOpacity = useRef(new Animated.Value(1)).current;

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
    const unsubPlayerFound = onPlayerFound((data) => {
      // Solo ignoramos si la partida ya finalizó por completo
      if (gameStateRef.current === 'MATCH_END') {
        console.log('⚠️ Ignorando player-found: partida ya finalizada');
        return;
      }

      console.log('✅ Player found! Transitioning to MATCH_FOUND');
      setGameState('MATCH_FOUND');

      // Fetch rank info for both
      if (myUserId) {
        getUserRankInfo(myUserId).then(setMyRankInfo);
      }
      if (data.opponent?.userId) {
        getUserRankInfo(data.opponent.userId).then(setOpponentRankInfo);
      }

      setOpponent(data.opponent ?? null);
      if (data.selectedCategory) setSelectedCategory(data.selectedCategory);

      // Determine role immediately from room users list
      const currentSocketId = websocketService.socketId;
      const meIndex = data.users?.findIndex(u =>
        (u.socketId && u.socketId === currentSocketId) ||
        (u.id && (u.id === user?.id || u.id === myUserId))
      ) ?? -1;

      if (meIndex !== -1) {
        const role = meIndex === 0 ? 'p1' : 'p2';
        setMyRole(role);
        console.log('[Match Found] Assigned Role:', role);
      } else {
        setMyRole('p1');
        console.log('[Match Found] WARNING: Defaulting to p1');
      }

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
    const unsubRoundStarted = onRoundStarted((data) => {
      // Solo ignoramos si la partida ya terminó definitivamente
      if (gameStateRef.current === 'MATCH_END') {
        console.log('⚠️ Ignorando round-started porque la partida ya finalizó');
        return;
      }

      console.log('🎯 Round started! Round number:', data?.roundNumber);

      setGameData(opponentAvatar ? { ...data, opponentAvatar } : data);
      setSelectedCategory(data?.category);
      if ((data?.roundNumber || 1) === 1) {
        setCumulativeTotals({ p1: 0, p2: 0 });
      }
      setExercises(Array.isArray(data?.exercises) ? data.exercises : []);
      setQuestionIndex(0);
      setAnswerText('');
      setMyRoundScore(0);
      setOpponentRoundScore(0);
      setHasCompletedRound(false);
      setOpponentFinished(false);
      setFinalCountdown(null);
      setLastEmote(null);
      setLastAnswerResult(null);
      setQuestionStartTime(Date.now());
      matchStartTimeRef.current = Date.now();

      if ((data?.roundNumber || 1) === 1) {
        // Aseguramos que pasamos por MATCH_FOUND para ver los rangos
        if (gameState === 'MATCH_FOUND' || gameState === 'MATCHMAKING') {
          setGameState('MATCH_FOUND');
          // Esperamos 2.5 segundos para que se vea la animación de los rangos, iconos y avatares
          setTimeout(() => {
            setIsExitingMatchFound(true);
          }, 2500);
        } else {
          setGameState('ROULETTE');
        }
      } else {
        // If we are currently showing results, don't snap away
        if (gameState !== 'ROUND_RESULT') {
          setGameState('ROULETTE');
        }
      }
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

  // DETECCIÓN DEFINITIVA: Vía Typing (El único evento que el servidor retransmite)
  useEffect(() => {
    // Vigilamos los usuarios que están "escribiendo"
    Object.keys(typingUsers).forEach(uid => {
      if (typingUsers[uid]) {
        // En nuestro hack, el "username" de typingService contendrá el emote
        // Pero necesitamos acceder al servicio para ver qué mandó
        const isMe = uid === myUserId || uid === socketId;
        if (!isMe) {
          // Si el rival está "escribiendo", revisamos si es un emote
          // Nota: El servicio de typing del server suele mandar el evento a todos
          // Vamos a usar un listener directo para mayor precisión
        }
      }
    });
  }, [typingUsers]);

  useEffect(() => {
    // Escuchador directo de typing para capturar el emote camuflado
    const unsubTyping = websocketService.onTyping((data: any) => {
      const isMe = data.userId === myUserId || data.userId === socketId;
      if (!isMe && data.isTyping && data.username.startsWith('emote:')) {
        const emoteId = data.username.replace('emote:', '');
        setLastEmote({
          userId: 'opponent',
          emote: emoteId,
          timestamp: Date.now()
        });
      }
    });
    return () => {
      if (typeof unsubTyping === 'function') {
        (unsubTyping as Function)();
      }
    };
  }, [myUserId, socketId]);

  useEffect(() => {
    // Escuchador de chat real para los mensajes predeterminados
    const unsubChat = onChatMessage((data: any) => {
      const isMe = data.userId === myUserId || data.userId === socketId;
      setLastEmote({
        userId: isMe ? 'me' : 'opponent',
        emote: data.message,
        timestamp: Date.now()
      });
    });
    return () => unsubChat?.();
  }, [onChatMessage, myUserId, socketId]);

  // Match Terminado
  useEffect(() => {
    const unsubGameEnd = onGameFinished((data) => {
      console.log('🏆 Match finished data received');
      
      // BLOQUEO INMEDIATO DE INACTIVIDAD
      // Si el juego terminó (por cualquier razón, especialmente abandono),
      // ya no permitimos que salte el modal de inactividad.
      setShowInactivityModal(false);

      const amIWinner = data.winner === myUserId || data.winner === socketId;
      const isForfeit = data.forfeit || data.reason === 'abandoned';

      // RECALCULAR TOTALES DESDE EL ARREGLO DE RONDAS
      // A veces el server manda totales incompletos en caso de forfeit.
      if (Array.isArray(data.rounds)) {
        let realP1Total = 0;
        let realP2Total = 0;
        data.rounds.forEach((r: any) => {
          realP1Total += (r.player1Score || 0);
          realP2Total += (r.player2Score || 0);
        });
        console.log(`📊 Puntos reales calculados -> P1: ${realP1Total}, P2: ${realP2Total}`);
        data.player1TotalScore = realP1Total;
        data.player2TotalScore = realP2Total;
      }

      setGameData((prev: any) => {
        const base = opponentAvatar ? { ...data, opponentAvatar } : data;
        // Marcamos si la victoria fue por abandono para mostrarlo en la UI
        if (isForfeit && amIWinner) {
          base.winByForfeit = true;
        }
        return prev ? { ...prev, ...base } : base;
      });

      const delayTime = data.forfeit ? 500 : 2000;
      
      setTimeout(() => {
        setGameState('MATCH_END');
      }, delayTime); 
    });
    return () => unsubGameEnd?.();
  }, [onGameFinished, opponentAvatar, myUserId, socketId]);

  // Usuario sale de la sala
  useEffect(() => {
    const unsubUserLeft = onUserLeft((data) => {
      // Solo actuar si el oponente sale ANTES de terminar la partida
      const currentState = gameStateRef.current;
      if (data.userId === opponent?.userId && currentState !== 'MATCH_END' && currentState !== 'MATCHMAKING') {
        // Force match end with forfeit info
        setGameData((prev: any) => ({
          ...prev,
          winner: myUserId,
          forfeit: true,
          player1TotalScore: prev?.player1TotalScore || cumulativeTotals.p1,
          player2TotalScore: prev?.player2TotalScore || cumulativeTotals.p2,
        }));
        setGameState('MATCH_END');
      }
    });
    return () => unsubUserLeft?.();
  }, [onUserLeft, opponent?.userId, myUserId, cumulativeTotals]);


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

  // Initial Countdown Effect
  useEffect(() => {
    if (!isInitialCountdown) return;

    // Reset animations for each number
    countdownScale.setValue(1);
    countdownOpacity.setValue(1);

    Animated.sequence([
      Animated.parallel([
        Animated.timing(countdownScale, { toValue: 3, duration: 900, useNativeDriver: true }),
        Animated.timing(countdownOpacity, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ]).start();

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsInitialCountdown(false);
          // ¡YA! Ahora sí empezamos con la ruleta
          setGameState('ROULETTE');
          return 0;
        }

        countdownScale.setValue(1);
        countdownOpacity.setValue(1);

        Animated.sequence([
          Animated.parallel([
            Animated.timing(countdownScale, { toValue: 3, duration: 900, useNativeDriver: true }),
            Animated.timing(countdownOpacity, { toValue: 0, duration: 900, useNativeDriver: true }),
          ])
        ]).start();

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isInitialCountdown]);

  const [showInactivityModal, setShowInactivityModal] = useState(false);
  const [showConfirmForfeit, setShowConfirmForfeit] = useState(false);

  // Timer de inactividad de 3 minutos
  useEffect(() => {
    // Si el modal ya se está mostrando, NO permitimos que este efecto lo oculte
    if (showInactivityModal) return;

    if (gameState !== 'QUIZ') return;
    
    lastActivityTime.current = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - lastActivityTime.current;
      if (elapsed >= INACTIVITY_LIMIT) {
        clearInterval(interval);
        console.log('⏰ Inactividad detectada (3 min). Terminando partida...');
        
        // Aplicar penalización de inmediato
        import('@/services/SupabaseService').then(service => {
          service.incrementCurrentUserCoins(-15).catch(err => console.error('Error penalizando inactividad:', err));
        });

        setShowInactivityModal(true);
        
        if (currentRoom) {
          forfeitGame(currentRoom);
        }
      }
    }, 5000); // Revisar cada 5 segundos
    
    return () => clearInterval(interval);
  }, [gameState, currentRoom, showInactivityModal]);

  useEffect(() => {
    const unsubAns = onAnswerResult((result: any) => {
      lastActivityTime.current = Date.now(); // Reset de inactividad
      const isMe = !result.userId || result.userId === myUserId;

      if (typeof result?.currentScore === 'number') {
        if (isMe) {
          setMyRoundScore(result.currentScore);
        } else {
          setOpponentRoundScore(result.currentScore);
        }
      }

      if (isMe) {
        setAnswerText('');
        if (typeof result?.isCorrect === 'boolean') {
          setLastAnswerResult({
            correct: result.isCorrect,
            timestamp: Date.now()
          });
        }
      }
    });
    return () => unsubAns?.();
  }, [onAnswerResult, exercises.length, myUserId, socketId]);

  // Listener para cuando un jugador termina su quiz
  useEffect(() => {
    const unsubComp = onPlayerCompleted((data: { userId: string }) => {
      console.log('🏁 Player completed quiz:', data.userId);
      const currentSocketId = websocketService.socketId;
      if (data.userId !== currentSocketId && data.userId !== myUserId) {
        setOpponentFinished(true);
      }
    });
    return () => unsubComp?.();
  }, [onPlayerCompleted, myUserId]);

  // Listener para el temporizador final (30s)
  useEffect(() => {
    const unsubTimer = onTimerStarted((data: { time: number }) => {
      console.log('⏰ Final timer started:', data.time);
      setFinalCountdown(data.time);
    });
    return () => unsubTimer?.();
  }, [onTimerStarted]);

  // Quiz helpers
  const handleSendEmote = (emoteId: string) => {
    if (!currentRoom) return;

    // Usamos el nuevo sistema de chat del servidor
    sendChatMessage(currentRoom, emoteId, myUserId, myUsername);

    // Eco local inmediato ya no es necesario porque el servidor lo retransmite a todos incluyendo al emisor
    // Pero lo dejamos por latencia si quieres, aunque onChatMessage lo capturará.
  };

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
    await delay(1800);

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
    await delay(1800);

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
    // ONLY search if we are in the initial MATCHMAKING state and connected
    if (isConnected && gameState === 'MATCHMAKING' && !hasInitiatedSearch.current) {
      hasInitiatedSearch.current = true;
      console.log('🔍 Iniciando búsqueda de jugador...');
      findPlayer(myUserId, myUsername);
    }
  }, [isConnected, gameState, findPlayer, myUserId, myUsername]);

  const handleCancel = () => {
    cancelSearch(myUserId);
    router.back();
  };

  const handleForfeit = () => {
    setShowConfirmForfeit(true);
  };

  const confirmForfeit = () => {
    setShowConfirmForfeit(false);
    if (currentRoom) {
      forfeitGame(currentRoom);
    }
  };

  const handleExitMatchEnd = () => {
    console.log('🚪 Saliendo de la partida y reseteando estados...');
    cancelSearch(myUserId);
    websocketService.disconnect();
    hasInitiatedSearch.current = false;
    setMyRole(null); // Reset role for next time
    router.back();
  };

  // Cuando aparece MATCH_FOUND, esperamos a que onRoundStarted nos diga que ya podemos salir
  useEffect(() => {
    if (gameState !== 'MATCH_FOUND') {
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
            avatarComponent={<LayeredAvatar avatar={avatar} size={180} />}
            onCancel={handleCancel}
            position={queuePosition}
            isExiting={isExitingMatchmaking}
            onExitComplete={() => {
              // Ya no activamos el countdown aquí, se activa en onRoundStarted
              setGameState('MATCH_FOUND');
              setIsExitingMatchmaking(false);
            }}
          />
        );
      case 'MATCH_FOUND':
        return (
          <MatchFoundView
            me={{
              username: myUsername?.toUpperCase(),
              avatarComponent: <LayeredAvatar avatar={avatar} size={190} />,
              rankInfo: myRankInfo
            }}
            opponent={{
              username: (opponent?.username || 'OPONENTE').toUpperCase(),
              avatarComponent: <LayeredAvatar avatar={opponentAvatar || defaultAvatar} size={190} />,
              rankInfo: opponentRankInfo
            }}
            isExiting={isExitingMatchFound}
            onExitComplete={() => {
              // Una vez que termina la animación de salida, pasamos directamente a la ruleta
              setGameState('ROULETTE');
            }}
          />
        );

      case 'ROULETTE':
        {
          const haveIds = Boolean(gameData?.player1Id && gameData?.player2Id);
          const meIsP1 = myRole ? (myRole === 'p1') : (haveIds ? (gameData?.player1Id === socketId || gameData?.player1Id === myUserId) : true);
          const p1Av = (gameData as any)?.player1Avatar || (meIsP1 ? avatar : opponentAvatar) || defaultAvatar;
          const p2Av = (gameData as any)?.player2Avatar || (meIsP1 ? opponentAvatar : avatar) || defaultAvatar;
          const p1Total = (typeof gameData?.player1TotalScore === 'number' ? gameData.player1TotalScore : cumulativeTotals.p1);
          const p2Total = (typeof gameData?.player2TotalScore === 'number' ? gameData.player2TotalScore : cumulativeTotals.p2);

          return (
            <View style={styles.rouletteStage}>
              <RouletteView
                key={`roulette-${gameData?.roundNumber || 1}-${selectedCategory?.id || 'default'}`}
                selectedCategory={selectedCategory}
                leftPlayer={{
                  userId: myUserId,
                  username: myUsername,
                  avatarComponent: <LayeredAvatar avatar={meIsP1 ? p1Av : p2Av} size={140} />,
                  totalScore: meIsP1 ? p1Total : p2Total
                }}
                rightPlayer={{
                  userId: opponent?.userId || '',
                  username: opponent?.username || 'Oponente',
                  avatarComponent: <LayeredAvatar avatar={meIsP1 ? p2Av : p1Av} size={140} />,
                  totalScore: meIsP1 ? p2Total : p1Total
                }}
                onSpinComplete={() => {
                  if (exercises.length >= 6) {
                    startRouletteToQuizTransition();
                  }
                }}
              />
            </View>
          );
        }
      case 'QUIZ':
        {
          const haveIds = Boolean(gameData?.player1Id && gameData?.player2Id);
          const meIsP1 = myRole ? (myRole === 'p1') : (haveIds ? (gameData?.player1Id === socketId || gameData?.player1Id === myUserId) : true);
          const p1Av = (gameData as any)?.player1Avatar || (meIsP1 ? avatar : opponentAvatar) || defaultAvatar;
          const p2Av = (gameData as any)?.player2Avatar || (meIsP1 ? opponentAvatar : avatar) || defaultAvatar;

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
              myAvatar={meIsP1 ? p1Av : p2Av}
              opponentAvatar={meIsP1 ? p2Av : p1Av}
              myUsername={myUsername}
              opponentUsername={opponent?.username || 'Oponente'}
              myTotalScore={(meIsP1 ? cumulativeTotals.p1 : cumulativeTotals.p2) + myRoundScore}
              opponentTotalScore={(meIsP1 ? cumulativeTotals.p2 : cumulativeTotals.p1) + opponentRoundScore}
              opponentFinished={opponentFinished}
              finalCountdown={finalCountdown}
              emoteReceived={lastEmote}
              lastAnswerResult={lastAnswerResult}
              onDigit={handleDigit}
              onClear={handleClear}
              onOk={handleOk}
              onForfeit={handleForfeit}
              onSendEmote={handleSendEmote}
            />
          );
        }
      case 'ROUND_RESULT':
        {
          const haveIds = Boolean(gameData?.player1Id && gameData?.player2Id);
          const meIsP1 = myRole ? (myRole === 'p1') : (haveIds ? (gameData?.player1Id === socketId || gameData?.player1Id === myUserId) : true);
          const p1Av = (gameData as any)?.player1Avatar || (meIsP1 ? avatar : opponentAvatar) || defaultAvatar;
          const p2Av = (gameData as any)?.player2Avatar || (meIsP1 ? opponentAvatar : avatar) || defaultAvatar;

          const p1TotalBefore = roundBeforeTotals.p1;
          const p2TotalBefore = roundBeforeTotals.p2;

          return (
            <RoundResultView
              roundNumber={gameData?.roundNumber || 1}
              leftPlayer={{
                id: myUserId,
                username: myUsername,
                score: meIsP1 ? (gameData?.player1Score ?? 0) : (gameData?.player2Score ?? 0),
                totalBefore: meIsP1 ? p1TotalBefore : p2TotalBefore,
                avatar: meIsP1 ? p1Av : p2Av
              }}
              rightPlayer={{
                id: opponent?.userId || '',
                username: opponent?.username || 'Oponente',
                score: meIsP1 ? (gameData?.player2Score ?? 0) : (gameData?.player1Score ?? 0),
                totalBefore: meIsP1 ? p2TotalBefore : p1TotalBefore,
                avatar: meIsP1 ? p2Av : p1Av
              }}
              winner={gameData?.winner}
              isFinalRound={gameData?.isFinalRound}
              onDone={() => {
                if (gameData?.isFinalRound) {
                  setGameState('MATCH_END');
                } else {
                  setGameState('ROULETTE');
                }
              }}
            />
          );
        }
      case 'MATCH_END':
        {
          const haveIds = Boolean(gameData?.player1Id && gameData?.player2Id);
          const meIsP1 = myRole ? (myRole === 'p1') : (haveIds ? (gameData?.player1Id === socketId || gameData?.player1Id === myUserId) : true);
          const p1Av = (gameData as any)?.player1Avatar || (meIsP1 ? avatar : opponentAvatar) || defaultAvatar;
          const p2Av = (gameData as any)?.player2Avatar || (meIsP1 ? opponentAvatar : avatar) || defaultAvatar;

          return (
            <MatchEndView
              didWin={gameData?.winner ? gameData?.winner === socketId : false}
              player1Username={gameData?.player1Username || 'P1'}
              player2Username={gameData?.player2Username || 'P2'}
              player1TotalScore={gameData?.player1TotalScore ?? 0}
              player2TotalScore={gameData?.player2TotalScore ?? 0}
              player1Avatar={p1Av}
              player2Avatar={p2Av}
              winByForfeit={gameData.winByForfeit}
              pointsDelta={(gameData?.winner === socketId ? gameData?.globalPointsUpdate?.winner : gameData?.globalPointsUpdate?.loser) ?? 0}
              eloInfo={eloInfo || undefined}
              onExit={handleExitMatchEnd}
            />
          );
        }
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
        <AnimatedMathBackground />
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
              {getMascotIdleSource(selectedCategory?.emoji) || isTransitioningFromQuiz ? (
                <LottieView
                  source={isTransitioningFromQuiz
                    ? require('@/assets/lotties/extras/Confetti_quick.json')
                    : getMascotIdleSource(selectedCategory?.emoji)}
                  autoPlay
                  loop={isTransitioningFromQuiz ? false : true}
                  style={styles.centerLottie}
                />
              ) : null}
            </Animated.View>
          </Animated.View>
        )}
        {/* Modal de Inactividad */}
      <InactivityModal
        visible={showInactivityModal}
        onConfirm={handleExitMatchEnd}
        penaltyPoints={15}
      />

      {/* Modal de Confirmar Abandono */}
      <ConfirmModal
        visible={showConfirmForfeit}
        title="¿ABANDONAR PARTIDA?"
        message="Si abandonas ahora, perderás automáticamente y se te restarán puntos de ELO. ¿Estás seguro?"
        confirmText="SÍ, ABANDONAR"
        cancelText="NO, SEGUIR JUGANDO"
        onConfirm={confirmForfeit}
        onCancel={() => setShowConfirmForfeit(false)}
        type="danger"
      />
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
  avatarCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
  },
  transitionCircle: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
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
  countdownStage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  preparingText: {
    color: '#FFFFFF',
    fontSize: 24,
    letterSpacing: 2,
    opacity: 0.8,
  },
  initialCountdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialCountdownText: {
    color: '#FFD616',
    fontSize: 180,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 4, height: 4 },
    textShadowRadius: 20,
  },
});


