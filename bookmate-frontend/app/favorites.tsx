import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image,
  Pressable, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Heart, Star, MapPin } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme, useT } from '../hooks/useHelpers';
import { api } from '../services/api';

export default function FavoritesScreen() {
  const router = useRouter();
  const c = useTheme();
  const t = useT();
  const [venues, setVenues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { setVenues(await api.getFavorites()); }
    catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (venueId: string) => {
    await api.toggleFavorite(venueId).catch(() => {});
    load();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: c.card, borderBottomColor: c.border }]}>
        <Pressable style={styles.back} onPress={() => router.back()}>
          <ChevronLeft size={24} color={c.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: c.text }]}>{t('favorites')}</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={c.primary} size="large" />
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              tintColor={c.primary}
            />
          }
        >
          {venues.map((v) => (
            <Pressable
              key={v.id}
              style={[styles.card, { backgroundColor: c.card }]}
              onPress={() => router.push(`/venue/${v.id}` as any)}
            >
              {v.image_url ? (
                <Image source={{ uri: v.image_url }} style={styles.img} />
              ) : (
                <View style={[styles.img, { backgroundColor: c.primaryLight, alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={{ fontSize: 28 }}>🏢</Text>
                </View>
              )}
              <View style={styles.info}>
                <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>{v.name}</Text>
                <View style={styles.row}>
                  <MapPin size={13} color={c.textMuted} />
                  <Text style={[styles.sub, { color: c.textSecondary }]} numberOfLines={1}>{v.location}</Text>
                </View>
                <View style={styles.row}>
                  <Star size={13} color="#FBBF24" fill="#FBBF24" />
                  <Text style={{ color: '#FBBF24', fontWeight: '600', fontSize: 13, marginLeft: 4 }}>{v.rating}</Text>
                  <Text style={{ color: c.textMuted, fontSize: 12, marginLeft: 4 }}>({v.review_count})</Text>
                </View>
              </View>
              <Pressable
                style={styles.heartBtn}
                onPress={() => handleToggle(v.id)}
                hitSlop={12}
              >
                <Heart size={22} color="#EF4444" fill="#EF4444" />
              </Pressable>
            </Pressable>
          ))}

          {venues.length === 0 && (
            <View style={styles.empty}>
              <Heart size={56} color={c.border} />
              <Text style={[styles.emptyTitle, { color: c.text }]}>Нет избранных</Text>
              <Text style={[styles.emptySub, { color: c.textMuted }]}>
                Нажмите ❤️ на странице заведения, чтобы добавить в избранное
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700' },
  list: { padding: 16, gap: 12, paddingBottom: 40 },
  card: { borderRadius: 16, flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12, elevation: 2 },
  img: { width: 70, height: 70, borderRadius: 14 },
  info: { flex: 1, gap: 5 },
  name: { fontSize: 15, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sub: { fontSize: 13, flex: 1 },
  heartBtn: { padding: 4 },
  empty: { alignItems: 'center', marginTop: 80, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
});
