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
          
          {/* subtle Background Icon - Contained inside its half */}
          {iconUrl && (
            <View style={styles.bgIconContainer}>
               <Animated.Image 
                source={{ uri: iconUrl }}
                style={[
                  styles.bgRankIcon,
                  { 
                    transform: [
                      { rotate: rotation },
                      { scale: 1.05 }
                    ],
                    opacity: 0.12 
                  }
                ]}
                resizeMode="contain"
              />
            </View>
          )}

          <View style={styles.playerContent}>
            <View style={styles.mainRow}>
               <FadeInView delay={300} duration={600} from="none" style={styles.avatarWrapper}>
                  <View style={styles.avatarCircle}>
                    {player.avatarComponent}
                  </View>
                  <View style={styles.rankBadge}>
                    {iconUrl ? (
                      <Image 
                        source={{ uri: iconUrl }} 
                        style={styles.rankIconImage} 
                        resizeMode="contain"
                      />
                    ) : (
                      <Text style={[styles.rankBadgeText, { fontFamily: 'Digitalt' }]}>{rankName.substring(0, 1)}</Text>
                    )}
                  </View>
                </FadeInView>

                <FadeInView delay={500} duration={500} from={isTop ? 'top' : 'bottom'} style={styles.infoWrapper}>
                  <Text style={[styles.username, { fontFamily: 'Digitalt' }]} numberOfLines={1}>
                    {player.username.toUpperCase()}
                  </Text>
                  <Text style={[styles.rankName, { fontFamily: 'Digitalt' }]}>
                    {rankName}
                  </Text>
                  <View style={styles.pointsBadge}>
                    <Text style={[styles.pointsText, { fontFamily: 'Digitalt' }]}>{points} ELO</Text>
                  </View>
                </FadeInView>
            </View>
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
        <FadeInView delay={800} duration={400} from="none" scale={0.2}>
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
    position: 'relative',
  },
  gradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  bgIconContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden', // Extra layer of containment
    zIndex: 0,
  },
  bgRankIcon: {
    width: width * 0.7,
    height: width * 0.7,
  },

  playerContent: { width: '100%', paddingHorizontal: 30, zIndex: 1 },
  
  mainRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 25 },

  avatarWrapper: { position: 'relative' },
  avatarCircle: {
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.4)',
    overflow: 'hidden',
    elevation: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  rankBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FFF',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#000',
    elevation: 5,
  },
  rankIconImage: { width: 24, height: 24 },
  rankBadgeText: { fontSize: 18, color: '#000', fontWeight: '900' },

  infoWrapper: { flex: 1, alignItems: 'flex-start' },
  username: { color: '#FFF', fontSize: 24, fontWeight: '900', marginBottom: 2 },
  rankName: { color: 'rgba(255,255,255,0.8)', fontSize: 16, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase' },
  pointsBadge: {
    backgroundColor: '#FFD616',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  pointsText: { color: '#000', fontSize: 18, fontWeight: '900' },

  vsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  vsContainer: {
    padding: 5,
    backgroundColor: '#000',
    borderRadius: 50,
  },
  vsCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#FFF',
  },
  vsText: { color: '#000', fontSize: 42, fontWeight: '900' },

  matchTitleContainer: {
    position: 'absolute',
    top: 50,
    width: '100%',
    alignItems: 'center',
    zIndex: 10,
  },
  matchTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 2,
    opacity: 0.8,
  }
});
