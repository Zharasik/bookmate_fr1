import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, ScrollView, Image,
  Pressable, ActivityIndicator, RefreshControl, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Search, Star, MapPin, Bell, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme, useT } from '../../hooks/useHelpers';
import { useStore } from '../../hooks/useStore';
import { api } from '../../services/api';

const CATEGORY_EMOJI: Record<string, string> = {
  All: '✦', Барбершоп: '✂️', Бильярд: '🎱', Коворкинг: '💻',
  'Игровой клуб': '🎮', Спортзал: '🏋️', Ресторан: '🍽️', Салон: '💅',
};

export default function ExploreScreen() {
  const c = useTheme();
  const t = useT();
  const router = useRouter();
  const dark = useStore((s) => s.dark);
  const user = useStore((s) => s.user);

  const [categories, setCategories] = useState<string[]>(['All']);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [venues, setVenues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [focused, setFocused] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const GRAD = dark
    ? (['#7C3AED', '#6366F1'] as const)
    : (['#6366F1', '#818CF8'] as const);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [cats, v] = await Promise.all([
        api.getCategories().catch(() => ['All']),
        api.getVenues(selectedCategory, searchQuery),
      ]);
      setCategories(cats);
      setVenues(v);
    } catch { } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory, searchQuery]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Доброе утро' : hour < 18 ? 'Добрый день' : 'Добрый вечер';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]} edges={['top']}>
      {/* Background gradient hint */}
      {dark && (
        <View style={styles.bgGlow} />
      )}

      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={[styles.greeting, { color: c.textMuted }]}>{greeting} 👋</Text>
            <Text style={[styles.headerTitle, { color: c.text }]}>Найди место</Text>
          </View>
          <View style={styles.headerRight}>
            <Pressable
              style={[styles.iconBtn, { backgroundColor: c.card, borderColor: c.border }]}
              onPress={() => router.push('/(tabs)/notifications' as any)}
            >
              <Bell size={18} color={c.textSecondary} />
            </Pressable>
            <Pressable
              style={[styles.avatarBtn, { borderColor: c.primary }]}
              onPress={() => { Haptics.selectionAsync(); router.push('/(tabs)/profile' as any); }}
            >
              {user?.avatar_url
                ? <Image source={{ uri: user.avatar_url }} style={styles.avatarImg} />
                : (
                  <LinearGradient colors={GRAD} style={styles.avatarGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                    <Text style={styles.avatarTxt}>{user?.name?.[0]?.toUpperCase() || 'U'}</Text>
                  </LinearGradient>
                )}
            </Pressable>
          </View>
        </View>

        {/* Search */}
        <View style={[styles.searchBox, {
          backgroundColor: c.card,
          borderColor: focused ? c.primary : c.border,
        }]}>
          <Search size={18} color={focused ? c.primary : c.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: c.text }]}
            placeholder={t('searchPlaceholder')}
            placeholderTextColor={c.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
              <Text style={[styles.clearBtn, { color: c.textMuted }]}>✕</Text>
            </Pressable>
          )}
        </View>

        {/* Categories */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.catWrap}
          contentContainerStyle={styles.catContent}
        >
          {categories.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <Pressable
                key={cat}
                onPress={() => { setSelectedCategory(cat); Haptics.selectionAsync(); }}
                style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
              >
                {active
                  ? (
                    <LinearGradient
                      colors={GRAD}
                      style={styles.chipActive}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    >
                      <Text style={styles.chipEmojiActive}>{CATEGORY_EMOJI[cat] || '•'}</Text>
                      <Text style={styles.chipTextActive}>{cat === 'All' ? t('all') : cat}</Text>
                    </LinearGradient>
                  )
                  : (
                    <View style={[styles.chip, { backgroundColor: c.card, borderColor: c.border }]}>
                      <Text style={[styles.chipEmoji]}>{CATEGORY_EMOJI[cat] || '•'}</Text>
                      <Text style={[styles.chipText, { color: c.textSecondary }]}>{cat === 'All' ? t('all') : cat}</Text>
                    </View>
                  )}
              </Pressable>
            );
          })}
        </ScrollView>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={c.primary} size="large" />
          </View>
        ) : (
          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listInner}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => { setRefreshing(true); fetchData(); }}
                tintColor={c.primary}
              />
            }
          >
            {venues.length === 0 ? (
              <View style={styles.empty}>
                <Text style={{ fontSize: 52, marginBottom: 16 }}>🔍</Text>
                <Text style={[styles.emptyTitle, { color: c.text }]}>Ничего не найдено</Text>
                <Text style={[styles.emptySub, { color: c.textMuted }]}>Попробуйте другой запрос</Text>
              </View>
            ) : (
              venues.map((venue, idx) => (
                <VenueCard
                  key={venue.id}
                  venue={venue}
                  dark={dark}
                  c={c}
                  GRAD={GRAD}
                  onPress={() => router.push(`/venue/${venue.id}` as any)}
                  delay={idx * 60}
                />
              ))
            )}
            <View style={{ height: 80 }} />
          </ScrollView>
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

function VenueCard({
  venue, dark, c, GRAD, onPress, delay,
}: {
  venue: any; dark: boolean; c: any; GRAD: readonly [string, string]; onPress: () => void; delay: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1, duration: 400, delay, useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={{
      opacity: anim,
      transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
    }}>
      <Pressable
        style={({ pressed }) => [styles.card, {
          backgroundColor: c.card,
          borderColor: c.border,
          transform: [{ scale: pressed ? 0.975 : 1 }],
        }]}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
      >
        {/* Image */}
        <View style={styles.cardImgWrap}>
          {venue.image_url
            ? <Image source={{ uri: venue.image_url }} style={styles.cardImg} />
            : (
              <View style={[styles.cardImg, { backgroundColor: dark ? '#1A2540' : '#EEF2FF', alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={{ fontSize: 44 }}>🏢</Text>
              </View>
            )}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.72)']}
            style={styles.imgOverlay}
          />
          {/* Rating on image */}
          <View style={styles.ratingPill}>
            <Star size={11} color="#FCD34D" fill="#FCD34D" />
            <Text style={styles.ratingPillText}>{venue.rating}</Text>
          </View>
          {/* Category on image */}
          <View style={[styles.catPill, { backgroundColor: dark ? 'rgba(129,140,248,0.85)' : 'rgba(99,102,241,0.88)' }]}>
            <Text style={styles.catPillText}>{venue.category}</Text>
          </View>
        </View>

        {/* Info */}
        <View style={styles.cardInfo}>
          <View style={styles.cardRow}>
            <Text style={[styles.cardName, { color: c.text }]} numberOfLines={1}>{venue.name}</Text>
            <ChevronRight size={16} color={c.textMuted} />
          </View>
          <View style={styles.metaRow}>
            <MapPin size={13} color={c.textMuted} />
            <Text style={[styles.metaText, { color: c.textSecondary }]} numberOfLines={1}>{venue.location}</Text>
          </View>
          {venue.review_count > 0 && (
            <Text style={[styles.reviewCount, { color: c.textMuted }]}>{venue.review_count} отзывов</Text>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bgGlow: {
    position: 'absolute', width: 400, height: 300, borderRadius: 200,
    backgroundColor: 'rgba(99,102,241,0.07)', top: 0, right: -100,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14,
  },
  headerLeft: { flex: 1 },
  greeting: { fontSize: 13, fontWeight: '500', marginBottom: 2 },
  headerTitle: { fontSize: 24, fontWeight: '800', letterSpacing: -0.6 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBtn: {
    width: 40, height: 40, borderRadius: 13, alignItems: 'center',
    justifyContent: 'center', borderWidth: 1,
  },
  avatarBtn: { width: 42, height: 42, borderRadius: 14, borderWidth: 2, overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%' },
  avatarGrad: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { color: '#fff', fontSize: 17, fontWeight: '800' },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 20,
    paddingHorizontal: 16, borderRadius: 16, height: 50, gap: 10,
    borderWidth: 1.5,
  },
  searchInput: { flex: 1, fontSize: 15 },
  clearBtn: { fontSize: 14, fontWeight: '600' },
  catWrap: { maxHeight: 52, marginTop: 14 },
  catContent: { paddingHorizontal: 20, gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 22, borderWidth: 1,
  },
  chipActive: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 22,
  },
  chipEmoji: { fontSize: 13 },
  chipEmojiActive: { fontSize: 13 },
  chipText: { fontSize: 13, fontWeight: '600' },
  chipTextActive: { fontSize: 13, fontWeight: '600', color: '#fff' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 60 },
  list: { flex: 1, marginTop: 16 },
  listInner: { paddingHorizontal: 20, gap: 16 },
  card: { borderRadius: 22, overflow: 'hidden', borderWidth: 1 },
  cardImgWrap: { position: 'relative' },
  cardImg: { width: '100%', height: 180 },
  imgOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 90 },
  ratingPill: {
    position: 'absolute', bottom: 10, right: 12,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 20,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  ratingPillText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  catPill: {
    position: 'absolute', bottom: 10, left: 12,
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
  },
  catPillText: { color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },
  cardInfo: { padding: 16, gap: 6 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardName: { fontSize: 17, fontWeight: '700', flex: 1, letterSpacing: -0.2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 13, flex: 1 },
  reviewCount: { fontSize: 12, fontWeight: '500' },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  emptySub: { fontSize: 14 },
});
