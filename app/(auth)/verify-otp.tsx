import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState, useRef, useEffect } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthButton } from '@/components/ui/AuthButton';
import { LogoHeader } from '@/components/ui/LogoHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useFontContext } from '@/contexts/FontsContext';

export default function VerifyOtpScreen() {
  const { fontsLoaded } = useFontContext();
  const { verifyOtp } = useAuth();
  const [loading, setLoading] = useState(false);
  const { email } = useLocalSearchParams<{ email: string }>();
  
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  
  const inputRefs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    if (!email) {
      Alert.alert('Error', 'Falta el correo electrónico. Por favor intenta de nuevo.');
      router.replace('/(auth)/forgot-password');
    }
  }, [email]);

  const handleCodeChange = (text: string, index: number) => {
    const newCode = [...code];
    // Solo permitir números
    const cleanText = text.replace(/[^0-9]/g, '');
    
    if (cleanText.length > 1) {
      // Manejar pegado de código completo
      const pastedCode = cleanText.slice(0, 6).split('');
      const updatedCode = [...code];
      pastedCode.forEach((char, i) => {
        if (i < 6) updatedCode[i] = char;
      });
      setCode(updatedCode);
      // Enfocar el último o el siguiente vacío
      const nextIndex = Math.min(pastedCode.length, 5);
      inputRefs.current[nextIndex]?.focus();
    } else {
      newCode[index] = cleanText;
      setCode(newCode);

      // Mover al siguiente input si se ingresó un número
      if (cleanText && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const fullCode = code.join('');
    if (fullCode.length < 6) {
      setError('Por favor ingresa el código de 6 dígitos');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const { error: otpError } = await verifyOtp(email as string, fullCode, 'recovery');

      if (otpError) {
        console.error('OTP Error:', otpError);
        let msg = 'Código inválido o expirado.';
        if (otpError.message.includes('expired')) msg = 'El código ha expirado. Solicita uno nuevo.';
        
        setError(msg);
        Alert.alert('Error', msg);
      } else {
        // Éxito: isRecovering ya se puso en true en el context
        router.replace('/(auth)/reset-password');
      }
    } catch (e) {
      setError('Error inesperado. Intenta de nuevo.');
      Alert.alert('Error', 'Error inesperado. Intenta de nuevo.');
    } finally {
      setLoading(false);
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
              onPress={() => router.replace('/(auth)/forgot-password')}
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
                VERIFICAR CÓDIGO
              </Text>
              <Text style={[styles.subtitle, { fontFamily: 'Gilroy-Black' }]}>
                Ingresa el código de 6 dígitos enviado a:{'\n'}
                <Text style={styles.emailHighlight}>{email}</Text>
              </Text>
            </View>

            {/* OTP Inputs */}
            <View style={styles.otpContainer}>
              {code.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => { inputRefs.current[index] = ref; }}
                  style={[
                    styles.otpInput,
                    { fontFamily: 'Digitalt' },
                    digit ? styles.otpInputActive : null,
                    error ? styles.otpInputError : null
                  ]}
                  value={digit}
                  onChangeText={(text) => handleCodeChange(text, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  keyboardType="number-pad"
                  maxLength={6} // Permitir pegado
                  selectTextOnFocus
                />
              ))}
            </View>

            {error ? (
              <Text style={[styles.errorText, { fontFamily: 'Gilroy-Black' }]}>{error}</Text>
            ) : null}

            {/* Submit Button */}
            <AuthButton
              title="VERIFICAR"
              onPress={handleVerify}
              loading={loading}
              style={styles.verifyButton}
            />

            {/* Resend Section */}
            <TouchableOpacity 
              style={styles.resendButton}
              onPress={() => router.replace('/(auth)/forgot-password')}
            >
              <Text style={[styles.resendText, { fontFamily: 'Gilroy-Black' }]}>
                ¿No recibiste el código? <Text style={styles.resendLink}>Reenviar</Text>
              </Text>
            </TouchableOpacity>
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
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 20,
    paddingVertical: 10,
    paddingHorizontal: 10,
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
    marginBottom: 10,
  },
  subtitle: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.9,
    lineHeight: 22,
  },
  emailHighlight: {
    fontWeight: 'bold',
    color: '#fff',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    width: '100%',
  },
  otpInput: {
    width: '15%',
    aspectRatio: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    color: '#fff',
    fontSize: 24,
    textAlign: 'center',
  },
  otpInputActive: {
    borderColor: '#fff',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  otpInputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 10,
    borderRadius: 8,
  },
  verifyButton: {
    marginBottom: 20,
  },
  resendButton: {
    alignItems: 'center',
    padding: 10,
  },
  resendText: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.8,
  },
  resendLink: {
    fontWeight: 'bold',
    textDecorationLine: 'underline',
    opacity: 1,
  },
});
