import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ErrorState } from '@/components/ScreenState';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import { blockIp, listBlockedIps, listSecurityEvents, unblockIp } from '@/lib/admin-api';

function dateLabel(value: string): string {
  return new Date(value).toLocaleString();
}

export default function SecurityScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { identity } = useAuth();
  const queryClient = useQueryClient();
  const [ip, setIp] = useState('');
  const [reason, setReason] = useState('');
  const eventsQuery = useQuery({ queryKey: ['admin', 'security', 'events'], queryFn: listSecurityEvents });
  const blockedQuery = useQuery({ queryKey: ['admin', 'security', 'blocked-ips'], queryFn: listBlockedIps });
  const blockMutation = useMutation({
    mutationFn: () => blockIp(ip.trim(), reason),
    onSuccess: () => {
      setIp('');
      setReason('');
      void queryClient.invalidateQueries({ queryKey: ['admin', 'security'] });
    },
    onError: (error) => Alert.alert('Could not block IP', error instanceof Error ? error.message : 'The API rejected the request.'),
  });
  const unblockMutation = useMutation({
    mutationFn: (value: string) => unblockIp(value),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin', 'security'] }),
    onError: (error) => Alert.alert('Could not unblock IP', error instanceof Error ? error.message : 'The API rejected the request.'),
  });
  const topInset = Math.max(insets.top, 67);
  const bottomInset = Math.max(insets.bottom, 34);

  if (identity?.role !== 'admin') {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Feather name="shield-off" size={30} color={colors.mutedForeground} />
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Admin access required</Text>
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Security controls are restricted to admins.</Text>
      </View>
    );
  }

  if (eventsQuery.isError || blockedQuery.isError) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ErrorState message="We could not load security activity." onRetry={() => { void eventsQuery.refetch(); void blockedQuery.refetch(); }} />
      </View>
    );
  }

  const refresh = () => { void eventsQuery.refetch(); void blockedQuery.refetch(); };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <FlatList
        data={eventsQuery.data ?? []}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ paddingTop: topInset + 16, paddingBottom: bottomInset + 24, paddingHorizontal: 18 }}
        showsVerticalScrollIndicator={false}
        refreshing={eventsQuery.isFetching || blockedQuery.isFetching}
        onRefresh={refresh}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={[styles.kicker, { color: colors.secondary }]}>PROTECTION</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>Security</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Review rate-limit events and manage blocked IP addresses.</Text>
            <View style={[styles.blockCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.sectionHeading}>
                <View style={[styles.iconBox, { backgroundColor: colors.accent }]}><Feather name="slash" size={17} color={colors.primary} /></View>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Block an IP address</Text>
              </View>
              <TextInput value={ip} onChangeText={setIp} autoCapitalize="none" autoCorrect={false} placeholder="198.51.100.24" placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground, borderColor: colors.input, backgroundColor: colors.background }]} />
              <TextInput value={reason} onChangeText={setReason} placeholder="Reason (optional)" placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground, borderColor: colors.input, backgroundColor: colors.background }]} />
              <Pressable disabled={!ip.trim() || blockMutation.isPending} onPress={() => blockMutation.mutate()} style={({ pressed }) => [styles.blockButton, { backgroundColor: colors.primary, opacity: pressed || blockMutation.isPending ? 0.75 : 1 }]}>
                {blockMutation.isPending ? <ActivityIndicator color={colors.primaryForeground} /> : <Feather name="shield" size={16} color={colors.primaryForeground} />}
                <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Block address</Text>
              </Pressable>
            </View>
            <Text style={[styles.sectionLabel, { color: colors.foreground }]}>Blocked addresses</Text>
            {(blockedQuery.data ?? []).length === 0 ? (
              <Text style={[styles.muted, { color: colors.mutedForeground }]}>No IP addresses are currently blocked.</Text>
            ) : (
              (blockedQuery.data ?? []).map((blocked) => (
                <View key={blocked.ip} style={[styles.blockedRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.settingCopy}>
                    <Text style={[styles.ip, { color: colors.foreground }]}>{blocked.ip}</Text>
                    <Text style={[styles.muted, { color: colors.mutedForeground }]}>{blocked.reason || 'No reason provided'} · {dateLabel(blocked.createdAt)}</Text>
                  </View>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Unblock ${blocked.ip}`} hitSlop={8} onPress={() => Alert.alert('Unblock address', `Allow ${blocked.ip} to access the store again?`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Unblock', onPress: () => unblockMutation.mutate(blocked.ip) }])}>
                    <Feather name="unlock" size={18} color={colors.primary} />
                  </Pressable>
                </View>
              ))
            )}
            <Text style={[styles.sectionLabel, { color: colors.foreground }]}>Recent security events</Text>
          </View>
        }
        ListEmptyComponent={
          eventsQuery.isLoading ? <ActivityIndicator color={colors.primary} /> : (
            <View style={styles.empty}><Feather name="check-circle" size={28} color={colors.secondary} /><Text style={[styles.emptyTitle, { color: colors.foreground }]}>No recent events</Text><Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Rate-limit and abuse events will appear here.</Text></View>
          )
        }
        renderItem={({ item }) => (
          <View style={[styles.eventCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.eventIcon, { backgroundColor: colors.muted }]}><Feather name="alert-triangle" size={16} color={colors.destructive} /></View>
            <View style={styles.settingCopy}>
              <Text style={[styles.ip, { color: colors.foreground }]}>{item.ip}</Text>
              <Text style={[styles.muted, { color: colors.mutedForeground }]} numberOfLines={2}>{item.reason} · {item.method} {item.path}</Text>
              <Text style={[styles.muted, { color: colors.mutedForeground }]}>{dateLabel(item.createdAt)}</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 8 },
  header: { gap: 10, marginBottom: 12 },
  kicker: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.7 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 28, letterSpacing: -0.5, marginTop: -4 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, marginTop: -5, marginBottom: 4 },
  blockCard: { borderWidth: 1, borderRadius: 14, padding: 15, gap: 10 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 2 },
  iconBox: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  input: { minHeight: 46, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontFamily: 'Inter_400Regular', fontSize: 14 },
  blockButton: { minHeight: 46, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  buttonText: { fontFamily: 'Inter_700Bold', fontSize: 13 },
  sectionLabel: { fontFamily: 'Inter_700Bold', fontSize: 16, marginTop: 7 },
  blockedRow: { minHeight: 68, borderWidth: 1, borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  eventCard: { minHeight: 76, borderWidth: 1, borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 9 },
  eventIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  settingCopy: { flex: 1, gap: 4 },
  ip: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  muted: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16 },
  empty: { alignItems: 'center', paddingVertical: 50, gap: 8 },
  emptyTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 17 },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, textAlign: 'center' },
});