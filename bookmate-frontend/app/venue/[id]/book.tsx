import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ChevronLeft, MapPin, Minus, Plus, CheckCircle, XCircle, Clock, AlertTriangle,
} from 'lucide-react-native';
import { useTheme, useT } from '../../../hooks/useHelpers';
import { api } from '../../../services/api';

// ─── Time helpers ────────────────────────────────────────────────────────────

function timeToMin(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minToTime(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function addMin(t: string, mins: number): string {
  return minToTime(timeToMin(t) + mins);
}

function formatDuration(min: number): string {
  if (min < 60) return `${min} мин`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} ч` : `${h} ч ${m} мин`;
}

function isPastTime(t: string, isToday: boolean): boolean {
  if (!isToday) return false;
  const now = new Date();
  const [h, m] = t.split(':').map(Number);
  return h < now.getHours() || (h === now.getHours() && m <= now.getMinutes());
}

// For overnight venues (close < open), times after midnight have raw minutes < openMin.
// Normalize them to be in the correct position on the 24h+ scale.
function normalizeOvernight(rawMin: number, openMin: number, overnight: boolean): number {
  if (!overnight) return rawMin;
  return rawMin < openMin ? rawMin + 24 * 60 : rawMin;
}

function hasOverlap(
  startMin: number,
  endMin: number,
  ranges: { start: string; end: string }[],
  openMin = 0,
  overnight = false,
): boolean {
  return ranges.some((r) => {
    const rs = normalizeOvernight(timeToMin(r.start), openMin, overnight);
    const re = normalizeOvernight(timeToMin(r.end), openMin, overnight);
    return startMin < re && rs < endMin;
  });
}

function generateTimeGrid(openTime: string, closeTime: string, durationMin: number): string[] {
  const open = timeToMin(openTime);
  let close = timeToMin(closeTime);
  if (close <= open) close += 24 * 60; // handle overnight venues
  const result: string[] = [];
  let cur = open;
  while (cur + durationMin <= close) {
    result.push(minToTime(cur));
    cur += durationMin;
  }
  return result;
}

// ─── Date generation ─────────────────────────────────────────────────────────

const DAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const MONTHS = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

function generateDates() {
  const today = new Date();
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return {
      day: DAYS[d.getDay()],
      date: d.getDate(),
      month: MONTHS[d.getMonth()],
      iso: d.toISOString().split('T')[0],
    };
  });
}

const dates = generateDates();

// ─── Component ───────────────────────────────────────────────────────────────

export default function BookScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const c = useTheme();
  const t = useT();

  const [venue, setVenue] = useState<any>(null);
  // slotData = slots with booked_ranges (from availability endpoint)
  const [slotData, setSlotData] = useState<any[]>([]);
  // venueRanges = all booked ranges for this venue (for no-slot venues)
  const [venueRanges, setVenueRanges] = useState<{ start: string; end: string }[]>([]);
  const [userBookings, setUserBookings] = useState<any[]>([]);
  const [loadingVenue, setLoadingVenue] = useState(true);
  const [loadingAvail, setLoadingAvail] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [selectedDateIdx, setSelectedDateIdx] = useState(0);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [units, setUnits] = useState(1); // how many duration-units to book
  const [guests, setGuests] = useState(1);

  // ── Load venue on mount
  useEffect(() => {
    if (!id) return;
    api.getVenue(id)
      .then((v) => setVenue(v))
      .catch(() => { })
      .finally(() => setLoadingVenue(false));
  }, [id]);

  // ── Load availability + user bookings when date changes
  const loadAvailability = useCallback(async () => {
    if (!id || !venue) return;
    setLoadingAvail(true);
    try {
      const [avail, myBookings] = await Promise.all([
        api.getSlotAvailability(id, dates[selectedDateIdx].iso),
        api.getBookings().catch(() => [] as any[]),
      ]);
      setSlotData(avail.slots);
      setVenueRanges(avail.venue_ranges ?? []);
      // Keep only user's active bookings for the selected date
      const iso = dates[selectedDateIdx].iso;
      setUserBookings(
        (myBookings as any[]).filter(
          (b) => String(b.date).split('T')[0] === iso && !['cancelled'].includes(b.status),
        ),
      );
      // If selected slot no longer exists or selected time is now taken, reset
      if (selectedSlotId) {
        const slotStillExists = avail.slots.find((s: any) => s.id === selectedSlotId);
        if (!slotStillExists) { setSelectedSlotId(null); setSelectedTime(null); }
      }
    } catch {
      setSlotData([]);
      setVenueRanges([]);
    }
    finally { setLoadingAvail(false); }
  }, [id, venue, selectedDateIdx]);

  useEffect(() => { loadAvailability(); }, [loadAvailability]);

  // ── When slot or date changes reset time + units
  const handleSelectSlot = (slotId: string) => {
    if (selectedSlotId === slotId) return;
    setSelectedSlotId(slotId);
    setSelectedTime(null);
    setUnits(1);
  };

  // ── Derived values
  const selectedSlot = slotData.find((s) => s.id === selectedSlotId) ?? null;
  const slotDuration = selectedSlot?.duration ?? 60;
  const totalDuration = slotDuration * units;
  const endTime = selectedTime ? addMin(selectedTime, totalDuration) : null;

  const openTime = venue?.open_time ?? '09:00';
  const closeTime = venue?.close_time ?? '22:00';
  const timeGrid = generateTimeGrid(openTime, closeTime, slotDuration);

  const maxUnits = Math.max(1, Math.floor(480 / slotDuration)); // cap at 8h

  const isToday = selectedDateIdx === 0;

  // Overnight helpers (e.g. open 10:00, close 02:00)
  const openMin = timeToMin(openTime);
  const rawCloseMin = timeToMin(closeTime);
  const isOvernight = rawCloseMin <= openMin;
  const adjustedCloseMin = isOvernight ? rawCloseMin + 24 * 60 : rawCloseMin;

  function toAdj(t: string): number {
    return normalizeOvernight(timeToMin(t), openMin, isOvernight);
  }

  function isTimeTaken(startTime: string): boolean {
    // Use slot-specific ranges if a slot is selected, otherwise venue-level ranges
    const ranges: { start: string; end: string }[] =
      selectedSlot ? (selectedSlot.booked_ranges ?? []) : venueRanges;
    const startAdj = toAdj(startTime);
    // Check against at least 1 unit so all overlapping slots are marked taken
    const checkEnd = startAdj + Math.max(slotDuration, totalDuration);
    return hasOverlap(startAdj, checkEnd, ranges, openMin, isOvernight);
  }

  // Gray out only slots where even 1 unit doesn't fit before close
  function isTimeUnavailableDueToUnits(startTime: string): boolean {
    const startAdj = toAdj(startTime);
    return (startAdj + slotDuration) > adjustedCloseMin;
  }

  // Whether the currently selected time + totalDuration overflows close time
  const selectedTimeOverflows = selectedTime
    ? (toAdj(selectedTime) + totalDuration) > adjustedCloseMin
    : false;

  // Cross-venue conflict — only bookings at OTHER venues
  function userConflicts(): any[] {
    if (!selectedTime || !endTime) return [];
    const startAdj = toAdj(selectedTime);
    const endAdj = startAdj + totalDuration;
    return userBookings.filter((b) => {
      if (b.venue_id === venue?.id) return false; // same venue, ignore
      const bStart = timeToMin(b.time);
      const bEnd = b.end_time ? timeToMin(b.end_time) : bStart + 60;
      return startAdj < bEnd && bStart < endAdj;
    });
  }

  const conflicts = userConflicts();

  // Auto-select first available time when slot changes
  useEffect(() => {
    if (!selectedSlot || selectedTime) return;
    const first = timeGrid.find(
      (tm) => !isPastTime(tm, isToday) && !isTimeTaken(tm) && !isTimeUnavailableDueToUnits(tm),
    );
    if (first) setSelectedTime(first);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSlotId, units, selectedDateIdx, slotData]);

  // When units increase, re-validate selectedTime
  useEffect(() => {
    if (!selectedTime) return;
    if (isTimeTaken(selectedTime) || isTimeUnavailableDueToUnits(selectedTime)) {
      setSelectedTime(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [units]);

  const handleConfirm = async () => {
    if (!venue) return;
    if (slotData.length > 0 && !selectedSlotId) {
      Alert.alert('Выберите место', 'Выберите конкретное место или слот для бронирования.'); return;
    }
    if (!selectedTime) {
      Alert.alert('Выберите время', 'Выберите время начала.'); return;
    }
    if (conflicts.length > 0) {
      Alert.alert(
        'Конфликт бронирований',
        `У вас уже есть бронь на это время в "${conflicts[0].venue_name}". Отмените её или выберите другое время.`,
      );
      return;
    }
    setSubmitting(true);
    try {
      await api.createBooking({
        venue_id: venue.id,
        slot_id: selectedSlotId || undefined,
        date: dates[selectedDateIdx].iso,
        time: selectedTime,
        duration: totalDuration,
        guests,
      });
      Alert.alert(
        '✓ ' + t('bookingConfirmed'),
        `Бронь ${dates[selectedDateIdx].day} ${dates[selectedDateIdx].date} ${dates[selectedDateIdx].month} · ${selectedTime}–${endTime} · ${formatDuration(totalDuration)} создана и ожидает подтверждения.`,
        [
          { text: 'Мои брони', onPress: () => router.push('/(tabs)/bookings' as any) },
          { text: 'Назад', onPress: () => router.back(), style: 'cancel' },
        ],
      );
    } catch (e: any) {
      Alert.alert(t('error'), e.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (loadingVenue) {
    return (
      <View style={[styles.container, { backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={c.primary} size="large" />
      </View>
    );
  }
  if (!venue) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]}>
        <Text style={{ color: c.text, textAlign: 'center', marginTop: 100 }}>{t('venueNotFound')}</Text>
      </SafeAreaView>
    );
  }

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
        {/* Venue card */}
        <View style={[styles.venueCard, { backgroundColor: c.card }]}>
          <Text style={[styles.venueName, { color: c.text }]}>{venue.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
            <MapPin size={14} color={c.textSecondary} />
            <Text style={[styles.venueLocation, { color: c.textSecondary }]}>{venue.location}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 4 }}>
            <Clock size={12} color={c.textMuted} />
            <Text style={[styles.venueHours, { color: c.textMuted }]}>Работает: {openTime} – {closeTime}</Text>
          </View>
        </View>

        {/* Date picker */}
        <Text style={[styles.secTitle, { color: c.text }]}>{t('selectDate')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 20 }}>
          {dates.map((d, i) => (
            <Pressable
              key={i}
              style={[styles.dateCard, {
                backgroundColor: selectedDateIdx === i ? c.primary : c.card,
                borderColor: selectedDateIdx === i ? c.primary : c.border,
              }]}
              onPress={() => {
                setSelectedDateIdx(i);
                // If switching to today and selected time is past, reset
                if (i === 0 && selectedTime && isPastTime(selectedTime, true)) {
                  setSelectedTime(null);
                }
              }}
            >
              <Text style={[styles.dateDay, { color: selectedDateIdx === i ? '#fff' : c.textSecondary }]}>{d.day}</Text>
              <Text style={[styles.dateNum, { color: selectedDateIdx === i ? '#fff' : c.text }]}>{d.date}</Text>
              <Text style={[styles.dateMon, { color: selectedDateIdx === i ? '#fff' : c.textMuted }]}>{d.month}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Slot / place selection */}
        {slotData.length > 0 && (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 24, marginBottom: 4 }}>
              <Text style={[styles.secTitle, { color: c.text, marginBottom: 0, flex: 1 }]}>Выберите место</Text>
              {loadingAvail && <ActivityIndicator size="small" color={c.primary} />}
            </View>
            <Text style={[styles.hint, { color: c.textMuted }]}>
              Зелёный — есть свободное время · Красный — всё занято на этот день
            </Text>
            <View style={styles.slotGrid}>
              {slotData.map((slot) => {
                const slotDur = slot.duration || 60;
                const slotRanges = slot.booked_ranges ?? [];
                const allTaken = generateTimeGrid(openTime, closeTime, slotDur).every((tm) => {
                  if (isPastTime(tm, isToday)) return true;
                  const startAdj = normalizeOvernight(timeToMin(tm), openMin, isOvernight);
                  if ((startAdj + slotDur) > adjustedCloseMin) return true;
                  return hasOverlap(startAdj, startAdj + slotDur, slotRanges, openMin, isOvernight);
                });
                const selected = selectedSlotId === slot.id;
                return (
                  <Pressable
                    key={slot.id}
                    disabled={allTaken}
                    onPress={() => handleSelectSlot(slot.id)}
                    style={[styles.slotCard, {
                      backgroundColor: selected ? c.primary : allTaken ? '#FEE2E2' : c.card,
                      borderColor: selected ? c.primary : allTaken ? '#FCA5A5' : c.border,
                      opacity: allTaken ? 0.7 : 1,
                    }]}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        {selected
                          ? <CheckCircle size={16} color="#fff" />
                          : allTaken
                            ? <XCircle size={16} color="#EF4444" />
                            : <CheckCircle size={16} color={c.success} />}
                        <Text style={[styles.slotName, { color: selected ? '#fff' : allTaken ? '#EF4444' : c.text }]} numberOfLines={1}>
                          {slot.name}
                        </Text>
                      </View>
                      {slot.description ? (
                        <Text style={[styles.slotDesc, { color: selected ? 'rgba(255,255,255,0.8)' : c.textSecondary }]} numberOfLines={1}>
                          {slot.description}
                        </Text>
                      ) : null}
                      <Text style={[styles.slotMeta, { color: selected ? 'rgba(255,255,255,0.7)' : c.textMuted }]}>
                        {slot.price > 0 ? `${slot.price.toLocaleString()} ₸/${formatDuration(slot.duration || 60)}` : 'Бесплатно'}
                        {slot.capacity > 1 ? ` · ${slot.capacity} чел.` : ''}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {/* Time grid — shown only after slot selected (or if no slots) */}
        {(selectedSlotId || slotData.length === 0) && (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 24, marginBottom: 14 }}>
              <Text style={[styles.secTitle, { color: c.text, marginBottom: 0, flex: 1 }]}>{t('selectTime')}</Text>
              {loadingAvail && <ActivityIndicator size="small" color={c.primary} />}
            </View>
            {timeGrid.length === 0 ? (
              <Text style={[styles.hint, { color: c.textMuted }]}>Нет доступных слотов для этого дня.</Text>
            ) : (
              <View style={styles.timeGrid}>
                {timeGrid.map((tm) => {
                  const past = isPastTime(tm, isToday);
                  const taken = isTimeTaken(tm);
                  const overflow = isTimeUnavailableDueToUnits(tm);
                  const disabled = past || taken || overflow;
                  const active = selectedTime === tm;
                  let bg = active ? c.primary : c.card;
                  let border = active ? c.primary : c.border;
                  let textColor = active ? '#fff' : c.text;
                  if (disabled && !active) { bg = c.border; textColor = c.textMuted; }
                  if (taken && !active) { bg = '#FEE2E2'; border = '#FCA5A5'; textColor = '#EF4444'; }
                  return (
                    <Pressable
                      key={tm}
                      style={[styles.timeSlot, { backgroundColor: bg, borderColor: border, opacity: disabled ? 0.5 : 1 }]}
                      onPress={() => {
                        if (taken) {
                          Alert.alert('Занято', `Это время уже забронировано. Выберите другое.`);
                          return;
                        }
                        if (!past && !overflow) setSelectedTime(tm);
                      }}
                    >
                      <Text style={[styles.timeText, { color: textColor }]}>{tm}</Text>
                      {taken && !active && <Text style={{ fontSize: 9, color: '#EF4444', marginTop: 1 }}>занято</Text>}
                    </Pressable>
                  );
                })}
              </View>
            )}
          </>
        )}

        {/* Units (duration multiplier) — shown when time is selected */}
        {selectedTime && (
          <>
            <Text style={[styles.secTitle, { color: c.text, marginTop: 24 }]}>Продолжительность</Text>
            <View style={[styles.unitsRow, { backgroundColor: c.card, borderColor: c.border }]}>
              <Pressable
                onPress={() => setUnits(Math.max(1, units - 1))}
                style={[styles.unitBtn, { backgroundColor: c.bg }]}
              >
                <Minus size={20} color={c.text} />
              </Pressable>
              <View style={{ alignItems: 'center' }}>
                <Text style={[styles.unitNum, { color: c.text }]}>{units}×</Text>
                <Text style={[styles.unitLabel, { color: c.primary }]}>{formatDuration(totalDuration)}</Text>
              </View>
              <Pressable
                onPress={() => setUnits(Math.min(maxUnits, units + 1))}
                style={[styles.unitBtn, { backgroundColor: c.bg }]}
              >
                <Plus size={20} color={c.text} />
              </Pressable>
            </View>
          </>
        )}

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

        {/* Overflow warning */}
        {selectedTimeOverflows && (
          <View style={[styles.conflictBox, { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' }]}>
            <AlertTriangle size={18} color="#EF4444" />
            <Text style={{ color: '#991B1B', fontSize: 13, flex: 1, marginLeft: 8, lineHeight: 18 }}>
              Выбранная продолжительность выходит за время закрытия ({closeTime}). Уменьшите количество часов или выберите более раннее время.
            </Text>
          </View>
        )}

        {/* Cross-venue conflict warning */}
        {conflicts.length > 0 && (
          <View style={[styles.conflictBox, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}>
            <AlertTriangle size={18} color="#F59E0B" />
            <Text style={{ color: '#92400E', fontSize: 13, flex: 1, marginLeft: 8, lineHeight: 18 }}>
              У вас уже есть бронь в «{conflicts[0].venue_name}» на {conflicts[0].time}–{conflicts[0].end_time ?? '?'}. Вы не можете быть в двух местах одновременно.
            </Text>
          </View>
        )}

        {/* Summary */}
        {selectedTime && (
          <View style={[styles.summary, { backgroundColor: `${c.primary}10`, borderColor: `${c.primary}30` }]}>
            <Text style={[styles.summaryTitle, { color: c.text }]}>Итого</Text>
            <Text style={[styles.summaryRow, { color: c.textSecondary }]}>
              📅 {dates[selectedDateIdx].day}, {dates[selectedDateIdx].date} {dates[selectedDateIdx].month}
            </Text>
            <Text style={[styles.summaryRow, { color: c.textSecondary }]}>
              ⏰ {selectedTime} – {endTime} ({formatDuration(totalDuration)})
            </Text>
            {selectedSlot && (
              <Text style={[styles.summaryRow, { color: c.textSecondary }]}>
                📍 {selectedSlot.name}
                {selectedSlot.price > 0
                  ? ` · ${(selectedSlot.price * units).toLocaleString()} ₸`
                  : ' · бесплатно'}
              </Text>
            )}
            <Text style={[styles.summaryRow, { color: c.textSecondary }]}>
              👥 {guests} гост{guests === 1 ? 'ь' : 'я'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Confirm button */}
      <View style={[styles.footer, { backgroundColor: c.card, borderTopColor: c.border }]}>
        <Pressable onPress={handleConfirm} disabled={submitting || !selectedTime || selectedTimeOverflows} style={styles.confirmWrap}>
          <LinearGradient
            colors={submitting || !selectedTime || selectedTimeOverflows ? ['#93C5FD', '#93C5FD'] : ['#2563EB', '#3B82F6']}
            style={styles.confirmBtn}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {submitting
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.confirmText}>
                {!selectedTime
                  ? 'Выберите место и время'
                  : selectedTimeOverflows
                    ? 'Превышает время закрытия'
                    : `Забронировать · ${formatDuration(totalDuration)}`}
              </Text>}
          </LinearGradient>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  scroll: { flex: 1 },
  scrollInner: { padding: 20, paddingBottom: 120 },
  venueCard: { borderRadius: 16, padding: 16, marginBottom: 24, elevation: 2 },
  venueName: { fontSize: 20, fontWeight: '700' },
  venueLocation: { fontSize: 14, marginLeft: 6 },
  venueHours: { fontSize: 12 },
  secTitle: { fontSize: 17, fontWeight: '600', marginBottom: 14 },
  hint: { fontSize: 12, marginBottom: 12, marginTop: -8 },
  dateCard: {
    width: 64, height: 80, borderRadius: 14, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  dateDay: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  dateNum: { fontSize: 22, fontWeight: '800', marginBottom: 2 },
  dateMon: { fontSize: 10, fontWeight: '500' },
  slotGrid: { gap: 10 },
  slotCard: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 14,
    borderWidth: 1.5, padding: 14, gap: 10,
  },
  slotName: { fontSize: 14, fontWeight: '700' },
  slotDesc: { fontSize: 12, marginTop: 2 },
  slotMeta: { fontSize: 12, marginTop: 3 },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  timeSlot: {
    width: '30%', paddingVertical: 10, borderRadius: 12,
    borderWidth: 1.5, alignItems: 'center',
  },
  timeText: { fontSize: 14, fontWeight: '600' },
  unitsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 14, borderWidth: 1.5, paddingVertical: 14, gap: 32,
  },
  unitBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  unitNum: { fontSize: 26, fontWeight: '800', minWidth: 40, textAlign: 'center' },
  unitLabel: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  guestsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 14, borderWidth: 1.5, paddingVertical: 14, gap: 24,
  },
  guestBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  guestNum: { fontSize: 26, fontWeight: '800', minWidth: 40, textAlign: 'center' },
  conflictBox: {
    flexDirection: 'row', alignItems: 'flex-start', borderRadius: 14,
    borderWidth: 1, padding: 14, marginTop: 16,
  },
  summary: { marginTop: 24, borderRadius: 16, padding: 16, borderWidth: 1, gap: 6 },
  summaryTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  summaryRow: { fontSize: 14, lineHeight: 22 },
  footer: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24, borderTopWidth: 1 },
  confirmWrap: {},
  confirmBtn: { paddingVertical: 18, borderRadius: 14, alignItems: 'center' },
  confirmText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
