import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { BookOpenText, CheckCircle, Clock, DiceFour, Medal, Trophy, X } from 'phosphor-react-native';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AnimatedMathBackground from '@/components/ui/AnimatedMathBackground';
import { useFontContext } from '@/contexts/FontsContext';

export default function HowToPlayModal() {
  const { fontsLoaded } = useFontContext();

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#6E72FC', '#AD1DEB']} style={StyleSheet.absoluteFill} />
      <AnimatedMathBackground />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.header}>
          <Text style={[styles.title, { fontFamily: 'Digitalt' }]}>¿CÓMO JUGAR?</Text>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}>
            <X size={24} color="#FFFFFF" weight="bold" />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Section: Duel Rules */}
          <View style={styles.sectionHeader}>
            <Trophy size={18} color="#FFD700" weight="fill" />
            <Text style={[styles.sectionTitle, { fontFamily: 'Digitalt' }]}>REGLAS DEL DUELO</Text>
          </View>

          <View style={styles.ruleCard}>
            <View style={[styles.iconBox, { backgroundColor: 'rgba(110, 114, 252, 0.2)', borderColor: '#6E72FC' }]}>
              <DiceFour size={24} color="#6E72FC" weight="fill" />
            </View>
            <View style={styles.ruleInfo}>
              <Text style={[styles.ruleCardTitle, { fontFamily: 'Gilroy-Black' }]}>3 RONDAS ÉPICAS</Text>
              <Text style={[styles.ruleCardDesc, { fontFamily: 'Gilroy-Medium' }]}>
                Cada duelo se divide en 3 fases de combate matemático intenso.
              </Text>
            </View>
          </View>

          <View style={styles.ruleCard}>
            <View style={[styles.iconBox, { backgroundColor: 'rgba(173, 29, 235, 0.2)', borderColor: '#AD1DEB' }]}>
              <BookOpenText size={24} color="#AD1DEB" weight="fill" />
            </View>
            <View style={styles.ruleInfo}>
              <Text style={[styles.ruleCardTitle, { fontFamily: 'Gilroy-Black' }]}> RULETA DE CATEGORÍAS</Text>
              <Text style={[styles.ruleCardDesc, { fontFamily: 'Gilroy-Medium' }]}>
                Al inicio de cada ronda, el azar decidirá tu próximo desafío.
              </Text>
            </View>
          </View>

          {/* Section: Scoring */}
          <View style={styles.sectionHeader}>
            <Medal size={18} color="#00F2FE" weight="fill" />
            <Text style={[styles.sectionTitle, { fontFamily: 'Digitalt' }]}>SISTEMA DE PUNTOS</Text>
          </View>

          <View style={styles.ruleCard}>
            <View style={[styles.iconBox, { backgroundColor: 'rgba(52, 199, 89, 0.2)', borderColor: '#34C759' }]}>
              <CheckCircle size={24} color="#34C759" weight="fill" />
            </View>
            <View style={styles.ruleInfo}>
              <Text style={[styles.ruleCardTitle, { fontFamily: 'Gilroy-Black', color: '#34C759' }]}>+100 POR VICTORIA</Text>
              <Text style={[styles.ruleCardDesc, { fontFamily: 'Gilroy-Medium' }]}>
                Cada respuesta correcta suma puntos a tu marcador total.
              </Text>
            </View>
          </View>

          <View style={styles.ruleCard}>
            <View style={[styles.iconBox, { backgroundColor: 'rgba(255, 212, 94, 0.2)', borderColor: '#FFD45E' }]}>
              <Clock size={24} color="#FFD45E" weight="fill" />
            </View>
            <View style={styles.ruleInfo}>
              <Text style={[styles.ruleCardTitle, { fontFamily: 'Gilroy-Black', color: '#FFD45E' }]}>+50 VELOCIDAD</Text>
              <Text style={[styles.ruleCardDesc, { fontFamily: 'Gilroy-Medium' }]}>
                ¡Sé el más rápido en terminar para ganar un bono de tiempo!
              </Text>
            </View>
          </View>

          {/* Section: Rewards */}
          <View style={styles.sectionHeader}>
            <Trophy size={18} color="#FF3D3D" weight="fill" />
            <Text style={[styles.sectionTitle, { fontFamily: 'Digitalt' }]}>RESULTADOS Y ELO</Text>
          </View>

          <View style={[styles.ruleCard, { borderColor: 'rgba(52, 199, 89, 0.4)' }]}>
            <View style={[styles.iconBox, { backgroundColor: 'rgba(52, 199, 89, 0.1)', borderColor: '#34C759' }]}>
              <Trophy size={24} color="#34C759" weight="fill" />
            </View>
            <View style={styles.ruleInfo}>
              <Text style={[styles.ruleCardTitle, { fontFamily: 'Gilroy-Black', color: '#34C759' }]}>SI GANAS: +30 ELO</Text>
              <Text style={[styles.ruleCardDesc, { fontFamily: 'Gilroy-Medium' }]}>
                Escala en el ranking mundial y gana más monedas.
              </Text>
            </View>
          </View>

          <View style={[styles.ruleCard, { borderColor: 'rgba(255, 59, 48, 0.4)' }]}>
            <View style={[styles.iconBox, { backgroundColor: 'rgba(255, 59, 48, 0.1)', borderColor: '#FF3B30' }]}>
              <Trophy size={24} color="#FF3B30" weight="fill" />
            </View>
            <View style={styles.ruleInfo}>
              <Text style={[styles.ruleCardTitle, { fontFamily: 'Gilroy-Black', color: '#FF3B30' }]}>SI PIERDES: -25 ELO</Text>
              <Text style={[styles.ruleCardDesc, { fontFamily: 'Gilroy-Medium' }]}>
                Recibirás menos monedas, pero igual obtendrás experiencia.
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: 18 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  content: {
    paddingVertical: 16,
    paddingBottom: 40,
    gap: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    letterSpacing: 2,
    opacity: 0.9,
  },
  ruleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.45)', // Más transparente para efecto cristal
    padding: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    backgroundColor: 'rgba(0,0,0,0.3)', // Fondo interno para el icono
  },
  ruleInfo: {
    flex: 1,
    gap: 4,
  },
  ruleCardTitle: {
    color: '#fff',
    fontSize: 16,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  ruleCardDesc: {
    color: 'rgba(255,255,255,0.85)', // Más opaco para leer mejor
    fontSize: 13,
    lineHeight: 18,
  },
});


