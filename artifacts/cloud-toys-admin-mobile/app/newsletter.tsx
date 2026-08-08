import { Alert, FlatList, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getAdminListNewsletterSubscribersQueryKey,
  useAdminDeleteNewsletterSubscriber,
  useAdminListNewsletterSubscribers,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';
import { ErrorState } from '@/components/ScreenState';
import { useAuth } from '@/context/AuthContext';

export default function NewsletterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { identity } = useAuth();
  const queryClient = useQueryClient();
  const query = useAdminListNewsletterSubscribers();
  const deleteSubscriber = useAdminDeleteNewsletterSubscriber();
  const topInset = insets.top < 67 ? 67 : insets.top;
  const bottomInset = insets.bottom < 34 ? 34 : insets.bottom;
  const canDelete = identity?.role === 'admin' || identity?.role === 'manager';
  const subscribers = query.data ?? [];

  const exportSubscribers = async () => {
    if (!subscribers.length) return;
    const csv = ['email,subscribed_at', ...subscribers.map((item) => `${item.email},${item.subscribedAt}`)].join('\n');
    await Share.share({ title: 'Newsletter subscribers', message: csv });
  };

  const removeSubscriber = (id: string, email: string) => {
    if (!canDelete) return;
    Alert.alert('Remove subscriber', `Remove ${email} from the newsletter list?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => deleteSubscriber.mutate({ id }, {
          onSuccess: () => void queryClient.invalidateQueries({ queryKey: getAdminListNewsletterSubscribersQueryKey() }),
          onError: (error) => Alert.alert('Could not remove subscriber', error instanceof Error ? error.message : 'The API rejected the removal.'),
        }),
      },
    ]);
  };

  if (query.isError) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <ErrorState message="We could not load newsletter subscribers." onRetry={() => void query.refetch()} />
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
            <Text style={[styles.kicker, { color: colors.secondary }]}>AUDIENCE</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>Newsletter</Text>
            <View style={styles.headerRow}>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                {subscribers.length} subscribers
              </Text>
              <Pressable
                disabled={!subscribers.length}
                onPress={() => void exportSubscribers()}
                style={[styles.exportButton, { borderColor: colors.border, opacity: subscribers.length ? 1 : 0.45 }]}
              >
                <Feather name="share-2" size={15} color={colors.primary} />
                <Text style={[styles.exportText, { color: colors.primary }]}>Share CSV</Text>
              </Pressable>
            </View>
          </View>
        }
        ListEmptyComponent={
          query.isLoading ? null : (
            <View style={styles.empty}>
              <Feather name="mail" size={28} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No subscribers yet</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                New newsletter signups will appear here.
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.icon, { backgroundColor: colors.accent }]}>
              <Feather name="mail" size={18} color={colors.primary} />
            </View>
            <View style={styles.copy}>
              <Text style={[styles.email, { color: colors.foreground }]} numberOfLines={1}>{item.email}</Text>
              <Text style={[styles.date, { color: colors.mutedForeground }]}>
                Joined {new Date(item.subscribedAt).toLocaleDateString()}
              </Text>
            </View>
            {canDelete ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove ${item.email}`}
                disabled={deleteSubscriber.isPending}
                onPress={() => removeSubscriber(item.id, item.email)}
                hitSlop={8}
              >
                <Feather name="trash-2" size={17} color={colors.destructive} />
              </Pressable>
            ) : null}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { marginBottom: 16, gap: 5 },
  kicker: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.7 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 28, letterSpacing: -0.5 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 13 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  exportButton: { borderWidth: 1, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
  exportText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  card: { minHeight: 70, borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 11 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, gap: 4 },
  email: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  date: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  empty: { alignItems: 'center', paddingVertical: 70, gap: 8 },
  emptyTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 17, marginTop: 5 },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 13, textAlign: 'center', lineHeight: 19 },
});