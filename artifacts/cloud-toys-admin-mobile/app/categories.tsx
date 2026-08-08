import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAdminListCategories, resolveMediaUrl } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { ErrorState } from '@/components/ScreenState';

export default function CategoriesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const query = useAdminListCategories();
  const topInset = insets.top < 67 ? 67 : insets.top;
  const bottomInset = insets.bottom < 34 ? 34 : insets.bottom;

  if (query.isError) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <ErrorState message="We could not load your categories." onRetry={() => void query.refetch()} />
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
            <View style={styles.titleRow}>
              <View>
                <Text style={[styles.kicker, { color: colors.secondary }]}>CATALOG</Text>
                <Text style={[styles.title, { color: colors.foreground }]}>Categories</Text>
                <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                  Organize the products in your store.
                </Text>
              </View>
              <View style={[styles.countBadge, { backgroundColor: colors.accent }]}>
                <Feather name="folder" size={19} color={colors.primary} />
              </View>
            </View>
            {query.isLoading ? (
              <ActivityIndicator style={styles.loader} color={colors.primary} />
            ) : null}
          </View>
        }
        ListEmptyComponent={
          query.isLoading ? null : (
            <View style={styles.empty}>
              <Feather name="folder" size={28} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No categories yet</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                Categories will appear here once they are created.
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Image
              source={{ uri: resolveMediaUrl(item.imageUrl) ?? undefined }}
              style={[styles.image, { backgroundColor: colors.muted }]}
              resizeMode="cover"
            />
            <View style={styles.copy}>
              <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={[styles.slug, { color: colors.mutedForeground }]} numberOfLines={1}>
                /{item.slug}
              </Text>
            </View>
            <View style={[styles.productCount, { backgroundColor: colors.accent }]}>
              <Text style={[styles.productCountValue, { color: colors.secondaryForeground }]}>
                {item.productCount}
              </Text>
              <Text style={[styles.productCountLabel, { color: colors.secondaryForeground }]}>products</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { gap: 16, marginBottom: 14 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  kicker: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.7, marginBottom: 6 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 28, letterSpacing: -0.5 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 13, marginTop: 4 },
  countBadge: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  loader: { alignSelf: 'flex-start' },
  card: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14, padding: 10, marginBottom: 10, gap: 12 },
  image: { width: 58, height: 58, borderRadius: 10 },
  copy: { flex: 1, gap: 5 },
  name: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  slug: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  productCount: { minWidth: 64, borderRadius: 9, alignItems: 'center', paddingHorizontal: 8, paddingVertical: 7 },
  productCountValue: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  productCountLabel: { fontFamily: 'Inter_500Medium', fontSize: 9, marginTop: 1 },
  empty: { alignItems: 'center', paddingVertical: 70, gap: 8 },
  emptyTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 17, marginTop: 5 },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 13, textAlign: 'center', lineHeight: 19 },
});