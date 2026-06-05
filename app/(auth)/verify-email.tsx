import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { BlurView } from 'expo-blur';

import { AuthButton } from '@/components/ui/AuthButton';
import { LogoHeader } from '@/components/ui/LogoHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useFontContext } from '@/contexts/FontsContext';

export default function VerifyEmailScreen() {
  const { fontsLoaded } = useFontContext();
  const { email } = useLocalSearchParams<{ email?: string }>();
  const { user, resendSignUpEmail, signOut } = useAuth();

  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [showExitModal, setShowExitModal] = useState(false);

  // Cooldown timer for resending email
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleResendEmail = async () => {
    if (!email) {
      Alert.alert('Error', 'No se encontró el correo electrónico para reenviar.');
      return;
    }

    if (cooldown > 0) return;

    try {
      setResending(true);
      
      const expoUrl = Linking.createURL('/(auth)/verify-email', {
        queryParams: { verified: 'true' }
      });
      const redirectTo = `https://math-quest-expo.vercel.app/verify-success?expo_url=${encodeURIComponent(expoUrl)}`;

      const { error } = await resendSignUpEmail(email, redirectTo);

      if (error) {
        Alert.alert('Error', error.message || 'No se pudo reenviar el correo.');
      } else {
        Alert.alert('Correo Reenviado', 'Se ha enviado un nuevo enlace de confirmación a tu correo.');
        setCooldown(300); // 5 minutes (300 seconds) cooldown
      }
    } catch (e) {
      Alert.alert('Error', 'Ocurrió un error al intentar reenviar.');
    } finally {
      setResending(false);
    }
  };

  const handleBackToLogin = async () => {
    try {
      await signOut();
    } catch (e) {
      // Ignore
    }
    router.replace('/(auth)/login');
  };

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  const isVerified = !!user;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#7c3aed', '#a855f7']}
        style={styles.gradientBackground}
      />

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Logo */}
            <LogoHeader size="medium" />

            <View style={styles.cardContainer}>
              {isVerified ? (
                // SUCCESS STATE
                <View style={styles.innerContainer}>
                  <View style={[styles.iconCircle, styles.successIconCircle]}>
                    <FontAwesome5 name="check-circle" size={48} color="#4ADE80" />
                  </View>

                  <Text style={[styles.title, styles.successTitle, { fontFamily: 'Digitalt' }]}>
                    ¡CUENTA VERIFICADA!
                  </Text>

                  <Text style={[styles.message, { fontFamily: 'Gilroy-Black' }]}>
                    Tu cuenta ha sido creada con éxito y confirmada correctamente.
                  </Text>

                  <AuthButton
                    title="COMENZAR"
                    onPress={() => router.replace('/(tabs)')}
                    style={styles.actionButton}
                  />
                </View>
              ) : (
                // WAITING STATE
                <View style={styles.innerContainer}>
                  <View style={styles.iconCircle}>
                    <ActivityIndicator size="large" color="#ffffff" />
                  </View>

                  <Text style={[styles.title, { fontFamily: 'Digitalt' }]}>
                    CONFIRMA TU CORREO
                  </Text>

                  <Text style={[styles.message, { fontFamily: 'Gilroy-Black' }]}>
                    Revisa tu correo electrónico para activar tu cuenta.
                  </Text>

                  {email ? (
                    <Text style={[styles.emailText, { fontFamily: 'Gilroy-Black' }]}>
                      {email}
                    </Text>
                  ) : null}

                  <Text style={[styles.subMessage, { fontFamily: 'Gilroy-Black' }]}>
                    Esperando confirmación... La activación puede tardar unos momentos.
                  </Text>

                  <AuthButton
                    title={cooldown > 0 ? `Podrás reenviar en ${formatTime(cooldown)}` : "REENVIAR CORREO DE VERIFICACIÓN"}
                    onPress={handleResendEmail}
                    loading={resending}
                    disabled={cooldown > 0}
                    variant="secondary"
                    style={styles.actionButton}
                  />

                  <TouchableOpacity style={styles.backButton} onPress={() => setShowExitModal(true)}>
                    <Text style={[styles.backButtonText, { fontFamily: 'Digitalt' }]}>
                      ← VOLVER AL INICIO DE SESIÓN
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Confirmation Modal to Exit */}
      <Modal visible={showExitModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <BlurView intensity={25} style={StyleSheet.absoluteFill} tint="dark" />
          <View style={styles.exitModalContainer}>
            <View style={styles.modalWarningIcon}>
              <FontAwesome5 name="exclamation-triangle" size={30} color="#FBBF24" />
            </View>

            <Text style={[styles.modalTitle, { fontFamily: 'Digitalt' }]}>
              ¿Salir de la verificación?
            </Text>

            <Text style={[styles.modalMessage, { fontFamily: 'Gilroy-Black' }]}>
              Si sales ahora, tu cuenta seguirá pendiente de activación. Podrás iniciar sesión únicamente después de verificar tu correo electrónico.
            </Text>

            <View style={styles.modalButtonsContainer}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => setShowExitModal(false)}
                activeOpacity={0.8}
              >
                <Text style={[styles.modalButtonTextSecondary, { fontFamily: 'Digitalt' }]}>
                  Continuar esperando
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={async () => {
                  setShowExitModal(false);
                  await handleBackToLogin();
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.modalButtonTextPrimary, { fontFamily: 'Digitalt' }]}>
                  Salir
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    backgroundColor: '#7c3aed',
  },
  gradientBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  safeArea: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingVertical: 40,
  },
  cardContainer: {
    backgroundColor: 'rgba(26, 26, 46, 0.85)',
    borderRadius: 30,
    padding: 25,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
    marginTop: 20,
  },
  innerContainer: {
    alignItems: 'center',
    width: '100%',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  successIconCircle: {
    borderColor: '#4ADE80',
    backgroundColor: 'rgba(74, 222, 128, 0.05)',
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    textAlign: 'center',
    marginBottom: 15,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  successTitle: {
    color: '#4ADE80',
  },
  message: {
    color: '#D6CCFF',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 15,
    opacity: 0.9,
  },
  subMessage: {
    color: '#a855f7',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 25,
    opacity: 0.8,
  },
  emailText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  actionButton: {
    width: '100%',
    marginBottom: 15,
  },
  backButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  backButtonText: {
    color: '#A855F7',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
    textDecorationLine: 'underline',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exitModalContainer: {
    width: '85%',
    maxWidth: 340,
    backgroundColor: '#1E1E38',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FBBF24',
    shadowColor: '#FBBF24',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  modalWarningIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FBBF24',
  },
  modalTitle: {
    fontSize: 20,
    color: '#FBBF24',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 14,
    color: '#D6CCFF',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    opacity: 0.95,
  },
  modalButtonsContainer: {
    width: '100%',
    flexDirection: 'column',
    gap: 10,
  },
  modalButton: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  modalButtonPrimary: {
    backgroundColor: '#EF4444',
    borderBottomWidth: 3,
    borderBottomColor: '#991B1B',
  },
  modalButtonSecondary: {
    backgroundColor: '#374151',
    borderBottomWidth: 3,
    borderBottomColor: '#1F2937',
  },
  modalButtonTextPrimary: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  modalButtonTextSecondary: {
    color: '#D6CCFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
