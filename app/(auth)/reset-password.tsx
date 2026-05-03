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
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthButton } from '@/components/ui/AuthButton';
import { AuthInput } from '@/components/ui/AuthInput';
import { LogoHeader } from '@/components/ui/LogoHeader';
import AuthService from '@/Core/Services/AuthService/AuthService';
import { useAuth } from '@/contexts/AuthContext';
import { useFontContext } from '@/contexts/FontsContext';

export default function ResetPasswordScreen() {
  const { fontsLoaded } = useFontContext();
  const { updatePassword, loading, isRecovering } = useAuth();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Security check: if user is not in a recovery flow, send them back to login
  React.useEffect(() => {
    if (!loading && !isRecovering && !success) {
      console.log('🛡️ Intento de acceso a Reset Password sin sesión de recuperación. Redirigiendo...');
      router.replace('/(auth)/login');
    }
  }, [isRecovering, loading, success]);

  const handleResetPassword = async () => {
    setError('');

    if (!password) {
      setError('La contraseña es requerida');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    // Check if we have a session (user should be signed in via the link)
    const { data: { session } } = await AuthService.getClient().auth.getSession();
    if (!session) {
      setError('Sesión de recuperación no encontrada. Por favor, usa el enlace del correo de nuevo.');
      Alert.alert('Error', 'Sesión expirada o no encontrada.');
      return;
    }

    const translateError = (msg: string) => {
      if (msg.toLowerCase().includes('different from the old password')) return 'La nueva contraseña debe ser diferente a la anterior.';
      if (msg.toLowerCase().includes('at least 6 characters')) return 'La contraseña debe tener al menos 6 caracteres.';
      if (msg.toLowerCase().includes('session missing')) return 'Sesión expirada o no encontrada. Usa el enlace del correo de nuevo.';
      if (msg.toLowerCase().includes('expired')) return 'El enlace ha expirado. Por favor solicita uno nuevo.';
      return 'Ocurrió un error inesperado. Intenta de nuevo.';
    };

    try {
      const { error } = await updatePassword(password);

      if (error) {
        const spanishError = translateError(error.message);
        setError(spanishError);
        Alert.alert('Error', spanishError);
      } else {
        setSuccess(true);
        // Important: sign out after password change to force a clean login
        await AuthService.signOut();
        
        Alert.alert(
          '¡Éxito!',
          'Tu contraseña ha sido actualizada correctamente. Ya puedes iniciar sesión.',
          [
            {
              text: 'Aceptar',
              onPress: () => router.replace('/(auth)/login'),
            },
          ]
        );
      }
    } catch (error) {
      setError('Error inesperado. Intenta de nuevo.');
      Alert.alert('Error', 'Error inesperado. Intenta de nuevo.');
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
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => router.replace('/(auth)/login')}
            >
              <Text style={[styles.backButtonText, { fontFamily: 'Digitalt' }]}>
                ← Volver
              </Text>
            </TouchableOpacity>

            {/* Logo */}
            <LogoHeader size="medium" />

            {/* Title */}
            <View style={styles.titleContainer}>
              <Text style={[styles.title, { fontFamily: 'Digitalt' }]}>
                NUEVA CONTRASEÑA
              </Text>
              <Text style={[styles.subtitle, { fontFamily: 'Gilroy-Black' }]}>
                Ingresa tu nueva contraseña para acceder a tu cuenta
              </Text>
            </View>

            {/* Form */}
            <View style={styles.formContainer}>
              {success ? (
                <View style={styles.successContainer}>
                  <Text style={[styles.successText, { fontFamily: 'Gilroy-Black' }]}>
                    ¡Contraseña actualizada! Ya puedes iniciar sesión con tus nuevas credenciales.
                  </Text>
                  <AuthButton
                    title="IR AL LOGIN"
                    onPress={() => router.replace('/(auth)/login')}
                    style={styles.loginButton}
                  />
                </View>
              ) : (
                <>
                  <AuthInput
                    icon="lock"
                    placeholder="Nueva Contraseña"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    error={error}
                  />

                  <AuthInput
                    icon="lock"
                    placeholder="Confirmar Contraseña"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                  />

                  {/* Submit Button */}
                  <AuthButton
                    title="ACTUALIZAR CONTRASEÑA"
                    onPress={handleResetPassword}
                    loading={loading}
                    style={styles.resetButton}
                  />

                  {/* Cancel Button */}
                  <AuthButton
                    title="CANCELAR"
                    onPress={() => router.replace('/(auth)/login')}
                    variant="secondary"
                    style={styles.cancelButton}
                  />
                </>
              )}
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
    marginBottom: 10,
    paddingVertical: 10,
    paddingHorizontal: 5,
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
    marginBottom: 20,
  },
  resetButton: {
    marginTop: 10,
    marginBottom: 20,
  },
  cancelButton: {
    marginBottom: 20,
  },
  loginButton: {
    marginTop: 10,
  },
});
