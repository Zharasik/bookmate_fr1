import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Check } from 'lucide-react-native';
import { useTheme, useT } from '../../hooks/useHelpers';
import { api } from '../../services/api';

const ALMATY = { latitude: 43.238949, longitude: 76.889709 };

export default function VenueLocationScreen() {
  const router = useRouter();
  const c = useTheme();
  const t = useT();
  const { venueId, venueName, lat, lng } = useLocalSearchParams<{ venueId: string; venueName: string; lat?: string; lng?: string }>();

  const startPoint = useMemo(() => {
    const initialLat = Number(lat);
    const initialLng = Number(lng);
    const hasInitial = Number.isFinite(initialLat) && Number.isFinite(initialLng) && (initialLat !== 0 || initialLng !== 0);
    return hasInitial ? { latitude: initialLat, longitude: initialLng } : null;
  }, [lat, lng]);

  const [point, setPoint] = useState<{ latitude: number; longitude: number } | null>(startPoint);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const data = e.data;
      if (data && data.type === 'venue-location-pick') {
        setPoint({ latitude: data.lat, longitude: data.lng });
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

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

  const srcDoc = useMemo(() => {
    const center = startPoint || ALMATY;
    const start = startPoint ? JSON.stringify(startPoint) : 'null';
    return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>html,body,#map{height:100%;margin:0;padding:0}</style>
</head><body><div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
const start=${start};
const map=L.map('map').setView([${center.latitude},${center.longitude}], ${startPoint ? 15 : 12});
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
let marker=null;
function placeMarker(lat,lng){
  if(marker) marker.setLatLng([lat,lng]);
  else marker=L.marker([lat,lng],{draggable:true}).addTo(map).on('dragend',()=>{
    const p=marker.getLatLng();
    window.parent.postMessage({type:'venue-location-pick',lat:p.lat,lng:p.lng}, '*');
  });
  window.parent.postMessage({type:'venue-location-pick',lat,lng}, '*');
}
if(start) placeMarker(start.latitude,start.longitude);
map.on('click',(e)=>placeMarker(e.latlng.lat,e.latlng.lng));
</script></body></html>`;
  }, [startPoint]);

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

      <View style={{ flex: 1 }}>
        <iframe srcDoc={srcDoc} style={{ border: 0, width: '100%', height: '100%' } as any} title="Pick venue location" />
      </View>
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
});
