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
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthButton } from '@/components/ui/AuthButton';
import { AuthInput } from '@/components/ui/AuthInput';
import { LogoHeader } from '@/components/ui/LogoHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useFontContext } from '@/contexts/FontsContext';
import AuthService from '@/Core/Services/AuthService/AuthService';

  export default function SignUpScreen() {
  const { fontsLoaded } = useFontContext();

  const { signUp, loading } = useAuth();
  
  const normalizeEmail = (value: string) =>
    value
      .normalize('NFKC')
      .trim()
      .toLowerCase()
      // remove any spaces and zero-width/invisible spaces pasted from clipboard
      .replace(/\s+/g, '')
      .replace(/[\u200B-\u200D\uFEFF]/g, '');
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<{
    username?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    general?: string;
  }>({});
  
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [checkingUsername, setCheckingUsername] = useState(false);

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!formData.username.trim()) {
      newErrors.username = 'El nombre de usuario es requerido';
    } else if (formData.username.length < 3) {
      newErrors.username = 'El nombre de usuario debe tener al menos 3 caracteres';
    }

    const trimmedEmail = formData.email.trim();
    const email = normalizeEmail(trimmedEmail);
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

    if (!formData.confirmPassword.trim()) {
      newErrors.confirmPassword = 'Confirma tu contraseña';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;

    try {
      const { user, error } = await signUp({
        username: formData.username.trim(),
        email: normalizeEmail(formData.email),
        password: formData.password,
      });

      if (error) {
        console.log('Signup error detected:', error);
        // Manejar errores específicos de Supabase
        const errorMessage = error.message?.toLowerCase() || '';
        
        if (errorMessage.includes('already registered') || errorMessage.includes('already in use')) {
          setErrors({ email: 'Este correo ya está en uso. Prueba con otro.' });
        } else if (errorMessage.includes('username_key') || errorMessage.includes('username') || errorMessage.includes('database error')) {
          // El error de "Database error saving new user" suele ser por nombre de usuario repetido
          setErrors({ username: 'Este nombre de usuario ya está tomado o hay un problema con los datos.' });
          
          // Buscar sugerencias disponibles de todos modos
          try {
            const list = await AuthService.getUsernameSuggestions(formData.username);
            setSuggestions(list);
          } catch (e) {
            console.error('Error fetching suggestions:', e);
          }
        } else {
          setErrors({ general: 'Hubo un problema al crear tu cuenta. Revisa que el correo y usuario sean nuevos.' });
        }
      } else if (user) {
        Alert.alert(
          '¡Cuenta creada!',
          'Bienvenido a MathQuest!',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/(tabs)' as any),
            },
          ]
        );
      }
    } catch (error: any) {
      setErrors({ general: 'Error inesperado. Intenta de nuevo.' });
    }
  };

  const handleLogin = () => {
    router.push('/login');
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
                CREAR CUENTA
              </Text>
            </View>

            {/* Form */}
            <View style={styles.formContainer}>
              <AuthInput
                icon="at"
                placeholder="Nombre de usuario"
                value={formData.username}
                onChangeText={(text) => setFormData({ ...formData, username: text })}
                autoCapitalize="none"
                autoCorrect={false}
                error={errors.username}
              />

              {suggestions.length > 0 && errors.username && (
                <View style={styles.suggestionsContainer}>
                  <Text style={[styles.suggestionLabel, { fontFamily: 'Gilroy-Black' }]}>
                    ¿Qué tal alguno de estos?
                  </Text>
                  <View style={styles.suggestionsList}>
                    {suggestions.map((s, idx) => (
                      <TouchableOpacity 
                        key={idx} 
                        style={styles.suggestionChip}
                        onPress={() => {
                          setFormData({ ...formData, username: s });
                          setErrors({ ...errors, username: undefined });
                          setSuggestions([]);
                        }}
                      >
                        <Text style={[styles.suggestionText, { fontFamily: 'Digitalt' }]}>
                          {s}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              <AuthInput
                icon="user"
                placeholder="Email"
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                error={errors.email}
              />

              <AuthInput
                icon="lock"
                placeholder="Contraseña"
                value={formData.password}
                onChangeText={(text) => setFormData({ ...formData, password: text })}
                secureTextEntry
                error={errors.password}
              />

              <AuthInput
                icon="lock"
                placeholder="Confirmar contraseña"
                value={formData.confirmPassword}
                onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
                secureTextEntry
                error={errors.confirmPassword}
              />

              {errors.general && (
                <View style={styles.errorContainer}>
                  <Text style={[styles.errorText, { fontFamily: 'Gilroy-Black' }]}>
                    {errors.general}
                  </Text>
                </View>
              )}

              {/* Sign Up Button */}
              <AuthButton
                title="CREAR"
                onPress={handleSignUp}
                loading={loading}
                style={styles.signUpButton}
              />

              {/* Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={[styles.dividerText, { fontFamily: 'Gilroy-Black' }]}>
                  ¿YA TIENES CUENTA?
                </Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Login Button */}
              <AuthButton
                title="LOGIN"
                onPress={handleLogin}
                variant="secondary"
                style={styles.loginButton}
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
    fontSize: 28,
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
  signUpButton: {
    marginBottom: 20,
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
  loginButton: {
    marginBottom: 20,
  },
  suggestionsContainer: {
    marginTop: -10,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  suggestionLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    marginBottom: 8,
  },
  suggestionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  suggestionText: {
    color: '#fff',
    fontSize: 14,
  },
});
