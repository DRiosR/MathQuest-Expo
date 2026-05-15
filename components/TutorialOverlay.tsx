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
const isSmallScreen = height < 750;

export default function TutorialOverlay() {
  const { isVisible, currentStepIndex, firstStepIndex, lastStepIndex, dynamicSpotlights, nextStep, skipTutorial } = useTutorial();

  const pathname = usePathname();
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const currentStep = TUTORIAL_STEPS[currentStepIndex];
  
  const normalizePath = (p: string) => p?.replace(/\/\(tabs\)/, '') || '';
  const normalizedCurrent = normalizePath(pathname);
  const normalizedTarget = normalizePath(currentStep?.targetScreen);
  
  const shouldShowOnThisScreen = normalizedCurrent === normalizedTarget;

  const requiresMeasuredSpotlight = 
    currentStep.id.startsWith('profile_') || 
    currentStep.id.startsWith('infinite_') ||
    currentStep.id.startsWith('store_');

  // Strict check: only show spotlight if it belongs to the CURRENT step
  const isStepMeasured = !!(dynamicSpotlights[currentStep.id]);
  
  // NEVER show default for dynamic steps, and only show dynamic if it's for the current ID
  const effectiveSpotlight = requiresMeasuredSpotlight
    ? (isStepMeasured ? dynamicSpotlights[currentStep.id] : null)
    : (isStepMeasured ? dynamicSpotlights[currentStep.id] : currentStep.defaultSpotlight);

  useEffect(() => {
    if (isVisible && shouldShowOnThisScreen) {
      // If we need a measurement, wait for it before showing the card to avoid "flicker"
      if (requiresMeasuredSpotlight && !isStepMeasured) {
        fadeAnim.setValue(0);
        return;
      }

      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [currentStepIndex, isVisible, shouldShowOnThisScreen, isStepMeasured]);

  if (!isVisible || !shouldShowOnThisScreen) return null;

  const spotlight = dynamicSpotlights[currentStep.id] || currentStep.defaultSpotlight;

  // Progress calculation
  const totalStepsInSection = lastStepIndex - firstStepIndex + 1;
  const currentStepInSection = currentStepIndex - firstStepIndex;
  
  // Array for dots
  const dots = Array.from({ length: totalStepsInSection });

  const getAreaStyle = () => {
    switch (currentStep.area) {
      case 'top': return { justifyContent: 'flex-start', paddingTop: isSmallScreen ? 30 : 60 };
      case 'middle': return { justifyContent: 'center' };
      case 'bottom': return { justifyContent: 'flex-end', paddingBottom: isSmallScreen ? 70 : 110 };
      default: return { justifyContent: 'center' };
    }
  };

  return (
    <Modal transparent visible={isVisible} animationType="none">
      <View style={styles.overlay}>
        {/* Spotlight Layer */}
        {effectiveSpotlight && isStepMeasured && (
          <View style={StyleSheet.absoluteFill}>
            <View style={[styles.maskBase, { top: 0, left: 0, right: 0, height: effectiveSpotlight.y }]} />
            <View style={[styles.maskBase, { top: effectiveSpotlight.y + effectiveSpotlight.h, left: 0, right: 0, bottom: 0 }]} />
            <View style={[styles.maskBase, { top: effectiveSpotlight.y, left: 0, width: effectiveSpotlight.x, height: effectiveSpotlight.h }]} />
            <View style={[styles.maskBase, { top: effectiveSpotlight.y, left: effectiveSpotlight.x + effectiveSpotlight.w, right: 0, height: effectiveSpotlight.h }]} />
            
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
                  borderRadius: effectiveSpotlight.radius + 8,
                  borderColor: currentStep.color,
                  transform: [{ scale: pulseAnim }],
                  shadowColor: currentStep.color,
                  shadowOpacity: 0.8,
                  shadowRadius: 15,
                }
              ]} />
            </View>
          </View>
        )}

        {(!effectiveSpotlight || !isStepMeasured) && <View style={styles.dimBg} />}
        
        <SafeAreaView style={[styles.contentContainer, getAreaStyle() as any]} pointerEvents="box-none">
          <Animated.View style={[
            styles.cardContainer, 
            { 
              opacity: fadeAnim, 
              transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] 
            }
          ]}>
            <LinearGradient
              colors={['rgba(30, 30, 45, 0.95)', 'rgba(15, 15, 25, 0.98)']}
              style={styles.cardGradient}
            >
              {/* Decorative side accent */}
              <View style={[styles.sideAccent, { backgroundColor: currentStep.color }]} />

              <View style={styles.headerRow}>
                <View style={[styles.iconBox, { backgroundColor: currentStep.color + '25' }]}>
                  <FontAwesome5 name={currentStep.icon} size={20} color={currentStep.color} />
                </View>
                <Text style={[styles.title, { fontFamily: 'Digitalt' }]}>{currentStep.title}</Text>
              </View>

              <Text style={[styles.description, { fontFamily: 'Gilroy-Black' }]}>
                {currentStep.description}
              </Text>

              {/* Progress Dot Indicator */}
              <View style={styles.progressContainer}>
                {dots.map((_, i) => {
                  const isActive = currentStepInSection >= i;
                  return (
                    <View 
                      key={i} 
                      style={[
                        styles.progressDot, 
                        { 
                          backgroundColor: isActive ? currentStep.color : 'rgba(255,255,255,0.1)',
                          width: totalStepsInSection > 6 ? (width - 150) / totalStepsInSection : 24
                        }
                      ]} 
                    />
                  );
                })}
              </View>

              <View style={styles.footer}>
                <TouchableOpacity onPress={skipTutorial} style={styles.skipBtn}>
                  <Text style={[styles.skipText, { fontFamily: 'Digitalt' }]}>SALTAR</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={nextStep} style={styles.nextBtn}>
                  <LinearGradient
                    colors={[currentStep.color, currentStep.color]}
                    style={styles.nextGradient}
                  >
                    <Text style={[styles.nextText, { fontFamily: 'Digitalt' }]}>
                      {currentStepIndex >= lastStepIndex ? '¡ENTENDIDO!' : 'SIGUIENTE'}
                    </Text>
                    <FontAwesome5 name="chevron-right" size={14} color="#fff" />
                  </LinearGradient>
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
    backgroundColor: 'rgba(0,0,0,0.75)',
  },
  maskBase: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.75)',
  },
  hole: {
    position: 'absolute',
    backgroundColor: 'transparent',
    overflow: 'visible',
  },
  pulseRing: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderWidth: 2.5,
    backgroundColor: 'transparent',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
    zIndex: 10002,
  },
  cardContainer: {
    width: '100%',
  },
  cardGradient: {
    borderRadius: isSmallScreen ? 20 : 28,
    padding: isSmallScreen ? 16 : 24,
    paddingLeft: isSmallScreen ? 20 : 30,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    position: 'relative',
    overflow: 'hidden',
  },
  sideAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: isSmallScreen ? 8 : 16,
    gap: isSmallScreen ? 8 : 12,
  },
  iconBox: {
    width: isSmallScreen ? 32 : 42,
    height: isSmallScreen ? 32 : 42,
    borderRadius: isSmallScreen ? 8 : 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: isSmallScreen ? 16 : 20,
    flex: 1,
    letterSpacing: 0.5,
  },
  description: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: isSmallScreen ? 13 : 15,
    lineHeight: isSmallScreen ? 18 : 22,
    marginBottom: isSmallScreen ? 12 : 20,
  },
  progressContainer: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: isSmallScreen ? 12 : 20,
  },
  progressDot: {
    height: 4,
    width: 20,
    borderRadius: 2,
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
    color: 'rgba(255,255,255,0.3)',
    fontSize: isSmallScreen ? 11 : 13,
    letterSpacing: 1,
  },
  nextBtn: {
    borderRadius: isSmallScreen ? 12 : 16,
    overflow: 'hidden',
    elevation: 8,
  },
  nextGradient: {
    paddingHorizontal: isSmallScreen ? 16 : 24,
    paddingVertical: isSmallScreen ? 10 : 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: isSmallScreen ? 6 : 10,
  },
  nextText: {
    color: '#fff',
    fontSize: isSmallScreen ? 13 : 15,
    letterSpacing: 1,
  },
});
