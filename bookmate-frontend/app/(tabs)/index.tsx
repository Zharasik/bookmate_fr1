import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Image, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Star, MapPin, ChevronRight, Bell, User } from 'lucide-react-native';
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
        api.getCategories().catch(() => ['All']),
        api.getVenues(selectedCategory, searchQuery),
      ]);
      setCategories(cats);
      setVenues(v);
    } catch { } finally { setLoading(false); setRefreshing(false); }
  }, [selectedCategory, searchQuery]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]} edges={['top']}>
      {/* Header: Bell left | Title | Profile right */}
      <View style={styles.header}>
        <Pressable style={[styles.iconBtn, { backgroundColor: c.card }]} onPress={() => router.push('/(tabs)/notifications' as any)}>
          <Bell size={20} color={c.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: c.text }]}>{t('explore')}</Text>
        <Pressable style={[styles.iconBtn, { backgroundColor: c.primary }]} onPress={() => router.push('/(tabs)/profile' as any)}>
          {user?.avatar_url
            ? <Image source={{ uri: user.avatar_url }} style={styles.avatarImg} />
            : <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() || 'U'}</Text>}
        </Pressable>
      </View>

      {/* Search */}
      <View style={[styles.searchBox, { backgroundColor: c.card }]}>
        <Search size={18} color={c.textMuted} />
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

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={c.primary} size="large" />
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listInner}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={c.primary} />}
        >
          {venues.map((venue) => (
            <Pressable key={venue.id} style={[styles.card, { backgroundColor: c.card }]} onPress={() => router.push(`/venue/${venue.id}` as any)}>
              {venue.image_url
                ? <Image source={{ uri: venue.image_url }} style={styles.cardImg} />
                : <View style={[styles.cardImg, { backgroundColor: c.primaryLight, alignItems: 'center', justifyContent: 'center' }]}><Text style={{ fontSize: 36 }}>🏢</Text></View>}
              <View style={styles.cardInfo}>
                <View style={styles.cardRow}>
                  <Text style={[styles.cardName, { color: c.text }]} numberOfLines={1}>{venue.name}</Text>
                  <ChevronRight size={18} color={c.textMuted} />
                </View>
                <View style={styles.metaRow}>
                  <MapPin size={13} color={c.textMuted} />
                  <Text style={[styles.metaText, { color: c.textSecondary }]} numberOfLines={1}>{venue.location}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Star size={13} color="#FBBF24" fill="#FBBF24" />
                  <Text style={styles.ratingText}>{venue.rating}</Text>
                  <Text style={[styles.reviewCount, { color: c.textMuted }]}>({venue.review_count})</Text>
                  <View style={[styles.catChip, { backgroundColor: c.primaryLight }]}>
                    <Text style={[styles.catChipText, { color: c.primary }]}>{venue.category}</Text>
                  </View>
                </View>
              </View>
            </Pressable>
          ))}
          {venues.length === 0 && (
            <View style={styles.empty}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>🔍</Text>
              <Text style={[styles.emptyText, { color: c.textMuted }]}>{t('venueNotFound')}</Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  iconBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  avatarImg: { width: 40, height: 40, borderRadius: 12 },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  searchBox: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 4, paddingHorizontal: 14, borderRadius: 14, height: 48, gap: 10, elevation: 2 },
  searchInput: { flex: 1, fontSize: 15 },
  catWrap: { maxHeight: 50, marginTop: 14 },
  catContent: { paddingHorizontal: 16, gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontSize: 13, fontWeight: '500', textAlignVertical: 'center', lineHeight: 18 },
  list: { flex: 1, marginTop: 14 },
  listInner: { paddingHorizontal: 16, gap: 14, paddingBottom: 32 },
  card: { borderRadius: 18, overflow: 'hidden', elevation: 3 },
  cardImg: { width: '100%', height: 160 },
  cardInfo: { padding: 14 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardName: { fontSize: 17, fontWeight: '700', flex: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
  metaText: { fontSize: 13, flex: 1 },
  ratingText: { fontSize: 13, fontWeight: '600', color: '#FBBF24' },
  reviewCount: { fontSize: 12 },
  catChip: { marginLeft: 'auto', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  catChipText: { fontSize: 11, fontWeight: '600' },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 16 },
});
