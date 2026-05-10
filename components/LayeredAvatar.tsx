import { avatarAssets } from '@/constants/avatarAssets';
import { Avatar } from '@/types/avatar';
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { SvgUri } from 'react-native-svg';

interface LayeredAvatarProps {
  avatar: Avatar;
  size?: number;
  style?: any;
}

const RemoteSvgLayer: React.FC<{ uri: string; size: number }> = ({ uri, size }) => {
  const [localUri, setLocalUri] = useState<string | null>(uri); // Empezar con la URL de red para carga inmediata

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const dir = FileSystem.cacheDirectory ? `${FileSystem.cacheDirectory}svgs/` : null;
        if (!dir) return;

        await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {});
        const safeName = encodeURIComponent(uri).slice(0, 150); // Nombre más corto para evitar errores de sistema
        const fileUri = `${dir}${safeName}.svg`;
        
        const info = await FileSystem.getInfoAsync(fileUri);
        if (!info.exists) {
          await FileSystem.downloadAsync(uri, fileUri);
        }
        
        if (mounted) setLocalUri(fileUri);
      } catch (err) {
        console.warn('Error en cache de SVG:', err);
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

function isRemoteSvg(value: string | undefined): value is string {
  if (!value) return false;
  const v = String(value);
  return v.startsWith('http://') || v.startsWith('https://') || v.startsWith('file://') || /\.svg(\?|#|$)/i.test(v) || v.includes('/');
}

export const LayeredAvatar: React.FC<LayeredAvatarProps> = ({
  avatar,
  size = 120,
  style,
}) => {
  const layers = useMemo(() => ([
    ['skin', avatar.skin_asset],
    ['eyes', avatar.eyes_asset],
    ['mouth', avatar.mouth_asset],
    ['clothes', avatar.clothes_asset],
    ['hair', avatar.hair_asset],
  ] as Array<[keyof typeof avatarAssets, string | undefined]>), [avatar]);

  const getLayerStyle = (value: string | undefined) => {
    if (!value) return {};
    const styles: any = {};
    
    // Ajuste específico para ojos desalineados (eyes_04 y eyes_05)
    if (value.includes('eyes_04.svg') || value.includes('eyes_05.svg')) {
      styles.transform = [
        { translateX: 8 }, // Un poco a la izquierda (de 10 a 8)
        { translateY: 9 }  // Un poco más abajo (de 7 a 9)
      ];
    }
    return styles;
  };

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      {layers.map(([category, value]) => {
        if (!value || value === 'none') return null;
        const LocalComp = avatarAssets[category][value as any];
        return (
          <View 
            key={`${category}-${value}`} 
            style={[styles.layer, getLayerStyle(value)]}
          >
            {LocalComp
              ? <LocalComp width={size} height={size} />
              : (isRemoteSvg(value) ? <RemoteSvgLayer uri={value} size={size} /> : null)}
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

