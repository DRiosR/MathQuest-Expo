import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LayeredAvatar } from '@/components/LayeredAvatar';
import { Avatar } from '@/types/avatar';

type Category = { id: string; name: string; emoji: string; color: string } | undefined;

type Props = {
  roundNumber: number;
  category?: Category;
  question: string;
  index: number;
  total: number;
  answerText: string;
  localScore: number;
  disabled?: boolean;
  myAvatar: Avatar | null;
  opponentAvatar: Avatar | null;
  myUsername: string;
  opponentUsername: string;
  myTotalScore: number;
  opponentTotalScore: number;
  onDigit: (d: string) => void;
  onClear: () => void;
  onOk: () => void;
  onForfeit?: () => void;
};

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

export default function QuizView({ 
  roundNumber, category, question, index, total, answerText, 
  localScore, disabled, myAvatar, opponentAvatar, 
  myUsername, opponentUsername, myTotalScore, opponentTotalScore,
  onDigit, onClear, onOk, onForfeit 
}: Props) {
  const insets = useSafeAreaInsets();
  const [trackWidth, setTrackWidth] = useState(0);
  const fillWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (trackWidth <= 0) return;
    const completion = Math.min((index + 1) / Math.max(total || 1, 1), 1);
    Animated.timing(fillWidth, {
      toValue: trackWidth * completion,
      duration: 450,
      useNativeDriver: false,
    }).start();
  }, [index, total, trackWidth]);

  return (
    <View style={styles.quizContainer}>

      <LinearGradient
        colors={["#5643B3", category?.color || '#8A56FE']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[
          StyleSheet.absoluteFill,
          {
            top: -insets.top,
            bottom: -insets.bottom,
            left: -insets.left,
            right: -insets.right,
          },
        ]}
      />
      {/* Header with Player Info */}
      <View style={styles.header}>
        <View style={styles.topInfoRow}>
          {/* My Info */}
          <View style={styles.playerInfoBlock}>
            <View style={styles.avatarCircleSmall}>
              <LayeredAvatar avatar={myAvatar} size={40} />
            </View>
            <View style={styles.textInfo}>
              <Text style={[styles.playerNameText, { fontFamily: 'Digitalt' }]} numberOfLines={1}>TU</Text>
              <Text style={[styles.playerTotalScore, { fontFamily: 'Digitalt' }]}>{myTotalScore} pts</Text>
            </View>
          </View>

          <View style={styles.roundInfoCenter}>
            <Text style={[styles.roundTitle, { fontFamily: 'Digitalt' }]}>RONDA {roundNumber || 1}</Text>
          </View>

          {/* Opponent Info */}
          <View style={[styles.playerInfoBlock, { flexDirection: 'row-reverse' }]}>
            <View style={styles.avatarCircleSmall}>
              <LayeredAvatar avatar={opponentAvatar} size={40} />
            </View>
            <View style={[styles.textInfo, { alignItems: 'flex-end' }]}>
              <Text style={[styles.playerNameText, { fontFamily: 'Digitalt' }]} numberOfLines={1}>
                {opponentUsername.toUpperCase()}
              </Text>
              <Text style={[styles.playerTotalScore, { fontFamily: 'Digitalt' }]}>{opponentTotalScore} pts</Text>
            </View>
          </View>
        </View>

        <Text style={[styles.roundSubtitle, { fontFamily: 'Digitalt' }]}>{category?.name?.toUpperCase() || 'CATEGORÍA'}</Text>

        {/* Progress + score row */}
        <View style={styles.progressRow}>
          <Text style={[styles.progressText, { fontFamily: 'Gilroy-Black' }]}>Pregunta {index + 1} de {total || 6}</Text>
          <Text style={[styles.progressScore, { fontFamily: 'Gilroy-Black' }]}>+ {localScore} ronda</Text>
        </View>

        {/* Animated progress bar */}
        <View
          style={styles.progressTrack}
          onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
        >
          <Animated.View
            style={[
              styles.progressFill,
              { width: fillWidth, backgroundColor: category?.color || '#22D3EE' },
            ]}
          />
        </View>
      </View>

      {/* Mascot above question */}
      <View style={styles.mascotContainer} pointerEvents="none">
        <LottieView
          source={getMascotIdleSource(category?.emoji)}
          autoPlay
          loop
          style={styles.mascotLottie}
        />
      </View>

      {/* Question */}
      <View style={styles.questionCard}>
        <Text style={[styles.questionText, { fontFamily: 'Digitalt' }]}>{question}</Text>
      </View>

      {/* Answer display */}
      <View style={styles.answerDisplay}>
        <Text style={[styles.answerText, { fontFamily: 'Digitalt' }, { opacity: answerText === '' ? 0.5 : 1 }]}>{answerText === '' ? '0' : answerText}</Text>
      </View>

      {/* Keypad */}
      <View style={styles.keypad}>
        {[['1','2','3'],['4','5','6'],['7','8','9'],['C','0','OK']].map((row, rIdx) => (
          <View key={`row-${rIdx}`} style={styles.keypadRow}>
            {row.map(key => (
              <TouchableOpacity
                key={key}
                style={[styles.keypadBtn, key === 'OK' ? styles.keypadOk : key === 'C' ? styles.keypadClear : null]}
                onPress={() => {
                  if (key === 'OK') return onOk();
                  if (key === 'C') return onClear();
                  onDigit(key);
                }}
                disabled={disabled}
              >
                <Text style={[styles.keypadBtnText, { fontFamily: 'Digitalt' }]}>{key}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>

      {/* Score moved to header next to progress */}
      
      {/* Forfeit Button at the bottom right */}
      <TouchableOpacity 
        style={styles.forfeitBtnBottomRight} 
        onPress={onForfeit}
        activeOpacity={0.7}
      >
        <Text style={[styles.forfeitBtnText, { fontFamily: 'Gilroy-Black' }]}>ABANDONAR</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  quizContainer: { flex: 1, paddingHorizontal: 20, justifyContent: 'flex-start', paddingBottom: 20 },
  header: { alignItems: 'center', marginTop: 8, alignSelf: 'stretch' },
  topInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 5,
  },
  playerInfoBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  avatarCircleSmall: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  textInfo: {
    justifyContent: 'center',
    maxWidth: 80,
  },
  playerNameText: {
    color: '#FFFFFF',
    fontSize: 10,
    opacity: 0.8,
  },
  playerTotalScore: {
    color: '#FFD45E',
    fontSize: 12,
    fontWeight: '900',
  },
  roundInfoCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  roundTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },
  roundSubtitle: { color: '#D6CCFF', fontSize: 14, marginTop: 2 },
  progressRow: { marginTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', alignSelf: 'stretch' },
  progressText: { color: '#EAE6FF', opacity: 0.9, fontSize: 12 },
  progressScore: { color: '#FFFFFF', opacity: 0.95, fontSize: 12 },
  progressTrack: { marginTop: 6, height: 6, backgroundColor: 'rgba(255,255,255,0.35)', borderRadius: 3, overflow: 'hidden', alignSelf: 'stretch' },
  progressFill: { height: '100%', borderRadius: 3 },
  mascotContainer: { marginTop: 4, alignItems: 'center', marginBottom: -22, zIndex: 2 },
  mascotLottie: { width: 100, height: 100 },
  questionCard: { marginTop: 0, backgroundColor: 'rgba(0,0,0,0.15)', paddingVertical: 20, paddingHorizontal: 20, borderRadius: 24, alignItems: 'center' },
  questionText: { color: '#FFFFFF', fontSize: 24, fontWeight: '800', letterSpacing: 1 },
  answerDisplay: { marginTop: 12, backgroundColor: '#FFFFFF', paddingVertical: 12, borderRadius: 16, alignItems: 'center' },
  answerText: { color: '#000000', fontSize: 24, fontWeight: '900' },
  keypad: { marginTop: 12 },
  keypadRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  keypadBtn: { flex: 1, marginHorizontal: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 14, borderRadius: 16, alignItems: 'center' },
  keypadBtnText: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  keypadOk: { backgroundColor: '#FF46A5' },
  keypadClear: { backgroundColor: 'rgba(255,255,255,0.25)' },
  forfeitBtnBottomRight: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: 'rgba(255, 0, 0, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 0, 0.3)',
  },
  forfeitBtnText: {
    color: '#FFBABA',
    fontSize: 9,
    letterSpacing: 1,
    fontWeight: '700',
  },
});


