import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react-native';
import { useStore } from '../../hooks/useStore';
import { useTheme, useT } from '../../hooks/useHelpers';
import { api } from '../../services/api';
import { useWindowDimensions } from 'react-native';
import { Moon, Sun, Globe } from 'lucide-react-native';
import { Alert } from 'react-native';

export default function LoginScreen() {
  const isDark = useStore(s => s.dark);
  const toggleTheme = useStore(s => s.toggleTheme);
  const lang = useStore(s => s.lang);
  const setLang = useStore(s => s.setLang);
  const router = useRouter();
  const c = useTheme(); const t = useT();
  const setAuth = useStore((s) => s.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const handleLogin = async () => {
    if (!email.trim() || !password) return;
    setLoading(true); setError('');
    try {
      const { token, user } = await api.login(email.trim().toLowerCase(), password);
      setAuth(token, user);
      router.replace('/(tabs)');
    } catch (e: any) {
  if (e.message?.includes('не подтверждён')) {
    router.push({ pathname: '/auth/verify', params: { userId: '', email: email.trim() } } as any);
  } else if (e.message?.includes('Неверный email или пароль')) {
    Alert.alert(t('error'), t('wrongCredentials'));
  } else {
    Alert.alert(t('error'), e.message || t('loginError'));
  }
}
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.inner}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.logoWrap}>
            <LinearGradient colors={['#2563EB', '#3B82F6']} style={styles.logoCircle}>
              <Text style={{ fontSize: 36 }}>📅</Text>
            </LinearGradient>
            <Text style={[styles.logoText, { color: c.primary }]}>BookMate</Text>
            <Text style={[styles.subtitle, { color: c.textSecondary }]}>{t('appSubtitle')}</Text>
          </View>

          <View style={[styles.card, { backgroundColor: c.card }]}>
            <Text style={[styles.cardTitle, { color: c.text }]}>{t('login')}</Text>
            {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}
            <View style={[styles.inputWrap, { backgroundColor: c.inputBg, borderColor: c.border }]}>
              <Mail size={18} color={c.textMuted} />
              <TextInput style={[styles.input, { color: c.text }]} placeholder={t('email')} placeholderTextColor={c.textMuted} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
            </View>
            <View style={[styles.inputWrap, { backgroundColor: c.inputBg, borderColor: c.border }]}>
              <Lock size={18} color={c.textMuted} />
              <TextInput style={[styles.input, { color: c.text }]} placeholder={t('password')} placeholderTextColor={c.textMuted} secureTextEntry={!showPass} value={password} onChangeText={setPassword} />
              <Pressable onPress={() => setShowPass(!showPass)}>{showPass ? <EyeOff size={18} color={c.textMuted} /> : <Eye size={18} color={c.textMuted} />}</Pressable>
            </View>
            <Pressable onPress={() => router.push('/auth/forgot-password' as any)} style={styles.forgotWrap}>
              <Text style={[styles.forgotText, { color: c.primary }]}>{t('forgotPassword')}</Text>
            </Pressable>

            <Pressable onPress={handleLogin} disabled={loading} style={{ marginTop: 4 }}>
              <LinearGradient colors={loading ? ['#93C5FD', '#93C5FD'] : ['#2563EB', '#3B82F6']} style={styles.btn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{t('login')}</Text>}
              </LinearGradient>
            </Pressable>
            <Pressable onPress={() => router.push('/auth/register' as any)} style={styles.link}>
              <Text style={[styles.linkText, { color: c.textSecondary }]}>
                {t('noAccount')} <Text style={{ color: c.primary, fontWeight: '700' }}>{t('register')}</Text>
              </Text>
            </Pressable>
          </View>

          <View style={[styles.demoBox, { backgroundColor: `${c.primary}12`, borderColor: `${c.primary}30` }]}>
            <Text style={[styles.demoTitle, { color: c.primary }]}>{t('demoAccounts')}</Text>
            <Text style={[styles.demoText, { color: c.textSecondary }]}>Клиент: user@demo.kz / demo123</Text>
            <Text style={[styles.demoText, { color: c.textSecondary }]}>Бизнес: owner@bookmate.kz / Business123!</Text>
          </View>

          <View style={styles.settingsRow}>
  <Pressable
    style={[styles.settingsBtn, { backgroundColor: c.card, borderColor: c.border }]}
    onPress={toggleTheme}
  >
    {isDark
      ? <Sun size={16} color={c.primary} />
      : <Moon size={16} color={c.primary} />}
    <Text style={[styles.settingsBtnText, { color: c.text }]}>
      {isDark ? t('lightTheme') : t('darkTheme')}
    </Text>
  </Pressable>

  <Pressable
    style={[styles.settingsBtn, { backgroundColor: c.card, borderColor: c.border }]}
    onPress={() => setLang(lang === 'ru' ? 'kk' : 'ru')}
  >
    <Globe size={16} color={c.primary} />
    <Text style={[styles.settingsBtnText, { color: c.text }]}>
      {lang === 'ru' ? 'Қазақша' : 'Русский'}
    </Text>
  </Pressable>
</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 },
  logoWrap: { alignItems: 'center', marginBottom: 36 },
  logoCircle: { width: 72, height: 72, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  logoText: { fontSize: 34, fontWeight: '800' },
  subtitle: { fontSize: 15, marginTop: 6 },
  card: { borderRadius: 24, padding: 28, elevation: 5 },
  cardTitle: { fontSize: 22, fontWeight: '700', marginBottom: 20 },
  errorBox: { backgroundColor: '#FEE2E2', borderRadius: 10, padding: 12, marginBottom: 16 },
  errorText: { color: '#991B1B', fontSize: 14, textAlign: 'center' },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, marginBottom: 14, height: 54, gap: 10 },
  input: { flex: 1, fontSize: 16 },
  btn: { height: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  forgotWrap: { alignSelf: 'flex-end', marginTop: 8, marginBottom: 4 },
  forgotText: { fontSize: 13, fontWeight: '600' },
  link: { marginTop: 20, alignItems: 'center' },
  linkText: { fontSize: 15 },
  demoBox: { marginTop: 24, borderRadius: 14, padding: 16, borderWidth: 1 },
  demoTitle: { fontSize: 13, fontWeight: '700', marginBottom: 6 },
  demoText: { fontSize: 12, lineHeight: 20 },
  settingsRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
settingsBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderRadius: 12, paddingVertical: 10 },
settingsBtnText: { fontSize: 13, fontWeight: '600' },
});
