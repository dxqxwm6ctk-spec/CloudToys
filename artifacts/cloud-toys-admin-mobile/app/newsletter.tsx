import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAdminListNewsletterSubscribers } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { ErrorState } from '@/components/ScreenState';

export default function NewsletterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const query = useAdminListNewsletterSubscribers();
  const topInset = insets.top < 67 ? 67 : insets.top;
  const bottomInset = insets.bottom < 34 ? 34 : insets.bottom;

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
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              {query.data?.length ?? 0} subscribers
            </Text>
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
  card: { minHeight: 70, borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 11 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, gap: 4 },
  email: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  date: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  empty: { alignItems: 'center', paddingVertical: 70, gap: 8 },
  emptyTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 17, marginTop: 5 },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 13, textAlign: 'center', lineHeight: 19 },
});