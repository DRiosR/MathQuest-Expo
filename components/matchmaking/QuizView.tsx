import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

export default function QuizView({ roundNumber, category, question, index, total, answerText, localScore, disabled, onDigit, onClear, onOk, onForfeit }: Props) {
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
            // Extend beyond SafeArea to cover the entire screen
            top: -insets.top,
            bottom: -insets.bottom,
            left: -insets.left,
            right: -insets.right,
          },
        ]}
      />
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.topHeaderRow}>
          <Text style={[styles.roundTitle, { fontFamily: 'Digitalt' }]}>RONDA {roundNumber || 1}</Text>
          <TouchableOpacity 
            style={styles.forfeitBtn} 
            onPress={onForfeit}
            activeOpacity={0.7}
          >
            <Text style={[styles.forfeitBtnText, { fontFamily: 'Gilroy-Black' }]}>ABANDONAR</Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.roundSubtitle, { fontFamily: 'Digitalt' }]}>{category?.name?.toUpperCase() || 'CATEGORÍA'}</Text>

        {/* Progress + score row */}
        <View style={styles.progressRow}>
          <Text style={[styles.progressText, { fontFamily: 'Gilroy-Black' }]}>Pregunta {index + 1} de {total || 6}</Text>
          <Text style={[styles.progressScore, { fontFamily: 'Gilroy-Black' }]}>{localScore} pts</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  quizContainer: { flex: 1, paddingHorizontal: 24, justifyContent: 'flex-start' },
  header: { alignItems: 'center', marginTop: 8, alignSelf: 'stretch' },
  roundTitle: { color: '#FFFFFF', fontSize: 30, fontWeight: '900', letterSpacing: 1 },
  roundSubtitle: { color: '#D6CCFF', fontSize: 18, marginTop: 4 },
  progressRow: { marginTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', alignSelf: 'stretch' },
  progressText: { color: '#EAE6FF', opacity: 0.9, fontSize: 13 },
  progressScore: { color: '#FFFFFF', opacity: 0.95, fontSize: 13 },
  progressTrack: { marginTop: 6, height: 6, backgroundColor: 'rgba(255,255,255,0.35)', borderRadius: 3, overflow: 'hidden', alignSelf: 'stretch' },
  progressFill: { height: '100%', borderRadius: 3 },
  mascotContainer: { marginTop: 4, alignItems: 'center', marginBottom: -22, zIndex: 2 },
  mascotLottie: { width: 128, height: 128 },
  questionCard: { marginTop: 0, backgroundColor: 'rgba(0,0,0,0.15)', paddingVertical: 24, paddingHorizontal: 20, borderRadius: 24, alignItems: 'center' },
  questionText: { color: '#FFFFFF', fontSize: 28, fontWeight: '800', letterSpacing: 1 },
  answerDisplay: { marginTop: 16, backgroundColor: '#FFFFFF', paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  answerText: { color: '#000000', fontSize: 24, fontWeight: '900' },
  keypad: { marginTop: 16 },
  keypadRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  keypadBtn: { flex: 1, marginHorizontal: 6, backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  keypadBtnText: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
  keypadOk: { backgroundColor: '#FF46A5' },
  keypadClear: { backgroundColor: 'rgba(255,255,255,0.25)' },
  localScore: { marginTop: 8, color: '#FFFFFF', opacity: 0.9, textAlign: 'center' },
  topHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    position: 'relative',
  },
  forfeitBtn: {
    position: 'absolute',
    right: 0,
    backgroundColor: 'rgba(255, 0, 0, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 0, 0.4)',
  },
  forfeitBtnText: {
    color: '#FFBABA',
    fontSize: 10,
    letterSpacing: 0.5,
  },
});


