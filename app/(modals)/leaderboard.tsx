import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LayeredAvatar } from '@/components/LayeredAvatar';
import { FadeInView } from '@/components/shared/FadeInView';
import { defaultAvatar } from '@/constants/avatarAssets';
import { useAuth } from '@/contexts/AuthContext';
import { getLeaderboard, LeaderboardEntry } from '@/services/SupabaseService';

const { width, height } = Dimensions.get('window');

export default function LeaderboardModal() {
  const { user } = useAuth();
  const [loading, setLoading] = useState<boolean>(false);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

  const currentUserId = user?.id ?? null;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await getLeaderboard(100);
      setEntries(data);
      setLoading(false);
    };
    load();
  }, []);

  const topThree = useMemo(() => entries.slice(0, 3), [entries]);
  const others = useMemo(() => entries.slice(3), [entries]);

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={["#9C58FE", "#6F52FD"]} style={StyleSheet.absoluteFill} />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
              <FontAwesome5 name="arrow-left" size={20} color="#fff" />
            </TouchableOpacity>
            <Text style={[styles.title, { fontFamily: 'Digitalt' }]}>CLASIFICACIÓN</Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={styles.loadingCenter}>
            <ActivityIndicator size="large" color="#FFD616" />
            <Text style={[styles.loadingTitle, { fontFamily: 'Gilroy-Bold' }]}>Cargando Leyendas...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#9C58FE", "#6F52FD"]} style={StyleSheet.absoluteFill} />
      
      {/* Decorative background shapes */}
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />

      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <FontAwesome5 name="times" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={[styles.title, { fontFamily: 'Digitalt' }]}>CLASIFICACIÓN</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollInner}
          showsVerticalScrollIndicator={false}
        >
          {/* Podium Section */}
          <View style={styles.podiumSection}>
             <View style={styles.podiumContainer}>
                {/* 2nd Place */}
                <FadeInView from="bottom" delay={200} distance={40} style={styles.podiumSpotContainer}>
                  <PodiumSpot
                    place={2}
                    entry={topThree[1]}
                    highlight={topThree[1]?.id === currentUserId}
                  />
                </FadeInView>

                {/* 1st Place */}
                <FadeInView from="bottom" delay={100} distance={50} style={styles.podiumSpotContainer}>
                  <PodiumSpot
                    place={1}
                    entry={topThree[0]}
                    highlight={topThree[0]?.id === currentUserId}
                  />
                </FadeInView>

                {/* 3rd Place */}
                <FadeInView from="bottom" delay={300} distance={40} style={styles.podiumSpotContainer}>
                  <PodiumSpot
                    place={3}
                    entry={topThree[2]}
                    highlight={topThree[2]?.id === currentUserId}
                  />
                </FadeInView>
             </View>
          </View>

          {/* List Section */}
          <View style={styles.listContainer}>
            <LinearGradient 
              colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']} 
              style={styles.listBackground}
            >
              {others.map((e, idx) => {
                const rank = idx + 4;
                const isCurrent = e.id === currentUserId;
                return (
                  <FadeInView key={e.id} from="bottom" delay={400 + idx * 30} distance={10}>
                    <View style={[styles.cardRow, isCurrent && styles.cardRowCurrent]}>
                      <View style={styles.rankNumberContainer}>
                        <Text style={[styles.rankNumberText, { fontFamily: 'Gilroy-Black' }]}>{rank}</Text>
                      </View>
                      
                      <View style={styles.cardAvatarContainer}>
                        <View style={styles.avatarMiniBg}>
                          <LayeredAvatar avatar={e.avatar || defaultAvatar} size={42} />
                        </View>
                      </View>

                      <View style={styles.cardInfo}>
                        <Text style={[styles.usernameText, { fontFamily: 'Gilroy-Bold' }]} numberOfLines={1}>
                          {e.username}
                        </Text>
                        <View style={styles.pointsPill}>
                           <FontAwesome5 name="star" size={10} color="#FFD616" solid />
                           <Text style={[styles.pointsValueText, { fontFamily: 'Gilroy-SemiBold' }]}>{e.points}</Text>
                        </View>
                      </View>

                      {isCurrent && (
                        <View style={styles.meBadge}>
                          <Text style={[styles.meBadgeText, { fontFamily: 'Gilroy-Black' }]}>TÚ</Text>
                        </View>
                      )}
                    </View>
                    {idx < others.length - 1 && <View style={styles.separator} />}
                  </FadeInView>
                );
              })}

              {!loading && entries.length === 0 && (
                <View style={styles.emptyContainer}>
                  <FontAwesome5 name="users-slash" size={40} color="rgba(255,255,255,0.3)" />
                  <Text style={[styles.emptyText, { fontFamily: 'Gilroy-Medium' }]}>No hay leyendas todavía...</Text>
                </View>
              )}
            </LinearGradient>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

type PodiumSpotProps = {
  place: 1 | 2 | 3;
  entry?: LeaderboardEntry;
  highlight?: boolean;
};

function PodiumSpot({ place, entry, highlight }: PodiumSpotProps) {
  const isFirst = place === 1;
  const avatarSize = isFirst ? 90 : 70;
  
  const placeColors = {
    1: ['#FFD700', '#F59E0B'], // Gold
    2: ['#E2E8F0', '#94A3B8'], // Silver
    3: ['#D97706', '#92400E'], // Bronze
  };

  const trophyColor = isFirst ? '#FFD616' : (place === 2 ? '#E2E8F0' : '#CD7F32');

  return (
    <View style={[styles.spotContainer, isFirst && styles.spotContainerFirst]}>
      <View style={styles.avatarPodiumWrap}>
        <View style={[
          styles.podiumAvatarCircle, 
          { width: avatarSize + 8, height: avatarSize + 8, borderRadius: (avatarSize + 8) / 2 },
          highlight && { borderColor: '#FFD616', borderWidth: 3 }
        ]}>
          <LayeredAvatar avatar={entry?.avatar || defaultAvatar} size={avatarSize} />
        </View>
        <View style={[styles.placeBadge, { backgroundColor: placeColors[place][0] }]}>
           <Text style={[styles.placeBadgeText, { fontFamily: 'Gilroy-Black' }]}>{place}</Text>
        </View>
      </View>
      
      <Text style={[styles.podiumUsername, { fontFamily: 'Gilroy-Black' }, highlight && { color: '#FFD616' }]} numberOfLines={1}>
        {entry?.username || '---'}
      </Text>
      
      <View style={styles.podiumScorePill}>
        <Text style={[styles.podiumScoreText, { fontFamily: 'Digitalt' }]}>{entry?.points || 0}</Text>
      </View>

      <LinearGradient 
        colors={placeColors[place] as any} 
        style={[styles.podiumBlock, { height: isFirst ? 100 : (place === 2 ? 70 : 50) }]}
      >
        <FontAwesome5 name="trophy" size={isFirst ? 24 : 16} color="rgba(255,255,255,0.5)" />
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#6F52FD',
  },
  bgCircle1: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  bgCircle2: {
    position: 'absolute',
    bottom: -50,
    left: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 22,
    letterSpacing: 1,
  },
  scrollInner: {
    paddingBottom: 40,
  },
  podiumSection: {
    paddingTop: 20,
    paddingBottom: 30,
    alignItems: 'center',
  },
  podiumContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    width: width,
    paddingHorizontal: 10,
  },
  podiumSpotContainer: {
    flex: 1,
    alignItems: 'center',
  },
  spotContainer: {
    alignItems: 'center',
    width: '100%',
  },
  spotContainerFirst: {
    zIndex: 10,
    transform: [{ scale: 1.1 }, { translateY: -10 }],
  },
  avatarPodiumWrap: {
    position: 'relative',
    marginBottom: 8,
  },
  podiumAvatarCircle: {
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 10,
  },
  placeBadge: {
    position: 'absolute',
    bottom: -5,
    alignSelf: 'center',
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  placeBadgeText: {
    color: '#fff',
    fontSize: 14,
  },
  podiumUsername: {
    color: '#fff',
    fontSize: 13,
    marginBottom: 4,
    textAlign: 'center',
  },
  podiumScorePill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 10,
    marginBottom: 10,
  },
  podiumScoreText: {
    color: '#FFD616',
    fontSize: 16,
  },
  podiumBlock: {
    width: '80%',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    alignItems: 'center',
    paddingTop: 10,
  },
  listContainer: {
    paddingHorizontal: 20,
  },
  listBackground: {
    borderRadius: 30,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  cardRowCurrent: {
    backgroundColor: 'rgba(255,214,22,0.15)',
    borderRadius: 20,
  },
  rankNumberContainer: {
    width: 35,
    alignItems: 'center',
  },
  rankNumberText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
  },
  cardAvatarContainer: {
    marginRight: 15,
  },
  avatarMiniBg: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  usernameText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 2,
  },
  pointsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pointsValueText: {
    color: '#FFD616',
    fontSize: 14,
  },
  meBadge: {
    backgroundColor: '#FFD616',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  meBadgeText: {
    color: '#000',
    fontSize: 10,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginHorizontal: 10,
  },
  loadingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  loadingTitle: {
    color: '#fff',
    fontSize: 18,
    opacity: 0.8,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 15,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 16,
  }
});


