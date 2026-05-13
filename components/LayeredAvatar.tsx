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
  scale?: number;
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
  scale,
}) => {
  const layers = useMemo(() => ([
    ['marco', (avatar as any).frame_back_asset],
    ['hair_back', avatar.hair_back_asset],
    ['skin', avatar.skin_asset],
    ['eyes', avatar.eyes_asset],
    ['mouth', avatar.mouth_asset],
    ['clothes', avatar.clothes_asset],
    ['hair', avatar.hair_asset],
    ['marco_front', (avatar as any).frame_asset],
  ] as Array<[keyof typeof avatarAssets, string | undefined]>), [avatar]);

  const getLayerStyle = (category: string, value: string | undefined) => {
    if (!value) return {};
    const styles: any = { transform: [] };
    
    const isNewSystem = value?.includes('_store') || 
                        value?.includes('AvatarItems') || 
                        value?.includes('cosmeticos_avatar') ||
                        value?.includes('tienda_avatar') ||
                        value?.includes('/prendas/');

    if (isNewSystem) {
      let finalScale = scale ?? 1.0;
      // Cuerpo al 75% del tamaño del contenedor para dejar espacio al marco
      if (category !== 'marco_front' && category !== 'marco_back') {
        finalScale *= 0.75; 
      }
      styles.transform.push({ scale: finalScale }); 
    }

    if (styles.transform.length === 0) delete styles.transform;
    return styles;
  };

  const renderLayer = (category: string, value: string | undefined, customSize?: number) => {
    if (!value || value === 'none') return null;
    
    const LocalAsset = (avatarAssets as any)[category === 'marco_front' || category === 'marco_back' ? 'marco' : category]?.[value as any];
    const baseSize = customSize ?? size;
    
    let content = null;
    if (LocalAsset) {
      if (typeof LocalAsset === 'function') {
        content = <LocalAsset width={baseSize} height={baseSize} />;
      } else {
        content = <Image source={LocalAsset} style={{ width: baseSize, height: baseSize }} resizeMode="contain" />;
      }
    } else if (isRemoteUrl(value)) {
      if (value.toLowerCase().includes('.svg')) {
        content = <RemoteSvgLayer uri={value} size={baseSize} />;
      } else {
        content = <Image source={{ uri: value }} style={{ width: baseSize, height: baseSize }} resizeMode="contain" />;
      }
    }

    return (
      <View key={`${category}-${value}`} style={[styles.layer, getLayerStyle(category, value)]}>
        {content}
      </View>
    );
  };

  // Unificamos el desplazamiento para todo el cuerpo
  const bodyOffsetY = size * 0.08;

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      {/* 0. Marco Trasero - 1.1x */}
      {renderLayer('marco_back', (avatar as any).frame_back_asset, size * 1.1)}

      {/* Contenedor Maestro del Cuerpo (Todo lo que no es marco) */}
      <View style={[StyleSheet.absoluteFill, { transform: [{ translateY: bodyOffsetY }] }]}>
        
        {/* Capas traseras externas al recorte */}
        {renderLayer('hair_back', avatar.hair_back_asset)}
        {renderLayer('clothes_back', (avatar as any).clothes_back_asset)}

        {/* El "Core" del avatar (Piel, ojos, boca, ropa) - Recortado en círculo */}
        <View style={{ 
          width: size, 
          height: size, 
          borderRadius: size / 2, 
          overflow: 'hidden', 
          alignItems: 'center', 
          justifyContent: 'center',
          alignSelf: 'center'
        }}>
          {renderLayer('skin', avatar.skin_asset)}
          {renderLayer('eyes', avatar.eyes_asset)}
          {renderLayer('mouth', avatar.mouth_asset)}
          {renderLayer('clothes', avatar.clothes_asset)}
        </View>

        {/* Capas delanteras externas al recorte (Cabello frontal) */}
        {renderLayer('hair', avatar.hair_asset)}
      </View>

      {/* 4. Marco Delantero - 1.35x para que sea el borde principal */}
      {renderLayer('marco_front', (avatar as any).frame_asset, size * 1.35)}
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
    justifyContent: 'flex-end',
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
  },
});
