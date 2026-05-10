import React, { useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  Dimensions, 
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTutorial, TUTORIAL_STEPS } from '@/contexts/TutorialContext';
import { usePathname } from 'expo-router';

const { width, height } = Dimensions.get('window');

export default function TutorialOverlay() {
  const { isVisible, currentStepIndex, lastStepIndex, dynamicSpotlights, nextStep, skipTutorial } = useTutorial();

  const pathname = usePathname();
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const currentStep = TUTORIAL_STEPS[currentStepIndex];
  
  const normalizePath = (p: string) => p?.replace(/\/\(tabs\)/, '') || '';
  const normalizedCurrent = normalizePath(pathname);
  const normalizedTarget = normalizePath(currentStep?.targetScreen);
  
  const shouldShowOnThisScreen = normalizedCurrent === normalizedTarget;

  useEffect(() => {
    if (isVisible && shouldShowOnThisScreen) {
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.1, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [currentStepIndex, isVisible, shouldShowOnThisScreen]);

  if (!isVisible || !shouldShowOnThisScreen) return null;

  const spotlight = dynamicSpotlights[currentStep.id] || currentStep.defaultSpotlight;

  // Avoid "flash": for these steps, don't show a fallback spotlight.
  // Still render the tutorial card (text + buttons) so the user can continue.
  const requiresMeasuredSpotlight =
    currentStep.id === 'infinite_time' ||
    currentStep.id === 'infinite_difficulty' ||
    currentStep.id === 'infinite_start';

  const effectiveSpotlight = requiresMeasuredSpotlight
    ? (dynamicSpotlights[currentStep.id] || null)
    : spotlight;

  // Position the tutorial card so it doesn't cover the UI.
  // For some steps we prefer a fixed position (area) to avoid overlap on small screens.
  const getAreaStyle = () => {
    switch (currentStep.area) {
      case 'top': return { justifyContent: 'flex-start', paddingTop: 80 };
      case 'middle': return { justifyContent: 'center' };
      case 'bottom': return { justifyContent: 'flex-end', paddingBottom: 150 };
      case 'tabs': return { justifyContent: 'center' };
      default: return { justifyContent: 'center' };
    }
  };

  return (
    <Modal transparent visible={isVisible} animationType="none">
      <View style={styles.overlay}>
        {/* Spotlight Effect Layer */}
        {effectiveSpotlight && (
          <View style={StyleSheet.absoluteFill}>
            {/* Dark areas around the spotlight */}
            <View style={[styles.maskBase, { top: 0, left: 0, right: 0, height: effectiveSpotlight.y }]} />
            <View style={[styles.maskBase, { top: effectiveSpotlight.y + effectiveSpotlight.h, left: 0, right: 0, bottom: 0 }]} />
            <View style={[styles.maskBase, { top: effectiveSpotlight.y, left: 0, width: effectiveSpotlight.x, height: effectiveSpotlight.h }]} />
            <View style={[styles.maskBase, { top: effectiveSpotlight.y, left: effectiveSpotlight.x + effectiveSpotlight.w, right: 0, height: effectiveSpotlight.h }]} />
            
            {/* The actual hole (Spotlight) with pulse ring */}
            <View style={[styles.hole, { 
              top: effectiveSpotlight.y, 
              left: effectiveSpotlight.x, 
              width: effectiveSpotlight.w, 
              height: effectiveSpotlight.h,
              borderRadius: effectiveSpotlight.radius
            }]}>
              <Animated.View style={[
                styles.pulseRing, 
                { 
                  borderRadius: effectiveSpotlight.radius + 5,
                  borderColor: currentStep.color,
                  transform: [{ scale: pulseAnim }]
                }
              ]} />
            </View>
          </View>
        )}

        {!effectiveSpotlight && <View style={styles.dimBg} />}
        
        <SafeAreaView style={[styles.contentContainer, getAreaStyle() as any]} pointerEvents="box-none">
          <Animated.View style={[styles.cardContainer, { opacity: fadeAnim }]}>
            <LinearGradient
              colors={[currentStep.color, 'rgba(0,0,0,0.98)']}
              style={styles.cardGradient}
            >
              <View style={styles.headerRow}>
                <View style={styles.iconBox}>
                  <FontAwesome5 name={currentStep.icon} size={22} color="#fff" />
                </View>
                <Text style={[styles.title, { fontFamily: 'Digitalt' }]}>{currentStep.title}</Text>
              </View>

              <Text style={[styles.description, { fontFamily: 'Gilroy-Black' }]}>
                {currentStep.description}
              </Text>

              <View style={styles.footer}>
                <TouchableOpacity onPress={skipTutorial} style={styles.skipBtn}>
                  <Text style={[styles.skipText, { fontFamily: 'Digitalt' }]}>SALTAR</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={nextStep} style={styles.nextBtn}>
                  <Text style={[styles.nextText, { color: currentStep.color, fontFamily: 'Digitalt' }]}>
                    {currentStepIndex >= lastStepIndex ? '¡LISTO!' : 'SIGUIENTE'}
                  </Text>

                </TouchableOpacity>
              </View>
            </LinearGradient>
          </Animated.View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  dimBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  maskBase: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  hole: {
    position: 'absolute',
    backgroundColor: 'transparent',
    borderWidth: 0,
    overflow: 'visible',
  },
  pulseRing: {
    position: 'absolute',
    top: -5,
    left: -5,
    right: -5,
    bottom: -5,
    borderWidth: 3,
    backgroundColor: 'transparent',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 24,
    zIndex: 10002,
  },
  cardContainer: {
    width: '100%',
  },
  cardGradient: {
    borderRadius: 24,
    padding: 24,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 22,
    flex: 1,
  },
  description: {
    color: '#eee',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipBtn: {
    padding: 8,
  },
  skipText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
  },
  nextBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 18,
  },
  nextText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
