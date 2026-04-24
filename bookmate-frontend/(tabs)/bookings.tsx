import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, Pressable, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, Clock, MapPin, X } from 'lucide-react-native';
import { useTheme, useT } from '../../hooks/useHelpers';
import { api } from '../../services/api';

export default function BookingsScreen() {
  const c = useTheme();
  const t = useT();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.getBookings();
      setBookings(data);
    } catch { /* ignore */ } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCancel = (id: string) => {
    Alert.alert(t('cancel'), '', [
      { text: t('back'), style: 'cancel' },
      {
        text: t('ok'), style: 'destructive', onPress: async () => {
          try {
            await api.cancelBooking(id);
            load();
          } catch { /* ignore */ }
        },
      },
    ]);
  };

  const statusColor = (s: string) => {
    if (s === 'upcoming') return { bg: c.primaryLight, text: c.primary };
    if (s === 'completed') return { bg: '#D1FAE5', text: '#10B981' };
    return { bg: '#FEE2E2', text: '#EF4444' };
  };

  const statusLabel = (s: string) => {
    if (s === 'upcoming') return t('upcoming');
    if (s === 'completed') return t('completed');
    return t('cancelled');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: c.card, borderBottomColor: c.border }]}>
        <Text style={[styles.headerTitle, { color: c.text }]}>{t('myBookings')}</Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={c.primary} size="large" />
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentInner}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={c.primary} />}
        >
          {bookings.map((b) => {
            const sc = statusColor(b.status);
            return (
              <View key={b.id} style={[styles.card, { backgroundColor: c.card }]}>
                <Image source={{ uri: b.venue_image }} style={styles.img} />
                <View style={styles.info}>
                  <View style={styles.row}>
                    <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>{b.venue_name}</Text>
                    <View style={[styles.badge, { backgroundColor: sc.bg }]}>
                      <Text style={[styles.badgeText, { color: sc.text }]}>{statusLabel(b.status)}</Text>
                    </View>
                  </View>
                  <View style={styles.locRow}>
                    <MapPin size={14} color={c.textMuted} />
                    <Text style={[styles.locText, { color: c.textSecondary }]}>{b.venue_location}</Text>
                  </View>
                  <View style={styles.dtRow}>
                    <View style={styles.dtItem}>
                      <Calendar size={14} color={c.textSecondary} />
                      <Text style={[styles.dtText, { color: c.text }]}>{b.date}</Text>
                    </View>
                    <View style={styles.dtItem}>
                      <Clock size={14} color={c.textSecondary} />
                      <Text style={[styles.dtText, { color: c.text }]}>{b.time}</Text>
                    </View>
                  </View>
                  {b.status === 'upcoming' && (
                    <Pressable style={[styles.cancelBtn, { borderColor: c.danger }]} onPress={() => handleCancel(b.id)}>
                      <X size={14} color={c.danger} />
                      <Text style={[styles.cancelText, { color: c.danger }]}>{t('cancel')}</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })}
          {bookings.length === 0 && (
            <Text style={[styles.empty, { color: c.textMuted }]}>{t('noNotifications')}</Text>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1 },
  headerTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  content: { flex: 1 },
  contentInner: { padding: 16, gap: 16 },
  card: { borderRadius: 16, overflow: 'hidden', elevation: 2 },
  img: { width: '100%', height: 120 },
  info: { padding: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  name: { fontSize: 16, fontWeight: '600', flex: 1, marginRight: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 12, fontWeight: '500' },
  locRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  locText: { fontSize: 14, marginLeft: 6 },
  dtRow: { flexDirection: 'row', gap: 16 },
  dtItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dtText: { fontSize: 14, fontWeight: '500' },
  cancelBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 10, paddingVertical: 10, marginTop: 14, gap: 6 },
  cancelText: { fontSize: 14, fontWeight: '600' },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 16 },
});
