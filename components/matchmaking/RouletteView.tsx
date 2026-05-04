import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, ImageSourcePropType, StyleSheet, Text, View } from 'react-native';

type SelectedCategory = { id: string; name: string; emoji: string; color: string } | null | undefined;

type Face = {
  userId: string; // ADD THIS - we need to identify which player this is
  username: string;
  avatarComponent: React.ReactNode;
  score?: number;
  roundsWon?: number;
  totalScore?: number;
};

type Props = {
  selectedCategory?: SelectedCategory;
  onSpinComplete?: () => void;
  leftPlayer?: Face;
  rightPlayer?: Face;
};

const wheelImage: ImageSourcePropType = require('@/assets/images/competitive/roulette-2.png');

const CLOCKWISE_SLICE_IDS: string[] = [
  'division',
  'totalin',
  'sumas',
  'restas',
  'multiplicacion',
];

export default function RouletteView({ 
  selectedCategory, 
  onSpinComplete, 
  leftPlayer, 
  rightPlayer 
}: Props) {
  const rotateDeg = useRef(new Animated.Value(0)).current;
  const [landedId, setLandedId] = useState<string | undefined>(selectedCategory?.id);
  const SLICE_COUNT = CLOCKWISE_SLICE_IDS.length;
  const SEGMENT_ANGLE = 360 / SLICE_COUNT;

  const indexForCategory = (id?: string) => {
    if (!id) return 0;
    const canonical = id.toLowerCase();
    const aliasMap: Record<string, string> = { random: 'totalin', aleatorio: 'totalin' };
    const normalized = aliasMap[canonical] || canonical;
    const idx = CLOCKWISE_SLICE_IDS.findIndex(s => s === normalized);
    return Math.max(0, idx === -1 ? 0 : idx);
  };
  
  const angleForIndex = (idx: number) => {
    const SLICE_OFFSET = 30;
    return 360 - (idx * SEGMENT_ANGLE) - SLICE_OFFSET;
  };

  const computeLandedIndex = (angle: number) => {
    const a = ((angle % 360) + 360) % 360;
    const SLICE_OFFSET = 30;
    const adjusted = (360 - a - SLICE_OFFSET + SEGMENT_ANGLE / 2);
    const idx = Math.floor(adjusted / SEGMENT_ANGLE) % SLICE_COUNT;
    return (idx + SLICE_COUNT) % SLICE_COUNT;
  };

  const targetAngle = useMemo(() => {
    const idx = indexForCategory(selectedCategory?.id);
    return angleForIndex(idx);
  }, [selectedCategory?.id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const baseSpins = 5;
      const final = baseSpins * 360 + targetAngle;
      Animated.timing(rotateDeg, {
        toValue: final,
        duration: 2000,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        const landedIdx = computeLandedIndex(final);
        const id = CLOCKWISE_SLICE_IDS[landedIdx];
        setLandedId(id);
        onSpinComplete?.();
      });
    }, 3000);

    return () => clearTimeout(timer);
  }, [targetAngle]);

  const rotation = rotateDeg.interpolate({ 
    inputRange: [0, 360], 
    outputRange: ['0deg', '360deg'] 
  });

  return (
    <View style={styles.container}>
      {/* Header with avatars and score */}
      {(leftPlayer || rightPlayer) && (
        <View style={styles.header}>
          {/* Left player (Me) */}
          <View style={styles.playerCol}>
            <View style={[
              styles.avatarCircle,
              styles.avatarCircleHighlight
            ]}>
              {leftPlayer?.avatarComponent}
            </View>
            <Text style={[
              styles.usernameText, 
              { fontFamily: 'Digitalt' },
              styles.usernameTextHighlight
            ]} numberOfLines={1}>
              {leftPlayer?.username?.toUpperCase() || 'TÚ'}
            </Text>
            <Text style={[
              styles.scoreText, 
              { fontFamily: 'Digitalt' }
            ]}>
              {String((leftPlayer?.totalScore ?? leftPlayer?.score ?? 0)).padStart(2, '0')}
            </Text>
          </View>
          
          {/* Right player (Opponent) */}
          <View style={styles.playerCol}>
            <View style={styles.avatarCircle}>
              {rightPlayer?.avatarComponent}
            </View>
            <Text style={[
              styles.usernameText, 
              { fontFamily: 'Digitalt' }
            ]} numberOfLines={1}>
              {rightPlayer?.username?.toUpperCase() || 'OPONENTE'}
            </Text>
            <Text style={[
              styles.scoreText, 
              { fontFamily: 'Digitalt' }
            ]}>
              {String((rightPlayer?.totalScore ?? rightPlayer?.score ?? 0)).padStart(2, '0')}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.wheelContainer}>
        <View style={styles.pointer} />
        <Animated.View style={[styles.wheelWrap, { transform: [{ rotate: rotation }] }]}>
          <Image source={wheelImage} style={styles.wheel} resizeMode="contain" />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 112,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  playerCol: { alignItems: 'center', gap: 6 },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarCircleHighlight: {
    borderWidth: 3,
    borderColor: '#FFD616',
    shadowColor: '#FFD616',
    shadowOpacity: 0.6,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  scoreText: { 
    color: '#FFFFFF', 
    fontSize: 28, 
    fontWeight: '900', 
    marginTop: 6, 
    letterSpacing: 1 
  },
  usernameText: { 
    color: '#FFFFFF', 
    opacity: 0.85, 
    fontSize: 10, 
    letterSpacing: 0.8, 
    maxWidth: 120 
  },
  usernameTextHighlight: { 
    color: '#FFD616',
    opacity: 1,
    fontWeight: '700',
  },
  wheelContainer: { 
    width: 300, 
    height: 300, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  pointer: {
    position: 'absolute',
    top: -6,
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 14,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#FFFFFF',
    zIndex: 2,
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  wheelWrap: { width: 300, height: 300 },
  wheel: { width: '100%', height: '100%' },
});