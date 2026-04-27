import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, Pressable,
  ActivityIndicator, Alert, RefreshControl, Platform, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Calendar, Clock, MapPin, X, Star } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme, useT } from '../../hooks/useHelpers';
import { useStore } from '../../hooks/useStore';
import { api } from '../../services/api';

type FilterKey = 'all' | 'confirmed' | 'pending' | 'completed' | 'cancelled';

const FILTERS: { key: FilterKey; label: string; color: string }[] = [
  { key: 'all', label: 'Все', color: '#818CF8' },
  { key: 'confirmed', label: 'Подтверждена', color: '#34D399' },
  { key: 'pending', label: 'Ожидает', color: '#FCD34D' },
  { key: 'completed', label: 'Завершена', color: '#60A5FA' },
  { key: 'cancelled', label: 'Отменена', color: '#F87171' },
];

const STATUS_META: Record<string, { color: string; label: string; bg: string }> = {
  pending:   { color: '#FCD34D', label: '⏳ Ожидает',      bg: 'rgba(252,211,77,0.12)' },
  upcoming:  { color: '#FCD34D', label: '⏳ Ожидает',      bg: 'rgba(252,211,77,0.12)' },
  confirmed: { color: '#34D399', label: '✓ Подтверждена',  bg: 'rgba(52,211,153,0.12)' },
  completed: { color: '#60A5FA', label: '✓ Завершена',     bg: 'rgba(96,165,250,0.12)' },
  cancelled: { color: '#F87171', label: '✕ Отменена',      bg: 'rgba(248,113,113,0.12)' },
};

const STATUS_ORDER: Record<string, number> = {
  confirmed: 1, pending: 2, completed: 3, cancelled: 4,
};

function formatDateOnly(v?: string) {
  if (!v) return '';
  return String(v).split('T')[0];
}

function confirmAction(title: string, message: string): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  return new Promise((resolve) => {
    Alert.alert(title, message,
      [
        { text: 'Нет', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Да, отменить', style: 'destructive', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });
}

function sortAll(list: any[]) {
  return [...list].sort((a, b) => {
    const d = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9);
    if (d !== 0) return d;
    return (a.date ?? '').localeCompare(b.date ?? '') || (a.time ?? '').localeCompare(b.time ?? '');
  });
}

export default function BookingsScreen() {
  const c = useTheme();
  const t = useT();
  const dark = useStore((s) => s.dark);
  const router = useRouter();
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await api.getBookings();
      const normalized = data.map((b: any) => ({
        ...b, status: b.status === 'upcoming' ? 'pending' : b.status,
      }));
      setAllBookings(normalized);
    } catch { } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => {
    const m: Record<string, number> = { all: allBookings.length };
    allBookings.forEach((b) => { m[b.status] = (m[b.status] ?? 0) + 1; });
    return m;
  }, [allBookings]);

  const displayed = useMemo(() => {
    if (activeFilter === 'all') return sortAll(allBookings);
    return allBookings
      .filter((b) => b.status === activeFilter)
      .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? '') || (a.time ?? '').localeCompare(b.time ?? ''));
  }, [allBookings, activeFilter]);

  const handleCancel = async (id: string) => {
    const confirmed = await confirmAction('Отменить бронь?', 'Это действие нельзя отменить.');
    if (!confirmed) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCancellingId(id);
    try {
      await api.cancelBooking(id);
      await load();
    } catch (e: any) {
      Alert.alert('Не удалось отменить', e.message || 'Проверьте подключение к интернету');
    } finally { setCancellingId(null); }
  };

  const GRAD = dark
    ? (['#7C3AED', '#6366F1'] as const)
    : (['#6366F1', '#818CF8'] as const);

  const renderCard = (b: any) => {
    const meta = STATUS_META[b.status] ?? STATUS_META.pending;
    return (
      <View key={b.id} style={[styles.card, {
        backgroundColor: c.card,
        borderColor: c.border,
        borderLeftColor: meta.color,
      }]}>
        {b.venue_image
          ? <Image source={{ uri: b.venue_image }} style={styles.img} />
          : (
            <View style={[styles.img, {
              backgroundColor: dark ? '#1A2540' : '#EEF2FF',
              alignItems: 'center', justifyContent: 'center',
            }]}>
              <Text style={{ fontSize: 32 }}>🏢</Text>
            </View>
          )}
        <View style={styles.info}>
          <View style={styles.topRow}>
            <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>{b.venue_name}</Text>
            <View style={[styles.badge, { backgroundColor: meta.bg }]}>
              <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
            </View>
          </View>
          {b.slot_name && (
            <Text style={[styles.slot, { color: c.primary }]}>📍 {b.slot_name}</Text>
          )}
          <View style={styles.metaRow}>
            <MapPin size={13} color={c.textMuted} />
            <Text style={[styles.metaText, { color: c.textSecondary }]} numberOfLines={1}>{b.venue_location}</Text>
          </View>
          <View style={styles.dtRow}>
            <View style={styles.dtItem}>
              <Calendar size={13} color={c.primary} />
              <Text style={[styles.dtText, { color: c.text }]}>{formatDateOnly(b.date)}</Text>
            </View>
            <View style={styles.dtItem}>
              <Clock size={13} color={c.primary} />
              <Text style={[styles.dtText, { color: c.text }]}>
                {b.time}{b.end_time ? ` – ${b.end_time}` : ''}
              </Text>
            </View>
            {b.total_price > 0 && (
              <Text style={[styles.price, { color: c.primary }]}>{b.total_price.toLocaleString()} ₸</Text>
            )}
          </View>
          <View style={styles.actions}>
            {b.status === 'pending' && (
              <Pressable
                style={({ pressed }) => [styles.cancelBtn, { opacity: cancellingId === b.id || pressed ? 0.65 : 1 }]}
                onPress={() => handleCancel(b.id)}
                disabled={cancellingId === b.id}
              >
                {cancellingId === b.id
                  ? <ActivityIndicator size="small" color="#fff" />
                  : (
                    <>
                      <X size={14} color="#fff" />
                      <Text selectable={false} style={styles.cancelBtnText}>{t('cancel')}</Text>
                    </>
                  )}
              </Pressable>
            )}
            {b.status === 'completed' && (
              <Pressable
                style={[styles.reviewBtn, { borderColor: 'rgba(252,211,77,0.4)', backgroundColor: 'rgba(252,211,77,0.10)' }]}
                onPress={() => router.push(`/venue/${b.venue_id}/reviews` as any)}
              >
                <Star size={13} color="#FCD34D" fill="#FCD34D" />
                <Text style={[styles.reviewBtnText, { color: '#FCD34D' }]}>Оставить отзыв</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]} edges={['top']}>
      {dark && <View style={styles.bgGlow} />}

      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        {/* Header */}
        <View style={[styles.headerBar, { borderBottomColor: c.border }]}>
          <Text style={[styles.headerTitle, { color: c.text }]}>{t('myBookings')}</Text>
        </View>

        {/* Filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterBar}
          contentContainerStyle={styles.filterContent}
        >
          {FILTERS.map((f) => {
            const active = activeFilter === f.key;
            const count = counts[f.key] ?? 0;
            return (
              <Pressable
                key={f.key}
                onPress={() => { setActiveFilter(f.key); Haptics.selectionAsync(); }}
                style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
              >
                {active
                  ? (
                    <LinearGradient
                      colors={GRAD}
                      style={styles.chipActive}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    >
                      <Text style={styles.chipLabelActive}>{f.label}</Text>
                      {count > 0 && (
                        <View style={styles.countBadgeActive}>
                          <Text style={styles.countTextActive}>{count}</Text>
                        </View>
                      )}
                    </LinearGradient>
                  )
                  : (
                    <View style={[styles.chip, { backgroundColor: c.card, borderColor: c.border }]}>
                      <View style={[styles.dot, { backgroundColor: f.color }]} />
                      <Text style={[styles.chipLabel, { color: c.textSecondary }]}>{f.label}</Text>
                      {count > 0 && (
                        <View style={[styles.countBadge, { backgroundColor: `${f.color}20` }]}>
                          <Text style={[styles.countText, { color: f.color }]}>{count}</Text>
                        </View>
                      )}
                    </View>
                  )}
              </Pressable>
            );
          })}
        </ScrollView>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={c.primary} size="large" />
          </View>
        ) : (
          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listInner}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => { setRefreshing(true); load(); }}
                tintColor={c.primary}
              />
            }
          >
            {displayed.map(renderCard)}
            {displayed.length === 0 && (
              <View style={styles.empty}>
                <Text style={{ fontSize: 52, marginBottom: 16 }}>📅</Text>
                <Text style={[styles.emptyTitle, { color: c.text }]}>
                  {activeFilter === 'all' ? 'Нет бронирований' : `Нет «${FILTERS.find((f) => f.key === activeFilter)?.label}»`}
                </Text>
                <Text style={[styles.emptySub, { color: c.textMuted }]}>
                  {activeFilter === 'all' ? 'Забронируйте первое место!' : 'Попробуйте другой фильтр'}
                </Text>
              </View>
            )}
            <View style={{ height: 80 }} />
          </ScrollView>
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bgGlow: {
    position: 'absolute', width: 380, height: 280, borderRadius: 190,
    backgroundColor: 'rgba(99,102,241,0.07)', top: 0, right: -100,
  },
  headerBar: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  headerTitle: { fontSize: 20, fontWeight: '800', textAlign: 'center', letterSpacing: -0.4 },
  filterBar: { maxHeight: 56, marginTop: 12 },
  filterContent: { paddingHorizontal: 20, paddingVertical: 4, gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 13, paddingVertical: 8, borderRadius: 22, borderWidth: 1,
  },
  chipActive: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 13, paddingVertical: 8, borderRadius: 22,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  chipLabel: { fontSize: 13, fontWeight: '600' },
  chipLabelActive: { fontSize: 13, fontWeight: '600', color: '#fff' },
  countBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 10, minWidth: 20, alignItems: 'center' },
  countBadgeActive: { backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 10, minWidth: 20, alignItems: 'center' },
  countText: { fontSize: 11, fontWeight: '700' },
  countTextActive: { fontSize: 11, fontWeight: '700', color: '#fff' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { flex: 1 },
  listInner: { padding: 16, gap: 14 },
  card: { borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderLeftWidth: 3 },
  img: { width: '100%', height: 120 },
  info: { padding: 14, gap: 8 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  name: { fontSize: 16, fontWeight: '700', flex: 1, marginRight: 8, letterSpacing: -0.2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  slot: { fontSize: 13, fontWeight: '500' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 13, flex: 1 },
  dtRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  dtItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dtText: { fontSize: 13, fontWeight: '600' },
  price: { marginLeft: 'auto', fontSize: 14, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 2 },
  cancelBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: '#EF4444', borderRadius: 12,
    paddingVertical: 9, paddingHorizontal: 16, minWidth: 110,
  },
  cancelBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  reviewBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12,
  },
  reviewBtnText: { fontSize: 13, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  emptySub: { fontSize: 14, textAlign: 'center' },
});
