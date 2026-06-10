import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, Pressable, ActivityIndicator,
  TextInput, Modal, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Star, X, Camera, CheckCircle, Flag } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme, useT } from '../../../hooks/useHelpers';
import { useStore } from '../../../hooks/useStore';
import { api } from '../../../services/api';

function timeAgo(dateStr: string, lang: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (lang === 'kk') {
    if (mins < 1) return 'жаңа ғана';
    if (mins < 60) return `${mins} мин.`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} сағ.`;
    return `${Math.floor(hrs / 24)} күн`;
  }
  if (mins < 1) return 'сейчас';
  if (mins < 60) return `${mins} мин.`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} ч.`;
  return `${Math.floor(hrs / 24)} дн.`;
}

function ReasonChip({ label, selected, onPress, color }: any) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.reasonChip, { backgroundColor: selected ? `${color}20` : '#F9FAFB', borderColor: selected ? color : '#E5E7EB' }]}
    >
      {selected && <CheckCircle size={13} color={color} style={{ marginRight: 4 }} />}
      <Text style={{ color: selected ? color : '#6B7280', fontSize: 13, fontWeight: selected ? '700' : '400' }}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function ReviewsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const c = useTheme();
  const t = useT();
  const lang = useStore((s) => s.lang);
  const user = useStore((s) => s.user);

  const BAD_REASONS = [
    t('badReason1'), t('badReason2'), t('badReason3'), t('badReason4'), t('badReason5'),
    t('badReason6'), t('badReason7'), t('badReason8'), t('badReason9'), t('badReason10'),
  ];
  const GOOD_REASONS = [
    t('goodReason1'), t('goodReason2'), t('goodReason3'), t('goodReason4'), t('goodReason5'),
    t('goodReason6'), t('goodReason7'), t('goodReason8'), t('goodReason9'), t('goodReason10'),
  ];
  const APPEAL_REASONS = [
    t('appealReason1'), t('appealReason2'), t('appealReason3'), t('appealReason4'), t('appealReason5'),
  ];

  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [myReviewId, setMyReviewId] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [appealTarget, setAppealTarget] = useState<any | null>(null);
  const [appealReason, setAppealReason] = useState('');
  const [appealSubmitting, setAppealSubmitting] = useState(false);

  const reasonList = rating <= 3 ? BAD_REASONS : GOOD_REASONS;
  const reasonColor = rating <= 3 ? '#EF4444' : '#10B981';

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [revs, myCheck] = await Promise.all([
        api.getReviews(id),
        user
          ? api.checkMyReview(id).catch(() => ({ reviewed: false, review_id: null }))
          : Promise.resolve({ reviewed: false, review_id: null }),
      ]);
      setReviews(revs);
      setMyReviewId((myCheck as any).review_id);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, [id, user]);

  useEffect(() => { load(); }, [load]);

  const openModal = () => {
    setRating(5); setComment(''); setSelectedReasons([]); setPhotoUri(null);
    setShowModal(true);
  };

  const toggleReason = (r: string) => {
    setSelectedReasons((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : prev.length < 3 ? [...prev, r] : prev
    );
  };

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
  };

  const handleSubmit = async () => {
    if (!id) return;
    setSubmitting(true);
    try {
      let photo_url: string | undefined;
      if (photoUri) {
        const uploaded = await api.uploadReviewPhoto(photoUri);
        photo_url = uploaded.url;
      }
      await api.postReview({ venue_id: id, rating, comment, photo_url, reasons: selectedReasons.length > 0 ? selectedReasons : undefined });
      setShowModal(false);
      load();
    } catch (e: any) {
      Alert.alert(t('error'), e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMyReview = () => {
    Alert.alert(t('deleteReview'), t('deleteReviewMsg'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'), style: 'destructive', onPress: async () => {
          if (!myReviewId) return;
          try { await api.deleteMyReview(myReviewId); load(); }
          catch (e: any) { Alert.alert(t('error'), e.message); }
        },
      },
    ]);
  };

  const submitAppeal = async () => {
    if (!appealTarget) return;
    setAppealSubmitting(true);
    try {
      await api.appealReview(appealTarget.id, appealReason);
      Alert.alert(t('appealSentTitle'), t('appealSentMsg'));
      setAppealTarget(null); setAppealReason('');
    } catch (e: any) {
      Alert.alert(t('error'), e.message);
    } finally {
      setAppealSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]} edges={['top']}>
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
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.revName, { color: c.text }]}>{r.user_name}</Text>
                    {r.user_id === user?.id && (
                      <View style={{ backgroundColor: c.primaryLight, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ color: c.primary, fontSize: 10, fontWeight: '700' }}>{t('youBadge')}</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.starsRow}>
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={14} color={i < r.rating ? '#FBBF24' : c.border} fill={i < r.rating ? '#FBBF24' : 'none'} />
                    ))}
                  </View>
                </View>
                <Text style={[styles.ts, { color: c.textMuted }]}>{timeAgo(r.created_at, lang)}</Text>
              </View>

              {(r.reasons?.length > 0 || r.bad_reason) && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {(r.reasons?.length > 0 ? r.reasons : [r.bad_reason]).map((reason: string, i: number) => (
                    <View key={i} style={[styles.reasonBadge, { backgroundColor: r.rating <= 3 ? '#FEE2E2' : '#D1FAE5' }]}>
                      <Text style={{ color: r.rating <= 3 ? '#991B1B' : '#065F46', fontSize: 12, fontWeight: '600' }}>
                        {r.rating <= 3 ? '⚠️' : '✓'} {reason}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {r.comment ? <Text style={[styles.comment, { color: c.textSecondary }]}>{r.comment}</Text> : null}
              {r.photo_url ? <Image source={{ uri: r.photo_url }} style={styles.reviewPhoto} resizeMode="cover" /> : null}

              <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                {r.user_id === user?.id ? (
                  <Pressable onPress={handleDeleteMyReview} style={[styles.smallBtn, { borderColor: '#EF4444' }]}>
                    <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '600' }}>{t('delete')}</Text>
                  </Pressable>
                ) : user ? (
                  <Pressable
                    onPress={() => { setAppealTarget(r); setAppealReason(''); }}
                    style={[styles.smallBtn, { borderColor: '#F59E0B' }]}
                  >
                    <Flag size={12} color="#F59E0B" />
                    <Text style={{ color: '#92400E', fontSize: 12, fontWeight: '600', marginLeft: 4 }}>{t('reportReview')}</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          ))}
          {reviews.length === 0 && (
            <Text style={[styles.empty, { color: c.textMuted }]}>{t('noReviews')}</Text>
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      <View style={[styles.footer, { backgroundColor: c.card, borderTopColor: c.border }]}>
        {myReviewId ? (
          <View style={[styles.alreadyBox, { backgroundColor: '#D1FAE5', borderColor: '#10B981' }]}>
            <CheckCircle size={18} color="#10B981" />
            <Text style={{ color: '#065F46', fontWeight: '600', marginLeft: 8 }}>{t('alreadyReviewed')}</Text>
          </View>
        ) : user ? (
          <Pressable style={[styles.writeBtn, { borderColor: c.primary }]} onPress={openModal}>
            <Text style={[styles.writeBtnText, { color: c.primary }]}>{t('writeReview')}</Text>
          </Pressable>
        ) : (
          <Pressable style={[styles.writeBtn, { borderColor: c.border }]} onPress={() => router.push('/auth/login' as any)}>
            <Text style={[styles.writeBtnText, { color: c.textSecondary }]}>{t('loginToReview')}</Text>
          </Pressable>
        )}
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
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={[styles.label, { color: c.text }]}>{t('yourRating')}</Text>
              <View style={styles.starsInput}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Pressable key={s} onPress={() => { setRating(s); setSelectedReasons([]); }}>
                    <Star size={36} color={s <= rating ? '#FBBF24' : c.border} fill={s <= rating ? '#FBBF24' : 'none'} />
                  </Pressable>
                ))}
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, marginBottom: 6 }}>
                <Text style={[styles.label, { color: c.text, marginBottom: 0 }]}>
                  {rating <= 3 ? t('whatDisliked') : t('whatLiked')}
                </Text>
                <Text style={{ fontSize: 12, color: selectedReasons.length >= 3 ? '#EF4444' : c.textMuted }}>
                  {selectedReasons.length}/3
                </Text>
              </View>
              <View style={styles.reasonGrid}>
                {reasonList.map((r) => (
                  <ReasonChip key={r} label={r} selected={selectedReasons.includes(r)} onPress={() => toggleReason(r)} color={reasonColor} />
                ))}
              </View>

              <Text style={[styles.label, { color: c.text, marginTop: 16 }]}>{t('yourComment')}</Text>
              <TextInput
                style={[styles.commentInput, { backgroundColor: c.bg, color: c.text, borderColor: c.border }]}
                placeholder={t('yourComment')}
                placeholderTextColor={c.textMuted}
                multiline
                numberOfLines={4}
                value={comment}
                onChangeText={setComment}
              />

              <Text style={[styles.label, { color: c.text, marginTop: 16 }]}>{t('photoOptional')}</Text>
              <Pressable
                style={[styles.photoBtn, { borderColor: photoUri ? c.primary : c.border, backgroundColor: photoUri ? `${c.primary}10` : c.bg }]}
                onPress={pickPhoto}
              >
                {photoUri ? (
                  <View style={{ alignItems: 'center', gap: 6 }}>
                    <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                    <Text style={{ color: c.primary, fontSize: 13 }}>{t('changePhoto')}</Text>
                  </View>
                ) : (
                  <View style={{ alignItems: 'center', gap: 8 }}>
                    <Camera size={24} color={c.textMuted} />
                    <Text style={{ color: c.textMuted, fontSize: 13 }}>{t('attachPhoto')}</Text>
                  </View>
                )}
              </Pressable>

              <Pressable
                style={[styles.submitBtn, { backgroundColor: c.primary, opacity: submitting ? 0.7 : 1 }]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>{t('submit')}</Text>}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Appeal modal */}
      <Modal visible={!!appealTarget} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: c.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.text }]}>{t('reportReview')}</Text>
              <Pressable onPress={() => setAppealTarget(null)}>
                <X size={24} color={c.text} />
              </Pressable>
            </View>
            <Text style={{ color: c.textSecondary, fontSize: 13, marginBottom: 16 }}>{t('reportSelectReason')}</Text>
            <View style={styles.reasonGrid}>
              {APPEAL_REASONS.map((r) => (
                <ReasonChip key={r} label={r} selected={appealReason === r} onPress={() => setAppealReason(r)} color="#F59E0B" />
              ))}
            </View>
            <TextInput
              style={[styles.commentInput, { backgroundColor: c.bg, color: c.text, borderColor: c.border, marginTop: 12 }]}
              placeholder={t('additionalComment')}
              placeholderTextColor={c.textMuted}
              multiline
              value={appealReason.startsWith('Другое') ? '' : undefined}
              onChangeText={(v) => setAppealReason(v ? 'Другое: ' + v : '')}
            />
            <Pressable
              style={[styles.submitBtn, { backgroundColor: '#F59E0B', opacity: appealSubmitting ? 0.7 : 1, marginTop: 16 }]}
              onPress={submitAppeal}
              disabled={appealSubmitting || !appealReason}
            >
              {appealSubmitting
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.submitText}>{t('sendReport')}</Text>}
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
  reviewCard: { borderRadius: 16, padding: 16, elevation: 2, gap: 10 },
  revHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  avatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
  revName: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  starsRow: { flexDirection: 'row', gap: 2 },
  ts: { fontSize: 12 },
  reasonBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  comment: { fontSize: 15, lineHeight: 22 },
  reviewPhoto: { width: '100%', height: 180, borderRadius: 12 },
  smallBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 16 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24, borderTopWidth: 1 },
  alreadyBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingVertical: 14, borderWidth: 1 },
  writeBtn: { paddingVertical: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
  writeBtnText: { fontSize: 16, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '92%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  starsInput: { flexDirection: 'row', gap: 10 },
  reasonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  reasonChip: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  commentInput: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 15, minHeight: 90, textAlignVertical: 'top' },
  photoBtn: { borderWidth: 1.5, borderRadius: 12, padding: 16, alignItems: 'center', justifyContent: 'center', minHeight: 80 },
  photoPreview: { width: '100%', height: 130, borderRadius: 10 },
  submitBtn: { paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 20, marginBottom: 4 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});