import React from 'react';
import { getStoreItems, getCurrentUserCoins, StoreItemRow } from '@/services/SupabaseService';

export type StoreItem = {
  id: string;
  name: string;
  category: 'skin' | 'hair' | 'eyes' | 'mouth' | 'clothes' | string;
  price: number;
  // The PNG image to be used in store cards (mapped from DB's imagen_tienda)
  storeImage: string | null;
  // The SVG/PNG URL for avatar preview (mapped from DB's imagen)
  svgUrl: string | null;
  // The SVG/PNG URL for back layer (mapped from DB's imagen_atras)
  backUrl: string | null;
  rarity: string | null;
};

export function useItemStore() {
  const [items, setItems] = React.useState<StoreItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = React.useState<boolean>(false);
  const [coins, setCoins] = React.useState<number>(0);

  const mapRowToItem = React.useCallback((row: StoreItemRow): StoreItem => {
    return {
      id: String(row.id),
      name: row.nombre,
      category: row.categoria,
      price: Number(row.precio ?? 0),
      storeImage: row.imagen_tienda ?? null,
      svgUrl: row.imagen ?? null,
      backUrl: row.imagen_atras ?? null,
      rarity: row.calidad ?? 'comun',
    };
  }, []);

  const refreshItems = React.useCallback(async (category?: string) => {
    setIsLoadingItems(true);
    try {
      const data = await getStoreItems(category);
      setItems((data || []).map(mapRowToItem));
    } finally {
      setIsLoadingItems(false);
    }
  }, [mapRowToItem]);

  const refreshCoins = React.useCallback(async () => {
    const value = await getCurrentUserCoins();
    setCoins(value);
  }, []);

  React.useEffect(() => {
    // Initial load
    refreshItems();
    refreshCoins();
  }, [refreshItems, refreshCoins]);

  return {
    items,
    isLoadingItems,
    refreshItems,
    coins,
    setCoins, // allow local optimistic updates; persistence not handled here
    refreshCoins,
  };
}


