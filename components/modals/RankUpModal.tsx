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
};

export function RankUpModal({ visible, rankName, rankIcon, rankColor, onClose }: Props) {
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
          <LottieView
            source={require('@/assets/lotties/extras/Confetti_quick.json')}
            autoPlay
            loop={false}
            style={styles.confetti}
            pointerEvents="none"
          />
          
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
              
              <Text style={[styles.subText, { fontFamily: 'Gilroy-Black' }]}>
                Has demostrado tu dominio matemático. ¡Sigue así!
              </Text>

              <TouchableOpacity style={styles.button} activeOpacity={0.8} onPress={onClose}>
                <LinearGradient colors={['#FFFFFF', '#E0E0E0']} style={styles.buttonGradient}>
                  <Text style={[styles.buttonText, { fontFamily: 'Digitalt' }]}>¡VAMOS!</Text>
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
    fontSize: 28,
    textAlign: 'center',
    marginBottom: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  iconContainer: {
    width: 140,
    height: 140,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  rankIcon: {
    width: 100,
    height: 100,
  },
  placeholderIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  rankName: {
    fontSize: 36,
    textAlign: 'center',
    marginBottom: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  subText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  button: {
    width: '100%',
    height: 55,
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
    fontSize: 20,
    fontWeight: '900',
  },
});
