import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Image, ScrollView, Pressable, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Star, MapPin, Heart, Share2, Clock, Camera, Tag, Users, Wrench } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme, useT } from '../../hooks/useHelpers';
import { useStore } from '../../hooks/useStore';
import { api } from '../../services/api';

export default function VenueDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const c = useTheme();
  const t = useT();
  const token = useStore((s) => s.token);

  const [venue, setVenue] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [masters, setMasters] = useState<any[]>([]);
  const [promos, setPromos] = useState<any[]>([]);
  const [fav, setFav] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.getVenue(id),
      api.getReviews(id),
      api.getVenuePhotos(id).catch(() => []),
      token ? api.checkFavorite(id).catch(() => ({ favorited: false })) : Promise.resolve({ favorited: false }),
      api.getServices(id).catch(() => []),
      api.getMasters(id).catch(() => []),
      api.getPromotions(id).catch(() => []),
    ]).then(([v, r, p, f, sv, ms, pr]) => {
      setVenue(v); setReviews(r.slice(0, 3)); setPhotos(p); setFav(f.favorited);
      setServices(sv); setMasters(ms); setPromos(pr);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  const toggleFav = async () => {
    try { const res = await api.toggleFavorite(id!); setFav(res.favorited); } catch {}
  };

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      try {
        const res = await api.uploadVenuePhoto(id!, result.assets[0].uri);
        setPhotos((prev) => [res, ...prev]);
        Alert.alert(t('ok'));
      } catch { Alert.alert(t('error')); }
    }
  };

  if (loading) return <View style={[styles.container, { backgroundColor: c.bg }]}><ActivityIndicator style={{ marginTop: 100 }} color={c.primary} size="large" /></View>;
  if (!venue) return <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]}><Text style={{ color: c.text, textAlign: 'center', marginTop: 100 }}>{t('venueNotFound')}</Text></SafeAreaView>;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]} edges={['top']}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable style={[styles.circBtn, { backgroundColor: c.card }]} onPress={() => router.back()}>
          <ChevronLeft size={24} color={c.text} />
        </Pressable>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable style={[styles.circBtn, { backgroundColor: c.card }]} onPress={toggleFav}>
            <Heart size={20} color={fav ? '#EF4444' : c.text} fill={fav ? '#EF4444' : 'none'} />
          </Pressable>
          <Pressable style={[styles.circBtn, { backgroundColor: c.card }]}>
            <Share2 size={20} color={c.text} />
          </Pressable>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <Image source={{ uri: venue.image_url }} style={styles.mainImg} />

        {/* Info */}
        <View style={[styles.infoBlock, { backgroundColor: c.card }]}>
          <View style={styles.catRow}>
            <View style={[styles.catBadge, { backgroundColor: c.primaryLight }]}>
              <Text style={[styles.catText, { color: c.primary }]}>{venue.category}</Text>
            </View>
            <Text style={{ color: c.textSecondary }}>{venue.price_range}</Text>
          </View>
          <Text style={[styles.venueName, { color: c.text }]}>{venue.name}</Text>
          <View style={styles.ratingRow}>
            <View style={styles.ratingBadge}>
              <Star size={14} color="#FBBF24" fill="#FBBF24" />
              <Text style={styles.ratingNum}>{venue.rating}</Text>
            </View>
            <Text style={{ color: c.textSecondary, marginLeft: 8 }}>({venue.review_count} {t('reviewsCount')})</Text>
          </View>
          <View style={styles.locRow}>
            <MapPin size={18} color={c.textSecondary} />
            <Text style={{ color: c.textSecondary, marginLeft: 8 }}>{venue.location}</Text>
          </View>
          <View style={styles.locRow}>
            <Clock size={18} color={c.success} />
            <Text style={{ color: c.success, fontWeight: '500', marginLeft: 8 }}>{t('openNow')}</Text>
            <Text style={{ color: c.textSecondary, marginLeft: 4 }}>• {venue.open_time || '10:00'} – {venue.close_time || '02:00'}</Text>
          </View>
          {venue.phone ? (
            <View style={[styles.locRow, { marginTop: 4 }]}>
              <Text style={{ color: c.textSecondary, fontSize: 15 }}>📞 {venue.phone}</Text>
            </View>
          ) : null}
        </View>

        {/* Promotions / Offers */}
        {promos.length > 0 && (
          <View style={[styles.section, { backgroundColor: c.card }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Tag size={18} color={c.warning} />
              <Text style={[styles.secTitle, { color: c.text, marginLeft: 8, marginBottom: 0 }]}>
                {t('notifications') === 'Хабарламалар' ? 'Акциялар' : 'Акции'}
              </Text>
            </View>
            {promos.map((p) => (
              <View key={p.id} style={[styles.promoCard, { backgroundColor: c.bg, borderColor: c.warning }]}>
                <View style={[styles.discountBadge, { backgroundColor: c.warning }]}>
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>-{p.discount}%</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[{ color: c.text, fontWeight: '600', fontSize: 15 }]}>{p.title}</Text>
                  {p.description ? <Text style={{ color: c.textSecondary, fontSize: 13, marginTop: 2 }}>{p.description}</Text> : null}
                  {p.end_date ? <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 4 }}>до {new Date(p.end_date).toLocaleDateString('ru-RU')}</Text> : null}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* About */}
        <View style={[styles.section, { backgroundColor: c.card }]}>
          <Text style={[styles.secTitle, { color: c.text }]}>{t('about')}</Text>
          <Text style={{ color: c.textSecondary, lineHeight: 22 }}>{venue.description}</Text>
        </View>

        {/* Services */}
        {services.length > 0 && (
          <View style={[styles.section, { backgroundColor: c.card }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Wrench size={18} color={c.primary} />
              <Text style={[styles.secTitle, { color: c.text, marginLeft: 8, marginBottom: 0 }]}>
                {t('notifications') === 'Хабарламалар' ? 'Қызметтер' : 'Услуги'}
              </Text>
            </View>
            {services.map((s) => (
              <View key={s.id} style={[styles.serviceRow, { borderBottomColor: c.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[{ color: c.text, fontWeight: '600', fontSize: 15 }]}>{s.name}</Text>
                  {s.description ? <Text style={{ color: c.textSecondary, fontSize: 13, marginTop: 2 }}>{s.description}</Text> : null}
                  <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 4 }}>{s.duration} мин</Text>
                </View>
                <View style={[styles.priceBadge, { backgroundColor: c.primaryLight }]}>
                  <Text style={[{ color: c.primary, fontWeight: '700', fontSize: 15 }]}>{s.price?.toLocaleString()} ₸</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Masters / Staff */}
        {masters.length > 0 && (
          <View style={[styles.section, { backgroundColor: c.card }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Users size={18} color={c.primary} />
              <Text style={[styles.secTitle, { color: c.text, marginLeft: 8, marginBottom: 0 }]}>
                {t('notifications') === 'Хабарламалар' ? 'Мамандар' : 'Мастера'}
              </Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
              {masters.map((m) => (
                <View key={m.id} style={[styles.masterCard, { backgroundColor: c.bg }]}>
                  {m.avatar_url ? (
                    <Image source={{ uri: m.avatar_url }} style={styles.masterAvatar} />
                  ) : (
                    <View style={[styles.masterAvatar, { backgroundColor: c.primaryLight, alignItems: 'center', justifyContent: 'center' }]}>
                      <Text style={{ color: c.primary, fontWeight: '700', fontSize: 18 }}>{m.name[0]}</Text>
                    </View>
                  )}
                  <Text style={[{ color: c.text, fontWeight: '600', fontSize: 14, marginTop: 8 }]} numberOfLines={1}>{m.name}</Text>
                  {m.role ? <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 2 }}>{m.role}</Text> : null}
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Amenities */}
        <View style={[styles.section, { backgroundColor: c.card }]}>
          <Text style={[styles.secTitle, { color: c.text }]}>{t('amenities')}</Text>
          <View style={styles.amenGrid}>
            {(venue.amenities || []).map((a: string, i: number) => (
              <View key={i} style={[styles.amenBadge, { backgroundColor: c.bg }]}>
                <Text style={{ color: c.text, fontWeight: '500', fontSize: 13 }}>{a}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Photos */}
        {photos.length > 0 && (
          <View style={[styles.section, { backgroundColor: c.card }]}>
            <Text style={[styles.secTitle, { color: c.text }]}>{t('photos')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {photos.map((p) => (
                <Image key={p.id} source={{ uri: p.url }} style={styles.photoThumb} />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Add photo */}
        <Pressable style={[styles.addPhotoBtn, { borderColor: c.primary }]} onPress={pickPhoto}>
          <Camera size={18} color={c.primary} />
          <Text style={{ color: c.primary, fontWeight: '600', marginLeft: 8 }}>{t('addPhoto')}</Text>
        </Pressable>

        {/* Reviews preview */}
        <View style={[styles.section, { backgroundColor: c.card }]}>
          <View style={styles.secHeader}>
            <Text style={[styles.secTitle, { color: c.text }]}>{t('reviews')}</Text>
            <Pressable onPress={() => router.push(`/venue/${id}/reviews`)}>
              <Text style={{ color: c.primary, fontWeight: '500' }}>{t('seeAll')}</Text>
            </Pressable>
          </View>
          {reviews.map((r) => (
            <View key={r.id} style={[styles.reviewCard, { borderBottomColor: c.border }]}>
              {r.user_avatar ? (
                <Image source={{ uri: r.user_avatar }} style={styles.revAvatar} />
              ) : (
                <View style={[styles.revAvatar, { backgroundColor: c.primaryLight, alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={{ color: c.primary, fontWeight: '700' }}>{(r.user_name || '?')[0]}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '600', color: c.text }}>{r.user_name}</Text>
                <View style={{ flexDirection: 'row', marginVertical: 4 }}>
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={12} color={i < r.rating ? '#FBBF24' : c.border} fill={i < r.rating ? '#FBBF24' : 'none'} />
                  ))}
                </View>
                <Text style={{ color: c.textSecondary, fontSize: 14 }} numberOfLines={2}>{r.comment}</Text>
              </View>
            </View>
          ))}
          {reviews.length === 0 && <Text style={{ color: c.textMuted, textAlign: 'center', paddingVertical: 16 }}>{t('noReviews')}</Text>}
        </View>
      </ScrollView>

      {/* Book button */}
      <View style={[styles.footer, { backgroundColor: c.card, borderTopColor: c.border }]}>
        <Pressable style={[styles.bookBtn, { backgroundColor: c.primary }]} onPress={() => router.push(`/venue/${id}/book`)}>
          <Text style={styles.bookBtnText}>{t('bookNow')}</Text>
        </Pressable>
      </View>

      {/* Top bar — rendered LAST so it stays on top on Android */}
      <View style={styles.topBar} pointerEvents="box-none">
        <Pressable
          style={[styles.circBtn, { backgroundColor: c.card }]}
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)/' as any);
            }
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronLeft size={24} color={c.text} />
        </Pressable>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable style={[styles.circBtn, { backgroundColor: c.card }]} onPress={toggleFav}>
            <Heart size={20} color={fav ? '#EF4444' : c.text} fill={fav ? '#EF4444' : 'none'} />
          </Pressable>
          <Pressable style={[styles.circBtn, { backgroundColor: c.card }]}>
            <Share2 size={20} color={c.text} />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { position: 'absolute', top: 50, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, zIndex: 10 },
  circBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', elevation: 3 },
  mainImg: { width: '100%', height: 280 },
  infoBlock: { padding: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, marginBottom: 12 },
  catRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  catBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  catText: { fontSize: 12, fontWeight: '600' },
  venueName: { fontSize: 24, fontWeight: '700', marginBottom: 12 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  ratingNum: { fontSize: 14, fontWeight: '600', color: '#92400E', marginLeft: 4 },
  locRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  section: { padding: 20, marginHorizontal: 12, marginTop: 12, borderRadius: 16 },
  secHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  secTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  amenGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  amenBadge: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  photoThumb: { width: 100, height: 100, borderRadius: 12, marginRight: 8 },
  addPhotoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 12, paddingVertical: 14, marginHorizontal: 12, marginTop: 12 },
  reviewCard: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, gap: 12 },
  revAvatar: { width: 40, height: 40, borderRadius: 20 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24, borderTopWidth: 1 },
  bookBtn: { paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  bookBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  // New styles for services, masters, promos
  promoCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderLeftWidth: 3, marginBottom: 10 },
  discountBadge: { width: 52, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  serviceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1 },
  priceBadge: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  masterCard: { width: 100, alignItems: 'center', padding: 12, borderRadius: 14 },
  masterAvatar: { width: 56, height: 56, borderRadius: 28 },
});
