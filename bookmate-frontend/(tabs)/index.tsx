import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, ScrollView, Image, Pressable, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Star, MapPin, ChevronRight, Bell } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme, useT } from '../../hooks/useHelpers';
import { useStore } from '../../hooks/useStore';
import { api } from '../../services/api';

export default function ExploreScreen() {
  const c = useTheme();
  const t = useT();
  const router = useRouter();
  const user = useStore((s) => s.user);

  const [categories, setCategories] = useState<string[]>(['All']);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [venues, setVenues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [cats, v] = await Promise.all([
        api.getCategories().catch(() => ['All', 'Billiards', 'Bowling', 'Gaming', 'Arcade']),
        api.getVenues(selectedCategory, searchQuery),
      ]);
      setCategories(cats);
      setVenues(v);
    } catch { /* keep old data */ } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory, searchQuery]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const initial = user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: c.primary }]}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <Text style={[styles.headerTitle, { color: c.text }]}>{t('explore')}</Text>
        <Pressable style={styles.notifBtn} onPress={() => router.push('/(tabs)/notifications')}>
          <Bell size={22} color={c.text} />
        </Pressable>
      </View>

      {/* Search */}
      <View style={[styles.searchBox, { backgroundColor: c.card }]}>
        <Search size={20} color={c.textMuted} style={{ marginRight: 8 }} />
        <TextInput
          style={[styles.searchInput, { color: c.text }]}
          placeholder={t('searchPlaceholder')}
          placeholderTextColor={c.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Categories */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catWrap} contentContainerStyle={styles.catContent}>
        {categories.map((cat) => (
          <Pressable
            key={cat}
            style={[styles.chip, { backgroundColor: selectedCategory === cat ? c.primary : c.card, borderColor: selectedCategory === cat ? c.primary : c.border }]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text style={[styles.chipText, { color: selectedCategory === cat ? '#fff' : c.textSecondary }]}>
              {cat === 'All' ? t('all') : cat}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Venue list */}
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={c.primary} size="large" />
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentInner}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
        >
          {venues.map((venue) => (
            <Pressable
              key={venue.id}
              style={[styles.venueCard, { backgroundColor: c.card }]}
              onPress={() => router.push(`/venue/${venue.id}`)}
            >
              <Image source={{ uri: venue.image_url }} style={styles.venueImg} />
              <View style={styles.venueInfo}>
                <View style={styles.venueRow}>
                  <Text style={[styles.venueName, { color: c.text }]} numberOfLines={1}>{venue.name}</Text>
                  <ChevronRight size={20} color={c.textMuted} />
                </View>
                <View style={styles.locRow}>
                  <MapPin size={14} color={c.textMuted} />
                  <Text style={[styles.locText, { color: c.textSecondary }]}>{venue.location}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Star size={14} color="#FBBF24" fill="#FBBF24" />
                  <Text style={styles.ratingText}>{venue.rating}</Text>
                  <Text style={[styles.reviewCnt, { color: c.textMuted }]}>({venue.review_count})</Text>
                </View>
              </View>
            </Pressable>
          ))}
          {venues.length === 0 && !loading && (
            <Text style={[styles.empty, { color: c.textMuted }]}>{t('venueNotFound')}</Text>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  avatar: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  notifBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  searchBox: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 8, paddingHorizontal: 12, borderRadius: 12, height: 48, elevation: 2 },
  searchInput: { flex: 1, fontSize: 15 },
  catWrap: { maxHeight: 50, marginTop: 16 },
  catContent: { paddingHorizontal: 16, gap: 10 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 14, fontWeight: '500' },
  content: { flex: 1, marginTop: 16 },
  contentInner: { padding: 16, gap: 16, paddingBottom: 32 },
  venueCard: { borderRadius: 16, overflow: 'hidden', elevation: 2 },
  venueImg: { width: '100%', height: 160 },
  venueInfo: { padding: 16 },
  venueRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  venueName: { fontSize: 17, fontWeight: '600', flex: 1 },
  locRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  locText: { fontSize: 14, marginLeft: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  ratingText: { fontSize: 14, fontWeight: '500', color: '#FBBF24', marginLeft: 4 },
  reviewCnt: { fontSize: 13, marginLeft: 4 },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 16 },
});
