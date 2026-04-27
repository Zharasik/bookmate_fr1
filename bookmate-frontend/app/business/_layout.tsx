import { Stack, Redirect } from 'expo-router';
import { useStore } from '../../hooks/useStore';

export default function BusinessLayout() {
  const user = useStore((s) => s.user);

  if (!user || (user.role !== 'business_owner' && user.role !== 'admin')) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="bookings" />
      <Stack.Screen name="slots" />
      <Stack.Screen name="stats" />
    </Stack>
  );
}
