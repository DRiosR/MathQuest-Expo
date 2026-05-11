import { avatarAssets } from '@/constants/avatarAssets';
import { Avatar } from '@/types/avatar';
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, Image } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { SvgUri } from 'react-native-svg';

interface LayeredAvatarProps {
  avatar: Avatar;
  size?: number;
  style?: any;
}

const RemoteSvgLayer: React.FC<{ uri: string; size: number }> = ({ uri, size }) => {
  const [localUri, setLocalUri] = useState<string | null>(uri); 

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const dir = FileSystem.cacheDirectory ? `${FileSystem.cacheDirectory}svgs/` : null;
        if (!dir) return;

        await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {});
        // Usar un hash simple para el nombre del archivo para evitar caracteres inválidos
        const safeName = uri.split('/').pop() || 'temp';
        const fileUri = `${dir}${safeName}`;
        
        const info = await FileSystem.getInfoAsync(fileUri);
        if (!info.exists) {
          await FileSystem.downloadAsync(uri, fileUri);
        }
        
        if (mounted) setLocalUri(fileUri);
      } catch (err) {
        // console.warn('Error en cache de SVG:', err);
      }
    })();
    return () => { mounted = false; };
  }, [uri]);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <SvgUri 
        uri={localUri || uri} 
        width="100%" 
        height="100%" 
        preserveAspectRatio="xMidYMid meet"
      />
    </View>
  );
};

function isRemoteUrl(value: string | undefined): boolean {
  if (!value) return false;
  const v = String(value);
  return v.startsWith('http://') || v.startsWith('https://') || v.startsWith('file://');
}

export const LayeredAvatar: React.FC<LayeredAvatarProps> = ({
  avatar,
  size = 120,
  style,
}) => {
  const layers = useMemo(() => ([
    ['hair_back', avatar.hair_back_asset],
    ['skin', avatar.skin_asset],
    ['eyes', avatar.eyes_asset],
    ['mouth', avatar.mouth_asset],
    ['clothes', avatar.clothes_asset],
    ['hair', avatar.hair_asset],
  ] as Array<[keyof typeof avatarAssets, string | undefined]>), [avatar]);

  const getLayerStyle = (value: string | undefined) => {
    if (!value) return {};
    const styles: any = { transform: [] };
    
    // Detectar si el asset es del nuevo sistema (store)
    const isNewSystem = value?.includes('_store') || 
                        value?.includes('AvatarItems') || 
                        value?.includes('cosmeticos_avatar') ||
                        value?.includes('tienda_avatar') ||
                        value?.includes('/prendas/');

    if (isNewSystem) {
      styles.transform.push({ scale: 1.1 }); 
      styles.transform.push({ translateY: 5 }); 
    } else if (value && (value.includes('eyes_04.svg') || value.includes('eyes_05.svg'))) {
      styles.transform.push({ translateX: 8 });
      styles.transform.push({ translateY: 9 });
    }

    if (styles.transform.length === 0) delete styles.transform;
    return styles;
  };

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      {layers.map(([category, value]) => {
        if (!value || value === 'none') return null;
        
        const LocalAsset = avatarAssets[category][value as any];
        
        let content = null;
        if (LocalAsset) {
          if (typeof LocalAsset === 'function') {
            content = <LocalAsset width={size} height={size} />;
          } else {
            content = <Image source={LocalAsset} style={{ width: size, height: size }} resizeMode="contain" />;
          }
        } else if (isRemoteUrl(value)) {
          if (value.toLowerCase().includes('.svg')) {
            content = <RemoteSvgLayer uri={value} size={size} />;
          } else {
            content = <Image source={{ uri: value }} style={{ width: size, height: size }} resizeMode="contain" />;
          }
        }

        return (
          <View 
            key={`${category}-${value}`} 
            style={[styles.layer, getLayerStyle(value)]}
          >
            {content}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  layer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
