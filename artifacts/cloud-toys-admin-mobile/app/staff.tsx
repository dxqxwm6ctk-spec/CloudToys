import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAdminListStaff } from '@workspace/api-client-react';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import { ErrorState } from '@/components/ScreenState';

export default function StaffScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { identity } = useAuth();
  const query = useAdminListStaff();
  const topInset = insets.top < 67 ? 67 : insets.top;
  const bottomInset = insets.bottom < 34 ? 34 : insets.bottom;

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
        data={query.data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingTop: topInset + 16, paddingBottom: bottomInset + 24 }}
        showsVerticalScrollIndicator={false}
        refreshing={query.isFetching && !query.isLoading}
        onRefresh={() => void query.refetch()}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={[styles.kicker, { color: colors.secondary }]}>TEAM ACCESS</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>Staff & admins</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              {query.data?.length ?? 0} team accounts
            </Text>
          </View>
        }
        ListEmptyComponent={
          query.isLoading ? null : (
            <View style={styles.center}>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No staff accounts</Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={[styles.avatarText, { color: colors.primaryForeground }]}>
                {item.username.slice(0, 1).toUpperCase()}
              </Text>
            </View>
            <View style={styles.copy}>
              <Text style={[styles.username, { color: colors.foreground }]} numberOfLines={1}>{item.username}</Text>
              <Text style={[styles.email, { color: colors.mutedForeground }]} numberOfLines={1}>
                {item.email ?? 'Password sign-in only'}
              </Text>
            </View>
            <View style={[styles.role, { backgroundColor: item.active ? colors.accent : colors.muted }]}>
              <Text style={[styles.roleText, { color: item.active ? colors.secondaryForeground : colors.mutedForeground }]}>
                {item.active ? item.role : 'disabled'}
              </Text>
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
  header: { marginBottom: 16, gap: 5 },
  kicker: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.7 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 28, letterSpacing: -0.5 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 13 },
  card: { minHeight: 72, borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 11 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  copy: { flex: 1, gap: 4 },
  username: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  email: { fontFamily: 'Inter_400Regular', fontSize: 11 },
  role: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 },
  roleText: { fontFamily: 'Inter_600SemiBold', fontSize: 10, textTransform: 'capitalize' },
  lockIcon: { width: 58, height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 17, textAlign: 'center' },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, textAlign: 'center' },
});