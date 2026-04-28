import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Switch, Alert, Image, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { Heart, Settings, HelpCircle, LogOut, ChevronRight, Moon, Globe, Briefcase, Star, Camera, Building2 } from 'lucide-react-native';
import { Modal, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useStore } from '../../hooks/useStore';
import { useTheme, useT } from '../../hooks/useHelpers';
import { api } from '../../services/api';

export default function ProfileScreen() {
  const c = useTheme(); const t = useT(); const router = useRouter();
  const user = useStore((s) => s.user);
  const dark = useStore((s) => s.dark);
  const lang = useStore((s) => s.lang);
  const toggleTheme = useStore((s) => s.toggleTheme);
  const setLang = useStore((s) => s.setLang);
  const logout = useStore((s) => s.logout);
  const updateUser = useStore((s) => s.updateUser);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [applyModal, setApplyModal] = useState(false);
  const [applyForm, setApplyForm] = useState({ business_name: '', category: '', location: '', description: '', phone: '' });
  const [applyLoading, setApplyLoading] = useState(false);
  const [myApplication, setMyApplication] = useState<any>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const me = await api.getMe();
        if (alive && me) updateUser(me);
      } catch {}
    })();
    return () => { alive = false; };
  }, [updateUser]);

  const confirmLogout = (): Promise<boolean> => {
    if (Platform.OS === 'web') {
      return Promise.resolve(window.confirm(t('logOut')));
    }
    return new Promise((resolve) => {
      Alert.alert(
        t('logOut'),
        '',
        [
          { text: t('back'), style: 'cancel', onPress: () => resolve(false) },
          { text: t('ok'), style: 'destructive', onPress: () => resolve(true) },
        ],
        { cancelable: true, onDismiss: () => resolve(false) }
      );
    });
  };

  const handleLogout = async () => {
    const confirmed = await confirmLogout();
    if (!confirmed) return;
    logout();
    router.replace('/auth/login');
  };

  const handleAvatarPick = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Нет доступа', 'Разрешите доступ к фото'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;
    setUploadingAvatar(true);
    try {
      const res = await api.uploadAvatar(result.assets[0].uri);
      if (res.avatar_url) updateUser({ avatar_url: res.avatar_url });
    } catch (e: any) { Alert.alert(t('error'), e.message); }
    finally { setUploadingAvatar(false); }
  };

  const isBusiness = user?.role === 'business_owner' || user?.role === 'admin';
  const isRegularUser = user?.role === 'user';

  const openApply = async () => {
    try {
      const [app, me] = await Promise.all([
        api.getMyApplication().catch(() => null),
        api.getMe().catch(() => null),
      ]);
      setMyApplication(app);
      if (me) updateUser(me);
    } catch {}
    setApplyModal(true);
  };

  const submitApplication = async () => {
    if (!applyForm.business_name || !applyForm.category || !applyForm.location) {
      Alert.alert('Ошибка', 'Заполните название, категорию и адрес'); return;
    }
    setApplyLoading(true);
    try {
      const app = await api.submitApplication(applyForm);
      setMyApplication(app);
      setApplyForm({ business_name: '', category: '', location: '', description: '', phone: '' });
      Alert.alert('✓ Заявка отправлена', 'Ваша заявка отправлена на рассмотрение администратору. Мы уведомим вас о решении.');
      setApplyModal(false);
    } catch (e: any) { Alert.alert('Ошибка', e.message); }
    finally { setApplyLoading(false); }
  };
  const rating = user?.client_rating ?? 5.0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: c.card, borderBottomColor: c.border }]}>
        <Text style={[styles.headerTitle, { color: c.text }]}>{t('profile')}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>

        <LinearGradient colors={['#1D4ED8', '#2563EB', '#3B82F6']} style={styles.heroCard}>
          <Pressable style={styles.avatarWrap} onPress={handleAvatarPick}>
            {uploadingAvatar
              ? <View style={[styles.avatarCircle, { backgroundColor: 'rgba(255,255,255,0.2)' }]}><ActivityIndicator color="#fff" /></View>
              : user?.avatar_url
                ? <Image source={{ uri: user.avatar_url }} style={styles.avatarImg} />
                : <View style={[styles.avatarCircle, { backgroundColor: 'rgba(255,255,255,0.2)' }]}><Text style={styles.avatarInitial}>{user?.name?.[0]?.toUpperCase() || 'U'}</Text></View>}
            <View style={styles.cameraBtn}><Camera size={12} color="#fff" /></View>
          </Pressable>
          <Text style={styles.heroName}>{user?.name || 'User'}</Text>
          <Text style={styles.heroEmail}>{user?.email}</Text>
          <View style={styles.ratingRow}>
            <Star size={14} color="#FDE68A" fill="#FDE68A" />
            <Text style={styles.ratingText}>{Number(rating).toFixed(2)}</Text>
            <Text style={styles.ratingLabel}>рейтинг клиента</Text>
          </View>
        </LinearGradient>

        {isBusiness && (
          <View style={[styles.section, { backgroundColor: c.card }]}>
            <Text style={[styles.sectionLabel, { color: c.textMuted }]}>БИЗНЕС</Text>
            <Pressable style={styles.row} onPress={() => router.push('/business' as any)}>
              <View style={[styles.rowIcon, { backgroundColor: '#8B5CF620' }]}><Briefcase size={20} color="#8B5CF6" /></View>
              <Text style={[styles.rowLabel, { color: c.text }]}>Бизнес панель</Text>
              <View style={styles.proBadge}><Text style={styles.proBadgeText}>PRO</Text></View>
              <ChevronRight size={18} color={c.textMuted} />
            </Pressable>
          </View>
        )}

        {isRegularUser && (
          <View style={[styles.section, { backgroundColor: c.card }]}>
            <Text style={[styles.sectionLabel, { color: c.textMuted }]}>ДЛЯ БИЗНЕСА</Text>
            <Pressable style={styles.row} onPress={openApply}>
              <View style={[styles.rowIcon, { backgroundColor: '#2563EB20' }]}><Building2 size={20} color="#2563EB" /></View>
              <Text style={[styles.rowLabel, { color: c.text }]}>Стать бизнес-партнёром</Text>
              <ChevronRight size={18} color={c.textMuted} />
            </Pressable>
          </View>
        )}

        {/* Apply modal */}
        <Modal visible={applyModal} transparent animationType="slide">
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
            <ScrollView style={{ backgroundColor: c.card, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
              contentContainerStyle={{ padding: 24, paddingBottom: 48 }}
              keyboardShouldPersistTaps="handled">
              <Text style={{ fontSize: 20, fontWeight: '800', color: c.text, marginBottom: 4 }}>Стать партнёром</Text>
              <Text style={{ fontSize: 14, color: c.textSecondary, marginBottom: 20 }}>
                Заполните заявку — администратор рассмотрит её и создаст ваше заведение.
              </Text>
              {myApplication?.status === 'pending' && (
                <View style={{ backgroundColor: '#FEF3C7', borderRadius: 12, padding: 14, marginBottom: 16 }}>
                  <Text style={{ color: '#92400E', fontWeight: '600' }}>⏳ Ваша заявка уже на рассмотрении</Text>
                </View>
              )}
              {myApplication?.status === 'rejected' && (
                <View style={{ backgroundColor: '#FEE2E2', borderRadius: 12, padding: 14, marginBottom: 16 }}>
                  <Text style={{ color: '#991B1B', fontWeight: '600' }}>✕ Заявка отклонена{myApplication.admin_note ? ': ' + myApplication.admin_note : ''}</Text>
                  <Text style={{ color: '#991B1B', fontSize: 12, marginTop: 4 }}>Вы можете подать новую заявку</Text>
                </View>
              )}
              {myApplication?.status === 'approved' && (
                <View style={{ backgroundColor: '#D1FAE5', borderRadius: 12, padding: 14, marginBottom: 16 }}>
                  <Text style={{ color: '#065F46', fontWeight: '600' }}>✓ Заявка одобрена</Text>
                  <Text style={{ color: '#065F46', fontSize: 12, marginTop: 4 }}>Профиль будет обновлён автоматически. Если бизнес-раздел уже доступен, заявку повторно отправлять не нужно.</Text>
                </View>
              )}
              {[
                { key: 'business_name', label: 'Название бизнеса *', placeholder: 'Бильярдный клуб Elite' },
                { key: 'category', label: 'Категория *', placeholder: 'Billiards, Bowling, Gaming...' },
                { key: 'location', label: 'Адрес *', placeholder: 'г. Алматы, ул. Абая 1' },
                { key: 'phone', label: 'Телефон', placeholder: '+7 700 000 0000' },
                { key: 'description', label: 'Описание', placeholder: 'Расскажите о вашем бизнесе...' },
              ].map(f => (
                <View key={f.key} style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: c.text, marginBottom: 6 }}>{f.label}</Text>
                  <TextInput
                    style={{ borderWidth: 1.5, borderColor: c.border, borderRadius: 12, padding: 12, fontSize: 14, color: c.text, backgroundColor: c.bg }}
                    placeholder={f.placeholder} placeholderTextColor={c.textMuted}
                    value={(applyForm as any)[f.key]}
                    onChangeText={v => setApplyForm(p => ({ ...p, [f.key]: v }))}
                    multiline={f.key === 'description'}
                  />
                </View>
              ))}
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                <Pressable style={{ flex: 1, padding: 16, borderRadius: 14, borderWidth: 1.5, borderColor: c.border, alignItems: 'center' }}
                  onPress={() => setApplyModal(false)}>
                  <Text style={{ fontWeight: '600', color: c.text }}>Отмена</Text>
                </Pressable>
                <Pressable style={{ flex: 1, padding: 16, borderRadius: 14, backgroundColor: c.primary, alignItems: 'center' }}
                  onPress={submitApplication} disabled={applyLoading || myApplication?.status === 'pending' || myApplication?.status === 'approved'}>
                  {applyLoading
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={{ fontWeight: '700', color: '#fff' }}>
                        {myApplication?.status === 'pending' ? 'На рассмотрении' : myApplication?.status === 'approved' ? 'Уже одобрено' : 'Отправить заявку'}
                      </Text>}
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </Modal>

        <View style={[styles.section, { backgroundColor: c.card }]}>
          <Text style={[styles.sectionLabel, { color: c.textMuted }]}>АККАУНТ</Text>
          <Pressable style={styles.row} onPress={() => router.push('/favorites' as any)}>
            <View style={[styles.rowIcon, { backgroundColor: '#EF444420' }]}><Heart size={20} color="#EF4444" /></View>
            <Text style={[styles.rowLabel, { color: c.text }]}>{t('favorites')}</Text>
            <ChevronRight size={18} color={c.textMuted} />
          </Pressable>
          <View style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: `${c.textSecondary}20` }]}><Moon size={20} color={c.textSecondary} /></View>
            <Text style={[styles.rowLabel, { color: c.text }]}>{t('darkTheme')}</Text>
            <Switch value={dark} onValueChange={toggleTheme} trackColor={{ true: c.primary, false: c.border }} />
          </View>
          <Pressable style={styles.row} onPress={() => setLang(lang === 'ru' ? 'kk' : 'ru')}>
            <View style={[styles.rowIcon, { backgroundColor: '#10B98120' }]}><Globe size={20} color="#10B981" /></View>
            <Text style={[styles.rowLabel, { color: c.text }]}>{t('language')}</Text>
            <View style={[styles.langBadge, { backgroundColor: c.primaryLight }]}><Text style={{ color: c.primary, fontWeight: '800', fontSize: 13 }}>{lang.toUpperCase()}</Text></View>
          </Pressable>
          <Pressable style={styles.row} onPress={() => router.push('/settings' as any)}>
            <View style={[styles.rowIcon, { backgroundColor: `${c.textSecondary}20` }]}><Settings size={20} color={c.textSecondary} /></View>
            <Text style={[styles.rowLabel, { color: c.text }]}>{t('settings')}</Text>
            <ChevronRight size={18} color={c.textMuted} />
          </Pressable>
          <Pressable style={styles.row} onPress={() => router.push('/help' as any)}>
            <View style={[styles.rowIcon, { backgroundColor: '#10B98120' }]}><HelpCircle size={20} color="#10B981" /></View>
            <Text style={[styles.rowLabel, { color: c.text }]}>{t('helpSupport')}</Text>
            <ChevronRight size={18} color={c.textMuted} />
          </Pressable>
        </View>

        <View style={[styles.section, { backgroundColor: c.card }]}>
          <Pressable style={styles.row} onPress={handleLogout}>
            <View style={[styles.rowIcon, { backgroundColor: '#EF444420' }]}><LogOut size={20} color={c.danger} /></View>
            <Text style={[styles.rowLabel, { color: c.danger }]}>{t('logOut')}</Text>
          </Pressable>
        </View>
        <Text style={[styles.version, { color: c.textMuted }]}>BookMate v2.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1 },
  headerTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  inner: { padding: 16, gap: 14, paddingBottom: 40 },
  heroCard: { borderRadius: 24, padding: 28, alignItems: 'center' },
  avatarWrap: { marginBottom: 14, position: 'relative' },
  avatarCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  avatarImg: { width: 80, height: 80, borderRadius: 40 },
  avatarInitial: { color: '#fff', fontSize: 34, fontWeight: '800' },
  cameraBtn: { position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderRadius: 12, backgroundColor: '#2563EB', borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  heroName: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 4 },
  heroEmail: { color: 'rgba(255,255,255,0.75)', fontSize: 14, marginBottom: 12 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  ratingText: { color: '#FDE68A', fontWeight: '800', fontSize: 16 },
  ratingLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  section: { borderRadius: 20, paddingVertical: 6, elevation: 2 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 2 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 14 },
  rowIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  rowLabel: { flex: 1, fontSize: 16, fontWeight: '500' },
  proBadge: { backgroundColor: '#8B5CF620', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginRight: 6 },
  proBadgeText: { color: '#8B5CF6', fontSize: 11, fontWeight: '700' },
  langBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginRight: 6 },
  version: { textAlign: 'center', fontSize: 12 },
});
