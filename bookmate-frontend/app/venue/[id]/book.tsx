import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ChevronLeft, MapPin, Minus, Plus, CheckCircle, XCircle, Clock, AlertTriangle, Wrench,
} from 'lucide-react-native';
import { useTheme, useT } from '../../../hooks/useHelpers';
import { useStore } from '../../../hooks/useStore';
import { api } from '../../../services/api';

// ─── Time helpers ─────────────────────────────────────────────────────────────

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

function formatLocalDateISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDaysISO(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function dateOnly(dateValue?: string): string {
  return dateValue ? String(dateValue).split('T')[0] : '';
}

// Formats the booking's date for display, e.g. "Пн, 8 Июн" for a same-day
// booking, or "8–9 Июн" / "30 Июн – 1 Июл" when the booking spans midnight
// and ends on the following calendar date — so users see "8-9 June" instead
// of being told the whole overnight range happened on the start date alone.
function formatBookingDate(startISO: string, endISO: string, lang: string): string {
  const days = lang === 'kk' ? DAYS_KK : DAYS_RU;
  const months = lang === 'kk' ? MONTHS_KK : MONTHS_RU;
  const s = new Date(`${startISO}T00:00:00Z`);
  if (startISO === endISO) {
    return `${days[s.getUTCDay()]}, ${s.getUTCDate()} ${months[s.getUTCMonth()]}`;
  }
  const e = new Date(`${endISO}T00:00:00Z`);
  return s.getUTCMonth() === e.getUTCMonth()
    ? `${s.getUTCDate()}–${e.getUTCDate()} ${months[s.getUTCMonth()]}`
    : `${s.getUTCDate()} ${months[s.getUTCMonth()]} – ${e.getUTCDate()} ${months[e.getUTCMonth()]}`;
}

function dateDiffDays(aDate: string, bDate: string): number {
  const a = new Date(`${aDate}T00:00:00Z`).getTime();
  const b = new Date(`${bDate}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86400000);
}

function rangesOverlapByDate(
  aDate: string, aStart: string, aEnd: string,
  bDate: string, bStart: string, bEnd: string,
): boolean {
  const dayOffset = dateDiffDays(aDate, bDate);
  let aStartMin = timeToMin(aStart);
  let aEndMin = timeToMin(aEnd);
  if (aEndMin <= aStartMin) aEndMin += 24 * 60;

  let bStartMin = timeToMin(bStart) + dayOffset * 24 * 60;
  let bEndMin = timeToMin(bEnd) + dayOffset * 24 * 60;
  if (bEndMin <= bStartMin) bEndMin += 24 * 60;

  return aStartMin < bEndMin && bStartMin < aEndMin;
}

function formatDuration(min: number, lang: string): string {
  if (min < 60) return `${min} мин`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (lang === 'kk') return m === 0 ? `${h} сағ` : `${h} сағ ${m} мин`;
  return m === 0 ? `${h} ч` : `${h} ч ${m} мин`;
}

function isPastTime(t: string, isToday: boolean): boolean {
  if (!isToday) return false;
  // Bookings are stored as `date` + literal clock `time`, so e.g. "00:00" on the
  // selected date means "00:00 today" — compare against the current clock time
  // directly (no overnight adjustment), so already-passed early hours like
  // 00:00/01:00 are correctly disabled once the day has moved past them.
  const now = new Date();
  return timeToMin(t) <= now.getHours() * 60 + now.getMinutes();
}

function normalizeOvernight(rawMin: number, openMin: number, overnight: boolean): number {
  if (!overnight) return rawMin;
  return rawMin < openMin ? rawMin + 24 * 60 : rawMin;
}

function hasOverlap(
  startMin: number, endMin: number,
  ranges: { start: string; end: string }[],
  openMin = 0, overnight = false,
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
  const overnight = close <= open;
  if (overnight) close += 24 * 60;
  const result: string[] = [];
  let cur = open;
  while (cur + durationMin <= close) {
    result.push(minToTime(cur));
    cur += durationMin;
  }
  if (overnight) {
    // Hours that wrap past midnight (e.g. 00:00, 01:00) belong earlier in the
    // calendar day than the venue's opening hour — show them first so the list
    // reads in natural chronological order (00:00 → ... → 23:00).
    const wrapped = result.filter((tm) => timeToMin(tm) < open);
    const sameDay = result.filter((tm) => timeToMin(tm) >= open);
    return [...wrapped, ...sameDay];
  }
  return result;
}

// ─── Date generation ──────────────────────────────────────────────────────────

const DAYS_RU = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const DAYS_KK = ['Жс', 'Дс', 'Сс', 'Ср', 'Бс', 'Жм', 'Сб'];
const MONTHS_RU = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
const MONTHS_KK = ['Қаң', 'Ақп', 'Нау', 'Сәу', 'Мам', 'Мау', 'Шіл', 'Там', 'Қыр', 'Қаз', 'Қар', 'Жел'];

// ─── Component ────────────────────────────────────────────────────────────────

export default function BookScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const c = useTheme();
  const t = useT();
  const lang = useStore((s) => s.lang);

  const dates = useMemo(() => {
    const days = lang === 'kk' ? DAYS_KK : DAYS_RU;
    const months = lang === 'kk' ? MONTHS_KK : MONTHS_RU;

    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      return {
        day: days[d.getDay()],
        date: d.getDate(),
        month: months[d.getMonth()],
        iso: formatLocalDateISO(d),
      };
    });
  }, [lang]);

  const dur = (min: number) => formatDuration(min, lang);

  const [venue, setVenue] = useState<any>(null);
  const [slotData, setSlotData] = useState<any[]>([]);
  const [venueRanges, setVenueRanges] = useState<{ start: string; end: string }[]>([]);
  const [userBookings, setUserBookings] = useState<any[]>([]);
  const [loadingVenue, setLoadingVenue] = useState(true);
  const [loadingAvail, setLoadingAvail] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [services, setServices] = useState<any[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [selectedDateIdx, setSelectedDateIdx] = useState(0);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [units, setUnits] = useState(1);
  const [guests, setGuests] = useState(1);

  useEffect(() => {
    if (!id) return;
    Promise.all([api.getVenue(id), api.getServices(id).catch(() => [])])
      .then(([v, sv]) => { setVenue(v); setServices(sv); })
      .catch(() => {})
      .finally(() => setLoadingVenue(false));
  }, [id]);

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
      setUserBookings(
        (myBookings as any[]).filter(
          (b) => !['cancelled'].includes(b.status),
        ),
      );
      if (selectedSlotId) {
        const slotStillExists = avail.slots.find((s: any) => s.id === selectedSlotId);
        if (!slotStillExists) { setSelectedSlotId(null); setSelectedTime(null); }
      }
    } catch {
      setSlotData([]); setVenueRanges([]);
    } finally { setLoadingAvail(false); }
  }, [id, venue, dates, selectedDateIdx, selectedSlotId]);

  useEffect(() => { loadAvailability(); }, [loadAvailability]);

  const handleSelectSlot = (slotId: string) => {
    if (selectedSlotId === slotId) return;
    setSelectedSlotId(slotId); setSelectedTime(null); setUnits(1);
  };

  const toggleService = (serviceId: string) => {
    setSelectedServiceIds((ids) =>
      ids.includes(serviceId) ? ids.filter((sid) => sid !== serviceId) : [...ids, serviceId],
    );
  };

  const selectedServices = services.filter((s) => selectedServiceIds.includes(s.id));
  const servicesPrice = selectedServices.reduce((sum, s) => sum + (s.price || 0), 0);
  const servicesDuration = selectedServices.reduce((sum, s) => sum + (s.duration || 0), 0);

  const selectedSlot = slotData.find((s) => s.id === selectedSlotId) ?? null;
  const slotDuration = selectedSlot?.duration ?? 60;
  const totalDuration = slotDuration * units;
  const endTime = selectedTime ? addMin(selectedTime, totalDuration) : null;
  const selectedDateISO = dates[selectedDateIdx].iso;
  const endDateISO = selectedTime && endTime && timeToMin(endTime) <= timeToMin(selectedTime)
    ? addDaysISO(selectedDateISO, 1)
    : selectedDateISO;
  const openTime = venue?.open_time ?? '09:00';
  const closeTime = venue?.close_time ?? '22:00';
  const timeGrid = generateTimeGrid(openTime, closeTime, slotDuration);
  const maxUnits = Math.max(1, Math.floor(480 / slotDuration));
  const isToday = selectedDateIdx === 0;
  const openMin = timeToMin(openTime);
  const rawCloseMin = timeToMin(closeTime);
  const isOvernight = rawCloseMin <= openMin;
  const adjustedCloseMin = isOvernight ? rawCloseMin + 24 * 60 : rawCloseMin;

  function toAdj(tm: string): number {
    return normalizeOvernight(timeToMin(tm), openMin, isOvernight);
  }

  function isTimeTaken(startTime: string): boolean {
    const ranges = selectedSlot ? (selectedSlot.booked_ranges ?? []) : venueRanges;
    const startAdj = toAdj(startTime);
    const checkEnd = startAdj + slotDuration;
    return hasOverlap(startAdj, checkEnd, ranges, openMin, isOvernight);
  }

  function isTimeUnavailableDueToUnits(startTime: string): boolean {
    return (toAdj(startTime) + slotDuration) > adjustedCloseMin;
  }

  

const maxUnitsByBlocker = useMemo(() => {
  if (!selectedTime) return maxUnits;
  const ranges = selectedSlot
    ? (selectedSlot.booked_ranges ?? [])
    : venueRanges; // ← было только selectedSlot.booked_ranges
  if (!selectedSlot && venueRanges.length === 0) return maxUnits;
  const startAdj = toAdj(selectedTime);
  let max = 1;
  while (max < maxUnits) {
    const nextEnd = startAdj + slotDuration * (max + 1);
    if (nextEnd > adjustedCloseMin) break;
    if (hasOverlap(
      startAdj + slotDuration * max,
      startAdj + slotDuration * (max + 1),
      ranges,
      openMin, isOvernight,
    )) break;
    max++;
  }
  return max;
}, [selectedTime, selectedSlotId, slotData, venueRanges, selectedDateIdx]);

useEffect(() => {

  if (units > maxUnitsByBlocker) setUnits(maxUnitsByBlocker);

}, [units, maxUnitsByBlocker]); // ← добавить maxUnitsByBlocker





const selectedTimeOverflows = selectedTime
  ? (toAdj(selectedTime) + totalDuration) > adjustedCloseMin || units > maxUnitsByBlocker
  : false;

  function userConflicts(): any[] {
    if (!selectedTime || !endTime) return [];
    return userBookings.filter((b) => {
      if (b.venue_id === venue?.id) return false;
      return rangesOverlapByDate(
        selectedDateISO,
        selectedTime,
        endTime,
        dateOnly(b.date),
        b.time,
        b.end_time ?? addMin(b.time, 60),
      );
    });
  }

  const conflicts = userConflicts();

  useEffect(() => {
    if (!selectedSlot || selectedTime) return;
    const first = timeGrid.find(
      (tm) => !isPastTime(tm, isToday) && !isTimeTaken(tm) && !isTimeUnavailableDueToUnits(tm),
    );
    if (first) setSelectedTime(first);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSlotId, units, selectedDateIdx, slotData]);

  useEffect(() => {
    if (units > maxUnitsByBlocker) setUnits(maxUnitsByBlocker);}, [units]);

  const handleConfirm = async () => {
    if (!venue) return;
    if (slotData.length > 0 && !selectedSlotId) {
      Alert.alert(t('selectPlace'), t('selectPlaceFirst2')); return;
    }
    if (!selectedTime) {
      Alert.alert(t('selectTime'), t('selectTimeAlert')); return;
    }
    if (conflicts.length > 0) {
      Alert.alert(
        t('conflictBookings'),
        t('conflictAlert').replace('{v}', conflicts[0].venue_name),
      );
      return;
    }
    setSubmitting(true);
    try {
      await api.createBooking({
        venue_id: venue.id,
        slot_id: selectedSlotId || undefined,
        service_ids: selectedServiceIds.length > 0 ? selectedServiceIds : undefined,
        date: dates[selectedDateIdx].iso,
        time: selectedTime,
        duration: totalDuration,
        guests,
      } as any);
      Alert.alert(
        '✓ ' + t('bookingConfirmed'),
        t('bookingCreatedMsg')
          .replace('{date}', formatBookingDate(selectedDateISO, endDateISO, lang))
          .replace('{s}', selectedTime)
          .replace('{e}', endTime ?? '')
          .replace('{dur}', dur(totalDuration)),
        [
          { text: t('goToBookings'), onPress: () => router.push('/(tabs)/bookings' as any) },
          { text: t('back'), onPress: () => router.back(), style: 'cancel' },
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

  const confirmBtnText = () => {
    if (slotData.length > 0 && !selectedSlotId) return t('selectPlaceFirst');
    if (!selectedTime) return t('selectTimeFirst');
    if (selectedTimeOverflows) return t('exceedsClose');
    return t('bookWithDuration').replace('{d}', dur(totalDuration));
  };

  const guestLabel = () => {
    if (lang === 'kk') return `${guests} ${t('person')}`;
    return `${guests} ${t('person')}${guests === 1 ? t('personOne') : t('personFew')}`;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]} edges={['top']}>
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
            <Text style={[styles.venueHours, { color: c.textMuted }]}>
              {t('worksAt').replace('{o}', openTime).replace('{c}', closeTime)}
            </Text>
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
                if (i === 0 && selectedTime && isPastTime(selectedTime, true)) setSelectedTime(null);
              }}
            >
              <Text style={[styles.dateDay, { color: selectedDateIdx === i ? '#fff' : c.textSecondary }]}>{d.day}</Text>
              <Text style={[styles.dateNum, { color: selectedDateIdx === i ? '#fff' : c.text }]}>{d.date}</Text>
              <Text style={[styles.dateMon, { color: selectedDateIdx === i ? '#fff' : c.textMuted }]}>{d.month}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Slot selection */}
        {slotData.length > 0 && (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 24, marginBottom: 4 }}>
              <Text style={[styles.secTitle, { color: c.text, marginBottom: 0, flex: 1 }]}>{t('selectPlace')}</Text>
              {loadingAvail && <ActivityIndicator size="small" color={c.primary} />}
            </View>
            <Text style={[styles.hint, { color: c.textMuted }]}>{t('selectPlaceHint')}</Text>
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
                        {slot.price > 0
                          ? `${slot.price.toLocaleString()} ₸/${dur(slot.duration || 60)}`
                          : t('free')}
                        {slot.capacity > 1 ? ` · ${slot.capacity} ${lang === 'kk' ? 'адам' : 'чел.'}` : ''}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {/* Service selection */}
        {services.length > 0 && (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 24, marginBottom: 4 }}>
              <Wrench size={18} color={c.primary} />
              <Text style={[styles.secTitle, { color: c.text, marginBottom: 0, marginLeft: 8, flex: 1 }]}>{t('selectService')}</Text>
            </View>
            <Text style={[styles.hint, { color: c.textMuted }]}>{t('selectServiceHint')}</Text>
            <View style={styles.slotGrid}>
              {services.map((svc) => {
                const sel = selectedServiceIds.includes(svc.id);
                return (
                  <Pressable
                    key={svc.id}
                    onPress={() => toggleService(svc.id)}
                    style={[styles.slotCard, {
                      backgroundColor: sel ? c.primary : c.card,
                      borderColor: sel ? c.primary : c.border,
                    }]}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <CheckCircle size={16} color={sel ? '#fff' : c.success} />
                        <Text style={[styles.slotName, { color: sel ? '#fff' : c.text }]} numberOfLines={1}>{svc.name}</Text>
                      </View>
                      {svc.description ? (
                        <Text style={[styles.slotDesc, { color: sel ? 'rgba(255,255,255,0.8)' : c.textSecondary }]} numberOfLines={1}>{svc.description}</Text>
                      ) : null}
                      <Text style={[styles.slotMeta, { color: sel ? 'rgba(255,255,255,0.7)' : c.textMuted }]}>
                        {svc.price > 0 ? `${svc.price.toLocaleString()} ₸` : t('free')}
                        {svc.duration ? ` · ${svc.duration} мин` : ''}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {/* Time grid */}
        {(selectedSlotId || slotData.length === 0) && (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 24, marginBottom: 14 }}>
              <Text style={[styles.secTitle, { color: c.text, marginBottom: 0, flex: 1 }]}>{t('selectTime')}</Text>
              {loadingAvail && <ActivityIndicator size="small" color={c.primary} />}
            </View>
            {timeGrid.length === 0 ? (
              <Text style={[styles.hint, { color: c.textMuted }]}>{t('noTimeSlots')}</Text>
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
                          Alert.alert(t('selectTime'), t('takenAlert')); return;
                        }
                        if (!past && !overflow) setSelectedTime(tm);
                      }}
                    >
                      <Text style={[styles.timeText, { color: textColor }]}>{tm}</Text>
                      {taken && !active && (
                        <Text style={{ fontSize: 9, color: '#EF4444', marginTop: 1 }}>{t('takenTime')}</Text>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            )}
          </>
        )}

        {/* Duration */}
        {selectedTime && (
          <>
            <Text style={[styles.secTitle, { color: c.text, marginTop: 24 }]}>{t('duration')}</Text>
            <View style={[styles.unitsRow, { backgroundColor: c.card, borderColor: c.border }]}>
              <Pressable onPress={() => setUnits(Math.max(1, units - 1))} style={[styles.unitBtn, { backgroundColor: c.bg }]}>
                <Minus size={20} color={c.text} />
              </Pressable>
              <View style={{ alignItems: 'center' }}>
                <Text style={[styles.unitNum, { color: c.text }]}>{units}×</Text>
                <Text style={[styles.unitLabel, { color: c.primary }]}>{dur(totalDuration)}</Text>
              </View>
              <Pressable onPress={() => setUnits(Math.min(maxUnitsByBlocker, units + 1))}
disabled={units >= maxUnitsByBlocker} style={[styles.unitBtn, { backgroundColor: c.bg }]}>
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
              {t('overflowWarning').replace('{t}', closeTime)}
            </Text>
          </View>
        )}

        {/* Conflict warning */}
        {conflicts.length > 0 && (
          <View style={[styles.conflictBox, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}>
            <AlertTriangle size={18} color="#F59E0B" />
            <Text style={{ color: '#92400E', fontSize: 13, flex: 1, marginLeft: 8, lineHeight: 18 }}>
              {t('conflictWarning')
                .replace('{v}', conflicts[0].venue_name)
                .replace('{s}', conflicts[0].time)
                .replace('{e}', conflicts[0].end_time ?? '?')}
            </Text>
          </View>
        )}

        {/* Summary */}
        {selectedTime && (
          <View style={[styles.summary, { backgroundColor: `${c.primary}10`, borderColor: `${c.primary}30` }]}>
            <Text style={[styles.summaryTitle, { color: c.text }]}>{t('total')}</Text>
            <Text style={[styles.summaryRow, { color: c.textSecondary }]}>
              📅 {formatBookingDate(selectedDateISO, endDateISO, lang)}
            </Text>
            <Text style={[styles.summaryRow, { color: c.textSecondary }]}>
              ⏰ {selectedTime} – {endTime} ({dur(totalDuration)})
            </Text>
            {selectedSlot && (
              <Text style={[styles.summaryRow, { color: c.textSecondary }]}>
                📍 {selectedSlot.name}
                {selectedSlot.price > 0
                  ? ` · ${(selectedSlot.price * units).toLocaleString()} ₸`
                  : ` · ${t('free')}`}
              </Text>
            )}
            {selectedServices.length > 0 && (
              <Text style={[styles.summaryRow, { color: c.textSecondary }]}>
                🔧 {selectedServices.map((s) => s.name).join(', ')}
                {servicesPrice > 0 ? ` · ${servicesPrice.toLocaleString()} ₸` : ''}
                {servicesDuration > 0 ? ` · +${dur(servicesDuration)}` : ''}
              </Text>
            )}
            <Text style={[styles.summaryRow, { color: c.textSecondary }]}>
              👥 {guestLabel()}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Confirm button */}
      <View style={[styles.footer, { backgroundColor: c.card, borderTopColor: c.border }]}>
        <Pressable
          onPress={handleConfirm}
          disabled={submitting || (slotData.length > 0 && !selectedSlotId) || !selectedTime || selectedTimeOverflows}
          style={styles.confirmWrap}
        >
          <LinearGradient
            colors={
              submitting || (slotData.length > 0 && !selectedSlotId) || !selectedTime || selectedTimeOverflows
                ? ['#93C5FD', '#93C5FD']
                : ['#2563EB', '#3B82F6']
            }
            style={styles.confirmBtn}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          >
            {submitting
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.confirmText}>{confirmBtnText()}</Text>}
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
  venueHours: { fontSize: 12 },
  secTitle: { fontSize: 17, fontWeight: '600', marginBottom: 14 },
  hint: { fontSize: 12, marginBottom: 12, marginTop: -8 },
  dateCard: { width: 64, height: 80, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  dateDay: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  dateNum: { fontSize: 22, fontWeight: '800', marginBottom: 2 },
  dateMon: { fontSize: 10, fontWeight: '500' },
  slotGrid: { gap: 10 },
  slotCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1.5, padding: 14, gap: 10 },
  slotName: { fontSize: 14, fontWeight: '700' },
  slotDesc: { fontSize: 12, marginTop: 2 },
  slotMeta: { fontSize: 12, marginTop: 3 },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  timeSlot: { width: '30%', paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, alignItems: 'center' },
  timeText: { fontSize: 14, fontWeight: '600' },
  unitsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1.5, paddingVertical: 14, gap: 32 },
  unitBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  unitNum: { fontSize: 26, fontWeight: '800', minWidth: 40, textAlign: 'center' },
  unitLabel: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  guestsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1.5, paddingVertical: 14, gap: 24 },
  guestBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  guestNum: { fontSize: 26, fontWeight: '800', minWidth: 40, textAlign: 'center' },
  conflictBox: { flexDirection: 'row', alignItems: 'flex-start', borderRadius: 14, borderWidth: 1, padding: 14, marginTop: 16 },
  summary: { marginTop: 24, borderRadius: 16, padding: 16, borderWidth: 1, gap: 6 },
  summaryTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  summaryRow: { fontSize: 14, lineHeight: 22 },
  footer: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24, borderTopWidth: 1 },
  confirmWrap: {},
  confirmBtn: { paddingVertical: 18, borderRadius: 14, alignItems: 'center' },
  confirmText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
