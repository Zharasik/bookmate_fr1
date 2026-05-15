import { useState, useRef } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator,
  Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Eye, EyeOff, Copy } from 'lucide-react-native';
import { useTheme, useT } from '../../hooks/useHelpers';
import { api } from '../../services/api';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const c = useTheme();
  const t = useT();
  const { email, devCode } = useLocalSearchParams<{ email: string; devCode?: string }>();

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [passErr, setPassErr] = useState('');
  const refs = useRef<(TextInput | null)[]>([]);

  const handleChange = (val: string, idx: number) => {
    const next = [...code];
    next[idx] = val.replace(/\D/g, '').slice(0, 1);
    setCode(next);
    if (val && idx < 5) refs.current[idx + 1]?.focus();
    if (!val && idx > 0) refs.current[idx - 1]?.focus();
  };

  const pasteCode = (fullCode: string) => {
    const digits = fullCode.replace(/\D/g, '').slice(0, 6).split('');
    if (digits.length === 6) { setCode(digits); refs.current[5]?.focus(); }
  };

  const copyDevCode = () => {
    if (devCode) { Clipboard.setStringAsync(devCode); pasteCode(devCode); }
  };

  const validatePassword = (v: string) => {
    if (!v) return t('errPassRequired');
    if (v.length < 8) return t('errPassShort');
    if (!/[A-Z]/.test(v)) return t('errPassUpper');
    if (!/[a-z]/.test(v)) return t('errPassLower');
    if (!/\d/.test(v)) return t('errPassDigit');
    return '';
  };

  const handleReset = async () => {
    const fullCode = code.join('');
    if (fullCode.length < 6) { setError(t('errCodeIncomplete')); return; }
    const pErr = validatePassword(password);
    if (pErr) { setPassErr(pErr); return; }
    setError(''); setPassErr('');
    setLoading(true);
    try {
      await api.resetPassword(email, fullCode, password);
      Alert.alert('✓', t('savePassword'), [
        { text: t('login'), onPress: () => router.replace('/auth/login' as any) },
      ]);
    } catch (e: any) {
      setError(e.message || t('error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]}>
      <LinearGradient colors={['#EFF6FF', '#DBEAFE', '#F9FAFB']} style={StyleSheet.absoluteFillObject} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.kav}>
        <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          <LinearGradient colors={['#2563EB', '#3B82F6']} style={styles.iconCircle}>
            <Text style={{ fontSize: 34 }}>🔒</Text>
          </LinearGradient>

          <Text style={[styles.title, { color: c.text }]}>{t('resetTitle')}</Text>
          <Text style={[styles.sub, { color: c.textSecondary }]}>
            {t('resetSub')}{'\n'}
            <Text style={{ color: c.primary, fontWeight: '700' }}>{email}</Text>
          </Text>

          {!!devCode && (
            <Pressable style={styles.devBox} onPress={copyDevCode}>
              <View style={styles.devLeft}>
                <Text style={styles.devLabel}>🔧 {t('devMode')}</Text>
                <Text style={styles.devHint}>{t('devHint')}</Text>
              </View>
              <View style={styles.devCodeWrap}>
                <Text style={styles.devCode}>{devCode}</Text>
                <Copy size={14} color="#92400E" style={{ marginTop: 2 }} />
              </View>
            </Pressable>
          )}

          {!!error && <Text style={styles.error}>{error}</Text>}

          <View style={styles.codeRow}>
            {code.map((digit, i) => (
              <TextInput
                key={i}
                ref={(r) => { refs.current[i] = r; }}
                style={[styles.codeInput, {
                  backgroundColor: c.card,
                  borderColor: digit ? c.primary : c.border,
                  color: c.text,
                }]}
                value={digit}
                onChangeText={(v) => handleChange(v, i)}
                keyboardType="number-pad"
                maxLength={1}
                textAlign="center"
              />
            ))}
          </View>

          <View style={[styles.inputWrap, { backgroundColor: c.card, borderColor: passErr ? '#EF4444' : c.border }]}>
            <TextInput
              style={[styles.input, { color: c.text }]}
              placeholder={t('newPassword')}
              placeholderTextColor={c.textMuted}
              secureTextEntry={!showPass}
              value={password}
              onChangeText={(v) => { setPassword(v); setPassErr(''); }}
            />
            <Pressable onPress={() => setShowPass(!showPass)}>
              {showPass ? <EyeOff size={18} color={c.textMuted} /> : <Eye size={18} color={c.textMuted} />}
            </Pressable>
          </View>
          {!!passErr
            ? <Text style={styles.fieldErr}>{passErr}</Text>
            : <Text style={[styles.passHint, { color: c.textMuted }]}>{t('passHint')}</Text>
          }

          <Pressable onPress={handleReset} disabled={loading} style={{ width: '100%', marginTop: 8 }}>
            <LinearGradient
              colors={loading ? ['#93C5FD', '#93C5FD'] : ['#2563EB', '#3B82F6']}
              style={styles.btn}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>{t('savePassword')}</Text>}
            </LinearGradient>
          </Pressable>

          <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}>
            <Text style={[styles.back, { color: c.textMuted }]}>{t('back')}</Text>
          </Pressable>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  kav: { flex: 1 },
  inner: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingVertical: 40 },
  iconCircle: { width: 76, height: 76, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 10, textAlign: 'center' },
  sub: { fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  devBox: {
    width: '100%', backgroundColor: '#FEF3C7', borderRadius: 14,
    borderWidth: 1, borderColor: '#F59E0B', padding: 14, marginBottom: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  devLeft: { flex: 1 },
  devLabel: { color: '#92400E', fontSize: 12, fontWeight: '700' },
  devHint: { color: '#B45309', fontSize: 11, marginTop: 2 },
  devCodeWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 12 },
  devCode: { color: '#92400E', fontSize: 22, fontWeight: '900', letterSpacing: 2 },
  error: { color: '#EF4444', marginBottom: 16, fontSize: 14, textAlign: 'center' },
  codeRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  codeInput: { width: 46, height: 54, borderRadius: 14, borderWidth: 2, fontSize: 22, fontWeight: '700' },
  inputWrap: { width: '100%', flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, height: 54, gap: 10, marginBottom: 4 },
  input: { flex: 1, fontSize: 16 },
  fieldErr: { color: '#EF4444', fontSize: 12, alignSelf: 'flex-start', marginBottom: 4 },
  passHint: { fontSize: 11, alignSelf: 'flex-start', marginBottom: 8 },
  btn: { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  back: { fontSize: 14, fontWeight: '600' },
});
