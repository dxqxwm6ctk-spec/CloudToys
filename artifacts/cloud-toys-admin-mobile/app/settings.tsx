import { useMemo, useState, type ComponentProps, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { ErrorState } from '@/components/ScreenState';
import { useColors } from '@/hooks/useColors';
import {
  getContactSetting,
  getDeliverySetting,
  getPaymentMethods,
  getReturnPolicySetting,
  getShippingSetting,
  getWarrantyPolicySetting,
  updateContactSetting,
  updateDeliverySetting,
  updatePaymentMethod,
  createShippingZone,
  deleteShippingZone,
  updateReturnPolicySetting,
  updateShippingZone,
  updateShippingSetting,
  updateWarrantyPolicySetting,
  listShippingZones,
  type ContactSetting,
  type DeliverySetting,
  type PaymentMethodSetting,
  type ReturnPolicySetting,
  type ShippingZoneSetting,
  type ShippingSetting,
  type WarrantyPolicySetting,
} from '@/lib/admin-api';

function NumberField({
  label,
  value,
  onChangeText,
  colors,
  suffix,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  colors: ReturnType<typeof useColors>;
  suffix?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
      <View style={styles.numberRow}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          keyboardType="decimal-pad"
          style={[styles.input, styles.numberInput, { color: colors.foreground, borderColor: colors.input, backgroundColor: colors.card }]}
        />
        {suffix ? <Text style={[styles.suffix, { color: colors.mutedForeground }]}>{suffix}</Text> : null}
      </View>
    </View>
  );
}

function TextField({
  label,
  value,
  onChangeText,
  colors,
  multiline = false,
  keyboardType = 'default',
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  colors: ReturnType<typeof useColors>;
  multiline?: boolean;
  keyboardType?: 'default' | 'phone-pad' | 'email-address';
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={[styles.input, multiline && styles.textarea, { color: colors.foreground, borderColor: colors.input, backgroundColor: colors.card }]}
      />
    </View>
  );
}

function Section({
  title,
  icon,
  children,
  colors,
}: {
  title: string;
  icon: ComponentProps<typeof Feather>['name'];
  children: ReactNode;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.sectionHeading}>
        <View style={[styles.iconBox, { backgroundColor: colors.accent }]}>
          <Feather name={icon} size={17} color={colors.primary} />
        </View>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { identity } = useAuth();
  const queryClient = useQueryClient();
  const canEdit = identity?.role === 'admin';
  const topInset = Math.max(insets.top, 67);
  const bottomInset = Math.max(insets.bottom, 34);

  const paymentQuery = useQuery({ queryKey: ['admin', 'settings', 'payment-methods'], queryFn: getPaymentMethods });
  const shippingQuery = useQuery({ queryKey: ['admin', 'settings', 'shipping'], queryFn: getShippingSetting });
  const deliveryQuery = useQuery({ queryKey: ['admin', 'settings', 'delivery'], queryFn: getDeliverySetting });
  const returnsQuery = useQuery({ queryKey: ['admin', 'settings', 'returns'], queryFn: getReturnPolicySetting });
  const warrantyQuery = useQuery({ queryKey: ['admin', 'settings', 'warranty'], queryFn: getWarrantyPolicySetting });
  const contactQuery = useQuery({ queryKey: ['admin', 'settings', 'contact'], queryFn: getContactSetting });
  const zonesQuery = useQuery({ queryKey: ['admin', 'settings', 'shipping-zones'], queryFn: listShippingZones });

  const [shipping, setShipping] = useState<ShippingSetting | null>(null);
  const [delivery, setDelivery] = useState<DeliverySetting | null>(null);
  const [returns, setReturns] = useState<ReturnPolicySetting | null>(null);
  const [warranty, setWarranty] = useState<WarrantyPolicySetting | null>(null);
  const [contact, setContact] = useState<ContactSetting | null>(null);
  const [zoneForm, setZoneForm] = useState<ShippingZoneSetting | null>(null);

  const shippingForm = shipping ?? shippingQuery.data;
  const deliveryForm = delivery ?? deliveryQuery.data;
  const returnsForm = returns ?? returnsQuery.data;
  const warrantyForm = warranty ?? warrantyQuery.data;
  const contactForm = contact ?? contactQuery.data;
  const hasError = [paymentQuery, shippingQuery, deliveryQuery, returnsQuery, warrantyQuery, contactQuery, zonesQuery].some((query) => query.isError);
  const isLoading = [paymentQuery, shippingQuery, deliveryQuery, returnsQuery, warrantyQuery, contactQuery, zonesQuery].some((query) => query.isLoading);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!shippingForm || !deliveryForm || !returnsForm || !warrantyForm || !contactForm) throw new Error('Settings are still loading.');
      await Promise.all([
        updateShippingSetting({ amount: Number(shippingForm.amount), currency: shippingForm.currency }),
        updateDeliverySetting({ days: Number(deliveryForm.days) }),
        updateReturnPolicySetting({ ...returnsForm, days: Number(returnsForm.days) }),
        updateWarrantyPolicySetting({ ...warrantyForm, duration: Number(warrantyForm.duration) }),
        updateContactSetting(contactForm),
      ]);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] });
      Alert.alert('Settings saved', 'Store settings were updated successfully.');
    },
    onError: (error) => Alert.alert('Could not save settings', error instanceof Error ? error.message : 'The API rejected the changes.'),
  });

  const paymentMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => updatePaymentMethod(id, enabled),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin', 'settings', 'payment-methods'] }),
    onError: (error) => Alert.alert('Could not update payment method', error instanceof Error ? error.message : 'The API rejected the change.'),
  });

  const refresh = () => {
    void Promise.all([
      paymentQuery.refetch(),
      shippingQuery.refetch(),
      deliveryQuery.refetch(),
      returnsQuery.refetch(),
      warrantyQuery.refetch(),
      contactQuery.refetch(),
      zonesQuery.refetch(),
    ]);
  };

  const payments = useMemo<PaymentMethodSetting[]>(() => paymentQuery.data ?? [], [paymentQuery.data]);

  if (identity?.role !== 'admin') {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Feather name="lock" size={30} color={colors.mutedForeground} />
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Admin access required</Text>
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Only admins can edit store settings.</Text>
      </View>
    );
  }

  if (hasError) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ErrorState message="We could not load store settings." onRetry={refresh} />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={{ paddingTop: topInset + 16, paddingBottom: bottomInset + 24, paddingHorizontal: 18, gap: 12 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.kicker, { color: colors.secondary }]}>CONTROL CENTER</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>Store settings</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Manage the rules customers see at checkout.</Text>
        </View>

        {isLoading ? <ActivityIndicator color={colors.primary} style={styles.loader} /> : null}

        <Section title="Payment methods" icon="credit-card" colors={colors}>
          {payments.map((method) => (
            <View key={method.id} style={styles.settingRow}>
              <View style={styles.settingCopy}>
                <Text style={[styles.rowTitle, { color: colors.foreground }]}>{method.label}</Text>
                {method.description ? <Text style={[styles.rowDescription, { color: colors.mutedForeground }]}>{method.description}</Text> : null}
              </View>
              <Switch
                value={method.enabled}
                disabled={!canEdit || paymentMutation.isPending}
                onValueChange={(enabled) => paymentMutation.mutate({ id: method.id, enabled })}
                trackColor={{ false: colors.muted, true: colors.secondary }}
                thumbColor={method.enabled ? colors.primary : colors.mutedForeground}
              />
            </View>
          ))}
        </Section>

        <Section title="Shipping & delivery" icon="truck" colors={colors}>
          <View style={styles.row}>
            <View style={styles.half}>
              <NumberField label="Free shipping from" value={shippingForm ? String(shippingForm.amount) : ''} onChangeText={(amount) => setShipping((current) => ({ ...(current ?? shippingForm!), amount: Number(amount) || 0 }))} colors={colors} suffix={shippingForm?.currency ?? 'JOD'} />
            </View>
            <View style={styles.half}>
              <NumberField label="Delivery days" value={deliveryForm ? String(deliveryForm.days) : ''} onChangeText={(days) => setDelivery((current) => ({ ...(current ?? deliveryForm!), days: Number(days) || 0 }))} colors={colors} suffix="days" />
            </View>
          </View>
          <View style={styles.zoneHeader}>
            <View style={styles.settingCopy}>
              <Text style={[styles.rowTitle, { color: colors.foreground }]}>Shipping zones</Text>
              <Text style={[styles.rowDescription, { color: colors.mutedForeground }]}>
                Set delivery prices by governorate.
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => setZoneForm({ id: '', name: '', governorates: [], price: 0, isDefault: false })}
              style={[styles.smallButton, { backgroundColor: colors.primary }]}
            >
              <Feather name="plus" size={15} color={colors.primaryForeground} />
              <Text style={[styles.smallButtonText, { color: colors.primaryForeground }]}>Add</Text>
            </Pressable>
          </View>
          {(zonesQuery.data ?? []).map((zone) => (
            <View key={zone.id} style={[styles.zoneRow, { borderColor: colors.border }]}>
              <View style={styles.settingCopy}>
                <Text style={[styles.rowTitle, { color: colors.foreground }]}>{zone.name}</Text>
                <Text style={[styles.rowDescription, { color: colors.mutedForeground }]}>
                  {zone.governorates.join(', ') || 'All governorates'} · {zone.price.toFixed(2)} JOD
                  {zone.isDefault ? ' · Default' : ''}
                </Text>
              </View>
              <Pressable onPress={() => setZoneForm(zone)} hitSlop={8}>
                <Feather name="edit-2" size={16} color={colors.primary} />
              </Pressable>
              <Pressable
                onPress={() => Alert.alert('Delete shipping zone', `Delete "${zone.name}"?`, [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                      void deleteShippingZone(zone.id).then(() => {
                        void queryClient.invalidateQueries({ queryKey: ['admin', 'settings', 'shipping-zones'] });
                      }).catch((error: unknown) => Alert.alert(
                        'Could not delete zone',
                        error instanceof Error ? error.message : 'The API rejected the deletion.',
                      ));
                    },
                  },
                ])}
                hitSlop={8}
              >
                <Feather name="trash-2" size={16} color={colors.destructive} />
              </Pressable>
            </View>
          ))}
        </Section>

        <Section title="Customer policies" icon="file-text" colors={colors}>
          {returnsForm ? (
            <View style={styles.policyRow}>
              <View style={styles.settingCopy}>
                <Text style={[styles.rowTitle, { color: colors.foreground }]}>Returns accepted</Text>
                <Text style={[styles.rowDescription, { color: colors.mutedForeground }]}>Customers can return items within this period.</Text>
              </View>
              <Switch value={returnsForm.enabled} onValueChange={(enabled) => setReturns({ ...returnsForm, enabled })} trackColor={{ false: colors.muted, true: colors.secondary }} thumbColor={returnsForm.enabled ? colors.primary : colors.mutedForeground} />
            </View>
          ) : null}
          {returnsForm ? <NumberField label="Return period" value={String(returnsForm.days)} onChangeText={(days) => setReturns({ ...returnsForm, days: Number(days) || 0 })} colors={colors} suffix="days" /> : null}
          {warrantyForm ? (
            <View style={styles.policyRow}>
              <View style={styles.settingCopy}>
                <Text style={[styles.rowTitle, { color: colors.foreground }]}>Warranty available</Text>
                <Text style={[styles.rowDescription, { color: colors.mutedForeground }]}>Show the warranty policy on product pages.</Text>
              </View>
              <Switch value={warrantyForm.enabled} onValueChange={(enabled) => setWarranty({ ...warrantyForm, enabled })} trackColor={{ false: colors.muted, true: colors.secondary }} thumbColor={warrantyForm.enabled ? colors.primary : colors.mutedForeground} />
            </View>
          ) : null}
          {warrantyForm ? <NumberField label="Warranty duration" value={String(warrantyForm.duration)} onChangeText={(duration) => setWarranty({ ...warrantyForm, duration: Number(duration) || 0 })} colors={colors} suffix={warrantyForm.unit} /> : null}
        </Section>

        <Section title="Contact information" icon="phone" colors={colors}>
          {contactForm ? (
            <>
              <TextField label="Email" value={contactForm.email} onChangeText={(email) => setContact({ ...contactForm, email })} colors={colors} keyboardType="email-address" />
              <TextField label="Phone" value={contactForm.phone} onChangeText={(phone) => setContact({ ...contactForm, phone })} colors={colors} keyboardType="phone-pad" />
              <TextField label="Address" value={contactForm.address} onChangeText={(address) => setContact({ ...contactForm, address })} colors={colors} />
            </>
          ) : null}
        </Section>

        <Pressable disabled={saveMutation.isPending || isLoading} onPress={() => saveMutation.mutate()} style={({ pressed }) => [styles.saveButton, { backgroundColor: colors.primary, opacity: pressed || saveMutation.isPending ? 0.75 : 1 }]}>
          {saveMutation.isPending ? <ActivityIndicator color={colors.primaryForeground} /> : <Feather name="save" size={17} color={colors.primaryForeground} />}
          <Text style={[styles.saveText, { color: colors.primaryForeground }]}>{saveMutation.isPending ? 'Saving...' : 'Save changes'}</Text>
        </Pressable>
      </KeyboardAwareScrollViewCompat>
      <Modal visible={Boolean(zoneForm)} transparent animationType="slide" onRequestClose={() => setZoneForm(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setZoneForm(null)}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              {zoneForm?.id ? 'Edit shipping zone' : 'Add shipping zone'}
            </Text>
            <TextField
              label="Zone name"
              value={zoneForm?.name ?? ''}
              onChangeText={(name) => setZoneForm((current) => current ? { ...current, name } : current)}
              colors={colors}
            />
            <TextField
              label="Governorates (comma separated)"
              value={zoneForm?.governorates.join(', ') ?? ''}
              onChangeText={(value) => setZoneForm((current) => current ? {
                ...current,
                governorates: value.split(',').map((item) => item.trim()).filter(Boolean),
              } : current)}
              colors={colors}
            />
            <NumberField
              label="Price"
              value={zoneForm ? String(zoneForm.price) : ''}
              onChangeText={(value) => setZoneForm((current) => current ? { ...current, price: Number(value) || 0 } : current)}
              colors={colors}
              suffix="JOD"
            />
            <View style={styles.settingRow}>
              <View style={styles.settingCopy}>
                <Text style={[styles.rowTitle, { color: colors.foreground }]}>Default zone</Text>
                <Text style={[styles.rowDescription, { color: colors.mutedForeground }]}>Used when no governorate matches.</Text>
              </View>
              <Switch
                value={zoneForm?.isDefault ?? false}
                onValueChange={(isDefault) => setZoneForm((current) => current ? { ...current, isDefault } : current)}
                trackColor={{ false: colors.muted, true: colors.secondary }}
                thumbColor={zoneForm?.isDefault ? colors.primary : colors.mutedForeground}
              />
            </View>
            <View style={styles.modalActions}>
              <Pressable onPress={() => setZoneForm(null)} style={[styles.modalButton, { borderColor: colors.border }]}>
                <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (!zoneForm?.name.trim()) {
                    Alert.alert('Missing zone name', 'Enter a name before saving.');
                    return;
                  }
                  const payload = {
                    name: zoneForm.name.trim(),
                    governorates: zoneForm.governorates,
                    price: Number(zoneForm.price) || 0,
                    isDefault: zoneForm.isDefault,
                  };
                  const saveZone = zoneForm.id
                    ? updateShippingZone(zoneForm.id, payload)
                    : createShippingZone(payload);
                  void saveZone.then(() => {
                    setZoneForm(null);
                    void queryClient.invalidateQueries({ queryKey: ['admin', 'settings', 'shipping-zones'] });
                  }).catch((error: unknown) => Alert.alert(
                    'Could not save zone',
                    error instanceof Error ? error.message : 'The API rejected the zone.',
                  ));
                }}
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
              >
                <Text style={{ color: colors.primaryForeground, fontFamily: 'Inter_600SemiBold' }}>Save</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 8 },
  header: { gap: 5, marginBottom: 4 },
  kicker: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.7 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 28, letterSpacing: -0.5 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19 },
  loader: { alignSelf: 'flex-start', marginVertical: 4 },
  section: { borderWidth: 1, borderRadius: 14, padding: 15, gap: 14 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBox: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 3 },
  policyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  zoneHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  zoneRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, paddingTop: 12 },
  smallButton: { borderRadius: 9, paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 5 },
  smallButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  settingCopy: { flex: 1, gap: 3 },
  rowTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  rowDescription: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 17 },
  field: { gap: 7 },
  label: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  input: { minHeight: 46, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontFamily: 'Inter_400Regular', fontSize: 14 },
  textarea: { minHeight: 85, paddingTop: 12 },
  numberRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  numberInput: { flex: 1 },
  suffix: { fontFamily: 'Inter_500Medium', fontSize: 12, minWidth: 35 },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  saveButton: { minHeight: 52, borderRadius: 11, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginTop: 2 },
  saveText: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  emptyTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 17 },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 13, textAlign: 'center', lineHeight: 19 },
  modalBackdrop: { flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 13 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  modalButton: { minHeight: 46, flex: 1, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});