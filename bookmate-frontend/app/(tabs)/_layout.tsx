import { useEffect, useState, useRef } from 'react';
import { View, Pressable, StyleSheet, ScrollView, Dimensions } from 'react-native';
import ExploreScreen from './index';
import MapScreen from './map';
import BookingsScreen from './bookings';
import NotificationsScreen from './notifications';
import ProfileScreen from './profile';
import { useTheme } from '../../hooks/useHelpers';
import { useStore } from '../../hooks/useStore';
import { Home, Map, CalendarCheck, Bell, User } from 'lucide-react-native';

const { width } = Dimensions.get('window');
const MAP_TAB_INDEX = 1;

const TABS = [
  { key: 'explore',       Icon: Home,          Screen: ExploreScreen },
  { key: 'map',           Icon: Map,           Screen: MapScreen },
  { key: 'bookings',      Icon: CalendarCheck, Screen: BookingsScreen },
  { key: 'notifications', Icon: Bell,          Screen: NotificationsScreen },
  { key: 'profile',       Icon: User,          Screen: ProfileScreen },
];

export default function TabLayout() {
  const c = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const [activeTab, setActiveTab] = useState(0);
  const mapFocus = useStore((s) => s.mapFocus);

  const goTo = (index: number) => {
    scrollRef.current?.scrollTo({ x: index * width, animated: true });
    setActiveTab(index);
  };

  // "Show on map" from a venue page sets mapFocus — jump to the map tab to reveal it.
  useEffect(() => {
    if (mapFocus) goTo(MAP_TAB_INDEX);
  }, [mapFocus]);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView
  ref={scrollRef}
  horizontal
  pagingEnabled
  showsHorizontalScrollIndicator={false}
  scrollEnabled={activeTab !== 1} // 1 = индекс карты
  scrollEventThrottle={16}
  onScroll={(e) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    if (index !== activeTab) setActiveTab(index);
  }}
  onMomentumScrollEnd={(e) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    setActiveTab(index);
  }}
  style={{ flex: 1 }}
>
        {TABS.map(({ key, Screen }) => (
          <View key={key} style={{ width, flex: 1 }}>
            <Screen />
          </View>
        ))}
      </ScrollView>

      <View style={[styles.tabBar, { backgroundColor: c.card, borderTopColor: c.border }]}>
        {TABS.map(({ key, Icon }, i) => (
          <Pressable key={key} style={styles.tabItem} onPress={() => goTo(i)}>
            <Icon size={24} color={activeTab === i ? c.primary : c.textMuted} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: { flexDirection: 'row', borderTopWidth: 1, paddingBottom: 28, paddingTop: 10 },
  tabItem: { flex: 1, alignItems: 'center' },
});