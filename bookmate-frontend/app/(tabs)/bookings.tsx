import { useState, useEffect, useCallback, useMemo } from "react";
import {
  View, Text, StyleSheet, ScrollView, Image, Pressable,
  ActivityIndicator, Alert, RefreshControl, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Calendar, Clock, MapPin, X, Star, Trash2, Flag, CheckCircle } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useTheme, useT } from "../../hooks/useHelpers";
import { useStore } from "../../hooks/useStore";
import { api } from "../../services/api";

type FilterKey = "all" | "confirmed" | "in_progress" | "pending" | "completed" | "cancelled";

const STATUS_ORDER: Record<string, number> = {
  in_progress: 1, confirmed: 2, pending: 3, completed: 4, cancelled: 5,
};

function formatDateOnly(dateValue?: string) {
  if (!dateValue) return "";
  return String(dateValue).split("T")[0];
}

function sortAll(list: any[]) {
  return [...list].sort((a, b) => {
    const d = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9);
    if (d !== 0) return d;
    return (a.date ?? "").localeCompare(b.date ?? "") || (a.time ?? "").localeCompare(b.time ?? "");
  });
}

export default function BookingsScreen() {
  const c = useTheme();
  const t = useT();
  const router = useRouter();
  const lang = useStore((s) => s.lang);

  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [clearingHistory, setClearingHistory] = useState(false);
  const [appealModal, setAppealModal] = useState<any | null>(null);
  const [appealReason, setAppealReason] = useState('');
  const [appealSubmitting, setAppealSubmitting] = useState(false);

  // Переводы внутри компонента — реагируют на смену языка
  const FILTERS: { key: FilterKey; label: string; dot: string }[] = [
    { key: "all",         label: t('filterAll'),        dot: "#6B7280" },
    { key: "in_progress", label: t('filterInProgress'), dot: "#8B5CF6" },
    { key: "confirmed",   label: t('filterConfirmed'),  dot: "#10B981" },
    { key: "pending",     label: t('filterPending'),    dot: "#F59E0B" },
    { key: "completed",   label: t('filterCompleted'),  dot: "#3B82F6" },
    { key: "cancelled",   label: t('filterCancelled'),  dot: "#EF4444" },
  ];

  const STATUS_META: Record<string, { bg: string; text: string; label: string }> = {
    pending:     { bg: "#FEF3C7", text: "#92400E", label: t('statusPending') },
    upcoming:    { bg: "#FEF3C7", text: "#92400E", label: t('statusPending') },
    confirmed:   { bg: "#D1FAE5", text: "#065F46", label: t('statusConfirmed') },
    in_progress: { bg: "#EDE9FE", text: "#5B21B6", label: t('statusInProgress') },
    completed:   { bg: "#DBEAFE", text: "#1E40AF", label: t('statusCompleted') },
    cancelled:   { bg: "#FEE2E2", text: "#991B1B", label: t('statusCancelled') },
  };

  const APPEAL_OPTIONS = [
    t('appealOpt1'), t('appealOpt2'), t('appealOpt3'), t('appealOpt4'),
  ];

  const normalizeStatus = (status: string): string => {
    if (status === "upcoming") return "pending";
    return status;
  };

  const confirmAction = (title: string, message: string): Promise<boolean> => {
    if (Platform.OS === "web") {
      return Promise.resolve(window.confirm(`${title}\n\n${message}`));
    }
    return new Promise((resolve) => {
      Alert.alert(
        title, message,
        [
          { text: t('no'), style: "cancel", onPress: () => resolve(false) },
          { text: t('yes'), style: "destructive", onPress: () => resolve(true) },
        ],
        { cancelable: true, onDismiss: () => resolve(false) },
      );
    });
  };

  const load = useCallback(async () => {
    try {
      const data = await api.getBookings();
      const normalized = data.map((b: any) => ({
        ...b,
        status: normalizeStatus(b.status),
      }));
      setAllBookings(normalized);
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => {
    const m: Record<string, number> = { all: allBookings.length };
    allBookings.forEach((b) => { m[b.status] = (m[b.status] ?? 0) + 1; });
    return m;
  }, [allBookings]);

  const displayed = useMemo(() => {
    if (activeFilter === "all") return sortAll(allBookings);
    return allBookings
      .filter((b) => b.status === activeFilter)
      .sort((a, b) =>
        (a.date ?? "").localeCompare(b.date ?? "") || (a.time ?? "").localeCompare(b.time ?? ""),
      );
  }, [allBookings, activeFilter]);

  const handleClearHistory = async () => {
    const hasHistory = allBookings.some(
      (b) => b.status === "completed" || b.status === "cancelled"
    );
    if (!hasHistory) {
      Alert.alert(t('noHistory'), t('noHistoryMsg'));
      return;
    }
    const confirmed = await confirmAction(t('clearHistory'), t('clearHistoryMsg'));
    if (!confirmed) return;
    setClearingHistory(true);
    try {
      const res = await api.clearBookingHistory();
      Alert.alert(t('deleted'), t('deletedMsg').replace('{n}', String(res.deleted)));
      await load();
    } catch (e: any) {
      Alert.alert(t('error'), e.message);
    } finally {
      setClearingHistory(false);
    }
  };

  const handleCancel = async (id: string) => {
    const confirmed = await confirmAction(t('cancelBooking'), t('cancelBookingMsg'));
    if (!confirmed) return;
    setCancellingId(id);
    try {
      await api.cancelBooking(id);
      await load();
    } catch (e: any) {
      Alert.alert(t('cantCancel'), e.message || t('error'));
    } finally {
      setCancellingId(null);
    }
  };

  const renderCard = (b: any) => {
    const meta = STATUS_META[b.status] ?? STATUS_META.pending;
    return (
      <View key={b.id} style={[styles.card, { backgroundColor: c.card }]}>
        {b.venue_image ? (
          <Image source={{ uri: b.venue_image }} style={styles.img} />
        ) : (
          <View style={[styles.img, { backgroundColor: c.primaryLight, alignItems: "center", justifyContent: "center" }]}>
            <Text style={{ fontSize: 32 }}>🏢</Text>
          </View>
        )}
        <View style={styles.info}>
          <View style={styles.row}>
            <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>{b.venue_name}</Text>
            <View style={[styles.badge, { backgroundColor: meta.bg }]}>
              <Text style={[styles.badgeText, { color: meta.text }]}>{meta.label}</Text>
            </View>
          </View>
          {b.slot_name && (
            <Text style={[styles.slot, { color: c.primary }]}>📍 {b.slot_name}</Text>
          )}
          <View style={styles.metaRow}>
            <MapPin size={13} color={c.textMuted} />
            <Text style={[styles.metaText, { color: c.textSecondary }]} numberOfLines={1}>
              {b.venue_location}
            </Text>
          </View>
          <View style={styles.dtRow}>
            <View style={styles.dtItem}>
              <Calendar size={13} color={c.primary} />
              <Text style={[styles.dtText, { color: c.text }]}>{formatDateOnly(b.date)}</Text>
            </View>
            <View style={styles.dtItem}>
              <Clock size={13} color={c.primary} />
              <Text style={[styles.dtText, { color: c.text }]}>
                {b.time}{b.end_time ? ` – ${b.end_time}` : ""}
              </Text>
            </View>
            {b.total_price > 0 && (
              <Text style={[styles.price, { color: c.primary }]}>
                {b.total_price.toLocaleString()} ₸
              </Text>
            )}
          </View>
          <View style={styles.actions}>
            {b.status === "pending" && (
              <Pressable
                style={({ pressed }) => [styles.cancelBtn, { opacity: cancellingId === b.id || pressed ? 0.6 : 1 }]}
                onPress={() => handleCancel(b.id)}
                disabled={cancellingId === b.id}
              >
                {cancellingId === b.id ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <X size={14} color="#fff" />
                    <Text selectable={false} style={styles.cancelBtnText}>{t('cancel')}</Text>
                  </>
                )}
              </Pressable>
            )}
            {b.status === "completed" && (
              <Pressable
                style={[styles.actionBtn, { borderColor: "#F59E0B", backgroundColor: "#FEF3C7" }]}
                onPress={() => router.push(`/venue/${b.venue_id}/reviews` as any)}
              >
                <Star size={13} color="#F59E0B" />
                <Text style={[styles.actionText, { color: "#92400E" }]}>{t('leaveReview')}</Text>
              </Pressable>
            )}
            {b.status === "completed" && b.client_rating_given && (
              <Pressable
                style={[styles.actionBtn, { borderColor: "#F59E0B", backgroundColor: "#FEF3C7" }]}
                onPress={() => { setAppealModal(b); setAppealReason(''); }}
              >
                <Flag size={13} color="#F59E0B" />
                <Text style={[styles.actionText, { color: "#92400E" }]}>
                  {t('appealRating')} {b.client_rating_given}★
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]} edges={["top"]}>
      <View style={[styles.header, { backgroundColor: c.card, borderBottomColor: c.border }]}>
        <View style={{ width: 40 }} />
        <Text style={[styles.headerTitle, { color: c.text }]}>{t('myBookings')}</Text>
        <Pressable onPress={handleClearHistory} disabled={clearingHistory} style={{ width: 40, alignItems: 'center' }}>
          {clearingHistory
            ? <ActivityIndicator size="small" color={c.danger} />
            : <Trash2 size={20} color={c.danger} />}
        </Pressable>
      </View>

      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        style={styles.filterBar} contentContainerStyle={styles.filterContent}
      >
        {FILTERS.map((f) => {
          const active = activeFilter === f.key;
          const count = counts[f.key] ?? 0;
          return (
            <Pressable
              key={f.key}
              style={[styles.chip, { backgroundColor: active ? c.primary : c.card, borderColor: active ? c.primary : c.border }]}
              onPress={() => setActiveFilter(f.key)}
            >
              {!active && <View style={[styles.dot, { backgroundColor: f.dot }]} />}
              <Text style={[styles.chipLabel, { color: active ? "#fff" : c.textSecondary }]}>{f.label}</Text>
              {count > 0 && (
                <View style={[styles.countBadge, { backgroundColor: active ? "rgba(255,255,255,0.25)" : `${f.dot}20` }]}>
                  <Text style={[styles.countText, { color: active ? "#fff" : f.dot }]}>{count}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={c.primary} size="large" />
      ) : (
        <ScrollView
          style={styles.list} contentContainerStyle={styles.listInner}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={c.primary} />
          }
        >
          {activeFilter !== "all" && displayed.length > 0 && (() => {
            const f = FILTERS.find((x) => x.key === activeFilter)!;
            return (
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionBar, { backgroundColor: f.dot }]} />
                <Text style={[styles.sectionTitle, { color: c.text }]}>{f.label}</Text>
                <View style={[styles.sectionBadge, { backgroundColor: `${f.dot}20` }]}>
                  <Text style={[styles.sectionBadgeText, { color: f.dot }]}>{displayed.length}</Text>
                </View>
              </View>
            );
          })()}

          {displayed.map(renderCard)}

          {displayed.length === 0 && (
            <View style={styles.empty}>
              <Text style={{ fontSize: 52, marginBottom: 16 }}>📅</Text>
              <Text style={[styles.emptyTitle, { color: c.text }]}>
                {activeFilter === "all"
                  ? t('noBookings')
                  : t('noBookingsFilter').replace('{f}', FILTERS.find((f) => f.key === activeFilter)?.label ?? '')}
              </Text>
              <Text style={[styles.emptySub, { color: c.textMuted }]}>
                {activeFilter === "all" ? t('bookFirst') : t('tryFilter')}
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Appeal modal */}
      {appealModal && (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
          <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={() => setAppealModal(null)} />
          <View style={[appealStyles.sheet, { backgroundColor: c.card }]}>
            <View style={appealStyles.header}>
              <Text style={[appealStyles.title, { color: c.text }]}>{t('appealTitle')}</Text>
              <Pressable onPress={() => setAppealModal(null)}>
                <X size={22} color={c.text} />
              </Pressable>
            </View>
            <Text style={{ color: c.textSecondary, fontSize: 13, marginBottom: 12 }}>
              «{appealModal.venue_name}» — {appealModal.client_rating_given}★
              {appealModal.client_rating_comment ? ` — "${appealModal.client_rating_comment}"` : ''}
            </Text>
            <Text style={[appealStyles.label, { color: c.text }]}>{t('appealReason')}</Text>
            {APPEAL_OPTIONS.map((r) => (
              <Pressable
                key={r}
                onPress={() => setAppealReason(r)}
                style={[appealStyles.option, {
                  borderColor: appealReason === r ? '#F59E0B' : c.border,
                  backgroundColor: appealReason === r ? '#FEF3C7' : c.bg,
                }]}
              >
                {appealReason === r && <CheckCircle size={14} color="#F59E0B" />}
                <Text style={{ color: appealReason === r ? '#92400E' : c.text, fontSize: 14, marginLeft: 6, fontWeight: appealReason === r ? '700' : '400' }}>
                  {r}
                </Text>
              </Pressable>
            ))}
            <Pressable
              style={[appealStyles.btn, { backgroundColor: '#F59E0B', opacity: appealSubmitting || !appealReason ? 0.5 : 1 }]}
              disabled={appealSubmitting || !appealReason}
              onPress={async () => {
                setAppealSubmitting(true);
                try {
                  await api.appealRating(appealModal.id, appealReason);
                  Alert.alert(t('appealSent'), t('appealSentMsg'));
                  setAppealModal(null);
                } catch (e: any) {
                  Alert.alert(t('error'), e.message);
                } finally {
                  setAppealSubmitting(false);
                }
              }}
            >
              {appealSubmitting
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>{t('appealSend')}</Text>}
            </Pressable>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const appealStyles = StyleSheet.create({
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '700' },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  option: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 10, padding: 12, marginBottom: 8 },
  btn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1 },
  headerTitle: { fontSize: 20, fontWeight: "700", textAlign: "center", flex: 1 },
  filterBar: { maxHeight: 56, marginTop: 10 },
  filterContent: { paddingHorizontal: 16, paddingVertical: 4, gap: 8 },
  chip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 22, borderWidth: 1.5, minHeight: 36 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  chipLabel: { fontSize: 13, fontWeight: "600" },
  countBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 10, minWidth: 20, alignItems: "center" },
  countText: { fontSize: 11, fontWeight: "700" },
  list: { flex: 1 },
  listInner: { padding: 16, paddingBottom: 40, gap: 14 },
  sectionWrap: { gap: 10 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4, marginBottom: 2 },
  sectionBar: { width: 4, height: 20, borderRadius: 2 },
  sectionTitle: { fontSize: 15, fontWeight: "700", flex: 1 },
  sectionBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  sectionBadgeText: { fontSize: 12, fontWeight: "700" },
  sectionCards: { gap: 12 },
  card: { borderRadius: 18, overflow: "hidden", elevation: 3 },
  img: { width: "100%", height: 120 },
  info: { padding: 14, gap: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  name: { fontSize: 16, fontWeight: "700", flex: 1, marginRight: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: "600" },
  slot: { fontSize: 13, fontWeight: "500" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText: { fontSize: 13, flex: 1 },
  dtRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  dtItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  dtText: { fontSize: 13, fontWeight: "600" },
  price: { marginLeft: "auto", fontSize: 14, fontWeight: "700" },
  actions: { flexDirection: "row", gap: 10, marginTop: 2 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 },
  actionText: { fontSize: 13, fontWeight: "600" },
  cancelBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#EF4444", borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16, minWidth: 120 },
  cancelBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  empty: { alignItems: "center", marginTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: "700", marginBottom: 8, textAlign: "center" },
  emptySub: { fontSize: 14, textAlign: "center" },
});