import React, { useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  Dimensions, 
  Animated,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTutorial, TUTORIAL_STEPS } from '@/contexts/TutorialContext';
import { usePathname } from 'expo-router';

const { width, height } = Dimensions.get('window');
const IS_SMALL_DEVICE = height < 750;

export default function TutorialOverlay() {
  const { 
    isVisible, 
    currentStepIndex, 
    firstStepIndex, 
    lastStepIndex, 
    dynamicSpotlights, 
    nextStep, 
    prevStep,
    skipTutorial 
  } = useTutorial();

  const pathname = usePathname();
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const contentFadeAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseRef = useRef<Animated.CompositeAnimation | null>(null);
  const lastScreenRef = useRef<string | null>(null);
  const lastStepIdRef = useRef<string | null>(null);

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
    let timeout: any;

    const showCard = (retries = 10) => {
      // If we need a measurement but don't have it yet, wait a bit
      if (requiresMeasuredSpotlight && !isStepMeasured && retries > 0) {
        timeout = setTimeout(() => showCard(retries - 1), 50);
        return;
      }

      const isNewScreen = lastScreenRef.current !== normalizedCurrent;
      const isNewStep = lastStepIdRef.current !== currentStep.id;

      if (isNewScreen) {
        // Fade in the whole card
        fadeAnim.setValue(0);
        contentFadeAnim.setValue(1);
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: Platform.OS !== 'web' }).start();
      } else if (isNewStep) {
        // Smooth content transition on the same screen
        Animated.sequence([
          Animated.timing(contentFadeAnim, { toValue: 0, duration: 150, useNativeDriver: Platform.OS !== 'web' }),
          Animated.timing(contentFadeAnim, { toValue: 1, duration: 250, useNativeDriver: Platform.OS !== 'web' }),
        ]).start();
      }

      lastScreenRef.current = normalizedCurrent;
      lastStepIdRef.current = currentStep.id;

      if (pulseRef.current) pulseRef.current.stop();
      pulseRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 800, useNativeDriver: Platform.OS !== 'web' }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: Platform.OS !== 'web' }),
        ])
      );
      pulseRef.current.start();
    };

    const hideCard = () => {
      Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: Platform.OS !== 'web' }).start();
      lastScreenRef.current = null;
      lastStepIdRef.current = null;
    };

    if (isVisible && shouldShowOnThisScreen) {
      showCard(10);
    } else {
      hideCard();
      if (pulseRef.current) pulseRef.current.stop();
    }
  }, [isVisible, currentStepIndex, shouldShowOnThisScreen, isStepMeasured]);

  if (!isVisible || !shouldShowOnThisScreen) return null;

  // Progress calculation
  const totalStepsInSection = lastStepIndex - firstStepIndex + 1;
  const currentStepInSection = currentStepIndex - firstStepIndex;
  
  // Array for dots
  const dots = Array.from({ length: totalStepsInSection });

  const getAreaStyle = () => {
    // If we have a spotlight, let's try to be smart about positioning
    if (effectiveSpotlight) {
      const spotlightCenterY = effectiveSpotlight.y + effectiveSpotlight.h / 2;
      const threshold = height / 2;
      
      // If spotlight is in the bottom half, place card in the top half
      if (spotlightCenterY > threshold) {
        return { 
          justifyContent: 'flex-start' as const, 
          paddingTop: Math.max(IS_SMALL_DEVICE ? 40 : 60, effectiveSpotlight.y - 300 > 0 ? 60 : 40)
        };
      } else {
        // If spotlight is in the top half, place card in the bottom half
        return { 
          justifyContent: 'flex-end' as const, 
          paddingBottom: IS_SMALL_DEVICE ? 80 : 120 
        };
      }
    }

    // Fallback to static area if no spotlight is measured yet
    switch (currentStep.area) {
      case 'top': return { justifyContent: 'flex-start' as const, paddingTop: IS_SMALL_DEVICE ? 50 : 90 };
      case 'middle': return { justifyContent: 'center' as const };
      case 'bottom': return { justifyContent: 'flex-end' as const, paddingBottom: IS_SMALL_DEVICE ? 100 : 140 };
      default: return { justifyContent: 'center' as const };
    }
  };

  const renderArrow = () => {
    if (!effectiveSpotlight) return null;
    
    const spotlightCenterY = effectiveSpotlight.y + effectiveSpotlight.h / 2;
    const threshold = height / 2;
    const isSpotlightBelow = spotlightCenterY > threshold;

    return (
      <View style={[
        styles.arrowContainer,
        isSpotlightBelow ? styles.arrowBottom : styles.arrowTop
      ]}>
        <View style={[
          styles.arrow, 
          { 
            borderBottomColor: 'rgba(30, 30, 45, 0.98)',
            transform: [{ rotate: isSpotlightBelow ? '180deg' : '0deg' }]
          }
        ]} />
      </View>
    );
  };

  return (
    <Modal transparent visible={isVisible} animationType="none">
      <View style={styles.overlay}>
        {/* Spotlight Layer */}
        {effectiveSpotlight ? (
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
        ) : (
          <View style={styles.dimBg} />
        )}
        
        <SafeAreaView style={[styles.contentContainer, getAreaStyle()]} pointerEvents="box-none">
          <Animated.View style={[
            styles.cardContainer, 
            { 
              opacity: fadeAnim, 
              transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] 
            }
          ]}>
            {renderArrow()}
            <LinearGradient
              colors={['rgba(30, 30, 45, 0.98)', 'rgba(10, 10, 20, 1)']}
              style={styles.cardGradient}
            >
              {/* Decorative side accent - Moved outside Animated.View for absolute edge positioning */}
              <View style={[styles.sideAccent, { backgroundColor: currentStep.color }]} />

              <Animated.View style={{ opacity: contentFadeAnim }}>
                <View style={styles.headerRow}>
                  <View style={[styles.iconBox, { backgroundColor: currentStep.color + '25' }]}>
                    <FontAwesome5 name={currentStep.icon} size={IS_SMALL_DEVICE ? 16 : 20} color={currentStep.color} />
                  </View>
                  <Text style={[styles.title, { fontFamily: 'Digitalt' }]} numberOfLines={1}>{currentStep.title}</Text>
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
                            width: totalStepsInSection > 8 ? (width - 120) / totalStepsInSection : 20
                          }
                        ]} 
                      />
                    );
                  })}
                </View>
              </Animated.View>

              <View style={styles.footer}>
                <View style={styles.leftFooter}>
                  {currentStepIndex > firstStepIndex && (
                    <TouchableOpacity onPress={prevStep} style={styles.footerBtn} activeOpacity={0.7}>
                      <FontAwesome5 name="chevron-left" size={12} color="rgba(255,255,255,0.7)" />
                      <Text style={[styles.footerBtnText, { fontFamily: 'Digitalt' }]}>ATRÁS</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <TouchableOpacity onPress={skipTutorial} style={styles.skipBtn} activeOpacity={0.7}>
                  <Text style={[styles.skipText, { fontFamily: 'Digitalt' }]}>SALTAR</Text>
                </TouchableOpacity>

                <View style={styles.rightFooter}>
                  <TouchableOpacity onPress={nextStep} style={styles.nextBtn} activeOpacity={0.8}>
                    <LinearGradient
                      colors={[currentStep.color, currentStep.color + 'CC']}
                      style={styles.nextGradient}
                      start={{x: 0, y: 0}}
                      end={{x: 1, y: 0}}
                    >
                      <Text style={[styles.nextText, { fontFamily: 'Digitalt' }]}>
                        {currentStepIndex >= lastStepIndex ? '¡LISTO!' : 'SIGUIENTE'}
                      </Text>
                      {currentStepIndex < lastStepIndex && <FontAwesome5 name="chevron-right" size={12} color="#fff" />}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
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
    backgroundColor: 'rgba(0,0,0,0.88)',
  },
  maskBase: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.88)',
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
    borderWidth: 3,
    backgroundColor: 'transparent',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 16,
    zIndex: 10002,
  },
  cardContainer: {
    width: '100%',
    position: 'relative',
  },
  arrowContainer: {
    position: 'absolute',
    width: '100%',
    alignItems: 'center',
    zIndex: 10003,
  },
  arrowTop: {
    top: -12,
  },
  arrowBottom: {
    bottom: -12,
  },
  arrow: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderBottomWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  cardGradient: {
    borderRadius: IS_SMALL_DEVICE ? 24 : 32,
    padding: IS_SMALL_DEVICE ? 20 : 30,
    paddingLeft: IS_SMALL_DEVICE ? 28 : 38,
    elevation: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.7,
    shadowRadius: 25,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.18)',
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
    marginBottom: IS_SMALL_DEVICE ? 12 : 18,
    gap: IS_SMALL_DEVICE ? 10 : 14,
  },
  iconBox: {
    width: IS_SMALL_DEVICE ? 36 : 48,
    height: IS_SMALL_DEVICE ? 36 : 48,
    borderRadius: IS_SMALL_DEVICE ? 10 : 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: IS_SMALL_DEVICE ? 18 : 24,
    flex: 1,
    letterSpacing: 1.2,
  },
  description: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: IS_SMALL_DEVICE ? 14 : 17,
    lineHeight: IS_SMALL_DEVICE ? 22 : 26,
    marginBottom: IS_SMALL_DEVICE ? 18 : 26,
  },
  progressContainer: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: IS_SMALL_DEVICE ? 20 : 30,
    alignItems: 'center',
  },
  progressDot: {
    height: 5,
    borderRadius: 3,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftFooter: {
    width: 80,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rightFooter: {
    width: IS_SMALL_DEVICE ? 110 : 130,
    alignItems: 'flex-end',
  },
  footerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerBtnText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: IS_SMALL_DEVICE ? 11 : 13,
    letterSpacing: 1,
  },
  skipBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  skipText: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: IS_SMALL_DEVICE ? 11 : 13,
    letterSpacing: 1.5,
  },
  nextBtn: {
    borderRadius: IS_SMALL_DEVICE ? 14 : 18,
    overflow: 'hidden',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  nextGradient: {
    paddingHorizontal: IS_SMALL_DEVICE ? 14 : 20,
    paddingVertical: IS_SMALL_DEVICE ? 10 : 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nextText: {
    color: '#fff',
    fontSize: IS_SMALL_DEVICE ? 13 : 15,
    letterSpacing: 1.5,
  },
});
