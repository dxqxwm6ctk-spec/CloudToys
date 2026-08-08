import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAdminListProducts, resolveMediaUrl } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { ErrorState } from '@/components/ScreenState';

const PAGE_SIZE = 10;

export default function ProductsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const query = useAdminListProducts({
    search: search.trim() || undefined,
    page,
    pageSize: PAGE_SIZE,
  });
  const products = query.data?.items ?? [];
  const totalPages = Math.max(1, Math.ceil((query.data?.total ?? 0) / PAGE_SIZE));
  const topInset = insets.top < 67 ? 67 : insets.top;
  const bottomInset = insets.bottom < 34 ? 34 : insets.bottom;

  if (query.isError) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <ErrorState message="We could not load your products." onRetry={() => void query.refetch()} />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingTop: topInset + 16, paddingBottom: bottomInset + 90 }}
        showsVerticalScrollIndicator={false}
        refreshing={query.isFetching && !query.isLoading}
        onRefresh={() => void query.refetch()}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View>
                <Text style={[styles.kicker, { color: colors.secondary }]}>CATALOG</Text>
                <Text style={[styles.title, { color: colors.foreground }]}>Products</Text>
                <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                  {query.data?.total ?? 0} items in your store
                </Text>
              </View>
              <View style={[styles.countBadge, { backgroundColor: colors.accent }]}>
                <Feather name="package" size={19} color={colors.primary} />
              </View>
            </View>
            <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.input }]}>
              <Feather name="search" size={18} color={colors.mutedForeground} />
              <TextInput
                testID="products-search"
                value={search}
                onChangeText={(value) => {
                  setSearch(value);
                  setPage(1);
                }}
                placeholder="Search products"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.searchInput, { color: colors.foreground }]}
                returnKeyType="search"
                autoCapitalize="none"
              />
              {search ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Clear search"
                  onPress={() => {
                    setSearch('');
                    setPage(1);
                  }}
                  hitSlop={10}
                >
                  <Feather name="x-circle" size={17} color={colors.mutedForeground} />
                </Pressable>
              ) : null}
            </View>
            {query.isLoading ? (
              <ActivityIndicator style={styles.headerLoader} color={colors.primary} />
            ) : null}
          </View>
        }
        ListEmptyComponent={
          query.isLoading ? null : (
            <View style={styles.empty}>
              <Feather name="package" size={28} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No products found</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                Try a different search term.
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <View style={[styles.productCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Image
              source={{ uri: resolveMediaUrl(item.thumbUrl ?? item.imageUrl) ?? undefined }}
              style={[styles.productImage, { backgroundColor: colors.muted }]}
              resizeMode="cover"
            />
            <View style={styles.productCopy}>
              <Text style={[styles.productName, { color: colors.foreground }]} numberOfLines={2}>
                {item.name}
              </Text>
              <Text style={[styles.category, { color: colors.mutedForeground }]} numberOfLines={1}>
                {item.categoryName}
              </Text>
              <View style={styles.productMeta}>
                <Text style={[styles.price, { color: colors.primary }]}>
                  {item.price.toFixed(2)} {item.currency}
                </Text>
                <View style={[styles.stockPill, { backgroundColor: item.inStock ? colors.accent : colors.muted }]}>
                  <View style={[styles.stockDot, { backgroundColor: item.inStock ? colors.secondary : colors.destructive }]} />
                  <Text style={[styles.stockText, { color: item.inStock ? colors.secondaryForeground : colors.destructive }]}>
                    {item.inStock ? `${item.stockQuantity} in stock` : 'Out of stock'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}
        ListFooterComponent={
          <View style={styles.pagination}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous products page"
              disabled={page <= 1}
              onPress={() => setPage((value) => Math.max(1, value - 1))}
              style={[styles.pageButton, { borderColor: colors.border, opacity: page <= 1 ? 0.35 : 1 }]}
            >
              <Feather name="chevron-left" size={18} color={colors.foreground} />
            </Pressable>
            <Text style={[styles.pageText, { color: colors.mutedForeground }]}>
              Page {page} of {totalPages}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next products page"
              disabled={page >= totalPages}
              onPress={() => setPage((value) => Math.min(totalPages, value + 1))}
              style={[styles.pageButton, { borderColor: colors.border, opacity: page >= totalPages ? 0.35 : 1 }]}
            >
              <Feather name="chevron-right" size={18} color={colors.foreground} />
            </Pressable>
          </View>
        }
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
  searchBox: { minHeight: 50, borderRadius: 11, borderWidth: 1, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchInput: { flex: 1, minHeight: 48, fontFamily: 'Inter_400Regular', fontSize: 14 },
  headerLoader: { alignSelf: 'flex-start' },
  productCard: { flexDirection: 'row', borderWidth: 1, borderRadius: 14, padding: 10, marginBottom: 10, gap: 12 },
  productImage: { width: 76, height: 76, borderRadius: 10 },
  productCopy: { flex: 1, justifyContent: 'center', gap: 4 },
  productName: { fontFamily: 'Inter_600SemiBold', fontSize: 15, lineHeight: 20 },
  category: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  productMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 3 },
  price: { fontFamily: 'Inter_700Bold', fontSize: 13 },
  stockPill: { flexDirection: 'row', alignItems: 'center', borderRadius: 7, paddingHorizontal: 7, paddingVertical: 4, gap: 5 },
  stockDot: { width: 6, height: 6, borderRadius: 3 },
  stockText: { fontFamily: 'Inter_500Medium', fontSize: 10 },
  empty: { alignItems: 'center', paddingVertical: 70, gap: 8 },
  emptyTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 17, marginTop: 5 },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 13 },
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18, paddingVertical: 16 },
  pageButton: { width: 38, height: 38, borderWidth: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  pageText: { fontFamily: 'Inter_500Medium', fontSize: 13 },
});