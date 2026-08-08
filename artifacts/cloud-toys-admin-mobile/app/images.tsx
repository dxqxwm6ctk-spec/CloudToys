import React from 'react';
import { Alert, FlatList, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getAdminListImagesQueryKey,
  resolveMediaUrl,
  useAdminDeleteImage,
  useAdminListImages,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';
import { ErrorState } from '@/components/ScreenState';
import { useAuth } from '@/context/AuthContext';

export default function ImagesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { identity } = useAuth();
  const queryClient = useQueryClient();
  const query = useAdminListImages();
  const deleteImage = useAdminDeleteImage();
  const [previewPath, setPreviewPath] = React.useState<string | null>(null);
  const topInset = insets.top < 67 ? 67 : insets.top;
  const bottomInset = insets.bottom < 34 ? 34 : insets.bottom;
  const canDelete = identity?.role === 'admin' || identity?.role === 'manager';
  const preview = query.data?.items.find((item) => item.path === previewPath) ?? null;

  const removeImage = (image: NonNullable<typeof preview>) => {
    if (!canDelete) return;
    Alert.alert(
      'Delete image',
      image.used
        ? `This image is used by ${image.products.map((product) => product.name).join(', ')}. Delete all stored variants anyway?`
        : 'Delete all stored variants of this image? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteImage.mutate(
              { params: { path: image.path, confirmUsed: image.used } },
              {
                onSuccess: () => {
                  setPreviewPath(null);
                  void queryClient.invalidateQueries({ queryKey: getAdminListImagesQueryKey() });
                },
                onError: (error) => Alert.alert(
                  'Could not delete image',
                  error instanceof Error ? error.message : 'The API rejected the deletion.',
                ),
              },
            );
          },
        },
      ],
    );
  };

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
          <Pressable
            onPress={() => setPreviewPath(item.path)}
            style={({ pressed }) => [
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.78 : 1 },
            ]}
          >
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
            <Feather name="chevron-right" size={17} color={colors.mutedForeground} />
          </Pressable>
        )}
      />
      <Modal visible={Boolean(preview)} transparent animationType="fade" onRequestClose={() => setPreviewPath(null)}>
        <View style={styles.previewBackdrop}>
          <View style={[styles.previewCard, { backgroundColor: colors.card }]}>
            {preview ? (
              <>
                <View style={styles.previewHeader}>
                  <Text style={[styles.previewTitle, { color: colors.foreground }]} numberOfLines={1}>
                    {preview.name}
                  </Text>
                  <Pressable onPress={() => setPreviewPath(null)} hitSlop={10}>
                    <Feather name="x" size={22} color={colors.mutedForeground} />
                  </Pressable>
                </View>
                <Image source={{ uri: resolveMediaUrl(preview.publicUrl) ?? undefined }} style={styles.previewImage} resizeMode="contain" />
                <Text style={[styles.previewMeta, { color: colors.mutedForeground }]}>
                  {preview.mimeType ?? 'Unknown format'} · {preview.variantCount} variants
                </Text>
                {preview.used ? (
                  <Text style={[styles.previewMeta, { color: colors.secondaryForeground }]}>
                    Used by {preview.products.map((product) => product.name).join(', ')}
                  </Text>
                ) : null}
                {canDelete ? (
                  <Pressable
                    disabled={deleteImage.isPending}
                    onPress={() => removeImage(preview)}
                    style={[styles.deleteButton, { backgroundColor: colors.destructive, opacity: deleteImage.isPending ? 0.65 : 1 }]}
                  >
                    <Feather name="trash-2" size={16} color={colors.destructiveForeground} />
                    <Text style={[styles.deleteText, { color: colors.destructiveForeground }]}>
                      {deleteImage.isPending ? 'Deleting...' : 'Delete image'}
                    </Text>
                  </Pressable>
                ) : null}
              </>
            ) : null}
          </View>
        </View>
      </Modal>
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
  previewBackdrop: { flex: 1, backgroundColor: '#000000aa', justifyContent: 'center', padding: 18 },
  previewCard: { borderRadius: 18, padding: 16, gap: 10 },
  previewHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  previewTitle: { flex: 1, fontFamily: 'Inter_700Bold', fontSize: 17 },
  previewImage: { width: '100%', height: 300, borderRadius: 12, backgroundColor: '#00000011' },
  previewMeta: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18 },
  deleteButton: { minHeight: 46, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginTop: 4 },
  deleteText: { fontFamily: 'Inter_700Bold', fontSize: 13 },
});