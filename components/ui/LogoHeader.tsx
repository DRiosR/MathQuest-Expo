import React from 'react';
import { Dimensions, Image, StyleSheet, View, Platform } from 'react-native';

const { width } = Dimensions.get('window');

interface LogoHeaderProps {
  size?: 'small' | 'medium' | 'large';
}

export const LogoHeader: React.FC<LogoHeaderProps> = ({ size = 'medium' }) => {
  const getLogoSize = () => {
    switch (size) {
      case 'small':
        return { width: 120, height: 120 };
      case 'large':
        return { width: 200, height: 200 };
      case 'medium':
      default:
        return { width: 160, height: 160 };
    }
  };

  const logoSize = getLogoSize();

  return (
    <View style={styles.container}>
      <View style={[styles.logoContainer, { ...logoSize }]}>
        <Image
          source={require('../../assets/images/MQ_logo.png')}
          style={[styles.logo, { ...logoSize }]}
          resizeMode="contain"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    // Sombreado de silueta sutil para iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 4,
    // Sombreado de silueta sutil para Web (utiliza filtro drop-shadow para ignorar el fondo transparente)
    ...Platform.select({
      web: {
        filter: 'drop-shadow(0px 3px 4px rgba(0, 0, 0, 0.25))',
      } as any,
    }),
  },
});

export default LogoHeader;
