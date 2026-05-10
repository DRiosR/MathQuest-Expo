import { useAuth } from '@/contexts/AuthContext';
import { useFontContext } from '@/contexts/FontsContext';
import { router, useSegments } from 'expo-router';
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { user, loading, isRecovering } = useAuth();
  const { fontsLoaded } = useFontContext();
  const segments = useSegments() as string[];

  useEffect(() => {
    if (loading || !fontsLoaded) return;

    const inAuthGroup = segments[0] === '(tabs)' || segments[0] === '(games)' || segments[0] === '(modals)';
    const isAuthPage = 
      segments[0] === '(auth)' || 
      segments.includes('login') || 
      segments.includes('signup') || 
      segments.includes('forgot-password') || 
      segments.includes('verify-otp') || 
      segments.includes('reset-password');

    const isResetPage = segments.includes('reset-password');
    const isVerifyOtpPage = segments.includes('verify-otp');

    if (!user && inAuthGroup) {
      // User is not authenticated but trying to access protected route
      router.replace('/login' as any);
    } else if (user && isRecovering && !isResetPage && !isVerifyOtpPage) {
      // User is in recovery mode but NOT on a recovery-related page.
      console.log('🛡️ Usuario en modo recuperación fuera de pantallas permitidas. Redirigiendo a Reset...');
      router.replace('/(auth)/reset-password');
    } else if (user && !isRecovering && !inAuthGroup && !isAuthPage) {
      // User is authenticated normally but on auth screen. Send to tabs.
      router.replace('/(tabs)' as any);
    }
  }, [user, loading, segments, fontsLoaded, isRecovering]);

  if (loading || !fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={[styles.loadingText, { fontFamily: 'Digitalt' }]}>
          Loading...
        </Text>
      </View>
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#7c3aed',
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default AuthGuard;
