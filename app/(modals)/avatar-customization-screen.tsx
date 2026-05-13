import { FontAwesome5 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Dimensions, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
const isSmallDevice = height < 750;
const isVerySmallDevice = height < 650;

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
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText: string;
    cancelText: string;
    icon: string;
    confirmColor: string[];
  }>({
    visible: false,
    title: '',
    message: '',
    onConfirm: () => {},
    confirmText: '',
    cancelText: '',
    icon: 'exclamation-circle',
    confirmColor: ['#22C55E', '#16A34A'],
  });

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
      marco: {},
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
      setConfirmModal({
        visible: true,
        title: '¡ESPERA!',
        message: '¿Quieres guardar los cambios antes de salir?',
        confirmText: 'GUARDAR',
        cancelText: 'SALIR SIN GUARDAR',
        icon: 'save',
        confirmColor: ['#22C55E', '#16A34A'],
        onConfirm: () => {
          setConfirmModal(prev => ({ ...prev, visible: false }));
          handleSave();
        }
      });
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.replace('/(tabs)/user');
    }
  };

  const discardChangesAndExit = () => {
    setConfirmModal(prev => ({ ...prev, visible: false }));
    setDraftAvatar(originalAvatar);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace('/(tabs)/user');
  };

  const handleSave = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    setConfirmModal({
      visible: true,
      title: '¿GUARDAR?',
      message: '¿Estás seguro de que quieres guardar tu nuevo look?',
      confirmText: 'SÍ, GUARDAR',
      cancelText: 'CANCELAR',
      icon: 'check-circle',
      confirmColor: ['#8A56FE', '#7C3AED'],
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, visible: false }));
        try {
          setIsSaving(true);
          await updateAvatar(draftAvatar);
          setOriginalAvatar(draftAvatar);
          setIsSaving(false);
          setShowSuccess(true);

          setTimeout(() => {
            setShowSuccess(false);
            router.replace('/(tabs)/user');
          }, 2000);
        } catch (error) {
          setIsSaving(false);
          // Show error modal?
        }
      }
    });
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
      case 'marco':
        updatedAvatar.frame_asset = assetKey;
        // Smart fallback: si no hay backUrl explícito pero es un marco de rango, derivarlo del nombre
        let finalBackUrl = backUrl;
        if (!finalBackUrl && assetKey.includes('delante_')) {
          finalBackUrl = assetKey.replace('delante_', 'atras_');
          console.log('✨ Derivando marco_back automáticamente:', finalBackUrl);
        }
        updatedAvatar.frame_back_asset = finalBackUrl;
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

  type OwnedOption = { id: number; svgUrl: string; backUrl: string | null; storeImage: string | null; rarity: string | null };
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
        storeImage: r.imagen_tienda ?? null,
        rarity: r.calidad ?? 'comun'
      } as OwnedOption;
    }).filter(Boolean) as OwnedOption[];

    // Prepend a "none" option for categories that support it
    if (avatarAssets[selectedCategory] && Object.prototype.hasOwnProperty.call(avatarAssets[selectedCategory], 'none')) {
      if (!mapped.some(o => o.svgUrl === 'none')) {
        mapped.unshift({ id: -1, svgUrl: 'none', backUrl: null, storeImage: null, rarity: 'comun' });
      }
    }

    // AÑADIR MARCO BRONCE POR DEFAULT SIEMPRE (No importa si no está en inventory)
    if (selectedCategory === 'marco') {
      const BRONCE_URL = 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/cosmeticos_avatar/marco/rangos/bronce/delante_bronce.png';
      const BACK_BRONCE_URL = 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/cosmeticos_avatar/marco/rangos/bronce/atras_bronce.png';
      
      if (!mapped.some(o => o.svgUrl === BRONCE_URL)) {
        mapped.push({ 
          id: 999999, // ID dummy para el default
          svgUrl: BRONCE_URL, 
          backUrl: BACK_BRONCE_URL, 
          storeImage: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/tienda_avatar/marco/rango/marco_tienda_bronce.png', 
          rarity: 'comun' 
        });
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
      case 'marco':
        return draftAvatar.frame_asset;
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
        colors={['#1DC7FF', '#7c3aed']}
        style={styles.gradientBackground}
      />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton} activeOpacity={0.7}>
            <FontAwesome5 name="chevron-left" size={18} color="#fff" />
          </TouchableOpacity>

          <Text style={[styles.headerTitle, { fontFamily: 'Digitalt' }]}>MI AVATAR</Text>

          <TouchableOpacity
            onPress={handleSave}
            style={styles.saveButtonWrapper}
            disabled={!hasUnsavedChanges || isSaving}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={hasUnsavedChanges && !isSaving ? ['#22C55E', '#16A34A'] : ['#94A3B8', '#64748B']}
              style={styles.saveButton}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={[styles.saveButtonText, { fontFamily: 'Digitalt' }]}>LISTO</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Avatar Display Section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarAndPlatform}>
            {/* Spotlight Platform */}
            <View style={styles.platformShadow} />
            <LinearGradient colors={['#fff', '#E0F2FE']} style={styles.platform}>
              <View style={styles.platformInner} />
            </LinearGradient>
            
            <View style={styles.avatarWrapper}>
              <LayeredAvatar
                avatar={{
                  skin_asset: resolveToRemoteUrl('skin', draftAvatar.skin_asset) as any,
                  hair_asset: resolveToRemoteUrl('hair', draftAvatar.hair_asset) as any,
                  hair_back_asset: draftAvatar.hair_back_asset,
                  eyes_asset: resolveToRemoteUrl('eyes', draftAvatar.eyes_asset) as any,
                  mouth_asset: resolveToRemoteUrl('mouth', draftAvatar.mouth_asset) as any,
                  clothes_asset: resolveToRemoteUrl('clothes', draftAvatar.clothes_asset) as any,
                  clothes_back_asset: draftAvatar.clothes_back_asset,
                  frame_asset: resolveToRemoteUrl('marco', draftAvatar.frame_asset) as any,
                  frame_back_asset: resolveToRemoteUrl('marco', draftAvatar.frame_back_asset) as any,
                }}
                size={isVerySmallDevice ? 130 : isSmallDevice ? 160 : 220}
                style={styles.avatar}
              />
            </View>
          </View>
        </View>

        {/* Category Navigation Pill */}
        <View style={styles.categoryPillContainer}>
          <View style={styles.categoryPill}>
            {(Object.keys(categoryConfig) as AvatarCategory[]).map((category) => {
              const config = categoryConfig[category];
              const isSelected = selectedCategory === category;

              return (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryItem,
                    isSelected && styles.categoryItemSelected
                  ]}
                  onPress={() => handleCategorySelect(category)}
                  activeOpacity={0.9}
                >
                  <FontAwesome5
                    name={config.icon}
                    size={18}
                    color={isSelected ? '#fff' : '#A78BFA'}
                  />
                  {isSelected && (
                    <FadeInView duration={200} style={styles.activeDot}>
                      <View />
                    </FadeInView>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Selection Sheet */}
        <View style={styles.selectionSection}>
           <LinearGradient colors={['#8A56FE', '#7C3AED']} style={styles.sheetGradient} />
           
           <View style={styles.sheetHeader}>
              <View style={styles.sheetHandle} />
              <Text style={[styles.categoryTitle, { fontFamily: 'Digitalt' }]}>
                {categoryConfig[selectedCategory].displayName.toUpperCase()}
              </Text>
           </View>

          <ScrollView
            style={styles.assetsScrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {loadingInventory ? (
              <View style={styles.emptyState}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={[styles.emptyText, { fontFamily: 'Digitalt' }]}>CARGANDO...</Text>
              </View>
            ) : ownedOptionsForSelectedCategory.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyText, { fontFamily: 'Digitalt' }]}>VACÍO</Text>
              </View>
            ) : (
              <FadeInView from="bottom" delay={100} duration={400} style={styles.assetsGrid}>
                {ownedOptionsForSelectedCategory.map((opt) => {
                  const isNone = opt.svgUrl === 'none';
                  const currentKey = getCurrentAssetKey() || '';
                  const currentNorm = normalizeValueForCategory(currentKey, selectedCategory);
                  const optionNorm = isNone ? 'none' : normalizeValueForCategory(opt.svgUrl, selectedCategory);
                  const isSelected = currentNorm === optionNorm;
                  
                  return (
                    <TouchableOpacity
                      key={`${selectedCategory}-${opt.id}-${opt.svgUrl}`}
                      activeOpacity={0.9}
                      style={[
                        styles.assetCard,
                        isSelected && styles.assetCardSelected
                      ]}
                      onPress={() => handleAssetSelect(opt.svgUrl)}
                    >
                      {/* Rarity Ribbon */}
                      {!isNone && (
                        <View style={[
                          styles.rarityRibbon,
                          opt.rarity === 'legendario' && styles.rarityRibbonLegendary,
                          opt.rarity === 'epico' && styles.rarityRibbonEpic,
                          opt.rarity === 'raro' && styles.rarityRibbonRaro,
                          opt.rarity === 'comun' && styles.rarityRibbonComun
                        ]}>
                          <Text style={[
                            styles.rarityRibbonText, 
                            { fontFamily: 'Digitalt' },
                            opt.rarity === 'legendario' && styles.rarityTextLegendary,
                          ]}>
                            {opt.rarity?.toUpperCase()}
                          </Text>
                        </View>
                      )}

                      <View style={styles.cardInner}>
                        {isNone ? (
                          <View style={styles.noneWrapper}>
                            <FontAwesome5 name="ban" size={32} color="rgba(255,255,255,0.4)" />
                            <Text style={[styles.noneText, { fontFamily: 'Digitalt' }]}>QUITAR</Text>
                          </View>
                        ) : (
                          <>
                            {/* Solo renderizamos el backUrl en el cuadro si NO hay un storeImage que ya traiga todo combinado */}
                            {selectedCategory === 'marco' && opt.backUrl && !opt.storeImage && (
                              <ExpoImage
                                source={{ uri: opt.backUrl }}
                                style={[styles.assetImage, styles.backLayerImage]}
                                contentFit="contain"
                                cachePolicy="disk"
                              />
                            )}
                            <ExpoImage
                              source={{ uri: opt.storeImage || opt.svgUrl }}
                              style={styles.assetImage}
                              contentFit="contain"
                              cachePolicy="disk"
                            />
                          </>
                        )}
                      </View>

                      {isSelected && (
                        <View style={styles.selectionCheck}>
                          <FontAwesome5 name="check" size={10} color="#fff" />
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

      {/* Custom Confirmation Modal */}
      <Modal
        visible={confirmModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmModal(prev => ({ ...prev, visible: false }))}
      >
        <View style={styles.modalOverlay}>
          <FadeInView from="bottom" duration={300} style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={[styles.modalIconCircle, { backgroundColor: confirmModal.confirmColor[0] }]}>
                <FontAwesome5 name={confirmModal.icon} size={30} color="#fff" />
              </View>
              <Text style={[styles.modalTitle, { fontFamily: 'Digitalt' }]}>{confirmModal.title}</Text>
            </View>
            
            <Text style={[styles.modalMessage, { fontFamily: 'Gilroy-Medium' }]}>{confirmModal.message}</Text>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={confirmModal.onConfirm}
                activeOpacity={0.8}
                style={styles.modalActionWrapper}
              >
                <LinearGradient
                  colors={confirmModal.confirmColor as [string, string]}
                  style={styles.modalActionButton}
                >
                  <Text style={[styles.modalActionText, { fontFamily: 'Digitalt' }]}>{confirmModal.confirmText}</Text>
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={() => {
                  if (confirmModal.title === '¡ESPERA!') {
                    discardChangesAndExit();
                  } else {
                    setConfirmModal(prev => ({ ...prev, visible: false }));
                  }
                }}
                activeOpacity={0.6}
                style={styles.modalCancelButton}
              >
                <Text style={[styles.modalCancelText, { fontFamily: 'Digitalt' }]}>{confirmModal.cancelText}</Text>
              </TouchableOpacity>
            </View>
          </FadeInView>
        </View>
      </Modal>

      {/* Success Message Overlay */}
      {showSuccess && (
        <View style={styles.successOverlay}>
          <FadeInView from="bottom" duration={400} style={styles.successCard}>
            <View style={styles.successIconCircle}>
              <FontAwesome5 name="check" size={30} color="#fff" />
            </View>
            <Text style={[styles.successText, { fontFamily: 'Digitalt' }]}>¡LISTO!</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: isVerySmallDevice ? 5 : 10,
  },
  backButton: {
    width: isVerySmallDevice ? 34 : 38,
    height: isVerySmallDevice ? 34 : 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  headerTitle: {
    color: '#fff',
    fontSize: isVerySmallDevice ? 18 : 22,
    letterSpacing: 2,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  saveButtonWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  saveButton: {
    paddingHorizontal: isVerySmallDevice ? 12 : 20,
    paddingVertical: isVerySmallDevice ? 6 : 10,
    minWidth: isVerySmallDevice ? 70 : 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: isVerySmallDevice ? 14 : 18,
    letterSpacing: 1,
  },

  // Avatar Section
  avatarSection: {
    height: isVerySmallDevice ? height * 0.20 : isSmallDevice ? height * 0.26 : height * 0.35,
    alignItems: 'center',
    justifyContent: 'flex-end',
    position: 'relative',
    paddingBottom: isVerySmallDevice ? 10 : isSmallDevice ? 15 : 20,
  },
  avatarAndPlatform: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  platform: {
    position: 'absolute',
    bottom: 0,
    width: isVerySmallDevice ? 150 : isSmallDevice ? 180 : 240,
    height: isVerySmallDevice ? 30 : isSmallDevice ? 40 : 60,
    borderRadius: 120,
    transform: [{ scaleY: 0.3 }],
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  platformInner: {
    width: '90%',
    height: '90%',
    borderRadius: 120,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  platformShadow: {
    position: 'absolute',
    bottom: -3,
    width: isVerySmallDevice ? 170 : isSmallDevice ? 200 : 260,
    height: isVerySmallDevice ? 40 : isSmallDevice ? 50 : 70,
    borderRadius: 130,
    backgroundColor: 'rgba(0,0,0,0.2)',
    transform: [{ scaleY: 0.3 }],
  },
  avatarWrapper: {
    zIndex: 10,
    marginBottom: isVerySmallDevice ? 10 : 15, // Space between avatar feet and bottom of platform
  },
  avatar: {
    // Styles applied to LayeredAvatar
  },

  // Category Pill
  categoryPillContainer: {
    alignItems: 'center',
    marginVertical: isVerySmallDevice ? 5 : isSmallDevice ? 8 : 15,
    zIndex: 20,
  },
  categoryPill: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 30,
    padding: isVerySmallDevice ? 3 : isSmallDevice ? 4 : 6,
    gap: isVerySmallDevice ? 2 : isSmallDevice ? 4 : 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  categoryItem: {
    width: isVerySmallDevice ? 38 : isSmallDevice ? 42 : 48,
    height: isVerySmallDevice ? 38 : isSmallDevice ? 42 : 48,
    borderRadius: isVerySmallDevice ? 19 : isSmallDevice ? 21 : 24,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  categoryItemSelected: {
    backgroundColor: '#7C3AED',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  activeDot: {
    position: 'absolute',
    bottom: 6,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#fff',
  },

  // Selection Sheet
  selectionSection: {
    flex: 1,
    borderTopLeftRadius: isSmallDevice ? 32 : 40,
    borderTopRightRadius: isSmallDevice ? 32 : 40,
    overflow: 'hidden',
    backgroundColor: '#7C3AED',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  sheetGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    opacity: 0.5,
  },
  sheetHeader: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    marginBottom: 10,
  },
  categoryTitle: {
    color: '#fff',
    fontSize: 20,
    letterSpacing: 2,
    opacity: 0.9,
  },
  assetsScrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 10,
  },
  assetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 12,
  },
  
  // Asset Cards
  assetCard: {
    width: (width - 40 - 24) / 3,
    aspectRatio: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    padding: 8,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  assetCardSelected: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderColor: '#fff',
    transform: [{ scale: 1.05 }],
  },
  cardInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assetImage: {
    width: '100%',
    height: '100%',
  },
  backLayerImage: {
    position: 'absolute',
    transform: [{ scale: 1.1 }], // Un poco más grande para que sobresalga por detrás del frente
  },
  noneWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  noneText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
  },
  selectionCheck: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    borderWidth: 1.5,
    borderColor: '#fff',
  },

  // Rarity Ribbon
  rarityRibbon: {
    position: 'absolute',
    top: 10,
    right: -25,
    width: 100,
    backgroundColor: 'rgba(0,0,0,0.5)',
    transform: [{ rotate: '45deg' }],
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    zIndex: 10,
  },
  rarityRibbonText: {
    color: '#fff',
    fontSize: 8,
  },
  rarityRibbonLegendary: {
    backgroundColor: '#FFD700',
    borderWidth: 1,
    borderColor: '#fff',
  },
  rarityTextLegendary: {
    color: '#000',
  },
  rarityRibbonEpic: {
    backgroundColor: '#D000FF',
    borderWidth: 1,
    borderColor: '#fff',
  },
  rarityRibbonRaro: {
    backgroundColor: '#22C55E',
  },
  rarityRibbonComun: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },

  // Success Overlay
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  successCard: {
    backgroundColor: '#22C55E',
    paddingVertical: 25,
    paddingHorizontal: 40,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#4ADE80',
    elevation: 15,
  },
  successIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  successText: {
    color: '#fff',
    fontSize: 22,
    letterSpacing: 2,
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 15,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 16,
    letterSpacing: 2,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 32,
    width: '100%',
    maxWidth: 340,
    padding: isSmallDevice ? 20 : 24,
    alignItems: 'center',
    borderWidth: 5,
    borderColor: '#E0E7FF',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: isSmallDevice ? 10 : 15,
  },
  modalIconCircle: {
    width: isSmallDevice ? 60 : 70,
    height: isSmallDevice ? 60 : 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: isSmallDevice ? 8 : 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  modalTitle: {
    fontSize: isSmallDevice ? 22 : 26,
    color: '#1E1B4B',
    letterSpacing: 2,
  },
  modalMessage: {
    fontSize: isSmallDevice ? 14 : 16,
    color: '#475569',
    textAlign: 'center',
    marginBottom: isSmallDevice ? 20 : 25,
    lineHeight: isSmallDevice ? 18 : 22,
  },
  modalActions: {
    width: '100%',
    gap: 12,
  },
  modalActionWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  modalActionButton: {
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalActionText: {
    color: '#fff',
    fontSize: 18,
    letterSpacing: 1,
  },
  modalCancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    color: '#94A3B8',
    fontSize: 14,
    letterSpacing: 1,
  },
});

