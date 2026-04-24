import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, Pressable, ActivityIndicator,
  TextInput, Modal, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Star, X } from 'lucide-react-native';
import { useTheme, useT } from '../../../hooks/useHelpers';
import { api } from '../../../services/api';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'сейчас';
  if (mins < 60) return `${mins} мин.`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} ч.`;
  const days = Math.floor(hrs / 24);
  return `${days} дн.`;
}

export default function ReviewsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const c = useTheme();
  const t = useT();

  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try { setReviews(await api.getReviews(id)); } catch {} finally { setLoading(false); setRefreshing(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async () => {
    if (!id) return;
    setSubmitting(true);
    try {
      await api.postReview({ venue_id: id, rating, comment });
      setShowModal(false);
      setComment('');
      setRating(5);
      load();
    } catch (e: any) {
      Alert.alert(t('error'), e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: c.card, borderBottomColor: c.border }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={24} color={c.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: c.text }]}>{t('reviews')}</Text>
        <View style={{ width: 40 }} />
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
          {reviews.map((r) => (
            <View key={r.id} style={[styles.reviewCard, { backgroundColor: c.card }]}>
              <View style={styles.revHeader}>
                {r.user_avatar ? (
                  <Image source={{ uri: r.user_avatar }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, { backgroundColor: c.primaryLight, alignItems: 'center', justifyContent: 'center' }]}>
                    <Text style={{ color: c.primary, fontWeight: '700' }}>{(r.user_name || '?')[0]}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={[styles.revName, { color: c.text }]}>{r.user_name}</Text>
                  <View style={styles.starsRow}>
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={14} color={i < r.rating ? '#FBBF24' : c.border} fill={i < r.rating ? '#FBBF24' : 'none'} />
                    ))}
                  </View>
                </View>
                <Text style={[styles.ts, { color: c.textMuted }]}>{timeAgo(r.created_at)}</Text>
              </View>
              <Text style={[styles.comment, { color: c.textSecondary }]}>{r.comment}</Text>
            </View>
          ))}
          {reviews.length === 0 && (
            <Text style={[styles.empty, { color: c.textMuted }]}>{t('noReviews')}</Text>
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* Write review button */}
      <View style={[styles.footer, { backgroundColor: c.card, borderTopColor: c.border }]}>
        <Pressable style={[styles.writeBtn, { borderColor: c.primary }]} onPress={() => setShowModal(true)}>
          <Text style={[styles.writeBtnText, { color: c.primary }]}>{t('writeReview')}</Text>
        </Pressable>
      </View>

      {/* Write review modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: c.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.text }]}>{t('writeReview')}</Text>
              <Pressable onPress={() => setShowModal(false)}>
                <X size={24} color={c.text} />
              </Pressable>
            </View>

            <Text style={[{ color: c.text, fontWeight: '600', marginBottom: 8 }]}>{t('yourRating')}</Text>
            <View style={styles.starsInput}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Pressable key={s} onPress={() => setRating(s)}>
                  <Star size={32} color={s <= rating ? '#FBBF24' : c.border} fill={s <= rating ? '#FBBF24' : 'none'} />
                </Pressable>
              ))}
            </View>

            <Text style={[{ color: c.text, fontWeight: '600', marginBottom: 8, marginTop: 16 }]}>{t('yourComment')}</Text>
            <TextInput
              style={[styles.commentInput, { backgroundColor: c.bg, color: c.text, borderColor: c.border }]}
              placeholder={t('yourComment')}
              placeholderTextColor={c.textMuted}
              multiline
              numberOfLines={4}
              value={comment}
              onChangeText={setComment}
            />

            <Pressable
              style={[styles.submitBtn, { backgroundColor: c.primary, opacity: submitting ? 0.7 : 1 }]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>{t('submit')}</Text>}
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  content: { flex: 1 },
  inner: { padding: 16, gap: 12 },
  reviewCard: { borderRadius: 16, padding: 16, elevation: 2 },
  revHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
  revName: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  starsRow: { flexDirection: 'row', gap: 2 },
  ts: { fontSize: 12 },
  comment: { fontSize: 15, lineHeight: 22 },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 16 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24, borderTopWidth: 1 },
  writeBtn: { paddingVertical: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
  writeBtnText: { fontSize: 16, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  starsInput: { flexDirection: 'row', gap: 8 },
  commentInput: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 15, minHeight: 100, textAlignVertical: 'top' },
  submitBtn: { paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
