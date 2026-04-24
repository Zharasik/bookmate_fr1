import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle, Tag, Star, MapPin, CheckCheck } from 'lucide-react-native';
import { useTheme, useT } from '../../hooks/useHelpers';
import { api } from '../../services/api';

const iconMap: Record<string, any> = { booking: CheckCircle, offer: Tag, review: Star, venue: MapPin };

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'только что';
  if (mins < 60) return `${mins} мин. назад`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} ч. назад`;
  const days = Math.floor(hrs / 24);
  return `${days} дн. назад`;
}

export default function NotificationsScreen() {
  const c = useTheme();
  const t = useT();
  const [notifs, setNotifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { setNotifs(await api.getNotifications()); } catch {} finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const markAll = async () => {
    try { await api.markAllRead(); load(); } catch {}
  };

  const markOne = async (id: string) => {
    try { await api.markRead(id); load(); } catch {}
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: c.card, borderBottomColor: c.border }]}>
        <Text style={[styles.headerTitle, { color: c.text }]}>{t('notifications')}</Text>
        {notifs.some((n) => !n.read) && (
          <Pressable onPress={markAll} style={styles.markAll}>
            <CheckCheck size={18} color={c.primary} />
          </Pressable>
        )}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={c.primary} size="large" />
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.inner}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={c.primary} />}
        >
          {notifs.map((n) => {
            const Icon = iconMap[n.type] || CheckCircle;
            return (
              <Pressable key={n.id} style={[styles.card, { backgroundColor: c.card, opacity: n.read ? 0.7 : 1 }]} onPress={() => markOne(n.id)}>
                <View style={[styles.iconWrap, { backgroundColor: `${c.primary}15` }]}>
                  <Icon size={20} color={c.primary} />
                </View>
                <View style={styles.notifBody}>
                  <View style={styles.notifRow}>
                    <Text style={[styles.notifTitle, { color: c.text }]} numberOfLines={1}>{n.title}</Text>
                    <Text style={[styles.ts, { color: c.textMuted }]}>{timeAgo(n.created_at)}</Text>
                  </View>
                  <Text style={[styles.notifMsg, { color: c.textSecondary }]} numberOfLines={2}>{n.message}</Text>
                </View>
              </Pressable>
            );
          })}
          {notifs.length === 0 && (
            <Text style={[styles.empty, { color: c.textMuted }]}>{t('noNotifications')}</Text>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  markAll: { position: 'absolute', right: 16 },
  content: { flex: 1 },
  inner: { padding: 16, gap: 12 },
  card: { borderRadius: 16, padding: 16, flexDirection: 'row', elevation: 2 },
  iconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  notifBody: { flex: 1 },
  notifRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  notifTitle: { fontSize: 15, fontWeight: '600', flex: 1, marginRight: 8 },
  ts: { fontSize: 12 },
  notifMsg: { fontSize: 14, lineHeight: 20 },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 16 },
});
