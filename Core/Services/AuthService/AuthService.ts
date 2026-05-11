import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthError, createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from './config';

export interface AuthUser {
  id: string;
  email: string;
  username?: string;
  avatar_url?: string;
}

export interface SignUpData {
  email: string;
  password: string;
  username: string;
}

export interface SignInData {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: AuthUser | null;
  error: AuthError | null;
}

class AuthService {
  private supabase: SupabaseClient;
  private readonly SESSION_STORAGE_KEY = 'supabase_session';

  constructor() {
    this.supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    });
  }

  /**
   * Sign up a new user
   */
  async signUp({ email, password, username }: SignUpData): Promise<AuthResponse> {
    try {
      const normalizedEmail = email
        .normalize('NFKC')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[\u200B-\u200D\uFEFF]/g, '');

      const { data, error } = await this.supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            username,
          },
        },
      });

      if (error) {
        return { user: null, error };
      }

      const authUser: AuthUser = {
        id: data.user?.id || '',
        email: data.user?.email || '',
        username: data.user?.user_metadata?.username,
        avatar_url: data.user?.user_metadata?.avatar_url,
      };

      return { user: authUser, error: null };
    } catch (error) {
      return { 
        user: null, 
        error: error as AuthError 
      };
    }
  }

  /**
   * Sign in an existing user
   */
  async signIn({ email, password }: SignInData): Promise<AuthResponse> {
    try {
      const normalizedEmail = email
        .normalize('NFKC')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[\u200B-\u200D\uFEFF]/g, '');

      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        return { user: null, error };
      }

      const authUser: AuthUser = {
        id: data.user?.id || '',
        email: data.user?.email || '',
        username: data.user?.user_metadata?.username,
        avatar_url: data.user?.user_metadata?.avatar_url,
      };

      return { user: authUser, error: null };
    } catch (error) {
      return { 
        user: null, 
        error: error as AuthError 
      };
    }
  }

  /**
   * Sign out the current user
   */
  async signOut(): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await this.supabase.auth.signOut();
      return { error };
    } catch (error) {
      return { error: error as AuthError };
    }
  }

  /**
   * Get the current user
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      // First try to get the session
      const { data: { session }, error: sessionError } = await this.supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Error getting session:', sessionError);
        return null;
      }

      if (!session?.user) {
        return null;
      }

      // If we have a session, return the user
      return {
        id: session.user.id,
        email: session.user.email || '',
        username: session.user.user_metadata?.username,
        avatar_url: session.user.user_metadata?.avatar_url,
      };
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  /**
   * Check if user has a valid session
   */
  async hasValidSession(): Promise<boolean> {
    try {
      const { data: { session }, error } = await this.supabase.auth.getSession();
      return !error && !!session?.user;
    } catch (error) {
      console.error('Error checking session:', error);
      return false;
    }
  }

  /**
   * Reset password
   */
  async resetPassword(email: string, redirectTo?: string): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });
      return { error };
    } catch (error) {
      return { error: error as AuthError };
    }
  }

  /**
   * Update current user's password
   */
  async updatePassword(password: string): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await this.supabase.auth.updateUser({ password });
      return { error };
    } catch (error) {
      return { error: error as AuthError };
    }
  }

  /**
   * Verify OTP code for various types (recovery, signup, etc.)
   */
  async verifyOtp(email: string, token: string, type: 'recovery' | 'signup' = 'recovery'): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await this.supabase.auth.verifyOtp({
        email,
        token,
        type,
      });
      return { error };
    } catch (error) {
      return { error: error as AuthError };
    }
  }

  /**
   * Listen to auth state changes
   */
  onAuthStateChange(callback: (user: AuthUser | null) => void) {
    return this.supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        const authUser: AuthUser = {
          id: session.user.id,
          email: session.user.email || '',
          username: session.user.user_metadata?.username,
          avatar_url: session.user.user_metadata?.avatar_url,
        };
        callback(authUser);
      } else {
        callback(null);
      }
    });
  }

  /**
   * Manually set session from access and refresh tokens
   */
  async setSession(accessToken: string, refreshToken: string) {
    return await this.supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
  }

  /**
   * Get the Supabase client (for advanced operations)
   */
  getClient(): SupabaseClient {
    return this.supabase;
  }

  /**
   * Get gameplay stats for a profile
   */
  async getUserStats(profileId: string): Promise<{ gamesPlayed: number; wins: number; winRate: number }> {
    // Count total games where the user participated
    const { count: totalGames, error: totalGamesError } = await this.supabase
      .from('matches')
      .select('id', { count: 'exact', head: true })
      .or(`player1_id.eq.${profileId},player2_id.eq.${profileId}`);

    if (totalGamesError) {
      throw totalGamesError;
    }

    // Count total wins where the user is the winner
    const { count: totalWins, error: totalWinsError } = await this.supabase
      .from('matches')
      .select('id', { count: 'exact', head: true })
      .eq('winner_id', profileId);

    if (totalWinsError) {
      throw totalWinsError;
    }

    const gamesPlayed = totalGames || 0;
    const wins = totalWins || 0;
    const winRate = gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0;

    return { gamesPlayed, wins, winRate };
  }

  /**
   * Clear all authentication data
   */
  async clearAuthData(): Promise<void> {
    try {
      await this.supabase.auth.signOut();
      await AsyncStorage.removeItem(this.SESSION_STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  }

  /**
   * Refresh the current session
   */
  /**
   * Check if a username is available
   */
  async checkUsernameAvailability(username: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('username')
        .eq('username', username.trim())
        .maybeSingle();

      if (error) return false;
      return !data;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get available username suggestions based on a taken username
   */
  async getUsernameSuggestions(baseUsername: string): Promise<string[]> {
    try {
      const suggestions: string[] = [];
      const cleanBase = baseUsername.trim().toLowerCase();
      
      const candidates = [
        `${cleanBase}${Math.floor(Math.random() * 99)}`,
        `${cleanBase}${Math.floor(Math.random() * 999)}`,
        `${cleanBase}_${Math.floor(Math.random() * 9)}`,
        `${cleanBase}${new Date().getFullYear().toString().slice(-2)}`,
        `${cleanBase}mq`,
      ];

      // Check which variations are available in one go
      const { data, error } = await this.supabase
        .from('profiles')
        .select('username')
        .in('username', candidates);

      if (error) return [];

      const takenUsernames = data?.map(d => d.username.toLowerCase()) || [];
      return candidates.filter(v => !takenUsernames.includes(v.toLowerCase())).slice(0, 3);
    } catch (error) {
      return [];
    }
  }
}

export default new AuthService();
