import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Medal, X } from 'phosphor-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';

import AnimatedMathBackground from '@/components/ui/AnimatedMathBackground';
import { useAuth } from '@/contexts/AuthContext';
import { useFontContext } from '@/contexts/FontsContext';
import { getAllRanks, getUserRankInfo, RankRow, UserRankInfo, getStoreItems, StoreItemRow } from '@/services/SupabaseService';

const { width } = Dimensions.get('window');

export default function RankModal() {
  const { user } = useAuth();
  const { fontsLoaded } = useFontContext();
  const [ranks, setRanks] = useState<RankRow[]>([]);
  const [rankInfo, setRankInfo] = useState<UserRankInfo | null>(null);
  const [frames, setFrames] = useState<StoreItemRow[]>([]);
  const [loadingRanks, setLoadingRanks] = useState<boolean>(false);
  const [loadingUserRank, setLoadingUserRank] = useState<boolean>(false);
  const loading = loadingRanks || loadingUserRank;

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoadingRanks(true);
      setLoadingUserRank(true);
      try {
        const [r, u, f] = await Promise.all([
          getAllRanks(),
          user?.id ? getUserRankInfo(user.id) : Promise.resolve(null),
          getStoreItems('marco'),
        ]);
        if (mounted) {
          // Orden ascendente: Bronce (0) arriba, Maestro abajo
          const sortedRanks = Array.isArray(r) ? [...r].sort((a, b) => a.min_points - b.min_points) : [];
          setRanks(sortedRanks);
          setRankInfo(u ?? null);
          setFrames(f || []);
        }
      } finally {
        if (mounted) {
          setLoadingRanks(false);
          setLoadingUserRank(false);
        }
      }
    };
    load();
    return () => { mounted = false; };
  }, [user?.id]);

  const currentRankId = rankInfo?.rank?.id ?? null;
  const currentIndex = useMemo(() => {
    const idx = ranks.findIndex(r => r.id === currentRankId);
    return idx < 0 ? Number.MAX_SAFE_INTEGER : idx;
  }, [ranks, currentRankId]);

  const rankColor = useMemo(() => {
    return rankInfo?.rank?.color || '#A855F7';
  }, [rankInfo?.rank?.color]);

  return (
    <View style={styles.container}>
      <LinearGradient colors={[rankColor, '#8A56FE']} style={StyleSheet.absoluteFill} />
      <AnimatedMathBackground />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { fontFamily: 'Digitalt' }]}>CAMINO</Text>
            <Text style={[styles.subtitle, { fontFamily: 'Gilroy-Black' }]}>DE RANGO</Text>
          </View>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}>
            <View style={styles.closeButton}>
              <X size={20} color="#FFFFFF" weight="bold" />
            </View>
          </TouchableOpacity>
        </View>
        <View style={styles.currentStatsBanner}>
          <View style={styles.statInfo}>
            <Text style={[styles.statLabel, { fontFamily: 'Gilroy-Black' }]}>PUNTOS ACTUALES</Text>
            <Text style={[styles.statValue, { fontFamily: 'Digitalt' }]}>{rankInfo?.points ?? 0} PTS</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statInfo}>
            <Text style={[styles.statLabel, { fontFamily: 'Gilroy-Black' }]}>RANGO ACTUAL</Text>
            <Text style={[styles.statValue, { fontFamily: 'Digitalt', color: rankColor }]}>
              {rankInfo?.rank?.name.toUpperCase() ?? 'SIN RANGO'}
            </Text>
          </View>
        </View>

        <View style={styles.listWrap}>
          <FlatList
            data={ranks}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item, index }) => {
              const isCurrent = item.id === currentRankId;
              const isHigher = index > currentIndex;
              
              const frameReward = frames.find(f => f.nombre.toLowerCase().includes(item.name.toLowerCase()));
              const isFirst = index === 0; // Bronce (Top)
              const isLast = index === ranks.length - 1; // Maestro (Bottom)
              const currentPoints = rankInfo?.points ?? 0;

              // Lógica de llenado de línea: El progreso ocurre de ARRIBA hacia ABAJO
              let segmentProgress = 0;
              if (!isLast) {
                const lowerBound = item.min_points;
                const upperBound = ranks[index + 1].min_points;
                segmentProgress = Math.max(0, Math.min(1, (currentPoints - lowerBound) / (upperBound - lowerBound)));
              }

              return (
                <View style={styles.rankItemWrapper}>
                  {/* Tarjeta de Rango (Ocupa todo el ancho) */}
                  <View style={styles.cardColumn}>
                    <View style={[
                      styles.rankCardOuter, 
                      isCurrent && { borderColor: item.color || '#fff', borderWidth: 2 }
                    ]}>
                      <LinearGradient
                        colors={isHigher ? ['rgba(0,0,0,0.4)', 'rgba(0,0,0,0.6)'] : ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
                        style={[styles.rankCard, isHigher && styles.lockedCard]}
                      >
                        <View style={styles.rankMainInfo}>
                          <View style={[styles.iconBadge, { backgroundColor: isHigher ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.1)' }]}>
                            {item.icon_url ? (
                              <ExpoImage source={{ uri: item.icon_url }} style={styles.rankIcon} contentFit="contain" />
                            ) : (
                              <FontAwesome5 name="medal" size={24} color={isHigher ? '#64748B' : '#fff'} />
                            )}
                          </View>
                          <View style={styles.rankTextCol}>
                            <Text style={[styles.rankName, { fontFamily: 'Digitalt', color: isHigher ? '#94A3B8' : '#fff' }]}>
                              {item.name.toUpperCase()}
                            </Text>
                            <View style={styles.pointsRow}>
                              <FontAwesome5 name="star" size={10} color={isHigher ? '#64748B' : '#FFD616'} solid />
                              <Text style={[styles.rankRange, { fontFamily: 'Gilroy-Black', color: isHigher ? '#64748B' : 'rgba(255,255,255,0.7)' }]}>
                                {item.min_points} - {item.max_points} pts
                              </Text>
                            </View>
                            
                            {isCurrent && rankInfo && (
                              <View style={styles.progressContainer}>
                                <View style={styles.progressBarBg}>
                                  <View style={[styles.progressBarFill, { width: `${rankInfo.progressPercent * 100}%`, backgroundColor: item.color || '#fff' }]}>
                                    <View style={styles.progressTip} />
                                  </View>
                                </View>
                                <Text style={[styles.progressText, { fontFamily: 'Gilroy-Black' }]}>
                                  {Math.round(rankInfo.progressPercent * 100)}% AL SIGUIENTE
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>

                        <View style={styles.rewardContainer}>
                          <Text style={[styles.rewardLabel, { fontFamily: 'Gilroy-Black' }]}>RECOMPENSA</Text>
                          {frameReward ? (
                            <View style={styles.framePreviewContainer}>
                              <ExpoImage 
                                source={{ uri: (frameReward.imagen_tienda || frameReward.imagen) ?? undefined }} 
                                style={[styles.framePreview, isHigher && styles.lockedFrame]}
                                contentFit="contain"
                              />
                              {isHigher && (
                                <View style={styles.lockOverlay}>
                                  <FontAwesome5 name="lock" size={14} color="#fff" />
                                </View>
                              )}
                            </View>
                          ) : (
                            <View style={styles.noRewardPlaceholder}>
                              <FontAwesome5 name="gift" size={18} color="rgba(255,255,255,0.2)" />
                            </View>
                          )}
                        </View>

                        {isCurrent && (
                          <View style={styles.activeIndicator}>
                            <FontAwesome5 name="check-circle" size={20} color="#22C55E" solid />
                          </View>
                        )}
                      </LinearGradient>
                    </View>
                    <View style={styles.cardSpacer} />
                  </View>
                </View>
              );
            }}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1E1B4B' },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 15,
    paddingBottom: 10,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 32,
    letterSpacing: 2,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    lineHeight: 34,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 16,
    letterSpacing: 4,
    marginTop: -4,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentStatsBanner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.2)',
    marginHorizontal: 24,
    padding: 15,
    borderRadius: 20,
    marginTop: 10,
    alignItems: 'center',
  },
  statInfo: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 9,
    letterSpacing: 1,
    marginBottom: 4,
  },
  statValue: {
    color: '#fff',
    fontSize: 18,
    letterSpacing: 1,
  },
  listWrap: { 
    flex: 1, 
    marginTop: 20,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    backgroundColor: 'rgba(0,0,0,0.25)',
    overflow: 'hidden',
  },
  listContent: { 
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 60, 
  },
  rankItemWrapper: {
    flexDirection: 'row',
    alignItems: 'stretch',
    // Eliminamos el margin para que el path sea continuo
  },
  pathContainer: {
    width: 40,
    alignItems: 'center',
    marginRight: 15,
  },
  pathLineContainer: {
    width: 8, // Un poco más grueso
    flex: 1,
    position: 'relative',
    borderRadius: 0,
  },
  pathLineBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  pathLineFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
  },
  pathNode: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
    elevation: 4,
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  playerMarker: {
    position: 'absolute',
    left: 8,
    alignItems: 'center',
    zIndex: 100,
  },
  playerMarkerBadge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerAvatarTiny: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: '#7C3AED',
  },
  playerInitialCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  playerInitialText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  playerLabelTag: {
    backgroundColor: '#fff',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: -4,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  playerLabelText: {
    color: '#7C3AED',
    fontSize: 7,
    letterSpacing: 0.5,
  },
  playerMarkerArrow: {
    display: 'none',
  },
  finalStarNode: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    elevation: 8,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  innerNode: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  rankCardOuter: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  cardColumn: {
    flex: 1,
  },
  cardSpacer: {
    height: 20,
  },
  rankCard: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  lockedCard: {
    opacity: 0.8,
  },
  rankMainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconBadge: {
    width: 50,
    height: 50,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  rankIcon: { width: 30, height: 30 },
  rankTextCol: { flex: 1 },
  rankName: { fontSize: 18, letterSpacing: 1, marginBottom: 2 },
  pointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rankRange: { fontSize: 10 },
  progressContainer: {
    marginTop: 8,
    width: '100%',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    marginBottom: 4,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
    position: 'relative',
    justifyContent: 'center',
  },
  progressTip: {
    position: 'absolute',
    right: -4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
    elevation: 5,
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  progressText: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.5,
  },
  rewardContainer: {
    alignItems: 'center',
    gap: 6,
  },
  rewardLabel: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 1,
  },
  framePreviewContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  framePreview: {
    width: '90%',
    height: '90%',
  },
  lockedFrame: {
    opacity: 0.5,
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  activeIndicator: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  noRewardPlaceholder: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
});


