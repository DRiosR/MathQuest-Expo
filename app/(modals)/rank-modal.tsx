import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Medal, X } from 'phosphor-react-native';
import React, { useEffect, useMemo, useState, useRef } from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View, Dimensions, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import Svg, { Path, Defs, LinearGradient as SvgGradient, Stop, G, Circle, Text as SvgText } from 'react-native-svg';
import Animated, {
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  useSharedValue,
  withDelay,
  interpolate,
  Extrapolate
} from 'react-native-reanimated';

import AnimatedMathBackground from '@/components/ui/AnimatedMathBackground';
import { useAuth } from '@/contexts/AuthContext';
import { useFontContext } from '@/contexts/FontsContext';
import { getAllRanks, getUserRankInfo, RankRow, UserRankInfo, getStoreItems, StoreItemRow, getUserInventory, getCurrentUserAvatar } from '@/services/SupabaseService';
import { Avatar } from '@/types/avatar';
import { LayeredAvatar } from '@/components/LayeredAvatar';

const { width } = Dimensions.get('window');

const ISLAND_HEIGHT = 280; // Aumentado para dar más aire
const MAP_PADDING = 60;

const BIOMES = {
  Bronce: { colors: ['#92400E', '#451A03'], glow: '#D97706', accent: '#FDE68A', pathColor: '#F59E0B' },
  Plata: { colors: ['#475569', '#1E293B'], glow: '#94A3B8', accent: '#E2E8F0', pathColor: '#CBD5E1' },
  Oro: { colors: ['#B45309', '#78350F'], glow: '#FBBF24', accent: '#FEF3C7', pathColor: '#FBBF24' },
  Platino: { colors: ['#0369A1', '#0C4A6E'], glow: '#38BDF8', accent: '#BAE6FD', pathColor: '#38BDF8' },
  Diamante: { colors: ['#1E3A8A', '#172554'], glow: '#60A5FA', accent: '#DBEAFE', pathColor: '#60A5FA' },
  Master: { colors: ['#F472B6', '#BE185D'], glow: '#FF69B4', accent: '#FDF2F8', pathColor: '#DB2777' },
  Maestro: { colors: ['#F472B6', '#BE185D'], glow: '#FF69B4', accent: '#FDF2F8', pathColor: '#DB2777' },
};

const FloatingIsland = ({ rank, index, isCurrent, isUnlocked, totalRanks, rewardFrame }: any) => {
  const floatValue = useSharedValue(0);

  useEffect(() => {
    floatValue.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2500 + index * 300 }),
        withTiming(0, { duration: 2500 + index * 300 })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatValue.value * 12 }],
  }));

  const biome = BIOMES[rank.name as keyof typeof BIOMES] || BIOMES.Bronce;
  const isRight = index % 2 !== 0;
  // Posiciones más centradas para evitar desbordamiento
  const islandX = isRight ? width * 0.55 : width * 0.1;

  return (
    <Animated.View style={[
      styles.islandWrapper,
      {
        top: (totalRanks - 1 - index) * ISLAND_HEIGHT + MAP_PADDING,
        left: islandX,
      },
      animatedStyle
    ]}>
      <View style={styles.islandContainer}>
        {/* Glow/Aura beneath */}
        <View style={[styles.islandGlow, { shadowColor: biome.glow, opacity: isUnlocked ? 0.9 : 0.2 }]} />

        {/* Rock Base (Tinted 3D Effect) */}
        <View style={[
          styles.rockBase,
          { backgroundColor: isUnlocked ? biome.colors[1] : '#0f172a', opacity: 0.8 }
        ]} />

        {/* The Island Surface (Main color) */}
        <LinearGradient
          colors={isUnlocked ? (biome.colors as [string, string]) : (['#1e293b', '#0f172a'] as [string, string])}
          style={[styles.islandBase, !isUnlocked && styles.lockedIsland]}
        >
          <View style={styles.islandSurface}>
            <LinearGradient
              colors={['rgba(255,255,255,0.4)', 'transparent']}
              style={StyleSheet.absoluteFill}
            />
          </View>
        </LinearGradient>

        {/* Reward Frame Bubble (Near the Island) */}
        {rewardFrame && (
          <View style={[
            styles.rewardBubble,
            { [isRight ? 'right' : 'left']: 110, top: -20 }
          ]}>
            <ExpoImage
              source={{ uri: (rewardFrame.imagen_tienda || rewardFrame.imagen) ?? undefined }}
              style={[styles.rewardFrameImg, !isUnlocked && { opacity: 0.3 }]}
              contentFit="contain"
            />
            {!isUnlocked && (
              <View style={styles.miniLockOverlay}>
                <FontAwesome5 name="lock" size={14} color="#fff" />
              </View>
            )}
            <View style={styles.rewardLabelSmall}>
              <Text style={styles.rewardTextSmall}>RECOMPENSA</Text>
            </View>
          </View>
        )}

        {/* Info Card (Also on the inner side but lower) */}
        <View style={[
          styles.ornateCard,
          {
            borderColor: biome.glow,
            [isRight ? 'right' : 'left']: 110,
            top: 40,
            opacity: isUnlocked ? 1 : 0.6
          }
        ]}>
          <Text style={[styles.ornateTitle, { fontFamily: 'Digitalt', color: biome.accent }]}>
            {rank.name.toUpperCase()}
          </Text>
          <Text style={styles.ornatePoints}>
            {rank.min_points} PTS
          </Text>
          {isCurrent && (
            <View style={styles.currentTag}>
              <Text style={styles.currentTabText}>TÚ</Text>
            </View>
          )}
        </View>

        {/* Rank Badge */}
        <View style={[styles.rankBadge, { borderColor: biome.glow, shadowColor: biome.glow }]}>
          <LinearGradient
            colors={isUnlocked ? (biome.colors as [string, string]) : (['#1e293b', '#0f172a'] as [string, string])}
            style={styles.rankBadgeBg}
          />
          {rank.icon_url ? (
            <ExpoImage source={{ uri: rank.icon_url }} style={styles.rankBadgeIcon} />
          ) : (
            <FontAwesome5 name="medal" size={26} color="#fff" />
          )}
          {!isUnlocked && (
            <View style={[styles.miniLockOverlay, { zIndex: 100 }]}>
              <FontAwesome5 name="lock" size={24} color="#fff" />
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );
};

export default function RankModal() {
  const { user } = useAuth();
  const scrollRef = useRef<ScrollView>(null);
  const [ranks, setRanks] = useState<RankRow[]>([]);
  const [rankInfo, setRankInfo] = useState<UserRankInfo | null>(null);
  const [frames, setFrames] = useState<StoreItemRow[]>([]);
  const [inventoryIds, setInventoryIds] = useState<(string | number)[]>([]);
  const [userAvatar, setUserAvatar] = useState<Avatar | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [r, u, f, inv, av] = await Promise.all([
          getAllRanks(),
          user?.id ? getUserRankInfo(user.id) : Promise.resolve(null),
          getStoreItems('marco'),
          user?.id ? getUserInventory(user.id) : Promise.resolve([]),
          getCurrentUserAvatar(),
        ]);
        const sortedRanks = Array.isArray(r) ? [...r].sort((a, b) => a.min_points - b.min_points) : [];
        setRanks(sortedRanks);
        setRankInfo(u ?? null);
        setFrames(f || []);
        setInventoryIds((inv as (string | number)[]) || []);
        setUserAvatar(av);

        // Auto-scroll to current rank
        if (u?.rank) {
          const idx = sortedRanks.findIndex(rank => rank.id === u.rank?.id);
          if (idx !== -1) {
            const scrollPos = (sortedRanks.length - 1 - idx) * ISLAND_HEIGHT;
            setTimeout(() => {
              scrollRef.current?.scrollTo({ y: scrollPos, animated: true });
            }, 600);
          }
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id]);

  const currentRankIndex = useMemo(() => {
    if (!rankInfo?.rank?.id) return 0;
    return ranks.findIndex(r => r.id === rankInfo.rank?.id);
  }, [ranks, rankInfo]);

  const maxUnlockedIndex = useMemo(() => {
    let maxIdx = currentRankIndex;
    ranks.forEach((rank, idx) => {
      const rewardFrame = frames.find(f => f.nombre.toLowerCase().includes(rank.name.toLowerCase()));
      if (rewardFrame && inventoryIds.map(String).includes(String(rewardFrame.id))) {
        if (idx > maxIdx) maxIdx = idx;
      }
    });
    return maxIdx;
  }, [ranks, currentRankIndex, frames, inventoryIds]);

  const renderPath = (index: number) => {
    if (index >= ranks.length - 1) return null;
    const isStartRight = index % 2 !== 0;
    const startX = isStartRight ? width * 0.7 : width * 0.3;
    const startY = (ranks.length - 1 - index) * ISLAND_HEIGHT + MAP_PADDING + 30;
    const endX = isStartRight ? width * 0.3 : width * 0.7;
    const endY = (ranks.length - 1 - (index + 1)) * ISLAND_HEIGHT + MAP_PADDING + 30;

    const midY = (startY + endY) / 2;
    const cp1x = startX;
    const cp1y = midY;
    const cp2x = endX;
    const cp2y = midY;

    const nextRank = ranks[index + 1];
    const biomeKey = nextRank.name.trim() as keyof typeof BIOMES;
    const biome = BIOMES[biomeKey] || BIOMES.Bronce;
    const isPathUnlocked = index < maxUnlockedIndex;
    const isPathCurrent = index === currentRankIndex;

    // Calculate progress on current segment
    let segmentProgress = 0;
    if (isPathCurrent) {
      const lower = ranks[index].min_points;
      const upper = ranks[index + 1].min_points;
      const current = rankInfo?.points ?? 0;
      segmentProgress = Math.max(0, Math.min(1, (current - lower) / (upper - lower)));
    }

    // Path string
    const d = `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`;

    return (
      <G key={`path-group-${index}`}>
        {/* Background (Empty Path) */}
        <Path
          d={d}
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={8}
          fill="none"
        />

        {/* Glow Path (Filled) */}
        {(isPathUnlocked || isPathCurrent) && (
          <Path
            d={d}
            stroke={biome.glow}
            strokeWidth={12}
            strokeOpacity={0.2}
            fill="none"
            strokeDasharray="1000" // Big enough
            strokeDashoffset={isPathUnlocked ? 0 : 1000 * (1 - segmentProgress)}
          />
        )}

        {/* Core Path (Filled) */}
        {(isPathUnlocked || isPathCurrent) && (
          <Path
            d={d}
            stroke={biome.pathColor}
            strokeWidth={4}
            fill="none"
            strokeDasharray="1000"
            strokeDashoffset={isPathUnlocked ? 0 : 1000 * (1 - segmentProgress)}
          />
        )}
      </G>
    );
  };

  const renderPlayerAvatarMarker = () => {
    if (!rankInfo?.rank?.id) return null;

    // Find current path index
    const index = currentRankIndex;
    const nextRank = ranks[index + 1];

    // Calculate progress
    const lower = ranks[index].min_points;
    const upper = nextRank ? nextRank.min_points : ranks[index].max_points || lower + 1000;
    const points = rankInfo.points ?? 0;
    const t = Math.max(0, Math.min(1, (points - lower) / (upper - lower)));

    // If no next rank, stay on last island
    if (!nextRank) return null;

    const isStartRight = index % 2 !== 0;
    const startX = isStartRight ? width * 0.7 : width * 0.3;
    const startY = (ranks.length - 1 - index) * ISLAND_HEIGHT + MAP_PADDING + 30;
    const endX = isStartRight ? width * 0.3 : width * 0.7;
    const endY = (ranks.length - 1 - (index + 1)) * ISLAND_HEIGHT + MAP_PADDING + 30;

    const midY = (startY + endY) / 2;
    const cp1x = startX;
    const cp1y = midY;
    const cp2x = endX;
    const cp2y = midY;

    // Bezier
    const invT = 1 - t;
    const posX = (Math.pow(invT, 3) * startX) + (3 * Math.pow(invT, 2) * t * cp1x) + (3 * invT * Math.pow(t, 2) * cp2x) + (Math.pow(t, 3) * endX);
    const posY = (Math.pow(invT, 3) * startY) + (3 * Math.pow(invT, 2) * t * cp1y) + (3 * invT * Math.pow(t, 2) * cp2y) + (Math.pow(t, 3) * endY);

    const biomeKey = (nextRank?.name || 'Bronce').trim() as keyof typeof BIOMES;
    const biome = BIOMES[biomeKey] || BIOMES.Bronce;

    return (
      <Animated.View
        pointerEvents="none"
        style={[
          styles.playerAvatarMarker,
          {
            left: posX - 30,
            top: posY - 35,
            shadowColor: biome.glow,
            borderColor: biome.accent,
          }
        ]}
      >
        <View style={styles.avatarMiniWrap}>
          <LayeredAvatar avatar={userAvatar!} size={60} />
        </View>
        <View style={[styles.miniYouTag, { backgroundColor: biome.glow }]}>
          <Text style={styles.miniYouText}>TÚ</Text>
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#312e81', '#5b21b6', '#a855f7']} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.05)' }]} />
      <AnimatedMathBackground />

      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { fontFamily: 'Digitalt' }]}>MAPA DE</Text>
            <Text style={[styles.subtitle, { fontFamily: 'Gilroy-Black' }]}>PROGRESO</Text>
          </View>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <X size={20} color="#FFFFFF" weight="bold" />
          </TouchableOpacity>
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ height: ranks.length * ISLAND_HEIGHT + 200 }}
          showsVerticalScrollIndicator={false}
        >
          {/* SVG Layer for Connections */}
          <Svg style={StyleSheet.absoluteFill}>
            {ranks.map((_, i) => renderPath(i))}
          </Svg>

          {/* Islands Layer */}
          {ranks.map((rank, index) => {
            const frameReward = frames.find(f => f.nombre.toLowerCase().includes(rank.name.toLowerCase()));
            return (
              <FloatingIsland
                key={rank.id}
                rank={rank}
                index={index}
                totalRanks={ranks.length}
                isCurrent={rank.id === rankInfo?.rank?.id}
                isUnlocked={index <= maxUnlockedIndex}
                rewardFrame={frameReward}
              />
            );
          })}

          {/* Player Avatar Marker */}
          {renderPlayerAvatarMarker()}
        </ScrollView>

        {/* Points Banner Bottom */}
        <View style={styles.footerStats}>
          <Text style={[styles.footerPoints, { fontFamily: 'Digitalt' }]}>{rankInfo?.points || 0} PTS</Text>
          <Text style={[styles.footerRank, { fontFamily: 'Gilroy-Black' }]}>
            TU RANGO: {rankInfo?.rank?.name.toUpperCase() || 'BRONCE'}
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0c0a09' },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 15,
    paddingBottom: 20,
    zIndex: 10,
  },
  title: { color: '#fff', fontSize: 28, letterSpacing: 2 },
  subtitle: { color: 'rgba(255,255,255,0.5)', fontSize: 14, letterSpacing: 4 },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  islandWrapper: {
    position: 'absolute',
    width: 140,
    alignItems: 'center',
    zIndex: 5,
  },
  islandContainer: {
    alignItems: 'center',
    width: '100%',
  },
  islandGlow: {
    position: 'absolute',
    bottom: -15,
    width: 130,
    height: 50,
    borderRadius: 65,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.9,
    shadowRadius: 20,
    elevation: 25,
  },
  rockBase: {
    position: 'absolute',
    bottom: 0,
    width: 110,
    height: 40,
    backgroundColor: '#0f172a',
    borderRadius: 55,
    transform: [{ scaleY: 0.8 }],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  islandBase: {
    width: 120,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
    elevation: 10,
    transform: [{ scaleY: 0.6 }],
  },
  islandSurface: {
    flex: 1,
  },
  lockedIsland: {
    opacity: 0.4,
  },
  rankBadge: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#0f172a',
    borderWidth: 2,
    position: 'absolute',
    top: -45,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 30,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  rankBadgeBg: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 35,
    opacity: 0.7,
  },
  rankBadgeIcon: {
    width: 45,
    height: 45,
    zIndex: 2,
  },
  ornateCard: {
    position: 'absolute',
    top: -30,
    width: 130,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 10,
    alignItems: 'center',
    elevation: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
  },
  rewardBubble: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderWidth: 1.5,
    borderColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
    elevation: 20,
  },
  rewardFrameImg: {
    width: 45,
    height: 45,
  },
  rewardLabelSmall: {
    position: 'absolute',
    bottom: -8,
    backgroundColor: '#FFD700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    elevation: 5,
  },
  rewardTextSmall: {
    color: '#000',
    fontSize: 6,
    fontWeight: 'bold',
  },
  ornateTitle: {
    fontSize: 14,
    letterSpacing: 1,
    marginBottom: 2,
  },
  ornatePoints: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 9,
    fontWeight: 'bold',
  },
  currentTag: {
    marginTop: 6,
    backgroundColor: '#fff',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  currentTabText: {
    color: '#000',
    fontSize: 7,
    fontWeight: '900',
  },
  miniLockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 35,
    zIndex: 20,
  },
  footerStats: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 20,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  footerPoints: {
    color: '#fff',
    fontSize: 24,
    letterSpacing: 2,
  },
  footerRank: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    letterSpacing: 1,
    marginTop: 4,
  },
  playerAvatarMarker: {
    position: 'absolute',
    width: 70,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 10,
  },
  avatarMiniWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'transparent',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniYouTag: {
    position: 'absolute',
    bottom: -5,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fff',
  },
  miniYouText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: 'Digitalt',
  },
  cardSpacer: {
    height: 0,
  },
});


