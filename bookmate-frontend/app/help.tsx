import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../hooks/useHelpers';

const FAQ = [
  {
    q: 'Как забронировать место?',
    a: 'Откройте заведение → нажмите "Забронировать" → выберите дату, время и слот → подтвердите бронь. Заведение получит уведомление и подтвердит вашу бронь.',
  },
  {
    q: 'Можно ли отменить бронь?',
    a: 'Да. Перейдите в раздел "Брони" → найдите нужную бронь → нажмите "Отменить". Отмена доступна для статусов "Ожидает" и "Подтверждена".',
  },
  {
    q: 'Почему слот заблокирован?',
    a: 'Слот уже занят другим пользователем на выбранное время. Выберите другое время или другой слот.',
  },
  {
    q: 'Как добавить в избранное?',
    a: 'На странице заведения нажмите иконку ❤️ в правом верхнем углу. Все избранные заведения доступны в разделе Профиль → Избранное.',
  },
  {
    q: 'Когда придёт подтверждение?',
    a: 'Заведение подтверждает бронь вручную. Обычно это занимает от нескольких минут до 1 часа. Вы получите уведомление в приложении.',
  },
  {
    q: 'Как сменить язык?',
    a: 'Профиль → Настройки → нажмите на язык (RU/KK) чтобы переключить.',
  },
  {
    q: 'Как изменить фото профиля?',
    a: 'Профиль → нажмите на аватар (кружок с буквой) → выберите фото из галереи.',
  },
  {
    q: 'Что такое рейтинг клиента?',
    a: 'Рейтинг клиента — оценка вашей надёжности как пользователя. Начинается с 5.00. Заведения могут оставлять оценку после завершённых бронирований.',
  },
];

function FAQItem({ item }: { item: { q: string; a: string } }) {
  const c = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <Pressable
      style={[styles.faqItem, { backgroundColor: c.card, borderColor: open ? c.primary : c.border }]}
      onPress={() => setOpen(!open)}
    >
      <View style={styles.faqRow}>
        <Text style={[styles.faqQ, { color: c.text }]}>{item.q}</Text>
        {open
          ? <ChevronUp size={18} color={c.primary} />
          : <ChevronDown size={18} color={c.textMuted} />}
      </View>
      {open && (
        <Text style={[styles.faqA, { color: c.textSecondary }]}>{item.a}</Text>
      )}
    </Pressable>
  );
}

export default function HelpScreen() {
  const router = useRouter();
  const c = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: c.card, borderBottomColor: c.border }]}>
        <Pressable style={styles.back} onPress={() => router.back()}>
          <ChevronLeft size={24} color={c.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: c.text }]}>Помощь</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>

        <View style={[styles.banner, { backgroundColor: c.primaryLight }]}>
          <Text style={{ fontSize: 32, marginBottom: 8 }}>💬</Text>
          <Text style={[styles.bannerTitle, { color: c.primary }]}>FAQ — Частые вопросы</Text>
          <Text style={[styles.bannerSub, { color: c.textSecondary }]}>
            Нажмите на вопрос чтобы увидеть ответ
          </Text>
        </View>

        {FAQ.map((item, i) => (
          <FAQItem key={i} item={item} />
        ))}

        <View style={[styles.contact, { backgroundColor: c.card }]}>
          <Text style={[styles.contactTitle, { color: c.text }]}>Не нашли ответ?</Text>
          <Text style={[styles.contactSub, { color: c.textSecondary }]}>
            Напишите нам: support@bookmate.kz
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700' },
  inner: { padding: 16, gap: 10, paddingBottom: 40 },
  banner: { borderRadius: 18, padding: 20, alignItems: 'center', marginBottom: 6 },
  bannerTitle: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  bannerSub: { fontSize: 13, textAlign: 'center' },
  faqItem: { borderRadius: 14, padding: 16, borderWidth: 1.5 },
  faqRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  faqQ: { fontSize: 15, fontWeight: '600', flex: 1, marginRight: 8 },
  faqA: { fontSize: 14, lineHeight: 22, marginTop: 12 },
  contact: { borderRadius: 16, padding: 20, alignItems: 'center', marginTop: 6 },
  contactTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  contactSub: { fontSize: 14 },
});
