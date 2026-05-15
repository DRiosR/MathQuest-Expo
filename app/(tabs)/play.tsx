import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesome5 } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, router } from 'expo-router';
import { Question } from 'phosphor-react-native';
import React, { useCallback, useMemo, useState, useRef } from 'react';
import { Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image as ExpoImage } from 'expo-image';

import AnimatedMathBackground from '@/components/ui/AnimatedMathBackground';
import GameModeButton from '@/components/ui/GameModeButton';
import TutorialOverlay from '@/components/TutorialOverlay';
import { LayeredAvatar } from '@/components/LayeredAvatar';
import { useAuth } from '@/contexts/AuthContext';
import { useAvatar } from '@/contexts/AvatarContext';
import { useFontContext } from '@/contexts/FontsContext';
import { useTutorial } from '@/contexts/TutorialContext';
import { getAllRanks, getUserRankInfo, UserRankInfo, checkRankUpAndGrantFrame } from '@/services/SupabaseService';
import { RankUpModal } from '@/components/modals/RankUpModal';

const { height, width } = Dimensions.get('window');
const IS_SMALL_DEVICE = height < 750;
const SCALE = width / 375;
const normalize = (size: number) => Math.round(size * SCALE);

const RANK_BIOMES = {
  Bronce: { colors: ['#92400E', '#451A03'], glow: '#D97706', progress: ['#FDE68A', '#D97706'] },
  Plata: { colors: ['#475569', '#1E293B'], glow: '#94A3B8', progress: ['#E2E8F0', '#94A3B8'] },
  Oro: { colors: ['#B45309', '#78350F'], glow: '#FBBF24', progress: ['#FEF3C7', '#FBBF24'] },
  Platino: { colors: ['#0369A1', '#0C4A6E'], glow: '#38BDF8', progress: ['#BAE6FD', '#38BDF8'] },
  Diamante: { colors: ['#1E3A8A', '#172554'], glow: '#60A5FA', progress: ['#DBEAFE', '#60A5FA'] },
  Master: { colors: ['#F472B6', '#BE185D'], glow: '#FF69B4', progress: ['#FDF2F8', '#FF69B4'] },
  Maestro: { colors: ['#F472B6', '#BE185D'], glow: '#FF69B4', progress: ['#FDF2F8', '#FF69B4'] },
};

export default function PlayScreen() {
  const { fontsLoaded } = useFontContext();
  const { setDynamicSpotlight } = useTutorial();

  const { avatar: userAvatar } = useAvatar();
  const { user } = useAuth();
  const [rankInfo, setRankInfo] = useState<UserRankInfo | null>(null);
  const [rankLoading, setRankLoading] = useState<boolean>(false);
  const [showRankUp, setShowRankUp] = useState(false);
  const [newRankData, setNewRankData] = useState<{ name: string; icon: string | null; color: string } | null>(null);
  const [unlockedFrameImage, setUnlockedFrameImage] = useState<string | null>(null);

  const { isVisible: isTutorialVisible, startTutorial } = useTutorial();

  const rankRef = useRef<View>(null);
  const competitiveRef = useRef<View>(null);
  const howToPlayRef = useRef<View>(null);
  const rankingRef = useRef<View>(null);

  const measure = useCallback((ref: React.RefObject<any>, id: string, radius: number) => {
    if (ref.current) {
      ref.current.measure((x: number, y: number, w: number, h: number, pageX: number, pageY: number) => {
        if (w > 0) {
          setDynamicSpotlight(id, { x: pageX, y: pageY, w, h, radius });
        }
      });
    }
  }, [setDynamicSpotlight]);

  const isInitialRankCheck = useRef(true);
  const isRefreshingRank = useRef(false);

  const refreshUserRank = useCallback(async () => {
    if (!user?.id || isRefreshingRank.current) return;
    
    isRefreshingRank.current = true;
    setRankLoading(true);
    
    try {
      const remote = await getUserRankInfo(user.id);
      if (remote?.rank) {
        const rankId = remote.rank.id;
        const rankName = remote.rank.name.toLowerCase();
        const isBronze = rankName.includes('bronce') || rankName.includes('bronze');

        // KEY POR CUENTA (no por dispositivo)
        const storageKey = `@mathquest_seen_ranks_${user.id}`;
        const seenRanksStr = await AsyncStorage.getItem(storageKey);
        const seenRanks = seenRanksStr ? JSON.parse(seenRanksStr) : [];
        
        // Si no hemos visto este rango aún
        const isNewRank = !seenRanks.includes(rankId);

        // Actualizamos el estado local
        const oldRankMinPoints = rankInfo?.rank?.min_points ?? 0;
        const newRankMinPoints = remote.rank.min_points;
        const isRankUp = newRankMinPoints > oldRankMinPoints;

        setRankInfo(remote);

        if (isNewRank) {
          // Guardar como visto inmediatamente
          const updatedSeen = [...seenRanks, rankId];
          await AsyncStorage.setItem(storageKey, JSON.stringify(updatedSeen));

          // REGLA DE ORO: 
          // Solo mostrar si:
          // 1. NO es la carga inicial de la aplicación (evita popups al entrar)
          // 2. NO es un rango de Bronce
          // 3. Es un rango realmente superior o nuevo para el usuario
          if (!isInitialRankCheck.current && !isBronze && isRankUp) {
            setNewRankData({
              name: remote.rank.name,
              icon: remote.rank.icon_url,
              color: remote.rank.color || '#A855F7'
            });

            // Intentar obtener el marco
            try {
              const result = await checkRankUpAndGrantFrame(user.id, 0, remote.points ?? 0);
              setUnlockedFrameImage(result?.frame?.imagen_tienda || result?.frame?.imagen || null);
            } catch (e) {
              setUnlockedFrameImage(null);
            }

            setShowRankUp(true);
          }
        }
      }
    } catch (err) {
      console.error('Error in refreshUserRank:', err);
    } finally {
      isRefreshingRank.current = false;
      isInitialRankCheck.current = false; // Marcamos que la primera revisión terminó
      setRankLoading(false);
    }
  }, [user?.id, rankInfo?.rank]);

  const refreshRanks = useCallback(async () => {
    try {
      await getAllRanks();
    } catch {
      // ignore
    }
  }, []);

  const rankColor = useMemo(() => {
    const color = rankInfo?.rank?.color || '#A855F7';
    return color || '#A855F7';
  }, [rankInfo]);

  const measureAll = useCallback(() => {
    measure(rankRef, 'my_rank', 25);
    measure(competitiveRef, 'competitive', 30);
    measure(howToPlayRef, 'how_to_play', 15);
    measure(rankingRef, 'global_ranking', 25);
  }, [measure]);

  useFocusEffect(
    React.useCallback(() => {
      refreshUserRank();
      refreshRanks();
      // Esperamos para que las animaciones de entrada terminen
      const timer = setTimeout(measureAll, 1500);
      return () => clearTimeout(timer);
    }, [refreshUserRank, refreshRanks, measureAll])
  );

  // RE-MEDIR cuando el tutorial se hace visible (por si se borraron los spotlights al iniciar)
  React.useEffect(() => {
    if (isTutorialVisible) {
      const timer = setTimeout(measureAll, 500);
      return () => clearTimeout(timer);
    }
  }, [isTutorialVisible, measureAll]);



  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[rankColor, '#8A56FE']}
        style={styles.gradientBackground}
      />
      <AnimatedMathBackground />

      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
        {/* Top View Title */}
        <View style={styles.viewHeader}>
          <Text style={[styles.viewTitle, { fontFamily: 'Digitalt', fontSize: IS_SMALL_DEVICE ? 22 : normalize(28) }]}>DUELOS 1vs1</Text>
        </View>

        {/* 1. Dashboard Header: League Info Card */}
        <View style={styles.dashboardHeader}>
          <TouchableOpacity 
            style={styles.leagueCard}
            onPress={() => router.push('/(modals)/rank-modal')}
            activeOpacity={0.9}
            ref={rankRef}
            onLayout={() => measure(rankRef, 'my_rank', 30)}
          >
            <LinearGradient 
              colors={(RANK_BIOMES[rankInfo?.rank?.name as keyof typeof RANK_BIOMES]?.colors as [string, string]) || ['#1E1B4B', '#312E81']} 
              style={StyleSheet.absoluteFill} 
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
            />
            <View style={[styles.leagueAccent, { backgroundColor: rankColor }]} />
            
            <View style={styles.leagueMain}>
              <View style={styles.leagueBadgeContainer}>
                {rankInfo?.rank?.icon_url ? (
                  <Image source={{ uri: rankInfo.rank.icon_url }} style={styles.leagueIcon} resizeMode="contain" />
                ) : (
                  <FontAwesome5 name="medal" size={32} color={rankColor} />
                )}
              </View>
              
              <View style={styles.leagueInfo}>
                <Text style={[styles.leagueName, { fontFamily: 'Digitalt', color: '#fff' }]}>
                  LIGA {rankInfo?.rank?.name.toUpperCase() || 'BRONCE'}
                </Text>
                <View style={styles.pointsRow}>
                  <FontAwesome5 name="star" size={12} color="#FFD45E" />
                  <Text style={[styles.leaguePoints, { fontFamily: 'Gilroy-Black' }]}>
                    {rankInfo?.points || 0} PUNTOS DE HONOR
                  </Text>
                </View>
              </View>
            </View>

            {/* Integrated Progress Bar in Header */}
            <View style={styles.headerProgressWrapper}>
              <View style={styles.headerProgressTrack}>
                <LinearGradient
                  colors={(RANK_BIOMES[rankInfo?.rank?.name as keyof typeof RANK_BIOMES]?.progress as [string, string]) || ['#8A56FE', '#4ADE80']} 
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 0}}
                  style={[styles.headerProgressFill, { width: `${Math.round((rankInfo?.progressPercent ?? 0) * 100)}%` }]}
                />
              </View>
              <Text style={[styles.headerProgressText, { fontFamily: 'Gilroy-Black', fontSize: IS_SMALL_DEVICE ? 10 : 12 }]}>
                {Math.round((rankInfo?.progressPercent ?? 0) * 100)}%
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* 2. Central Arena Showcase */}
        <View style={[styles.heroSection, IS_SMALL_DEVICE && { maxHeight: 180 }]}>
          <View style={styles.arenaContainer}>
            {/* Energía del Pedestal (Anillos Mágicos de la App) */}
            <View style={styles.magicRingContainer}>
              <View style={[styles.magicRing, { borderColor: '#8A56FE' }]} />
              <View style={[styles.magicRingInner, { borderColor: '#4ADE80' }]} />
              <View style={[styles.energyGlow, { backgroundColor: '#8A56FE30' }]} />
              {/* Resplandor sutil del rango */}
              <View style={[styles.rankSpecificGlow, { backgroundColor: rankColor + '15' }]} />
            </View>
            
            <View style={styles.avatarWrapper}>
              <View style={styles.avatarContainer}>
                {userAvatar ? (
                  <LayeredAvatar avatar={userAvatar} size={IS_SMALL_DEVICE ? 140 : 220} />
                ) : (
                  <FontAwesome5 name="user-astronaut" size={IS_SMALL_DEVICE ? 50 : 90} color="rgba(255,255,255,0.2)" />
                )}
              </View>
            </View>
          </View>
        </View>

        {/* 3. Área de Acción Principal */}
        <View style={styles.actionArea}>
          <View ref={competitiveRef} onLayout={() => measure(competitiveRef, 'competitive', 30)}>
            <TouchableOpacity 
              style={styles.mainSearchButton}
              onPress={() => router.push('/(games)/matchmaking-screen')}
              activeOpacity={0.8}
            >
              <LinearGradient 
                colors={['#FF4B4B', '#991B1B']} 
                start={{x: 0, y: 0}} 
                end={{x: 1, y: 1}}
                style={styles.searchGradient}
              >
                <FontAwesome5 name="fire-alt" size={24} color="#fff" />
                <Text style={[styles.searchText, { fontFamily: 'Digitalt' }]}>BUSCAR PARTIDA</Text>
              </LinearGradient>
              <View style={styles.searchButtonGlow} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 4. Barra de Utilidades (Pie de página) */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.utilButton, { flex: 1.2 }]}
            onPress={() => startTutorial('1vs1')}
          >
            <LinearGradient colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.06)']} style={styles.utilGradient}>
              <FontAwesome5 name="info-circle" size={14} color="#fff" />
              <Text style={[styles.utilText, { fontFamily: 'Gilroy-Black' }]}>CÓMO JUGAR</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.utilButton, { flex: 1.6 }]}
            onPress={() => router.push('/(modals)/leaderboard')}
            ref={rankingRef}
            onLayout={() => measure(rankingRef, 'global_ranking', 25)}
          >
            <LinearGradient colors={['#FFD45E', '#B45309']} style={styles.utilGradient}>
              <FontAwesome5 name="trophy" size={14} color="#fff" />
              <Text style={[styles.utilText, { fontFamily: 'Gilroy-Black' }]}>RANKING GLOBAL</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.utilButton, { flex: 1 }]}
            onPress={() => router.push('/(modals)/how-to-play')}
            ref={howToPlayRef}
            onLayout={() => measure(howToPlayRef, 'how_to_play', 15)}
          >
            <LinearGradient colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.06)']} style={styles.utilGradient}>
              <FontAwesome5 name="book-open" size={14} color="#fff" />
              <Text style={[styles.utilText, { fontFamily: 'Gilroy-Black' }]}>REGLAS</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <TutorialOverlay />
      
      {newRankData && (
        <RankUpModal
          visible={showRankUp}
          rankName={newRankData.name}
          rankIcon={newRankData.icon}
          rankColor={newRankData.color}
          unlockedItemImage={unlockedFrameImage}
          onClose={() => {
            setShowRankUp(false);
            setUnlockedFrameImage(null);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradientBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: height,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: IS_SMALL_DEVICE ? 10 : 20,
  },
  viewHeader: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 5,
  },
  viewTitle: {
    color: '#fff',
    fontSize: 32,
    letterSpacing: 3,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 8,
  },
  dashboardHeader: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  leagueCard: {
    borderRadius: IS_SMALL_DEVICE ? 16 : 24,
    padding: IS_SMALL_DEVICE ? 10 : 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  leagueAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 6,
  },
  leagueMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  leagueBadgeContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  leagueIcon: {
    width: 45,
    height: 45,
  },
  leagueInfo: {
    flex: 1,
    gap: 2,
  },
  leagueName: {
    fontSize: IS_SMALL_DEVICE ? 14 : 24,
    letterSpacing: 1.5,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  pointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  leaguePoints: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    letterSpacing: 1,
  },
  headerProgressWrapper: {
    marginTop: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerProgressTrack: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  headerProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  headerProgressText: {
    color: '#fff',
    fontSize: 12,
    width: 35,
    textAlign: 'right',
  },
  heroSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
  },
  arenaContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    flex: 1,
  },
  magicRingContainer: {
    position: 'absolute',
    bottom: IS_SMALL_DEVICE ? 5 : 30,
    alignItems: 'center',
    justifyContent: 'center',
    width: IS_SMALL_DEVICE ? 200 : 280,
    height: IS_SMALL_DEVICE ? 60 : 100,
  },
  magicRing: {
    width: IS_SMALL_DEVICE ? 140 : 260,
    height: IS_SMALL_DEVICE ? 40 : 80,
    borderRadius: 130,
    borderWidth: IS_SMALL_DEVICE ? 2 : 3,
    transform: [{ scaleY: 0.35 }],
    position: 'absolute',
  },
  magicRingInner: {
    width: IS_SMALL_DEVICE ? 110 : 200,
    height: IS_SMALL_DEVICE ? 30 : 60,
    borderRadius: 100,
    borderWidth: 1.5,
    transform: [{ scaleY: 0.35 }],
    position: 'absolute',
  },
  energyGlow: {
    width: IS_SMALL_DEVICE ? 150 : 300,
    height: IS_SMALL_DEVICE ? 50 : 100,
    borderRadius: 150,
    filter: 'blur(20px)',
    transform: [{ scaleY: 0.35 }],
    position: 'absolute',
  },
  rankSpecificGlow: {
    width: IS_SMALL_DEVICE ? 200 : 350,
    height: IS_SMALL_DEVICE ? 70 : 120,
    borderRadius: 180,
    filter: 'blur(40px)',
    transform: [{ scaleY: 0.35 }],
    position: 'absolute',
    zIndex: -1,
  },
  avatarWrapper: {
    width: IS_SMALL_DEVICE ? 150 : 260,
    height: IS_SMALL_DEVICE ? 150 : 260,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  avatarContainer: {
    width: IS_SMALL_DEVICE ? 140 : 220,
    height: IS_SMALL_DEVICE ? 140 : 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarShadow: {
    position: 'absolute',
    width: 140,
    height: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 70,
    bottom: 20,
    transform: [{ scaleX: 1.2 }],
    filter: 'blur(15px)',
  },
  actionArea: {
    paddingHorizontal: 24,
    paddingBottom: 25,
  },
  mainSearchButton: {
    width: '100%',
    height: IS_SMALL_DEVICE ? 55 : 70,
    borderRadius: IS_SMALL_DEVICE ? 15 : 20,
    overflow: 'hidden',
    elevation: 20,
    shadowColor: '#FF4B4B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  searchGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: IS_SMALL_DEVICE ? 8 : 12,
  },
  searchText: {
    color: '#fff',
    fontSize: IS_SMALL_DEVICE ? 18 : 22,
    letterSpacing: 1.5,
  },
  searchButtonGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  bottomBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 10,
  },
  utilButton: {
    flex: 1,
    height: 50,
    borderRadius: 15,
    overflow: 'hidden',
  },
  utilGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 6,
  },
  utilText: {
    color: '#fff',
    fontSize: IS_SMALL_DEVICE ? 8 : 10,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});
