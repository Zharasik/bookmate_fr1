import { View, Text, StyleSheet, ScrollView, Pressable, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Heart, Settings, HelpCircle, LogOut, ChevronRight, Moon, Globe } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useStore } from '../../hooks/useStore';
import { useTheme, useT } from '../../hooks/useHelpers';

export default function ProfileScreen() {
  const c = useTheme();
  const t = useT();
  const router = useRouter();
  const user = useStore((s) => s.user);
  const dark = useStore((s) => s.dark);
  const lang = useStore((s) => s.lang);
  const toggleTheme = useStore((s) => s.toggleTheme);
  const setLang = useStore((s) => s.setLang);
  const logout = useStore((s) => s.logout);

  const handleLogout = () => {
    Alert.alert(t('logOut'), '', [
      { text: t('back'), style: 'cancel' },
      { text: t('ok'), style: 'destructive', onPress: () => { logout(); router.replace('/auth/login'); } },
    ]);
  };

  const toggleLang = () => setLang(lang === 'ru' ? 'kk' : 'ru');

  const initial = user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: c.card, borderBottomColor: c.border }]}>
        <Text style={[styles.headerTitle, { color: c.text }]}>{t('profile')}</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>
        {/* Profile card */}
        <View style={[styles.profileCard, { backgroundColor: c.card }]}>
          <View style={[styles.avatar, { backgroundColor: c.primary }]}>
            <User size={40} color="#fff" />
          </View>
          <Text style={[styles.name, { color: c.text }]}>{user?.name || 'User'}</Text>
          <Text style={[styles.email, { color: c.textSecondary }]}>{user?.email}</Text>
        </View>

        {/* Settings */}
        <View style={[styles.menuBox, { backgroundColor: c.card }]}>
          {/* Dark theme toggle */}
          <View style={styles.menuItem}>
            <View style={[styles.menuIcon, { backgroundColor: `${c.textSecondary}15` }]}>
              <Moon size={20} color={c.textSecondary} />
            </View>
            <Text style={[styles.menuLabel, { color: c.text }]}>{t('darkTheme')}</Text>
            <Switch value={dark} onValueChange={toggleTheme} trackColor={{ true: c.primary, false: c.border }} />
          </View>

          {/* Language toggle */}
          <Pressable style={styles.menuItem} onPress={toggleLang}>
            <View style={[styles.menuIcon, { backgroundColor: '#10B98115' }]}>
              <Globe size={20} color="#10B981" />
            </View>
            <Text style={[styles.menuLabel, { color: c.text }]}>{t('language')}</Text>
            <Text style={[styles.langBadge, { color: c.primary, backgroundColor: c.primaryLight }]}>
              {lang === 'ru' ? 'RU' : 'KK'}
            </Text>
          </Pressable>

          {/* Favorites */}
          <Pressable style={styles.menuItem}>
            <View style={[styles.menuIcon, { backgroundColor: '#EF444415' }]}>
              <Heart size={20} color="#EF4444" />
            </View>
            <Text style={[styles.menuLabel, { color: c.text }]}>{t('favorites')}</Text>
            <ChevronRight size={20} color={c.textMuted} />
          </Pressable>

          {/* Edit profile */}
          <Pressable style={styles.menuItem}>
            <View style={[styles.menuIcon, { backgroundColor: `${c.primary}15` }]}>
              <User size={20} color={c.primary} />
            </View>
            <Text style={[styles.menuLabel, { color: c.text }]}>{t('editProfile')}</Text>
            <ChevronRight size={20} color={c.textMuted} />
          </Pressable>

          {/* Settings */}
          <Pressable style={styles.menuItem}>
            <View style={[styles.menuIcon, { backgroundColor: `${c.textSecondary}15` }]}>
              <Settings size={20} color={c.textSecondary} />
            </View>
            <Text style={[styles.menuLabel, { color: c.text }]}>{t('settings')}</Text>
            <ChevronRight size={20} color={c.textMuted} />
          </Pressable>

          {/* Help */}
          <Pressable style={styles.menuItem}>
            <View style={[styles.menuIcon, { backgroundColor: '#10B98115' }]}>
              <HelpCircle size={20} color="#10B981" />
            </View>
            <Text style={[styles.menuLabel, { color: c.text }]}>{t('helpSupport')}</Text>
            <ChevronRight size={20} color={c.textMuted} />
          </Pressable>

          {/* Logout */}
          <Pressable style={styles.menuItem} onPress={handleLogout}>
            <View style={[styles.menuIcon, { backgroundColor: '#F59E0B15' }]}>
              <LogOut size={20} color="#F59E0B" />
            </View>
            <Text style={[styles.menuLabel, { color: c.text }]}>{t('logOut')}</Text>
            <ChevronRight size={20} color={c.textMuted} />
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1 },
  headerTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  content: { flex: 1 },
  inner: { padding: 16, gap: 16 },
  profileCard: { borderRadius: 20, padding: 24, alignItems: 'center', elevation: 2 },
  avatar: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  name: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  email: { fontSize: 14 },
  menuBox: { borderRadius: 20, padding: 8, elevation: 2 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12 },
  menuIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  menuLabel: { flex: 1, fontSize: 16, fontWeight: '500' },
  langBadge: { fontSize: 13, fontWeight: '700', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, overflow: 'hidden' },
});
