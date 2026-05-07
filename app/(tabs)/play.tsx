import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesome5 } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, router } from 'expo-router';
import { Question } from 'phosphor-react-native';
import React, { useCallback, useMemo, useState, useRef } from 'react';
import { Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AnimatedMathBackground from '@/components/ui/AnimatedMathBackground';
import GameModeButton from '@/components/ui/GameModeButton';
import TutorialOverlay from '@/components/TutorialOverlay';
import { useAuth } from '@/contexts/AuthContext';
import { useAvatar } from '@/contexts/AvatarContext';
import { useFontContext } from '@/contexts/FontsContext';
import { useTutorial } from '@/contexts/TutorialContext';
import { getAllRanks, getUserRankInfo, UserRankInfo } from '@/services/SupabaseService';
import { RankUpModal } from '@/components/modals/RankUpModal';

const { height } = Dimensions.get('window');

export default function PlayScreen() {
  const { fontsLoaded } = useFontContext();
  const { setDynamicSpotlight } = useTutorial();

  const { avatar: userAvatar } = useAvatar();
  const { user } = useAuth();
  const [rankInfo, setRankInfo] = useState<UserRankInfo | null>(null);
  const [rankLoading, setRankLoading] = useState<boolean>(false);
  const [showRankUp, setShowRankUp] = useState(false);
  const [newRankData, setNewRankData] = useState<{ name: string; icon: string | null; color: string } | null>(null);

  const rankRef = useRef<View>(null);
  const competitiveRef = useRef<View>(null);
  const howToPlayRef = useRef<View>(null);
  const rankingRef = useRef<View>(null);

  const measure = (ref: React.RefObject<any>, id: string, radius: number) => {
    if (ref.current) {
      ref.current.measure((x, y, w, h, pageX, pageY) => {
        setDynamicSpotlight(id, { x: pageX, y: pageY, w, h, radius });
      });
    }
  };

  const refreshUserRank = useCallback(async () => {
    if (!user?.id) {
      setRankInfo(null);
      return;
    }
    setRankLoading(true);
    try {
      const remote = await getUserRankInfo(user.id);
      if (remote?.rank) {
        // Determinar si es una subida de rango (nuevo min_points > anterior min_points)
        const isRankUp = !rankInfo?.rank || remote.rank.min_points > rankInfo.rank.min_points;

        setRankInfo(remote);
        
        // Check if we should show rank up animation
        const seenRanksStr = await AsyncStorage.getItem('@mathquest_seen_ranks');
        const isFirstLoad = seenRanksStr === null;
        const seenRanks = seenRanksStr ? JSON.parse(seenRanksStr) : [];
        const rankId = remote.rank.id;
        const rankName = remote.rank.name.toLowerCase();
        
        // No mostrar animación para rangos de Bronce
        const isBronze = rankName.includes('bronce') || rankName.includes('bronze');
        
        if (!seenRanks.includes(rankId)) {
          // Guardar como visto inmediatamente
          const updatedSeen = [...seenRanks, rankId];
          await AsyncStorage.setItem('@mathquest_seen_ranks', JSON.stringify(updatedSeen));

          // Solo mostrar si:
          // 1. No es un rango de bronce
          // 2. No es la primerísima vez que entramos
          // 3. Es una SUBIDA de rango (no bajada)
          if (!isBronze && !isFirstLoad && isRankUp) {
            setNewRankData({
              name: remote.rank.name,
              icon: remote.rank.icon_url,
              color: remote.rank.color || '#A855F7'
            });
            setShowRankUp(true);
          }
        }
      }
    } catch (err) {
      console.error('Error in refreshUserRank:', err);
    } finally {
      setRankLoading(false);
    }
  }, [user?.id]);

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

  useFocusEffect(
    React.useCallback(() => {
      refreshUserRank();
      refreshRanks();
      // Esperamos 2000ms para que las animaciones de entrada terminen y el centrado sea real
      const timer = setTimeout(() => {
        measure(rankRef, 'my_rank', 25);
        measure(competitiveRef, 'competitive', 30);
        measure(howToPlayRef, 'how_to_play', 15);
        measure(rankingRef, 'global_ranking', 25);
      }, 2000);
      return () => clearTimeout(timer);
    }, [refreshUserRank, refreshRanks])
  );

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

        <View style={styles.titleWrap}>
          <Text style={[styles.title, { fontFamily: 'Digitalt' }]}>COMPETITIVO</Text>
        </View>

        <View style={styles.rankWrap} ref={rankRef} onLayout={() => measure(rankRef, 'my_rank', 25)}>
          <TouchableOpacity style={styles.rankBadge} activeOpacity={0.8} onPress={() => router.push('/(modals)/rank-modal')}>
            {rankInfo?.rank?.icon_url ? (
              <Image source={{ uri: rankInfo.rank.icon_url }} style={styles.rankIcon} resizeMode="contain" />
            ) : (
              <FontAwesome5 name="medal" size={22} color="#fff" />
            )}
            <Text style={[styles.rankName, { fontFamily: 'Digitalt' }]}>
              {rankLoading ? 'Cargando…' : (rankInfo?.rank?.name ?? 'Sin rango')}
            </Text>
            <Text style={[styles.rankPoints, { fontFamily: 'Gilroy-Black' }]}>
              {rankInfo?.points ?? 0} pts
            </Text>
          </TouchableOpacity>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.round((rankInfo?.progressPercent ?? 0) * 100)}%`, backgroundColor: rankColor },
              ]}
            />
          </View>
          <Text style={[styles.nextRankText, { fontFamily: 'Gilroy-Black' }]}>
            {rankLoading
              ? 'Calculando siguiente rango…'
              : rankInfo?.nextRank
                ? `Siguiente: ${rankInfo.nextRank.name} • Faltan ${rankInfo.pointsToNext} pts`
                : 'Rango máximo alcanzado'}
          </Text>
        </View>

        <View style={styles.buttonsWrap}>
          <View ref={competitiveRef} onLayout={() => measure(competitiveRef, 'competitive', 30)}>
            <GameModeButton
              name="COMPETITIVO!"
              route="/(games)/matchmaking-screen"
              gradientColors={["#FF6A6A", "#FF3D3D"]}
              imagePath={require('@/assets/images/competitive/1v1_roulette.png')}
              onPress={() => router.push('/(games)/matchmaking-screen')}
            />
          </View>
          
          <TouchableOpacity
            ref={howToPlayRef}
            onLayout={() => measure(howToPlayRef, 'how_to_play', 15)}
            activeOpacity={0.9}
            style={styles.howToPlayButton}
            onPress={() => router.push('/(modals)/how-to-play')}
          >
            <LinearGradient colors={['#6E72FC', '#AD1DEB']} style={styles.howToPlayGradient}>
              <Question size={18} color="#FFFFFF" weight="bold" />
              <Text style={[styles.howToPlayText, { fontFamily: 'Gilroy-Black' }]}>¿CÓMO JUGAR?</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <Link href="/(modals)/leaderboard" asChild>
        <TouchableOpacity
          ref={rankingRef}
          onLayout={() => measure(rankingRef, 'global_ranking', 25)}
          style={styles.fab}
        >
          <LinearGradient colors={["#FFD45E", "#FFA500"]} style={styles.fabGradient}>
            <FontAwesome5 name="trophy" size={18} color="#fff" />
            <Text style={styles.fabText}>Ranking</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Link>
      <TutorialOverlay />
      
      {newRankData && (
        <RankUpModal
          visible={showRankUp}
          rankName={newRankData.name}
          rankIcon={newRankData.icon}
          rankColor={newRankData.color}
          onClose={() => setShowRankUp(false)}
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
  },
  title: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  rankWrap: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 8,
    marginTop: height * 0.12,
  },
  rankBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rankName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
  },
  rankPoints: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
  },
  rankIcon: {
    width: 28,
    height: 28,
  },
  progressTrack: {
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },
  nextRankText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
  },
  titleWrap: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 12,
  },
  buttonsWrap: {
    flex: 1,
    paddingHorizontal: 20,
    gap: 22,
    justifyContent: 'center',
  },
  howToPlayButton: {
    height: 48,
    borderRadius: 16,
    overflow: 'hidden',
  },
  howToPlayGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  howToPlayText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    width: 120,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    elevation: 8,
  },
  fabGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  fabText: {
    color: '#fff',
    fontWeight: '700',
  },
});
