import { FadeInView } from '@/components/shared/FadeInView';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, Text, View, Image, Easing } from 'react-native';
import { UserRankInfo } from '@/services/SupabaseService';

const { width, height } = Dimensions.get('window');

type Face = { 
  username: string; 
  avatarComponent: React.ReactNode;
  rankInfo?: UserRankInfo | null;
};

type Props = {
  me: Face;
  opponent: Face;
  isExiting?: boolean;
  onExitComplete?: () => void;
};

const getRankTheme = (rankName?: string, rankColor?: string | null) => {
  const name = rankName?.toUpperCase() || '';
  if (rankColor) return [rankColor, darkenColor(rankColor, 0.4)];

  if (name.includes('BRONCE')) return ['#CD7F32', '#8B4513'];
  if (name.includes('PLATA')) return ['#C0C0C0', '#708090'];
  if (name.includes('ORO')) return ['#FFD700', '#B8860B'];
  if (name.includes('PLATINO')) return ['#E5E4E2', '#A9A9A9'];
  if (name.includes('DIAMANTE')) return ['#B9F2FF', '#00BFFF'];
  if (name.includes('MAESTRO')) return ['#FF00FF', '#4B0082'];
  
  return ['#94A3B8', '#475569']; // Default Slate
};

const darkenColor = (hex: string, amount: number) => {
  return hex; // Helper fallback
};

export default function MatchFoundView({ me, opponent, isExiting = false, onExitComplete }: Props) {
  const fade = useRef(new Animated.Value(1)).current;
  const slideMe = useRef(new Animated.Value(-height / 2)).current;
  const slideOpponent = useRef(new Animated.Value(height / 2)).current;
  
  // Swing background animation
  const swingAnim = useRef(new Animated.Value(0)).current;

  const meTheme = getRankTheme(me.rankInfo?.rank?.name, me.rankInfo?.rank?.color);
  const oppTheme = getRankTheme(opponent.rankInfo?.rank?.name, opponent.rankInfo?.rank?.color);

  useEffect(() => {
    // Continuous swing (yo-yo)
    Animated.loop(
      Animated.sequence([
        Animated.timing(swingAnim, {
          toValue: 1,
          duration: 4000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(swingAnim, {
          toValue: 0,
          duration: 4000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        })
      ])
    ).start();

    if (isExiting) {
      Animated.timing(fade, { toValue: 0, duration: 600, useNativeDriver: true }).start(({ finished }) => {
        if (finished) onExitComplete?.();
      });
    } else {
      fade.setValue(1);
      Animated.parallel([
        Animated.spring(slideMe, { toValue: 0, tension: 15, friction: 8, useNativeDriver: true }),
        Animated.spring(slideOpponent, { toValue: 0, tension: 15, friction: 8, useNativeDriver: true }),
      ]).start();
    }
  }, [isExiting]);

  const rotation = swingAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-8deg', '8deg'],
  });

  const renderPlayerSide = (player: Face, theme: string[], isTop: boolean) => {
    const slide = isTop ? slideMe : slideOpponent;
    const rankName = player.rankInfo?.rank?.name || 'NOVATO';
    const points = player.rankInfo?.points || 0;
    const iconUrl = player.rankInfo?.rank?.icon_url;

    return (
      <Animated.View style={[styles.sideContainer, { transform: [{ translateY: slide }] }]}>
        <LinearGradient colors={theme as any} style={styles.gradient} start={{x: 0, y: 0}} end={{x: 1, y: 1}}>
          
          {/* subtle Background Icon */}
          {iconUrl && (
            <View style={styles.bgIconContainer}>
               <Animated.Image 
                source={{ uri: iconUrl }}
                style={[
                  styles.bgRankIcon,
                  { 
                    transform: [{ rotate: rotation }, { scale: 1.2 }],
                    opacity: 0.08 
                  }
                ]}
                resizeMode="contain"
              />
            </View>
          )}

          <View style={styles.playerContent}>
            <FadeInView delay={isTop ? 200 : 400} duration={600} from={isTop ? 'left' : 'right'} style={styles.playerInfoRow}>
              <View style={styles.avatarContainer}>
                <View style={styles.avatarMainCircle}>
                  {player.avatarComponent}
                </View>
                {iconUrl && (
                  <View style={styles.miniRankBadge}>
                    <Image source={{ uri: iconUrl }} style={styles.miniRankIcon} />
                  </View>
                )}
              </View>

              <View style={styles.statsColumn}>
                <Text style={[styles.usernameText, { fontFamily: 'Digitalt' }]} numberOfLines={1}>
                  {player.username.toUpperCase()}
                </Text>
                <View style={styles.rankRow}>
                  <Text style={[styles.rankNameText, { fontFamily: 'Digitalt' }]}>{rankName}</Text>
                  <View style={styles.eloPill}>
                    <Text style={[styles.eloText, { fontFamily: 'Digitalt' }]}>{points} PTS</Text>
                  </View>
                </View>
              </View>
            </FadeInView>
          </View>
        </LinearGradient>
      </Animated.View>
    );
  };

  return (
    <Animated.View style={[styles.container, { opacity: fade }]}>
      <View style={styles.splitWrapper}>
        {renderPlayerSide(me, meTheme, true)}
        {renderPlayerSide(opponent, oppTheme, false)}
      </View>

      <View style={styles.vsOverlay}>
        <FadeInView delay={800} duration={400} from="none">
          <View style={styles.vsContainer}>
             <LinearGradient colors={['#FFD616', '#F59E0B']} style={styles.vsCircle}>
                <Text style={[styles.vsText, { fontFamily: 'Digitalt' }]}>VS</Text>
             </LinearGradient>
          </View>
        </FadeInView>
      </View>

      <View style={styles.matchTitleContainer}>
         <FadeInView delay={100} duration={500} from="top">
            <Text style={[styles.matchTitle, { fontFamily: 'Digitalt' }]}>MATCH FOUND</Text>
         </FadeInView>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  splitWrapper: { flex: 1, flexDirection: 'column' },
  sideContainer: { 
    flex: 1, 
    width: '100%', 
    overflow: 'hidden',
  },
  gradient: { flex: 1, justifyContent: 'center' },
  bgIconContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bgRankIcon: { width: width * 0.9, height: width * 0.9 },
  playerContent: { paddingHorizontal: 20 },
  playerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 15,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  avatarContainer: {
    width: 120,
    height: 120,
    position: 'relative',
  },
  avatarMainCircle: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniRankBadge: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    backgroundColor: '#000',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFD616',
  },
  miniRankIcon: { width: 28, height: 28 },
  statsColumn: { flex: 1, gap: 4 },
  usernameText: { color: '#FFF', fontSize: 24, fontWeight: '900', letterSpacing: 1 },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rankNameText: { color: 'rgba(255,255,255,0.7)', fontSize: 14, letterSpacing: 1 },
  eloPill: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 10,
  },
  eloText: { color: '#FFD616', fontSize: 12 },

  vsOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  vsContainer: {
    transform: [{ rotate: '-10deg' }],
  },
  vsCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 6,
    borderColor: '#FFF',
    shadowColor: '#FFD616',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 20,
  },
  vsText: { color: '#000', fontSize: 48, fontWeight: '900' },
  matchTitleContainer: {
    position: 'absolute',
    top: 50,
    width: '100%',
    alignItems: 'center',
    zIndex: 200,
  },
  matchTitle: {
    color: '#FFD616',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 4,
    textShadowColor: '#000',
    textShadowRadius: 10,
  }
});
