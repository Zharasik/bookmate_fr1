import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import BookmateLogo from '../../BookmateLogo';
import { useRouter } from 'expo-router';
import { Eye, EyeOff, Mail, Lock, User, Phone, Briefcase, ArrowRight } from 'lucide-react-native';
import { useStore } from '../../hooks/useStore';
import { useTheme, useT } from '../../hooks/useHelpers';
import { api } from '../../services/api';

export default function RegisterScreen() {
  const router = useRouter();
  const c = useTheme();
  const t = useT();
  const dark = useStore((s) => s.dark);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [role, setRole] = useState<'user' | 'business_owner'>('user');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focused, setFocused] = useState<string | null>(null);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(44)).current;
  const hoverScale = useRef(new Animated.Value(1)).current;
  const hoverY     = useRef(new Animated.Value(0)).current;
  const glowOp     = useRef(new Animated.Value(0)).current;
  const shineX     = useRef(new Animated.Value(-160)).current;
  const shineOp    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 55, friction: 10, useNativeDriver: true }),
    ]).start();
  }, []);

  const onCardHoverIn = () => {
    Animated.parallel([
      Animated.spring(hoverScale, { toValue: 1.022, tension: 130, friction: 7, useNativeDriver: true }),
      Animated.spring(hoverY,     { toValue: -4,    tension: 130, friction: 7, useNativeDriver: true }),
      Animated.timing(glowOp,     { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    shineX.setValue(-160);
    Animated.sequence([
      Animated.timing(shineOp, { toValue: 1, duration: 50,  useNativeDriver: true }),
      Animated.timing(shineX,  { toValue: 480, duration: 560, useNativeDriver: true }),
      Animated.timing(shineOp, { toValue: 0, duration: 80,  useNativeDriver: true }),
    ]).start();
  };

  const onCardHoverOut = () => {
    Animated.parallel([
      Animated.spring(hoverScale, { toValue: 1, tension: 130, friction: 7, useNativeDriver: true }),
      Animated.spring(hoverY,     { toValue: 0, tension: 130, friction: 7, useNativeDriver: true }),
      Animated.timing(glowOp,     { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();
  };

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password) {
      setError('Заполните имя, email и пароль');
      return;
    }
    if (password.length < 6) { setError('Пароль минимум 6 символов'); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    setError('');
    try {
      const res = await api.register(email.trim().toLowerCase(), password, name.trim(), phone || undefined, role);
      router.push({ pathname: '/auth/verify', params: { userId: res.userId, email: res.email, devCode: res.dev_code || '' } } as any);
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(e.message || t('registerError'));
    } finally {
      setLoading(false);
    }
  };

  const BG = dark
    ? (['#060A15', '#0A0F24', '#060A15'] as const)
    : (['#F4F6FF', '#EEF2FF', '#F4F6FF'] as const);
  const GRAD = dark
    ? (['#7C3AED', '#6366F1'] as const)
    : (['#6366F1', '#818CF8'] as const);

  const inputStyle = (field: string) => ({
    backgroundColor: dark ? 'rgba(255,255,255,0.06)' : '#F8FAFF',
    borderColor: focused === field ? c.primary : dark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
  });

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={BG} style={StyleSheet.absoluteFillObject} />
      <View style={[styles.blob1, { backgroundColor: dark ? 'rgba(99,102,241,0.13)' : 'rgba(99,102,241,0.07)' }]} />
      <View style={[styles.blob2, { backgroundColor: dark ? 'rgba(124,58,237,0.09)' : 'rgba(139,92,246,0.05)' }]} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

            {/* Logo */}
            <View style={styles.logoWrap}>
              <View style={{ marginBottom: 18 }}>
                <BookmateLogo size={88} />
              </View>
              <Text style={[styles.logoText, { color: c.text }]}>BookMate</Text>
              <Text style={[styles.logoSub, { color: c.textSecondary }]}>Создайте аккаунт</Text>
            </View>

            {/* Card — premium hover wrapper */}
            <Animated.View
              style={[styles.cardWrap, { transform: [{ scale: hoverScale }, { translateY: hoverY }] }]}
              onPointerEnter={onCardHoverIn}
              onPointerLeave={onCardHoverOut}
            >
              {/* Neon glow ring */}
              <Animated.View
                pointerEvents="none"
                style={[styles.glowRing, {
                  borderColor: c.primary,
                  shadowColor: c.primary,
                  opacity: glowOp,
                }]}
              />

              {/* Card surface */}
              <View style={[styles.card, {
                backgroundColor: dark ? 'rgba(15,23,41,0.95)' : '#fff',
                borderColor: dark ? 'rgba(255,255,255,0.09)' : '#E2E8F0',
                overflow: 'hidden',
              }]}>
                {/* Diagonal shine sweep */}
                <Animated.View
                  pointerEvents="none"
                  style={[styles.shineSweep, {
                    opacity: shineOp,
                    transform: [{ translateX: shineX }, { rotate: '20deg' }],
                  }]}
                >
                  <LinearGradient
                    colors={['transparent', 'rgba(255,255,255,0.11)', 'rgba(255,255,255,0.04)', 'transparent']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={{ flex: 1 }}
                  />
                </Animated.View>

                <Text style={[styles.cardTitle, { color: c.text }]}>{t('register')}</Text>

                {error ? (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                {/* Role selector */}
                <View style={[styles.roleWrap, { backgroundColor: dark ? 'rgba(255,255,255,0.04)' : '#F4F6FF', borderColor: dark ? 'rgba(255,255,255,0.06)' : '#E2E8F0' }]}>
                  <Pressable
                    style={({ pressed }) => [styles.roleBtn, {
                      backgroundColor: role === 'user' ? c.primary : 'transparent',
                      opacity: pressed ? 0.85 : 1,
                    }]}
                    onPress={() => { setRole('user'); Haptics.selectionAsync(); }}
                  >
                    <User size={15} color={role === 'user' ? '#fff' : c.textSecondary} />
                    <Text style={[styles.roleTxt, { color: role === 'user' ? '#fff' : c.textSecondary }]}>Клиент</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.roleBtn, {
                      backgroundColor: role === 'business_owner' ? c.primary : 'transparent',
                      opacity: pressed ? 0.85 : 1,
                    }]}
                    onPress={() => { setRole('business_owner'); Haptics.selectionAsync(); }}
                  >
                    <Briefcase size={15} color={role === 'business_owner' ? '#fff' : c.textSecondary} />
                    <Text style={[styles.roleTxt, { color: role === 'business_owner' ? '#fff' : c.textSecondary }]}>Бизнес</Text>
                  </Pressable>
                </View>

                <View style={[styles.inputWrap, inputStyle('name')]}>
                  <User size={18} color={focused === 'name' ? c.primary : c.textMuted} />
                  <TextInput
                    style={[styles.input, { color: c.text }]}
                    placeholder={t('name')}
                    placeholderTextColor={c.textMuted}
                    value={name}
                    onChangeText={setName}
                    onFocus={() => setFocused('name')}
                    onBlur={() => setFocused(null)}
                  />
                </View>

                <View style={[styles.inputWrap, inputStyle('email')]}>
                  <Mail size={18} color={focused === 'email' ? c.primary : c.textMuted} />
                  <TextInput
                    style={[styles.input, { color: c.text }]}
                    placeholder={t('email')}
                    placeholderTextColor={c.textMuted}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={email}
                    onChangeText={setEmail}
                    onFocus={() => setFocused('email')}
                    onBlur={() => setFocused(null)}
                  />
                </View>

                <View style={[styles.inputWrap, inputStyle('phone')]}>
                  <Phone size={18} color={focused === 'phone' ? c.primary : c.textMuted} />
                  <TextInput
                    style={[styles.input, { color: c.text }]}
                    placeholder="Телефон (необязательно)"
                    placeholderTextColor={c.textMuted}
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={setPhone}
                    onFocus={() => setFocused('phone')}
                    onBlur={() => setFocused(null)}
                  />
                </View>

                <View style={[styles.inputWrap, inputStyle('pass')]}>
                  <Lock size={18} color={focused === 'pass' ? c.primary : c.textMuted} />
                  <TextInput
                    style={[styles.input, { color: c.text }]}
                    placeholder={t('password')}
                    placeholderTextColor={c.textMuted}
                    secureTextEntry={!showPass}
                    value={password}
                    onChangeText={setPassword}
                    onFocus={() => setFocused('pass')}
                    onBlur={() => setFocused(null)}
                  />
                  <Pressable onPress={() => setShowPass(!showPass)} hitSlop={8}>
                    {showPass ? <EyeOff size={18} color={c.textMuted} /> : <Eye size={18} color={c.textMuted} />}
                  </Pressable>
                </View>

                <Pressable
                  onPress={handleRegister}
                  disabled={loading}
                  style={({ pressed }) => ({ marginTop: 8, opacity: pressed ? 0.82 : 1 })}
                >
                  <LinearGradient colors={GRAD} style={styles.btn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    {loading
                      ? <ActivityIndicator color="#fff" />
                      : (
                        <>
                          <Text style={styles.btnText}>{t('register')}</Text>
                          <ArrowRight size={18} color="#fff" />
                        </>
                      )}
                  </LinearGradient>
                </Pressable>

                <Pressable onPress={() => router.back()} style={styles.link}>
                  <Text style={[styles.linkText, { color: c.textSecondary }]}>
                    {t('hasAccount')}{' '}
                    <Text style={{ color: c.primary, fontWeight: '700' }}>{t('login')}</Text>
                  </Text>
                </Pressable>
              </View>
            </Animated.View>

          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 32 },
  blob1: { position: 'absolute', width: 340, height: 340, borderRadius: 170, top: -90, right: -90 },
  blob2: { position: 'absolute', width: 300, height: 300, borderRadius: 150, bottom: 60, left: -90 },
  logoWrap: { alignItems: 'center', marginBottom: 32 },
  logoText: { fontSize: 32, fontWeight: '800', letterSpacing: -0.8, marginBottom: 4 },
  logoSub: { fontSize: 14, letterSpacing: 0.2 },
  cardWrap: { marginBottom: 0 },
  glowRing: {
    position: 'absolute', top: -2, left: -2, right: -2, bottom: -2,
    borderRadius: 30, borderWidth: 1.5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.65,
    shadowRadius: 22,
  },
  shineSweep: {
    position: 'absolute', top: -60, bottom: -60, width: 100, zIndex: 10,
  },
  card: { borderRadius: 28, padding: 24, borderWidth: 1 },
  cardTitle: { fontSize: 22, fontWeight: '700', marginBottom: 20, letterSpacing: -0.5 },
  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.10)', borderRadius: 12, padding: 12,
    marginBottom: 14, borderWidth: 1, borderColor: 'rgba(239,68,68,0.22)',
  },
  errorText: { color: '#F87171', fontSize: 14, textAlign: 'center' },
  roleWrap: {
    flexDirection: 'row', borderRadius: 14, borderWidth: 1, padding: 4,
    marginBottom: 16, gap: 4,
  },
  roleBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderRadius: 11, paddingVertical: 11,
  },
  roleTxt: { fontSize: 14, fontWeight: '600' },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1.5,
    borderRadius: 16, paddingHorizontal: 16, marginBottom: 12, height: 54, gap: 12,
  },
  input: { flex: 1, fontSize: 15 },
  btn: {
    height: 56, borderRadius: 16, alignItems: 'center',
    justifyContent: 'center', flexDirection: 'row', gap: 8,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  link: { marginTop: 20, alignItems: 'center' },
  linkText: { fontSize: 15 },
});
