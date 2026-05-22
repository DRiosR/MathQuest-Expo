import LottieView from 'lottie-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, Text, View } from 'react-native';
import { LayeredAvatar } from '@/components/LayeredAvatar';
import { Avatar } from '@/types/avatar';
import { defaultAvatar } from '@/constants/avatarAssets';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');


type PlayerResult = {
  id?: string;
  username: string;
  score: number;
  totalBefore: number;
  avatar: Avatar | null;
};

type Props = {
  roundNumber: number;
  leftPlayer: PlayerResult;
  rightPlayer: PlayerResult;
  winner: string | null | undefined;
  onDone?: () => void;
  isFinalRound?: boolean;
};

export default function RoundResultView({
  roundNumber,
  leftPlayer,
  rightPlayer,
  winner,
  onDone,
  isFinalRound,
}: Props) {
  // We assume leftPlayer is the local player and rightPlayer is the opponent
  const leftName = 'TU';
  const rightName = rightPlayer.username || 'OPONENTE';

  // Animation values
  const totalsOpacity = useRef(new Animated.Value(0)).current;
  const resultOpacity = useRef(new Animated.Value(0)).current;
  const leftTotalValue = useRef(new Animated.Value(leftPlayer.totalBefore || 0)).current;
  const rightTotalValue = useRef(new Animated.Value(rightPlayer.totalBefore || 0)).current;

  const [displayLeftTotal, setDisplayLeftTotal] = useState<number>(leftPlayer.totalBefore || 0);
  const [displayRightTotal, setDisplayRightTotal] = useState<number>(rightPlayer.totalBefore || 0);
  const [showResult, setShowResult] = useState(false);

  const leftFinal = (leftPlayer.totalBefore || 0) + (leftPlayer.score || 0);
  const rightFinal = (rightPlayer.totalBefore || 0) + (rightPlayer.score || 0);

  const didIWin = Boolean(winner && leftPlayer.id && winner === leftPlayer.id);
  const resultText = !winner ? 'Empate' : didIWin ? '¡Ganaste esta ronda!' : 'Ganó tu oponente';
  const resultColor = !winner ? '#FFD60A' : didIWin ? '#34C759' : '#FF3B30';

  const myBefore = leftPlayer.totalBefore || 0;
  const oppBefore = rightPlayer.totalBefore || 0;
  const iWasLeading = myBefore > oppBefore;

  const hintText = useMemo(() => {
    if (!winner) {
      return iWasLeading ? '¡Sigue así!' : '¡Vamos, tú puedes!';
    }
    if (didIWin) {
      return iWasLeading ? '¡Sigue así!' : '¡Vas remontando!';
    }
    return iWasLeading ? '¡Pero sigues ganando!' : '¡No te rindas!';
  }, [didIWin, iWasLeading, winner]);

  useEffect(() => {
    // 1. Fade in initial totals
    Animated.timing(totalsOpacity, { toValue: 1, duration: 600, useNativeDriver: true }).start(() => {
      // 2. Count up scores
      Animated.parallel([
        Animated.timing(leftTotalValue, { toValue: leftFinal, duration: 1200, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
        Animated.timing(rightTotalValue, { toValue: rightFinal, duration: 1200, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      ]).start(() => {
        // 3. Show result
        setShowResult(true);
        Animated.timing(resultOpacity, { toValue: 1, duration: 500, useNativeDriver: true }).start();
      });
    });

    const leftListener = leftTotalValue.addListener(({ value }) => setDisplayLeftTotal(Math.floor(value)));
    const rightListener = rightTotalValue.addListener(({ value }) => setDisplayRightTotal(Math.floor(value)));

    return () => {
      leftTotalValue.removeListener(leftListener);
      rightTotalValue.removeListener(rightListener);
    };
  }, [leftFinal, rightFinal, onDone]);

  return (
    <View style={styles.resultContainer}>
      {showResult && didIWin && (
        <LottieView
          source={require('@/assets/lotties/extras/Confetti_quick.json')}
          autoPlay
          loop={false}
          style={styles.confetti}
        />
      )}
      <Text style={[styles.resultTitle, { fontFamily: 'Digitalt' }]}>RONDA {roundNumber}</Text>
      
      <Animated.View style={[styles.avatarScoreRow, { opacity: totalsOpacity }]}>
        <View style={styles.playerResultBlock}>
          <View style={styles.avatarCircleSmall}>
            <LayeredAvatar avatar={leftPlayer.avatar || defaultAvatar} size={150} />
          </View>
          <Text style={[styles.playerName, { fontFamily: 'Digitalt' }]}>{leftName}</Text>
          <Text style={[styles.playerPoints, { fontFamily: 'Digitalt' }]}>{displayLeftTotal}</Text>
        </View>

        <Text style={[styles.vsDivider, { fontFamily: 'Digitalt' }]}>VS</Text>

        <View style={styles.playerResultBlock}>
          <View style={styles.avatarCircleSmall}>
            <LayeredAvatar avatar={rightPlayer.avatar || defaultAvatar} size={150} />
          </View>
          <Text style={[styles.playerName, { fontFamily: 'Digitalt' }]}>{rightName}</Text>
          <Text style={[styles.playerPoints, { fontFamily: 'Digitalt' }]}>{displayRightTotal}</Text>
        </View>
      </Animated.View>
      
      {showResult ? (
        <Animated.View style={{ opacity: resultOpacity, width: '100%', alignItems: 'center' }}>
          {!isFinalRound && (
            <Text style={[styles.waitingText, { fontFamily: 'Digitalt', marginTop: 30, opacity: 0.9 }]}>
              Preparando siguiente ronda…
            </Text>
          )}
        </Animated.View>
      ) : (
        <Text style={[styles.waitingText, { fontFamily: 'Digitalt' }]}>Calculando puntajes…</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  resultContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, backgroundColor: 'rgba(0,0,0,0.7)' },
  confetti: { position: 'absolute', top: 0, left: 0, width: SCREEN_WIDTH, height: SCREEN_HEIGHT, zIndex: 5 },
  resultTitle: { color: '#FFFFFF', fontSize: 32, marginBottom: 40, fontWeight: '900' },
  avatarScoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 40 },
  playerResultBlock: { alignItems: 'center', flex: 1 },
  avatarCircleSmall: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  playerName: { color: '#FFFFFF', fontSize: 16, opacity: 0.8, marginBottom: 4 },
  playerPoints: { color: '#FFD616', fontSize: 36, fontWeight: '900' },
  vsDivider: { color: '#FFFFFF', fontSize: 24, opacity: 0.5, marginHorizontal: 10 },
  resultWinner: { fontSize: 28, fontWeight: '900', marginBottom: 12, textAlign: 'center' },
  resultHint: { color: '#FFFFFF', fontSize: 18, opacity: 0.9, textAlign: 'center', marginBottom: 20 },
  waitingText: { color: '#FFFFFF', fontSize: 16, opacity: 0.6, marginTop: 20, textAlign: 'center' },
  buttonWrapper: { marginTop: 30, width: '100%', alignItems: 'center' },
  continueButton: {
    backgroundColor: '#34C759',
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 25,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
  }
});
