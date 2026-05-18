import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Linking from 'expo-linking';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthButton } from '@/components/ui/AuthButton';
import { AuthInput } from '@/components/ui/AuthInput';
import { LogoHeader } from '@/components/ui/LogoHeader';
import AuthService from '@/Core/Services/AuthService/AuthService';
import { useAuth } from '@/contexts/AuthContext';
import { useFontContext } from '@/contexts/FontsContext';

export default function ForgotPasswordScreen() {
  const { fontsLoaded } = useFontContext();

  const { resetPassword } = useAuth();
  const [loading, setLoading] = useState(false);
  
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  const normalizeEmail = (value: string) =>
    value
      .normalize('NFKC')
      .trim()
      .toLowerCase()
      // remove any spaces and zero-width/invisible spaces pasted from clipboard
      .replace(/\s+/g, '')
      .replace(/[\u200B-\u200D\uFEFF]/g, '');

  const validateEmail = (email: string) => {
    return /\S+@\S+\.\S+/.test(email);
  };

  const handleResetPassword = async () => {
    const normalized = normalizeEmail(email);
    if (!normalized) {
      setError('El email es requerido');
      return;
    }

    if (!validateEmail(normalized)) {
      setError('El email no es válido');
      return;
    }

    try {
      setLoading(true);
      // Security: Ensure no session is active before requesting recovery
      try {
        await AuthService.signOut();
      } catch (e) {
        // Ignore errors if already signed out
      }
      
      const redirectTo = Linking.createURL('/(auth)/reset-password');
      console.log('🛡️ Solicitando recuperación para:', normalized);
      console.log('🔗 Redirect URL configurada:', redirectTo);
      
      const { error } = await resetPassword(normalized, redirectTo);

      if (error) {
        let msg = 'Error inesperado. Intenta de nuevo.';
        if (error.message.includes('not found')) msg = 'No encontramos ninguna cuenta con ese correo.';
        if (error.message.includes('rate limit')) msg = 'Has intentado demasiadas veces. Espera un momento.';
        
        setError(msg);
        Alert.alert('Error', msg);
      } else {
        setEmailSent(true);
        // Instead of Alert and Login, go to Verify OTP screen
        router.push({
          pathname: '/(auth)/verify-otp',
          params: { email: normalized }
        });
      }
    } catch (error) {
      setError('Error inesperado. Intenta de nuevo.');
      Alert.alert('Error', 'Error inesperado. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    router.replace('/(auth)/login');
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
            {/* Back Button */}
            <TouchableOpacity style={styles.backButton} onPress={handleBackToLogin}>
              <Text style={[styles.backButtonText, { fontFamily: 'Digitalt' }]}>
                ← Volver
              </Text>
            </TouchableOpacity>

            {/* Logo */}
            <LogoHeader size="medium" />

            {/* Title */}
            <View style={styles.titleContainer}>
              <Text style={[styles.title, { fontFamily: 'Digitalt' }]}>
                OLVIDASTE TU{'\n'}CONTRASEÑA?
              </Text>
              <Text style={[styles.subtitle, { fontFamily: 'Gilroy-Black' }]}>
                No te preocupes, te ayudamos a recuperarla
              </Text>
            </View>

            {/* Form */}
            <View style={styles.formContainer}>
              {emailSent ? (
                <View style={styles.successContainer}>
                  <Text style={[styles.successText, { fontFamily: 'Gilroy-Black' }]}>
                    ¡Email enviado! Revisa tu bandeja de entrada para continuar con el proceso de recuperación.
                  </Text>
                </View>
              ) : (
                <>
                  <AuthInput
                    icon="envelope"
                    placeholder="Email"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    error={error}
                  />

                  {/* Reset Button */}
                  <AuthButton
                    title="ENVIAR EMAIL"
                    onPress={handleResetPassword}
                    loading={loading}
                    style={styles.resetButton}
                  />
                </>
              )}

              {/* Back to Login */}
              <AuthButton
                title="VOLVER AL LOGIN"
                onPress={handleBackToLogin}
                variant="secondary"
                style={styles.backToLoginButton}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
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
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 20,
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 2,
    textAlign: 'center',
    lineHeight: 34,
    marginBottom: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'normal',
    textAlign: 'center',
    opacity: 0.9,
    lineHeight: 22,
  },
  formContainer: {
    width: '100%',
  },
  successContainer: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  successText: {
    color: '#22c55e',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: 'bold',
    lineHeight: 22,
  },
  resetButton: {
    marginBottom: 20,
  },
  backToLoginButton: {
    marginBottom: 20,
  },
});
