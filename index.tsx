import { Redirect } from 'expo-router';
import { useStore } from '../hooks/useStore';

export default function Index() {
  const token = useStore((s) => s.token);
  if (token) return <Redirect href="/(tabs)" />;
  return <Redirect href="/auth/login" />;
}
