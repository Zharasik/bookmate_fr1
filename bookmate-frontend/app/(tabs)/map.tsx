import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../hooks/useHelpers';
import { api } from '../../services/api';

type VenueMapItem = { id: string; name: string; category?: string; latitude: number; longitude: number };

export default function MapScreen() {
  const c = useTheme();
  const [venues, setVenues] = useState<VenueMapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const normalizeVenues = (data: any[]): VenueMapItem[] =>
    (data || []).map((v: any) => ({
      id: String(v.id), name: String(v.name || ''),
      category: v.category ? String(v.category) : '',
      latitude: Number(v.latitude), longitude: Number(v.longitude),
    })).filter((v) => Number.isFinite(v.latitude) && Number.isFinite(v.longitude));

  const loadVenues = async () => {
    setLoading(true); setError(null);
    try { setVenues(normalizeVenues(await api.getVenues())); }
    catch { setError('Failed to load venues'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadVenues().catch(() => {}); }, []);

  const srcDoc = useMemo(() => {
    const venueData = JSON.stringify(venues);
    return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>html,body,#map{height:100%;margin:0;padding:0}.venue-dot{width:18px;height:18px;border-radius:999px;background:#2563EB;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.28)}</style>
</head><body><div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
const venues=${venueData};
const map=L.map('map').setView([43.238949,76.889709],12);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
const icon=L.divIcon({className:'',html:'<div class="venue-dot"></div>',iconSize:[18,18],iconAnchor:[9,9]});
const bounds=[];
venues.forEach(v=>{
  const m=L.marker([v.latitude,v.longitude],{icon}).addTo(map);
  m.bindPopup('<b>'+(v.name||'Venue')+'</b><br/>'+(v.category||''));
  m.on('mouseover',()=>{m.openPopup();});
  m.on('mouseout',()=>{m.closePopup();});
  m.on('click',()=>{window.top.location.href='/venue/'+v.id;});
  bounds.push([v.latitude,v.longitude]);
});
if(bounds.length>0)map.fitBounds(bounds,{padding:[30,30]});
</script></body></html>`;
  }, [venues]);

  if (loading) return <View style={[styles.centered, { backgroundColor: c.bg }]}><ActivityIndicator size="large" color={c.primary} /></View>;
  if (error) return (
    <View style={[styles.centered, { backgroundColor: c.bg }]}>
      <Text style={[styles.errorText, { color: c.text }]}>{error}</Text>
      <Pressable style={[styles.retryBtn, { backgroundColor: c.primary }]} onPress={loadVenues}>
        <Text style={{ color: '#fff', fontWeight: '700' }}>Retry</Text>
      </Pressable>
    </View>
  );

  return (
    <View style={styles.container}>
      <iframe srcDoc={srcDoc} style={{ border: 0, width: '100%', height: '100%' } as any} title="BookMate Map" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorText: { fontSize: 15, fontWeight: '600' },
  retryBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
});
