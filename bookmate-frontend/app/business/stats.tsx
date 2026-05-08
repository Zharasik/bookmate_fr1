import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  ChevronLeft, TrendingUp, Star, Users, Calendar, Clock, BarChart2, DollarSign,
} from 'lucide-react-native';
import { useTheme } from '../../hooks/useHelpers';
import { api } from '../../services/api';

function StatCard({ icon, label, value, color, bg }: any) {
  return (
    <View style={[styles.statCard, { backgroundColor: bg }]}>
      <View style={[styles.statIcon, { backgroundColor: `${color}20` }]}>{icon}</View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel]}>{label}</Text>
    </View>
  );
}

function MiniBar({ label, value, max, color }: any) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <View style={styles.barRow}>
      <Text style={styles.barLabel}>{label}</Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={styles.barCount}>{value}</Text>
    </View>
  );
}

export default function BusinessStatsScreen() {
  const router = useRouter();
  const c = useTheme();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const s = await api.business.getStats();
      setStats(s);
    } catch { /* ignore */ } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]} edges={['top']}>
      <LinearGradient colors={['#1D4ED8', '#2563EB', '#3B82F6']} style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color="#fff" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerSub}>Бизнес</Text>
          <Text style={styles.headerTitle}>Статистика</Text>
        </View>
        <BarChart2 size={24} color="rgba(255,255,255,0.7)" />
      </LinearGradient>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={c.primary} size="large" />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollInner}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={c.primary} />
          }
        >
          {/* Main stats grid */}
          <Text style={[styles.sectionTitle, { color: c.text }]}>Обзор</Text>
          <View style={styles.grid}>
            <StatCard icon={<Calendar size={20} color="#2563EB" />} label="Брони сегодня" value={stats?.bookings_today ?? 0} color="#2563EB" bg={c.card} />
            <StatCard icon={<Calendar size={20} color="#10B981" />} label="Брони за неделю" value={stats?.bookings_week ?? 0} color="#10B981" bg={c.card} />
            <StatCard icon={<DollarSign size={20} color="#10B981" />} label="Выручка (7 дней)" value={`${(stats?.weekly_revenue ?? 0).toLocaleString()} ₸`} color="#10B981" bg={c.card} />
            <StatCard icon={<TrendingUp size={20} color="#F59E0B" />} label="Всего броней" value={stats?.total_bookings ?? 0} color="#F59E0B" bg={c.card} />
            <StatCard icon={<Star size={20} color="#F59E0B" />} label="Средний рейтинг" value={stats?.avg_rating > 0 ? Number(stats.avg_rating).toFixed(1) : '—'} color="#F59E0B" bg={c.card} />
            <StatCard icon={<Users size={20} color="#8B5CF6" />} label="Постоянные клиенты" value={stats?.repeat_customers ?? 0} color="#8B5CF6" bg={c.card} />
          </View>

          {/* Pending bookings alert */}
          {(stats?.pending_bookings ?? 0) > 0 && (
            <View style={[styles.alertBox, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}>
              <Text style={{ color: '#92400E', fontWeight: '700', fontSize: 15 }}>
                ⏳ {stats.pending_bookings} броней ожидают подтверждения
              </Text>
            </View>
          )}

          {/* Weekly bookings chart */}
          {stats?.weekly_chart?.length > 0 && (
            <View style={[styles.section, { backgroundColor: c.card }]}>
              <View style={styles.sectionHeader}>
                <BarChart2 size={18} color={c.primary} />
                <Text style={[styles.sectionTitle, { color: c.text, marginBottom: 0, marginLeft: 8 }]}>Брони по дням (7 дней)</Text>
              </View>
              {(() => {
                const maxB = Math.max(...stats.weekly_chart.map((d: any) => Number(d.bookings)), 1);
                return stats.weekly_chart.map((d: any) => (
                  <MiniBar
                    key={d.day}
                    label={d.day.slice(5)}
                    value={Number(d.bookings)}
                    max={maxB}
                    color="#2563EB"
                  />
                ));
              })()}
            </View>
          )}

          {/* Weekly revenue chart */}
          {stats?.weekly_chart?.length > 0 && (
            <View style={[styles.section, { backgroundColor: c.card }]}>
              <View style={styles.sectionHeader}>
                <TrendingUp size={18} color="#10B981" />
                <Text style={[styles.sectionTitle, { color: c.text, marginBottom: 0, marginLeft: 8 }]}>Выручка по дням (₸)</Text>
              </View>
              {(() => {
                const maxR = Math.max(...stats.weekly_chart.map((d: any) => Number(d.revenue)), 1);
                return stats.weekly_chart.map((d: any) => (
                  <MiniBar
                    key={d.day}
                    label={d.day.slice(5)}
                    value={Number(d.revenue).toLocaleString()}
                    max={maxR}
                    color="#10B981"
                  />
                ));
              })()}
            </View>
          )}

          {/* Popular hours */}
          {stats?.popular_hours?.length > 0 && (
            <View style={[styles.section, { backgroundColor: c.card }]}>
              <View style={styles.sectionHeader}>
                <Clock size={18} color="#F59E0B" />
                <Text style={[styles.sectionTitle, { color: c.text, marginBottom: 0, marginLeft: 8 }]}>Популярные часы</Text>
              </View>
              {(() => {
                const maxH = Math.max(...stats.popular_hours.map((h: any) => Number(h.cnt)), 1);
                return stats.popular_hours.map((h: any) => (
                  <MiniBar key={h.time} label={h.time} value={Number(h.cnt)} max={maxH} color="#F59E0B" />
                ));
              })()}
            </View>
          )}

          {/* Reviews summary */}
          <View style={[styles.section, { backgroundColor: c.card }]}>
            <View style={styles.sectionHeader}>
              <Star size={18} color="#F59E0B" />
              <Text style={[styles.sectionTitle, { color: c.text, marginBottom: 0, marginLeft: 8 }]}>Отзывы</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 32, fontWeight: '800', color: '#F59E0B' }}>
                  {stats?.avg_rating > 0 ? Number(stats.avg_rating).toFixed(1) : '—'}
                </Text>
                <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 4 }}>Средняя оценка</Text>
              </View>
              <View style={{ width: 1, backgroundColor: c.border }} />
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 32, fontWeight: '800', color: c.primary }}>
                  {stats?.total_reviews ?? 0}
                </Text>
                <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 4 }}>Всего отзывов</Text>
              </View>
              <View style={{ width: 1, backgroundColor: c.border }} />
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 32, fontWeight: '800', color: '#8B5CF6' }}>
                  {stats?.repeat_customers ?? 0}
                </Text>
                <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 4 }}>Постоянных</Text>
              </View>
            </View>
          </View>

        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 20, gap: 12 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  scrollInner: { padding: 16, gap: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: { width: '47%', borderRadius: 16, padding: 16, elevation: 2 },
  statIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  statValue: { fontSize: 20, fontWeight: '800', marginBottom: 4 },
  statLabel: { color: '#6B7280', fontSize: 12 },
  alertBox: { borderRadius: 14, padding: 14, borderWidth: 1 },
  section: { borderRadius: 16, padding: 16, elevation: 2 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  barLabel: { width: 44, fontSize: 12, color: '#6B7280' },
  barTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: '#F3F4F6', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  barCount: { width: 40, fontSize: 12, fontWeight: '600', color: '#374151', textAlign: 'right' },
});
