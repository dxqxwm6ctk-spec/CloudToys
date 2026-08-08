import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getAdminListCategoriesQueryKey,
  getAdminListProductsQueryKey,
  getGetProductQueryKey,
  resolveMediaUrl,
  useAdminCreateProduct,
  useAdminListCategories,
  useAdminUpdateProduct,
  useGetProduct,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { uploadAdminImage } from '@/lib/admin-api';
import { useColors } from '@/hooks/useColors';
import { ErrorState, LoadingState } from '@/components/ScreenState';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useAuth } from '@/context/AuthContext';

type FormState = {
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  price: string;
  compareAtPrice: string;
  currency: string;
  imageUrl: string;
  categoryId: string;
  stockQuantity: string;
  badge: string;
  features: string;
};

const emptyForm: FormState = {
  name: '',
  slug: '',
  shortDescription: '',
  description: '',
  price: '',
  compareAtPrice: '',
  currency: 'JOD',
  imageUrl: '',
  categoryId: '',
  stockQuantity: '0',
  badge: '',
  features: '',
};

function Field({
  label,
  value,
  onChangeText,
  colors,
  multiline = false,
  keyboardType,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  colors: ReturnType<typeof useColors>;
  multiline?: boolean;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad';
  placeholder?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        keyboardType={keyboardType}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={[
          styles.input,
          multiline && styles.textarea,
          { color: colors.foreground, borderColor: colors.input, backgroundColor: colors.card },
        ]}
      />
    </View>
  );
}

export default function ProductFormScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ id?: string }>();
  const productId = typeof params.id === 'string' ? params.id : undefined;
  const isEdit = Boolean(productId);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const { identity } = useAuth();

  const categoriesQuery = useAdminListCategories();
  const productQuery = useGetProduct(productId ?? '', {
    query: { enabled: Boolean(productId) },
  });
  const createProduct = useAdminCreateProduct();
  const updateProduct = useAdminUpdateProduct();

  useEffect(() => {
    if (!productQuery.data || !categoriesQuery.data) return;
    const product = productQuery.data;
    const category = categoriesQuery.data.find((item) => item.slug === product.categorySlug);
    setForm({
      name: product.name,
      slug: product.slug,
      shortDescription: product.shortDescription,
      description: product.description,
      price: String(product.price),
      compareAtPrice: product.compareAtPrice == null ? '' : String(product.compareAtPrice),
      currency: product.currency,
      imageUrl: product.imageUrl,
      categoryId: category?.id ?? '',
      stockQuantity: String(product.stockQuantity),
      badge: product.badge ?? '',
      features: product.features?.join(', ') ?? '',
    });
  }, [productQuery.data, categoriesQuery.data]);

  const topInset = Math.max(insets.top, 18);
  const bottomInset = Math.max(insets.bottom, 24);
  const isSaving = createProduct.isPending || updateProduct.isPending;
  const isLoading = categoriesQuery.isLoading || (isEdit && productQuery.isLoading);
  const categoryName = useMemo(
    () => categoriesQuery.data?.find((category) => category.id === form.categoryId)?.name,
    [categoriesQuery.data, form.categoryId],
  );
  const canManageProducts = identity?.role === 'admin' || identity?.role === 'manager';

  const set = (key: keyof FormState) => (value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setError('');
  };

  const chooseImage = async (source: 'library' | 'camera') => {
    setIsPickerOpen(false);
    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.85 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setIsUploading(true);
    setError('');
    try {
      const uploaded = await uploadAdminImage(
        { uri: asset.uri, name: asset.fileName ?? 'product-image.jpg', type: asset.mimeType ?? 'image/jpeg' },
        productId ?? 'unassigned',
      );
      setForm((current) => ({ ...current, imageUrl: uploaded.mediumUrl }));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Image upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const save = () => {
    const price = Number(form.price);
    const stockQuantity = Number(form.stockQuantity);
    if (!form.name.trim() || !form.slug.trim() || !form.shortDescription.trim() || !form.description.trim()) {
      setError('Complete the product name, slug, short description, and description.');
      return;
    }
    if (!form.categoryId) {
      setError('Choose a category before saving.');
      return;
    }
    if (!Number.isFinite(price) || price <= 0 || !Number.isInteger(stockQuantity) || stockQuantity < 0) {
      setError('Enter a valid price and stock quantity.');
      return;
    }
    if (!form.imageUrl.trim()) {
      setError('Add a product image URL or upload an image.');
      return;
    }

    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      shortDescription: form.shortDescription.trim(),
      description: form.description.trim(),
      price,
      compareAtPrice: form.compareAtPrice.trim() ? Number(form.compareAtPrice) : null,
      currency: form.currency.trim().toUpperCase() || 'JOD',
      imageUrl: form.imageUrl.trim(),
      categoryId: form.categoryId,
      stockQuantity,
      badge: form.badge || null,
      features: form.features.split(',').map((feature) => feature.trim()).filter(Boolean),
    };

    const options = {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: getAdminListProductsQueryKey() });
        void queryClient.invalidateQueries({ queryKey: getAdminListCategoriesQueryKey() });
        if (productId) void queryClient.invalidateQueries({ queryKey: getGetProductQueryKey(productId) });
        router.back();
      },
      onError: (saveError: unknown) => {
        setError(saveError instanceof Error ? saveError.message : 'Could not save the product.');
      },
    };

    if (productId) {
      updateProduct.mutate({ id: productId, data: payload }, options);
    } else {
      createProduct.mutate({ data: payload }, options);
    }
  };

  if (isLoading) return <LoadingState label={isEdit ? 'Loading product...' : 'Loading categories...'} />;
  if (!canManageProducts) {
    return <ErrorState message="Only admins and managers can create or edit products." onRetry={() => router.back()} />;
  }
  if (categoriesQuery.isError || (isEdit && productQuery.isError)) {
    return <ErrorState message="We could not load the product form." onRetry={() => void categoriesQuery.refetch()} />;
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={{ paddingTop: topInset + 12, paddingBottom: bottomInset + 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} hitSlop={10}>
              <Feather name="arrow-left" size={22} color={colors.foreground} />
            </Pressable>
            <View style={styles.headerCopy}>
              <Text style={[styles.kicker, { color: colors.secondary }]}>CATALOG</Text>
              <Text style={[styles.title, { color: colors.foreground }]}>{isEdit ? 'Edit product' : 'Add product'}</Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                Keep your catalog accurate and ready for customers.
              </Text>
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Product image</Text>
            <Pressable
              onPress={() => setIsPickerOpen(true)}
              disabled={isUploading}
              style={[styles.imagePicker, { backgroundColor: colors.muted, borderColor: colors.border }]}
            >
              {form.imageUrl ? (
                <Image source={{ uri: resolveMediaUrl(form.imageUrl) ?? form.imageUrl }} style={styles.preview} resizeMode="cover" />
              ) : (
                <>
                  <Feather name="camera" size={25} color={colors.primary} />
                  <Text style={[styles.imageText, { color: colors.primary }]}>Choose or take a photo</Text>
                </>
              )}
              {isUploading ? <ActivityIndicator style={styles.imageLoader} color={colors.primary} /> : null}
            </Pressable>
            <Field label="Image URL" value={form.imageUrl} onChangeText={set('imageUrl')} colors={colors} placeholder="https://..." />
          </View>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Details</Text>
            <Field label="Name" value={form.name} onChangeText={set('name')} colors={colors} placeholder="Classic wooden train" />
            <Field label="Slug" value={form.slug} onChangeText={set('slug')} colors={colors} placeholder="classic-wooden-train" />
            <Field label="Short description" value={form.shortDescription} onChangeText={set('shortDescription')} colors={colors} multiline />
            <Field label="Description" value={form.description} onChangeText={set('description')} colors={colors} multiline />
            <Field label="Features" value={form.features} onChangeText={set('features')} colors={colors} placeholder="Safe, wooden, educational" />
          </View>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Pricing & stock</Text>
            <View style={styles.row}>
              <View style={styles.half}>
                <Field label="Price" value={form.price} onChangeText={set('price')} colors={colors} keyboardType="decimal-pad" />
              </View>
              <View style={styles.half}>
                <Field label="Compare at" value={form.compareAtPrice} onChangeText={set('compareAtPrice')} colors={colors} keyboardType="decimal-pad" />
              </View>
            </View>
            <View style={styles.row}>
              <View style={styles.half}>
                <Field label="Currency" value={form.currency} onChangeText={set('currency')} colors={colors} />
              </View>
              <View style={styles.half}>
                <Field label="Stock quantity" value={form.stockQuantity} onChangeText={set('stockQuantity')} colors={colors} keyboardType="numeric" />
              </View>
            </View>
            <Text style={[styles.label, { color: colors.foreground }]}>Category</Text>
            <View style={styles.categoryWrap}>
              {categoriesQuery.data?.map((category) => {
                const selected = category.id === form.categoryId;
                return (
                  <Pressable
                    key={category.id}
                    onPress={() => set('categoryId')(category.id)}
                    style={[
                      styles.categoryChip,
                      { backgroundColor: selected ? colors.primary : colors.muted, borderColor: selected ? colors.primary : colors.border },
                    ]}
                  >
                    <Text style={{ color: selected ? colors.primaryForeground : colors.foreground, fontFamily: 'Inter_500Medium', fontSize: 12 }}>
                      {category.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {categoryName ? <Text style={[styles.helper, { color: colors.mutedForeground }]}>Selected: {categoryName}</Text> : null}
            <Field label="Badge" value={form.badge} onChangeText={set('badge')} colors={colors} placeholder="new, sale, bestseller" />
          </View>

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: colors.accent }]}>
              <Feather name="alert-circle" size={17} color={colors.destructive} />
              <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
            </View>
          ) : null}

          <Pressable
            onPress={save}
            disabled={isSaving || isUploading}
            style={({ pressed }) => [styles.saveButton, { backgroundColor: colors.primary, opacity: pressed || isSaving || isUploading ? 0.78 : 1 }]}
          >
            {isSaving ? <ActivityIndicator color={colors.primaryForeground} /> : <Feather name="save" size={17} color={colors.primaryForeground} />}
            <Text style={[styles.saveText, { color: colors.primaryForeground }]}>{isEdit ? 'Save changes' : 'Create product'}</Text>
          </Pressable>
        </View>
      </KeyboardAwareScrollViewCompat>

      <Modal visible={isPickerOpen} transparent animationType="slide" onRequestClose={() => setIsPickerOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setIsPickerOpen(false)}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Product image</Text>
            <Pressable style={styles.modalAction} onPress={() => void chooseImage('library')}>
              <Feather name="image" size={19} color={colors.primary} />
              <Text style={[styles.modalActionText, { color: colors.foreground }]}>Choose from library</Text>
            </Pressable>
            <Pressable style={styles.modalAction} onPress={() => void chooseImage('camera')}>
              <Feather name="camera" size={19} color={colors.primary} />
              <Text style={[styles.modalActionText, { color: colors.foreground }]}>Take a photo</Text>
            </Pressable>
            <Pressable style={[styles.modalCancel, { borderColor: colors.border }]} onPress={() => setIsPickerOpen(false)}>
              <Text style={[styles.modalCancelText, { color: colors.mutedForeground }]}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 18, gap: 14 },
  header: { flexDirection: 'row', gap: 13, alignItems: 'flex-start', marginBottom: 4 },
  headerCopy: { flex: 1, gap: 4 },
  kicker: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.7 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 28, letterSpacing: -0.5 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19 },
  card: { borderWidth: 1, borderRadius: 14, padding: 15, gap: 14 },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 17 },
  field: { gap: 7 },
  label: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  input: { minHeight: 46, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontFamily: 'Inter_400Regular', fontSize: 14 },
  textarea: { minHeight: 88, paddingTop: 12 },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  imagePicker: { minHeight: 165, borderWidth: 1, borderRadius: 12, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', gap: 9 },
  preview: { width: '100%', height: '100%', minHeight: 165 },
  imageText: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  imageLoader: { position: 'absolute' },
  categoryWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  helper: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: -6 },
  errorBox: { borderRadius: 10, padding: 12, flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  errorText: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 13, lineHeight: 19 },
  saveButton: { minHeight: 52, borderRadius: 11, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 2 },
  saveText: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  modalBackdrop: { flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 12 },
  modalTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, marginBottom: 4 },
  modalAction: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 11 },
  modalActionText: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  modalCancel: { minHeight: 46, borderWidth: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  modalCancelText: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
});