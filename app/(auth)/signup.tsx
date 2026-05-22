import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { BlurView } from 'expo-blur';
import { FontAwesome5 } from '@expo/vector-icons';
import {
  Alert,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthButton } from '@/components/ui/AuthButton';
import { AuthInput } from '@/components/ui/AuthInput';
import { LogoHeader } from '@/components/ui/LogoHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useFontContext } from '@/contexts/FontsContext';
import AuthService from '@/Core/Services/AuthService/AuthService';
import { validateUsername, containsProfanity } from '@/utils/profanityFilter';

export default function SignUpScreen() {
  const { fontsLoaded } = useFontContext();
  const { height } = useWindowDimensions();
  const isSmallScreen = height < 750;
  const isTinyScreen = height < 680;

  const { signUp } = useAuth();
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

  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const scaleAnim = React.useRef(new Animated.Value(0.8)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (showWelcomeModal) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    } else {
      scaleAnim.setValue(0.8);
      opacityAnim.setValue(0);
    }
  }, [showWelcomeModal]);

  const validateForm = () => {
    const newErrors: typeof errors = {};

    const usernameValidation = validateUsername(formData.username);
    if (!usernameValidation.isValid) {
      newErrors.username = usernameValidation.error;
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

  const handleUsernameChange = (text: string) => {
    setFormData((prev) => ({ ...prev, username: text }));
    
    const cleanText = text.trim();
    if (cleanText.length >= 3 && containsProfanity(cleanText)) {
      setErrors((prev) => ({ ...prev, username: 'Nombre de usuario inapropiado o no permitido' }));
      return;
    }

    if (errors.username) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.username;
        return next;
      });
    }
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

  const handleConfirmPasswordChange = (text: string) => {
    setFormData((prev) => ({ ...prev, confirmPassword: text }));
    if (errors.confirmPassword) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.confirmPassword;
        return next;
      });
    }
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
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
        setShowWelcomeModal(true);
      }
    } catch (error: any) {
      setErrors({ general: 'Error inesperado. Intenta de nuevo.' });
    } finally {
      setLoading(false);
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
              <Text style={[styles.title, { fontFamily: 'Digitalt', fontSize: isTinyScreen ? 22 : (isSmallScreen ? 25 : 28) }]}>
                CREAR CUENTA
              </Text>
            </View>

            {/* Form */}
            <View style={styles.formContainer}>
              <AuthInput
                icon="at"
                placeholder="Nombre de usuario"
                value={formData.username}
                onChangeText={handleUsernameChange}
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
                onChangeText={handleEmailChange}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
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

              <AuthInput
                icon="lock"
                placeholder="Confirmar contraseña"
                value={formData.confirmPassword}
                onChangeText={handleConfirmPasswordChange}
                secureTextEntry
                showTogglePassword={true}
                textContentType="oneTimeCode"
                autoComplete="off"
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
                style={[styles.signUpButton, { marginBottom: isSmallScreen ? 12 : 20 }]}
              />

              {/* Divider */}
              <View style={[styles.divider, { marginBottom: isTinyScreen ? 15 : (isSmallScreen ? 20 : 30) }]}>
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
                style={[styles.loginButton, { marginBottom: isSmallScreen ? 12 : 20 }]}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Modal de Bienvenida */}
      <Modal visible={showWelcomeModal} transparent animationType="none">
        <View style={styles.modalOverlay}>
          <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
          
          <Animated.View
            style={[
              styles.modalContainer,
              {
                opacity: opacityAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <View style={styles.modalIconCircle}>
              <FontAwesome5 name="check-circle" size={40} color="#4ADE80" />
            </View>
            
            <Text style={[styles.modalTitleText, fontsLoaded ? { fontFamily: 'Digitalt' } : null]}>
              ¡CUENTA CREADA!
            </Text>

            <Text style={[styles.modalMessage, fontsLoaded ? { fontFamily: 'Digitalt' } : null]}>
              Bienvenido a MathQuest. ¡Prepárate para la aventura!
            </Text>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setShowWelcomeModal(false);
                router.replace('/(tabs)' as any);
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.modalButtonText, fontsLoaded ? { fontFamily: 'Digitalt' } : null]}>
                COMENZAR
              </Text>
            </TouchableOpacity>
          </Animated.View>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: Dimensions.get('window').width * 0.85,
    backgroundColor: '#1A1A2E',
    borderRadius: 30,
    padding: 25,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#4ADE80',
    shadowColor: '#4ADE80',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 20,
  },
  modalIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalTitleText: {
    fontSize: 26,
    color: '#4ADE80',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: 1,
  },
  modalMessage: {
    fontSize: 16,
    color: '#D6CCFF',
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 22,
    opacity: 0.9,
  },
  modalButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 18,
    alignItems: 'center',
    backgroundColor: '#4ADE80',
    borderBottomWidth: 4,
    borderBottomColor: '#166534',
  },
  modalButtonText: {
    fontSize: 16,
    letterSpacing: 1,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});
