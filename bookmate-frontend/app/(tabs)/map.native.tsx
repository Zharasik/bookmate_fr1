import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, UrlTile } from 'react-native-maps';
import { useRouter } from 'expo-router';
import { api } from '../../services/api';
import { useTheme } from '../../hooks/useHelpers';

type VenueMapItem = {
  id: string;
  name: string;
  category?: string;
  latitude: number;
  longitude: number;
};

export default function MapScreen() {
  const c = useTheme();
  const router = useRouter();
  const [venues, setVenues] = useState<VenueMapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const normalizeVenues = (data: any[]): VenueMapItem[] => (
    (data || [])
      .map((v: any) => ({
        id: String(v.id),
        name: String(v.name || ''),
        category: v.category ? String(v.category) : '',
        latitude: Number(v.latitude),
        longitude: Number(v.longitude),
      }))
      .filter((v: VenueMapItem) => Number.isFinite(v.latitude) && Number.isFinite(v.longitude))
  );

  const loadVenues = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getVenues();
      setVenues(normalizeVenues(data));
    } catch (_e) {
      setError('Failed to load venues');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVenues().catch(() => {});
  }, []);

  const markers = useMemo(() => venues, [venues]);

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
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        mapType="none"
        initialRegion={{
          latitude: 43.238949,
          longitude: 76.889709,
          latitudeDelta: 0.2,
          longitudeDelta: 0.2,
        }}
      >
        <UrlTile
          urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maximumZ={19}
          flipY={false}
          zIndex={-1}
        />
        {markers.map((venue) => (
          <Marker
            key={venue.id}
            coordinate={{ latitude: venue.latitude, longitude: venue.longitude }}
            title={venue.name}
            description={venue.category || 'Venue'}
            onPress={() => router.push(`/venue/${venue.id}` as any)}
            pinColor={c.primary}
          />
        ))}
      </MapView>
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
});
