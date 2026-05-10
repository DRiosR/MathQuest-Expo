import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import { Avatar } from '@/types/avatar';

import {
  EyeIcon,
  ScissorsIcon,
  SmileyIcon,
  TShirtIcon,
  UserIcon,
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
  const { avatar: userAvatar } = useAvatar();
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
    setPreviewAvatar(userAvatar);
  }, [userAvatar]);

  const [selectedCategory, setSelectedCategory] = React.useState<
    'skin' | 'hair' | 'eyes' | 'mouth' | 'clothes'
  >('eyes');
  const [selectedItem, setSelectedItem] = React.useState<{
    id: string;
    price: number;
    thumbnail?: any;
    SvgComp?: any;
    categoryLabel: string;
  } | null>(null);
  const [isPurchasing, setIsPurchasing] = React.useState<boolean>(false);
  const rotateValue = React.useRef(new Animated.Value(0)).current;

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
  const CARD_SIZE = Math.floor((width - SIDE_PAD * 2 - CARD_GAP * 2) / 3); // 3 items per row, avoid fractional pixels
  const CARD_HEIGHT = CARD_SIZE + 16; // slightly taller than width
  const TOP_SECTION_HEIGHT = height * 0.38;
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
        SvgComp: undefined,
      }));
  }, [allItems, selectedCategory]);


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

    const renderItem = ({ item, index }: { item: { id: string; SvgComp: any; price: number; thumbnail?: any; svgUrl: string | null }, index: number }) => {
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
            });

            // Update preview avatar
            if (item.svgUrl) {
              setPreviewAvatar(prev => ({
                ...prev,
                [`${selectedCategory}_asset`]: item.svgUrl
              }));
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
            padding: 10,
            justifyContent: 'flex-end',
            overflow: 'hidden',
          }}
        >
        <View pointerEvents="none" style={[styles.cardInnerStroke, { borderRadius: CARD_RADIUS }]} />
        <View style={styles.cardIconWrap}>
          <CategoryIcon size={14} color="#B08AFD" weight="fill" />
        </View>
        <View style={styles.cardArt}>
          {imgSource ? (
            <Image source={imgSource} style={styles.thumbnailImage} />
          ) : SvgIcon ? (
            <SvgIcon width={72} height={72} />
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
            <View style={styles.avatarPreviewBg}>
              <LayeredAvatar 
                avatar={previewAvatar}
                size={210}
              />
            </View>
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
                    // Keep the preview on for a second or close immediately? 
                    // User said "cuando se deje de seleccionar se quite", so if purchased, maybe it should stay?
                    // But if it's not saved to context, it will reset on focus anyway.
                    // For now, let's just close as before.
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
    justifyContent: 'flex-end', // Move modal to bottom to show avatar
    alignItems: 'center',
    padding: 20,
    paddingBottom: 40,
  },
  backdropTouch: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    width: '90%',
    maxWidth: 360,
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
    left: 12,
    top: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  modalCloseText: {
    color: '#fff',
    fontSize: 22,
    lineHeight: 22,
    fontWeight: '900',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 16,
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
    fontSize: 36,
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
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 16,
    minWidth: 180,
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
    fontSize: 16,
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
    bottom: 15,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  avatarPreviewBg: {
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
    paddingLeft: 10, // Mueve el avatar un poco a la derecha
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
    marginTop: 0,
    marginBottom: 8,
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
    width: 72,
    height: 72,
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
});

