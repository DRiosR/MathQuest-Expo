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
import { Platform } from 'react-native';

const { width } = Dimensions.get('window');

const PlatformModal = Platform.OS === 'web'
  ? ({ visible, children, transparent, animationType, onRequestClose, ...props }: any) => {
      if (!visible) return null;
      return (
        <View style={[{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999 } as any]} {...props}>
          {children}
        </View>
      );
    }
  : Modal;

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'info';
}

export default function ConfirmModal({
  visible,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'SÍ, SALIR',
  cancelText = 'CANCELAR',
  type = 'danger'
}: ConfirmModalProps) {
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

  const mainColor = type === 'danger' ? '#FF4444' : '#4ADE80';
  const shadowColor = type === 'danger' ? '#B32D2D' : '#166534';

  return (
    <PlatformModal visible={visible} transparent animationType="none">
      <View style={styles.overlay}>
        <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
        
        <Animated.View
          style={[
            styles.container,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
              borderColor: mainColor,
              shadowColor: mainColor,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.iconCircle}>
            <FontAwesome5 
              name={type === 'danger' ? "exclamation-triangle" : "question-circle"} 
              size={32} 
              color={mainColor} 
            />
          </View>
          
          <Text style={[styles.title, { fontFamily: 'Digitalt', color: mainColor }]}>
            {title}
          </Text>
 
          <Text style={[styles.message, { fontFamily: 'Digitalt' }]}>
            {message}
          </Text>
 
          {/* Botones */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onCancel}
              activeOpacity={0.8}
            >
              <Text style={[styles.buttonText, { fontFamily: 'Digitalt', color: '#FFFFFF' }]}>
                {cancelText}
              </Text>
            </TouchableOpacity>
 
            <TouchableOpacity
              style={[styles.button, { backgroundColor: mainColor, borderBottomColor: shadowColor }]}
              onPress={onConfirm}
              activeOpacity={0.8}
            >
              <Text style={[styles.buttonText, { fontFamily: 'Digitalt', color: '#FFFFFF' }]}>
                {confirmText}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </PlatformModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
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
    // Claymorphism
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 20,
  },
  iconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  title: {
    fontSize: 26,
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: 1,
  },
  message: {
    fontSize: 16,
    color: '#D6CCFF',
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 22,
    opacity: 0.9,
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 18,
    alignItems: 'center',
    borderBottomWidth: 4,
  },
  cancelButton: {
    backgroundColor: '#374151',
    borderBottomColor: '#1F2937',
  },
  buttonText: {
    fontSize: 14,
    letterSpacing: 0.5,
  },
});
