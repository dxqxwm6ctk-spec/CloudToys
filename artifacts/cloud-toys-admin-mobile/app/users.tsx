import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { banAdminUser, getAdminUser, listAdminUsers, unbanAdminUser, type AdminUser } from '@/lib/admin-api';
import { useColors } from '@/hooks/useColors';
import { ErrorState } from '@/components/ScreenState';

function dateLabel(value: string | null) {
  return value ? new Date(value).toLocaleDateString() : '—';
}

export default function UsersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const usersQuery = useQuery({ queryKey: ['admin', 'users'], queryFn: listAdminUsers });
  const detailQuery = useQuery({
    queryKey: ['admin', 'users', selectedId],
    queryFn: () => getAdminUser(selectedId!),
    enabled: Boolean(selectedId),
  });
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return usersQuery.data ?? [];
    return (usersQuery.data ?? []).filter((user) =>
      [user.email, user.fullName, user.phone].some((value) => value?.toLowerCase().includes(term)),
    );
  }, [search, usersQuery.data]);

  const close = () => {
    setSelectedId(null);
    setReason('');
  };

  const handleBan = () => {
    if (!selectedId) return;
    Alert.alert('Ban customer', 'This blocks sign-in and checkout for this customer.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Ban customer',
        style: 'destructive',
        onPress: () => {
          void banAdminUser(selectedId, reason).then(() => {
            void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
            void queryClient.invalidateQueries({ queryKey: ['admin', 'users', selectedId] });
          }).catch((error: unknown) => Alert.alert('Could not ban customer', error instanceof Error ? error.message : 'Request failed'));
        },
      },
    ]);
  };

  const handleUnban = () => {
    if (!selectedId) return;
    void unbanAdminUser(selectedId).then(() => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users', selectedId] });
    }).catch((error: unknown) => Alert.alert('Could not unban customer', error instanceof Error ? error.message : 'Request failed'));
  };

  const topInset = Math.max(insets.top, 67);
  const bottomInset = Math.max(insets.bottom, 24);

  if (usersQuery.isError) {
    return <ErrorState message="We could not load customer accounts." onRetry={() => void usersQuery.refetch()} />;
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <FlatList<AdminUser>
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingTop: topInset + 16, paddingBottom: bottomInset + 24, paddingHorizontal: 18 }}
        refreshing={usersQuery.isFetching && !usersQuery.isLoading}
        onRefresh={() => void usersQuery.refetch()}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={[styles.kicker, { color: colors.secondary }]}>CUSTOMERS</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>Users</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{usersQuery.data?.length ?? 0} customer accounts</Text>
            <View style={[styles.search, { backgroundColor: colors.card, borderColor: colors.input }]}>
              <Feather name="search" size={17} color={colors.mutedForeground} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search by name, email, or phone"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.searchInput, { color: colors.foreground }]}
                autoCapitalize="none"
              />
            </View>
          </View>
        }
        ListEmptyComponent={
          usersQuery.isLoading ? <ActivityIndicator color={colors.primary} /> : (
            <View style={styles.empty}>
              <Feather name="users" size={28} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No users found</Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => setSelectedId(item.id)}
            style={({ pressed }) => [styles.card, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.75 : 1 }]}
          >
            <View style={[styles.avatar, { backgroundColor: item.banned ? colors.destructive : colors.primary }]}>
              <Text style={[styles.avatarText, { color: colors.primaryForeground }]}>{(item.fullName ?? item.email ?? '?').slice(0, 1).toUpperCase()}</Text>
            </View>
            <View style={styles.copy}>
              <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>{item.fullName ?? item.email ?? 'Unknown customer'}</Text>
              <Text style={[styles.meta, { color: colors.mutedForeground }]} numberOfLines={1}>{item.email ?? item.phone ?? 'No contact details'}</Text>
              <Text style={[styles.meta, { color: colors.mutedForeground }]}>{item.orderCount} orders · {item.totalSpent.toFixed(2)} JOD</Text>
            </View>
            <View style={[styles.status, { backgroundColor: item.banned ? colors.muted : colors.accent }]}>
              <Text style={{ color: item.banned ? colors.destructive : colors.secondaryForeground, fontFamily: 'Inter_600SemiBold', fontSize: 10 }}>
                {item.banned ? 'Banned' : 'Active'}
              </Text>
            </View>
          </Pressable>
        )}
      />

      <Modal visible={Boolean(selectedId)} transparent animationType="slide" onRequestClose={close}>
        <Pressable style={styles.backdrop} onPress={close}>
          <View style={[styles.detailCard, { backgroundColor: colors.card }]}>
            {detailQuery.isLoading || !detailQuery.data ? <ActivityIndicator color={colors.primary} /> : (
              <>
                <View style={styles.detailHeader}>
                  <View>
                    <Text style={[styles.detailTitle, { color: colors.foreground }]}>{detailQuery.data.fullName ?? detailQuery.data.email ?? 'Customer'}</Text>
                    <Text style={[styles.meta, { color: colors.mutedForeground }]}>{detailQuery.data.email ?? 'No email'}</Text>
                  </View>
                  <Pressable onPress={close} hitSlop={10}><Feather name="x" size={20} color={colors.mutedForeground} /></Pressable>
                </View>
                <View style={styles.detailGrid}>
                  <Text style={[styles.meta, { color: colors.mutedForeground }]}>Joined: {dateLabel(detailQuery.data.createdAt)}</Text>
                  <Text style={[styles.meta, { color: colors.mutedForeground }]}>Last sign-in: {dateLabel(detailQuery.data.lastSignInAt)}</Text>
                  <Text style={[styles.meta, { color: colors.mutedForeground }]}>Phone: {detailQuery.data.phone ?? '—'}</Text>
                  <Text style={[styles.meta, { color: colors.mutedForeground }]}>Address: {detailQuery.data.address ?? '—'}</Text>
                </View>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Order history ({detailQuery.data.orders.length})</Text>
                {detailQuery.data.orders.slice(0, 5).map((order) => (
                  <View key={order.orderNumber} style={[styles.orderRow, { backgroundColor: colors.muted }]}>
                    <Text style={[styles.meta, { color: colors.foreground }]}>{order.orderNumber} · {order.status}</Text>
                    <Text style={[styles.meta, { color: colors.mutedForeground }]}>{order.total.toFixed(2)} JOD</Text>
                  </View>
                ))}
                {!detailQuery.data.banned ? (
                  <>
                    <TextInput
                      value={reason}
                      onChangeText={setReason}
                      placeholder="Ban reason (optional)"
                      placeholderTextColor={colors.mutedForeground}
                      style={[styles.reason, { color: colors.foreground, borderColor: colors.input }]}
                    />
                    <Pressable onPress={handleBan} style={[styles.dangerButton, { backgroundColor: colors.destructive }]}>
                      <Feather name="slash" size={16} color={colors.destructiveForeground} />
                      <Text style={[styles.buttonText, { color: colors.destructiveForeground }]}>Ban customer</Text>
                    </Pressable>
                  </>
                ) : (
                  <Pressable onPress={handleUnban} style={[styles.outlineButton, { borderColor: colors.border }]}>
                    <Feather name="check-circle" size={16} color={colors.primary} />
                    <Text style={[styles.buttonText, { color: colors.primary }]}>Unban customer</Text>
                  </Pressable>
                )}
              </>
            )}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { gap: 5, marginBottom: 16 },
  kicker: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.7 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 28, letterSpacing: -0.5 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 13, marginBottom: 8 },
  search: { minHeight: 48, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchInput: { flex: 1, minHeight: 46, fontFamily: 'Inter_400Regular', fontSize: 13 },
  card: { minHeight: 78, borderWidth: 1, borderRadius: 14, padding: 11, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  copy: { flex: 1, gap: 4 },
  name: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  meta: { fontFamily: 'Inter_400Regular', fontSize: 11 },
  status: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 },
  empty: { alignItems: 'center', paddingVertical: 70, gap: 10 },
  emptyTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 17 },
  backdrop: { flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end' },
  detailCard: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 13, maxHeight: '85%' },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  detailTitle: { fontFamily: 'Inter_700Bold', fontSize: 19 },
  detailGrid: { gap: 6 },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 15, marginTop: 3 },
  orderRow: { borderRadius: 8, padding: 9, flexDirection: 'row', justifyContent: 'space-between' },
  reason: { minHeight: 45, borderWidth: 1, borderRadius: 9, paddingHorizontal: 11, fontFamily: 'Inter_400Regular', fontSize: 13 },
  dangerButton: { minHeight: 48, borderRadius: 10, flexDirection: 'row', gap: 8, justifyContent: 'center', alignItems: 'center' },
  outlineButton: { minHeight: 48, borderWidth: 1, borderRadius: 10, flexDirection: 'row', gap: 8, justifyContent: 'center', alignItems: 'center' },
  buttonText: { fontFamily: 'Inter_700Bold', fontSize: 13 },
});