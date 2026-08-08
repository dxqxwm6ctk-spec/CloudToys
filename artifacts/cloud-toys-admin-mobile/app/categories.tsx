import React from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getAdminListCategoriesQueryKey,
  resolveMediaUrl,
  useAdminCreateCategory,
  useAdminDeleteCategory,
  useAdminListCategories,
  useAdminUpdateCategory,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';
import { ErrorState } from '@/components/ScreenState';
import { useAuth } from '@/context/AuthContext';
import { uploadAdminImage } from '@/lib/admin-api';

export default function CategoriesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { identity } = useAuth();
  const queryClient = useQueryClient();
  const query = useAdminListCategories();
  const createCategory = useAdminCreateCategory();
  const updateCategory = useAdminUpdateCategory();
  const deleteCategory = useAdminDeleteCategory();
  const [editing, setEditing] = React.useState<{ id?: string; name: string; slug: string; imageUrl: string } | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const topInset = insets.top < 67 ? 67 : insets.top;
  const bottomInset = insets.bottom < 34 ? 34 : insets.bottom;
  const canManage = identity?.role === 'admin' || identity?.role === 'manager';

  const saveCategory = () => {
    if (!editing?.name.trim() || !editing.slug.trim()) return;
    const data = { name: editing.name.trim(), slug: editing.slug.trim(), imageUrl: editing.imageUrl.trim() };
    const options = {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: getAdminListCategoriesQueryKey() });
        setEditing(null);
      },
      onError: (error: unknown) => Alert.alert(
        'Could not save category',
        error instanceof Error ? error.message : 'The API rejected this category.',
      ),
    };
    if (editing.id) updateCategory.mutate({ id: editing.id, data }, options);
    else createCategory.mutate({ data }, options);
  };

  const removeCategory = (id: string, name: string) => {
    Alert.alert('Delete category', `Delete "${name}"? Products in this category may be affected.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteCategory.mutate({ id }, {
          onSuccess: () => void queryClient.invalidateQueries({ queryKey: getAdminListCategoriesQueryKey() }),
          onError: (error: unknown) => Alert.alert(
            'Could not delete category',
            error instanceof Error ? error.message : 'The API rejected this deletion.',
          ),
        }),
      },
    ]);
  };

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
               {canManage ? (
                 <Pressable
                   accessibilityRole="button"
                   onPress={() => setEditing({ name: '', slug: '', imageUrl: '' })}
                   style={[styles.countBadge, { backgroundColor: colors.primary }]}
                 >
                   <Feather name="plus" size={20} color={colors.primaryForeground} />
                 </Pressable>
               ) : (
                 <View style={[styles.countBadge, { backgroundColor: colors.accent }]}>
                   <Feather name="folder" size={19} color={colors.primary} />
                 </View>
               )}
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
             {canManage ? (
               <View style={styles.actions}>
                 <Pressable onPress={() => setEditing({ id: item.id, name: item.name, slug: item.slug, imageUrl: item.imageUrl })} hitSlop={8}>
                   <Feather name="edit-2" size={16} color={colors.mutedForeground} />
                 </Pressable>
                 <Pressable onPress={() => removeCategory(item.id, item.name)} hitSlop={8}>
                   <Feather name="trash-2" size={16} color={colors.destructive} />
                 </Pressable>
               </View>
             ) : null}
          </View>
        )}
      />
      <Modal visible={Boolean(editing)} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setEditing(null)}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>{editing?.id ? 'Edit category' : 'New category'}</Text>
            <TextInput
              value={editing?.name ?? ''}
              onChangeText={(name) => setEditing((current) => current ? { ...current, name } : current)}
              placeholder="Category name"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.modalInput, { color: colors.foreground, borderColor: colors.input }]}
            />
            <TextInput
              value={editing?.slug ?? ''}
              onChangeText={(slug) => setEditing((current) => current ? { ...current, slug } : current)}
              placeholder="slug"
              autoCapitalize="none"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.modalInput, { color: colors.foreground, borderColor: colors.input }]}
            />
            <TextInput
              value={editing?.imageUrl ?? ''}
              onChangeText={(imageUrl) => setEditing((current) => current ? { ...current, imageUrl } : current)}
              placeholder="Image URL (optional)"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.modalInput, { color: colors.foreground, borderColor: colors.input }]}
            />
            <Pressable
              disabled={isUploading}
              onPress={async () => {
                const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (!permission.granted) {
                  Alert.alert('Photo access needed', 'Allow photo access to choose a category image.');
                  return;
                }
                const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
                if (result.canceled || !result.assets[0]) return;
                setIsUploading(true);
                try {
                  const uploaded = await uploadAdminImage({ uri: result.assets[0].uri, name: result.assets[0].fileName ?? 'category.jpg', type: result.assets[0].mimeType ?? 'image/jpeg' });
                  setEditing((current) => current ? { ...current, imageUrl: uploaded.mediumUrl } : current);
                } catch (uploadError) {
                  Alert.alert('Upload failed', uploadError instanceof Error ? uploadError.message : 'Could not upload image.');
                } finally {
                  setIsUploading(false);
                }
              }}
              style={[styles.uploadButton, { borderColor: colors.border }]}
            >
              {isUploading ? <ActivityIndicator color={colors.primary} /> : <Feather name="upload" size={16} color={colors.primary} />}
              <Text style={[styles.uploadText, { color: colors.primary }]}>{isUploading ? 'Uploading...' : 'Upload image'}</Text>
            </Pressable>
            <View style={styles.modalActions}>
              <Pressable onPress={() => setEditing(null)} style={[styles.modalButton, { borderColor: colors.border }]}>
                <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }}>Cancel</Text>
              </Pressable>
              <Pressable onPress={saveCategory} disabled={createCategory.isPending || updateCategory.isPending} style={[styles.modalButton, { backgroundColor: colors.primary }]}>
                {createCategory.isPending || updateCategory.isPending ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={{ color: colors.primaryForeground, fontFamily: 'Inter_600SemiBold' }}>Save</Text>}
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
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
  actions: { gap: 13, alignItems: 'center', marginLeft: 4 },
  empty: { alignItems: 'center', paddingVertical: 70, gap: 8 },
  emptyTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 17, marginTop: 5 },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 13, textAlign: 'center', lineHeight: 19 },
  modalBackdrop: { flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 12 },
  modalTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, marginBottom: 4 },
  modalInput: { minHeight: 48, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontFamily: 'Inter_400Regular', fontSize: 14 },
  uploadButton: { minHeight: 45, borderWidth: 1, borderRadius: 10, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  uploadText: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  modalButton: { minHeight: 46, flex: 1, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});