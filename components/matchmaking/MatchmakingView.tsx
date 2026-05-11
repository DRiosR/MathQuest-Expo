import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';


const { height } = Dimensions.get('window');

type Props = {
  username: string;
  avatarComponent: React.ReactNode;
  onCancel: () => void;
  position?: number;
  isExiting?: boolean;
  onExitComplete?: () => void;
};

export default function MatchmakingView({ username, avatarComponent, onCancel, position, isExiting = false, onExitComplete }: Props) {
  const lottieRef = useRef<LottieView>(null);
  const [dots, setDots] = useState('.');
  const [seconds, setSeconds] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);

  const TIPS = [
    "¡En modo Infinito puedes practicar sin límites!",
    "Nunca compartas tu contraseña con nadie.",
    "¡Gana trofeos para subir en el Ranking mundial!",
    "Personaliza tu avatar en la tienda con tus monedas.",
    "¡La práctica diaria mejora tu agilidad mental!",
    "Si te quedas sin tiempo, ¡puedes comprar vidas!",
    "Invita a tus amigos y compite por ser el mejor."
  ];

  // Animated values for exit transition
  const headerOpacity = useRef(new Animated.Value(1)).current;
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const lottieOpacity = useRef(new Animated.Value(1)).current;
  const lottieTranslateY = useRef(new Animated.Value(0)).current;
  const footerOpacity = useRef(new Animated.Value(1)).current;
  const footerTranslateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => {
        if (prev === '.') return '..';
        if (prev === '..') return '...';
        if (prev === '...') return '.';
        return '.';
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  // Timer y rotación de consejos
  useEffect(() => {
    const timer = setInterval(() => setSeconds(s => s + 1), 1000);
    const tipTimer = setInterval(() => setTipIndex(i => (i + 1) % TIPS.length), 5000);
    return () => {
      clearInterval(timer);
      clearInterval(tipTimer);
    };
  }, []);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Trigger exit animation when instructed by parent
  useEffect(() => {
    if (!isExiting) return;

    Animated.parallel([
      Animated.timing(headerOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(headerTranslateY, { toValue: -10, duration: 250, useNativeDriver: true }),
      Animated.timing(lottieOpacity, { toValue: 0, duration: 250, delay: 50, useNativeDriver: true }),
      Animated.timing(lottieTranslateY, { toValue: -10, duration: 250, delay: 50, useNativeDriver: true }),
      Animated.timing(footerOpacity, { toValue: 0, duration: 250, delay: 100, useNativeDriver: true }),
      Animated.timing(footerTranslateY, { toValue: 10, duration: 250, delay: 100, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) {
        onExitComplete?.();
      }
    });
  }, [isExiting]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.headerWrap, { opacity: headerOpacity, transform: [{ translateY: headerTranslateY }] }]}>
        <Text style={[styles.title, { fontFamily: 'Digitalt' }]}>BUSCANDO</Text>
        <Text style={[styles.title, { fontFamily: 'Digitalt' }]}>OPONENTE{dots}</Text>
      </Animated.View>

      <View style={styles.meWrap}>
        <View style={styles.avatarCircle}>{avatarComponent}</View>
        <Text style={[styles.username, { fontFamily: 'Digitalt' }]} numberOfLines={1}>
          {username}
        </Text>
      </View>

      <Animated.View style={[styles.lottieWrap, { opacity: lottieOpacity, transform: [{ translateY: lottieTranslateY }] }]}>
        <View style={styles.searchTimeContainer}>
          <Text style={[styles.searchTimeText, { fontFamily: 'Digitalt' }]}>
            TIEMPO: {formatTime(seconds)}
          </Text>
        </View>

        <LottieView
          ref={lottieRef}
          autoPlay
          loop
          source={require('@/assets/lotties/extras/lupa.json')}
          style={styles.lottie}
        />

        <View style={styles.tipsContainer}>
          <Text style={[styles.tipLabel, { fontFamily: 'Gilroy-Black' }]}>TIP PRO:</Text>
          <Text style={[styles.tipText, { fontFamily: 'Digitalt' }]}>
            {TIPS[tipIndex]}
          </Text>
        </View>
      </Animated.View>

      <Animated.View style={[styles.footer, { opacity: footerOpacity, transform: [{ translateY: footerTranslateY }] }]}>
        <Pressable onPress={onCancel} style={({ pressed }) => [styles.cancelButton, pressed && { opacity: 0.9 }]}>
          <LinearGradient colors={['#FFD616', '#F65D00']} style={styles.cancelButtonGradient}>
            <Text style={[styles.cancelText, { fontFamily: 'Gilroy-Black' }]}>Cancelar</Text>
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 16, justifyContent: 'space-between' },
  headerWrap: { marginTop: 8, alignItems: 'center' },
  title: { color: '#FFFFFF', fontSize: 34, fontWeight: '900', letterSpacing: 1.5, textAlign: 'center' },
  meWrap: { alignItems: 'center', gap: 12, marginTop: 20 },
  avatarCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'flex-end',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 10,
  },
  username: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', letterSpacing: 1.2 },
  lottieWrap: { alignItems: 'center', justifyContent: 'center', marginTop: 16, flex: 1 },
  lottie: { width: height * 0.2, height: height * 0.2 },
  footer: { paddingBottom: 28, alignItems: 'center' },
  cancelButton: {
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
  },
  cancelButtonGradient: {
    height: '100%',
    width: 160,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  searchTimeContainer: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 10,
  },
  searchTimeText: {
    color: '#FFD616',
    fontSize: 16,
    letterSpacing: 1,
  },
  tipsContainer: {
    marginTop: 20,
    paddingHorizontal: 30,
    alignItems: 'center',
    minHeight: 60,
  },
  tipLabel: {
    color: '#FFD616',
    fontSize: 12,
    letterSpacing: 1,
    marginBottom: 4,
  },
  tipText: {
    color: '#FFFFFF',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 18,
    opacity: 0.9,
  },
});


