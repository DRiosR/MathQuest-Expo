import AuthService from '@/Core/Services/AuthService/AuthService';
import { Avatar } from '@/types/avatar';

export type MatchRow = {
  id: string;
  player1_id: string | null;
  player2_id: string | null;
  winner_id: string | null;
  rounds_played: number | null;
  player1_points: number | null;
  player2_points: number | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type UserStats = {
  totalMatches: number;
  wins: number;
  losses: number;
  globalPoints: number;
  recentMatch: MatchRow | null;
};

const supabase = AuthService.getClient();

// -------------------- AVATARS --------------------
export type AvatarRow = {
  id: string;
  profile_id: string;
  skin_asset: string;
  hair_asset: string | null;
  eyes_asset: string;
  mouth_asset: string | null;
  clothes_asset: string;
  created_at?: string | null;
  updated_at?: string | null;
};

/**
 * Fetch the current authenticated user's avatar from 'avatars' table.
 */
export async function getCurrentUserAvatar(): Promise<Avatar | null> {
  try {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id ?? null;
    if (!userId) return null;
    const { data, error } = await supabase
      .from('avatars')
      .select('profile_id, skin_asset, hair_asset, eyes_asset, mouth_asset, clothes_asset')
      .eq('profile_id', userId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
      skin_asset: data.skin_asset as string,
      hair_asset: (data.hair_asset as string | null) ?? undefined,
      eyes_asset: data.eyes_asset as string,
      mouth_asset: (data.mouth_asset as string | null) ?? undefined,
      clothes_asset: data.clothes_asset as string,
    };
  } catch (e) {
    console.error('Error fetching current user avatar:', e);
    return null;
  }
}

/**
 * Upsert the current authenticated user's avatar.
 * If a row exists for profile_id, updates it; otherwise inserts a new one.
 */
export async function upsertCurrentUserAvatar(avatar: Avatar): Promise<Avatar | null> {
  try {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id ?? null;
    if (!userId) return null;

    // Check if avatar exists
    const { data: existing } = await supabase
      .from('avatars')
      .select('id')
      .eq('profile_id', userId)
      .maybeSingle();

    if (existing?.id) {
      const { error: updateError } = await supabase
        .from('avatars')
        .update({
          skin_asset: avatar.skin_asset,
          hair_asset: avatar.hair_asset ?? null,
          eyes_asset: avatar.eyes_asset,
          mouth_asset: avatar.mouth_asset ?? null,
          clothes_asset: avatar.clothes_asset,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase
        .from('avatars')
        .insert({
          profile_id: userId,
          skin_asset: avatar.skin_asset,
          hair_asset: avatar.hair_asset ?? null,
          eyes_asset: avatar.eyes_asset,
          mouth_asset: avatar.mouth_asset ?? null,
          clothes_asset: avatar.clothes_asset,
        });
      if (insertError) throw insertError;
    }
    return avatar;
  } catch (e) {
    console.error('Error upserting current user avatar:', e);
    return null;
  }
}

/**
 * Fetch avatar for a specific profile id.
 */
export async function getUserAvatar(profileId: string): Promise<Avatar | null> {
  try {
    const { data, error } = await supabase
      .from('avatars')
      .select('profile_id, skin_asset, hair_asset, eyes_asset, mouth_asset, clothes_asset')
      .eq('profile_id', profileId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
      skin_asset: data.skin_asset as string,
      hair_asset: (data.hair_asset as string | null) ?? undefined,
      eyes_asset: data.eyes_asset as string,
      mouth_asset: (data.mouth_asset as string | null) ?? undefined,
      clothes_asset: data.clothes_asset as string,
    };
  } catch (e) {
    console.error('Error fetching user avatar:', e);
    return null;
  }
}

/**
 * Batch fetch avatars for multiple profile ids. Returns a map keyed by profile_id.
 */
export async function getAvatarsForProfileIds(profileIds: string[]): Promise<Record<string, Avatar>> {
  const uniqueIds = Array.from(new Set(profileIds.filter(Boolean)));
  if (uniqueIds.length === 0) return {};
  try {
    const { data, error } = await supabase
      .from('avatars')
      .select('profile_id, skin_asset, hair_asset, eyes_asset, mouth_asset, clothes_asset')
      .in('profile_id', uniqueIds);
    if (error) throw error;
    const result: Record<string, Avatar> = {};
    (data || []).forEach((row: any) => {
      result[row.profile_id] = {
        skin_asset: row.skin_asset as string,
        hair_asset: (row.hair_asset as string | null) ?? undefined,
        eyes_asset: row.eyes_asset as string,
        mouth_asset: (row.mouth_asset as string | null) ?? undefined,
        clothes_asset: row.clothes_asset as string,
      };
    });
    return result;
  } catch (e) {
    console.error('Error fetching avatars for profile ids:', e);
    return {};
  }
}

// Obtiene estadísticas del usuario, incluyendo la partida más reciente
export async function getUserStats(userId: string): Promise<UserStats | null> {
  try {
    // Puntos globales del perfil
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('points')
      .eq('id', userId)
      .single();

    if (profileError) throw profileError;

    // Partidas finalizadas del usuario, ordenadas por fecha
    const { data: matches, error: matchesError } = await supabase
      .from('matches')
      .select('id, winner_id, player1_id, player2_id, status, created_at, updated_at, rounds_played, player1_points, player2_points')
      .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
      .eq('status', 'finished')
      .order('created_at', { ascending: false });

    if (matchesError) throw matchesError;

    const totalMatches = matches?.length || 0;
    const wins = (matches || []).filter(m => m.winner_id === userId).length;
    const losses = totalMatches - wins;
    const recentMatch: MatchRow | null = matches && matches.length > 0 ? matches[0] as MatchRow : null;

    return {
      totalMatches,
      wins,
      losses,
      globalPoints: profile?.points || 0,
      recentMatch,
    };
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return null;
  }
}

// Lista todas las partidas del usuario (por defecto finalizadas) ordenadas por fecha descendente
export async function getUserMatches(
  userId: string,
  options: { status?: string; limit?: number } = {}
): Promise<MatchRow[]> {
  const { status = 'finished', limit = 100 } = options;
  const { data, error } = await supabase
    .from('matches')
    .select('id, winner_id, player1_id, player2_id, status, created_at, updated_at, rounds_played, player1_points, player2_points')
    .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching user matches:', error);
    return [];
  }

  return (data || []) as MatchRow[];
}

export type UserMatchItem = {
  id: string;
  created_at: string | null;
  didWin: boolean;
  opponentId: string | null;
  opponentUsername: string;
  opponentPoints: number;
};

// Devuelve partidas enriquecidas con datos del oponente (username, points)
export async function getUserMatchesDetailed(
  userId: string,
  options: { status?: string; limit?: number } = {}
): Promise<UserMatchItem[]> {
  const { status = 'finished', limit = 100 } = options;

  const { data, error } = await supabase
    .from('matches')
    .select(`
      id, winner_id, player1_id, player2_id, status, created_at,
      player1:profiles!matches_player1_id_fkey(id, username, points),
      player2:profiles!matches_player2_id_fkey(id, username, points)
    `)
    .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching detailed matches:', error);
    return [];
  }

  const rows = (data || []) as any[];

  return rows.map((m) => {
    const isPlayer1 = m.player1_id === userId;
    const opponent = isPlayer1 ? m.player2 : m.player1;
    const opponentUsername: string = opponent?.username ?? 'Desconocido';
    const opponentPoints: number = opponent?.points ?? 0;
    const opponentId: string | null = opponent?.id ?? null;
    const didWin = m.winner_id === userId;
    return {
      id: m.id as string,
      created_at: m.created_at as string | null,
      didWin,
      opponentId,
      opponentUsername,
      opponentPoints,
    } as UserMatchItem;
  });
}

// -------------------- RANKS --------------------
export type RankRow = {
  id: string;
  name: string;
  min_points: number;
  max_points: number;
  icon_url: string | null;
  color: string | null;
};

/**
 * Returns all ranks ordered by min_points ascending.
 */
export async function getAllRanks(): Promise<RankRow[]> {
  try {
    const { data, error } = await supabase
      .from('ranks')
      .select('id, name, min_points, max_points, icon_url, color')
      .order('min_points', { ascending: true });
    if (error) throw error;
    return (data || []) as RankRow[];
  } catch (error) {
    console.error('Error fetching ranks:', error);
    return [];
  }
}

export type UserRankInfo = {
  points: number;
  rank: RankRow | null;
  nextRank: RankRow | null;
  progressPercent: number; // 0..1
  pointsToNext: number; // 0 if top rank
};

export type LeaderboardEntry = {
  id: string;
  username: string;
  points: number;
  rank: RankRow | null;
  avatar: Avatar | null;
};

/**
 * Fetches the user's points, current rank (by rank_id or by points), and next rank.
 * Computes progress from current rank to next rank and remaining points.
 */
export async function getUserRankInfo(userId: string): Promise<UserRankInfo | null> {
  try {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('points, rank_id')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) throw profileError;

    const points: number = profile?.points ?? 0;

    // Try to get current rank using rank_id if present
    let currentRank: RankRow | null = null;
    if (profile?.rank_id) {
      const { data: r } = await supabase
        .from('ranks')
        .select('id, name, min_points, max_points, icon_url, color')
        .eq('id', profile.rank_id)
        .maybeSingle();
      currentRank = (r as RankRow) || null;
    }

    // If no rank found, determine by points
    if (!currentRank) {
      const { data: r } = await supabase
        .from('ranks')
        .select('id, name, min_points, max_points, icon_url, color')
        .lte('min_points', points)
        .gte('max_points', points)
        .maybeSingle();
      currentRank = (r as RankRow) || null;
    }

    // Find next rank (first with min_points greater than current points)
    const { data: next } = await supabase
      .from('ranks')
      .select('id, name, min_points, max_points, icon_url, color')
      .gt('min_points', points)
      .order('min_points', { ascending: true })
      .limit(1);

    const nextRank: RankRow | null = next && next.length > 0 ? (next[0] as RankRow) : null;

    // Compute progress
    let progressPercent = 1;
    let pointsToNext = 0;

    if (currentRank && nextRank) {
      const span = Math.max(1, nextRank.min_points - currentRank.min_points);
      progressPercent = Math.min(1, Math.max(0, (points - currentRank.min_points) / span));
      pointsToNext = Math.max(0, nextRank.min_points - points);
    } else if (!currentRank && nextRank) {
      // No current rank (points below first rank min?)
      const firstMin = nextRank.min_points;
      progressPercent = Math.min(1, Math.max(0, points / Math.max(1, firstMin)));
      pointsToNext = Math.max(0, firstMin - points);
    } else {
      // Top rank or no ranks defined
      progressPercent = 1;
      pointsToNext = 0;
    }

    return {
      points,
      rank: currentRank,
      nextRank,
      progressPercent,
      pointsToNext,
    };
  } catch (error) {
    console.error('Error fetching user rank info:', error);
    return null;
  }
}

export async function getUserElo(userId: string, ifWin: boolean): Promise<{ elo: number; beforeElo: number } | null> {
  try {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('points')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) throw profileError;

    // Use "points" as ELO-like metric
    const elo = Math.max(0, Number(profile?.points ?? 0));

    // Compute beforeElo based on match result and server policy
    // Winner: +30, Loser: -25 (see server/WEBSOCKET_MESSAGES.md)
    const delta = ifWin ? 30 : -25;
    const beforeElo = Math.max(0, elo - delta);

    // Debug logs
    console.log('[ELO] getUserElo()', {
      userId,
      result: ifWin ? 'WIN' : 'LOSS',
      fetchedPoints: elo,
      computedBeforeElo: beforeElo,
      appliedDelta: delta,
    });

    return {
      elo,
      beforeElo,
    };
  }
  catch (error) {
    console.error('Error fetching user elo:', error);
    return null;
  }

}

/**
 * Returns global leaderboard ordered by profiles.points (ELO-like).
 * Includes optional joined rank data for color/icon display.
 */
export async function getLeaderboard(limit: number = 50): Promise<LeaderboardEntry[]> {
  try {
    // 1) Fetch profiles ordered by points. Include rank_id for a manual join
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, points, rank_id')
      .order('points', { ascending: false })
      .limit(Math.max(1, limit));
    if (profilesError) throw profilesError;

    const rows = (profiles || []) as Array<{ id: string; username: string | null; points: number | null; rank_id: string | null }>;

    // 2) Collect rank_ids and fetch ranks in one query
    const rankIds = Array.from(new Set(rows.map(r => r.rank_id).filter((v): v is string => !!v)));
    let rankMap = new Map<string, RankRow>();
    if (rankIds.length > 0) {
      const { data: ranks, error: ranksError } = await supabase
        .from('ranks')
        .select('id, name, min_points, max_points, icon_url, color')
        .in('id', rankIds);
      if (ranksError) throw ranksError;
      (ranks || []).forEach((r: any) => {
        rankMap.set(r.id, {
          id: r.id,
          name: r.name,
          min_points: r.min_points,
          max_points: r.max_points,
          icon_url: r.icon_url,
          color: r.color,
        } as RankRow);
      });
    }

    // 3) Fetch avatars in a single query
    const userIds = rows.map(r => r.id);
    const avatarMap = await (async () => {
      const map = new Map<string, Avatar>();
      if (userIds.length === 0) return map;
      const { data: avRows, error: avError } = await supabase
        .from('avatars')
        .select('profile_id, skin_asset, hair_asset, eyes_asset, mouth_asset, clothes_asset')
        .in('profile_id', userIds);
      if (avError) return map;
      (avRows || []).forEach((row: any) => {
        map.set(row.profile_id, {
          skin_asset: row.skin_asset as string,
          hair_asset: (row.hair_asset as string | null) ?? undefined,
          eyes_asset: row.eyes_asset as string,
          mouth_asset: (row.mouth_asset as string | null) ?? undefined,
          clothes_asset: row.clothes_asset as string,
        });
      });
      return map;
    })();

    // 4) Merge and return
    const result: LeaderboardEntry[] = rows.map((r) => ({
      id: r.id,
      username: (r.username ?? 'Usuario') as string,
      points: Number(r.points ?? 0),
      rank: r.rank_id ? rankMap.get(r.rank_id) ?? null : null,
      avatar: avatarMap.get(r.id) ?? null,
    }));
    return result;
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return [];
  }
}

// -------------------- STORE (TIENDA) --------------------
export type StoreItemRow = {
  id: number;
  nombre: string;
  categoria: string;
  calidad?: string | null;
  precio: number;
  imagen?: string | null;
  imagen_tienda?: string | null; // PNG to be used as "store_image"
};

/**
 * Fetches items from 'tienda' table. Optionally filter by category.
 */
export async function getStoreItems(category?: string): Promise<StoreItemRow[]> {
  try {
    let query = supabase
      .from('tienda')
      .select('id, nombre, categoria, calidad, precio, imagen, imagen_tienda');
    if (category) {
      query = query.eq('categoria', category);
    }
    const { data, error } = await query.order('id', { ascending: true });
    if (error) {
      console.error('Error fetching store items:', error);
      return [];
    }
    return (data || []) as StoreItemRow[];
  } catch (error) {
    console.error('Error fetching store items:', error);
    return [];
  }
}

/**
 * Returns the current authenticated user's coin balance from profiles.coins.
 */
export async function getCurrentUserCoins(): Promise<number> {
  try {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id ?? null;
    if (!userId) return 0;
    const { data, error } = await supabase
      .from('profiles')
      .select('coins')
      .eq('id', userId)
      .maybeSingle();
    if (error) throw error;
    const raw = data?.coins;
    const coins = Number(raw ?? 0);
    return Number.isFinite(coins) ? coins : 0;
  } catch (error) {
    console.error('Error fetching user coins:', error);
    return 0;
  }
}

/**
 * Increments the current authenticated user's coin balance and persists it to profiles.coins.
 * Returns the new coin balance. For debug/dev use; not guaranteed atomic under high contention.
 */
export async function incrementCurrentUserCoins(delta: number): Promise<number> {
  try {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id ?? null;
    if (!userId) {
      // Usuario no autenticado o error de red - no lanzar, retornar 0
      return 0;
    }

    // Fetch current coins (if any)
    const { data: existing, error: fetchError } = await supabase
      .from('profiles')
      .select('coins, username, email')
      .eq('id', userId)
      .maybeSingle();
    if (fetchError) {
      throw fetchError;
    }

    const current = Number(existing?.coins ?? 0);
    const newCoins = Math.max(0, (Number.isFinite(current) ? current : 0) + Number(delta || 0));

    // Determine required fields for upsert to satisfy NOT NULL constraints
    const existingUsername = (existing as any)?.username as string | null | undefined;
    const existingEmail = (existing as any)?.email as string | null | undefined;
    const authEmail = authData?.user?.email ?? null;
    const authUsername = (authData?.user?.user_metadata as any)?.username as string | undefined;

    const username = (existingUsername && existingUsername.trim().length > 0)
      ? existingUsername
      : (authUsername && String(authUsername).trim().length > 0 ? String(authUsername).trim() : 'Usuario');
    const email = (existingEmail && existingEmail.trim().length > 0)
      ? existingEmail
      : (authEmail && authEmail.trim().length > 0 ? authEmail.trim() : `${userId}@temp.com`);

    // Upsert to ensure profile row exists
    const { error: upsertError } = await supabase
      .from('profiles')
      .upsert(
        { id: userId, coins: newCoins, username, email, updated_at: new Date().toISOString() },
        { onConflict: 'id' }
      );
    if (upsertError) throw upsertError;

    return newCoins;
  } catch (error) {
    // Reducir ruido: errores de red o auth no críticos
    if (error instanceof Error && (error.message?.includes('authenticated') || error.message?.includes('Network'))) {
      return 0;
    }
    console.error('Error incrementing user coins:', error);
    throw error;
  }
}

// -------------------- INVENTARIO (USER INVENTORY) --------------------

/**
 * Returns the list of product IDs (tienda.id) owned by the current authenticated user from 'inventario'.
 */
export async function getUserInventoryProductIds(): Promise<number[]> {
  try {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id ?? null;
    if (!userId) return [];
    const { data, error } = await supabase
      .from('inventario')
      .select('producto_id')
      .eq('usuario_id', userId);
    if (error) throw error;
    return (data || []).map((row: any) => Number(row.producto_id)).filter((n) => Number.isFinite(n));
  } catch (error) {
    console.error('Error fetching user inventory:', error);
    return [];
  }
}

export type PurchaseResult =
  | { status: 'purchased'; coins: number }
  | { status: 'already_owned'; coins: number }
  | { status: 'insufficient_funds'; coins: number };

/**
 * Performs a purchase:
 * - Checks current user and profile (coins, username, email)
 * - If already owned -> returns { already_owned }
 * - If insufficient funds -> returns { insufficient_funds }
 * - Otherwise updates coins and inserts into inventario
 *   If the insert fails (e.g., duplicate), reverts coins and returns already_owned
 */
export async function purchaseStoreItem(productId: number, price: number): Promise<PurchaseResult> {
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id ?? null;
  if (!userId) {
    throw new Error('No authenticated user');
  }

  // Load current profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('coins, username, email')
    .eq('id', userId)
    .maybeSingle();
  if (profileError) throw profileError;

  const currentCoins = Number(profile?.coins ?? 0);
  const username = (profile?.username && String(profile.username).trim().length > 0)
    ? String(profile.username).trim()
    : (authData?.user?.user_metadata as any)?.username || 'Usuario';
  const email = (profile?.email && String(profile.email).trim().length > 0)
    ? String(profile.email).trim()
    : (authData?.user?.email || `${userId}@temp.com`);

  // Check if already owned
  const { data: existingInv } = await supabase
    .from('inventario')
    .select('id')
    .eq('usuario_id', userId)
    .eq('producto_id', productId)
    .maybeSingle();
  if (existingInv) {
    return { status: 'already_owned', coins: currentCoins };
  }

  if (currentCoins < price) {
    return { status: 'insufficient_funds', coins: currentCoins };
  }

  const newCoins = Math.max(0, currentCoins - Number(price));

  // First update coins (upsert to keep required fields)
  const { error: coinsError } = await supabase
    .from('profiles')
    .upsert(
      { id: userId, coins: newCoins, username, email, updated_at: new Date().toISOString() },
      { onConflict: 'id' }
    );
  if (coinsError) {
    throw coinsError;
  }

  // Then try to insert into inventario
  const { error: invError } = await supabase
    .from('inventario')
    .insert({ usuario_id: userId, producto_id: productId });

  if (invError) {
    // If duplicate or any error, revert coins to previous amount
    await supabase
      .from('profiles')
      .upsert(
        { id: userId, coins: currentCoins, username, email, updated_at: new Date().toISOString() },
        { onConflict: 'id' }
      );

    // If it's a duplicate (23505), treat as already owned
    if ((invError as any)?.code === '23505') {
      return { status: 'already_owned', coins: currentCoins };
    }
    throw invError;
  }

  return { status: 'purchased', coins: newCoins };
}