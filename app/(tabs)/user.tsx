import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  CalendarBlankIcon,
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
import { getUserMatchesDetailed, getUserStats, UserMatchItem } from '@/services/SupabaseService';
import AuthService from '@/Core/Services/AuthService/AuthService';
import { AuthButton } from '@/components/ui/AuthButton';
import { AuthInput } from '@/components/ui/AuthInput';
import TutorialOverlay from '@/components/TutorialOverlay';
import { useTutorial } from '@/contexts/TutorialContext';
import { useFocusEffect } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');



export default function UserScreen() {
  const { fontsLoaded } = useFontContext();

  const { avatar: userAvatar } = useAvatar();
  const { user, signOut, refreshSession } = useAuth();
  const { setDynamicSpotlight } = useTutorial();

  const settingsRef = React.useRef<View>(null);
  const avatarRef = React.useRef<View>(null);
  const matchesRef = React.useRef<View>(null);

  const measureUser = (ref: React.RefObject<any>, id: string, radius: number) => {
    if (ref.current) {
      ref.current.measure((x, y, w, h, pageX, pageY) => {
        setDynamicSpotlight(id, { x: pageX, y: pageY, w, h, radius });
      });
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      const timer = setTimeout(() => {
        measureUser(settingsRef, 'profile_settings', 25);
        measureUser(avatarRef, 'profile_avatar', 60);
        measureUser(matchesRef, 'profile_matches', 20);
      }, 1500);
      return () => clearTimeout(timer);
    }, [])
  );
  const [gamesPlayed, setGamesPlayed] = React.useState(0);
  const [winRate, setWinRate] = React.useState(0);
  const [recentMatch, setRecentMatch] = React.useState<UserMatchItem | null>(null);
  const [isRecentOpen, setIsRecentOpen] = React.useState(false);
  const [recentMatches, setRecentMatches] = React.useState<UserMatchItem[]>([]);
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
  const insets = useSafeAreaInsets();

  const formatDateShort = (iso: string | null): string => {
    if (!iso) return '';
    const d = new Date(iso);
    const day = d.getDate();
    const month = d.toLocaleString('es-ES', { month: 'short' }).toUpperCase();
    return `${day} ${month}`;
  };

  React.useEffect(() => {
    let isMounted = true;
    const loadStats = async () => {
      if (!user?.id) return;
      const stats = await getUserStats(user.id);
      if (!isMounted || !stats) return;
      setGamesPlayed(stats.totalMatches);
      const computedWinRate = stats.totalMatches > 0 ? Math.round((stats.wins / stats.totalMatches) * 100) : 0;
      setWinRate(computedWinRate);
    };

    loadStats();
    return () => {
      isMounted = false;
    };
  }, [user?.id]);

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
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que quieres cerrar sesión?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              router.replace('/login' as any);
            } catch (error) {
              Alert.alert('Error', 'No se pudo cerrar la sesión');
            }
          },
        },
      ]
    );
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
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
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
                style={styles.avatarCircle}
                onPress={handleCustomizeAvatar}
                activeOpacity={0.8}
              >
                <LayeredAvatar 
                  avatar={userAvatar}
                  size={110}
                  style={styles.layeredAvatar}
                />
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

          {/* Stats Section */}
          <FadeInView from="bottom" delay={200}>
          <View style={styles.statsSection}>
            <Text style={[styles.sectionTitle, { fontFamily: 'Gilroy-Black' }]}>RESUMEN</Text>
            
            <View style={styles.statsGrid}>
              <FadeInView from="bottom" delay={250} style={styles.statCard}>
                <GameControllerIcon size={24} color="#4f46e5" weight="fill" />
                <Text style={[styles.statNumber, { fontFamily: 'Digitalt' }]}>
                  {gamesPlayed}
                </Text>
                <Text style={[styles.statLabel, { fontFamily: 'Gilroy-Black' }]}>
                  Partidas Jugadas
                </Text>
              </FadeInView>
              
              <FadeInView from="bottom" delay={300} style={styles.statCard}>
                <PercentIcon size={24} color="#22c55e" weight="bold" />
                <Text style={[styles.statNumber, { fontFamily: 'Digitalt' }]}>
                  {winRate}%
                </Text>
                <Text style={[styles.statLabel, { fontFamily: 'Gilroy-Black' }]}>
                  Porcentaje de Victorias
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
              <FadeInView from="bottom" delay={350} style={styles.recentItem}>
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
            ) : (
              <Text style={[styles.emptyRecentText, { fontFamily: 'Gilroy-Black' }]}>No hay partidas recientes</Text>
            )}
          </View>
          </FadeInView>

          {/* Logout Section */}
          <View style={styles.logoutSection}>
            <TouchableOpacity 
              style={styles.logoutButton}
              onPress={handleLogout}
              activeOpacity={0.8}
            >
              <SignOutIcon size={20} color="#ef4444" weight="bold" />
              <Text style={[styles.logoutText, { fontFamily: 'Digitalt' }]}>
                CERRAR SESIÓN
              </Text>
            </TouchableOpacity>
          </View>
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
          </ScrollView>
        </SafeAreaView>
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
    paddingHorizontal: 30,
    paddingBottom: 40,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  avatarCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#fff',
    elevation: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    position: 'relative',
  },
  layeredAvatar: {
    borderRadius: 55,
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
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  userEmail: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
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
    gap: 15,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    gap: 10,
  },
  statNumber: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#9ca3af',
    fontSize: 12,
    textAlign: 'center',
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
});
