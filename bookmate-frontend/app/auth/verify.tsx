import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator,
  Alert, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import BookmateLogo from '../../BookmateLogo';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Copy } from 'lucide-react-native';
import { useStore } from '../../hooks/useStore';
import { useTheme } from '../../hooks/useHelpers';
import { api } from '../../services/api';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const c = useTheme();
  const dark = useStore((s) => s.dark);
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

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 55, friction: 10, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleChange = (val: string, idx: number) => {
    const next = [...code];
    next[idx] = val.replace(/\D/g, '').slice(0, 1);
    setCode(next);
    if (val && idx < 5) refs.current[idx + 1]?.focus();
    if (!val && idx > 0) refs.current[idx - 1]?.focus();
  };

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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    setError('');
    try {
      const { token, user } = await api.verifyEmail(userId, fullCode);
      setAuth(token, user);
      router.replace('/(tabs)');
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
    if (devCode) pasteCode(devCode);
  };

  const BG = dark
    ? (['#060A15', '#0A0F24', '#060A15'] as const)
    : (['#F4F6FF', '#EEF2FF', '#F4F6FF'] as const);
  const GRAD = dark
    ? (['#7C3AED', '#6366F1'] as const)
    : (['#6366F1', '#818CF8'] as const);

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={BG} style={StyleSheet.absoluteFillObject} />
      <View style={[styles.blob1, { backgroundColor: dark ? 'rgba(99,102,241,0.13)' : 'rgba(99,102,241,0.07)' }]} />
      <View style={[styles.blob2, { backgroundColor: dark ? 'rgba(124,58,237,0.09)' : 'rgba(139,92,246,0.05)' }]} />

      <Animated.View style={[styles.inner, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

        <View style={{ marginBottom: 24 }}>
          <BookmateLogo size={88} />
        </View>

        <Text style={[styles.title, { color: c.text }]}>Подтвердите email</Text>
        <Text style={[styles.sub, { color: c.textSecondary }]}>
          Введите 6-значный код отправленный на{'\n'}
          <Text style={{ color: c.primary, fontWeight: '700' }}>{email}</Text>
        </Text>

        {!!devCode && (
          <Pressable
            style={[styles.devBox, {
              backgroundColor: dark ? 'rgba(252,211,77,0.08)' : '#FEF3C7',
              borderColor: dark ? 'rgba(252,211,77,0.25)' : '#F59E0B',
            }]}
            onPress={copyCode}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.devLabel, { color: dark ? '#FCD34D' : '#92400E' }]}>🔧 DEV режим</Text>
              <Text style={[styles.devHint, { color: dark ? '#94A3B8' : '#B45309' }]}>Нажми чтобы вставить код</Text>
            </View>
            <View style={styles.devCodeWrap}>
              <Text style={[styles.devCode, { color: dark ? '#FCD34D' : '#92400E' }]}>{devCode}</Text>
              <Copy size={14} color={dark ? '#FCD34D' : '#92400E'} />
            </View>
          </Pressable>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {/* Code inputs */}
        <View style={styles.codeRow}>
          {code.map((digit, i) => (
            <TextInput
              key={i}
              ref={(r) => { refs.current[i] = r; }}
              style={[styles.codeInput, {
                backgroundColor: dark ? (digit ? 'rgba(129,140,248,0.15)' : 'rgba(255,255,255,0.06)') : (digit ? '#EEF2FF' : '#F8FAFF'),
                borderColor: digit ? c.primary : dark ? 'rgba(255,255,255,0.10)' : '#E2E8F0',
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

        <Pressable
          onPress={handleVerify}
          disabled={loading}
          style={({ pressed }) => ({ width: '100%', marginBottom: 16, opacity: pressed ? 0.82 : 1 })}
        >
          <LinearGradient colors={GRAD} style={styles.btn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
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

        <Pressable onPress={() => router.back()} style={{ marginTop: 14 }}>
          <Text style={[styles.resendText, { color: c.textMuted }]}>← Назад</Text>
        </Pressable>

      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  blob1: { position: 'absolute', width: 340, height: 340, borderRadius: 170, top: -90, right: -90 },
  blob2: { position: 'absolute', width: 300, height: 300, borderRadius: 150, bottom: 60, left: -90 },
  inner: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  title: { fontSize: 26, fontWeight: '800', marginBottom: 12, textAlign: 'center', letterSpacing: -0.5 },
  sub: { fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  devBox: {
    width: '100%', borderRadius: 16, borderWidth: 1, padding: 14,
    marginBottom: 20, flexDirection: 'row', alignItems: 'center',
  },
  devLabel: { fontSize: 12, fontWeight: '700' },
  devHint: { fontSize: 11, marginTop: 2 },
  devCodeWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 12 },
  devCode: { fontSize: 22, fontWeight: '900', letterSpacing: 2 },
  error: { color: '#F87171', marginBottom: 16, fontSize: 14, textAlign: 'center' },
  codeRow: { flexDirection: 'row', gap: 10, marginBottom: 30 },
  codeInput: {
    width: 48, height: 58, borderRadius: 16, borderWidth: 2,
    fontSize: 24, fontWeight: '800',
  },
  btn: { height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  resend: { marginTop: 4 },
  resendText: { fontSize: 14, fontWeight: '600' },
});
