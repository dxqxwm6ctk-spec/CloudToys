import { FlatList, Image, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { resolveMediaUrl, useAdminListImages } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { ErrorState } from '@/components/ScreenState';

export default function ImagesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const query = useAdminListImages();
  const topInset = insets.top < 67 ? 67 : insets.top;
  const bottomInset = insets.bottom < 34 ? 34 : insets.bottom;

  if (query.isError) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <ErrorState message="We could not load uploaded images." onRetry={() => void query.refetch()} />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <FlatList
        data={query.data?.items ?? []}
        keyExtractor={(item) => item.path}
        contentContainerStyle={{ paddingTop: topInset + 16, paddingBottom: bottomInset + 24 }}
        showsVerticalScrollIndicator={false}
        refreshing={query.isFetching && !query.isLoading}
        onRefresh={() => void query.refetch()}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={[styles.kicker, { color: colors.secondary }]}>MEDIA LIBRARY</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>Images</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              {query.data?.total ?? 0} stored image groups
            </Text>
          </View>
        }
        ListEmptyComponent={
          query.isLoading ? null : (
            <View style={styles.empty}>
              <Feather name="image" size={28} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No images uploaded</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                Product images will appear here after they are uploaded.
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Image
              source={{ uri: resolveMediaUrl(item.publicUrl) ?? undefined }}
              style={[styles.image, { backgroundColor: colors.muted }]}
              resizeMode="cover"
            />
            <View style={styles.copy}>
              <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                {item.mimeType ?? 'Unknown format'} · {item.variantCount} variants
              </Text>
              <Text style={[styles.meta, { color: item.used ? colors.secondaryForeground : colors.mutedForeground }]}>
                {item.used ? `Used by ${item.products.length} product${item.products.length === 1 ? '' : 's'}` : 'Not linked to a product'}
              </Text>
            </View>
            <Feather name={item.used ? 'link' : 'link-2'} size={17} color={item.used ? colors.secondary : colors.mutedForeground} />
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
  card: { minHeight: 88, borderWidth: 1, borderRadius: 14, padding: 10, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
  image: { width: 66, height: 66, borderRadius: 10 },
  copy: { flex: 1, gap: 5 },
  name: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  meta: { fontFamily: 'Inter_400Regular', fontSize: 11 },
  empty: { alignItems: 'center', paddingVertical: 70, gap: 8 },
  emptyTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 17, marginTop: 5 },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 13, textAlign: 'center', lineHeight: 19 },
});