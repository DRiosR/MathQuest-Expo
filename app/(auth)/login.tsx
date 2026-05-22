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
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthButton } from '@/components/ui/AuthButton';
import { AuthInput } from '@/components/ui/AuthInput';
import { LogoHeader } from '@/components/ui/LogoHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useFontContext } from '@/contexts/FontsContext';

export default function LoginScreen() {
  const { fontsLoaded } = useFontContext();
  const { height } = useWindowDimensions();
  const isSmallScreen = height < 750;
  const isTinyScreen = height < 680;

  const { signIn } = useAuth();
  const [loading, setLoading] = useState(false);

  const normalizeEmail = (value: string) =>
    value
      .normalize('NFKC')
      .trim()
      .toLowerCase()
      // remove any spaces and zero-width/invisible spaces pasted from clipboard
      .replace(/\s+/g, '')
      .replace(/[\u200B-\u200D\uFEFF]/g, '');

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    general?: string;
  }>({});

  const validateForm = () => {
    const newErrors: typeof errors = {};

    const email = normalizeEmail(formData.email);
    if (!email) {
      newErrors.email = 'El email es requerido';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'El email no es válido';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'La contraseña es requerida';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEmailChange = (text: string) => {
    setFormData((prev) => ({ ...prev, email: text }));
    if (errors.email) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.email;
        return next;
      });
    }
  };

  const handlePasswordChange = (text: string) => {
    setFormData((prev) => ({ ...prev, password: text }));
    if (errors.password) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.password;
        return next;
      });
    }
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      const { user, error } = await signIn({
        email: normalizeEmail(formData.email),
        password: formData.password,
      });

      if (error) {
        let msg = 'Error inesperado. Intenta de nuevo.';
        if (error.message.includes('Invalid login credentials')) {
          setErrors({
            email: 'Email o contraseña incorrectos.',
            password: 'Email o contraseña incorrectos.',
          });
          setLoading(false);
          return;
        }
        if (error.message.includes('Email not confirmed')) msg = 'Debes verificar tu email primero.';

        setErrors({ general: msg });
        Alert.alert('Error', msg);
      } else if (user) {
        // Navigation will be handled by the auth state change
        router.replace('/(tabs)' as any);
      }
    } catch (error) {
      setErrors({ general: 'Error inesperado. Intenta de nuevo.' });
      Alert.alert('Error', 'Error inesperado. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    router.push('/forgot-password');
  };

  const handleSignUp = () => {
    router.push('/signup');
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
            contentContainerStyle={[
              styles.scrollContainer,
              { paddingVertical: isTinyScreen ? 15 : (isSmallScreen ? 25 : 40) }
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Logo */}
            <LogoHeader size={isTinyScreen ? "small" : (isSmallScreen ? "medium" : "large")} />

            {/* Title */}
            <View style={[styles.titleContainer, { marginBottom: isTinyScreen ? 15 : (isSmallScreen ? 25 : 40) }]}>
              <Text style={[styles.title, { fontFamily: 'Digitalt', fontSize: isTinyScreen ? 25 : (isSmallScreen ? 28 : 32) }]}>
                LOGIN
              </Text>
            </View>

            {/* Form */}
            <View style={styles.formContainer}>
              <AuthInput
                icon="user"
                placeholder="Email"
                value={formData.email}
                onChangeText={handleEmailChange}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="emailAddress"
                autoComplete="email"
                error={errors.email}
              />

              <AuthInput
                icon="lock"
                placeholder="Contraseña"
                value={formData.password}
                onChangeText={handlePasswordChange}
                secureTextEntry
                showTogglePassword={true}
                textContentType="oneTimeCode"
                autoComplete="off"
                error={errors.password}
              />

              <TouchableOpacity
                style={[styles.forgotPasswordContainer, { marginBottom: isSmallScreen ? 15 : 30 }]}
                onPress={handleForgotPassword}
              >
                <Text style={[styles.forgotPasswordText, { fontFamily: 'Gilroy-Black' }]}>
                  ¿Olvidaste tu contraseña?
                </Text>
              </TouchableOpacity>

              {errors.general && (
                <View style={styles.errorContainer}>
                  <Text style={[styles.errorText, { fontFamily: 'Gilroy-Black' }]}>
                    {errors.general}
                  </Text>
                </View>
              )}

              {/* Login Button */}
              <AuthButton
                title="LOGIN"
                onPress={handleLogin}
                loading={loading}
                style={[styles.loginButton, { marginBottom: isSmallScreen ? 12 : 20 }]}
              />



              {/* Divider */}
              <View style={[styles.divider, { marginBottom: isTinyScreen ? 15 : (isSmallScreen ? 20 : 30) }]}>
                <View style={styles.dividerLine} />
                <Text style={[styles.dividerText, { fontFamily: 'Gilroy-Black' }]}>
                  ¿NO TIENES CUENTA?
                </Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Sign Up Button */}
              <AuthButton
                title="CREAR CUENTA"
                onPress={handleSignUp}
                variant="secondary"
                style={[styles.signUpButton, { marginBottom: isSmallScreen ? 12 : 20 }]}
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
  titleContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  formContainer: {
    width: '100%',
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  loginButton: {
    marginBottom: 20,
  },
  forgotPasswordContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  forgotPasswordText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    textDecorationLine: 'underline',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  dividerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginHorizontal: 16,
    letterSpacing: 1,
  },
  signUpButton: {
    marginBottom: 20,
  },
});
