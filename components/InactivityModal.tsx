import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { FontAwesome5 } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';

const { width, height } = Dimensions.get('window');

interface InactivityModalProps {
  visible: boolean;
  onConfirm: () => void;
  penaltyPoints: number;
}

export default function InactivityModal({ visible, onConfirm, penaltyPoints }: InactivityModalProps) {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.8);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none">
      <View style={styles.overlay}>
        <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
        
        <Animated.View
          style={[
            styles.container,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Header con Ícono */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <FontAwesome5 name="hourglass-end" size={40} color="#FF4444" />
            </View>
            <Text style={[styles.title, { fontFamily: 'Digitalt' }]}>¡INACTIVIDAD!</Text>
          </View>

          {/* Animación Central */}
          <View style={styles.animationContainer}>
            <LottieView
              source={require('@/assets/lotties/extras/Confetti_quick.json')} // Podemos cambiar por una de advertencia si hay
              autoPlay
              loop
              style={styles.lottie}
              colorFilters={[{ keypath: "*", color: "#FF4444" }]}
            />
            <Text style={[styles.message, { fontFamily: 'Digitalt' }]}>
              PARTIDA ANULADA POR FALTA DE RITMO
            </Text>
          </View>

          {/* Información de Penalización */}
          <View style={styles.penaltyBox}>
            <Text style={[styles.penaltyLabel, { fontFamily: 'Digitalt' }]}>PENALIZACIÓN:</Text>
            <View style={styles.pointsRow}>
              <Text style={[styles.penaltyValue, { fontFamily: 'Digitalt' }]}>-{penaltyPoints}</Text>
              <Text style={[styles.pointsLabel, { fontFamily: 'Digitalt' }]}>PUNTOS ELO</Text>
            </View>
            <Text style={[styles.warningSubtext, { fontFamily: 'Digitalt' }]}>
              (Aplicada a ambos jugadores)
            </Text>
          </View>

          {/* Botón de Salida */}
          <TouchableOpacity
            style={styles.button}
            onPress={onConfirm}
            activeOpacity={0.8}
          >
            <Text style={[styles.buttonText, { fontFamily: 'Digitalt' }]}>ENTENDIDO</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: width * 0.85,
    backgroundColor: '#1A1A2E',
    borderRadius: 30,
    padding: 25,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FF4444',
    // Efecto Claymorphism
    shadowColor: '#FF4444',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 15,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'rgba(255, 68, 68, 0.3)',
  },
  title: {
    fontSize: 32,
    color: '#FF4444',
    letterSpacing: 2,
  },
  animationContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  lottie: {
    width: 150,
    height: 150,
    position: 'absolute',
    top: -50,
    opacity: 0.5,
  },
  message: {
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 10,
  },
  penaltyBox: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
    padding: 15,
    width: '100%',
    alignItems: 'center',
    marginBottom: 25,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  penaltyLabel: {
    color: '#D6CCFF',
    fontSize: 14,
    marginBottom: 5,
  },
  pointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  penaltyValue: {
    color: '#FF4444',
    fontSize: 40,
    fontWeight: 'bold',
  },
  pointsLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    opacity: 0.8,
  },
  warningSubtext: {
    color: '#FFD45E',
    fontSize: 12,
    marginTop: 5,
    opacity: 0.8,
  },
  button: {
    backgroundColor: '#FF4444',
    width: '100%',
    paddingVertical: 15,
    borderRadius: 20,
    alignItems: 'center',
    borderBottomWidth: 5,
    borderBottomColor: '#B32D2D',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 20,
    letterSpacing: 1,
  },
});
