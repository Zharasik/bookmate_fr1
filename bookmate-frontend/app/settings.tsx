import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Switch, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Moon, Globe, Lock, User, Phone } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useStore } from '../hooks/useStore';
import { useTheme, useT } from '../hooks/useHelpers';
import { api } from '../services/api';

export default function SettingsScreen() {
  const router = useRouter();
  const c = useTheme();
  const t = useT();
  const user = useStore((s) => s.user);
  const dark = useStore((s) => s.dark);
  const lang = useStore((s) => s.lang);
  const toggleTheme = useStore((s) => s.toggleTheme);
  const setLang = useStore((s) => s.setLang);
  const updateUser = useStore((s) => s.updateUser);

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [savingPass, setSavingPass] = useState(false);

  const handleSaveProfile = async () => {
    if (!name.trim()) { Alert.alert('Ошибка', 'Имя не может быть пустым'); return; }
    setSavingProfile(true);
    try {
      const updated = await api.updateProfile({ name: name.trim(), phone: phone.trim() || undefined });
      updateUser(updated);
      Alert.alert('Сохранено ✓');
    } catch (e: any) {
      Alert.alert(t('error'), e.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPass || !newPass) { Alert.alert('Ошибка', 'Заполните оба поля'); return; }
    if (newPass.length < 6) { Alert.alert('Ошибка', 'Новый пароль минимум 6 символов'); return; }
    setSavingPass(true);
    try {
      await api.changePassword(currentPass, newPass);
      setCurrentPass(''); setNewPass('');
      Alert.alert('Пароль изменён ✓');
    } catch (e: any) {
      Alert.alert(t('error'), e.message);
    } finally {
      setSavingPass(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: c.card, borderBottomColor: c.border }]}>
        <Pressable style={styles.back} onPress={() => router.back()}>
          <ChevronLeft size={24} color={c.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: c.text }]}>{t('settings')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>

        {/* Appearance */}
        <View style={[styles.section, { backgroundColor: c.card }]}>
          <Text style={[styles.label, { color: c.textMuted }]}>ВНЕШНИЙ ВИД</Text>

          <View style={styles.row}>
            <View style={[styles.icon, { backgroundColor: `${c.textSecondary}20` }]}>
              <Moon size={18} color={c.textSecondary} />
            </View>
            <Text style={[styles.rowLabel, { color: c.text }]}>{t('darkTheme')}</Text>
            <Switch
              value={dark}
              onValueChange={toggleTheme}
              trackColor={{ true: c.primary, false: c.border }}
            />
          </View>

          <Pressable style={styles.row} onPress={() => setLang(lang === 'ru' ? 'kk' : 'ru')}>
            <View style={[styles.icon, { backgroundColor: '#10B98120' }]}>
              <Globe size={18} color="#10B981" />
            </View>
            <Text style={[styles.rowLabel, { color: c.text }]}>{t('language')}</Text>
            <View style={[styles.langBadge, { backgroundColor: c.primaryLight }]}>
              <Text style={{ color: c.primary, fontWeight: '800', fontSize: 13 }}>
                {lang === 'ru' ? 'RU → KK' : 'KK → RU'}
              </Text>
            </View>
          </Pressable>
        </View>

        {/* Profile edit */}
        <View style={[styles.section, { backgroundColor: c.card }]}>
          <Text style={[styles.label, { color: c.textMuted }]}>ПРОФИЛЬ</Text>

          <View style={[styles.field, { borderColor: c.border, backgroundColor: c.inputBg }]}>
            <User size={16} color={c.textMuted} />
            <TextInput
              style={[styles.fieldInput, { color: c.text }]}
              value={name}
              onChangeText={setName}
              placeholder="Имя"
              placeholderTextColor={c.textMuted}
            />
          </View>

          <View style={[styles.field, { borderColor: c.border, backgroundColor: c.inputBg }]}>
            <Phone size={16} color={c.textMuted} />
            <TextInput
              style={[styles.fieldInput, { color: c.text }]}
              value={phone}
              onChangeText={setPhone}
              placeholder="Телефон"
              placeholderTextColor={c.textMuted}
              keyboardType="phone-pad"
            />
          </View>

          <Pressable
            style={[styles.btn, { backgroundColor: savingProfile ? '#93C5FD' : c.primary }]}
            onPress={handleSaveProfile}
            disabled={savingProfile}
          >
            {savingProfile
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>{t('save')}</Text>}
          </Pressable>
        </View>

        {/* Change password */}
        <View style={[styles.section, { backgroundColor: c.card }]}>
          <Text style={[styles.label, { color: c.textMuted }]}>БЕЗОПАСНОСТЬ</Text>

          <View style={[styles.field, { borderColor: c.border, backgroundColor: c.inputBg }]}>
            <Lock size={16} color={c.textMuted} />
            <TextInput
              style={[styles.fieldInput, { color: c.text }]}
              value={currentPass}
              onChangeText={setCurrentPass}
              placeholder="Текущий пароль"
              placeholderTextColor={c.textMuted}
              secureTextEntry
            />
          </View>

          <View style={[styles.field, { borderColor: c.border, backgroundColor: c.inputBg }]}>
            <Lock size={16} color={c.textMuted} />
            <TextInput
              style={[styles.fieldInput, { color: c.text }]}
              value={newPass}
              onChangeText={setNewPass}
              placeholder="Новый пароль (мин. 6 символов)"
              placeholderTextColor={c.textMuted}
              secureTextEntry
            />
          </View>

          <Pressable
            style={[styles.btn, { backgroundColor: savingPass ? '#93C5FD' : c.primary }]}
            onPress={handleChangePassword}
            disabled={savingPass}
          >
            {savingPass
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Изменить пароль</Text>}
          </Pressable>
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
  inner: { padding: 16, gap: 14, paddingBottom: 40 },
  section: { borderRadius: 18, padding: 16, elevation: 2, gap: 4 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  icon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: '500' },
  langBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  field: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 12, height: 48, gap: 10, marginBottom: 10 },
  fieldInput: { flex: 1, fontSize: 15 },
  btn: { height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
