import React, { useEffect, useState, useRef } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View, Animated, Dimensions } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { getUserStats } from '@/services/SupabaseService';
import { FadeInView } from './shared/FadeInView';

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

export default function StreakWarningModal() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [streakCount, setStreakCount] = useState(0);
  const lastDismissedRef = useRef<string | null>(null);
  const checkIntervalRef = useRef<any>(null);

  const checkStreak = async () => {
    if (!user?.id) return;

    try {
      const stats = await getUserStats(user.id);
      if (!stats || !stats.lastStreakDate || stats.streakCount <= 0) {
        setVisible(false);
        return;
      }

      // REAL PRODUCTION LOGIC (24h window, warning at 21h)
      const now = new Date();
      const lastDate = new Date(stats.lastStreakDate);
      const diffSeconds = (now.getTime() - lastDate.getTime()) / 1000;
      const isWarning = diffSeconds >= 75600 && diffSeconds <= 86400;

      if (isWarning) {
        // Only show if we haven't dismissed it for THIS specific streak lastDate
        if (lastDismissedRef.current !== stats.lastStreakDate) {
          setStreakCount(stats.streakCount);
          setVisible(true);
        }
      } else {
        setVisible(false);
        // If it's active again (less than 21h), clear the dismiss ref so it can show next time
        if (diffSeconds < 75600) {
          lastDismissedRef.current = null;
        }
      }
    } catch (error) {
      console.error('[StreakWarningModal] Error:', error);
    }
  };

  useEffect(() => {
    if (user?.id) {
      // Check every 5 minutes in production to save battery
      checkIntervalRef.current = setInterval(checkStreak, 1000 * 60 * 5);
      return () => {
        if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
      };
    }
  }, [user?.id]);

  const handleDismiss = () => {
    setVisible(false);
    // Mark as dismissed for this specific timestamp to prevent re-popups
    // In a real app, you might want to fetch stats again to get the exact string
    // but for now we just keep the last one we saw.
    (async () => {
        const stats = await getUserStats(user?.id || '');
        if (stats?.lastStreakDate) {
            lastDismissedRef.current = stats.lastStreakDate;
        }
    })();
  };

  if (!visible) return null;

  return (
    <PlatformModal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={handleDismiss}
    >
      <View style={styles.overlay}>
        <FadeInView from="bottom" style={styles.content}>
          <LinearGradient
            colors={['#1f1b2e', '#13111c']}
            style={styles.card}
          >
            <View style={styles.iconContainer}>
              <LinearGradient
                colors={['#EF4444', '#B91C1C']}
                style={styles.iconCircle}
              >
                <FontAwesome5 name="fire" size={40} color="#fff" solid />
              </LinearGradient>
            </View>

            <Text style={[styles.title, { fontFamily: 'Digitalt' }]}>
              ¡RACHA EN PELIGRO!
            </Text>
            
            <Text style={[styles.subtitle, { fontFamily: 'Gilroy-Black' }]}>
              Tu racha de {streakCount} {streakCount === 1 ? 'día' : 'días'} está a punto de apagarse.
            </Text>

            <Text style={[styles.message, { fontFamily: 'Gilroy-Black' }]}>
              ¡Juega una partida ahora para mantenerla viva!
            </Text>

            <TouchableOpacity 
              style={styles.button}
              onPress={handleDismiss}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#7B4DFF', '#6366F1']}
                style={styles.buttonGradient}
              >
                <Text style={[styles.buttonText, { fontFamily: 'Digitalt' }]}>
                  ¡ENTENDIDO!
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </FadeInView>
      </View>
    </PlatformModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    width: '100%',
    maxWidth: 400,
  },
  card: {
    borderRadius: 32,
    padding: 30,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  iconContainer: {
    marginBottom: 20,
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  title: {
    color: '#EF4444',
    fontSize: 28,
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: 1,
  },
  subtitle: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 15,
    opacity: 0.9,
  },
  message: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 20,
  },
  button: {
    width: '100%',
    height: 60,
    borderRadius: 20,
    overflow: 'hidden',
  },
  buttonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 20,
    letterSpacing: 1,
  },
});
