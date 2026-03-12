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
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthButton } from '@/components/ui/AuthButton';
import { AuthInput } from '@/components/ui/AuthInput';
import { LogoHeader } from '@/components/ui/LogoHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useFontContext } from '@/contexts/FontsContext';

export default function LoginScreen() {
  const { fontsLoaded } = useFontContext();

  const { signIn, loading } = useAuth();
  
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
    } else if (formData.password.length < 6) {
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    try {
      const { user, error } = await signIn({
        email: normalizeEmail(formData.email),
        password: formData.password,
      });

      if (error) {
        setErrors({ general: error.message });
        Alert.alert('Error', error.message);
      } else if (user) {
        // Navigation will be handled by the auth state change
        router.replace('/(tabs)' as any);
      }
    } catch (error) {
      setErrors({ general: 'Error inesperado. Intenta de nuevo.' });
      Alert.alert('Error', 'Error inesperado. Intenta de nuevo.');
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
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Logo */}
            <LogoHeader size="large" />

            {/* Title */}
            <View style={styles.titleContainer}>
              <Text style={[styles.title, { fontFamily: 'Digitalt' }]}>
                LOGIN
              </Text>
            </View>

            {/* Form */}
            <View style={styles.formContainer}>
              <AuthInput
                icon="user"
                placeholder="Email"
                value={formData.email}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, email: text }))}
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
                onChangeText={(text) => setFormData((prev) => ({ ...prev, password: text }))}
                secureTextEntry
                textContentType="password"
                autoComplete="password"
                error={errors.password}
              />

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
                style={styles.loginButton}
              />

              

              {/* Divider */}
              <View style={styles.divider}>
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
                style={styles.signUpButton}
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
