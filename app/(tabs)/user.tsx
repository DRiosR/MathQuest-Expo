import * as Haptics from 'expo-haptics';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  CalendarBlankIcon,
  CaretLeftIcon,
  CaretRightIcon,
  GameControllerIcon,
  GearSixIcon,
  PencilSimpleIcon,
  PercentIcon,
  SignOutIcon,
} from 'phosphor-react-native';
import React from 'react';
import { ActivityIndicator, Alert, Dimensions, FlatList, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { LayeredAvatar } from '@/components/LayeredAvatar';
import { useAuth } from '@/contexts/AuthContext';
import { useAvatar } from '@/contexts/AvatarContext';
import { useFontContext } from '@/contexts/FontsContext';
// stats are fetched via service
import { FadeInView } from '@/components/shared/FadeInView';
import { getUserMatchesDetailed, getUserStats, UserMatchItem, getStreakWarning, getUserActivityDates } from '@/services/SupabaseService';
import AuthService from '@/Core/Services/AuthService/AuthService';
import { AuthButton } from '@/components/ui/AuthButton';
import { AuthInput } from '@/components/ui/AuthInput';
import TutorialOverlay from '@/components/TutorialOverlay';
import { useTutorial, TUTORIAL_STEPS } from '@/contexts/TutorialContext';
import { useFocusEffect } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');
const isSmallScreen = height < 750;



export default function UserScreen() {
  const { fontsLoaded } = useFontContext();

  const { avatar: userAvatar } = useAvatar();
  const { user, signOut, refreshSession } = useAuth();
  const { setDynamicSpotlight, startTutorial } = useTutorial();

  const settingsRef = React.useRef<View>(null);
  const avatarRef = React.useRef<View>(null);
  const streakRef = React.useRef<View>(null);
  const matchesRef = React.useRef<View>(null);
  const scrollRef = React.useRef<ScrollView>(null);

  const measureUser = (ref: React.RefObject<any>, id: string, radius: number) => {
    if (ref.current) {
      // Use measureInWindow for more reliable absolute coordinates
      ref.current.measureInWindow((x: number, y: number, w: number, h: number) => {
        if (w > 0 && h > 0) {
          setDynamicSpotlight(id, { x, y, w, h, radius });
        } else {
          // Retry once if measurement failed
          setTimeout(() => {
            ref.current?.measureInWindow((rx: number, ry: number, rw: number, rh: number) => {
              if (rw > 0) setDynamicSpotlight(id, { x: rx, y: ry, w: rw, h: rh, radius });
            });
          }, 100);
        }
      });
    }
  };

  const loadStats = React.useCallback(async () => {
    if (!user?.id) return;
    const stats = await getUserStats(user.id);
    if (!stats) return;
    setGamesPlayed(stats.totalMatches);
    const winRateVal = stats.totalMatches > 0 ? (stats.wins / stats.totalMatches) * 100 : 0;
    setWinRate(Math.round(winRateVal));
    setGlobalRank(stats.globalRank);
    setGlobalPoints(stats.globalPoints);
      // Determine streak state
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const lastDateStr = stats.lastStreakDate;
      const count = stats.streakCount;
      
      let state: 'active' | 'pending' | 'warning' | 'expired' = 'expired';
      
      if (count > 0 && lastDateStr) {
        const lastDate = new Date(lastDateStr);
        const diffSeconds = (today.getTime() - lastDate.getTime()) / 1000;
        
        if (diffSeconds < 75600) { // First 21 hours
          state = 'active';
        } else if (diffSeconds <= 86400) { // Last 3 hours
          state = 'warning';
        } else {
          state = 'expired';
        }
      } else {
        state = 'expired';
      }
      
      setStreakState(state);
      setStreakCount(state === 'expired' ? 0 : count);
      setRecentMatch(stats.recentMatch as unknown as UserMatchItem);
  }, [user?.id]);


  useFocusEffect(
    React.useCallback(() => {
      loadStats();
      // Measurements are now handled dynamically by the tutorial effect
    }, [loadStats])
  );
  const [gamesPlayed, setGamesPlayed] = React.useState(0);
  const [winRate, setWinRate] = React.useState(0);
  const [streakCount, setStreakCount] = React.useState(0);
  const [globalRank, setGlobalRank] = React.useState(0);
  const [globalPoints, setGlobalPoints] = React.useState(0);
  const [streakState, setStreakState] = React.useState<'active' | 'pending' | 'warning' | 'expired'>('expired');
  const [recentMatch, setRecentMatch] = React.useState<UserMatchItem | null>(null);
  const [isRecentOpen, setIsRecentOpen] = React.useState(false);
  const [recentMatches, setRecentMatches] = React.useState<UserMatchItem[]>([]);
  const [isLogoutModalVisible, setIsLogoutModalVisible] = React.useState(false);
  const [isRecentReady, setIsRecentReady] = React.useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const [settingsTab, setSettingsTab] = React.useState<'username' | 'password'>('username');
  const [newUsername, setNewUsername] = React.useState('');
  const [usernameError, setUsernameError] = React.useState<string | null>(null);
  const [isSavingUsername, setIsSavingUsername] = React.useState(false);
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [passwordError, setPasswordError] = React.useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = React.useState(false);
  const [isEditingUsername, setIsEditingUsername] = React.useState(false);
  const [isStreakCalendarOpen, setIsStreakCalendarOpen] = React.useState(false);
  const [activityDates, setActivityDates] = React.useState<string[]>([]);
  const [currentCalendarDate, setCurrentCalendarDate] = React.useState(new Date());
  const insets = useSafeAreaInsets();

  const formatDateShort = (iso: string | null): string => {
    if (!iso) return '';
    const d = new Date(iso);
    const day = d.getDate();
    const month = d.toLocaleString('es-ES', { month: 'short' }).toUpperCase();
    return `${day} ${month}`;
  };

  React.useEffect(() => {
    const loadMatches = async () => {
      if (!user?.id) return;
      try {
        const matches = await getUserMatchesDetailed(user.id);
        setRecentMatches(matches as unknown as UserMatchItem[]);
      } catch (e) {
        console.error("Error loading matches:", e);
      } finally {
        setIsRecentReady(true);
      }
    };
    loadMatches();
  }, [user?.id]);

  const { isVisible: isTutorialVisible, currentStepIndex } = useTutorial();

  React.useEffect(() => {
    if (isTutorialVisible) {
      const step = TUTORIAL_STEPS[currentStepIndex];
      let scrollTargetY = -1;

      if (step?.id === 'profile_streak') {
        scrollTargetY = 150;
        scrollRef.current?.scrollTo({ y: 150, animated: true });
      } else if (step?.id === 'profile_matches') {
        scrollRef.current?.scrollToEnd({ animated: true });
        scrollTargetY = 9999; // Represents end
      } else if (step?.id === 'profile_avatar' || step?.id === 'profile_settings') {
        scrollRef.current?.scrollTo({ y: 0, animated: true });
        scrollTargetY = 0;
      }

      // Wait for scroll animation to settle
      const timer = setTimeout(() => {
        if (step?.id === 'profile_settings') measureUser(settingsRef, 'profile_settings', 25);
        if (step?.id === 'profile_avatar') measureUser(avatarRef, 'profile_avatar', 65);
        if (step?.id === 'profile_streak') measureUser(streakRef, 'profile_streak', 28);
        if (step?.id === 'profile_matches') measureUser(matchesRef, 'profile_matches', 20);
      }, 600); // Slightly longer to ensure scroll is done

      return () => clearTimeout(timer);
    }
  }, [currentStepIndex, isTutorialVisible]);

  React.useEffect(() => {
    let cancelled = false;
    const loadAllMatches = async () => {
      if (!isRecentOpen || !user?.id) return;
      setIsRecentReady(false);
      const all = await getUserMatchesDetailed(user.id, { status: 'finished', limit: 100 });
      if (cancelled) return;
      setRecentMatches(all);
      setIsRecentReady(true);
    };
    loadAllMatches();
    return () => {
      cancelled = true;
    };
  }, [isRecentOpen, user?.id]);

  React.useEffect(() => {
    const loadLatest = async () => {
      if (!user?.id) return;
      const latest = await getUserMatchesDetailed(user.id, { status: 'finished', limit: 1 });
      setRecentMatch(latest[0] ?? null);
    };
    loadLatest();
  }, [user?.id]);

  React.useEffect(() => {
    if (isSettingsOpen) {
      setNewUsername(user?.username ?? '');
      setUsernameError(null);
      setPasswordError(null);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSettingsTab('username');
    }
  }, [isSettingsOpen, user?.username]);

  const handleOpenSettings = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSettingsOpen(true);
  };

  const handleOpenStreakCalendar = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (user?.id) {
      const dates = await getUserActivityDates(user.id);
      setActivityDates(dates);
      setCurrentCalendarDate(new Date());
      setIsStreakCalendarOpen(true);
    }
  };

  const handleSaveUsername = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const candidate = (newUsername || '').trim();
    if (candidate.length < 3 || candidate.length > 20) {
      setUsernameError('El usuario debe tener entre 3 y 20 caracteres.');
      return;
    }
    if (!/^[a-zA-Z0-9_\.]+$/.test(candidate)) {
      setUsernameError('Solo letras, números, guión bajo o punto.');
      return;
    }
    const translateError = (msg: string) => {
      const lowMsg = (msg || '').toLowerCase();
      if (lowMsg.includes('different') && (lowMsg.includes('old') || lowMsg.includes('previous'))) {
        return 'La nueva contraseña debe ser diferente a la anterior.';
      }
      if (lowMsg.includes('6 characters') || lowMsg.includes('8 characters')) {
        return 'La contraseña debe tener al menos 8 caracteres.';
      }
      if (lowMsg.includes('credentials') || lowMsg.includes('invalid password')) {
        return 'La contraseña actual es incorrecta.';
      }
      return 'No se pudo actualizar el perfil. Intenta de nuevo.';
    };

    Alert.alert(
      'Confirmar Cambio',
      `¿Estás seguro de que quieres cambiar tu nombre de usuario a @${candidate}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Confirmar', 
          onPress: async () => {
            setIsSavingUsername(true);
            try {
              const supabase = AuthService.getClient();
              const { data: authData, error: authUserError } = await supabase.auth.getUser();
              if (authUserError || !authData?.user?.id) {
                throw new Error('No hay usuario autenticado.');
              }
              const userId = authData.user.id;
              const { error: profileErr } = await supabase
                .from('profiles')
                .update({ username: candidate, updated_at: new Date().toISOString() })
                .eq('id', userId);
              if (profileErr) {
                if ((profileErr as any)?.code === '23505') {
                  setUsernameError('Nombre de usuario no disponible.');
                  return;
                }
                throw profileErr;
              }
              const { error: authUpdateErr } = await supabase.auth.updateUser({
                data: { username: candidate },
              });
              if (authUpdateErr) {
                throw authUpdateErr;
              }
              await refreshSession();
              Alert.alert('¡Listo!', 'Tu nombre de usuario ha sido actualizado correctamente.');
              setIsEditingUsername(false);
              setIsSettingsOpen(false);
            } catch (e: any) {
              const spanishError = translateError(e?.message || '');
              setUsernameError(spanishError);
              Alert.alert('Error', spanishError);
            } finally {
              setIsSavingUsername(false);
            }
          }
        }
      ]
    );
  };

  const handleChangePassword = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPasswordError(null);
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Completa todos los campos.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Las contraseñas no coinciden.');
      return;
    }
    const translateError = (msg: string) => {
      const lowMsg = (msg || '').toLowerCase();
      if (lowMsg.includes('different') && (lowMsg.includes('old') || lowMsg.includes('previous'))) {
        return 'La nueva contraseña debe ser diferente a la anterior.';
      }
      if (lowMsg.includes('6 characters') || lowMsg.includes('8 characters')) {
        return 'La contraseña debe tener al menos 8 caracteres.';
      }
      if (lowMsg.includes('credentials') || lowMsg.includes('invalid password')) {
        return 'La contraseña actual es incorrecta.';
      }
      return 'No se pudo actualizar la contraseña. Intenta de nuevo.';
    };

    Alert.alert(
      'Confirmar Cambio',
      '¿Estás seguro de que quieres actualizar tu contraseña?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Actualizar',
          onPress: async () => {
            setIsChangingPassword(true);
            try {
              if (!user?.email) throw new Error('No hay email de usuario.');
              const reauth = await AuthService.signIn({ email: user.email, password: currentPassword });
              if (reauth.error) {
                setPasswordError('La contraseña actual es incorrecta.');
                return;
              }
              const supabase = AuthService.getClient();
              const { error: pwErr } = await supabase.auth.updateUser({ password: newPassword });
              if (pwErr) {
                throw pwErr;
              }
              Alert.alert('¡Listo!', 'Tu contraseña ha sido actualizada correctamente.');
              setIsSettingsOpen(false);
            } catch (e: any) {
              const spanishError = translateError(e?.message || '');
              setPasswordError(spanishError);
              Alert.alert('Error', spanishError);
            } finally {
              setIsChangingPassword(false);
            }
          }
        }
      ]
    );
  };

  const handleCustomizeAvatar = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/(modals)/avatar-customization-screen');
  };

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLogoutModalVisible(true);
  };

  const confirmLogout = async () => {
    try {
      await signOut();
      setIsLogoutModalVisible(false);
      router.replace('/login' as any);
    } catch (error) {
      Alert.alert('Error', 'No se pudo cerrar la sesión');
    }
  };

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
        colors={['#A855F7', '#8A56FE']}
        style={styles.gradientBackground}
      />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView 
          ref={scrollRef}
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <FadeInView from="top" delay={0}>
            <View style={styles.header}>
              <Text style={[styles.title, { fontFamily: 'Digitalt' }]}>PERFIL</Text>
              <TouchableOpacity 
                ref={settingsRef}
                onLayout={() => measureUser(settingsRef, 'profile_settings', 25)}
                style={styles.headerAction} 
                activeOpacity={0.8} 
                onPress={handleOpenSettings}
              >
                <GearSixIcon size={20} color="#fff" weight="fill" />
              </TouchableOpacity>
            </View>
          </FadeInView>

          {/* User Profile Section */}
          <FadeInView from="top" delay={100}>
          <View style={styles.profileSection}>
            <View style={styles.avatarContainer}>
              <TouchableOpacity 
                ref={avatarRef}
                onLayout={() => measureUser(avatarRef, 'profile_avatar', 60)}
                onPress={handleCustomizeAvatar}
                activeOpacity={0.8}
                style={styles.avatarContainer}
              >
                <View style={styles.avatarCircle}>
                  <LayeredAvatar 
                    avatar={userAvatar}
                    size={isSmallScreen ? 100 : 130}
                    style={styles.layeredAvatar}
                  />
                </View>
                <View style={styles.customizeOverlay}>
                  <PencilSimpleIcon size={16} color="#fff" weight="bold" />
                </View>
              </TouchableOpacity>
            </View>
            
            <Text style={[styles.userName, { fontFamily: 'Digitalt' }]}>
              @{user?.username}
            </Text>
            <Text style={[styles.userEmail, { fontFamily: 'Gilroy-Black' }]}>
              {user?.email}
            </Text>
          </View>
          </FadeInView>
          {/* Streak Section */}
          <FadeInView from="top" delay={150}>
            <TouchableOpacity 
              style={styles.streakContainer} 
              activeOpacity={0.8}
              onPress={handleOpenStreakCalendar}
            >
              <View
                ref={streakRef}
                onLayout={() => measureUser(streakRef, 'profile_streak', 24)}
              >
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.05)']}
                  style={styles.streakCard}
                >
                <View style={styles.streakMain}>
                  <View style={[
                    styles.streakIconCircle,
                    streakState === 'active' && { backgroundColor: 'rgba(255, 149, 0, 0.2)', borderColor: 'rgba(255, 149, 0, 0.3)' },
                    streakState === 'warning' && { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.3)' }
                  ]}>
                    <FontAwesome5 
                      name="fire" 
                      size={24} 
                      color={
                        streakState === 'active' ? "#FF9500" : 
                        streakState === 'warning' ? "#EF4444" : 
                        streakState === 'pending' ? "#FFB347" : "#9ca3af"
                      } 
                      solid={streakState === 'active' || streakState === 'warning'} 
                    />
                  </View>
                  <View style={{ flex: 1, flexShrink: 1 }}>
                    <Text style={[
                      styles.streakCountText, 
                      { fontFamily: 'Digitalt' },
                      streakState === 'active' && { color: '#FFD616' },
                      streakState === 'expired' && { color: '#9ca3af' },
                      streakState === 'pending' && { color: 'rgba(255, 214, 22, 0.7)' },
                      streakState === 'warning' && { color: '#EF4444' }
                    ]}>
                      {streakCount} {streakCount === 1 ? 'DÍA' : 'DÍAS'}
                    </Text>
                    <Text style={[styles.streakLabelText, { fontFamily: 'Gilroy-Black' }]}>
                      RACHA ACTUAL
                    </Text>
                  </View>
                  
                  {streakState === 'warning' && (
                    <View style={styles.streakWarningTag}>
                      <Text style={[styles.streakWarningText, { fontFamily: 'Digitalt' }]}>
                        ¡EXPIRA PRONTO!
                      </Text>
                    </View>
                  )}
                  
                  <CaretRightIcon size={20} color="rgba(255,255,255,0.5)" weight="bold" />
                </View>
                </LinearGradient>
              </View>
            </TouchableOpacity>
          </FadeInView>

          {/* Stats Section */}
          <FadeInView from="bottom" delay={200}>
          <View style={styles.statsSection}>
            <Text style={[styles.sectionTitle, { fontFamily: 'Gilroy-Black' }]}>RESUMEN</Text>
            
            <View style={styles.statsGrid}>
              <FadeInView from="bottom" delay={250} style={styles.statCard}>
                <View style={[styles.statIconContainer, { backgroundColor: 'rgba(129, 140, 248, 0.15)' }]}>
                  <GameControllerIcon size={20} color="#818CF8" weight="fill" />
                </View>
                <Text style={[styles.statNumber, { fontFamily: 'Digitalt' }]}>
                  {gamesPlayed}
                </Text>
                <Text style={[styles.statLabel, { fontFamily: 'Gilroy-Black' }]}>
                  Partidas Jugadas
                </Text>
              </FadeInView>
              
              <FadeInView from="bottom" delay={300} style={styles.statCard}>
                <View style={[styles.statIconContainer, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
                  <PercentIcon size={20} color="#4ADE80" weight="bold" />
                </View>
                <Text style={[styles.statNumber, { fontFamily: 'Digitalt' }]}>
                  {winRate}%
                </Text>
                <Text style={[styles.statLabel, { fontFamily: 'Gilroy-Black' }]}>
                  Victorias
                </Text>
              </FadeInView>

              <FadeInView from="bottom" delay={350} style={styles.statCard}>
                <View style={[styles.statIconContainer, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                  <FontAwesome5 name="trophy" size={18} color="#FBBF24" solid />
                </View>
                <Text style={[styles.statNumber, { fontFamily: 'Digitalt' }]}>
                  #{globalRank}
                </Text>
                <Text style={[styles.statLabel, { fontFamily: 'Gilroy-Black' }]}>
                  Ranking Global
                </Text>
              </FadeInView>

              <FadeInView from="bottom" delay={400} style={styles.statCard}>
                <View style={[styles.statIconContainer, { backgroundColor: 'rgba(236, 72, 153, 0.15)' }]}>
                  <FontAwesome5 name="star" size={18} color="#F472B6" solid />
                </View>
                <Text style={[styles.statNumber, { fontFamily: 'Digitalt' }]}>
                  {globalPoints}
                </Text>
                <Text style={[styles.statLabel, { fontFamily: 'Gilroy-Black' }]}>
                  Puntos ELO
                </Text>
              </FadeInView>
            </View>
          </View>
          </FadeInView>

          {/* Recent Match Section */}
          <FadeInView from="bottom" delay={300}>
          <View 
            ref={matchesRef}
            onLayout={() => measureUser(matchesRef, 'profile_matches', 20)}
            style={styles.recentSection}
          >
            <View style={styles.sectionHeaderRow}>
              <TouchableOpacity onPress={() => setIsRecentOpen(true)} activeOpacity={0.8}>
                <Text style={[styles.sectionTitle, { fontFamily: 'Gilroy-Black' }]}>PARTIDAS RECIENTES</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.chevronButton} onPress={() => setIsRecentOpen(true)}>
                <CaretRightIcon size={20} color="#fff" weight="fill" />
              </TouchableOpacity>
            </View>

            {recentMatch ? (
              <TouchableOpacity 
                activeOpacity={0.8}
                onPress={() => setIsRecentOpen(true)}
              >
                <FadeInView 
                  from="bottom" 
                  delay={350} 
                  style={styles.recentItem}
                >
                  <View style={styles.recentIconWrap}>
                    <GameControllerIcon size={18} color="#fff" weight="fill" />
                  </View>
                  <View style={styles.recentContent}>
                    <Text style={[styles.recentTitle, { fontFamily: 'Digitalt' }]}>@{recentMatch.opponentUsername}</Text>
                    <Text style={[styles.recentSubtitle, { fontFamily: 'Gilroy-Black' }]}>({recentMatch.opponentPoints})</Text>
                  </View>
                  <View style={styles.recentMeta}>
                    <View style={styles.recentDate}>
                      <CalendarBlankIcon size={16} color="#ffffff" weight="fill" />
                      <Text style={[styles.recentDateText, { fontFamily: 'Gilroy-Black' }]}>
                        {formatDateShort(recentMatch.created_at)}
                      </Text>
                    </View>
                    <View style={[styles.resultChip, recentMatch.didWin ? styles.resultWin : styles.resultLoss]}>
                      <Text style={[styles.resultChipText, { fontFamily: 'Digitalt' }]}>{recentMatch.didWin ? 'W' : 'L'}</Text>
                    </View>
                  </View>
                </FadeInView>
              </TouchableOpacity>
            ) : (
              <Text style={[styles.emptyRecentText, { fontFamily: 'Gilroy-Black' }]}>No hay partidas recientes</Text>
            )}
          </View>
          </FadeInView>

        </ScrollView>
      </SafeAreaView>

      {/* Full Screen Modal: All Recent Games */}
      <Modal
        visible={isRecentOpen}
        animationType="none"
        presentationStyle="fullScreen"
        statusBarTranslucent
        onRequestClose={() => setIsRecentOpen(false)}
      >
        <SafeAreaView
          style={[styles.fullModalContainer, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}
          edges={['top', 'bottom']}
        >
          <View style={styles.fullModalHeader}>
            <Text style={[styles.sheetTitle, { fontFamily: 'Gilroy-Black' }]}>Partidas recientes</Text>
            <TouchableOpacity style={styles.fullModalCloseButton} onPress={() => setIsRecentOpen(false)} activeOpacity={0.8}>
              <Text style={[styles.fullModalCloseText, { fontFamily: 'Digitalt' }]}>CERRAR</Text>
            </TouchableOpacity>
          </View>
          {!isRecentReady ? (
            <View style={styles.fullModalLoading}>
              <ActivityIndicator size="large" color="#ffffff" />
            </View>
          ) : (
            <FadeInView from="bottom" delay={0} style={{ flex: 1 }}>
              <FlatList
                data={recentMatches}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.sheetListContent}
                renderItem={({ item, index }) => (
                  <FadeInView from="bottom" delay={index * 60} style={styles.sheetItem}>
                    <View style={styles.recentIconWrap}>
                      <GameControllerIcon size={18} color="#fff" weight="fill" />
                    </View>
                    <View style={styles.recentContent}>
                      <Text style={[styles.recentTitle, { fontFamily: 'Digitalt' }]}>@{item.opponentUsername}</Text>
                      <Text style={[styles.recentSubtitle, { fontFamily: 'Gilroy-Black' }]}>({item.opponentPoints})</Text>
                    </View>
                    <View style={styles.recentMeta}>
                      <View style={styles.recentDate}>
                        <CalendarBlankIcon size={16} color="#ffffff" weight="fill" />
                        <Text style={[styles.recentDateText, { fontFamily: 'Gilroy-Black' }]}>{formatDateShort(item.created_at)}</Text>
                      </View>
                      <View style={[styles.resultChip, item.didWin ? styles.resultWin : styles.resultLoss]}>
                        <Text style={[styles.resultChipText, { fontFamily: 'Digitalt' }]}>{item.didWin ? 'W' : 'L'}</Text>
                      </View>
                    </View>
                  </FadeInView>
                )}
              />
            </FadeInView>
          )}
        </SafeAreaView>
      </Modal>
      {/* Settings Modal */}
      <Modal
        visible={isSettingsOpen}
        animationType="none"
        presentationStyle="fullScreen"
        statusBarTranslucent
        onRequestClose={() => setIsSettingsOpen(false)}
      >
        <SafeAreaView
          style={[styles.fullModalContainer, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}
          edges={['top', 'bottom']}
        >
              <View style={styles.fullModalHeader}>
                <Text style={[styles.sheetTitle, { fontFamily: 'Gilroy-Black' }]}>Ajustes</Text>
                <TouchableOpacity style={styles.fullModalCloseButton} onPress={() => setIsSettingsOpen(false)} activeOpacity={0.8}>
                  <Text style={[styles.fullModalCloseText, { fontFamily: 'Digitalt' }]}>CERRAR</Text>
                </TouchableOpacity>
              </View>
              <ScrollView 
                style={{ flex: 1 }} 
                contentContainerStyle={styles.settingsContent} 
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {/* Section: Username */}
                <FadeInView from="bottom" delay={100} style={styles.settingsCard}>
                  <Text style={[styles.settingsSectionTitle, { fontFamily: 'Digitalt' }]}>
                    MI USUARIO
                  </Text>
                  
                  {!isEditingUsername ? (
                    <View style={styles.usernameDisplayRow}>
                      <Text style={[styles.currentUsernameLabel, { fontFamily: 'Digitalt' }]}>
                        @{user?.username}
                      </Text>
                      <TouchableOpacity 
                        style={styles.changeUsernameToggle} 
                        onPress={() => setIsEditingUsername(true)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.changeUsernameToggleText, { fontFamily: 'Gilroy-Black' }]}>CAMBIAR</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <FadeInView from="bottom" delay={0} style={{ gap: 12 }}>
                      <AuthInput
                        icon="user"
                        placeholder="Nuevo nombre de usuario"
                        value={newUsername}
                        onChangeText={setNewUsername}
                        autoCapitalize="none"
                        autoCorrect={false}
                        returnKeyType="done"
                        error={usernameError || undefined}
                      />
                      <View style={styles.usernameEditActions}>
                        <TouchableOpacity 
                          style={styles.cancelUsernameButton} 
                          onPress={() => setIsEditingUsername(false)}
                        >
                          <Text style={[styles.cancelUsernameText, { fontFamily: 'Gilroy-Black' }]}>CANCELAR</Text>
                        </TouchableOpacity>
                        <AuthButton
                          title={isSavingUsername ? '...' : 'GUARDAR'}
                          onPress={handleSaveUsername}
                          loading={isSavingUsername}
                          style={{ flex: 1 }}
                        />
                      </View>
                    </FadeInView>
                  )}
                </FadeInView>

                <View style={styles.settingsDivider} />

                {/* Section: Password */}
                <FadeInView from="bottom" delay={200} style={styles.settingsCard}>
                  <Text style={[styles.settingsSectionTitle, { fontFamily: 'Digitalt' }]}>
                    CAMBIAR CONTRASEÑA
                  </Text>
                  <AuthInput
                    icon="lock"
                    label="Contraseña actual"
                    placeholder="••••••••"
                    secureTextEntry
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    returnKeyType="next"
                  />
                  <AuthInput
                    icon="lock"
                    label="Nueva contraseña"
                    placeholder="••••••••"
                    secureTextEntry
                    value={newPassword}
                    onChangeText={setNewPassword}
                    returnKeyType="next"
                  />
                  <AuthInput
                    icon="lock"
                    label="Confirmar contraseña"
                    placeholder="••••••••"
                    secureTextEntry
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    returnKeyType="done"
                    error={passwordError || undefined}
                  />
                  <AuthButton
                    title={isChangingPassword ? 'ACTUALIZANDO...' : 'ACTUALIZAR CONTRASEÑA'}
                    onPress={handleChangePassword}
                    loading={isChangingPassword}
                    variant="secondary"
                    style={styles.settingsActionButton}
                  />
                </FadeInView>

                <View style={styles.settingsDivider} />

                {/* Section: Replay Tutorial */}
                <FadeInView from="bottom" delay={300} style={styles.settingsCard}>
                  <Text style={[styles.settingsSectionTitle, { fontFamily: 'Digitalt' }]}>
                    GUÍAS Y TUTORIALES
                  </Text>
                  
                  <View style={styles.tutorialGrid}>
                    {[
                      { id: '1vs1', label: 'TUTORIAL 1VS1', icon: 'gamepad' },
                      { id: 'infinite', label: 'MODO INFINITO', icon: 'infinity' },
                      { id: 'store', label: 'TIENDA', icon: 'shopping-cart' },
                      { id: 'profile', label: 'PERFIL', icon: 'user-cog' }
                    ].map((item) => (
                      <TouchableOpacity 
                        key={item.id}
                        style={styles.smallTutorialButton}
                        onPress={() => {
                          setIsSettingsOpen(false);
                          startTutorial(item.id as any);
                        }}
                        activeOpacity={0.8}
                      >
                        <LinearGradient
                          colors={['#8A56FE', '#6E72FC']}
                          style={styles.replayTutorialGradient}
                        >
                          <FontAwesome5 name={item.icon} size={14} color="#fff" style={{ marginRight: 8 }} />
                          <Text style={[styles.replayTutorialText, { fontFamily: 'Digitalt' }]}>
                            {item.label.toLowerCase().includes('1vs1') ? (
                              <>
                                TUTORIAL 1<Text style={{ fontFamily: 'Gilroy-Black', textTransform: 'lowercase' }}>vs</Text>1
                              </>
                            ) : (
                              item.label
                            )}
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    ))}
                  </View>
                </FadeInView>

                <View style={styles.settingsDivider} />

                {/* Logout Section inside Settings */}
                <TouchableOpacity 
                  style={[styles.logoutButton, { marginHorizontal: 24, marginTop: 10, marginBottom: 40 }]}
                  onPress={() => {
                    handleLogout();
                  }}
                  activeOpacity={0.8}
                >
                  <SignOutIcon size={20} color="#ef4444" weight="bold" />
                  <Text style={[styles.logoutText, { fontFamily: 'Digitalt' }]}>
                    CERRAR SESIÓN
                  </Text>
                </TouchableOpacity>

              </ScrollView>

              {/* FLOATING OVERLAY FOR LOGOUT CONFIRMATION */}
              {isLogoutModalVisible && (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', paddingHorizontal: 20, zIndex: 9999 }]}>
                  <FadeInView from="bottom" delay={0} style={{ width: '100%' }}>
                    <View style={styles.logoutCard}>
                      <LinearGradient
                        colors={['#1f1b2e', '#13111c']}
                        style={styles.logoutGradient}
                      >
                        <View style={styles.logoutIconContainer}>
                          <LinearGradient
                            colors={['#ef4444', '#b91c1c']}
                            style={styles.logoutIconCircle}
                          >
                            <SignOutIcon size={40} color="#fff" weight="bold" />
                          </LinearGradient>
                        </View>

                        <Text style={[styles.logoutTitle, { fontFamily: 'Digitalt' }]}>
                          ¿CERRAR SESIÓN?
                        </Text>
                        
                        <Text style={[styles.logoutSubtitle, { fontFamily: 'Gilroy-Black' }]}>
                          ¡Te extrañaremos! Asegúrate de haber guardado tu racha antes de irte.
                        </Text>

                        <View style={styles.logoutButtons}>
                          <TouchableOpacity 
                            style={styles.cancelBtn}
                            onPress={() => setIsLogoutModalVisible(false)}
                          >
                            <Text style={[styles.cancelBtnText, { fontFamily: 'Digitalt' }]}>CANCELAR</Text>
                          </TouchableOpacity>

                          <TouchableOpacity 
                            style={styles.confirmBtn}
                            onPress={confirmLogout}
                          >
                            <LinearGradient
                              colors={['#ef4444', '#b91c1c']}
                              style={styles.confirmBtnGradient}
                            >
                              <Text style={[styles.confirmBtnText, { fontFamily: 'Digitalt' }]}>SALIR</Text>
                            </LinearGradient>
                          </TouchableOpacity>
                        </View>
                      </LinearGradient>
                    </View>
                  </FadeInView>
                </View>
              )}
        </SafeAreaView>
      </Modal>

      {/* Streak Calendar Modal */}
      <Modal
        visible={isStreakCalendarOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsStreakCalendarOpen(false)}
      >
        <View style={styles.calendarModalOverlay}>
          <View style={styles.calendarContainer}>
            <View style={styles.calendarHeader}>
              <TouchableOpacity 
                onPress={() => {
                  const newDate = new Date(currentCalendarDate);
                  newDate.setMonth(newDate.getMonth() - 1);
                  setCurrentCalendarDate(newDate);
                }}
                style={styles.calendarNavBtn}
              >
                <CaretLeftIcon size={24} color="#1E1B4B" weight="bold" />
              </TouchableOpacity>
              
              <Text style={[styles.calendarMonthTitle, { fontFamily: 'Digitalt' }]}>
                {currentCalendarDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase()}
              </Text>
              
              <TouchableOpacity 
                onPress={() => {
                  const newDate = new Date(currentCalendarDate);
                  newDate.setMonth(newDate.getMonth() + 1);
                  setCurrentCalendarDate(newDate);
                }}
                style={styles.calendarNavBtn}
              >
                <CaretRightIcon size={24} color="#1E1B4B" weight="bold" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.calendarDaysHeader}>
              {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(day => (
                <Text key={day} style={[styles.calendarDayLabel, { fontFamily: 'Gilroy-Black' }]}>{day}</Text>
              ))}
            </View>
            
            <View style={styles.calendarGrid}>
              {(() => {
                const year = currentCalendarDate.getFullYear();
                const month = currentCalendarDate.getMonth();
                const firstDay = new Date(year, month, 1).getDay(); // 0=Sun, 1=Mon...
                // Adjust to Mon=0, Sun=6
                const startOffset = firstDay === 0 ? 6 : firstDay - 1;
                const daysInMonth = new Date(year, month + 1, 0).getDate();
                const prevDaysInMonth = new Date(year, month, 0).getDate();
                
                const cells = [];
                // Previous month padding
                for (let i = 0; i < startOffset; i++) {
                  cells.push(<View key={`prev-${i}`} style={styles.calendarCell}><Text style={styles.calendarDayDisabled}>{prevDaysInMonth - startOffset + i + 1}</Text></View>);
                }
                // Current month days
                for (let d = 1; d <= daysInMonth; d++) {
                  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                  const isActive = activityDates.includes(dateStr);
                  const isToday = new Date().toISOString().split('T')[0] === dateStr;
                  
                  cells.push(
                    <View key={d} style={styles.calendarCell}>
                      <View style={[
                        styles.calendarDayCircle,
                        isActive && styles.calendarDayActive,
                        isToday && !isActive && styles.calendarDayToday
                      ]}>
                        <Text style={[
                          styles.calendarDayText,
                          { fontFamily: 'Gilroy-Black' },
                          isActive && styles.calendarDayTextActive,
                          isToday && !isActive && styles.calendarDayTextToday
                        ]}>
                          {d}
                        </Text>
                        {isActive && (
                          <View style={styles.activeDot} />
                        )}
                      </View>
                    </View>
                  );
                }
                return cells;
              })()}
            </View>
            
            <TouchableOpacity 
              style={styles.calendarCloseButton} 
              onPress={() => setIsStreakCalendarOpen(false)}
            >
              <Text style={[styles.calendarCloseText, { fontFamily: 'Digitalt' }]}>CERRAR</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>


      <TutorialOverlay />
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
  scrollView: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 20,
    position: 'relative',
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  headerAction: {
    position: 'absolute',
    right: 24,
    top: 24,
    padding: 6,
    borderRadius: 16,
  },
  profileSection: {
    alignItems: 'center',
    paddingHorizontal: isSmallScreen ? 20 : 30,
    paddingBottom: isSmallScreen ? 20 : 40,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  avatarCircle: {
    width: isSmallScreen ? 110 : 140,
    height: isSmallScreen ? 110 : 140,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  layeredAvatar: {
  },
  customizeOverlay: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  levelBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FFD616',
    borderRadius: 15,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  levelText: {
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold',
  },
  userName: {
    color: '#fff',
    fontSize: isSmallScreen ? 20 : 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  userEmail: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: isSmallScreen ? 12 : 14,
    fontWeight: 'normal',
    marginBottom: 15,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  userScore: {
    color: '#FFD616',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statsSection: {
    paddingHorizontal: 30,
    paddingBottom: 30,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    letterSpacing: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  statCard: {
    width: (width - 60 - 12) / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 28,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  statIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statNumber: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  chevronButton: {
    padding: 6,
    borderRadius: 14,
  },
  recentSection: {
    paddingHorizontal: 30,
    paddingBottom: 30,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 12,
    gap: 12,
  },
  recentIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentContent: {
    flex: 1,
  },
  recentTitle: {
    color: '#fff',
    fontSize: 14,
  },
  recentSubtitle: {
    color: '#9ca3af',
    fontSize: 12,
  },
  recentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recentDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginRight: 6,
  },
  recentDateText: {
    color: '#ffffff',
    opacity: 0.9,
    fontSize: 12,
  },
  resultChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  resultChipText: {
    color: '#000',
    fontSize: 12,
  },
  resultWin: {
    backgroundColor: '#22c55e',
  },
  resultLoss: {
    backgroundColor: '#ef4444',
  },
  emptyRecentText: {
    color: '#9ca3af',
    fontSize: 12,
  },
  sheetOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheetContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#3b2ac5',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 48,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginBottom: 12,
  },
  sheetTitle: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 12,
  },
  fullModalContainer: {
    flex: 1,
    backgroundColor: '#3b2ac5',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
  },
  fullModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  fullModalCloseButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  fullModalCloseText: {
    color: '#fff',
    fontSize: 12,
    letterSpacing: 1,
  },
  fullModalLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  settingsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  settingsSectionTitle: {
    color: '#fff',
    fontSize: 18,
    letterSpacing: 1,
    marginBottom: 20,
  },
  usernameDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    padding: 15,
    borderRadius: 16,
  },
  currentUsernameLabel: {
    color: '#fff',
    fontSize: 20,
  },
  changeUsernameToggle: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  changeUsernameToggleText: {
    color: '#A855F7',
    fontSize: 12,
    fontWeight: 'bold',
  },
  usernameEditActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 5,
  },
  cancelUsernameButton: {
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  cancelUsernameText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
  },
  settingsActionButton: {
    marginTop: 10,
  },
  settingsDivider: {
    height: 30,
  },
  sheetListContent: {
    paddingBottom: 12,
    gap: 8,
  },
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  achievementsSection: {
    paddingHorizontal: 30,
    paddingBottom: 100, // Extra padding for tab bar
  },
  achievementsList: {
    gap: 15,
  },
  achievementItem: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 15,
    alignItems: 'center',
    gap: 15,
  },
  achievementLocked: {
    opacity: 0.5,
  },
  achievementIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  achievementContent: {
    flex: 1,
  },
  achievementTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  achievementTitleLocked: {
    color: '#9ca3af',
  },
  achievementDesc: {
    color: '#9ca3af',
    fontSize: 12,
  },
  achievementDescLocked: {
    color: '#6b7280',
  },
  logoutSection: {
    paddingHorizontal: 30,
    paddingBottom: 30,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 15,
    padding: 15,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  replayTutorialButton: {
    marginTop: 10,
    height: 50,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  replayTutorialGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  replayTutorialText: {
    color: '#fff',
    fontSize: 12,
  },
  // Calendar Styles
  calendarModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  calendarContainer: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 30,
    padding: 20,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  calendarNavBtn: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  calendarMonthTitle: {
    fontSize: 18,
    color: '#1E1B4B',
    letterSpacing: 1,
  },
  calendarDaysHeader: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  calendarDayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    color: '#9CA3AF',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  calendarDayCircle: {
    width: '80%',
    height: '80%',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  calendarDayActive: {
    backgroundColor: '#FFF7ED',
    borderWidth: 2,
    borderColor: '#FFD6A5',
  },
  calendarDayToday: {
    borderWidth: 1,
    borderColor: '#6366F1',
    borderStyle: 'dashed',
  },
  calendarDayText: {
    fontSize: 16,
    color: '#1E1B4B',
  },
  calendarDayTextActive: {
    color: '#FF9500',
    fontWeight: 'bold',
  },
  calendarDayTextToday: {
    color: '#6366F1',
  },
  calendarDayDisabled: {
    color: '#E5E7EB',
    fontSize: 14,
  },
  activeDot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FF9500',
  },
  calendarCloseButton: {
    marginTop: 20,
    backgroundColor: '#1E1B4B',
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
  },
  calendarCloseText: {
    color: '#fff',
    fontSize: 16,
    letterSpacing: 1,
  },
  tutorialGrid: {
    marginTop: 10,
    gap: 8,
  },
  smallTutorialButton: {
    height: 44,
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },

  // Streak Styles
  streakContainer: {
    paddingHorizontal: isSmallScreen ? 20 : 30,
    marginBottom: isSmallScreen ? 12 : 25,
    marginTop: isSmallScreen ? -10 : 0, // Pull up slightly if overlapping below
  },
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: isSmallScreen ? 12 : 18,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  streakMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: isSmallScreen ? 8 : 15,
    flex: 1,
  },
  streakIconCircle: {
    width: isSmallScreen ? 36 : 50,
    height: isSmallScreen ? 36 : 50,
    borderRadius: isSmallScreen ? 18 : 25,
    backgroundColor: 'rgba(255, 214, 22, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 22, 0.3)',
  },
  streakCountText: {
    color: '#FFD616',
    fontSize: isSmallScreen ? 16 : 24,
    letterSpacing: 1,
  },
  streakLabelText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: isSmallScreen ? 7 : 10,
    letterSpacing: 1,
  },
  streakWarningTag: {
    backgroundColor: '#EF4444',
    paddingHorizontal: isSmallScreen ? 6 : 10,
    paddingVertical: isSmallScreen ? 2 : 5,
    borderRadius: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    marginLeft: 8,
  },
  streakWarningText: {
    color: '#fff',
    fontSize: isSmallScreen ? 7 : 9,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logoutCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  logoutGradient: {
    padding: 30,
    alignItems: 'center',
  },
  logoutIconContainer: {
    marginBottom: 20,
  },
  logoutIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  logoutTitle: {
    color: '#fff',
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: 1,
  },
  logoutSubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 22,
  },
  logoutButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    height: 54,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cancelBtnText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
    letterSpacing: 1,
  },
  confirmBtn: {
    flex: 1,
    height: 54,
    borderRadius: 18,
    overflow: 'hidden',
  },
  confirmBtnGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: 16,
    letterSpacing: 1,
  },
});

