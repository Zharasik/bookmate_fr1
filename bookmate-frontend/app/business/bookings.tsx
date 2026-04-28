import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  ChevronLeft,
  CheckCircle,
  XCircle,
  Clock,
  Check,
  Star,
} from "lucide-react-native";
import { Modal, TextInput } from "react-native";
import { useTheme } from "../../hooks/useHelpers";
import { api } from "../../services/api";

const STATUS_FILTERS = [
  { key: "", label: "Все" },
  { key: "pending", label: "Ожидают" },
  { key: "confirmed", label: "Confirmed" },
  { key: "completed", label: "Завершены" },
  { key: "cancelled", label: "Отменены" },
];

const STATUS_COLORS: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  pending: { bg: "#FEF3C7", text: "#92400E", label: "Ожидает" },
  confirmed: { bg: "#D1FAE5", text: "#065F46", label: "Подтверждена" },
  completed: { bg: "#DBEAFE", text: "#1E40AF", label: "Завершена" },
  cancelled: { bg: "#FEE2E2", text: "#991B1B", label: "Отменена" },
};

function formatDateOnly(dateValue?: string) {
  if (!dateValue) return "";
  return String(dateValue).split("T")[0];
}

function confirmAction(title: string): Promise<boolean> {
  if (Platform.OS === "web") {
    return Promise.resolve(window.confirm(title));
  }
  return new Promise((resolve) => {
    Alert.alert(
      title,
      "",
      [
        { text: "Нет", style: "cancel", onPress: () => resolve(false) },
        { text: "Да", onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

export default function BusinessBookingsScreen() {
  const router = useRouter();
  const c = useTheme();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rateModal, setRateModal] = useState<any>(null); // booking to rate
  const [rateValue, setRateValue] = useState(5);
  const [rateComment, setRateComment] = useState('');
  const [rateLoading, setRateLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.business.getBookings(
        filter ? { status: filter } : undefined,
      );
      setBookings(data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const doAction = async (
    id: string,
    action: "confirm" | "cancel" | "complete",
  ) => {
    const labels = {
      confirm: "Подтвердить",
      cancel: "Отменить",
      complete: "Завершить",
    };
    const confirmed = await confirmAction(labels[action] + " бронь?");
    if (!confirmed) return;

    setActionLoading(id + action);
    try {
      if (action === "confirm") await api.business.confirmBooking(id);
      else if (action === "cancel") await api.business.cancelBooking(id);
      else {
        await api.business.completeBooking(id);
        // Offer to rate the client after completing
        const booking = bookings.find(b => b.id === id);
        if (booking) {
          setRateValue(5); setRateComment('');
          setRateModal(booking);
        }
      }
      await load();
    } catch (e: any) {
      Alert.alert("Ошибка", e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const submitRating = async () => {
    if (!rateModal) return;
    setRateLoading(true);
    try {
      await api.business.rateClient(rateModal.id, { rating: rateValue, comment: rateComment || undefined });
      Alert.alert('✓ Оценка сохранена', `Клиент ${rateModal.client_name} получил оценку ${rateValue}/5`);
      setRateModal(null);
    } catch (e: any) {
      Alert.alert('Ошибка', e.message);
    } finally {
      setRateLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: c.bg }]}
      edges={["top"]}
    >
      <View
        style={[
          styles.header,
          { backgroundColor: c.card, borderBottomColor: c.border },
        ]}
      >
        <Pressable style={styles.back} onPress={() => router.back()}>
          <ChevronLeft size={24} color={c.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: c.text }]}>
          Управление бронями
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterWrap}
        contentContainerStyle={styles.filterContent}
      >
        {STATUS_FILTERS.map((f) => (
          <Pressable
            key={f.key}
            style={[
              styles.filterChip,
              {
                backgroundColor: filter === f.key ? c.primary : c.card,
                borderColor: filter === f.key ? c.primary : c.border,
              },
            ]}
            onPress={() => setFilter(f.key)}
          >
            <Text
              style={[
                styles.filterTxt,
                { color: filter === f.key ? "#fff" : c.textSecondary },
              ]}
            >
              {f.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator
          style={{ marginTop: 40 }}
          color={c.primary}
          size="large"
        />
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listInner}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor={c.primary}
            />
          }
        >
          {bookings.map((b) => {
            const sc = STATUS_COLORS[b.status] || STATUS_COLORS.pending;
            return (
              <View
                key={b.id}
                style={[styles.card, { backgroundColor: c.card }]}
              >
                {/* Top row */}
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.venueName, { color: c.text }]}>
                      {b.venue_name}
                    </Text>
                    {b.slot_name && (
                      <Text style={[styles.slotName, { color: c.primary }]}>
                        📍 {b.slot_name}
                      </Text>
                    )}
                  </View>
                  <View
                    style={[styles.statusBadge, { backgroundColor: sc.bg }]}
                  >
                    <Text style={[styles.statusText, { color: sc.text }]}>
                      {sc.label}
                    </Text>
                  </View>
                </View>

                {/* Client */}
                <View style={[styles.clientRow, { backgroundColor: c.bg }]}>
                  <View style={[styles.clientAvatar, { backgroundColor: c.primaryLight }]}>
                    <Text style={{ color: c.primary, fontWeight: "700" }}>
                      {(b.client_name || "?")[0].toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.clientName, { color: c.text }]}>{b.client_name}</Text>
                    <Text style={[styles.clientEmail, { color: c.textMuted }]}>{b.client_email}</Text>
                  </View>
                  {b.client_rating != null && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3,
                      backgroundColor: b.client_rating < 3 ? '#FEE2E2' : '#D1FAE5',
                      paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }}>
                      <Star size={11} color={b.client_rating < 3 ? '#EF4444' : '#10B981'}
                        fill={b.client_rating < 3 ? '#EF4444' : '#10B981'} />
                      <Text style={{ fontSize: 12, fontWeight: '700',
                        color: b.client_rating < 3 ? '#991B1B' : '#065F46' }}>
                        {Number(b.client_rating).toFixed(1)}
                      </Text>
                    </View>
                  )}
                </View>
                {b.client_rating != null && b.client_rating < 3 && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6,
                    backgroundColor: '#FEF3C7', borderRadius: 8, padding: 8 }}>
                    <Text style={{ fontSize: 12, color: '#92400E' }}>
                      ⚠️ Низкий рейтинг клиента — будьте внимательны
                    </Text>
                  </View>
                )}

                {/* Date/time */}
                <View style={styles.dtRow}>
                  <Text style={[styles.dtText, { color: c.textSecondary }]}>
                    📅 {formatDateOnly(b.date)} ⏰ {b.time}
                    {b.end_time ? ` – ${b.end_time}` : ""}
                  </Text>
                  <Text style={[styles.dtText, { color: c.textSecondary }]}>
                    👥 {b.guests} чел.
                    {b.total_price > 0
                      ? `  💰 ${b.total_price.toLocaleString()} ₸`
                      : ""}
                  </Text>
                </View>

                {/* Actions */}
                {b.status === "pending" && (
                  <View style={styles.actions}>
                    <Pressable
                      style={[
                        styles.actionBtn,
                        { backgroundColor: "#D1FAE5", borderColor: "#10B981" },
                      ]}
                      onPress={() => doAction(b.id, "confirm")}
                      disabled={!!actionLoading}
                    >
                      {actionLoading === b.id + "confirm" ? (
                        <ActivityIndicator size="small" color="#10B981" />
                      ) : (
                        <>
                          <CheckCircle size={16} color="#10B981" />
                          <Text
                            style={[styles.actionTxt, { color: "#065F46" }]}
                          >
                            Подтвердить
                          </Text>
                        </>
                      )}
                    </Pressable>
                    <Pressable
                      style={[
                        styles.actionBtn,
                        { backgroundColor: "#FEE2E2", borderColor: "#EF4444" },
                      ]}
                      onPress={() => doAction(b.id, "cancel")}
                      disabled={!!actionLoading}
                    >
                      {actionLoading === b.id + "cancel" ? (
                        <ActivityIndicator size="small" color="#EF4444" />
                      ) : (
                        <>
                          <XCircle size={16} color="#EF4444" />
                          <Text
                            style={[styles.actionTxt, { color: "#991B1B" }]}
                          >
                            Отменить
                          </Text>
                        </>
                      )}
                    </Pressable>
                  </View>
                )}
                {b.status === "confirmed" && (
                  <View style={styles.actions}>
                    <Pressable
                      style={[
                        styles.actionBtn,
                        {
                          backgroundColor: "#DBEAFE",
                          borderColor: "#3B82F6",
                          flex: 1,
                        },
                      ]}
                      onPress={() => doAction(b.id, "complete")}
                      disabled={!!actionLoading}
                    >
                      {actionLoading === b.id + "complete" ? (
                        <ActivityIndicator size="small" color="#3B82F6" />
                      ) : (
                        <>
                          <Check size={16} color="#3B82F6" />
                          <Text
                            style={[styles.actionTxt, { color: "#1E40AF" }]}
                          >
                            Завершить
                          </Text>
                        </>
                      )}
                    </Pressable>
                    <Pressable
                      style={[
                        styles.actionBtn,
                        {
                          backgroundColor: "#FEE2E2",
                          borderColor: "#EF4444",
                          flex: 1,
                        },
                      ]}
                      onPress={() => doAction(b.id, "cancel")}
                      disabled={!!actionLoading}
                    >
                      <XCircle size={16} color="#EF4444" />
                      <Text style={[styles.actionTxt, { color: "#991B1B" }]}>
                        Отменить
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })}
          {bookings.length === 0 && (
            <Text style={[styles.empty, { color: c.textMuted }]}>
              Бронирований нет
            </Text>
          )}
        </ScrollView>
      )}
      {/* Rate client modal */}
      <Modal visible={!!rateModal} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={[styles.rateSheet, { backgroundColor: c.card }]}>
            <Text style={[styles.rateTitle, { color: c.text }]}>Оценить клиента</Text>
            <Text style={[styles.rateSubtitle, { color: c.textSecondary }]}>
              {rateModal?.client_name}
            </Text>
            <View style={styles.starsRow}>
              {[1,2,3,4,5].map(s => (
                <Pressable key={s} onPress={() => setRateValue(s)}>
                  <Star size={36} color={s <= rateValue ? '#F59E0B' : c.border}
                    fill={s <= rateValue ? '#F59E0B' : 'none'} />
                </Pressable>
              ))}
            </View>
            <TextInput
              style={[styles.rateInput, { backgroundColor: c.bg, borderColor: c.border, color: c.text }]}
              placeholder="Комментарий (необязательно)..."
              placeholderTextColor={c.textMuted}
              value={rateComment}
              onChangeText={setRateComment}
              multiline
            />
            <View style={styles.rateBtns}>
              <Pressable style={[styles.rateBtn, { backgroundColor: c.bg, borderColor: c.border, borderWidth: 1 }]}
                onPress={() => setRateModal(null)}>
                <Text style={{ color: c.text, fontWeight: '600' }}>Пропустить</Text>
              </Pressable>
              <Pressable style={[styles.rateBtn, { backgroundColor: c.primary }]}
                onPress={submitRating} disabled={rateLoading}>
                {rateLoading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={{ color: '#fff', fontWeight: '700' }}>Сохранить оценку</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  back: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
  },
  filterWrap: { maxHeight: 50, marginTop: 12 },
  filterContent: { paddingHorizontal: 16, gap: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterTxt: { fontSize: 13, fontWeight: "500" },
  list: { flex: 1 },
  listInner: { padding: 16, gap: 14, paddingBottom: 40 },
  card: { borderRadius: 18, padding: 16, elevation: 2, gap: 12 },
  cardTop: { flexDirection: "row", alignItems: "flex-start" },
  venueName: { fontSize: 16, fontWeight: "700" },
  slotName: { fontSize: 13, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontSize: 12, fontWeight: "600" },
  clientRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 10,
    gap: 10,
  },
  clientAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  clientName: { fontSize: 14, fontWeight: "600" },
  clientEmail: { fontSize: 12 },
  dtRow: { gap: 4 },
  dtText: { fontSize: 13 },
  actions: { flexDirection: "row", gap: 10 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    gap: 6,
  },
  actionTxt: { fontSize: 13, fontWeight: "600" },
  empty: { textAlign: "center", marginTop: 60, fontSize: 16 },
  rateSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28, paddingBottom: 40 },
  rateTitle: { fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 4 },
  rateSubtitle: { fontSize: 14, textAlign: 'center', marginBottom: 20 },
  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 20 },
  rateInput: { borderWidth: 1.5, borderRadius: 12, padding: 12, fontSize: 15, minHeight: 72, marginBottom: 20 },
  rateBtns: { flexDirection: 'row', gap: 12 },
  rateBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
