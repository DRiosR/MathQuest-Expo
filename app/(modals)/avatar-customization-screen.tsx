import { FontAwesome5 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LayeredAvatar } from '@/components/LayeredAvatar';
import { FadeInView } from '@/components/shared/FadeInView';
import { avatarAssets, categoryConfig } from '@/constants/avatarAssets';
import { useAuth } from '@/contexts/AuthContext';
import { useAvatar } from '@/contexts/AvatarContext';
import { useFontContext } from '@/contexts/FontsContext';
import { getStoreItems, getUserInventoryProductIds, StoreItemRow } from '@/services/SupabaseService';
import { Avatar, AvatarCategory } from '@/types/avatar';

const { width, height } = Dimensions.get('window');

export default function AvatarCustomizationScreen() {
  const { fontsLoaded } = useFontContext();

  const { user } = useAuth();
  const { avatar: currentAvatar, updateAvatar, isLoading: isAvatarLoading } = useAvatar();
  const [selectedCategory, setSelectedCategory] = useState<AvatarCategory>('skin');
  const [originalAvatar, setOriginalAvatar] = useState<Avatar>(currentAvatar);
  const [draftAvatar, setDraftAvatar] = useState<Avatar>(currentAvatar);
  const [ownedProductIds, setOwnedProductIds] = useState<number[]>([]);
  const [storeItems, setStoreItems] = useState<StoreItemRow[]>([]);
  const [loadingInventory, setLoadingInventory] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showSuccess, setShowSuccess] = useState<boolean>(false);

  // Helpers to reconcile local keys (e.g., "skin01") with remote URLs (e.g., ".../skin_01.svg")
  const extractFilename = (uri: string) => {
    try {
      const withoutQuery = uri.split('?')[0].split('#')[0];
      const parts = withoutQuery.split('/');
      return parts[parts.length - 1] || uri;
    } catch {
      return uri;
    }
  };

  const toLocalKeyFromFilename = (filename: string, category: AvatarCategory) => {
    // Examples:
    //  "skin_01.svg" -> "skin01"
    //  "hair_02.svg" -> "hair02"
    //  "eyes_04.svg" -> "eyes04"
    //  "mouth_03.svg" -> "mouth03"
    //  "clothes_05.svg" -> "clothes05"
    const name = filename.replace(/\.svg.*$/i, '');
    // Remove non-alphanumerics, keep digits and letters
    const cleaned = name.replace(/[^a-z0-9_]/gi, '');
    // Remove underscores to align with our keys
    const noUnderscore = cleaned.replace(/_/g, '');
    // Ensure it starts with category
    if (noUnderscore.toLowerCase().startsWith(category.toLowerCase())) {
      return noUnderscore as string;
    }
    // Fallback: if it contains digits, prefix with category
    const digits = (noUnderscore.match(/\d+$/) || [''])[0];
    if (digits) {
      return (category + digits) as string;
    }
    return noUnderscore as string;
  };

  const normalizeValueForCategory = (value: string, category: AvatarCategory) => {
    if (value === 'none') return 'none';
    if (typeof value === 'string' && (value.includes('/') || /\.svg(\?|#|$)/i.test(value))) {
      const filename = extractFilename(value);
      return toLocalKeyFromFilename(filename, category);
    }
    return value;
  };

  // Build maps from normalized local key -> remote URL for each category (using full store catalog)
  const keyToUrlMap = useMemo(() => {
    const map: Record<AvatarCategory, Record<string, string>> = {
      skin: {},
      hair: {},
      eyes: {},
      mouth: {},
      clothes: {},
    };
    for (const r of storeItems) {
      const category = String(r.categoria) as AvatarCategory;
      const url = String(r.imagen || '').trim();
      if (!url || !map[category]) continue;
      const filename = extractFilename(url);
      const key = toLocalKeyFromFilename(filename, category);
      if (key) {
        map[category][key] = url;
      }
    }
    return map;
  }, [storeItems]);

  // Resolve any local key to remote URL using the store catalog; keep 'none' intact
  const resolveToRemoteUrl = (category: AvatarCategory, value: string | undefined) => {
    if (!value || value === 'none') return 'none';
    if (typeof value === 'string' && (value.includes('/') || /\.svg(\?|#|$)/i.test(value))) {
      return value; // already a URL
    }
    const key = normalizeValueForCategory(value as string, category);
    return keyToUrlMap[category][key] || 'none';
  };

  // Initialize original and draft avatar once the context finishes loading
  useEffect(() => {
    if (!isAvatarLoading) {
      setOriginalAvatar(currentAvatar);
      setDraftAvatar(currentAvatar);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAvatarLoading]);

  // Keep draft in sync with context avatar when there are no local edits
  useEffect(() => {
    const noLocalEdits =
      JSON.stringify(draftAvatar) === JSON.stringify(originalAvatar);
    if (noLocalEdits && !isAvatarLoading) {
      setOriginalAvatar(currentAvatar);
      setDraftAvatar(currentAvatar);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAvatar, isAvatarLoading]);

  const hasChanges = () => {
    return JSON.stringify(draftAvatar) !== JSON.stringify(originalAvatar);
  };

  const hasUnsavedChanges = useMemo(() => {
    return JSON.stringify(draftAvatar) !== JSON.stringify(originalAvatar);
  }, [draftAvatar, originalAvatar]);

  const handleBack = () => {
    if (hasChanges()) {
      Alert.alert(
        'Cambios no guardados',
        '¿Quieres guardar los cambios en tu avatar?',
        [
          {
            text: 'No guardar',
            style: 'destructive',
            onPress: () => {
              // Discard local changes
              setDraftAvatar(originalAvatar);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.replace('/(tabs)/user');
            },
          },
          {
            text: 'Guardar',
            onPress: () => {
              // Persist draft and then exit
              handleSave();
            },
          },
        ]
      );
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.replace('/(tabs)/user');
    }

  };

  const handleSave = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    Alert.alert(
      'Guardar Cambios',
      '¿Estás seguro de que quieres guardar los cambios en tu avatar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Guardar',
          onPress: async () => {
            try {
              setIsSaving(true);
              await updateAvatar(draftAvatar);
              // Baseline now matches what we saved
              setOriginalAvatar(draftAvatar);
              setIsSaving(false);
              setShowSuccess(true);

              setTimeout(() => {
                setShowSuccess(false);
                router.replace('/(tabs)/user');
              }, 2000);
            } catch (error) {
              setIsSaving(false);

              Alert.alert('Error', 'No se pudieron guardar los cambios. Intenta de nuevo.');
            }
          }
        }
      ]
    );
  };

  const handleCategorySelect = (category: AvatarCategory) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCategory(category);
  };

  const handleAssetSelect = async (assetKey: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const updatedAvatar = { ...draftAvatar };
    
    // Find if this asset has a back part
    const selectedOption = ownedOptionsForSelectedCategory.find(o => o.svgUrl === assetKey);
    const backUrl = selectedOption?.backUrl || undefined;

    switch (selectedCategory) {
      case 'skin':
        updatedAvatar.skin_asset = assetKey;
        break;
      case 'hair':
        updatedAvatar.hair_asset = assetKey;
        updatedAvatar.hair_back_asset = backUrl;
        break;
      case 'eyes':
        updatedAvatar.eyes_asset = assetKey;
        break;
      case 'mouth':
        updatedAvatar.mouth_asset = assetKey;
        break;
      case 'clothes':
        updatedAvatar.clothes_asset = assetKey;
        updatedAvatar.clothes_back_asset = backUrl;
        break;
    }

    // Only update locally; saving happens explicitly
    setDraftAvatar(updatedAvatar);
  };

  // Load owned inventory and store catalog once
  useEffect(() => {
    let isActive = true;
    (async () => {
      setLoadingInventory(true);
      try {
        const [ids, items] = await Promise.all([
          getUserInventoryProductIds(),
          getStoreItems(),
        ]);
        if (!isActive) return;
        setOwnedProductIds(ids || []);
        setStoreItems(items || []);
      } finally {
        if (isActive) setLoadingInventory(false);
      }
    })();
    return () => {
      isActive = false;
    };
  }, []);

  type OwnedOption = { id: number; svgUrl: string; backUrl: string | null; storeImage: string | null };
  const ownedOptionsForSelectedCategory: OwnedOption[] = useMemo(() => {
    const ownedSet = new Set(ownedProductIds.map(Number));
    const rows = storeItems.filter(
      (r) => ownedSet.has(Number(r.id)) && (r.categoria as string) === selectedCategory
    );
    const mapped = rows.map((r) => {
      const svgUrl = String(r.imagen || '').trim();
      if (!svgUrl) return null;
      return { 
        id: Number(r.id), 
        svgUrl, 
        backUrl: r.imagen_atras ?? null, 
        storeImage: r.imagen_tienda ?? null 
      } as OwnedOption;
    }).filter(Boolean) as OwnedOption[];

    // Prepend a "none" option for categories that support it
    if (avatarAssets[selectedCategory] && Object.prototype.hasOwnProperty.call(avatarAssets[selectedCategory], 'none')) {
      if (!mapped.some(o => o.svgUrl === 'none')) {
        mapped.unshift({ id: -1, svgUrl: 'none', backUrl: null, storeImage: null });
      }
    }
    return mapped;
  }, [ownedProductIds, storeItems, selectedCategory]);

  const getCurrentAssetKey = () => {
    switch (selectedCategory) {
      case 'skin':
        return draftAvatar.skin_asset;
      case 'hair':
        return draftAvatar.hair_asset;
      case 'eyes':
        return draftAvatar.eyes_asset;
      case 'mouth':
        return draftAvatar.mouth_asset;
      case 'clothes':
        return draftAvatar.clothes_asset;
      default:
        return '';
    }
  };

  if (!fontsLoaded || isAvatarLoading) {
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
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <FontAwesome5 name="chevron-left" size={20} color="#fff" />
          </TouchableOpacity>

          <View style={{ flex: 1 }} />

          <TouchableOpacity
            onPress={handleSave}
            style={styles.saveButtonWrapper}
            disabled={!hasUnsavedChanges || isSaving}
          >
            {isSaving ? (
              <View style={[styles.saveButton, styles.saveButtonDisabled]}>
                <ActivityIndicator size="small" color="#7c3aed" />
                <Text style={styles.saveButtonText}>Guardando…</Text>
              </View>
            ) : hasUnsavedChanges ? (
              <View style={[styles.saveButton, styles.saveButtonActive]}>
                <Text style={styles.saveButtonText}>Guardar</Text>
              </View>
            ) : (
              <View style={[styles.saveButton, styles.saveButtonDisabled]}>
                <Text style={styles.saveButtonText}>Guardar</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Avatar Display */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            <LayeredAvatar
              avatar={{
                skin_asset: resolveToRemoteUrl('skin', draftAvatar.skin_asset) as any,
                hair_asset: resolveToRemoteUrl('hair', draftAvatar.hair_asset) as any,
                hair_back_asset: draftAvatar.hair_back_asset, // This is already a URL or undefined
                eyes_asset: resolveToRemoteUrl('eyes', draftAvatar.eyes_asset) as any,
                mouth_asset: resolveToRemoteUrl('mouth', draftAvatar.mouth_asset) as any,
                clothes_asset: resolveToRemoteUrl('clothes', draftAvatar.clothes_asset) as any,
                clothes_back_asset: draftAvatar.clothes_back_asset,
              }}
              size={200}
              style={styles.avatar}
            />
          </View>
        </View>

        {/* Title and Username below Avatar */}
        <View style={styles.titleSection}>
          <Text style={[styles.title, { fontFamily: 'Digitalt' }]}>
            AVATAR!
          </Text>
          <Text style={[styles.usernameText, { fontFamily: 'Digitalt' }]}>
            {user?.username ? user.username : 'Usuario'}
          </Text>
        </View>

        {/* Category Navigation */}
        <View style={styles.categoryNavigation}>
          {(Object.keys(categoryConfig) as AvatarCategory[]).map((category) => {
            const config = categoryConfig[category];
            const isSelected = selectedCategory === category;

            return (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryButton,
                  isSelected && styles.categoryButtonSelected
                ]}
                onPress={() => handleCategorySelect(category)}
              >
                <FontAwesome5
                  name={config.icon}
                  size={20}
                  color={isSelected ? '#7c3aed' : '#fff'}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Asset Selection Grid */}
        <View style={styles.selectionSection}>
          <Text style={[styles.categoryTitle, { fontFamily: 'Gilroy-Black' }]}>
            {categoryConfig[selectedCategory].displayName}
          </Text>

          <ScrollView
            style={styles.assetsScrollView}
            showsVerticalScrollIndicator={false}
          >
            {loadingInventory ? (
              <View style={{ paddingVertical: 20, width: '100%', alignItems: 'center' }}>
                <Text style={{ color: '#6b7280' }}>Cargando inventario…</Text>
              </View>
            ) : ownedOptionsForSelectedCategory.length === 0 ? (
              <FadeInView from="bottom" delay={100} duration={450} style={{ width: '100%' }}>
                <View style={{ paddingVertical: 20, width: '100%', alignItems: 'center' }}>
                  <Text style={{ color: '#6b7280' }}>No tienes ítems de esta categoría</Text>
                </View>
              </FadeInView>
            ) : (
              <FadeInView from="bottom" delay={100} duration={450} style={styles.assetsGrid}>
                {ownedOptionsForSelectedCategory.map((opt) => {
                  const isNone = opt.svgUrl === 'none';
                  const currentKey = getCurrentAssetKey() || '';
                  const currentNorm = normalizeValueForCategory(currentKey, selectedCategory);
                  const optionNorm = isNone ? 'none' : normalizeValueForCategory(opt.svgUrl, selectedCategory);
                  const isSelected = currentNorm === optionNorm;
                  return (
                    <TouchableOpacity
                      key={`${selectedCategory}-${opt.id}-${opt.svgUrl}`}
                      style={[
                        styles.assetOption,
                        isSelected && styles.assetOptionSelected
                      ]}
                      onPress={() => handleAssetSelect(opt.svgUrl)}
                    >
                      <View style={styles.assetPreview}>
                        {isNone ? (
                          <View style={styles.noneOption}>
                            <FontAwesome5 name="times" size={24} color="#9ca3af" />
                            <Text style={styles.noneText}>None</Text>
                          </View>
                        ) : opt.storeImage ? (
                          <ExpoImage
                            source={{ uri: opt.storeImage }}
                            style={{ width: 100, height: 100 }}
                            contentFit="contain"
                            cachePolicy="disk"
                          />
                        ) : (
                          <View style={[styles.noneOption, { width: 100, height: 100 }]}>
                            <Text style={styles.noneText}>Sin vista previa</Text>
                          </View>
                        )}
                      </View>
                      {isSelected && (
                        <View style={styles.selectedIndicator}>
                          <FontAwesome5 name="check" size={12} color="#fff" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </FadeInView>
            )}
          </ScrollView>
        </View>
      </SafeAreaView>

      {/* Success Message Overlay */}
      {showSuccess && (
        <View style={styles.successOverlay}>
          <FadeInView from="bottom" duration={400} style={styles.successCard}>
            <View style={styles.successIconCircle}>
              <FontAwesome5 name="check" size={30} color="#fff" />
            </View>
            <Text style={[styles.successText, { fontFamily: 'Digitalt' }]}>¡AVATAR ACTUALIZADO!</Text>
          </FadeInView>
        </View>
      )}
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
    height: height,
  },
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  successCard: {
    backgroundColor: '#22C55E',
    paddingVertical: 30,
    paddingHorizontal: 40,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#4ADE80',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  successIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  successText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  saveButtonWrapper: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  saveButton: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  saveButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  saveButtonActive: {
    backgroundColor: '#fff',
  },
  saveButtonText: {
    color: '#7c3aed',
    fontWeight: 'bold',
  },
  saveButtonTextOnGradient: {
    color: '#fff',
    fontWeight: 'bold',
  },
  saveGradient: {
    borderRadius: 20,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  avatarContainer: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'flex-end',
    elevation: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  avatar: {
    borderRadius: 100,
  },
  titleSection: {
    alignItems: 'center',
    paddingBottom: 10,
  },
  categoryNavigation: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingVertical: 20,
    gap: 15,
  },
  usernameText: {
    color: '#fff',
    marginTop: 6,
    fontSize: 14,
    opacity: 0.9,
  },
  categoryButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryButtonSelected: {
    backgroundColor: '#fff',
  },
  selectionSection: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 25,
    paddingHorizontal: 20,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: 1,
  },
  assetsScrollView: {
    flex: 1,
  },
  assetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 10,
    paddingBottom: 30,
  },
  assetOption: {
    width: (width - 60) / 3,
    aspectRatio: 1,
    marginBottom: 15,
    borderRadius: 15,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  assetOptionSelected: {
    borderColor: '#7c3aed',
    backgroundColor: '#ede9fe',
  },
  assetPreview: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noneOption: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  noneText: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: 'bold',
  },
});

