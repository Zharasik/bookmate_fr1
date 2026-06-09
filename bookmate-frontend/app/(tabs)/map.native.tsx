import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { MapPressEvent, Marker, PROVIDER_DEFAULT, Region, UrlTile } from 'react-native-maps';
import { useRouter } from 'expo-router';
import { Locate, MapPin, Star, X } from 'lucide-react-native';
import { api } from '../../services/api';
import { useTheme, useT } from '../../hooks/useHelpers';
import { useStore } from '../../hooks/useStore';
import {
  clusterPoints, formatDistance, haversineKm, isOpenNow, useUserLocation,
} from '../../hooks/useGeo';

type VenueMapItem = {
  id: string;
  name: string;
  category: string;
  location: string;
  latitude: number;
  longitude: number;
  rating: number;
  review_count: number;
  image_url: string | null;
  open_time: string | null;
  close_time: string | null;
};

const ALMATY: Region = { latitude: 43.238949, longitude: 76.889709, latitudeDelta: 0.2, longitudeDelta: 0.2 };
const RATING_OPTIONS = [0, 4, 4.5];

export default function MapScreen() {
  const c = useTheme();
  const t = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const mapFocus = useStore((s) => s.mapFocus);
  const setMapFocus = useStore((s) => s.setMapFocus);
  const mapRef = useRef<MapView>(null);
  const { location, status: locationStatus, requestLocation } = useUserLocation();

  const [venues, setVenues] = useState<VenueMapItem[]>([]);
  const [categories, setCategories] = useState<string[]>(['All']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [region, setRegion] = useState<Region>(ALMATY);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [minRating, setMinRating] = useState(0);
  const [openNowOnly, setOpenNowOnly] = useState(false);
  const [nearbyOnly, setNearbyOnly] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState<VenueMapItem | null>(null);

  const normalizeVenues = (data: any[]): VenueMapItem[] => (
    (data || [])
      .map((v: any) => ({
        id: String(v.id),
        name: String(v.name || ''),
        category: v.category ? String(v.category) : '',
        location: v.location ? String(v.location) : '',
        latitude: Number(v.latitude),
        longitude: Number(v.longitude),
        rating: Number(v.rating) || 0,
        review_count: Number(v.review_count) || 0,
        image_url: v.image_url || null,
        open_time: v.open_time || null,
        close_time: v.close_time || null,
      }))
      .filter((v: VenueMapItem) => Number.isFinite(v.latitude) && Number.isFinite(v.longitude))
  );

  const loadVenues = async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, cats] = await Promise.all([api.getVenues(), api.getCategories().catch(() => ['All'])]);
      setVenues(normalizeVenues(data));
      setCategories(cats);
    } catch (_e) {
      setError('Failed to load venues');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVenues().catch(() => {});
  }, []);

  useEffect(() => {
    if (!mapFocus || venues.length === 0) return;
    mapRef.current?.animateToRegion({
      latitude: mapFocus.latitude, longitude: mapFocus.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05,
    }, 400);
    const venue = venues.find((v) => v.id === mapFocus.venueId) || null;
    if (venue) setSelectedVenue(venue);
    setMapFocus(null);
  }, [mapFocus, venues, setMapFocus]);

  const handleNearMe = async () => {
    if (nearbyOnly) {
      setNearbyOnly(false);
      return;
    }
    setNearbyOnly(true);
    if (!location) await requestLocation();
  };

  useEffect(() => {
    if (location && nearbyOnly) {
      mapRef.current?.animateToRegion({ ...location, latitudeDelta: 0.08, longitudeDelta: 0.08 }, 400);
    }
  }, [location, nearbyOnly]);

  const filteredVenues = useMemo(() => {
    let list = venues;
    if (selectedCategory !== 'All') list = list.filter((v) => v.category === selectedCategory);
    if (minRating > 0) list = list.filter((v) => v.rating >= minRating);
    if (openNowOnly) list = list.filter((v) => isOpenNow(v.open_time, v.close_time));
    if (nearbyOnly && location) {
      list = [...list].sort((a, b) => haversineKm(location, a) - haversineKm(location, b)).slice(0, 30);
    }
    return list;
  }, [venues, selectedCategory, minRating, openNowOnly, nearbyOnly, location]);

  const clusters = useMemo(
    () => clusterPoints(filteredVenues, region.latitudeDelta, region.longitudeDelta),
    [filteredVenues, region.latitudeDelta, region.longitudeDelta],
  );

  const distanceTo = (v: VenueMapItem): string | null => (location ? formatDistance(haversineKm(location, v), t) : null);

  const onClusterPress = (cluster: { latitude: number; longitude: number; items: VenueMapItem[] }) => {
    if (cluster.items.length === 1) {
      setSelectedVenue(cluster.items[0]);
      return;
    }
    setSelectedVenue(null);
    mapRef.current?.animateToRegion({
      latitude: cluster.latitude,
      longitude: cluster.longitude,
      latitudeDelta: region.latitudeDelta / 3,
      longitudeDelta: region.longitudeDelta / 3,
    }, 350);
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: c.bg }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centered, { backgroundColor: c.bg }]}>
        <Text style={[styles.errorText, { color: c.text }]}>{error}</Text>
        <Pressable style={[styles.retryButton, { backgroundColor: c.primary }]} onPress={() => loadVenues()}>
          <Text style={styles.retryText}>{t('retry')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        mapType="none"
        initialRegion={ALMATY}
        showsUserLocation={locationStatus === 'granted'}
        showsMyLocationButton={false}
        onRegionChangeComplete={setRegion}
        onPress={(e: MapPressEvent) => {
          if (e.nativeEvent.action === 'marker-press') return;
          setSelectedVenue(null);
        }}
      >
        <UrlTile
          urlTemplate="https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"
          maximumZ={19}
          flipY={false}
          zIndex={-1}
        />
        {clusters.map((cluster) => (
          cluster.items.length > 1 ? (
            <Marker
              key={cluster.key}
              coordinate={{ latitude: cluster.latitude, longitude: cluster.longitude }}
              onPress={(e) => { e.stopPropagation(); onClusterPress(cluster); }}
              tracksViewChanges={false}
            >
              <View style={[styles.clusterBubble, { backgroundColor: c.primary, borderColor: c.card }]}>
                <Text style={styles.clusterText}>{cluster.items.length}</Text>
              </View>
            </Marker>
          ) : (
            <Marker
              key={cluster.items[0].id}
              coordinate={{ latitude: cluster.items[0].latitude, longitude: cluster.items[0].longitude }}
              title={cluster.items[0].name}
              description={cluster.items[0].category || 'Venue'}
              onPress={(e) => { e.stopPropagation(); setSelectedVenue(cluster.items[0]); }}
              pinColor={c.primary}
            />
          )
        ))}
      </MapView>

      <View style={[styles.filterOverlay, { top: insets.top + 12 }]} pointerEvents="box-none">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          <Pressable
            style={[styles.chip, { backgroundColor: nearbyOnly ? c.primary : c.card, borderColor: nearbyOnly ? c.primary : c.border }]}
            onPress={() => (nearbyOnly ? setNearbyOnly(false) : handleNearMe())}
          >
            <Locate size={14} color={nearbyOnly ? '#fff' : c.textSecondary} />
            <Text style={[styles.chipText, { color: nearbyOnly ? '#fff' : c.textSecondary, marginLeft: 6 }]}>{t('nearMe')}</Text>
          </Pressable>
          <Pressable
            style={[styles.chip, { backgroundColor: openNowOnly ? c.primary : c.card, borderColor: openNowOnly ? c.primary : c.border }]}
            onPress={() => setOpenNowOnly((v) => !v)}
          >
            <Text style={[styles.chipText, { color: openNowOnly ? '#fff' : c.textSecondary }]}>{t('openNow')}</Text>
          </Pressable>
          {RATING_OPTIONS.filter((r) => r > 0).map((r) => (
            <Pressable
              key={r}
              style={[styles.chip, { backgroundColor: minRating === r ? c.primary : c.card, borderColor: minRating === r ? c.primary : c.border }]}
              onPress={() => setMinRating((cur) => (cur === r ? 0 : r))}
            >
              <Star size={13} color={minRating === r ? '#fff' : '#FBBF24'} fill={minRating === r ? '#fff' : '#FBBF24'} />
              <Text style={[styles.chipText, { color: minRating === r ? '#fff' : c.textSecondary, marginLeft: 4 }]}>{r.toFixed(1)}+</Text>
            </Pressable>
          ))}
          {categories.map((cat) => (
            <Pressable
              key={cat}
              style={[styles.chip, { backgroundColor: selectedCategory === cat ? c.primary : c.card, borderColor: selectedCategory === cat ? c.primary : c.border }]}
              onPress={() => setSelectedCategory((cur) => (cur === cat ? 'All' : cat))}
            >
              <Text style={[styles.chipText, { color: selectedCategory === cat ? '#fff' : c.textSecondary }]}>
                {cat === 'All' ? t('all') : cat}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        {locationStatus === 'denied' && (
          <View style={[styles.noticeBox, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[styles.noticeText, { color: c.textSecondary }]}>{t('locationDenied')}</Text>
          </View>
        )}
      </View>

      {selectedVenue && (
        <Pressable style={[styles.venueCard, { backgroundColor: c.card, borderColor: c.border }]} onPress={() => router.push(`/venue/${selectedVenue.id}` as any)}>
          <Pressable style={styles.closeBtn} onPress={() => setSelectedVenue(null)} hitSlop={10}>
            <X size={16} color={c.textMuted} />
          </Pressable>
          {selectedVenue.image_url
            ? <Image source={{ uri: selectedVenue.image_url }} style={styles.venueImg} />
            : <View style={[styles.venueImg, { backgroundColor: c.primaryLight, alignItems: 'center', justifyContent: 'center' }]}><Text style={{ fontSize: 28 }}>🏢</Text></View>}
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.venueName, { color: c.text }]} numberOfLines={1}>{selectedVenue.name}</Text>
            <View style={styles.metaRow}>
              <MapPin size={12} color={c.textMuted} />
              <Text style={[styles.metaText, { color: c.textSecondary }]} numberOfLines={1}>{selectedVenue.location}</Text>
            </View>
            <View style={styles.metaRow}>
              <Star size={12} color="#FBBF24" fill="#FBBF24" />
              <Text style={styles.ratingText}>{selectedVenue.rating}</Text>
              <Text style={[styles.reviewCount, { color: c.textMuted }]}>({selectedVenue.review_count})</Text>
              <Text style={{ color: isOpenNow(selectedVenue.open_time, selectedVenue.close_time) ? c.success : c.danger, fontSize: 12, fontWeight: '600', marginLeft: 6 }}>
                {isOpenNow(selectedVenue.open_time, selectedVenue.close_time) ? t('openNow') : t('closedNow')}
              </Text>
              {distanceTo(selectedVenue) && (
                <Text style={[styles.metaText, { color: c.textSecondary, marginLeft: 6 }]}>· {distanceTo(selectedVenue)}</Text>
              )}
            </View>
          </View>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorText: { fontSize: 15, fontWeight: '600' },
  retryButton: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  filterOverlay: { position: 'absolute', left: 0, right: 0 },
  filterRow: { paddingHorizontal: 12, gap: 8, alignItems: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, marginRight: 8 },
  chipText: { fontSize: 12, fontWeight: '600' },
  noticeBox: { marginTop: 8, marginHorizontal: 12, padding: 10, borderRadius: 10, borderWidth: 1, alignSelf: 'flex-start' },
  noticeText: { fontSize: 12 },

  clusterBubble: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  clusterText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  venueCard: {
    position: 'absolute', left: 12, right: 12, bottom: 16, borderRadius: 16, borderWidth: 1,
    flexDirection: 'row', alignItems: 'center', padding: 12,
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  closeBtn: { position: 'absolute', top: 8, right: 8, zIndex: 1 },
  venueImg: { width: 56, height: 56, borderRadius: 12 },
  venueName: { fontSize: 15, fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
  metaText: { fontSize: 12 },
  ratingText: { fontSize: 12, fontWeight: '700', color: '#1F2937', marginLeft: 2 },
  reviewCount: { fontSize: 11 },
});
