import AuthService, { AuthUser, SignInData, SignUpData } from '@/Core/Services/AuthService/AuthService';
import { initializeUserInventory } from '@/services/SupabaseService';
import * as Linking from 'expo-linking';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isRecovering: boolean;
  signUp: (data: SignUpData) => Promise<{ user: AuthUser | null; error: any }>;
  signIn: (data: SignInData) => Promise<{ user: AuthUser | null; error: any }>;
  signOut: () => Promise<{ error: any }>;
  resetPassword: (email: string, redirectTo?: string) => Promise<{ error: any }>;
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
              console.log('⚠️ Perfil no encontrado en la base de datos. Cerrando sesión...');
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
          console.log('ℹ️ Sesión previa expirada, el usuario deberá iniciar sesión.');
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
      console.log('🔗 Deep link recibida en AuthContext:', url);
      
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
          console.log(`🔑 Tokens detectados (tipo: ${type}), estableciendo sesión...`);
          if (type === 'recovery') {
            setIsRecovering(true);
          }
          const { error } = await AuthService.setSession(accessToken, refreshToken);
          if (error) {
            console.error('❌ Error al establecer sesión desde URL:', error.message);
            Alert.alert('Error de Sesión', 'No se pudo iniciar la sesión de recuperación.');
          } else {
            console.log('✅ Sesión establecida correctamente desde URL');
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
      setLoading(false);
    });

    // Also listen to raw events to detect recovery mode earlier
    const { data: { subscription: eventSub } } = AuthService.getClient().auth.onAuthStateChange((event, session) => {
      console.log('🔔 Auth Event:', event);
      if (event === 'PASSWORD_RECOVERY') {
        console.log('🛡️ PASSWORD_RECOVERY detectado por evento. Activando modo seguro...');
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
      // Usamos una carga local o simplemente evitamos que el loading global
      // afecte al AuthGuard de forma agresiva
      const result = await AuthService.signUp(data);
      
      // Si el registro fue exitoso, inicializamos el inventario con items base
      if (result.user?.id) {
        await initializeUserInventory(result.user.id);
        setUser(result.user); // Establecemos el usuario localmente
      }
      
      return result;
    } catch (error) {
      console.error('Error in signUp context:', error);
      return { user: null, error };
    } finally {
      // No tocamos setLoading(false) aquí si no es necesario,
      // el AuthGuard ya lo maneja por el estado del usuario.
    }
  };

  const signIn = async (data: SignInData) => {
    try {
      setLoading(true);
      const result = await AuthService.signIn(data);
      return result;
    } catch (error) {
      return { user: null, error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      const result = await AuthService.signOut();
      return result;
    } catch (error) {
      return { error };
    } finally {
      setIsRecovering(false);
      setLoading(false);
    }
  };

  const resetPassword = async (email: string, redirectTo?: string) => {
    try {
      setLoading(true);
      const result = await AuthService.resetPassword(email, redirectTo);
      return result;
    } catch (error) {
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const updatePassword = async (password: string) => {
    try {
      setLoading(true);
      const result = await AuthService.updatePassword(password);
      return result;
    } catch (error) {
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (email: string, token: string, type: 'recovery' | 'signup' = 'recovery') => {
    try {
      setLoading(true);
      const result = await AuthService.verifyOtp(email, token, type);
      if (!result.error) {
        setIsRecovering(true);
      }
      return result;
    } catch (error) {
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const refreshSession = async () => {
    try {
      setLoading(true);
      const result = await AuthService.refreshSession();
      if (result.user) {
        setUser(result.user);
      }
      return result;
    } catch (error) {
      return { user: null, error };
    } finally {
      setLoading(false);
    }
  };

  const clearAuthData = async () => {
    try {
      setLoading(true);
      await AuthService.clearAuthData();
      setUser(null);
    } catch (error) {
      console.error('Error clearing auth data:', error);
    } finally {
      setLoading(false);
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
