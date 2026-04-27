import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useStore } from '../hooks/useStore';

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const hydrate = useStore((s) => s.hydrate);
  const dark = useStore((s) => s.dark);

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 2000);
    hydrate().then(() => setReady(true)).catch(() => setReady(true)).finally(() => clearTimeout(timer));
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EFF6FF' }}>
        <ActivityIndicator size="large" color="#2563EB" />
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
