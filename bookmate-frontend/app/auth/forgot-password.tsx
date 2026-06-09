import { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Mail } from 'lucide-react-native';
import { useTheme, useT } from '../../hooks/useHelpers';
import { api } from '../../services/api';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const c = useTheme();
  const t = useT();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSend = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) { setError(t('errEmailRequired')); return; }
    if (!EMAIL_RE.test(trimmed)) { setError(t('errEmailInvalid')); return; }

    setLoading(true);
    setError('');
    try {
      const res = await api.forgotPassword(trimmed);
      router.push({
        pathname: '/auth/reset-password',
        params: { email: trimmed, devCode: res.dev_code || '' },
      } as any);
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
            <Text style={{ fontSize: 34 }}>🔑</Text>
          </LinearGradient>

          <Text style={[styles.title, { color: c.text }]}>{t('forgotTitle')}</Text>
          <Text style={[styles.sub, { color: c.textSecondary }]}>{t('forgotSub')}</Text>

          {!!error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={[styles.inputWrap, { backgroundColor: c.card, borderColor: c.border }]}>
            <Mail size={18} color={c.textMuted} />
            <TextInput
              style={[styles.input, { color: c.text }]}
              placeholder={t('email')}
              placeholderTextColor={c.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <Pressable onPress={handleSend} disabled={loading} style={{ width: '100%', marginBottom: 16 }}>
            <LinearGradient
              colors={loading ? ['#93C5FD', '#93C5FD'] : ['#2563EB', '#3B82F6']}
              style={styles.btn}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>{t('sendCode')}</Text>}
            </LinearGradient>
          </Pressable>

          <Pressable onPress={() => router.back()}>
            <Text style={[styles.back, { color: c.textMuted }]}>{t('backToLogin')}</Text>
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
  sub: { fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  errorBox: { width: '100%', backgroundColor: '#FEE2E2', borderRadius: 10, padding: 12, marginBottom: 16 },
  errorText: { color: '#991B1B', fontSize: 14, textAlign: 'center' },
  inputWrap: { width: '100%', flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, height: 54, gap: 10, marginBottom: 20 },
  input: { flex: 1, fontSize: 16 },
  btn: { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  back: { fontSize: 14, fontWeight: '600', marginTop: 4 },
});
