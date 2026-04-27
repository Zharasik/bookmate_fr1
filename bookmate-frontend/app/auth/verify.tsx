import { useState, useRef } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator,
  Alert, Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Copy } from 'lucide-react-native';
import { useStore } from '../../hooks/useStore';
import { useTheme } from '../../hooks/useHelpers';
import { api } from '../../services/api';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const c = useTheme();
  const { userId, email, devCode } = useLocalSearchParams<{
    userId: string;
    email: string;
    devCode?: string;
  }>();
  const setAuth = useStore((s: any) => s.setAuth);

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const refs = useRef<(TextInput | null)[]>([]);

  const handleChange = (val: string, idx: number) => {
    const next = [...code];
    next[idx] = val.replace(/\D/g, '').slice(0, 1);
    setCode(next);
    if (val && idx < 5) refs.current[idx + 1]?.focus();
    if (!val && idx > 0) refs.current[idx - 1]?.focus();
  };

  // Вставить код автоматически (если скопировали)
  const pasteCode = (fullCode: string) => {
    const digits = fullCode.replace(/\D/g, '').slice(0, 6).split('');
    if (digits.length === 6) {
      setCode(digits);
      refs.current[5]?.focus();
    }
  };

  const handleVerify = async () => {
    const fullCode = code.join('');
    if (fullCode.length < 6) { setError('Введите все 6 цифр'); return; }
    setLoading(true);
    setError('');
    try {
      const { token, user } = await api.verifyEmail(userId, fullCode);
      setAuth(token, user);
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(e.message || 'Неверный код');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      const res = await api.resendVerification(userId);
      if (res.dev_code) {
        pasteCode(res.dev_code);
        Alert.alert('Код получен', `Email не отправился. Используйте код: ${res.dev_code}`);
      } else {
        Alert.alert('Отправлено', 'Новый код отправлен');
      }
    } catch (e: any) {
      Alert.alert('Ошибка', e.message);
    } finally {
      setResending(false);
    }
  };

  const copyCode = () => {
    if (devCode) {
      Clipboard.setString(devCode);
      pasteCode(devCode);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]}>
      <LinearGradient
        colors={['#EFF6FF', '#DBEAFE', '#F9FAFB']}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.inner}>

        <LinearGradient colors={['#2563EB', '#3B82F6']} style={styles.iconCircle}>
          <Text style={{ fontSize: 34 }}>✉️</Text>
        </LinearGradient>

        <Text style={[styles.title, { color: c.text }]}>Подтвердите email</Text>
        <Text style={[styles.sub, { color: c.textSecondary }]}>
          Введите 6-значный код отправленный на{'\n'}
          <Text style={{ color: c.primary, fontWeight: '700' }}>{email}</Text>
        </Text>

        {/* DEV блок — показывается только если SMTP не настроен */}
        {!!devCode && (
          <Pressable
            style={styles.devBox}
            onPress={copyCode}
          >
            <View style={styles.devLeft}>
              <Text style={styles.devLabel}>🔧 DEV режим — SMTP не настроен</Text>
              <Text style={styles.devHint}>Нажми чтобы вставить код автоматически</Text>
            </View>
            <View style={styles.devCodeWrap}>
              <Text style={styles.devCode}>{devCode}</Text>
              <Copy size={14} color="#92400E" style={{ marginTop: 2 }} />
            </View>
          </Pressable>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {/* Поля ввода кода */}
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

        <Pressable onPress={handleVerify} disabled={loading} style={{ width: '100%', marginBottom: 16 }}>
          <LinearGradient
            colors={loading ? ['#93C5FD', '#93C5FD'] : ['#2563EB', '#3B82F6']}
            style={styles.btn}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Подтвердить</Text>}
          </LinearGradient>
        </Pressable>

        <Pressable onPress={handleResend} disabled={resending} style={styles.resend}>
          {resending
            ? <ActivityIndicator color={c.primary} size="small" />
            : <Text style={[styles.resendText, { color: c.primary }]}>Отправить повторно</Text>}
        </Pressable>

        <Pressable onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={[styles.resendText, { color: c.textMuted }]}>Назад</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  iconCircle: { width: 76, height: 76, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 10, textAlign: 'center' },
  sub: { fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  devBox: {
    width: '100%', backgroundColor: '#FEF3C7', borderRadius: 14,
    borderWidth: 1, borderColor: '#F59E0B',
    padding: 14, marginBottom: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  devLeft: { flex: 1 },
  devLabel: { color: '#92400E', fontSize: 12, fontWeight: '700' },
  devHint: { color: '#B45309', fontSize: 11, marginTop: 2 },
  devCodeWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 12 },
  devCode: { color: '#92400E', fontSize: 22, fontWeight: '900', letterSpacing: 2 },
  error: { color: '#EF4444', marginBottom: 16, fontSize: 14, textAlign: 'center' },
  codeRow: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  codeInput: { width: 46, height: 54, borderRadius: 14, borderWidth: 2, fontSize: 22, fontWeight: '700' },
  btn: { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  resend: { marginTop: 4 },
  resendText: { fontSize: 14, fontWeight: '600' },
});
