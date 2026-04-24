import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useStore } from '../hooks/useStore';

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const hydrate = useStore((s) => s.hydrate);
  const dark = useStore((s) => s.dark);

  useEffect(() => {
    hydrate().then(() => setReady(true));
  }, []);

  if (!ready) return null;

  return (
    <>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="auth/login" />
        <Stack.Screen name="auth/register" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="venue/[id]" />
        <Stack.Screen name="venue/[id]/book" />
        <Stack.Screen name="venue/[id]/reviews" />
      </Stack>
    </>
  );
}
