import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Locate, Star } from 'lucide-react-native';
import { useTheme, useT } from '../../hooks/useHelpers';
import { api } from '../../services/api';
import { haversineKm, isOpenNow, useUserLocation } from '../../hooks/useGeo';

type VenueMapItem = {
  id: string;
  name: string;
  category: string;
  location: string;
  latitude: number;
  longitude: number;
  rating: number;
  review_count: number;
  open_time: string | null;
  close_time: string | null;
};

const RATING_OPTIONS = [4, 4.5];

export default function MapScreen() {
  const c = useTheme();
  const t = useT();
  const { location, status: locationStatus, requestLocation } = useUserLocation();

  const [venues, setVenues] = useState<VenueMapItem[]>([]);
  const [categories, setCategories] = useState<string[]>(['All']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [minRating, setMinRating] = useState(0);
  const [openNowOnly, setOpenNowOnly] = useState(false);
  const [nearbyOnly, setNearbyOnly] = useState(false);

  const normalizeVenues = (data: any[]): VenueMapItem[] =>
    (data || []).map((v: any) => ({
      id: String(v.id),
      name: String(v.name || ''),
      category: v.category ? String(v.category) : '',
      location: v.location ? String(v.location) : '',
      latitude: Number(v.latitude),
      longitude: Number(v.longitude),
      rating: Number(v.rating) || 0,
      review_count: Number(v.review_count) || 0,
      open_time: v.open_time || null,
      close_time: v.close_time || null,
    })).filter((v) => Number.isFinite(v.latitude) && Number.isFinite(v.longitude));

  const loadVenues = async () => {
    setLoading(true); setError(null);
    try {
      const [data, cats] = await Promise.all([api.getVenues(), api.getCategories().catch(() => ['All'])]);
      setVenues(normalizeVenues(data));
      setCategories(cats);
    }
    catch { setError('Failed to load venues'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadVenues().catch(() => {}); }, []);

  const handleNearMe = async () => {
    if (nearbyOnly) { setNearbyOnly(false); return; }
    setNearbyOnly(true);
    if (!location) await requestLocation();
  };

  const filteredVenues = useMemo(() => {
    let list = venues;
    if (selectedCategory !== 'All') list = list.filter((v) => v.category === selectedCategory);
    if (minRating > 0) list = list.filter((v) => v.rating >= minRating);
    if (openNowOnly) list = list.filter((v) => isOpenNow(v.open_time, v.close_time));
    if (nearbyOnly && location) {
      list = [...list].sort((a, b) => haversineKm(location, a) - haversineKm(location, b)).slice(0, 30);
    }
    return list.map((v) => ({
      ...v,
      open: isOpenNow(v.open_time, v.close_time),
      distanceKm: location ? haversineKm(location, v) : null,
    }));
  }, [venues, selectedCategory, minRating, openNowOnly, nearbyOnly, location]);

  const labels = useMemo(() => ({
    open: t('openNow'),
    closed: t('closedNow'),
    openBtn: t('openVenue'),
    km: t('distanceKm'),
    m: t('distanceM'),
  }), [t]);

  const srcDoc = useMemo(() => {
    const venueData = JSON.stringify(filteredVenues);
    const userLoc = location ? JSON.stringify(location) : 'null';
    const lbl = JSON.stringify(labels);
    return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css"/>
<style>
html,body,#map{height:100%;margin:0;padding:0;font-family:-apple-system,Segoe UI,Roboto,sans-serif}
.venue-dot{width:18px;height:18px;border-radius:999px;background:#2563EB;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.28)}
.user-dot{width:16px;height:16px;border-radius:999px;background:#10B981;border:3px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.35)}
.venue-popup b{font-size:14px}
.venue-popup .meta{color:#6B7280;font-size:12px;margin-top:2px}
.venue-popup .status{font-weight:600;font-size:12px;margin-top:2px}
.venue-popup button{margin-top:6px;background:#2563EB;color:#fff;border:0;border-radius:8px;padding:6px 10px;font-size:12px;font-weight:600;cursor:pointer}
</style>
</head><body><div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"></script>
<script>
const venues=${venueData};
const userLoc=${userLoc};
const lbl=${lbl};
const map=L.map('map').setView([43.238949,76.889709],12);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
const icon=L.divIcon({className:'',html:'<div class="venue-dot"></div>',iconSize:[18,18],iconAnchor:[9,9]});
const cluster=L.markerClusterGroup({maxClusterRadius:50});
const bounds=[];
function fmtDist(km){
  if(km<1) return lbl.m.replace('{d}', String(Math.round(km*1000)));
  return lbl.km.replace('{d}', km<10 ? km.toFixed(1) : String(Math.round(km)));
}
venues.forEach(v=>{
  const m=L.marker([v.latitude,v.longitude],{icon});
  const statusColor=v.open?'#10B981':'#EF4444';
  const statusText=v.open?lbl.open:lbl.closed;
  const dist=(userLoc && v.distanceKm!=null)?(' · '+fmtDist(v.distanceKm)):'';
  m.bindPopup(
    '<div class="venue-popup">'+
    '<b>'+(v.name||'Venue')+'</b>'+
    '<div class="meta">'+(v.category||'')+(v.location?(' · '+v.location):'')+'</div>'+
    '<div class="meta">★ '+v.rating+' ('+v.review_count+')'+dist+'</div>'+
    '<div class="status" style="color:'+statusColor+'">'+statusText+'</div>'+
    '<button onclick="window.top.location.href=\\'/venue/'+v.id+'\\'">'+lbl.openBtn+'</button>'+
    '</div>'
  );
  cluster.addLayer(m);
  bounds.push([v.latitude,v.longitude]);
});
map.addLayer(cluster);
if(userLoc){
  const uIcon=L.divIcon({className:'',html:'<div class="user-dot"></div>',iconSize:[16,16],iconAnchor:[8,8]});
  L.marker([userLoc.latitude,userLoc.longitude],{icon:uIcon,zIndexOffset:1000}).addTo(map);
  bounds.push([userLoc.latitude,userLoc.longitude]);
}
if(bounds.length>0)map.fitBounds(bounds,{padding:[40,40]});
</script></body></html>`;
  }, [filteredVenues, location, labels]);

  if (loading) return <View style={[styles.centered, { backgroundColor: c.bg }]}><ActivityIndicator size="large" color={c.primary} /></View>;
  if (error) return (
    <View style={[styles.centered, { backgroundColor: c.bg }]}>
      <Text style={[styles.errorText, { color: c.text }]}>{error}</Text>
      <Pressable style={[styles.retryBtn, { backgroundColor: c.primary }]} onPress={loadVenues}>
        <Text style={{ color: '#fff', fontWeight: '700' }}>{t('retry')}</Text>
      </Pressable>
    </View>
  );

  return (
    <View style={styles.container}>
      <iframe srcDoc={srcDoc} style={{ border: 0, width: '100%', height: '100%' } as any} title="BookMate Map" />
      <View style={styles.filterOverlay} pointerEvents="box-none">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          <Pressable
            style={[styles.chip, { backgroundColor: nearbyOnly ? c.primary : c.card, borderColor: nearbyOnly ? c.primary : c.border }]}
            onPress={handleNearMe}
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
          {RATING_OPTIONS.map((r) => (
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorText: { fontSize: 15, fontWeight: '600' },
  retryBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },

  filterOverlay: { position: 'absolute', top: 12, left: 0, right: 0 },
  filterRow: { paddingHorizontal: 12, gap: 8, alignItems: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, marginRight: 8 },
  chipText: { fontSize: 12, fontWeight: '600' },
  noticeBox: { marginTop: 8, marginHorizontal: 12, padding: 10, borderRadius: 10, borderWidth: 1, alignSelf: 'flex-start' },
  noticeText: { fontSize: 12 },
});
