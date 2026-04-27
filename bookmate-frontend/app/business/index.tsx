import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  ChevronLeft, Calendar, TrendingUp, Star, Users, Clock, AlertCircle, BarChart2,
} from 'lucide-react-native';
import { useTheme } from '../../hooks/useHelpers';
import { useStore } from '../../hooks/useStore';
import { api } from '../../services/api';

function StatCard({ icon, label, value, color, bg }: any) {
  return (
    <View style={[styles.statCard, { backgroundColor: bg }]}>
      <View style={[styles.statIcon, { backgroundColor: `${color}20` }]}>
        {icon}
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function BusinessDashboard() {
  const router = useRouter();
  const c = useTheme();
  const user = useStore((s) => s.user);
  const [stats, setStats] = useState<any>(null);
  const [venues, setVenues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, v] = await Promise.all([api.business.getStats(), api.business.getVenues()]);
      setStats(s);
      setVenues(v);
    } catch { /* ignore */ } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={c.primary} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]} edges={['top']}>
      {/* Header */}
      <LinearGradient colors={['#1D4ED8', '#2563EB', '#3B82F6']} style={styles.headerGrad}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={24} color="#fff" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerSub}>Бизнес панель</Text>
          <Text style={styles.headerTitle}>{user?.name}</Text>
        </View>
        <Pressable
          style={styles.bookingsBtn}
          onPress={() => router.push('/business/bookings' as any)}
        >
          {stats?.pending_bookings > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{stats.pending_bookings}</Text>
            </View>
          )}
          <Calendar size={22} color="#fff" />
        </Pressable>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollInner}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={c.primary} />}
      >

        {/* Pending alert */}
        {stats?.pending_bookings > 0 && (
          <Pressable
            style={[styles.alertBox, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}
            onPress={() => router.push('/business/bookings' as any)}
          >
            <AlertCircle size={20} color="#F59E0B" />
            <Text style={{ color: '#92400E', fontWeight: '600', flex: 1, marginLeft: 10 }}>
              {stats.pending_bookings} новых бронирований ожидают подтверждения
            </Text>
          </Pressable>
        )}

        {/* Stats grid */}
        {stats && (
          <View style={styles.statsGrid}>
            <StatCard
              icon={<Calendar size={20} color="#2563EB" />}
              label="Брони сегодня"
              value={stats.bookings_today}
              color="#2563EB"
              bg={c.card}
            />
            <StatCard
              icon={<TrendingUp size={20} color="#10B981" />}
              label="Выручка (7 дней)"
              value={`${(stats.weekly_revenue || 0).toLocaleString()} ₸`}
              color="#10B981"
              bg={c.card}
            />
            <StatCard
              icon={<Star size={20} color="#F59E0B" />}
              label="Средний рейтинг"
              value={stats.avg_rating > 0 ? stats.avg_rating.toFixed(1) : '—'}
              color="#F59E0B"
              bg={c.card}
            />
            <StatCard
              icon={<Users size={20} color="#8B5CF6" />}
              label="Постоянные клиенты"
              value={stats.repeat_customers}
              color="#8B5CF6"
              bg={c.card}
            />
          </View>
        )}

        {/* Popular hours */}
        {stats?.popular_hours?.length > 0 && (
          <View style={[styles.section, { backgroundColor: c.card }]}>
            <View style={styles.sectionHeader}>
              <Clock size={18} color={c.primary} />
              <Text style={[styles.sectionTitle, { color: c.text }]}>Популярные часы</Text>
            </View>
            {stats.popular_hours.map((h: any) => {
              const max = stats.popular_hours[0]?.cnt || 1;
              const pct = (h.cnt / max) * 100;
              return (
                <View key={h.time} style={styles.barRow}>
                  <Text style={[styles.barLabel, { color: c.textSecondary }]}>{h.time}</Text>
                  <View style={[styles.barBg, { backgroundColor: c.bg }]}>
                    <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: c.primary }]} />
                  </View>
                  <Text style={[styles.barCount, { color: c.text }]}>{h.cnt}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* My venues */}
        <View style={[styles.section, { backgroundColor: c.card }]}>
          <View style={styles.sectionHeader}>
            <BarChart2 size={18} color={c.primary} />
            <Text style={[styles.sectionTitle, { color: c.text }]}>Мои заведения</Text>
          </View>
          {venues.map((v) => (
            <Pressable
              key={v.id}
              style={[styles.venueRow, { borderBottomColor: c.border }]}
              onPress={() => router.push(`/business/slots?venueId=${v.id}&venueName=${encodeURIComponent(v.name)}` as any)}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.venueName, { color: c.text }]}>{v.name}</Text>
                <Text style={[styles.venueMeta, { color: c.textMuted }]}>
                  {v.slot_count} слотов · {v.booking_count} бронирований
                </Text>
              </View>
              <View style={[styles.activeChip, { backgroundColor: v.is_active ? '#D1FAE5' : '#FEE2E2' }]}>
                <Text style={{ color: v.is_active ? '#10B981' : '#EF4444', fontSize: 12, fontWeight: '600' }}>
                  {v.is_active ? 'Активно' : 'Неактивно'}
                </Text>
              </View>
            </Pressable>
          ))}
          {venues.length === 0 && (
            <Text style={[styles.empty, { color: c.textMuted }]}>У вас пока нет заведений</Text>
          )}
        </View>

        {/* Quick actions */}
        <View style={styles.actions}>
          <Pressable
            style={[styles.actionBtn, { backgroundColor: c.card }]}
            onPress={() => router.push('/business/bookings' as any)}
          >
            <Calendar size={22} color={c.primary} />
            <Text style={[styles.actionTxt, { color: c.text }]}>Все брони</Text>
          </Pressable>
          <Pressable
            style={[styles.actionBtn, { backgroundColor: c.card }]}
            onPress={() => router.push('/business/stats' as any)}
          >
            <TrendingUp size={22} color="#10B981" />
            <Text style={[styles.actionTxt, { color: c.text }]}>Статистика</Text>
          </Pressable>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerGrad: { paddingHorizontal: 16, paddingVertical: 20, flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 12 },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  bookingsBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#EF4444', borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  scroll: { flex: 1 },
  scrollInner: { padding: 16, gap: 16, paddingBottom: 40 },
  alertBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14, borderWidth: 1 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: { width: '47%', borderRadius: 16, padding: 16, elevation: 2 },
  statIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  statValue: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  statLabel: { color: '#6B7280', fontSize: 12 },
  section: { borderRadius: 16, padding: 16, elevation: 2 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  barLabel: { width: 50, fontSize: 13 },
  barBg: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden', marginHorizontal: 8 },
  barFill: { height: '100%', borderRadius: 4 },
  barCount: { width: 24, fontSize: 12, fontWeight: '600', textAlign: 'right' },
  venueRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  venueName: { fontSize: 15, fontWeight: '600' },
  venueMeta: { fontSize: 12, marginTop: 2 },
  activeChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  empty: { textAlign: 'center', paddingVertical: 16, fontSize: 14 },
  actions: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, borderRadius: 16, padding: 16, alignItems: 'center', gap: 8, elevation: 2 },
  actionTxt: { fontSize: 13, fontWeight: '600' },
});
