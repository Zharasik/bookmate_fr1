import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, MapPin, Minus, Plus } from 'lucide-react-native';
import { useTheme, useT } from '../../../hooks/useHelpers';
import { api } from '../../../services/api';

const timeSlots = [
  '10:00', '11:00', '12:00', '13:00', '14:00', '15:00',
  '16:00', '17:00', '18:00', '19:00', '20:00', '21:00',
];

const generateDates = () => {
  const dates = [];
  const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
  const today = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push({
      day: days[d.getDay()],
      date: d.getDate(),
      month: months[d.getMonth()],
      iso: d.toISOString().split('T')[0],
    });
  }
  return dates;
};

export default function BookReservationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const c = useTheme();
  const t = useT();

  const [venue, setVenue] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState(0);
  const [selectedTime, setSelectedTime] = useState('11:00');
  const [guests, setGuests] = useState(2);
  const dates = generateDates();

  useEffect(() => {
    if (!id) return;
    api.getVenue(id).then(setVenue).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  const handleConfirm = async () => {
    if (!venue) return;
    setSubmitting(true);
    try {
      await api.createBooking({
        venue_id: venue.id,
        date: dates[selectedDate].iso,
        time: selectedTime,
        guests,
      });
      Alert.alert(t('bookingConfirmed'), '', [
        { text: t('ok'), onPress: () => router.replace('/(tabs)/bookings') },
      ]);
    } catch (e: any) {
      Alert.alert(t('error'), e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <View style={[styles.container, { backgroundColor: c.bg }]}><ActivityIndicator style={{ marginTop: 100 }} color={c.primary} size="large" /></View>;
  if (!venue) return <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]}><Text style={{ color: c.text, textAlign: 'center', marginTop: 100 }}>{t('venueNotFound')}</Text></SafeAreaView>;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: c.card, borderBottomColor: c.border }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={24} color={c.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: c.text }]}>{t('bookReservation')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollInner} showsVerticalScrollIndicator={false}>
        {/* Venue info */}
        <View style={{ marginBottom: 24 }}>
          <Text style={[styles.venueName, { color: c.text }]}>{venue.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MapPin size={16} color={c.textSecondary} />
            <Text style={[{ color: c.textSecondary, marginLeft: 6, fontSize: 15 }]}>{venue.location}</Text>
          </View>
        </View>

        {/* Date */}
        <Text style={[styles.secTitle, { color: c.text }]}>{t('selectDate')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 20 }}>
          {dates.map((d, i) => (
            <Pressable
              key={i}
              style={[styles.dateCard, { backgroundColor: selectedDate === i ? c.primary : c.card, borderColor: selectedDate === i ? c.primary : c.border }]}
              onPress={() => setSelectedDate(i)}
            >
              <Text style={[styles.dateDay, { color: selectedDate === i ? '#fff' : c.textSecondary }]}>{d.day}</Text>
              <Text style={[styles.dateNum, { color: selectedDate === i ? '#fff' : c.text }]}>{d.date}</Text>
              <Text style={[styles.dateMon, { color: selectedDate === i ? '#fff' : c.textMuted }]}>{d.month}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Time */}
        <Text style={[styles.secTitle, { color: c.text, marginTop: 24 }]}>{t('selectTime')}</Text>
        <View style={styles.timeGrid}>
          {timeSlots.map((tm) => (
            <Pressable
              key={tm}
              style={[styles.timeSlot, { backgroundColor: selectedTime === tm ? c.primary : c.card, borderColor: selectedTime === tm ? c.primary : c.border }]}
              onPress={() => setSelectedTime(tm)}
            >
              <Text style={[styles.timeText, { color: selectedTime === tm ? '#fff' : c.text }]}>{tm}</Text>
            </Pressable>
          ))}
        </View>

        {/* Guests */}
        <Text style={[styles.secTitle, { color: c.text, marginTop: 24 }]}>{t('guests')}</Text>
        <View style={[styles.guestsRow, { backgroundColor: c.card, borderColor: c.border }]}>
          <Pressable onPress={() => setGuests(Math.max(1, guests - 1))} style={[styles.guestBtn, { backgroundColor: c.bg }]}>
            <Minus size={20} color={c.text} />
          </Pressable>
          <Text style={[styles.guestNum, { color: c.text }]}>{guests}</Text>
          <Pressable onPress={() => setGuests(Math.min(20, guests + 1))} style={[styles.guestBtn, { backgroundColor: c.bg }]}>
            <Plus size={20} color={c.text} />
          </Pressable>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { backgroundColor: c.card, borderTopColor: c.border }]}>
        <Pressable
          style={[styles.confirmBtn, { backgroundColor: c.primary, opacity: submitting ? 0.7 : 1 }]}
          onPress={handleConfirm}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.confirmText}>{t('confirmReservation')}</Text>
          )}
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
  scrollInner: { padding: 20, paddingBottom: 100 },
  venueName: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  secTitle: { fontSize: 17, fontWeight: '600', marginBottom: 16 },
  dateCard: { width: 64, height: 80, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  dateDay: { fontSize: 12, fontWeight: '500', marginBottom: 4 },
  dateNum: { fontSize: 20, fontWeight: '700', marginBottom: 2 },
  dateMon: { fontSize: 11, fontWeight: '500' },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  timeSlot: { width: '30%', paddingVertical: 12, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  timeText: { fontSize: 14, fontWeight: '500' },
  guestsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1, paddingVertical: 12, gap: 24 },
  guestBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  guestNum: { fontSize: 24, fontWeight: '700', minWidth: 40, textAlign: 'center' },
  footer: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24, borderTopWidth: 1 },
  confirmBtn: { paddingVertical: 18, borderRadius: 12, alignItems: 'center' },
  confirmText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
