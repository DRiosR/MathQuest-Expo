import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';


const { height, width } = Dimensions.get('window');
const IS_SMALL_DEVICE = height < 750;
const SCALE = width / 375;
const normalize = (size: number) => Math.round(size * SCALE);

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
      {/* Dynamic Background elements could go here if handled by parent, 
          but we focus on the component's internal structure */}
      
      <Animated.View style={[styles.headerWrap, { opacity: headerOpacity, transform: [{ translateY: headerTranslateY }] }]}>
        <Text style={[styles.title, { fontFamily: 'Digitalt' }]}>BUSCANDO</Text>
        <Text style={[styles.title, { fontFamily: 'Digitalt', color: '#FFD616' }]}>OPONENTE{dots}</Text>
      </Animated.View>

      <View style={styles.centerSection}>
        <View style={styles.meWrap}>
          <View style={styles.avatarGlowContainer}>
            <View style={styles.avatarCircle}>{avatarComponent}</View>
          </View>
          <View style={styles.usernameContainer}>
            <Text style={[styles.username, { fontFamily: 'Digitalt' }]} numberOfLines={1}>
              {username}
            </Text>
          </View>
        </View>

        <Animated.View style={[styles.lottieWrap, { opacity: lottieOpacity, transform: [{ translateY: lottieTranslateY }] }]}>
          <LottieView
            ref={lottieRef}
            autoPlay
            loop
            source={require('@/assets/lotties/extras/lupa.json')}
            style={styles.lottie}
          />
        </Animated.View>
      </View>

      <Animated.View style={[styles.footer, { opacity: footerOpacity, transform: [{ translateY: footerTranslateY }] }]}>
        <View style={styles.glassCard}>
           <View style={styles.cardHeader}>
              <Text style={[styles.tipLabel, { fontFamily: 'Gilroy-Black' }]}>CONSEJO PRO</Text>
              <View style={styles.timeBadge}>
                <Text style={[styles.timeText, { fontFamily: 'Digitalt' }]}>{formatTime(seconds)}</Text>
              </View>
           </View>
           <Text style={[styles.tipText, { fontFamily: 'Digitalt' }]}>
              {TIPS[tipIndex]}
           </Text>
        </View>

        <Pressable onPress={onCancel} style={({ pressed }) => [styles.cancelButton, pressed && { transform: [{scale: 0.96}] }]}>
          <LinearGradient colors={['#ef4444', '#991b1b']} style={styles.cancelButtonGradient}>
            <Text style={[styles.cancelText, { fontFamily: 'Gilroy-Black' }]}>CANCELAR EMPAREJAMIENTO</Text>
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    paddingHorizontal: 24, 
    paddingTop: IS_SMALL_DEVICE ? 10 : 40,
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerWrap: { width: '100%', alignItems: 'center', gap: 4 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
    marginRight: 6,
  },
  statusText: { color: '#22c55e', fontSize: 12, letterSpacing: 1 },
  title: { 
    color: '#FFFFFF', 
    fontSize: IS_SMALL_DEVICE ? 28 : 42, 
    fontWeight: '900', 
    letterSpacing: 2, 
    textAlign: 'center',
    lineHeight: IS_SMALL_DEVICE ? 32 : 46,
  },
  centerSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  meWrap: { width: '100%', alignItems: 'center', marginBottom: 20 },
  avatarGlowContainer: {
    width: IS_SMALL_DEVICE ? 140 : 220,
    height: IS_SMALL_DEVICE ? 140 : 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing1: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 110,
    borderWidth: 2,
    borderColor: 'rgba(255, 214, 22, 0.3)',
  },
  pulseRing2: {
    position: 'absolute',
    width: '85%',
    height: '85%',
    borderRadius: 95,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  avatarCircle: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  usernameContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  username: { 
    color: '#FFFFFF', 
    fontSize: IS_SMALL_DEVICE ? 20 : 28, 
    fontWeight: '900', 
    letterSpacing: 1.5,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  rankBadge: {
    backgroundColor: '#FFD616',
    paddingHorizontal: 12,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  rankText: { color: '#000', fontSize: 10, fontWeight: 'bold' },
  lottieWrap: { 
    width: 120,
    height: 120, 
    alignItems: 'center', 
    justifyContent: 'center',
  },
  lottie: { width: '100%', height: '100%' },
  footer: { 
    width: '100%', 
    paddingBottom: IS_SMALL_DEVICE ? 20 : 40, 
    alignItems: 'center',
    gap: 20
  },
  glassCard: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  timeBadge: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  timeText: { color: '#FFD616', fontSize: 14 },
  tipLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    letterSpacing: 2,
  },
  tipText: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  cancelButton: {
    width: '80%',
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  cancelButtonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
});


