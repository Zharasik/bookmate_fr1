import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, Image, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Star, ChevronRight, MapPin } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme, useT } from '../../hooks/useHelpers';
import { api } from '../../services/api';

let MapView: any;
let Marker: any;
if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
}

export default function MapScreen() {
  const c = useTheme();
  const t = useT();
  const router = useRouter();
  const [venues, setVenues] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getVenues().then((v) => { setVenues(v); if (v.length) setSelected(v[0]); }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <View style={[styles.container, { backgroundColor: c.bg }]}><ActivityIndicator style={{ marginTop: 60 }} color={c.primary} size="large" /></View>;

  // Web fallback
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, { backgroundColor: c.bg }]}>
        <SafeAreaView style={styles.overlay} edges={['top']}>
          <View style={[styles.header, { backgroundColor: c.card }]}>
            <Text style={[styles.headerTitle, { color: c.text }]}>{t('discoverVenues')}</Text>
          </View>
        </SafeAreaView>
        <ScrollView style={{ paddingTop: 80 }} contentContainerStyle={{ paddingBottom: 100 }}>
          <View style={[styles.placeholder, { backgroundColor: c.card }]}>
            <MapPin size={48} color={c.primary} />
            <Text style={[styles.phTitle, { color: c.text }]}>{t('map')}</Text>
          </View>
          {venues.map((v) => (
            <Pressable key={v.id} style={[styles.webCard, { backgroundColor: c.card, borderColor: selected?.id === v.id ? c.primary : 'transparent' }]} onPress={() => { setSelected(v); router.push(`/venue/${v.id}`); }}>
              <Image source={{ uri: v.image_url }} style={styles.webImg} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.webName, { color: c.text }]}>{v.name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Star size={14} color="#FBBF24" fill="#FBBF24" />
                  <Text style={{ color: '#FBBF24', marginLeft: 4, fontWeight: '500' }}>{v.rating}</Text>
                </View>
              </View>
              <ChevronRight size={20} color={c.textMuted} />
            </Pressable>
          ))}
        </ScrollView>
      </View>
    );
  }

  // Native map
  return (
    <View style={styles.container}>
      {MapView && (
        <MapView
          style={StyleSheet.absoluteFillObject}
          initialRegion={{ latitude: 43.2389, longitude: 76.8897, latitudeDelta: 0.09, longitudeDelta: 0.04 }}
        >
          {venues.map((v) => (
            <Marker key={v.id} coordinate={{ latitude: v.latitude, longitude: v.longitude }} onPress={() => setSelected(v)}>
              <View style={[styles.marker, { backgroundColor: c.primary, transform: [{ scale: selected?.id === v.id ? 1.2 : 1 }] }]}>
                <View style={styles.markerInner} />
              </View>
            </Marker>
          ))}
        </MapView>
      )}
      <SafeAreaView style={styles.overlay} edges={['top']}>
        <View style={[styles.header, { backgroundColor: c.card }]}>
          <Text style={[styles.headerTitle, { color: c.text }]}>{t('discoverVenues')}</Text>
        </View>
      </SafeAreaView>
      {selected && (
        <Pressable style={[styles.bottomCard, { backgroundColor: c.card }]} onPress={() => router.push(`/venue/${selected.id}`)}>
          <Image source={{ uri: selected.image_url }} style={{ width: 60, height: 60, borderRadius: 12 }} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[{ fontSize: 16, fontWeight: '600' }, { color: c.text }]}>{selected.name}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <Star size={14} color="#FBBF24" fill="#FBBF24" />
              <Text style={{ color: '#FBBF24', marginLeft: 4 }}>{selected.rating}</Text>
            </View>
          </View>
          <ChevronRight size={20} color={c.textMuted} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0 },
  header: { marginHorizontal: 16, marginTop: 8, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, elevation: 3 },
  headerTitle: { fontSize: 18, fontWeight: '600', textAlign: 'center' },
  marker: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', elevation: 5 },
  markerInner: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#fff' },
  bottomCard: { position: 'absolute', bottom: 24, left: 16, right: 16, borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', elevation: 5 },
  placeholder: { marginHorizontal: 16, marginTop: 16, paddingVertical: 60, borderRadius: 16, alignItems: 'center' },
  phTitle: { fontSize: 20, fontWeight: '600', marginTop: 12 },
  webCard: { marginHorizontal: 16, marginBottom: 12, borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 2, elevation: 2 },
  webImg: { width: 60, height: 60, borderRadius: 12 },
  webName: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
});
