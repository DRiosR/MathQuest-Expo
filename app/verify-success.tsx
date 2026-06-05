import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';

import { useFontContext } from '@/contexts/FontsContext';

export default function VerifySuccessScreen() {
  const { fontsLoaded } = useFontContext();
  const params = useLocalSearchParams<{ expo_url?: string }>();
  const [targetUrl, setTargetUrl] = useState<string>('');

  useEffect(() => {
    if (Platform.OS === 'web') {
      // Parse parameters on the client-side
      const hash = window.location.hash;
      const searchParams = new URLSearchParams(window.location.search);
      const expoUrlParam = searchParams.get('expo_url') || params.expo_url;

      if (expoUrlParam) {
        // Build the target deep link with the hash fragment
        let url = decodeURIComponent(expoUrlParam);
        if (hash) {
          url += hash;
        }
        setTargetUrl(url);

        // Auto redirect after a short delay
        const timer = setTimeout(() => {
          window.location.href = url;
        }, 2500);

        return () => clearTimeout(timer);
      }
    }
  }, [params.expo_url]);

  const handleOpenApp = () => {
    if (Platform.OS === 'web' && targetUrl) {
      window.location.href = targetUrl;
    } else {
      // If we are native, just go to login or tabs
      router.replace('/(auth)/login' as any);
    }
  };

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffffff" />
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
        <View style={styles.centerContainer}>
          <View style={styles.cardContainer}>
            <View style={styles.iconCircle}>
              <FontAwesome5 name="check-circle" size={56} color="#4ADE80" />
            </View>

            <Text style={[styles.title, { fontFamily: 'Digitalt' }]}>
              Cuenta verificada correctamente
            </Text>

            <Text style={[styles.message, { fontFamily: 'Gilroy-Black' }]}>
              Tu cuenta ha sido activada con éxito.
            </Text>

            <Text style={[styles.subMessage, { fontFamily: 'Gilroy-Black' }]}>
              Ahora puedes volver a la aplicación para iniciar sesión. Si no se abre automáticamente en unos momentos, presiona el botón de abajo.
            </Text>

            <TouchableOpacity style={styles.button} onPress={handleOpenApp} activeOpacity={0.8}>
              <Text style={[styles.buttonText, { fontFamily: 'Digitalt' }]}>
                ABRIR MATHQUEST
              </Text>
            </TouchableOpacity>

            <Text style={[styles.footerText, { fontFamily: 'Gilroy-Black' }]}>
              ¿No tienes la aplicación instalada? Puedes descargarla desde la tienda o continuar en la web.
            </Text>
          </View>
        </View>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContainer: {
    width: '100%',
    maxWidth: 450,
    paddingHorizontal: 20,
    alignSelf: 'center',
  },
  cardContainer: {
    backgroundColor: 'rgba(26, 26, 46, 0.9)',
    borderRadius: 30,
    padding: 30,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4ADE80',
    shadowColor: '#4ADE80',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(74, 222, 128, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#4ADE80',
  },
  title: {
    color: '#4ADE80',
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 10,
    textShadowColor: 'rgba(74, 222, 128, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  message: {
    color: '#ffffff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 15,
  },
  subMessage: {
    color: '#D6CCFF',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 30,
    opacity: 0.9,
  },
  button: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 18,
    alignItems: 'center',
    backgroundColor: '#4ADE80',
    borderBottomWidth: 4,
    borderBottomColor: '#166534',
    marginBottom: 20,
  },
  buttonText: {
    fontSize: 16,
    letterSpacing: 1.5,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
});
