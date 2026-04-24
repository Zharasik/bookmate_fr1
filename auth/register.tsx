import { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useStore } from '../../hooks/useStore';
import { useTheme, useT } from '../../hooks/useHelpers';
import { api } from '../../services/api';

export default function RegisterScreen() {
  const router = useRouter();
  const c = useTheme();
  const t = useT();
  const setAuth = useStore((s) => s.setAuth);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    if (!email || !password) return;
    setLoading(true);
    setError('');
    try {
      const { token, user } = await api.register(email, password, name);
      setAuth(token, user);
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(e.message || t('registerError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.inner}>
        <View style={styles.logoWrap}>
          <Text style={[styles.logo, { color: c.primary }]}>BookMate</Text>
          <Text style={[styles.subtitle, { color: c.textSecondary }]}>
            Создайте аккаунт
          </Text>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TextInput
          style={[styles.input, { backgroundColor: c.inputBg, color: c.text, borderColor: c.border }]}
          placeholder={t('name')}
          placeholderTextColor={c.textMuted}
          value={name}
          onChangeText={setName}
        />

        <TextInput
          style={[styles.input, { backgroundColor: c.inputBg, color: c.text, borderColor: c.border }]}
          placeholder={t('email')}
          placeholderTextColor={c.textMuted}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          style={[styles.input, { backgroundColor: c.inputBg, color: c.text, borderColor: c.border }]}
          placeholder={t('password')}
          placeholderTextColor={c.textMuted}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <Pressable
          style={[styles.btn, { backgroundColor: c.primary, opacity: loading ? 0.7 : 1 }]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{t('register')}</Text>}
        </Pressable>

        <Pressable onPress={() => router.back()} style={styles.link}>
          <Text style={[styles.linkText, { color: c.textSecondary }]}>
            {t('hasAccount')} <Text style={{ color: c.primary }}>{t('login')}</Text>
          </Text>
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  logoWrap: { alignItems: 'center', marginBottom: 40 },
  logo: { fontSize: 36, fontWeight: '800' },
  subtitle: { fontSize: 15, marginTop: 6 },
  error: { color: '#EF4444', textAlign: 'center', marginBottom: 12, fontSize: 14 },
  input: {
    height: 52, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16,
    fontSize: 16, marginBottom: 14,
  },
  btn: { height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  link: { marginTop: 20, alignItems: 'center' },
  linkText: { fontSize: 15 },
});
