import { useAuth } from '@/contexts/AuthContext';
import { incrementCurrentUserCoins } from '@/services/SupabaseService';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { FadeInView } from '../shared/FadeInView';


type Props = {
  didWin: boolean;
  player1Username: string;
  player2Username: string;
  player1TotalScore: number;
  player2TotalScore: number;
  pointsDelta: number;
  eloInfo?: { currentElo: number; beforeElo: number }; // Optional: pass current user points/ELO to animate progress
  onExit: () => void;
};

export default function MatchEndView({ didWin, player1Username, player2Username, player1TotalScore, player2TotalScore, pointsDelta, eloInfo, onExit }: Props) {
  const { user } = useAuth();
  const currentUsername = (user?.username ?? '').trim().toLowerCase();
  const isPlayer1CurrentUser = (player1Username ?? '').trim().toLowerCase() === currentUsername && currentUsername.length > 0;
  const isPlayer2CurrentUser = (player2Username ?? '').trim().toLowerCase() === currentUsername && currentUsername.length > 0;
  const title = didWin ? '¡GANASTE!' : 'PERDISTE';
  const deltaPrefix = pointsDelta > 0 ? '+' : '-';
  const deltaColor = didWin ? '#10B981' : '#EF4444';
  const currentElo = typeof eloInfo?.currentElo === 'number' && Number.isFinite(eloInfo.currentElo) ? Math.max(0, Math.round(eloInfo.currentElo)) : null;
  const beforeElo = typeof eloInfo?.beforeElo === 'number' && Number.isFinite(eloInfo.beforeElo) ? Math.max(0, Math.round(eloInfo.beforeElo)) : null;
  const hasElo = currentElo !== null && beforeElo !== null;
  const isUp = hasElo ? currentElo! >= beforeElo! : pointsDelta >= 0;

  // Animated values
  const deltaValue = useRef(new Animated.Value(0)).current;
  const [displayDelta, setDisplayDelta] = useState<number>(0);
  const eloValue = useRef(new Animated.Value(hasElo ? beforeElo! : 0)).current;
  const [displayElo, setDisplayElo] = useState<number>(hasElo ? beforeElo! : 0);
  const [confettiVisible, setConfettiVisible] = useState<boolean>(didWin);
  const [coinsLottieVisible, setCoinsLottieVisible] = useState<boolean>(false);
  const [coinsAwarded, setCoinsAwarded] = useState<number>(0);
  const hasAwardedCoinsRef = useRef<boolean>(false);

  // Interpolate bar width between the min and max of before/current
  const minElo = useMemo(() => (hasElo ? Math.min(beforeElo!, currentElo!) : 0), [hasElo, beforeElo, currentElo]);
  const maxElo = useMemo(() => (hasElo ? Math.max(beforeElo!, currentElo!) : 1), [hasElo, beforeElo, currentElo]);
  const progressWidth = useMemo(() => {
    if (!hasElo) return '0%';
    if (maxElo === minElo) return '100%';
    // Animated via interpolation below
    return undefined as unknown as string;
  }, [hasElo, minElo, maxElo]);
  const barWidthStyle = hasElo
    ? {
        width: eloValue.interpolate({
          inputRange: [minElo, maxElo],
          outputRange: ['0%', '100%'],
          extrapolate: 'clamp',
        }) as unknown as string,
      }
    : { width: progressWidth };

  // Orchestrate sequence using FadeInView delays + explicit value animations
  useEffect(() => {
    // Reset values and visibility
    setConfettiVisible(didWin);
    deltaValue.setValue(0);
    setDisplayDelta(0);
    if (hasElo) {
      eloValue.setValue(beforeElo!);
      setDisplayElo(beforeElo!);
    }

    // Listeners for number updates
    const deltaListenerId = deltaValue.addListener(({ value }) => setDisplayDelta(Math.round(value)));
    const eloListenerId = eloValue.addListener(({ value }) => setDisplayElo(Math.round(value)));

    // Timing plan (~4–5 seconds total)
    const CONFETTI_VISIBLE_MS = 1200; // Confetti on-screen
    const COUNTER_DELAY_MS = CONFETTI_VISIBLE_MS; // Counter starts after confetti/title
    const COUNTER_DURATION_MS = 1200;
    const PROGRESS_DELAY_MS = COUNTER_DELAY_MS + COUNTER_DURATION_MS + 200; // After counter
    const PROGRESS_DURATION_MS = 1200;
    // Exit button reveal target around 3.8–4.1s regardless of ELO presence
    const EXIT_DELAY_MS = 3800;

    // Cap counter 0→30 when won
    const targetDelta = didWin ? Math.min(Math.max(pointsDelta, 0), 30) : Math.abs(pointsDelta);

    // Hide confetti after visible window
    let confettiTimeout: ReturnType<typeof setTimeout> | null = null;
    if (didWin) {
      confettiTimeout = setTimeout(() => setConfettiVisible(false), CONFETTI_VISIBLE_MS);
    } else {
      setConfettiVisible(false);
    }

    // Start counter at the planned delay
    const counterTimeout = setTimeout(() => {
      Animated.timing(deltaValue, {
        toValue: targetDelta,
        duration: COUNTER_DURATION_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    }, COUNTER_DELAY_MS);

    // Start ELO progress after counter completes (if available)
    let progressTimeout: ReturnType<typeof setTimeout> | null = null;
    if (hasElo) {
      progressTimeout = setTimeout(() => {
        Animated.timing(eloValue, {
          toValue: currentElo!,
          duration: PROGRESS_DURATION_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }).start();
      }, PROGRESS_DELAY_MS);
    }

    return () => {
      if (deltaListenerId) deltaValue.removeListener(deltaListenerId);
      if (eloListenerId) eloValue.removeListener(eloListenerId);
      deltaValue.removeAllListeners();
      eloValue.removeAllListeners();
      if (confettiTimeout) clearTimeout(confettiTimeout);
      clearTimeout(counterTimeout);
      if (progressTimeout) clearTimeout(progressTimeout);
    };
  }, [didWin, pointsDelta, hasElo, beforeElo, currentElo, deltaValue, eloValue]);
  
  // Award coins once per match end view mount
  useEffect(() => {
    if (hasAwardedCoinsRef.current) return;
    hasAwardedCoinsRef.current = true;

    // Assume "Points" refers to the current player's total score:
    // winner's score if didWin, otherwise loser's score.
    const myScore = didWin
      ? Math.max(player1TotalScore ?? 0, player2TotalScore ?? 0)
      : Math.min(player1TotalScore ?? 0, player2TotalScore ?? 0);

    const base = Math.floor((myScore || 0) / 10);
    const coinsToAdd = base > 0 ? (didWin ? base * 3 : base) : 0;

    if (coinsToAdd <= 0) return;

    setCoinsAwarded(coinsToAdd);

    // Show coin lottie after a delay (after ELO animation completes)
    const coinsDelay = setTimeout(() => {
      setCoinsLottieVisible(true);
      // Solo persistir monedas si hay usuario autenticado (evita "No authenticated user")
      if (!user?.id) return;
      (async () => {
        try {
          await incrementCurrentUserCoins(coinsToAdd);
        } catch {
          // ignore errors; user coins can be refreshed elsewhere
        }
      })();
    }, 3200); // Show after ELO animation

    return () => clearTimeout(coinsDelay);
  }, [didWin, player1TotalScore, player2TotalScore, user?.id]);

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#9C58FE", "#6F52FD"]} style={styles.gradientBackground} />

      <View style={styles.content}>
        <FadeInView delay={0} duration={600} from="top">
          <Text style={[styles.title, { fontFamily: 'Digitalt' }]}>{title}</Text>
        </FadeInView>

        {/* Confetti overlay on top */}
        {didWin && confettiVisible && (
          <FadeInView delay={0} duration={300}>
            <View pointerEvents="none" style={styles.confettiOverlay}>
              <LottieView
                source={require('@/assets/lotties/extras/Confetti_quick.json')}
                autoPlay
                loop={false}
                style={styles.confettiLottie}
              />
            </View>
          </FadeInView>
        )}

        <FadeInView delay={1200} duration={300} from="bottom" style={styles.deltaBox}>
          <Text style={[styles.deltaText, { color: deltaColor, fontFamily: 'Digitalt' }]}>{deltaPrefix}{displayDelta}</Text>
          <Text style={[styles.deltaCaption, { fontFamily: 'Gilroy-Black' }]}>PUNTOS</Text>
        </FadeInView>

        {/* Always reserve space for ELO, show only if available */}
        <View style={styles.eloContainer}>
          {hasElo ? (
            <FadeInView delay={2600} duration={300} from="bottom">
              <View style={styles.eloHeader}>
                <Text style={[styles.eloTitle, { fontFamily: 'Gilroy-Black' }]}>ELO</Text>
                <Text style={[styles.eloValue, { fontFamily: 'Digitalt', color: isUp ? '#34D399' : '#F87171' }]}>{displayElo}</Text>
              </View>
              <View style={styles.progressTrack}>
                <Animated.View
                  style={[
                    styles.progressFill,
                    {
                      ...(barWidthStyle as any),
                      backgroundColor: isUp ? '#34D399' : '#F87171',
                    },
                  ]}
                />
              </View>
            </FadeInView>
          ) : null}
        </View>

        <View style={styles.scoresBox}>
          <View style={styles.scoreRow}>
            <Text
              style={[
                styles.userText,
                { fontFamily: 'Gilroy-Black' },
                isPlayer1CurrentUser && styles.userTextHighlight,
              ]}
              numberOfLines={1}
            >
              @{player1Username?.toUpperCase() || 'P1'}
            </Text>
            <Text 
              style={[
                styles.scoreText, 
                { fontFamily: 'Digitalt' },
                isPlayer1CurrentUser && styles.scoreTextHighlight,
              ]}
            >
              {player1TotalScore ?? 0}
            </Text>
          </View>
          <View style={styles.scoreRow}>
            <Text
              style={[
                styles.userText,
                { fontFamily: 'Gilroy-Black' },
                isPlayer2CurrentUser && styles.userTextHighlight,
              ]}
              numberOfLines={1}
            >
              @{player2Username?.toUpperCase() || 'P2'}
            </Text>
            <Text 
              style={[
                styles.scoreText, 
                { fontFamily: 'Digitalt' },
                isPlayer2CurrentUser && styles.scoreTextHighlight,
              ]}
            >
              {player2TotalScore ?? 0}
            </Text>
          </View>
        </View>

        {/* Always reserve space for coins */}
        <View style={styles.coinsContainer}>
          {coinsLottieVisible && coinsAwarded > 0 ? (
            <FadeInView delay={0} duration={400}>
              <View pointerEvents="none" style={styles.coinsContent}>
                <LottieView
                  source={require('@/assets/lotties/extras/MQ-Coins.json')}
                  autoPlay
                  loop
                  style={styles.coinsLottie}
                />
                <Text style={[styles.coinsText, { fontFamily: 'Gilroy-Black' }]}>{coinsAwarded}</Text>
              </View>
            </FadeInView>
          ) : null}
        </View>

        <FadeInView delay={3800} duration={300} from="bottom">
          <Pressable onPress={onExit} style={({ pressed }) => [styles.exitButton, pressed && { opacity: 0.9 }]}>
            <LinearGradient colors={["#FFD616", "#F65D00"]} style={styles.exitButtonGradient}>
              <Text style={[styles.exitText, { fontFamily: 'Gilroy-Black' }]}>SALIR</Text>
            </LinearGradient>
          </Pressable>
        </FadeInView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradientBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  title: { color: '#FFFFFF', fontSize: 36, fontWeight: '900', letterSpacing: 1.5, marginBottom: 12 },
  deltaBox: { alignItems: 'center', marginBottom: 20 },
  deltaText: { fontSize: 42, fontWeight: '900' },
  deltaCaption: { color: '#EAE6FF', fontSize: 12, marginTop: 2 },
  confettiOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  confettiLottie: {
    width: 260,
    height: 260,
  },
  coinsContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 20,
    minHeight: 120, // Reserve space to prevent layout shift
  },
  coinsContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinsLottie: {
    width: 100,
    height: 100,
  },
  coinsText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    marginTop: -10,
  },
  eloContainer: { width: '100%', marginBottom: 18, minHeight: 48 }, // Reserve space for ELO section
  eloHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingHorizontal: 2 },
  eloTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', letterSpacing: 0.5 },
  eloValue: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  progressTrack: { width: '100%', height: 10, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.18)', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 6 },
  scoresBox: { width: '100%', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 16, padding: 16, gap: 12, marginBottom: 0 },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  userText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
  userTextHighlight: { color: '#FFD616' },
  scoreText: { color: '#FFFFFF', fontSize: 22, fontWeight: '900' },
  scoreTextHighlight: { color: '#FFD616' },
  exitButton: { height: 56, borderRadius: 28, overflow: 'hidden' },
  exitButtonGradient: { height: '100%', width: 180, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  exitText: { color: '#FFFFF3', fontSize: 18, fontWeight: '900' },
});