import { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Switch,
  Alert, Image, ActivityIndicator, Platform, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import {
  Heart, Settings, HelpCircle, LogOut, ChevronRight,
  Moon, Globe, Briefcase, Star, Camera,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useStore } from '../../hooks/useStore';
import { useTheme, useT } from '../../hooks/useHelpers';
import { api } from '../../services/api';

export default function ProfileScreen() {
  const c = useTheme();
  const t = useT();
  const router = useRouter();
  const dark = useStore((s) => s.dark);
  const user = useStore((s) => s.user);
  const lang = useStore((s) => s.lang);
  const toggleTheme = useStore((s) => s.toggleTheme);
  const setLang = useStore((s) => s.setLang);
  const logout = useStore((s) => s.logout);
  const updateUser = useStore((s) => s.updateUser);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const confirmLogout = (): Promise<boolean> => {
    if (Platform.OS === 'web') return Promise.resolve(window.confirm(t('logOut')));
    return new Promise((resolve) => {
      Alert.alert(
        t('logOut'), '',
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
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    setUploadingAvatar(true);
    try {
      const res = await api.uploadAvatar(result.assets[0].uri);
      if (res.avatar_url) updateUser({ avatar_url: res.avatar_url });
    } catch (e: any) { Alert.alert(t('error'), e.message); }
    finally { setUploadingAvatar(false); }
  };

  const isBusiness = user?.role === 'business_owner' || user?.role === 'admin';
  const rating = user?.client_rating ?? 5.0;

  const GRAD = dark
    ? (['#7C3AED', '#6366F1', '#4F46E5'] as const)
    : (['#6366F1', '#818CF8', '#A5B4FC'] as const);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]} edges={['top']}>
      {dark && <View style={styles.bgGlow} />}

      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        {/* Header */}
        <View style={[styles.headerBar, { borderBottomColor: c.border }]}>
          <Text style={[styles.headerTitle, { color: c.text }]}>{t('profile')}</Text>
        </View>

        <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>

          {/* Hero card */}
          <LinearGradient colors={GRAD} style={styles.heroCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={styles.heroGloss} />
            <Pressable style={styles.avatarWrap} onPress={handleAvatarPick}>
              {uploadingAvatar
                ? <View style={styles.avatarCircle}><ActivityIndicator color="#fff" /></View>
                : user?.avatar_url
                  ? <Image source={{ uri: user.avatar_url }} style={styles.avatarImg} />
                  : (
                    <View style={styles.avatarCircle}>
                      <Text style={styles.avatarInitial}>{user?.name?.[0]?.toUpperCase() || 'U'}</Text>
                    </View>
                  )}
              <View style={styles.cameraBtn}><Camera size={11} color="#fff" /></View>
            </Pressable>
            <Text style={styles.heroName}>{user?.name || 'User'}</Text>
            <Text style={styles.heroEmail}>{user?.email}</Text>
            <View style={styles.ratingRow}>
              <Star size={14} color="#FDE68A" fill="#FDE68A" />
              <Text style={styles.ratingVal}>{Number(rating).toFixed(2)}</Text>
              <Text style={styles.ratingLabel}>рейтинг</Text>
            </View>
          </LinearGradient>

          {/* Business section */}
          {isBusiness && (
            <View style={[styles.section, { backgroundColor: c.card, borderColor: c.border }]}>
              <Text style={[styles.sectionLabel, { color: c.textMuted }]}>БИЗНЕС</Text>
              <Row
                icon={<Briefcase size={19} color="#A78BFA" />}
                iconBg="rgba(167,139,250,0.15)"
                label="Бизнес панель"
                badge="PRO"
                badgeColor="#7C3AED"
                c={c}
                onPress={() => router.push('/business' as any)}
              />
            </View>
          )}

          {/* Account section */}
          <View style={[styles.section, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[styles.sectionLabel, { color: c.textMuted }]}>АККАУНТ</Text>
            <Row
              icon={<Heart size={19} color="#F87171" />}
              iconBg="rgba(248,113,113,0.15)"
              label={t('favorites')}
              c={c}
              onPress={() => router.push('/favorites' as any)}
            />
            <View style={[styles.divider, { backgroundColor: c.border }]} />
            <View style={styles.row}>
              <View style={[styles.rowIcon, { backgroundColor: dark ? 'rgba(148,163,184,0.12)' : 'rgba(71,85,105,0.1)' }]}>
                <Moon size={19} color={c.textSecondary} />
              </View>
              <Text style={[styles.rowLabel, { color: c.text }]}>{t('darkTheme')}</Text>
              <Switch
                value={dark}
                onValueChange={() => { Haptics.selectionAsync(); toggleTheme(); }}
                trackColor={{ true: c.primary, false: c.border }}
                thumbColor={dark ? '#fff' : '#fff'}
              />
            </View>
            <View style={[styles.divider, { backgroundColor: c.border }]} />
            <Row
              icon={<Globe size={19} color="#34D399" />}
              iconBg="rgba(52,211,153,0.13)"
              label={t('language')}
              rightEl={
                <View style={[styles.langBadge, { backgroundColor: c.primaryLight }]}>
                  <Text style={[styles.langTxt, { color: c.primary }]}>{lang.toUpperCase()}</Text>
                </View>
              }
              c={c}
              onPress={() => { Haptics.selectionAsync(); setLang(lang === 'ru' ? 'kk' : 'ru'); }}
            />
            <View style={[styles.divider, { backgroundColor: c.border }]} />
            <Row
              icon={<Settings size={19} color={c.textSecondary} />}
              iconBg={dark ? 'rgba(148,163,184,0.12)' : 'rgba(71,85,105,0.08)'}
              label={t('settings')}
              c={c}
              onPress={() => router.push('/settings' as any)}
            />
            <View style={[styles.divider, { backgroundColor: c.border }]} />
            <Row
              icon={<HelpCircle size={19} color="#34D399" />}
              iconBg="rgba(52,211,153,0.13)"
              label={t('helpSupport')}
              c={c}
              onPress={() => router.push('/help' as any)}
            />
          </View>

          {/* Logout */}
          <View style={[styles.section, { backgroundColor: c.card, borderColor: c.border }]}>
            <Row
              icon={<LogOut size={19} color={c.danger} />}
              iconBg="rgba(248,113,113,0.13)"
              label={t('logOut')}
              labelColor={c.danger}
              c={c}
              onPress={handleLogout}
            />
          </View>

          <Text style={[styles.version, { color: c.textMuted }]}>BookMate v2.0.0</Text>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

function Row({ icon, iconBg, label, badge, badgeColor, rightEl, c, onPress, labelColor }: any) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.72 : 1 }]}
      onPress={onPress}
    >
      <View style={[styles.rowIcon, { backgroundColor: iconBg }]}>{icon}</View>
      <Text style={[styles.rowLabel, { color: labelColor || c.text }]}>{label}</Text>
      {badge && (
        <View style={[styles.proBadge, { backgroundColor: `${badgeColor}22` }]}>
          <Text style={[styles.proBadgeTxt, { color: badgeColor }]}>{badge}</Text>
        </View>
      )}
      {rightEl ?? null}
      {!rightEl && onPress && <ChevronRight size={16} color={c.textMuted} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bgGlow: {
    position: 'absolute', width: 400, height: 300, borderRadius: 200,
    backgroundColor: 'rgba(99,102,241,0.08)', top: -60, right: -100,
  },
  headerBar: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  headerTitle: { fontSize: 20, fontWeight: '800', textAlign: 'center', letterSpacing: -0.4 },
  inner: { padding: 16, gap: 14, paddingBottom: 48 },
  heroCard: { borderRadius: 28, padding: 28, alignItems: 'center', overflow: 'hidden' },
  heroGloss: {
    position: 'absolute', top: -40, right: -40, width: 200, height: 200,
    borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.08)',
  },
  avatarWrap: { marginBottom: 14, position: 'relative' },
  avatarCircle: {
    width: 86, height: 86, borderRadius: 43,
    backgroundColor: 'rgba(255,255,255,0.20)', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.35)',
  },
  avatarImg: {
    width: 86, height: 86, borderRadius: 43,
    borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.35)',
  },
  avatarInitial: { color: '#fff', fontSize: 36, fontWeight: '800' },
  cameraBtn: {
    position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.55)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroName: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 4, letterSpacing: -0.3 },
  heroEmail: { color: 'rgba(255,255,255,0.70)', fontSize: 14, marginBottom: 14 },
  ratingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.16)', paddingHorizontal: 16, paddingVertical: 7,
    borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.20)',
  },
  ratingVal: { color: '#FDE68A', fontWeight: '800', fontSize: 16 },
  ratingLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 12 },
  section: { borderRadius: 22, paddingVertical: 6, borderWidth: 1 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', letterSpacing: 1.2,
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4,
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 16 },
  rowIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  rowLabel: { flex: 1, fontSize: 16, fontWeight: '500' },
  divider: { height: 1, marginLeft: 70, marginRight: 16 },
  proBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginRight: 6 },
  proBadgeTxt: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  langBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9, marginRight: 6 },
  langTxt: { fontWeight: '800', fontSize: 13 },
  version: { textAlign: 'center', fontSize: 12 },
});
