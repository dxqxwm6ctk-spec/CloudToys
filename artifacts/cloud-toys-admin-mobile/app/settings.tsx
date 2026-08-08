import { useMemo, useState, type ComponentProps, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
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
  updateReturnPolicySetting,
  updateShippingSetting,
  updateWarrantyPolicySetting,
  type ContactSetting,
  type DeliverySetting,
  type PaymentMethodSetting,
  type ReturnPolicySetting,
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

  const [shipping, setShipping] = useState<ShippingSetting | null>(null);
  const [delivery, setDelivery] = useState<DeliverySetting | null>(null);
  const [returns, setReturns] = useState<ReturnPolicySetting | null>(null);
  const [warranty, setWarranty] = useState<WarrantyPolicySetting | null>(null);
  const [contact, setContact] = useState<ContactSetting | null>(null);

  const shippingForm = shipping ?? shippingQuery.data;
  const deliveryForm = delivery ?? deliveryQuery.data;
  const returnsForm = returns ?? returnsQuery.data;
  const warrantyForm = warranty ?? warrantyQuery.data;
  const contactForm = contact ?? contactQuery.data;
  const hasError = [paymentQuery, shippingQuery, deliveryQuery, returnsQuery, warrantyQuery, contactQuery].some((query) => query.isError);
  const isLoading = [paymentQuery, shippingQuery, deliveryQuery, returnsQuery, warrantyQuery, contactQuery].some((query) => query.isLoading);

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
});