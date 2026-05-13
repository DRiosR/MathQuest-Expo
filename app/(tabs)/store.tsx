import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import { Avatar } from '@/types/avatar';

import {
  EyeIcon,
  ScissorsIcon,
  SmileyIcon,
  TShirtIcon,
  UserIcon,
  CheckCircle,
} from 'phosphor-react-native';
import React from 'react';
import { FontAwesome5 } from '@expo/vector-icons';

import {
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LayeredAvatar } from '@/components/LayeredAvatar';
import { FadeInView } from '@/components/shared/FadeInView';
import { useAvatar } from '@/contexts/AvatarContext';
import { useFontContext } from '@/contexts/FontsContext';
import { useItemStore } from '@/hooks/useItemStore';
import { getUserInventoryProductIds, incrementCurrentUserCoins, purchaseStoreItem } from '@/services/SupabaseService';
import { router } from 'expo-router';
import TutorialOverlay from '@/components/TutorialOverlay';
import { useTutorial } from '@/contexts/TutorialContext';
import { useFocusEffect } from '@react-navigation/native';

export default function StoreScreen() {
  const { fontsLoaded } = useFontContext();
  const { avatar: userAvatar, updateAvatar } = useAvatar();
  const { items: allItems, isLoadingItems, coins, setCoins, refreshCoins } = useItemStore();
  const { setDynamicSpotlight, startTutorial } = useTutorial();

  const categoryRefs = React.useRef<Record<string, any>>({});
  const coinsRef = React.useRef<View>(null);
  
  const measureCategory = (key: string) => {
    const ref = key === 'coins' ? coinsRef.current : categoryRefs.current[key];
    if (ref) {
      ref.measure((x: number, y: number, w: number, h: number, pageX: number, pageY: number) => {
        const id = key === 'coins' ? 'store_coins' : `store_${key}`;
        setDynamicSpotlight(id, { x: pageX, y: pageY, w, h, radius: 20 });
      });
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      setPreviewAvatar(userAvatar);
      const timer = setTimeout(() => {
        ['skin', 'hair', 'eyes', 'mouth', 'clothes', 'coins'].forEach(key => measureCategory(key));
      }, 1500);
      return () => clearTimeout(timer);
    }, [userAvatar])
  );

  const [previewAvatar, setPreviewAvatar] = React.useState<Avatar>(userAvatar);
  const [showMoneyCalc, setShowMoneyCalc] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (userAvatar) {
      setPreviewAvatar(userAvatar);
      triggerBounce();
    }
  }, [userAvatar]);

  // Trigger bounce when preview changes manually
  const updatePreview = (newAvatar: any) => {
    setPreviewAvatar(newAvatar);
  };

  const [selectedCategory, setSelectedCategory] = React.useState<
    'skin' | 'hair' | 'eyes' | 'mouth' | 'clothes'
  >('eyes');
  const [selectedItem, setSelectedItem] = React.useState<{
    id: string;
    price: number;
    thumbnail?: any;
    SvgComp?: any;
    categoryLabel: string;
    rarity: string | null;
  } | null>(null);
  const [isPurchasing, setIsPurchasing] = React.useState<boolean>(false);
  const rotateValue = React.useRef(new Animated.Value(0)).current;
  const previewScale = React.useRef(new Animated.Value(1)).current;
  const idleAnim = React.useRef(new Animated.Value(0)).current;
  const [showSuccess, setShowSuccess] = React.useState<boolean>(false);
  const [purchasedItem, setPurchasedItem] = React.useState<any>(null);
  const [isEquipping, setIsEquipping] = React.useState<boolean>(false);

  // Idle animation (breathing)
  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(idleAnim, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(idleAnim, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const triggerBounce = () => {
    previewScale.setValue(0.9);
    Animated.spring(previewScale, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  React.useEffect(() => {
    if (isPurchasing) {
      rotateValue.setValue(0);
      const animation = Animated.loop(
        Animated.timing(rotateValue, {
          toValue: 1,
          duration: 900,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      animation.start();
      return () => {
        animation.stop();
      };
    }
  }, [isPurchasing, rotateValue]);

  const { width, height } = Dimensions.get('window');
  const SIDE_PAD = 14;
  const CARD_GAP = 10;
  const CARD_SIZE = Math.floor((width - SIDE_PAD * 2 - CARD_GAP * 2) / 3); 
  const CARD_HEIGHT = CARD_SIZE + 16; 
  
  // Responsive Avatar Sizing
  const TOP_SECTION_HEIGHT = height * 0.42;
  const AVATAR_IMAGE_SIZE = Math.min(width * 0.78, height * 0.34);
  const AVATAR_CIRCLE_SIZE = AVATAR_IMAGE_SIZE * 0.80; // Más pequeño para que el marco sea el protagonista

  const CARD_RADIUS = 24;
  const [ownedProductIds, setOwnedProductIds] = React.useState<number[]>([]);

  const refreshOwned = React.useCallback(async () => {
    const ids = await getUserInventoryProductIds();
    setOwnedProductIds(ids);
  }, []);

  React.useEffect(() => {
    // Load owned items initially
    refreshOwned();
  }, [refreshOwned]);

  const categories: {
    key: 'skin' | 'hair' | 'eyes' | 'mouth' | 'clothes';
    label: string;
    Icon: any;
  }[] = [
    { key: 'skin', label: 'Piel', Icon: UserIcon },
    { key: 'hair', label: 'Cabello', Icon: ScissorsIcon },
    { key: 'eyes', label: 'Ojos', Icon: EyeIcon },
    { key: 'mouth', label: 'Boca', Icon: SmileyIcon },
    { key: 'clothes', label: 'Ropa', Icon: TShirtIcon },
  ];

  // Build items from DB for the selected category
  const items = React.useMemo(() => {
    return allItems
      .filter((it) => it.category === selectedCategory)
      .map((it) => ({
        id: it.id,
        price: it.price,
        thumbnail: it.storeImage ? { uri: it.storeImage } : undefined,
        svgUrl: it.svgUrl,
        backUrl: it.backUrl,
        SvgComp: undefined,
        rarity: it.rarity,
      }));
  }, [allItems, selectedCategory]);

  const getRarityColor = (rarity: string | null) => {
    switch (rarity) {
      case 'comun': return '#94A3B8';
      case 'raro': return '#22C55E';
      case 'epico': return '#9333EA';
      case 'legendario': return '#F59E0B';
      default: return '#B35BDC';
    }
  };


  const closeModal = () => {
    setSelectedItem(null);
    setPreviewAvatar(userAvatar);
  };

  const handleDebugAddCoins = React.useCallback(async () => {
    try {
      const newAmount = await incrementCurrentUserCoins(500);
      setCoins(newAmount);
    } catch (err) {
      // Fallback to server value if increment failed
      try {
        await (refreshCoins?.());
      } catch {
        // ignore secondary failure
      }
    }
  }, [refreshCoins, setCoins]);

    const renderItem = ({ item, index }: { item: { id: string; SvgComp: any; price: number; thumbnail?: any; svgUrl: string | null; rarity: string | null }, index: number }) => {
      const CategoryIcon = categories.find(c => c.key === selectedCategory)?.Icon || EyeIcon;
      const SvgIcon = item.SvgComp;
      const imgSource = item.thumbnail;
      const categoryLabel = categories.find(c => c.key === selectedCategory)?.label ?? '';
      const numericId = Number(item.id);
      const isOwned = ownedProductIds.includes(numericId);

      return (
        <TouchableOpacity
          onPress={() => {
            setSelectedItem({
              id: item.id,
              price: item.price,
              thumbnail: item.thumbnail,
              SvgComp: SvgIcon,
              categoryLabel,
              rarity: item.rarity,
            });

            // Update preview avatar
            if (item.svgUrl) {
              updatePreview({
                ...previewAvatar,
                [`${selectedCategory}_asset`]: item.svgUrl,
                [`${selectedCategory}_back_asset`]: (item as any).backUrl || undefined
              });
            }
          }}

          activeOpacity={0.9}
          style={{
            width: CARD_SIZE,
            height: CARD_HEIGHT,
            marginRight: index % 3 !== 2 ? CARD_GAP : 0,
            marginBottom: CARD_GAP,
            backgroundColor: '#B35BDC',
            borderRadius: CARD_RADIUS,
            padding: 4, // Reducido para dar más espacio al arte
            justifyContent: 'flex-end',
            overflow: 'hidden',
          }}
        >
        <View style={[
          styles.rarityBadge,
          item.rarity === 'legendario' && styles.rarityBadgeLegendary,
          item.rarity === 'epico' && styles.rarityBadgeEpic,
          item.rarity === 'raro' && styles.rarityBadgeRaro,
          item.rarity === 'comun' && styles.rarityBadgeComun
        ]}>
          <Text style={[
            styles.rarityBadgeText, 
            fontsLoaded ? { fontFamily: 'Digitalt' } : null,
            item.rarity === 'legendario' && styles.rarityBadgeTextLegendary,
            item.rarity === 'epico' && styles.rarityBadgeTextEpic,
            item.rarity === 'raro' && styles.rarityBadgeTextRaro,
            item.rarity === 'comun' && styles.rarityBadgeTextComun
          ]}>
            {item.rarity?.toUpperCase()}
          </Text>
        </View>
        <View pointerEvents="none" style={[styles.cardInnerStroke, { borderRadius: CARD_RADIUS }]} />
        <View style={styles.cardIconWrap}>
          <CategoryIcon size={14} color="#B08AFD" weight="fill" />
        </View>

        <View style={styles.cardArt}>
          {imgSource ? (
            <Image 
              source={imgSource} 
              style={[
                styles.thumbnailImage, 
                selectedCategory === 'eyes' || selectedCategory === 'mouth' ? { width: 125, height: 125, transform: [{scale: 1.2}] } :
                selectedCategory === 'skin' ? { width: 85, height: 85 } : 
                { width: 105, height: 105 }
              ]} 
            />
          ) : item.SvgComp ? (
            <item.SvgComp width={80} height={80} />
          ) : null}
        </View>

        <View style={styles.priceRow}>
          <Image source={require('@/assets/images/store/MQ-coin.png')} style={styles.coinPng} />
          <Text style={[styles.priceText, fontsLoaded ? { fontFamily: 'Digitalt' } : null]}>
            {item.price}
          </Text>
        </View>
        {isOwned && (
          <View pointerEvents="none" style={styles.purchasedOverlay}>
            <Text style={styles.purchasedText}>COMPRADO!</Text>
          </View>
        )}
      </TouchableOpacity>
    );
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
      <LinearGradient colors={['#7C3AED', '#B35BDC']} style={styles.gradientBackground} />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Top section with cyan bg and Calc sitting on sheet */}
        <View style={[styles.topSection, { height: TOP_SECTION_HEIGHT }]}>
          {/* Header: avatar left, coins right */}
          <View style={styles.header}>
            <View style={{ flex: 1 }} />
            <View style={styles.headerRight}>
              <TouchableOpacity 
                onPress={() => startTutorial('store')}
                activeOpacity={0.7}
                style={styles.helpButton}
              >
                <FontAwesome5 name="question-circle" size={24} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity 
                ref={coinsRef}
                onLayout={() => measureCategory('coins')}
                onPress={handleDebugAddCoins} 
                activeOpacity={0.8} 
                style={styles.coinsPill}
              >

                <Image source={require('@/assets/images/store/MQ-coin.png')} style={styles.coinPng} />
                <Text style={[styles.coinsText, { fontFamily: 'Digitalt' }]}>{coins}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* User Avatar Preview (Dynamic) */}
          <View style={styles.avatarPreviewWrap}>
              <Animated.View style={[
                styles.avatarPreviewBg,
                {
                  width: AVATAR_CIRCLE_SIZE,
                  height: AVATAR_CIRCLE_SIZE,
                  borderRadius: AVATAR_CIRCLE_SIZE / 2,
                  transform: [
                    { scale: previewScale },
                    { translateY: idleAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }
                  ]
                }
              ]}>
                <LayeredAvatar 
                  avatar={previewAvatar}
                  size={AVATAR_IMAGE_SIZE}
                  scale={1.0}
                />
              </Animated.View>
          </View>

        </View>


        {/* Bottom sheet area with categories + grid (scrollable) */}
        <View style={[styles.sheet, { paddingHorizontal: SIDE_PAD }]}>
          {/* Categories row */}
          <View style={styles.categoriesRow}>
            {categories.map((cat) => {
              const isActive = selectedCategory === cat.key;
              const Icon = cat.Icon;
              return (
                <TouchableOpacity
                  key={cat.key}
                  ref={(el) => { categoryRefs.current[cat.key] = el; }}
                  onLayout={() => measureCategory(cat.key)}
                  onPress={() => setSelectedCategory(cat.key)}
                  activeOpacity={0.9}
                  style={[styles.categoryButton, isActive && styles.categoryButtonActive]}
                >
                  <Icon size={18} color={isActive ? '#5B31E7' : '#E7D6FF'} weight={isActive ? 'fill' : 'regular'} />
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Grid of items: 3 per row */}
          {isLoadingItems ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fff' }}>Cargando tienda…</Text>
            </View>
          ) : (
            <FadeInView key={`${selectedCategory}-loaded`} from="bottom" delay={120} duration={450} style={{ flex: 1 }}>
              <FlatList
                data={items}
                keyExtractor={(it) => it.id}
                numColumns={3}
                renderItem={renderItem}
                columnWrapperStyle={{ justifyContent: 'flex-start' }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.gridContent}
              />
            </FadeInView>
          )}
        </View>
      </SafeAreaView>
      {/* Purchase Modal */}
      <Modal
        visible={!!selectedItem}
        animationType="fade"
        transparent
        onRequestClose={closeModal}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity style={styles.backdropTouch} activeOpacity={1} onPress={closeModal} />
          <View style={styles.modalCard}>
            <TouchableOpacity style={styles.modalClose} onPress={closeModal}>
              <Text style={styles.modalCloseText}>×</Text>
            </TouchableOpacity>
             <Text style={[styles.modalTitle, fontsLoaded ? { fontFamily: 'Digitalt' } : null]}>
              {`COMPRAR ${selectedItem?.categoryLabel?.toUpperCase() ?? ''} POR`}
            </Text>

            {selectedItem?.rarity && (
              <View style={[
                styles.modalRarityBadge,
                selectedItem.rarity === 'legendario' && styles.rarityBadgeLegendary,
                selectedItem.rarity === 'epico' && styles.rarityBadgeEpic,
                selectedItem.rarity === 'raro' && styles.rarityBadgeRaro,
                selectedItem.rarity === 'comun' && styles.rarityBadgeComun
              ]}>
                <Text style={[
                  styles.rarityBadgeText,
                  fontsLoaded ? { fontFamily: 'Digitalt' } : null,
                  { fontSize: 14 },
                  selectedItem.rarity === 'legendario' && styles.rarityBadgeTextLegendary,
                  selectedItem.rarity === 'epico' && styles.rarityBadgeTextEpic,
                  selectedItem.rarity === 'raro' && styles.rarityBadgeTextRaro,
                  selectedItem.rarity === 'comun' && styles.rarityBadgeTextComun
                ]}>
                  {selectedItem.rarity.toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.modalPriceRow}>
              <Image source={require('@/assets/images/store/MQ-coin.png')} style={styles.modalCoin} />
              <Text style={[styles.modalPrice, fontsLoaded ? { fontFamily: 'Digitalt' } : null]}>
                {selectedItem?.price ?? 0}
              </Text>
            </View>
            <View style={styles.modalArt}>
              {selectedItem?.thumbnail ? (
                <Image source={selectedItem.thumbnail} style={styles.modalThumbnail} />
              ) : selectedItem?.SvgComp ? (
                <selectedItem.SvgComp width={96} height={96} />
              ) : null}
            </View>
            <TouchableOpacity
              activeOpacity={0.9}
              disabled={
                !selectedItem ||
                ownedProductIds.includes(Number(selectedItem?.id)) ||
                coins < (selectedItem?.price ?? 0) ||
                isPurchasing
              }
              onPress={async () => {
                if (!selectedItem) return;
                if (ownedProductIds.includes(Number(selectedItem.id))) return;
                if (coins < selectedItem.price) return;
                setIsPurchasing(true);
                try {
                  const productId = Number(selectedItem.id);
                  const result = await purchaseStoreItem(productId, selectedItem.price);
                  if (result.status === 'purchased') {
                    setCoins(result.coins);
                    setShowMoneyCalc(true);
                    setOwnedProductIds(prev => (prev.includes(productId) ? prev : [...prev, productId]));
                    
                    // Prepare data for equipping
                    setPurchasedItem({
                      id: productId,
                      category: selectedCategory,
                      svgUrl: items.find(it => it.id === selectedItem.id)?.svgUrl,
                      backUrl: items.find(it => it.id === selectedItem.id)?.backUrl,
                    });

                    // Show success modal with equip options
                    setShowSuccess(true);
                    // Do NOT auto-close anymore, wait for user choice

                    closeModal();
                  } else if (result.status === 'already_owned') {
                    await (refreshCoins?.());
                    await refreshOwned();
                    closeModal();
                  } else {
                    // insufficient funds, keep modal open; UI already shows disabled state when not enough coins
                  }
                } catch (e) {
                  // On any error, refresh server truth
                  try {
                    await (refreshCoins?.());
                    await refreshOwned();
                  } catch {}
                } finally {
                  setIsPurchasing(false);
                }
              }}
              style={[
                styles.buyButton,
                (
                  !selectedItem ||
                  ownedProductIds.includes(Number(selectedItem?.id)) ||
                  coins < (selectedItem?.price ?? 0) ||
                  isPurchasing
                ) && styles.buyButtonDisabled,
              ]}
            >
              <Text style={styles.buyButtonText}>
                {ownedProductIds.includes(Number(selectedItem?.id))
                  ? 'COMPRADO!'
                  : (coins < (selectedItem?.price ?? 0)
                      ? 'SIN MONEDAS'
                      : (isPurchasing ? 'COMPRANDO...' : 'COMPRAR!'))}
              </Text>
            </TouchableOpacity>
            {isPurchasing && (
              <View style={styles.purchasingOverlay}>
                <Animated.Image
                  source={require('@/assets/images/store/MQ-coin.png')}
                  style={[
                    styles.purchasingCoin,
                    {
                      transform: [
                        {
                          rotate: rotateValue.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0deg', '360deg'],
                          }),
                        },
                      ],
                    },
                  ]}
                />
                <Text style={styles.purchasingOverlayText}>COMPRANDO...</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
      <TutorialOverlay />
      
      {showSuccess && (
        <FadeInView style={styles.successOverlay} duration={300}>
          <View style={styles.successCard}>
             <View style={styles.successIconCircle}>
                <CheckCircle size={40} color="#fff" weight="fill" />
             </View>
             <Text style={[styles.successText, fontsLoaded ? { fontFamily: 'Digitalt' } : null]}>¡COMPRA EXITOSA!</Text>
             
             <View style={styles.equipButtonsRow}>
               <TouchableOpacity 
                 activeOpacity={0.8}
                 disabled={isEquipping}
                 style={[styles.equipButton, styles.equipNowButton]}
                 onPress={async () => {
                   if (!purchasedItem) return;
                   setIsEquipping(true);
                   try {
                     const newAvatar = { ...userAvatar };
                     (newAvatar as any)[`${purchasedItem.category}_asset`] = purchasedItem.svgUrl;
                     if (purchasedItem.category === 'hair' || purchasedItem.category === 'clothes') {
                       (newAvatar as any)[`${purchasedItem.category}_back_asset`] = purchasedItem.backUrl;
                     }
                     await updateAvatar(newAvatar);
                     setShowSuccess(false);
                     setPurchasedItem(null);
                   } catch (err) {
                     console.error("Error equipping:", err);
                   } finally {
                     setIsEquipping(false);
                   }
                 }}
               >
                 <Text style={styles.equipButtonText}>
                   {isEquipping ? 'EQUIPANDO...' : 'EQUIPAR AHORA'}
                 </Text>
               </TouchableOpacity>

               <TouchableOpacity 
                 activeOpacity={0.8}
                 disabled={isEquipping}
                 style={[styles.equipButton, styles.equipLaterButton]}
                 onPress={() => {
                   setShowSuccess(false);
                   setPurchasedItem(null);
                 }}
               >
                 <Text style={styles.equipButtonText}>DESPUÉS</Text>
               </TouchableOpacity>
             </View>
          </View>
        </FadeInView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end', 
    alignItems: 'center',
    padding: 20,
    paddingBottom: 80,
  },
  backdropTouch: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    width: '95%',
    maxWidth: 400,
    backgroundColor: '#A955F7',
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 16,
    borderWidth: 4,
    borderColor: '#C87CFF',
    alignItems: 'center',
  },
  modalClose: {
    position: 'absolute',
    right: 12,
    top: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    zIndex: 10,
  },
  modalCloseText: {
    color: '#fff',
    fontSize: 22,
    lineHeight: 22,
    fontWeight: '900',
  },
  modalRarityBadge: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    letterSpacing: 1,
    marginTop: 4,
    marginBottom: 8,
  },
  modalPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  modalCoin: {
    width: 22,
    height: 22,
    resizeMode: 'contain',
  },
  modalPrice: {
    color: '#fff',
    fontSize: 48,
    fontWeight: 'bold',
  },
  modalArt: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  modalThumbnail: {
    width: 96,
    height: 96,
    resizeMode: 'contain',
  },
  buyButton: {
    marginTop: 6,
    backgroundColor: '#22C55E',
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 18,
    minWidth: 220,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  buyButtonDisabled: {
    backgroundColor: 'rgba(34,197,94,0.45)',
  },
  buyButtonText: {
    color: '#ffffff',
    fontWeight: '900',
    letterSpacing: 1,
    fontSize: 20,
  },
  cardInnerStroke: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 5,
    borderColor: 'rgba(255,255,255,0.2)',
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
    backgroundColor: '#1DC7FF', // make top safe area same sky blue
  },
  topSection: {
    backgroundColor: '#1DC7FF',
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 6,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#fff',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  layeredAvatar: {
    borderRadius: 24,
  },
  coinsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 18,
  },
  coinWrap: {
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coinsText: {
    color: '#ffffff',
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  avatarPreviewWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    bottom: 50, // Subido de 15 a 50 para que el avatar esté más alto
    left: 0,
    right: 0,
    zIndex: 10,
  },
  avatarPreviewBg: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center', // Centrado para que coincida con el marco
    borderWidth: 6,
    borderColor: 'rgba(255,255,255,0.4)',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  sheet: {
    flex: 1,
    backgroundColor: '#8A56FE',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 20,
    paddingBottom: 8,
    marginTop: 0,
  },
  categoriesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 6,
  },
  categoryButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  categoryButtonActive: {
    backgroundColor: '#EBDDFF',
  },
  gridContent: {
    paddingBottom: 120,
    gap: 10,
  },
  card: {
    flex: 1 / 3,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 24,
    padding: 10,
    margin: 5,
    minHeight: 120,
    justifyContent: 'space-between',
  },
  cardIconWrap: {
    position: 'absolute',
    right: 8,
    top: 8,
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardArt: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 5,
    marginBottom: 5,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingBottom: 2,
  },
  coinPng: {
    width: 18,
    height: 18,
    resizeMode: 'contain',
  },
  priceText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  thumbnailImage: {
    width: 105, // Aumentado significativamente
    height: 105,
    resizeMode: 'contain',
  },
  purchasingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
  },
  purchasingCoin: {
    width: 54,
    height: 54,
    marginBottom: 8,
    resizeMode: 'contain',
  },
  purchasingOverlayText: {
    color: '#fff',
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  purchasedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
  },
  purchasedText: {
    color: '#FFFFFF',
    fontWeight: '900',
    letterSpacing: 1,
    fontSize: 16,
  },
  helpButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spotlightSweep: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.3,
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
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 20,
  },
  equipButtonsRow: {
    flexDirection: 'column',
    gap: 12,
    width: '100%',
    alignItems: 'center',
  },
  equipButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    minWidth: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  equipNowButton: {
    backgroundColor: '#fff',
  },
  equipLaterButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  equipButtonText: {
    color: '#10B981',
    fontWeight: '900',
    fontSize: 16,
  },
  rarityBadge: {
    position: 'absolute',
    top: 12,
    right: -25,
    width: 100,
    backgroundColor: 'rgba(0,0,0,0.35)',
    transform: [{ rotate: '45deg' }],
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    zIndex: 10,
  },
  rarityBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  rarityBadgeLegendary: {
    backgroundColor: '#FFD700',
    borderWidth: 1,
    borderColor: '#fff',
    shadowColor: '#FFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 8,
  },
  rarityBadgeTextLegendary: {
    color: '#000',
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  rarityBadgeEpic: {
    backgroundColor: '#D000FF', // Neon Purple
    borderWidth: 1,
    borderColor: '#fff',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 5,
    elevation: 6,
  },
  rarityBadgeTextEpic: {
    color: '#fff',
    textShadowColor: 'rgba(255, 255, 255, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 3,
  },
  rarityBadgeRaro: {
    backgroundColor: '#22C55E',
  },
  rarityBadgeTextRaro: {
    color: '#fff',
  },
  rarityBadgeComun: {
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  rarityBadgeTextComun: {
    color: 'rgba(255,255,255,0.7)',
  },
});

