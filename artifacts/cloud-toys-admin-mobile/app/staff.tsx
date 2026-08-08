import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
import {
  getAdminListStaffQueryKey,
  useAdminCreateStaff,
  useAdminDeleteStaff,
  useAdminListStaff,
  useAdminUpdateStaff,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { ErrorState } from '@/components/ScreenState';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';

type StaffRole = 'admin' | 'manager' | 'supervisor';
type FormMode = 'create' | 'edit';

type StaffForm = {
  username: string;
  email: string;
  password: string;
  role: StaffRole;
  active: boolean;
};

const EMPTY_FORM: StaffForm = {
  username: '',
  email: '',
  password: '',
  role: 'manager',
  active: true,
};

const ROLE_LABELS: Record<StaffRole, string> = {
  admin: 'Admin',
  manager: 'Manager',
  supervisor: 'Supervisor',
};

const ROLE_DESCRIPTIONS: Record<StaffRole, string> = {
  admin: 'Full access',
  manager: 'Store operations',
  supervisor: 'Read-only access',
};

function Field({
  label,
  value,
  onChangeText,
  colors,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  colors: ReturnType<typeof useColors>;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        style={[
          styles.input,
          { color: colors.foreground, borderColor: colors.input, backgroundColor: colors.background },
        ]}
      />
    </View>
  );
}

export default function StaffScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { identity } = useAuth();
  const queryClient = useQueryClient();
  const query = useAdminListStaff();
  const createStaff = useAdminCreateStaff();
  const updateStaff = useAdminUpdateStaff();
  const deleteStaff = useAdminDeleteStaff();
  const [formMode, setFormMode] = useState<FormMode>('create');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<StaffForm>(EMPTY_FORM);
  const topInset = Math.max(insets.top, 67);
  const bottomInset = Math.max(insets.bottom, 34);
  const staff = query.data ?? [];
  const editingStaff = useMemo(
    () => staff.find((member) => member.id === editingId),
    [editingId, staff],
  );
  const isSaving = createStaff.isPending || updateStaff.isPending;
  const isBusy = isSaving || deleteStaff.isPending;

  const invalidateStaff = () => {
    void queryClient.invalidateQueries({ queryKey: getAdminListStaffQueryKey() });
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const openCreate = () => {
    setIsFormOpen(true);
    setFormMode('create');
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const openEdit = (member: (typeof staff)[number]) => {
    setIsFormOpen(true);
    setFormMode('edit');
    setEditingId(member.id);
    setForm({
      username: member.username,
      email: member.email ?? '',
      password: '',
      role: member.role,
      active: member.active,
    });
  };

  const saveStaff = () => {
    const username = form.username.trim();
    const email = form.email.trim();
    const password = form.password.trim();

    if (formMode === 'create') {
      if (username.length < 3) {
        Alert.alert('Invalid username', 'Use at least 3 characters for the username.');
        return;
      }
      if (password.length < 8) {
        Alert.alert('Invalid password', 'Use at least 8 characters for the password.');
        return;
      }

      createStaff.mutate(
        {
          data: {
            username,
            password,
            role: form.role,
            ...(email ? { email } : {}),
          },
        },
        {
          onSuccess: () => {
            closeForm();
            invalidateStaff();
            Alert.alert('Staff account created', `${username} can now sign in.`);
          },
          onError: (error) => {
            Alert.alert(
              'Could not create account',
              error instanceof Error ? error.message : 'The API rejected this account.',
            );
          },
        },
      );
      return;
    }

    if (!editingId) return;
    updateStaff.mutate(
      {
        id: editingId,
        data: {
          role: form.role,
          active: form.active,
          email,
          ...(password ? { password } : {}),
        },
      },
      {
        onSuccess: () => {
          closeForm();
          invalidateStaff();
          Alert.alert('Staff account updated', 'The access changes were saved.');
        },
        onError: (error) => {
          Alert.alert(
            'Could not update account',
            error instanceof Error ? error.message : 'The API rejected these changes.',
          );
        },
      },
    );
  };

  const removeStaff = (id: string, username: string) => {
    Alert.alert(
      'Remove staff account',
      `Remove "${username}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            deleteStaff.mutate(
              { id },
              {
                onSuccess: () => {
                  invalidateStaff();
                  Alert.alert('Account removed', `${username} no longer has dashboard access.`);
                },
                onError: (error) => {
                  Alert.alert(
                    'Could not remove account',
                    error instanceof Error ? error.message : 'The API rejected this removal.',
                  );
                },
              },
            );
          },
        },
      ],
    );
  };

  if (identity?.role !== 'admin') {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <View style={[styles.lockIcon, { backgroundColor: colors.accent }]}>
          <Feather name="lock" size={24} color={colors.primary} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Admin access required</Text>
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
          Staff management is only available to administrators.
        </Text>
      </View>
    );
  }

  if (query.isError) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ErrorState message="We could not load staff accounts." onRetry={() => void query.refetch()} />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <FlatList
        data={staff}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingTop: topInset + 16,
          paddingBottom: bottomInset + 24,
          paddingHorizontal: 18,
        }}
        showsVerticalScrollIndicator={false}
        refreshing={query.isFetching && !query.isLoading}
        onRefresh={() => void query.refetch()}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.headingRow}>
              <View style={styles.headingCopy}>
                <Text style={[styles.kicker, { color: colors.secondary }]}>TEAM ACCESS</Text>
                <Text style={[styles.title, { color: colors.foreground }]}>Staff & admins</Text>
                <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                  {staff.length} team account{staff.length === 1 ? '' : 's'}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Add staff account"
                onPress={openCreate}
                style={({ pressed }) => [
                  styles.addButton,
                  { backgroundColor: colors.primary, opacity: pressed ? 0.72 : 1 },
                ]}
              >
                <Feather name="plus" size={19} color={colors.primaryForeground} />
              </Pressable>
            </View>
          </View>
        }
        ListEmptyComponent={
          query.isLoading ? null : (
            <View style={styles.empty}>
              <Feather name="users" size={28} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No staff accounts</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                Add a team account to give someone access to the admin dashboard.
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => {
          const isSelf = item.username.toLowerCase() === identity.username.toLowerCase();
          return (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                <Text style={[styles.avatarText, { color: colors.primaryForeground }]}>
                  {item.username.slice(0, 1).toUpperCase()}
                </Text>
              </View>
              <View style={styles.copy}>
                <View style={styles.nameRow}>
                  <Text style={[styles.username, { color: colors.foreground }]} numberOfLines={1}>
                    {item.username}
                  </Text>
                  {isSelf ? (
                    <View style={[styles.selfBadge, { backgroundColor: colors.accent }]}>
                      <Text style={[styles.selfBadgeText, { color: colors.secondaryForeground }]}>You</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={[styles.email, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {item.email ?? 'Password sign-in only'}
                </Text>
                <Text style={[styles.lastLogin, { color: colors.mutedForeground }]}>
                  {item.lastLoginAt ? `Last sign-in ${new Date(item.lastLoginAt).toLocaleDateString()}` : 'Never signed in'}
                </Text>
              </View>
              <View style={styles.cardActions}>
                <View style={[styles.role, { backgroundColor: item.active ? colors.accent : colors.muted }]}>
                  <Text style={[styles.roleText, { color: item.active ? colors.secondaryForeground : colors.mutedForeground }]}>
                    {item.active ? ROLE_LABELS[item.role] : 'Disabled'}
                  </Text>
                </View>
                {!isSelf ? (
                  <View style={styles.iconActions}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Edit ${item.username}`}
                      hitSlop={8}
                      onPress={() => openEdit(item)}
                      disabled={isBusy}
                    >
                      <Feather name="edit-2" size={17} color={colors.primary} />
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${item.username}`}
                      hitSlop={8}
                      onPress={() => removeStaff(item.id, item.username)}
                      disabled={isBusy}
                    >
                      <Feather name="trash-2" size={17} color={colors.destructive} />
                    </Pressable>
                  </View>
                ) : null}
              </View>
            </View>
          );
        }}
      />

      <Modal visible={isFormOpen} animationType="slide" transparent onRequestClose={closeForm}>
        <View style={[styles.modalBackdrop, { backgroundColor: `${colors.foreground}66` }]}>
          <KeyboardAwareScrollViewCompat
            contentContainerStyle={[
              styles.modalCard,
              { backgroundColor: colors.card, paddingBottom: bottomInset + 16 },
            ]}
            keyboardShouldPersistTaps="handled"
            bottomOffset={24}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalHeading}>
                <Text style={[styles.modalKicker, { color: colors.secondary }]}>
                  {formMode === 'create' ? 'NEW TEAM MEMBER' : 'ACCOUNT ACCESS'}
                </Text>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                  {formMode === 'create' ? 'Add staff account' : `Edit ${editingStaff?.username ?? 'account'}`}
                </Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={closeForm} hitSlop={10} disabled={isSaving}>
                <Feather name="x" size={22} color={colors.mutedForeground} />
              </Pressable>
            </View>

            {formMode === 'create' ? (
              <Field label="Username" value={form.username} onChangeText={(username) => setForm((current) => ({ ...current, username }))} colors={colors} placeholder="e.g. sara" />
            ) : null}
            <Field
              label="Google email (optional)"
              value={form.email}
              onChangeText={(email) => setForm((current) => ({ ...current, email }))}
              colors={colors}
              placeholder="name@example.com"
              keyboardType="email-address"
            />
            <Field
              label={formMode === 'create' ? 'Password' : 'New password (optional)'}
              value={form.password}
              onChangeText={(password) => setForm((current) => ({ ...current, password }))}
              colors={colors}
              placeholder={formMode === 'create' ? 'At least 8 characters' : 'Leave blank to keep current'}
              secureTextEntry
            />

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.foreground }]}>Role</Text>
              <View style={styles.roleChoices}>
                {(Object.keys(ROLE_LABELS) as StaffRole[]).map((role) => {
                  const selected = form.role === role;
                  return (
                    <Pressable
                      key={role}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => setForm((current) => ({ ...current, role }))}
                      style={[
                        styles.roleChoice,
                        { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.accent : colors.background },
                      ]}
                    >
                      <Text style={[styles.roleChoiceTitle, { color: selected ? colors.primary : colors.foreground }]}>
                        {ROLE_LABELS[role]}
                      </Text>
                      <Text style={[styles.roleChoiceDescription, { color: colors.mutedForeground }]}>
                        {ROLE_DESCRIPTIONS[role]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {formMode === 'edit' ? (
              <View style={[styles.activeRow, { borderColor: colors.border }]}>
                <View style={styles.copy}>
                  <Text style={[styles.activeTitle, { color: colors.foreground }]}>Account enabled</Text>
                  <Text style={[styles.email, { color: colors.mutedForeground }]}>Disabled accounts cannot sign in.</Text>
                </View>
                <Switch
                  value={form.active}
                  onValueChange={(active) => setForm((current) => ({ ...current, active }))}
                  trackColor={{ false: colors.muted, true: colors.secondary }}
                  thumbColor={form.active ? colors.primary : colors.mutedForeground}
                />
              </View>
            ) : null}

            <Pressable
              accessibilityRole="button"
              onPress={saveStaff}
              disabled={isSaving}
              style={({ pressed }) => [
                styles.saveButton,
                { backgroundColor: colors.primary, opacity: pressed || isSaving ? 0.72 : 1 },
              ]}
            >
              {isSaving ? <ActivityIndicator color={colors.primaryForeground} /> : <Feather name="check" size={17} color={colors.primaryForeground} />}
              <Text style={[styles.saveText, { color: colors.primaryForeground }]}>
                {isSaving ? 'Saving...' : formMode === 'create' ? 'Create account' : 'Save changes'}
              </Text>
            </Pressable>
          </KeyboardAwareScrollViewCompat>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 8 },
  header: { marginBottom: 16 },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  headingCopy: { flex: 1, gap: 5 },
  kicker: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.7 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 28, letterSpacing: -0.5 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 13 },
  addButton: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  card: { minHeight: 92, borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 11 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  copy: { flex: 1, gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  username: { flexShrink: 1, fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  email: { fontFamily: 'Inter_400Regular', fontSize: 11 },
  lastLogin: { fontFamily: 'Inter_400Regular', fontSize: 10 },
  selfBadge: { borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2 },
  selfBadgeText: { fontFamily: 'Inter_700Bold', fontSize: 9 },
  cardActions: { alignItems: 'flex-end', gap: 11 },
  role: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 },
  roleText: { fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  iconActions: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  lockIcon: { width: 58, height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingVertical: 70, gap: 8 },
  emptyTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 17, textAlign: 'center' },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, textAlign: 'center' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, gap: 14 },
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 2 },
  modalHeading: { flex: 1, gap: 4 },
  modalKicker: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.5 },
  modalTitle: { fontFamily: 'Inter_700Bold', fontSize: 21 },
  field: { gap: 7 },
  label: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  input: { minHeight: 46, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontFamily: 'Inter_400Regular', fontSize: 14 },
  roleChoices: { gap: 8 },
  roleChoice: { borderWidth: 1, borderRadius: 10, padding: 10, gap: 3 },
  roleChoiceTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  roleChoiceDescription: { fontFamily: 'Inter_400Regular', fontSize: 11 },
  activeRow: { minHeight: 58, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  activeTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  saveButton: { minHeight: 50, borderRadius: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 2 },
  saveText: { fontFamily: 'Inter_700Bold', fontSize: 14 },
});