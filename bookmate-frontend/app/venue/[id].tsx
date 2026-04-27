import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Image, ScrollView, Pressable,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ChevronLeft, Star, MapPin, Heart, Share2, Clock,
  Camera, Tag, Users, Wrench,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme, useT } from '../../hooks/useHelpers';
import { useStore } from '../../hooks/useStore';
import { api } from '../../services/api';

export default function VenueDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const c = useTheme();
  const t = useT();
  const dark = useStore((s) => s.dark);
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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

  const GRAD = dark
    ? (['#7C3AED', '#6366F1'] as const)
    : (['#6366F1', '#818CF8'] as const);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: c.bg }]}>
        <ActivityIndicator style={{ marginTop: 100 }} color={c.primary} size="large" />
      </View>
    );
  }

  if (!venue) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]}>
        <Text style={{ color: c.text, textAlign: 'center', marginTop: 100 }}>{t('venueNotFound')}</Text>
      </SafeAreaView>
    );
  }

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/' as any);
  };

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>

        {/* Hero image with gradient overlay */}
        <View style={styles.heroWrap}>
          {venue.image_url
            ? <Image source={{ uri: venue.image_url }} style={styles.heroImg} />
            : (
              <View style={[styles.heroImg, { backgroundColor: dark ? '#1A2540' : '#EEF2FF', alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={{ fontSize: 64 }}>🏢</Text>
              </View>
            )}
          <LinearGradient
            colors={['rgba(0,0,0,0.0)', 'rgba(0,0,0,0.55)']}
            style={styles.heroGradient}
          />
          {/* Category pill on image */}
          <View style={[styles.heroCatPill, { backgroundColor: dark ? 'rgba(129,140,248,0.82)' : 'rgba(99,102,241,0.88)' }]}>
            <Text style={styles.heroCatText}>{venue.category}</Text>
          </View>
        </View>

        {/* Info card */}
        <View style={[styles.infoCard, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={styles.infoRow}>
            <Text style={[styles.price, { color: c.textSecondary }]}>{venue.price_range}</Text>
            <View style={styles.ratingBadge}>
              <Star size={13} color="#FCD34D" fill="#FCD34D" />
              <Text style={[styles.ratingNum, { color: c.text }]}>{venue.rating}</Text>
              <Text style={[styles.reviewCount, { color: c.textMuted }]}>({venue.review_count})</Text>
            </View>
          </View>
          <Text style={[styles.venueName, { color: c.text }]}>{venue.name}</Text>
          <View style={styles.metaItem}>
            <MapPin size={16} color={c.textSecondary} />
            <Text style={[styles.metaText, { color: c.textSecondary }]}>{venue.location}</Text>
          </View>
          <View style={styles.metaItem}>
            <Clock size={16} color={c.success} />
            <Text style={[styles.metaText, { color: c.success, fontWeight: '600' }]}>{t('openNow')}</Text>
            <Text style={[styles.metaText, { color: c.textSecondary }]}>
              • {venue.open_time || '10:00'} – {venue.close_time || '02:00'}
            </Text>
          </View>
          {venue.phone ? (
            <View style={styles.metaItem}>
              <Text style={[styles.metaText, { color: c.textSecondary }]}>📞 {venue.phone}</Text>
            </View>
          ) : null}
        </View>

        {/* Promotions */}
        {promos.length > 0 && (
          <Section title="Акции" icon={<Tag size={17} color="#FCD34D" />} c={c} dark={dark}>
            {promos.map((p) => (
              <View key={p.id} style={[styles.promoCard, {
                backgroundColor: dark ? 'rgba(252,211,77,0.07)' : '#FFFBEB',
                borderColor: dark ? 'rgba(252,211,77,0.22)' : '#FDE68A',
              }]}>
                <View style={[styles.discBadge, { backgroundColor: '#FCD34D' }]}>
                  <Text style={styles.discText}>-{p.discount}%</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={[{ color: c.text, fontWeight: '700', fontSize: 15 }]}>{p.title}</Text>
                  {p.description ? <Text style={{ color: c.textSecondary, fontSize: 13, marginTop: 2 }}>{p.description}</Text> : null}
                  {p.end_date ? <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 4 }}>до {new Date(p.end_date).toLocaleDateString('ru-RU')}</Text> : null}
                </View>
              </View>
            ))}
          </Section>
        )}

        {/* About */}
        <Section title={t('about')} c={c} dark={dark}>
          <Text style={{ color: c.textSecondary, lineHeight: 22, fontSize: 15 }}>{venue.description}</Text>
        </Section>

        {/* Services */}
        {services.length > 0 && (
          <Section title="Услуги" icon={<Wrench size={17} color={c.primary} />} c={c} dark={dark}>
            {services.map((s, i) => (
              <View key={s.id} style={[styles.serviceRow, {
                borderBottomColor: c.border,
                borderBottomWidth: i < services.length - 1 ? 1 : 0,
              }]}>
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
          </Section>
        )}

        {/* Masters */}
        {masters.length > 0 && (
          <Section title="Мастера" icon={<Users size={17} color={c.primary} />} c={c} dark={dark}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
              {masters.map((m) => (
                <View key={m.id} style={[styles.masterCard, {
                  backgroundColor: dark ? 'rgba(255,255,255,0.04)' : '#F8FAFF',
                  borderColor: c.border,
                }]}>
                  {m.avatar_url
                    ? <Image source={{ uri: m.avatar_url }} style={styles.masterAvatar} />
                    : (
                      <View style={[styles.masterAvatar, { backgroundColor: c.primaryLight, alignItems: 'center', justifyContent: 'center' }]}>
                        <Text style={{ color: c.primary, fontWeight: '700', fontSize: 20 }}>{m.name[0]}</Text>
                      </View>
                    )}
                  <Text style={[{ color: c.text, fontWeight: '600', fontSize: 14, marginTop: 10 }]} numberOfLines={1}>{m.name}</Text>
                  {m.role ? <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 2 }}>{m.role}</Text> : null}
                </View>
              ))}
            </ScrollView>
          </Section>
        )}

        {/* Amenities */}
        {(venue.amenities?.length ?? 0) > 0 && (
          <Section title={t('amenities')} c={c} dark={dark}>
            <View style={styles.amenGrid}>
              {(venue.amenities || []).map((a: string, i: number) => (
                <View key={i} style={[styles.amenBadge, {
                  backgroundColor: dark ? 'rgba(255,255,255,0.06)' : '#F4F6FF',
                  borderColor: c.border,
                }]}>
                  <Text style={{ color: c.text, fontWeight: '500', fontSize: 13 }}>{a}</Text>
                </View>
              ))}
            </View>
          </Section>
        )}

        {/* Photos */}
        {photos.length > 0 && (
          <Section title={t('photos')} c={c} dark={dark}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {photos.map((p) => (
                <Image key={p.id} source={{ uri: p.url }} style={styles.photoThumb} />
              ))}
            </ScrollView>
          </Section>
        )}

        {/* Add photo */}
        <Pressable
          style={({ pressed }) => [styles.addPhotoBtn, {
            borderColor: c.primary,
            backgroundColor: dark ? 'rgba(129,140,248,0.07)' : 'rgba(99,102,241,0.04)',
            opacity: pressed ? 0.75 : 1,
          }]}
          onPress={pickPhoto}
        >
          <Camera size={18} color={c.primary} />
          <Text style={{ color: c.primary, fontWeight: '600', marginLeft: 8 }}>{t('addPhoto')}</Text>
        </Pressable>

        {/* Reviews */}
        <Section
          title={t('reviews')}
          rightEl={
            <Pressable onPress={() => router.push(`/venue/${id}/reviews`)}>
              <Text style={{ color: c.primary, fontWeight: '600', fontSize: 14 }}>{t('seeAll')}</Text>
            </Pressable>
          }
          c={c} dark={dark}
        >
          {reviews.length === 0
            ? <Text style={{ color: c.textMuted, textAlign: 'center', paddingVertical: 12 }}>{t('noReviews')}</Text>
            : reviews.map((r, i) => (
              <View key={r.id} style={[styles.reviewCard, {
                borderBottomColor: c.border,
                borderBottomWidth: i < reviews.length - 1 ? 1 : 0,
              }]}>
                {r.user_avatar
                  ? <Image source={{ uri: r.user_avatar }} style={styles.revAvatar} />
                  : (
                    <View style={[styles.revAvatar, { backgroundColor: c.primaryLight, alignItems: 'center', justifyContent: 'center' }]}>
                      <Text style={{ color: c.primary, fontWeight: '700' }}>{(r.user_name || '?')[0]}</Text>
                    </View>
                  )}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700', color: c.text, marginBottom: 4 }}>{r.user_name}</Text>
                  <View style={{ flexDirection: 'row', marginBottom: 6, gap: 2 }}>
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={12} color={i < r.rating ? '#FCD34D' : c.border} fill={i < r.rating ? '#FCD34D' : 'none'} />
                    ))}
                  </View>
                  <Text style={{ color: c.textSecondary, fontSize: 14, lineHeight: 20 }} numberOfLines={2}>{r.comment}</Text>
                </View>
              </View>
            ))}
        </Section>
      </ScrollView>

      {/* Floating top bar — rendered last for z-index */}
      <View style={styles.topBar} pointerEvents="box-none">
        <Pressable
          style={({ pressed }) => [styles.circBtn, {
            backgroundColor: dark ? 'rgba(15,23,41,0.85)' : 'rgba(255,255,255,0.90)',
            borderColor: dark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)',
            opacity: pressed ? 0.8 : 1,
          }]}
          onPress={goBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronLeft size={24} color={c.text} />
        </Pressable>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable
            style={({ pressed }) => [styles.circBtn, {
              backgroundColor: dark ? 'rgba(15,23,41,0.85)' : 'rgba(255,255,255,0.90)',
              borderColor: dark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)',
              opacity: pressed ? 0.8 : 1,
            }]}
            onPress={toggleFav}
          >
            <Heart size={20} color={fav ? '#F87171' : c.text} fill={fav ? '#F87171' : 'none'} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.circBtn, {
              backgroundColor: dark ? 'rgba(15,23,41,0.85)' : 'rgba(255,255,255,0.90)',
              borderColor: dark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)',
              opacity: pressed ? 0.8 : 1,
            }]}
          >
            <Share2 size={20} color={c.text} />
          </Pressable>
        </View>
      </View>

      {/* Book button */}
      <View style={[styles.footer, {
        backgroundColor: dark ? 'rgba(6,10,21,0.94)' : 'rgba(255,255,255,0.94)',
        borderTopColor: c.border,
      }]}>
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push(`/venue/${id}/book`); }}
          style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.85 : 1 })}
        >
          <LinearGradient
            colors={dark ? ['#7C3AED', '#6366F1'] : ['#6366F1', '#818CF8']}
            style={styles.bookBtn}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          >
            <Text style={styles.bookBtnText}>{t('bookNow')}</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

function Section({ title, icon, rightEl, children, c, dark }: any) {
  return (
    <View style={[styles.section, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={styles.sectionHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {icon ?? null}
          <Text style={[styles.sectionTitle, { color: c.text }]}>{title}</Text>
        </View>
        {rightEl ?? null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  heroWrap: { position: 'relative' },
  heroImg: { width: '100%', height: 300 },
  heroGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 140 },
  heroCatPill: {
    position: 'absolute', bottom: 16, left: 16,
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
  },
  heroCatText: { color: '#fff', fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  infoCard: {
    marginHorizontal: 16, marginTop: -24, borderRadius: 24,
    padding: 20, borderWidth: 1, zIndex: 5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 16, elevation: 8,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  price: { fontSize: 13, fontWeight: '500' },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingNum: { fontSize: 14, fontWeight: '700' },
  reviewCount: { fontSize: 13 },
  venueName: { fontSize: 24, fontWeight: '800', marginBottom: 14, letterSpacing: -0.5 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  metaText: { fontSize: 14, flex: 1 },
  section: {
    marginHorizontal: 16, marginTop: 14, borderRadius: 20,
    padding: 18, borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 14,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  promoCard: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    borderRadius: 14, borderWidth: 1, marginBottom: 10,
  },
  discBadge: { width: 54, height: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  discText: { color: '#000', fontWeight: '900', fontSize: 15 },
  serviceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  priceBadge: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  masterCard: { width: 100, alignItems: 'center', padding: 12, borderRadius: 16, borderWidth: 1 },
  masterAvatar: { width: 58, height: 58, borderRadius: 29 },
  amenGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  amenBadge: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 22, borderWidth: 1 },
  photoThumb: { width: 110, height: 110, borderRadius: 16 },
  addPhotoBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderRadius: 16, paddingVertical: 14,
    marginHorizontal: 16, marginTop: 14, borderStyle: 'dashed',
  },
  reviewCard: { flexDirection: 'row', paddingVertical: 14, gap: 12 },
  revAvatar: { width: 42, height: 42, borderRadius: 21 },
  topBar: {
    position: 'absolute', top: 52, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 16, zIndex: 20,
  },
  circBtn: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18, shadowRadius: 8, elevation: 4,
  },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingTop: 14, paddingBottom: 28, borderTopWidth: 1,
  },
  bookBtn: { height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  bookBtnText: { color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: 0.3 },
});
