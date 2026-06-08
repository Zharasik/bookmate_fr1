import { useCallback, useState } from 'react';
import * as Location from 'expo-location';

export type Coords = { latitude: number; longitude: number };

export function haversineKm(a: Coords, b: Coords): number {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatDistance(km: number, t: (key: string) => string): string {
  if (km < 1) return t('distanceM').replace('{d}', String(Math.round(km * 1000)));
  return t('distanceKm').replace('{d}', km < 10 ? km.toFixed(1) : String(Math.round(km)));
}

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
}

// open_time/close_time can describe an overnight range (e.g. "10:00" - "02:00")
export function isOpenNow(openTime?: string | null, closeTime?: string | null): boolean {
  if (!openTime || !closeTime) return true;
  const now = new Date();
  const cur = now.getHours() * 60 + now.getMinutes();
  const open = toMinutes(openTime);
  const close = toMinutes(closeTime);
  if (open === close) return true;
  if (open < close) return cur >= open && cur < close;
  return cur >= open || cur < close;
}

type LocationStatus = 'idle' | 'loading' | 'granted' | 'denied';

export function useUserLocation() {
  const [location, setLocation] = useState<Coords | null>(null);
  const [status, setStatus] = useState<LocationStatus>('idle');

  const requestLocation = useCallback(async () => {
    setStatus('loading');
    try {
      const { status: perm } = await Location.requestForegroundPermissionsAsync();
      if (perm !== 'granted') {
        setStatus('denied');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      setStatus('granted');
    } catch {
      setStatus('denied');
    }
  }, []);

  return { location, status, requestLocation };
}

export type ClusterPoint<T extends Coords> = {
  key: string;
  latitude: number;
  longitude: number;
  items: T[];
};

// Simple grid-based clustering: groups nearby points into cells sized relative
// to the visible map region so clusters merge/split naturally while zooming.
export function clusterPoints<T extends Coords>(points: T[], latDelta: number, lonDelta: number): ClusterPoint<T>[] {
  const cellLat = Math.max(latDelta / 8, 0.0001);
  const cellLon = Math.max(lonDelta / 8, 0.0001);
  const groups = new Map<string, T[]>();
  points.forEach((p) => {
    const key = `${Math.floor(p.latitude / cellLat)}:${Math.floor(p.longitude / cellLon)}`;
    const arr = groups.get(key);
    if (arr) arr.push(p);
    else groups.set(key, [p]);
  });
  return Array.from(groups.entries()).map(([key, items]) => ({
    key,
    latitude: items.reduce((s, p) => s + p.latitude, 0) / items.length,
    longitude: items.reduce((s, p) => s + p.longitude, 0) / items.length,
    items,
  }));
}
