import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Eye, EyeOff, Mail, Lock, User, Phone, Briefcase } from 'lucide-react-native';
import { useTheme, useT } from '../../hooks/useHelpers';
import { api } from '../../services/api';

export default function RegisterScreen() {
  const router = useRouter();
  const c = useTheme(); const t = useT();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [role, setRole] = useState<'user' | 'business_owner'>('user');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password) { setError('Заполните имя, email и пароль'); return; }
    if (password.length < 6) { setError('Пароль минимум 6 символов'); return; }
    setLoading(true); setError('');
    try {
      const res = await api.register(email.trim().toLowerCase(), password, name.trim(), phone || undefined, role);
      router.push({ pathname: '/auth/verify', params: { userId: res.userId, email: res.email, devCode: res.dev_code || '' } } as any);
    } catch (e: any) { setError(e.message || t('registerError')); }
    finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]}>
      <LinearGradient colors={['#EFF6FF', '#DBEAFE', '#F9FAFB']} style={StyleSheet.absoluteFillObject} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.inner}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.logoWrap}>
            <LinearGradient colors={['#2563EB', '#3B82F6']} style={styles.logoCircle}>
              <Text style={{ fontSize: 30 }}>📅</Text>
            </LinearGradient>
            <Text style={[styles.logoText, { color: c.primary }]}>BookMate</Text>
            <Text style={[styles.subtitle, { color: c.textSecondary }]}>Создайте аккаунт</Text>
          </View>

          <View style={[styles.card, { backgroundColor: c.card }]}>
            <Text style={[styles.cardTitle, { color: c.text }]}>{t('register')}</Text>
            {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

            <View style={styles.roleRow}>
              <Pressable style={[styles.roleBtn, { backgroundColor: role === 'user' ? c.primary : c.inputBg, borderColor: role === 'user' ? c.primary : c.border }]} onPress={() => setRole('user')}>
                <User size={16} color={role === 'user' ? '#fff' : c.textSecondary} />
                <Text style={[styles.roleTxt, { color: role === 'user' ? '#fff' : c.textSecondary }]}>Клиент</Text>
              </Pressable>
              <Pressable style={[styles.roleBtn, { backgroundColor: role === 'business_owner' ? c.primary : c.inputBg, borderColor: role === 'business_owner' ? c.primary : c.border }]} onPress={() => setRole('business_owner')}>
                <Briefcase size={16} color={role === 'business_owner' ? '#fff' : c.textSecondary} />
                <Text style={[styles.roleTxt, { color: role === 'business_owner' ? '#fff' : c.textSecondary }]}>Бизнес</Text>
              </Pressable>
            </View>

            <View style={[styles.inputWrap, { backgroundColor: c.inputBg, borderColor: c.border }]}>
              <User size={18} color={c.textMuted} />
              <TextInput style={[styles.input, { color: c.text }]} placeholder={t('name')} placeholderTextColor={c.textMuted} value={name} onChangeText={setName} />
            </View>
            <View style={[styles.inputWrap, { backgroundColor: c.inputBg, borderColor: c.border }]}>
              <Mail size={18} color={c.textMuted} />
              <TextInput style={[styles.input, { color: c.text }]} placeholder={t('email')} placeholderTextColor={c.textMuted} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
            </View>
            <View style={[styles.inputWrap, { backgroundColor: c.inputBg, borderColor: c.border }]}>
              <Phone size={18} color={c.textMuted} />
              <TextInput style={[styles.input, { color: c.text }]} placeholder="Телефон (необязательно)" placeholderTextColor={c.textMuted} keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
            </View>
            <View style={[styles.inputWrap, { backgroundColor: c.inputBg, borderColor: c.border }]}>
              <Lock size={18} color={c.textMuted} />
              <TextInput style={[styles.input, { color: c.text }]} placeholder={t('password')} placeholderTextColor={c.textMuted} secureTextEntry={!showPass} value={password} onChangeText={setPassword} />
              <Pressable onPress={() => setShowPass(!showPass)}>{showPass ? <EyeOff size={18} color={c.textMuted} /> : <Eye size={18} color={c.textMuted} />}</Pressable>
            </View>
            <Pressable onPress={handleRegister} disabled={loading} style={{ marginTop: 8 }}>
              <LinearGradient colors={loading ? ['#93C5FD', '#93C5FD'] : ['#2563EB', '#3B82F6']} style={styles.btn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{t('register')}</Text>}
              </LinearGradient>
            </Pressable>
            <Pressable onPress={() => router.back()} style={styles.link}>
              <Text style={[styles.linkText, { color: c.textSecondary }]}>
                {t('hasAccount')} <Text style={{ color: c.primary, fontWeight: '700' }}>{t('login')}</Text>
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
  logoWrap: { alignItems: 'center', marginBottom: 28 },
  logoCircle: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  logoText: { fontSize: 30, fontWeight: '800' },
  subtitle: { fontSize: 14, marginTop: 4 },
  card: { borderRadius: 24, padding: 24, elevation: 5 },
  cardTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  errorBox: { backgroundColor: '#FEE2E2', borderRadius: 10, padding: 12, marginBottom: 14 },
  errorText: { color: '#991B1B', fontSize: 14, textAlign: 'center' },
  roleRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  roleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12, borderWidth: 1.5, paddingVertical: 12 },
  roleTxt: { fontSize: 14, fontWeight: '600' },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, marginBottom: 12, height: 52, gap: 10 },
  input: { flex: 1, fontSize: 15 },
  btn: { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  link: { marginTop: 18, alignItems: 'center' },
  linkText: { fontSize: 15 },
});
