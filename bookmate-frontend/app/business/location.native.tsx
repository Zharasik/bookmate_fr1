import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MapView, { MapPressEvent, Marker, PROVIDER_DEFAULT, Region, UrlTile } from 'react-native-maps';
import { ChevronLeft, Check } from 'lucide-react-native';
import { useTheme, useT } from '../../hooks/useHelpers';
import { api } from '../../services/api';

const ALMATY: Region = { latitude: 43.238949, longitude: 76.889709, latitudeDelta: 0.1, longitudeDelta: 0.1 };

export default function VenueLocationScreen() {
  const router = useRouter();
  const c = useTheme();
  const t = useT();
  const { venueId, venueName, lat, lng } = useLocalSearchParams<{ venueId: string; venueName: string; lat?: string; lng?: string }>();

  const initialLat = Number(lat);
  const initialLng = Number(lng);
  const hasInitial = Number.isFinite(initialLat) && Number.isFinite(initialLng) && (initialLat !== 0 || initialLng !== 0);

  const [point, setPoint] = useState<{ latitude: number; longitude: number } | null>(
    hasInitial ? { latitude: initialLat, longitude: initialLng } : null,
  );
  const [saving, setSaving] = useState(false);

  const initialRegion: Region = hasInitial
    ? { latitude: initialLat, longitude: initialLng, latitudeDelta: 0.05, longitudeDelta: 0.05 }
    : ALMATY;

  const onMapPress = (e: MapPressEvent) => {
    if (e.nativeEvent.action === 'marker-press') return;
    setPoint(e.nativeEvent.coordinate);
  };

  const save = async () => {
    if (!point || !venueId) return;
    setSaving(true);
    try {
      await api.business.updateVenue(venueId, { latitude: point.latitude, longitude: point.longitude } as any);
      Alert.alert(t('locationSaved'));
      router.back();
    } catch (e: any) {
      Alert.alert(t('error'), e?.message || '');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: c.card, borderBottomColor: c.border }]}>
        <Pressable style={styles.back} onPress={() => router.back()}>
          <ChevronLeft size={24} color={c.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: c.text }]} numberOfLines={1}>
            {decodeURIComponent(venueName || '')}
          </Text>
          <Text style={[styles.headerSub, { color: c.textMuted }]}>{t('tapMapToPlacePin')}</Text>
        </View>
        <Pressable style={[styles.saveBtn, { backgroundColor: point ? c.primary : c.border }]} onPress={save} disabled={!point || saving}>
          {saving ? <ActivityIndicator size="small" color="#fff" /> : <Check size={20} color="#fff" />}
        </Pressable>
      </View>

      <MapView
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        mapType="none"
        initialRegion={initialRegion}
        onPress={onMapPress}
      >
        <UrlTile
          urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maximumZ={19}
          flipY={false}
          zIndex={-1}
        />
        {point && (
          <Marker
            coordinate={point}
            draggable
            onDragEnd={(e) => setPoint(e.nativeEvent.coordinate)}
            pinColor={c.primary}
          />
        )}
      </MapView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, gap: 12 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  headerSub: { fontSize: 12, marginTop: 2 },
  saveBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  map: { flex: 1 },
});
