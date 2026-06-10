import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Eye, EyeOff, Mail, Lock, User, Phone } from 'lucide-react-native';
import { useTheme, useT } from '../../hooks/useHelpers';
import { api } from '../../services/api';
import { formatPhone } from '../../constants/phoneUtils';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+7 \d{3} \d{3} \d{2} \d{2}$/;

function validateName(v: string, t: (k: string) => string) {
  if (!v.trim()) return t('errNameRequired');
  if (v.trim().length < 2) return t('errNameShort');
  if (/\d/.test(v)) return t('errNameDigits');
  return '';
}

function validateEmail(v: string, t: (k: string) => string) {
  if (!v.trim()) return t('errEmailRequired');
  if (!EMAIL_RE.test(v.trim())) return t('errEmailInvalid');
  return '';
}

function validatePhone(v: string, t: (k: string) => string) {
  if (!v) return '';
  if (!PHONE_RE.test(v)) return t('errPhoneFormat');
  return '';
}

function validatePassword(v: string, t: (k: string) => string) {
  if (!v) return t('errPassRequired');
  if (v.length < 8) return t('errPassShort');
  if (!/[A-Z]/.test(v)) return t('errPassUpper');
  if (!/[a-z]/.test(v)) return t('errPassLower');
  if (!/\d/.test(v)) return t('errPassDigit');
  return '';
}

export default function RegisterScreen() {
  const router = useRouter();
  const c = useTheme();
  const t = useT();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({ name: false, email: false, phone: false, password: false });
  const [serverError, setServerError] = useState('');

  const nameErr = touched.name ? validateName(name, t) : '';
  const emailErr = touched.email ? validateEmail(email, t) : '';
  const phoneErr = touched.phone ? validatePhone(phone, t) : '';
  const passErr = touched.password ? validatePassword(password, t) : '';

  const touch = (field: keyof typeof touched) =>
    setTouched(prev => ({ ...prev, [field]: true }));

  const handleRegister = async () => {
    setTouched({ name: true, email: true, phone: true, password: true });
    const e1 = validateName(name, t);
    const e2 = validateEmail(email, t);
    const e3 = validatePhone(phone, t);
    const e4 = validatePassword(password, t);
    if (e1 || e2 || e3 || e4) return;

    setLoading(true);
    setServerError('');
    try {
      const res = await api.register(email.trim().toLowerCase(), password, name.trim(), phone || undefined, 'user');
      router.push({ pathname: '/auth/verify', params: { userId: res.userId, email: res.email, devCode: res.dev_code || '' } } as any);
    } catch (e: any) {
  const msg = e.message || '';
  if (msg.includes('уже существует')) {
    setServerError(t('errEmailExists'));
  } else {
    setServerError(msg || t('registerError'));
  }
} finally {
      setLoading(false);
    }
  };

  const inputBorder = (err: string, isTouched: boolean) => ({
    borderColor: err ? '#EF4444' : isTouched && !err ? '#22C55E' : c.border,
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.inner}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.logoWrap}>
            <LinearGradient colors={['#2563EB', '#3B82F6']} style={styles.logoCircle}>
              <Text style={{ fontSize: 30 }}>📅</Text>
            </LinearGradient>
            <Text style={[styles.logoText, { color: c.primary }]}>BookMate</Text>
            <Text style={[styles.subtitle, { color: c.textSecondary }]}>{t('createAccount')}</Text>
          </View>

          <View style={[styles.card, { backgroundColor: c.card }]}>
            <Text style={[styles.cardTitle, { color: c.text }]}>{t('register')}</Text>

            {!!serverError && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{serverError}</Text>
              </View>
            )}

            <View style={[styles.inputWrap, { backgroundColor: c.inputBg }, inputBorder(nameErr, touched.name)]}>
              <User size={18} color={c.textMuted} />
              <TextInput
                style={[styles.input, { color: c.text }]}
                placeholder={t('name')}
                placeholderTextColor={c.textMuted}
                value={name}
                onChangeText={setName}
                onBlur={() => touch('name')}
              />
            </View>
            {!!nameErr && <Text style={styles.fieldErr}>{nameErr}</Text>}

            <View style={[styles.inputWrap, { backgroundColor: c.inputBg }, inputBorder(emailErr, touched.email)]}>
              <Mail size={18} color={c.textMuted} />
              <TextInput
                style={[styles.input, { color: c.text }]}
                placeholder={t('email')}
                placeholderTextColor={c.textMuted}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                onBlur={() => touch('email')}
              />
            </View>
            {!!emailErr && <Text style={styles.fieldErr}>{emailErr}</Text>}

            <View style={[styles.inputWrap, { backgroundColor: c.inputBg }, inputBorder(phoneErr, touched.phone)]}>
              <Phone size={18} color={c.textMuted} />
              <TextInput
                style={[styles.input, { color: c.text }]}
                placeholder="+7 777 777 77 77"
                placeholderTextColor={c.textMuted}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={(v) => setPhone(formatPhone(v))}
                onBlur={() => touch('phone')}
                maxLength={16}
              />
            </View>
            {!!phoneErr && <Text style={styles.fieldErr}>{phoneErr}</Text>}

            <View style={[styles.inputWrap, { backgroundColor: c.inputBg }, inputBorder(passErr, touched.password)]}>
              <Lock size={18} color={c.textMuted} />
              <TextInput
                style={[styles.input, { color: c.text }]}
                placeholder={t('password')}
                placeholderTextColor={c.textMuted}
                secureTextEntry={!showPass}
                value={password}
                onChangeText={setPassword}
                onBlur={() => touch('password')}
              />
              <Pressable onPress={() => setShowPass(!showPass)}>
                {showPass ? <EyeOff size={18} color={c.textMuted} /> : <Eye size={18} color={c.textMuted} />}
              </Pressable>
            </View>
            {!!passErr && <Text style={styles.fieldErr}>{passErr}</Text>}
            {!passErr && touched.password && password.length > 0 && (
              <Text style={styles.passHint}>{t('passHint')}</Text>
            )}

            <Pressable onPress={handleRegister} disabled={loading} style={{ marginTop: 12 }}>
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
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, height: 52, gap: 10, marginBottom: 12 },
  input: { flex: 1, fontSize: 15 },
  fieldErr: { color: '#EF4444', fontSize: 12, marginTop: 4, marginBottom: 8, marginLeft: 4 },
  passHint: { color: '#6B7280', fontSize: 11, marginTop: 4, marginBottom: 8, marginLeft: 4 },
  btn: { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  link: { marginTop: 18, alignItems: 'center' },
  linkText: { fontSize: 15 },
});