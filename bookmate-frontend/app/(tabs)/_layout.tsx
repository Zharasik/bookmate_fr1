import { Platform, StyleSheet, View } from 'react-native';
import { Tabs, Redirect } from 'expo-router';
import { BlurView } from 'expo-blur';
import { Home, MapPin, Calendar } from 'lucide-react-native';
import { useStore } from '../../hooks/useStore';
import { useTheme, useT } from '../../hooks/useHelpers';

export default function TabLayout() {
  const token = useStore((s) => s.token);
  const dark = useStore((s) => s.dark);
  const c = useTheme();
  const t = useT();

  if (!token) return <Redirect href="/auth/login" />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.textMuted,
        headerShown: false,
        tabBarBackground: () =>
          Platform.OS === 'ios' ? (
            <BlurView
              intensity={90}
              tint={dark ? 'dark' : 'light'}
              style={StyleSheet.absoluteFillObject}
            />
          ) : (
            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: dark ? '#0A0F20' : '#fff' }]} />
          ),
        tabBarStyle: {
          backgroundColor: Platform.OS === 'ios' ? 'transparent' : dark ? '#0A0F20' : '#fff',
          borderTopColor: c.tabBarBorder,
          borderTopWidth: 1,
          height: 70,
          paddingBottom: 12,
          paddingTop: 8,
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('explore'),
          tabBarIcon: ({ color, size, focused }) => (
            <Home size={focused ? size : size - 2} color={color} strokeWidth={focused ? 2.5 : 1.8} />
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: t('map'),
          tabBarIcon: ({ color, size, focused }) => (
            <MapPin size={focused ? size : size - 2} color={color} strokeWidth={focused ? 2.5 : 1.8} />
          ),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: t('bookings'),
          tabBarIcon: ({ color, size, focused }) => (
            <Calendar size={focused ? size : size - 2} color={color} strokeWidth={focused ? 2.5 : 1.8} />
          ),
        }}
      />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
  );
}
