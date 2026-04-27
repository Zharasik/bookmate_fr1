import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, MapPin, Minus, Plus, CheckCircle, XCircle } from 'lucide-react-native';
import { useTheme, useT } from '../../../hooks/useHelpers';
import { api } from '../../../services/api';

const TIME_SLOTS = ['09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00'];

function generateDates() {
  const DAYS = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];
  const MONTHS = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'];
  const today = new Date();
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today); d.setDate(today.getDate() + i);
    return { day: DAYS[d.getDay()], date: d.getDate(), month: MONTHS[d.getMonth()], iso: d.toISOString().split('T')[0] };
  });
}

export default function BookScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const c = useTheme(); const t = useT();

  const [venue, setVenue] = useState<any>(null);
  const [slots, setSlots] = useState<any[]>([]);
  const [availability, setAvailability] = useState<Record<string, boolean>>({});
  const [loadingVenue, setLoadingVenue] = useState(true);
  const [loadingAvail, setLoadingAvail] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedDateIdx, setSelectedDateIdx] = useState(0);
  const [selectedTime, setSelectedTime] = useState('11:00');
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [guests, setGuests] = useState(1);
  const dates = generateDates();

  useEffect(() => {
    if (!id) return;
    Promise.all([api.getVenue(id), api.getVenueSlots(id).catch(() => [])])
      .then(([v, s]) => { setVenue(v); setSlots(s); })
      .catch(() => {}).finally(() => setLoadingVenue(false));
  }, [id]);

  const loadAvailability = useCallback(async () => {
    if (!id || slots.length === 0) return;
    setLoadingAvail(true);
    try {
      const data = await api.getSlotAvailability(id, dates[selectedDateIdx].iso, selectedTime);
      const map: Record<string, boolean> = {};
      data.forEach((s: any) => { map[s.id] = s.is_booked; });
      setAvailability(map);
      if (selectedSlotId && map[selectedSlotId]) setSelectedSlotId(null);
    } catch { } finally { setLoadingAvail(false); }
  }, [id, slots, selectedDateIdx, selectedTime]);

  useEffect(() => { loadAvailability(); }, [loadAvailability]);

  const handleConfirm = async () => {
    if (!venue) return;
    if (slots.length > 0 && !selectedSlotId) { Alert.alert('Выберите слот', 'Выберите место/слот для бронирования.'); return; }
    setSubmitting(true);
    try {
      await api.createBooking({ venue_id: venue.id, slot_id: selectedSlotId || undefined, date: dates[selectedDateIdx].iso, time: selectedTime, guests });
      Alert.alert('✓ ' + t('bookingConfirmed'), 'Бронь создана и ожидает подтверждения заведением.', [
        { text: 'Мои брони', onPress: () => router.push('/(tabs)/bookings' as any) },
        { text: 'Назад к заведению', onPress: () => router.back(), style: 'cancel' },
      ]);
    } catch (e: any) { Alert.alert(t('error'), e.message); }
    finally { setSubmitting(false); }
  };

  if (loadingVenue) return <View style={[styles.container, { backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }]}><ActivityIndicator color={c.primary} size="large" /></View>;
  if (!venue) return <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]}><Text style={{ color: c.text, textAlign: 'center', marginTop: 100 }}>{t('venueNotFound')}</Text></SafeAreaView>;

  const selectedSlot = slots.find((s) => s.id === selectedSlotId);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: c.card, borderBottomColor: c.border }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}><ChevronLeft size={24} color={c.text} /></Pressable>
        <Text style={[styles.headerTitle, { color: c.text }]}>{t('bookReservation')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollInner} showsVerticalScrollIndicator={false}>
        <View style={[styles.venueCard, { backgroundColor: c.card }]}>
          <Text style={[styles.venueName, { color: c.text }]}>{venue.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
            <MapPin size={14} color={c.textSecondary} />
            <Text style={[styles.venueLocation, { color: c.textSecondary }]}>{venue.location}</Text>
          </View>
        </View>

        <Text style={[styles.secTitle, { color: c.text }]}>{t('selectDate')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 20 }}>
          {dates.map((d, i) => (
            <Pressable key={i} style={[styles.dateCard, { backgroundColor: selectedDateIdx === i ? c.primary : c.card, borderColor: selectedDateIdx === i ? c.primary : c.border }]} onPress={() => setSelectedDateIdx(i)}>
              <Text style={[styles.dateDay, { color: selectedDateIdx === i ? '#fff' : c.textSecondary }]}>{d.day}</Text>
              <Text style={[styles.dateNum, { color: selectedDateIdx === i ? '#fff' : c.text }]}>{d.date}</Text>
              <Text style={[styles.dateMon, { color: selectedDateIdx === i ? '#fff' : c.textMuted }]}>{d.month}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={[styles.secTitle, { color: c.text, marginTop: 24 }]}>{t('selectTime')}</Text>
        <View style={styles.timeGrid}>
          {TIME_SLOTS.map((tm) => (
            <Pressable key={tm} style={[styles.timeSlot, { backgroundColor: selectedTime === tm ? c.primary : c.card, borderColor: selectedTime === tm ? c.primary : c.border }]} onPress={() => setSelectedTime(tm)}>
              <Text style={[styles.timeText, { color: selectedTime === tm ? '#fff' : c.text }]}>{tm}</Text>
            </Pressable>
          ))}
        </View>

        {slots.length > 0 && (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 24, marginBottom: 4 }}>
              <Text style={[styles.secTitle, { color: c.text, marginBottom: 0, flex: 1 }]}>Выберите место</Text>
              {loadingAvail && <ActivityIndicator size="small" color={c.primary} />}
            </View>
            <Text style={[styles.slotHint, { color: c.textMuted }]}>Зелёный — свободно · Красный — занято</Text>
            <View style={styles.slotGrid}>
              {slots.map((slot) => {
                const booked = availability[slot.id] === true;
                const selected = selectedSlotId === slot.id;
                return (
                  <Pressable key={slot.id} disabled={booked} onPress={() => setSelectedSlotId(selected ? null : slot.id)}
                    style={[styles.slotCard, { backgroundColor: selected ? c.primary : booked ? '#FEE2E2' : c.card, borderColor: selected ? c.primary : booked ? '#FCA5A5' : c.border, opacity: booked ? 0.7 : 1 }]}>
                    {selected ? <CheckCircle size={16} color="#fff" /> : booked ? <XCircle size={16} color="#EF4444" /> : <CheckCircle size={16} color={c.success} />}
                    <Text style={[styles.slotName, { color: selected ? '#fff' : booked ? '#EF4444' : c.text }]} numberOfLines={1}>{slot.name}</Text>
                    {slot.price > 0 && <Text style={[styles.slotPrice, { color: selected ? '#fff' : c.primary }]}>{slot.price.toLocaleString()} ₸</Text>}
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        <Text style={[styles.secTitle, { color: c.text, marginTop: 24 }]}>{t('guests')}</Text>
        <View style={[styles.guestsRow, { backgroundColor: c.card, borderColor: c.border }]}>
          <Pressable onPress={() => setGuests(Math.max(1, guests - 1))} style={[styles.guestBtn, { backgroundColor: c.bg }]}><Minus size={20} color={c.text} /></Pressable>
          <Text style={[styles.guestNum, { color: c.text }]}>{guests}</Text>
          <Pressable onPress={() => setGuests(Math.min(20, guests + 1))} style={[styles.guestBtn, { backgroundColor: c.bg }]}><Plus size={20} color={c.text} /></Pressable>
        </View>

        <View style={[styles.summary, { backgroundColor: `${c.primary}10`, borderColor: `${c.primary}30` }]}>
          <Text style={[styles.summaryTitle, { color: c.text }]}>Итого</Text>
          <Text style={[styles.summaryRow, { color: c.textSecondary }]}>📅 {dates[selectedDateIdx].day}, {dates[selectedDateIdx].date} {dates[selectedDateIdx].month} · ⏰ {selectedTime}</Text>
          {selectedSlot && <Text style={[styles.summaryRow, { color: c.textSecondary }]}>📍 {selectedSlot.name} · {selectedSlot.price > 0 ? selectedSlot.price.toLocaleString() + ' ₸/час' : 'бесплатно'}</Text>}
          <Text style={[styles.summaryRow, { color: c.textSecondary }]}>👥 {guests} гост{guests === 1 ? 'ь' : 'я'}</Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: c.card, borderTopColor: c.border }]}>
        <Pressable onPress={handleConfirm} disabled={submitting} style={styles.confirmWrap}>
          <LinearGradient colors={submitting ? ['#93C5FD', '#93C5FD'] : ['#2563EB', '#3B82F6']} style={styles.confirmBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmText}>{t('confirmReservation')}</Text>}
          </LinearGradient>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  scroll: { flex: 1 },
  scrollInner: { padding: 20, paddingBottom: 120 },
  venueCard: { borderRadius: 16, padding: 16, marginBottom: 24, elevation: 2 },
  venueName: { fontSize: 20, fontWeight: '700' },
  venueLocation: { fontSize: 14, marginLeft: 6 },
  secTitle: { fontSize: 17, fontWeight: '600', marginBottom: 14 },
  dateCard: { width: 64, height: 80, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  dateDay: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  dateNum: { fontSize: 22, fontWeight: '800', marginBottom: 2 },
  dateMon: { fontSize: 10, fontWeight: '500' },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  timeSlot: { width: '30%', paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, alignItems: 'center' },
  timeText: { fontSize: 14, fontWeight: '600' },
  slotHint: { fontSize: 12, marginBottom: 12 },
  slotGrid: { gap: 10 },
  slotCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1.5, padding: 14, gap: 10 },
  slotName: { flex: 1, fontSize: 14, fontWeight: '600' },
  slotPrice: { fontSize: 14, fontWeight: '700' },
  guestsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1.5, paddingVertical: 14, gap: 24 },
  guestBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  guestNum: { fontSize: 26, fontWeight: '800', minWidth: 40, textAlign: 'center' },
  summary: { marginTop: 24, borderRadius: 16, padding: 16, borderWidth: 1, gap: 6 },
  summaryTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  summaryRow: { fontSize: 14, lineHeight: 22 },
  footer: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24, borderTopWidth: 1 },
  confirmWrap: {},
  confirmBtn: { paddingVertical: 18, borderRadius: 14, alignItems: 'center' },
  confirmText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
