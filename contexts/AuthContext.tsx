import AuthService, { AuthUser, SignInData, SignUpData } from '@/Core/Services/AuthService/AuthService';
import { initializeUserInventory } from '@/services/SupabaseService';
import * as Linking from 'expo-linking';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isRecovering: boolean;
  signUp: (data: SignUpData) => Promise<{ user: AuthUser | null; session?: any; error: any }>;
  signIn: (data: SignInData) => Promise<{ user: AuthUser | null; error: any }>;
  signOut: () => Promise<{ error: any }>;
  resetPassword: (email: string, redirectTo?: string) => Promise<{ error: any }>;
  resendSignUpEmail: (email: string, redirectTo?: string) => Promise<{ error: any }>;
  updatePassword: (password: string) => Promise<{ error: any }>;
  verifyOtp: (email: string, token: string, type?: 'recovery' | 'signup') => Promise<{ error: any }>;
  refreshSession: () => Promise<{ user: AuthUser | null; error: any }>;
  clearAuthData: () => Promise<void>;
  getUserStats: (userId: string) => Promise<{ gamesPlayed: number; wins: number; winRate: number }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRecovering, setIsRecovering] = useState(false);

  useEffect(() => {
    // Get initial user with improved session handling
    const getInitialUser = async () => {
      try {
        // Check if there's a valid session first
        const hasSession = await AuthService.hasValidSession();
        
        if (hasSession) {
          const currentUser = await AuthService.getCurrentUser();
          
          if (currentUser) {
            // VERIFICACIÓN CRÍTICA: ¿Existe el perfil en la tabla 'profiles'?
            // Si el usuario fue borrado pero la sesión sigue activa, debemos forzar el logout
            const { data: profile } = await AuthService.getClient()
              .from('profiles')
              .select('id')
              .eq('id', currentUser.id)
              .maybeSingle();

            if (!profile) {

              await AuthService.signOut();
              setUser(null);
            } else {
              setUser(currentUser);
            }
          } else {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        // No mostrar como error fatal si es solo un token expirado, ya que Supabase se recuperará o pedirá login
        const errorMsg = error instanceof Error ? error.message : String(error);
        if (errorMsg.includes('Invalid Refresh Token')) {

        } else {
          console.warn('⚠️ Error al obtener usuario inicial:', errorMsg);
        }
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    getInitialUser();
    
    // Handle deep links for authentication (recovery, signup confirmation, etc.)
    const handleDeepLink = async (event: { url: string }) => {
      const { url } = event;

      
      // Parse the URL to get tokens or errors
      // Supabase sends tokens/errors after # in the fragment
      if (url.includes('#')) {
        const fragment = url.split('#')[1];
        const params = new URLSearchParams(fragment);
        
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const type = params.get('type');
        const errorCode = params.get('error_code');
        const errorDescription = params.get('error_description');
        
        if (errorCode) {
          console.error(`❌ Error en enlace detectado: ${errorCode} - ${errorDescription}`);
          let msg = 'El enlace de recuperación es inválido o ha expirado.';
          if (errorCode === 'otp_expired') msg = 'El enlace ha expirado. Por favor solicita uno nuevo.';
          
          Alert.alert('Enlace Inválido', msg);
          return;
        }
        
        if (accessToken && refreshToken) {

          if (type === 'recovery') {
            setIsRecovering(true);
          }
          const { error } = await AuthService.setSession(accessToken, refreshToken);
          if (error) {
            console.error('❌ Error al establecer sesión desde URL:', error.message);
            Alert.alert('Error de Sesión', 'No se pudo iniciar la sesión de recuperación.');
          } else {

          }
        }
      }
    };

    const subscriptionLinking = Linking.addEventListener('url', handleDeepLink);
    Linking.getInitialURL().then(url => {
      if (url) handleDeepLink({ url });
    });

    // Listen for auth state changes
    const { data: { subscription } } = AuthService.onAuthStateChange((user) => {
      // We don't want to auto-redirect to tabs if we are in recovery mode
      setUser(user);
      if (user?.id) {
        initializeUserInventory(user.id).catch(err => console.error("Error on auth state inventory init:", err));
      }
      setLoading(false);
    });

    // Also listen to raw events to detect recovery mode earlier
    const { data: { subscription: eventSub } } = AuthService.getClient().auth.onAuthStateChange((event, session) => {

      if (event === 'PASSWORD_RECOVERY') {

        setIsRecovering(true);
      }
    });

    return () => {
      subscription?.unsubscribe();
      eventSub?.unsubscribe();
      subscriptionLinking.remove();
    };
  }, []);

  const signUp = async (data: SignUpData) => {
    try {
      let redirectTo: string;
      if (Platform.OS === 'web') {
        redirectTo = Linking.createURL('/verify-success');
      } else {
        const expoUrl = Linking.createURL('/(auth)/verify-email', {
          queryParams: { verified: 'true' }
        });
        redirectTo = `https://math-quest-expo.vercel.app/verify-success?expo_url=${encodeURIComponent(expoUrl)}`;
      }
      
      const result = await AuthService.signUp(data, redirectTo);
      
      // Si el registro fue exitoso e inició sesión automáticamente (con session),
      // entonces inicializamos el inventario y guardamos el usuario.
      if (result.user?.id) {
        if (result.session) {
          await initializeUserInventory(result.user.id);
          setUser(result.user);
        }
      }
      
      return result;
    } catch (error) {
      console.error('Error in signUp context:', error);
      return { user: null, error };
    }
  };

  const signIn = async (data: SignInData) => {
    try {
      const result = await AuthService.signIn(data);
      if (result.user?.id) {
        await initializeUserInventory(result.user.id);
      }
      return result;
    } catch (error) {
      return { user: null, error };
    }
  };

  const signOut = async () => {
    try {
      const result = await AuthService.signOut();
      return result;
    } catch (error) {
      return { error };
    } finally {
      setIsRecovering(false);
    }
  };

  const resetPassword = async (email: string, redirectTo?: string) => {
    try {
      const result = await AuthService.resetPassword(email, redirectTo);
      return result;
    } catch (error) {
      return { error };
    }
  };

  const resendSignUpEmail = async (email: string, redirectTo?: string) => {
    try {
      const result = await AuthService.resendSignUpEmail(email, redirectTo);
      return result;
    } catch (error) {
      return { error };
    }
  };

  const updatePassword = async (password: string) => {
    try {
      const result = await AuthService.updatePassword(password);
      return result;
    } catch (error) {
      return { error };
    }
  };

  const verifyOtp = async (email: string, token: string, type: 'recovery' | 'signup' = 'recovery') => {
    try {
      const result = await AuthService.verifyOtp(email, token, type);
      if (!result.error) {
        setIsRecovering(true);
      }
      return result;
    } catch (error) {
      return { error };
    }
  };

  const refreshSession = async () => {
    try {
      const result = await AuthService.refreshSession();
      if (result.user) {
        setUser(result.user);
      }
      return result;
    } catch (error) {
      return { user: null, error };
    }
  };

  const clearAuthData = async () => {
    try {
      await AuthService.clearAuthData();
      setUser(null);
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  };

  const getUserStats = async (userId: string) => {
    try {
      return await AuthService.getUserStats(userId);
    } catch (error) {
      return { gamesPlayed: 0, wins: 0, winRate: 0 };
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    isRecovering,
    signUp,
    signIn,
    signOut,
    resetPassword,
    resendSignUpEmail,
    updatePassword,
    verifyOtp,
    refreshSession,
    clearAuthData,
    getUserStats,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
