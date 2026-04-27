import { useEffect, useState, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useStore } from '../hooks/useStore';
import BookmateLogo from '../BookmateLogo';


export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const hydrate = useStore((s) => s.hydrate);
  const dark = useStore((s) => s.dark);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.72)).current;
  const pulseAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, tension: 55, friction: 9, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 650, useNativeDriver: true }),
    ]).start(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1, duration: 1100, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0.6, duration: 1100, useNativeDriver: true }),
        ])
      ).start();
    });

    const timer = setTimeout(() => setReady(true), 2400);
    hydrate()
      .then(() => setReady(true))
      .catch(() => setReady(true))
      .finally(() => clearTimeout(timer));
  }, []);

  if (!ready) {
    return (
      <View style={styles.splash}>
        <LinearGradient
          colors={['#060A15', '#0D1535', '#060A15']}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.glow1} />
        <View style={styles.glow2} />

        <Animated.View style={[styles.center, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          <Animated.View style={{ opacity: pulseAnim, marginBottom: 22 }}>
            <BookmateLogo size={110} />
          </Animated.View>
          <Text style={styles.splashTitle}>BookMate</Text>
          <Text style={styles.splashSub}>Бронируй. Приходи. Наслаждайся.</Text>
        </Animated.View>
      </View>
    );
  }

  return (
    <>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="auth/login" />
        <Stack.Screen name="auth/register" />
        <Stack.Screen name="auth/verify" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="venue/[id]" />
        <Stack.Screen name="venue/[id]/book" />
        <Stack.Screen name="venue/[id]/reviews" />
        <Stack.Screen name="business" />
        <Stack.Screen name="favorites" options={{ presentation: 'modal' }} />
        <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
        <Stack.Screen name="help" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center' },
  glow1: {
    position: 'absolute', width: 420, height: 420, borderRadius: 210,
    backgroundColor: 'rgba(99,102,241,0.13)', top: -120, right: -100,
  },
  glow2: {
    position: 'absolute', width: 360, height: 360, borderRadius: 180,
    backgroundColor: 'rgba(124,58,237,0.09)', bottom: 0, left: -110,
  },
  splashTitle: {
    color: '#F1F5F9', fontSize: 38, fontWeight: '800',
    letterSpacing: -1, marginBottom: 8,
  },
  splashSub: { color: '#475569', fontSize: 14, letterSpacing: 0.3 },
});
