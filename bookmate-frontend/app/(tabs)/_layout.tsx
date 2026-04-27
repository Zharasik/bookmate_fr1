import { Tabs, Redirect } from 'expo-router';
import { Home, MapPin, Calendar } from 'lucide-react-native';
import { useStore } from '../../hooks/useStore';
import { useTheme, useT } from '../../hooks/useHelpers';

export default function TabLayout() {
  const token = useStore((s) => s.token);
  const c = useTheme();
  const t = useT();

  if (!token) return <Redirect href="/auth/login" />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.textMuted,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: c.tabBar,
          borderTopWidth: 1,
          borderTopColor: c.tabBarBorder,
          height: 60,
          paddingBottom: 8,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('explore'), tabBarIcon: ({ color, size }) => <Home size={size - 2} color={color} /> }} />
      <Tabs.Screen name="map" options={{ title: t('map'), tabBarIcon: ({ color, size }) => <MapPin size={size - 2} color={color} /> }} />
      <Tabs.Screen name="bookings" options={{ title: t('bookings'), tabBarIcon: ({ color, size }) => <Calendar size={size - 2} color={color} /> }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
  );
}
