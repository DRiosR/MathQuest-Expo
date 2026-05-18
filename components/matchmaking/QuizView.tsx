import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View, Vibration, Dimensions, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LayeredAvatar } from '@/components/LayeredAvatar';
import { Avatar } from '@/types/avatar';
import { defaultAvatar } from '@/constants/avatarAssets';

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
  opponentFinished?: boolean;
  finalCountdown?: number | null;
  onDigit: (d: string) => void;
  onClear: () => void;
  onOk: () => void;
  onForfeit?: () => void;
  onSendEmote?: (emote: string) => void;
  emoteReceived?: { userId: string; emote: string; timestamp: number } | null;
  lastAnswerResult?: { correct: boolean; timestamp: number } | null;
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
  return (mascotName && MASCOT_IDLE_SOURCES[mascotName]) || null;
}

const CHAT_LOTTIE_SOURCES: Record<string, any> = {
  pensando: require('@/assets/lotties/chat/pensando.json'),
  sorprendido: require('@/assets/lotties/chat/sorprendido.json'),
  payaso: require('@/assets/lotties/chat/payaso.json'),
  risas: require('@/assets/lotties/chat/risas.json'),
};

function getChatLottieSource(id: string) {
  return CHAT_LOTTIE_SOURCES[id] || null;
}

export default function QuizView({ 
  roundNumber, category, question, index, total, answerText, 
  localScore, disabled, myAvatar, opponentAvatar, 
  myUsername, opponentUsername, myTotalScore, opponentTotalScore,
  opponentFinished, finalCountdown,
  onDigit, onClear, onOk, onForfeit,
  onSendEmote, emoteReceived, lastAnswerResult
}: Props) {
  const insets = useSafeAreaInsets();
  const [trackWidth, setTrackWidth] = useState(0);
  const fillWidth = useRef(new Animated.Value(0)).current;
  const waitingFadeAnim = useRef(new Animated.Value(0)).current;

  // Feedback states
  const [correctFlash, setCorrectFlash] = useState(false);
  const [incorrectFlash, setIncorrectFlash] = useState(false);
  const flashOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (trackWidth <= 0) return;
    const completion = Math.min((index + 1) / Math.max(total || 1, 1), 1);
    Animated.timing(fillWidth, {
      toValue: trackWidth * completion,
      duration: 450,
      useNativeDriver: false,
    }).start();
  }, [index, total, trackWidth]);

  const [localCountdown, setLocalCountdown] = useState<number | null>(null);

  // Sincronizar con el tiempo que mande el servidor
  useEffect(() => {
    if (finalCountdown !== undefined && finalCountdown !== null) {
      setLocalCountdown(finalCountdown);
    }
  }, [finalCountdown]);

  // Si el oponente termina y no tenemos tiempo del servidor, empezamos en 30
  useEffect(() => {
    if (opponentFinished && !disabled && localCountdown === null) {
      setLocalCountdown(30);
    }
  }, [opponentFinished, disabled]);

  // Lógica de la cuenta regresiva
  useEffect(() => {
    if (localCountdown === null || localCountdown <= 0) return;
    
    const interval = setInterval(() => {
      setLocalCountdown(prev => {
        if (prev === null || prev <= 0) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [localCountdown !== null && localCountdown > 0]);

  useEffect(() => {
    if (disabled) {
      Animated.timing(waitingFadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    } else {
      waitingFadeAnim.setValue(0);
    }
  }, [disabled]);

  // Estados para emotes
  const [showEmoteMenu, setShowEmoteMenu] = useState(false);
  const [activeEmotes, setActiveEmotes] = useState<{ [userId: string]: { emote: string; opacity: Animated.Value; scale: Animated.Value; translateY: Animated.Value } }>({});
  const emoteTimeouts = useRef<{ [userId: string]: any }>({});

  const QUICK_CHAT = [
    { id: 'pensando', label: 'Pensando' },
    { id: 'sorprendido', label: 'Sorprendido' },
    { id: 'payaso', label: 'Payaso' },
    { id: 'risas', label: 'Risas' },
  ];

  const handleSendEmote = (emoteId: string) => {
    onSendEmote?.(emoteId);
    setShowEmoteMenu(false);
  };

  useEffect(() => {
    if (emoteReceived) {
      console.log('🎭 [QuizView] Emote received in component:', emoteReceived.emote, 'for:', emoteReceived.userId);
      const { userId, emote } = emoteReceived;

      // Limpiar timeout previo si existe para este usuario para reiniciar el contador de 3s
      if (emoteTimeouts.current[userId]) {
        clearTimeout(emoteTimeouts.current[userId]);
      }

      const opacity = new Animated.Value(0);
      const scale = new Animated.Value(0.2); // Empezar más pequeña para efecto pop
      const translateY = new Animated.Value(15); // Empezar un poco más abajo
      
      setActiveEmotes(prev => ({
        ...prev,
        [userId]: { emote, opacity, scale, translateY }
      }));

      // Animación de entrada (Pop)
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 5, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();

      // Configurar el nuevo timeout de 3 segundos
      emoteTimeouts.current[userId] = setTimeout(() => {
        // Animación de salida (Fade Out)
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 0.8, duration: 300, useNativeDriver: true }),
        ]).start(() => {
          // Eliminar del estado una vez terminada la animación
          setActiveEmotes(prev => {
            const next = { ...prev };
            delete next[userId];
            return next;
          });
          delete emoteTimeouts.current[userId];
        });
      }, 3000);
    }
  }, [emoteReceived]);

  // Handle Answer Feedback
  useEffect(() => {
    if (lastAnswerResult) {
      const { correct } = lastAnswerResult;
      
      if (correct) {
        setCorrectFlash(true);
        setIncorrectFlash(false);
        Animated.sequence([
          Animated.timing(flashOpacity, { toValue: 0.3, duration: 50, useNativeDriver: true }),
          Animated.timing(flashOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]).start(() => setCorrectFlash(false));
      } else {
        setIncorrectFlash(true);
        setCorrectFlash(false);
        Vibration.vibrate([0, 100, 50, 100]);
        Animated.sequence([
          Animated.timing(flashOpacity, { toValue: 0.5, duration: 50, useNativeDriver: true }),
          Animated.timing(flashOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]).start(() => setIncorrectFlash(false));
      }
    }
  }, [lastAnswerResult]);

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
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
            <View style={styles.avatarWrapperWithEmote}>
              <View style={styles.avatarCircleSmall}>
                <LayeredAvatar avatar={myAvatar || defaultAvatar} size={70} />
              </View>
              {/* Burbuja de emote propia */}
              {activeEmotes['me'] && (
                <Animated.View 
                  style={[
                    styles.emoteBubble, 
                    { 
                      opacity: activeEmotes['me'].opacity, 
                      left: 60,
                      transform: [
                        { scale: activeEmotes['me'].scale },
                        { translateY: activeEmotes['me'].translateY }
                      ]
                    }
                  ]}
                >
                  <View style={styles.bubbleArrowLeft} />
                  <View style={styles.circularBubbleContent}>
                    {getChatLottieSource(activeEmotes['me'].emote) && (
                      <LottieView
                        source={getChatLottieSource(activeEmotes['me'].emote)}
                        autoPlay
                        loop
                        style={styles.mascotEmojiLarge}
                      />
                    )}
                  </View>
                </Animated.View>
              )}
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
            <View style={styles.avatarWrapperWithEmote}>
              <View style={styles.avatarCircleSmall}>
                <LayeredAvatar avatar={opponentAvatar || defaultAvatar} size={70} />
              </View>
              {/* Burbuja de emote oponente */}
              {activeEmotes['opponent'] && (
                <Animated.View 
                  style={[
                    styles.emoteBubble, 
                    { 
                      opacity: activeEmotes['opponent'].opacity, 
                      right: 60,
                      transform: [
                        { scale: activeEmotes['opponent'].scale },
                        { translateY: activeEmotes['opponent'].translateY }
                      ]
                    }
                  ]}
                >
                  <View style={styles.bubbleArrowRight} />
                  <View style={styles.circularBubbleContent}>
                    {getChatLottieSource(activeEmotes['opponent'].emote) && (
                      <LottieView
                        source={getChatLottieSource(activeEmotes['opponent'].emote)}
                        autoPlay
                        loop
                        style={styles.mascotEmojiLarge}
                      />
                    )}
                  </View>
                </Animated.View>
              )}
            </View>
            <View style={[styles.textInfo, { alignItems: 'flex-end' }]}>
              <Text style={[styles.playerNameText, { fontFamily: 'Digitalt' }]} numberOfLines={1}>
                {opponentUsername.toUpperCase()}
              </Text>
              <Text style={[styles.playerTotalScore, { fontFamily: 'Digitalt' }]}>{opponentTotalScore} pts</Text>
            </View>
          </View>
        </View>
        
        {/* Timer de 30s si el oponente ya terminó */}
        {opponentFinished && !disabled && (
          <View style={styles.finalCountdownContainer}>
            <View style={styles.timerBadge}>
              <Text style={[styles.timerLabel, { fontFamily: 'Digitalt' }]}>¡RÁPIDO!</Text>
              <Text style={[styles.timerValue, { fontFamily: 'Digitalt' }]}>
                {localCountdown !== null ? localCountdown : 30}s
              </Text>
            </View>
          </View>
        )}

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
        {getMascotIdleSource(category?.emoji) && (
          <LottieView
            source={getMascotIdleSource(category?.emoji)}
            autoPlay
            loop
            style={styles.mascotLottie}
          />
        )}
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
      
      {/* Bottom Actions Row */}
      <View style={[styles.bottomActionsArea, { paddingBottom: Math.max(insets.bottom, 15) }]}>
        {/* Botón de Emotes */}
        <TouchableOpacity 
          style={styles.emoteBtn} 
          onPress={() => setShowEmoteMenu(!showEmoteMenu)}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={['#8B5CF6', '#6D28D9']}
            style={styles.actionBtnGradient}
          >
            <FontAwesome5 name="comment-dots" size={20} color="#FFF" />
          </LinearGradient>
        </TouchableOpacity>

        {/* Menú de Emotes (Absolute but anchored to the button area) */}
        {showEmoteMenu && (
          <View style={[styles.emoteMenuContainer, { bottom: 65 + Math.max(insets.bottom, 15) }]}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.emoteMenuScroll}
            >
              {QUICK_CHAT.map(chat => (
                <TouchableOpacity 
                  key={chat.id} 
                  style={styles.emoteOptionHorizontal} 
                  onPress={() => handleSendEmote(chat.id)}
                >
                  <LottieView
                    source={getChatLottieSource(chat.id)}
                    autoPlay
                    loop
                    style={styles.mascotMenuIcon}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={{ flex: 1 }} />

        {/* Forfeit Button */}
        <TouchableOpacity 
          style={styles.forfeitBtn} 
          onPress={onForfeit}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#EF4444', '#B91C1C']}
            style={styles.actionBtnGradient}
          >
            <FontAwesome5 name="door-open" size={16} color="#FFF" />
            <Text style={[styles.forfeitBtnText, { fontFamily: 'Digitalt' }]}>
              ABANDONAR
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Visual Feedback Overlays */}
      <Animated.View 
        pointerEvents="none"
        style={[
          styles.flashOverlay, 
          { 
            backgroundColor: correctFlash ? '#22c55e' : (incorrectFlash ? '#ef4444' : 'transparent'),
            opacity: flashOpacity 
          }
        ]} 
      />

      {correctFlash && (
        <View pointerEvents="none" style={styles.feedbackIconOverlay}>
          <FontAwesome5 name="check-circle" size={100} color="#22c55e" />
        </View>
      )}
      {incorrectFlash && (
        <View pointerEvents="none" style={styles.feedbackIconOverlay}>
          <FontAwesome5 name="times-circle" size={100} color="#ef4444" />
        </View>
      )}
    </View>
    
    {/* Pantalla de espera si yo ya terminé - Moved outside quizContainer to be truly absolute */}
    {disabled && (
      <Animated.View style={[styles.waitingOverlay, { opacity: waitingFadeAnim }]}>
        <LinearGradient
          colors={['rgba(0,0,0,0.85)', 'rgba(0,0,0,0.95)']}
          style={StyleSheet.absoluteFill}
        />
        {getMascotIdleSource(category?.emoji) && (
          <LottieView
            source={getMascotIdleSource(category?.emoji)}
            autoPlay
            loop
            style={styles.waitingMascotLottie}
          />
        )}
        <Text style={[styles.waitingTitle, { fontFamily: 'Digitalt' }]}>¡TERMINASTE!</Text>
        <Text style={[styles.waitingSubtitle, { fontFamily: 'Digitalt' }]}>Esperando a que el rival finalice...</Text>
        
        {localCountdown !== null && (
          <View style={styles.waitingTimerContainer}>
            <Text style={[styles.waitingTimerText, { fontFamily: 'Digitalt' }]}>
              La ronda termina en: {localCountdown}s
            </Text>
          </View>
        )}
      </Animated.View>
    )}
    </KeyboardAvoidingView>
  );
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const IS_SMALL_DEVICE = SCREEN_HEIGHT < 750;

const styles = StyleSheet.create({
  quizContainer: { 
    flex: 1, 
    paddingHorizontal: 20, 
    justifyContent: 'space-between', 
    paddingBottom: 0
  },
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
  avatarWrapperWithEmote: {
    position: 'relative',
    width: 65,
    height: 65,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircleSmall: {
    width: IS_SMALL_DEVICE ? 74 : 85,
    height: IS_SMALL_DEVICE ? 74 : 85,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInfo: {
    justifyContent: 'center',
    maxWidth: IS_SMALL_DEVICE ? 80 : 120,
    gap: 2,
  },
  playerNameText: {
    color: '#FFFFFF',
    fontSize: IS_SMALL_DEVICE ? 12 : 14,
    opacity: 0.9,
    letterSpacing: 0.5,
  },
  playerTotalScore: {
    color: '#FFD45E',
    fontSize: IS_SMALL_DEVICE ? 14 : 18,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
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
  questionCard: { marginTop: 0, backgroundColor: 'rgba(0,0,0,0.15)', paddingVertical: IS_SMALL_DEVICE ? 15 : 25, paddingHorizontal: 20, borderRadius: 24, alignItems: 'center' },
  questionText: { color: '#FFFFFF', fontSize: IS_SMALL_DEVICE ? 24 : 32, fontWeight: '800', letterSpacing: 1, textAlign: 'center' },
  answerDisplay: { marginTop: 10, backgroundColor: '#FFFFFF', paddingVertical: IS_SMALL_DEVICE ? 10 : 16, borderRadius: 20, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 5 },
  answerText: { color: '#000000', fontSize: IS_SMALL_DEVICE ? 28 : 36, fontWeight: '900' },
  keypad: { marginTop: 10, width: '100%', paddingBottom: 5 },
  keypadRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: IS_SMALL_DEVICE ? 6 : 12 },
  keypadBtn: { 
    flex: 1, 
    marginHorizontal: 5, 
    backgroundColor: 'rgba(255,255,255,0.22)', 
    paddingVertical: IS_SMALL_DEVICE ? 15 : 22, 
    borderRadius: 20, 
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 4,
    borderBottomColor: 'rgba(0,0,0,0.15)',
  },
  keypadBtnText: { color: '#FFFFFF', fontSize: IS_SMALL_DEVICE ? 22 : 28, fontWeight: '900' },
  keypadOk: { backgroundColor: '#FF46A5', borderBottomColor: '#C0267D' },
  keypadClear: { backgroundColor: 'rgba(255,255,255,0.3)', borderBottomColor: 'rgba(0,0,0,0.2)' },
  bottomActionsArea: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginTop: 5,
    zIndex: 2001,
  },
  forfeitBtn: {
    width: 130,
    height: 44,
    borderRadius: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  emoteBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  forfeitBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    letterSpacing: 1,
    fontWeight: '900',
    marginLeft: 8,
  },
  actionBtnGradient: {
    flex: 1,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'rgba(0,0,0,0.2)',
  },
  // Waiting Overlay Styles
  waitingOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  waitingMascotLottie: {
    width: 240,
    height: 240,
    marginBottom: 10,
  },
  waitingTitle: {
    color: '#FFFFFF',
    fontSize: 32,
    textAlign: 'center',
    marginBottom: 10,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  waitingSubtitle: {
    color: '#D6CCFF',
    fontSize: 18,
    textAlign: 'center',
    opacity: 0.9,
  },
  waitingTimerContainer: {
    marginTop: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  waitingTimerText: {
    color: '#FFD45E',
    fontSize: 16,
  },
  // Final Countdown Styles
  finalCountdownContainer: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    zIndex: 50,
  },
  timerBadge: {
    backgroundColor: '#FF4444',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  timerLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    marginRight: 8,
  },
  timerValue: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },
  emoteMenuContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderRadius: 20,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    zIndex: 2000,
  },
  emoteMenuScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingRight: 10,
  },
  emoteOptionHorizontal: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
    gap: 8,
  },
  emoteOptionEmoji: {
    fontSize: 20,
  },
  emoteOptionLabel: {
    color: '#FFF',
    fontSize: 12,
    fontFamily: 'Digitalt',
  },
  emoteBubble: {
    position: 'absolute',
    top: -15, // Bajado para que no sobresalga tanto
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#FFD45E',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 10,
    zIndex: 1000,
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderRadius: 35,
    width: 70,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circularBubbleContent: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 35,
  },
  emoteEmojiLarge: {
    fontSize: 32,
  },
  mascotEmojiLarge: {
    width: 60,
    height: 60,
  },
  mascotMenuIcon: {
    width: 50,
    height: 50,
  },
  bubbleArrowLeft: {
    position: 'absolute',
    bottom: 5,
    left: -12, // Un poco más larga
    width: 0,
    height: 0,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderRightWidth: 16, // Más ancha
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: '#FFD45E',
  },
  bubbleArrowRight: {
    position: 'absolute',
    bottom: 5,
    right: -12, // Un poco más larga
    width: 0,
    height: 0,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderLeftWidth: 16, // Más ancha
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#FFD45E',
  },
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9998,
  },
  feedbackIconOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
});


