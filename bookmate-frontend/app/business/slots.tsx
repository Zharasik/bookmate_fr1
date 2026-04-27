import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator,
  TextInput, Modal, Alert, RefreshControl, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Plus, Edit2, Trash2, X } from 'lucide-react-native';
import { useTheme } from '../../hooks/useHelpers';
import { api } from '../../services/api';

export default function SlotsScreen() {
  const router = useRouter();
  const c = useTheme();
  const { venueId, venueName } = useLocalSearchParams<{ venueId: string; venueName: string }>();

  const [slots, setSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ name: '', description: '', price: '', capacity: '1', is_active: true });

  const load = useCallback(async () => {
    if (!venueId) return;
    try { setSlots(await api.business.getSlots(venueId)); } catch { /* ignore */ } finally {
      setLoading(false); setRefreshing(false);
    }
  }, [venueId]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', description: '', price: '', capacity: '1', is_active: true });
    setShowModal(true);
  };

  const openEdit = (slot: any) => {
    setEditing(slot);
    setForm({ name: slot.name, description: slot.description || '', price: String(slot.price || ''), capacity: String(slot.capacity || 1), is_active: slot.is_active });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { Alert.alert('Ошибка', 'Название обязательно'); return; }
    setSaving(true);
    try {
      const data = { name: form.name.trim(), description: form.description.trim() || undefined, price: Number(form.price) || 0, capacity: Number(form.capacity) || 1, is_active: form.is_active };
      if (editing) {
        await api.business.updateSlot(editing.id, data);
      } else {
        await api.business.createSlot(venueId, data);
      }
      setShowModal(false);
      load();
    } catch (e: any) {
      Alert.alert('Ошибка', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Удалить слот?', `"${name}" будет удалён.`, [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: async () => {
        try { await api.business.deleteSlot(id); load(); } catch (e: any) { Alert.alert('Ошибка', e.message); }
      }},
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: c.card, borderBottomColor: c.border }]}>
        <Pressable style={styles.back} onPress={() => router.back()}>
          <ChevronLeft size={24} color={c.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: c.text }]} numberOfLines={1}>
            {decodeURIComponent(venueName || '')}
          </Text>
          <Text style={[styles.headerSub, { color: c.textMuted }]}>Управление слотами</Text>
        </View>
        <Pressable style={[styles.addBtn, { backgroundColor: c.primary }]} onPress={openCreate}>
          <Plus size={20} color="#fff" />
        </Pressable>
      </View>

      {loading
        ? <ActivityIndicator style={{ marginTop: 40 }} color={c.primary} size="large" />
        : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.listInner}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={c.primary} />}
          >
            {slots.map((slot) => (
              <View key={slot.id} style={[styles.slotCard, { backgroundColor: c.card }]}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={[styles.slotName, { color: c.text }]}>{slot.name}</Text>
                    <View style={[styles.activeChip, { backgroundColor: slot.is_active ? '#D1FAE5' : '#FEE2E2' }]}>
                      <Text style={{ color: slot.is_active ? '#10B981' : '#EF4444', fontSize: 11, fontWeight: '600' }}>
                        {slot.is_active ? 'Активен' : 'Выкл'}
                      </Text>
                    </View>
                  </View>
                  {slot.description ? <Text style={[styles.slotDesc, { color: c.textSecondary }]}>{slot.description}</Text> : null}
                  <Text style={[styles.slotMeta, { color: c.textMuted }]}>
                    {slot.price > 0 ? `${slot.price.toLocaleString()} ₸/час` : 'Бесплатно'} · {slot.capacity} чел.
                  </Text>
                </View>
                <View style={styles.slotActions}>
                  <Pressable style={[styles.iconBtn, { backgroundColor: c.primaryLight }]} onPress={() => openEdit(slot)}>
                    <Edit2 size={16} color={c.primary} />
                  </Pressable>
                  <Pressable style={[styles.iconBtn, { backgroundColor: '#FEE2E2' }]} onPress={() => handleDelete(slot.id, slot.name)}>
                    <Trash2 size={16} color="#EF4444" />
                  </Pressable>
                </View>
              </View>
            ))}
            {slots.length === 0 && (
              <View style={styles.emptyWrap}>
                <Text style={[styles.emptyTitle, { color: c.text }]}>Слотов пока нет</Text>
                <Text style={[styles.emptySub, { color: c.textMuted }]}>Добавьте кресла, столы, дорожки или любые позиции</Text>
                <Pressable style={[styles.emptyBtn, { backgroundColor: c.primary }]} onPress={openCreate}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>+ Добавить слот</Text>
                </Pressable>
              </View>
            )}
          </ScrollView>
        )}

      {/* Slot form modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={[styles.modal, { backgroundColor: c.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.text }]}>
                {editing ? 'Изменить слот' : 'Новый слот'}
              </Text>
              <Pressable onPress={() => setShowModal(false)}>
                <X size={24} color={c.text} />
              </Pressable>
            </View>

            <Text style={[styles.fieldLabel, { color: c.text }]}>Название *</Text>
            <TextInput style={[styles.field, { backgroundColor: c.bg, borderColor: c.border, color: c.text }]} placeholder="Кресло #1, Стол A..." placeholderTextColor={c.textMuted} value={form.name} onChangeText={(v) => setForm((p) => ({ ...p, name: v }))} />

            <Text style={[styles.fieldLabel, { color: c.text }]}>Описание</Text>
            <TextInput style={[styles.field, { backgroundColor: c.bg, borderColor: c.border, color: c.text }]} placeholder="Мастер: Алибек, VIP зона..." placeholderTextColor={c.textMuted} value={form.description} onChangeText={(v) => setForm((p) => ({ ...p, description: v }))} />

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: c.text }]}>Цена (₸/час)</Text>
                <TextInput style={[styles.field, { backgroundColor: c.bg, borderColor: c.border, color: c.text }]} placeholder="0" placeholderTextColor={c.textMuted} keyboardType="number-pad" value={form.price} onChangeText={(v) => setForm((p) => ({ ...p, price: v }))} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: c.text }]}>Вместимость</Text>
                <TextInput style={[styles.field, { backgroundColor: c.bg, borderColor: c.border, color: c.text }]} placeholder="1" placeholderTextColor={c.textMuted} keyboardType="number-pad" value={form.capacity} onChangeText={(v) => setForm((p) => ({ ...p, capacity: v }))} />
              </View>
            </View>

            <View style={styles.switchRow}>
              <Text style={[styles.fieldLabel, { color: c.text, marginBottom: 0 }]}>Активен</Text>
              <Switch value={form.is_active} onValueChange={(v) => setForm((p) => ({ ...p, is_active: v }))} trackColor={{ true: c.primary, false: c.border }} />
            </View>

            <Pressable style={[styles.saveBtn, { backgroundColor: saving ? '#93C5FD' : c.primary }]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveTxt}>{editing ? 'Сохранить' : 'Добавить'}</Text>}
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, gap: 12 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  headerSub: { fontSize: 12, marginTop: 2 },
  addBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  listInner: { padding: 16, gap: 12, paddingBottom: 40 },
  slotCard: { borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, elevation: 2 },
  slotName: { fontSize: 15, fontWeight: '700' },
  slotDesc: { fontSize: 13, marginTop: 2 },
  slotMeta: { fontSize: 12, marginTop: 4 },
  activeChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  slotActions: { flexDirection: 'row', gap: 8 },
  iconBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  emptyWrap: { alignItems: 'center', marginTop: 80, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  emptyBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  fieldLabel: { fontSize: 14, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  field: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, height: 48, fontSize: 15 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  saveBtn: { marginTop: 24, paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  saveTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
