import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle, Tag, Star, MapPin, CheckCheck } from 'lucide-react-native';
import { useTheme, useT } from '../../hooks/useHelpers';
import { useStore } from '../../hooks/useStore';
import { api } from '../../services/api';

const iconMap: Record<string, any> = {
  booking: CheckCircle, offer: Tag, review: Star, venue: MapPin,
};

function formatDate(dateStr: string, lang: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months_ru = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
    const months_kk = ['қаңтар', 'ақпан', 'наурыз', 'сәуір', 'мамыр', 'маусым', 'шілде', 'тамыз', 'қыркүйек', 'қазан', 'қараша', 'желтоқсан'];    const months = lang === 'kk' ? months_kk : months_ru;
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

function timeAgo(dateStr: string, lang: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (lang === 'kk') {
    if (mins < 1) return 'жаңа ғана';
    if (mins < 60) return `${mins} мин. бұрын`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} сағ. бұрын`;
    const days = Math.floor(hrs / 24);
    return `${days} күн бұрын`;
  }
  if (mins < 1) return 'только что';
  if (mins < 60) return `${mins} мин. назад`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} ч. назад`;
  const days = Math.floor(hrs / 24);
  return `${days} дн. назад`;
}

// Парсит и переводит типичные серверные сообщения
function translateMessage(message: string, lang: string): string {
  if (lang === 'ru') return cleanMessage(message, 'ru');

  // Паттерны для перевода — добавляйте новые по мере необходимости
  const patterns: { re: RegExp; kk: (...args: string[]) => string }[] = [
// Универсальный формат: "Ваша бронь в "X" на ДАТА в ВРЕМЯ СТАТУС."
    {
      re: /Ваша бронь в "(.+?)" на (.+?) в (.+?) отменена\./,
      kk: (v, d, time) => `"${v}" мекемесіндегі ${translateDate(d, lang)} сағат ${time} брондауыңыз болдырылмады.`,
    },
    {
      re: /Ваша бронь в "(.+?)" на (.+?) в (.+?) подтверждена\./,
      kk: (v, d, time) => `"${v}" мекемесіндегі ${translateDate(d, lang)} сағат ${time} брондауыңыз расталды.`,
    },
    {
      re: /Ваша бронь в "(.+?)" на (.+?) в (.+?) завершена\./,
      kk: (v, d, time) => `"${v}" мекемесіндегі ${translateDate(d, lang)} сағат ${time} брондауыңыз аяқталды.`,
    },
    // ← вот этот паттерн был неверным, исправить:
    {
      re: /Ваша бронь в "(.+?)" на (.+?) в (.+?) отправлена и ожидает подтверждения\./,
      kk: (v, d, time) => `"${v}" мекемесіндегі ${translateDate(d, lang)} сағат ${time} брондауыңыз жіберілді және растауды күтуде.`,
    },
    {
      re: /Новый отзыв о заведении "(.+?)"/,
      kk: (v) => `"${v}" мекемесі туралы жаңа пікір`,
    },
    {
      re: /Акция в "(.+?)": (.+)/,
      kk: (v, promo) => `"${v}" мекемесінде акция: ${promo}`,
    },
  ];

  for (const { re, kk } of patterns) {
    const m = message.match(re);
    if (m) {
      const args = m.slice(1).map((a) => translateDate(a, lang));
      return kk(...m.slice(1));
    }
  }

  return message; // если паттерн не найден — оставляем как есть
}

function translateTitle(title: string, lang: string): string {
  if (lang === 'ru') return title;
  const map: Record<string, string> = {
  'Бронь отменена': 'Бронь болдырылмады',
  'Бронь подтверждена': 'Бронь расталды',
  'Бронь создана': 'Бронь жасалды',
  'Бронь отправлена': 'Бронь жіберілді',  // ← добавить
  'Бронь завершена': 'Бронь аяқталды',
  'Новый отзыв': 'Жаңа пікір',
  'Акция': 'Акция',
  'Напоминание': 'Еске салу',
};
  return map[title] ?? title;
}

// Форматирует "Sun May 24 2026 00:00:00 GMT+0000" → "24 мая 2026"
function translateDate(str: string, lang: string): string {
  try {
    const d = new Date(str);
    if (isNaN(d.getTime())) return str;
    return formatDate(d.toISOString(), lang);
  } catch {
    return str;
  }
}

function cleanMessage(message: string, lang: string): string {
  // Заменяем уродливый GMT-формат даты на красивый
  return message.replace(
    /\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{1,2} \d{4} \d{2}:\d{2}:\d{2} GMT[+\-]\d{4} \([^)]+\)/g,
    (match) => translateDate(match, lang),
  );
}

export default function NotificationsScreen() {
  const c = useTheme();
  const t = useT();
  const lang = useStore((s) => s.lang);
  const [notifs, setNotifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { setNotifs(await api.getNotifications()); }
    catch {} finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const markAll = async () => {
    try { await api.markAllRead(); load(); } catch {}
  };

  const markOne = async (id: string) => {
    try { await api.markRead(id); load(); } catch {}
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: c.card, borderBottomColor: c.border }]}>
        <Text style={[styles.headerTitle, { color: c.text }]}>{t('notifications')}</Text>
        {notifs.some((n) => !n.read) && (
          <Pressable onPress={markAll} style={styles.markAll}>
            <CheckCheck size={18} color={c.primary} />
          </Pressable>
        )}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={c.primary} size="large" />
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.inner}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={c.primary} />
          }
        >
          {notifs.map((n) => {
            const Icon = iconMap[n.type] || CheckCircle;
            return (
              <Pressable
                key={n.id}
                style={[styles.card, { backgroundColor: c.card, opacity: n.read ? 0.7 : 1 }]}
                onPress={() => markOne(n.id)}
              >
                <View style={[styles.iconWrap, { backgroundColor: `${c.primary}15` }]}>
                  <Icon size={20} color={c.primary} />
                </View>
                <View style={styles.notifBody}>
                  <View style={styles.notifRow}>
                    <Text style={[styles.notifTitle, { color: c.text }]} numberOfLines={1}>
                      {translateTitle(n.title, lang)}
                    </Text>
                    <Text style={[styles.ts, { color: c.textMuted }]}>
                      {timeAgo(n.created_at, lang)}
                    </Text>
                  </View>
                  <Text style={[styles.notifMsg, { color: c.textSecondary }]} numberOfLines={3}>
                    {translateMessage(n.message, lang)}
                  </Text>
                </View>
              </Pressable>
            );
          })}
          {notifs.length === 0 && (
            <Text style={[styles.empty, { color: c.textMuted }]}>{t('noNotifications')}</Text>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  markAll: { position: 'absolute', right: 16 },
  content: { flex: 1 },
  inner: { padding: 16, gap: 12 },
  card: { borderRadius: 16, padding: 16, flexDirection: 'row', elevation: 2 },
  iconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  notifBody: { flex: 1 },
  notifRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  notifTitle: { fontSize: 15, fontWeight: '600', flex: 1, marginRight: 8 },
  ts: { fontSize: 12 },
  notifMsg: { fontSize: 14, lineHeight: 20 },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 16 },
});