import LottieView from 'lottie-react-native';
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Image, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

type Props = {
  visible: boolean;
  rankName: string;
  rankIcon: string | null;
  rankColor: string;
  onClose: () => void;
  unlockedItemImage?: string | null; // Nuevo: para mostrar el marco obtenido
};

export function RankUpModal({ visible, rankName, rankIcon, rankColor, onClose, unlockedItemImage }: Props) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 20,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <BlurView intensity={80} style={styles.blurContainer} tint="dark">
        <View style={styles.content}>
          <View pointerEvents="none" style={styles.confetti}>
            <LottieView
              source={require('@/assets/lotties/extras/Confetti_quick.json')}
              autoPlay
              loop={false}
              style={{ width: width, height: height, position: 'absolute' }}
            />
          </View>
          
          <Animated.View style={[styles.mainCard, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}>
            <LinearGradient
              colors={[rankColor, '#000000']}
              style={styles.cardGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={[styles.congratsText, { fontFamily: 'Digitalt' }]}>¡NUEVO RANGO!</Text>
              
              <View style={styles.iconContainer}>
                {rankIcon ? (
                  <Image source={{ uri: rankIcon }} style={styles.rankIcon} resizeMode="contain" />
                ) : (
                  <View style={[styles.placeholderIcon, { backgroundColor: rankColor }]} />
                )}
              </View>

              <Text style={[styles.rankName, { fontFamily: 'Digitalt', color: rankColor }]}>
                {rankName.toUpperCase()}
              </Text>

              {unlockedItemImage && (
                <View style={styles.rewardContainer}>
                  <Text style={[styles.rewardTitle, { fontFamily: 'Digitalt' }]}>¡MARCO DESBLOQUEADO!</Text>
                  <View style={styles.rewardFrameBox}>
                    <Image source={{ uri: unlockedItemImage }} style={styles.rewardImage} resizeMode="contain" />
                  </View>
                </View>
              )}
              
              <Text style={[styles.subText, { fontFamily: 'Gilroy-Black' }]}>
                {unlockedItemImage 
                  ? '¡Felicidades! Has obtenido un nuevo marco para tu avatar.' 
                  : 'Has demostrado tu dominio matemático. ¡Sigue así!'}
              </Text>

              <TouchableOpacity style={styles.button} activeOpacity={0.8} onPress={onClose}>
                <LinearGradient colors={['#FFFFFF', '#E0E0E0']} style={styles.buttonGradient}>
                  <Text style={[styles.buttonText, { fontFamily: 'Digitalt' }]}>¡GENIAL!</Text>
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>
        </View>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  blurContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confetti: {
    position: 'absolute',
    width: width,
    height: height,
    zIndex: 10,
  },
  mainCard: {
    width: width * 0.85,
    borderRadius: 30,
    overflow: 'hidden',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
  },
  cardGradient: {
    padding: 30,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  congratsText: {
    color: '#FFFFFF',
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  iconContainer: {
    width: 100,
    height: 100,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  rankIcon: {
    width: 70,
    height: 70,
  },
  placeholderIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  rankName: {
    fontSize: 32,
    textAlign: 'center',
    marginBottom: 15,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  rewardContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
    padding: 15,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  rewardTitle: {
    color: '#FFD700',
    fontSize: 16,
    marginBottom: 10,
  },
  rewardFrameBox: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rewardImage: {
    width: '100%',
    height: '100%',
  },
  subText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  button: {
    width: '100%',
    height: 50,
    borderRadius: 15,
    overflow: 'hidden',
  },
  buttonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '900',
  },
});
