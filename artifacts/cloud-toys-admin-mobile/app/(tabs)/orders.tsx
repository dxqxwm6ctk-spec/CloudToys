import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getGetProductQueryOptions,
  getAdminListOrdersQueryKey,
  resolveMediaUrl,
  useAdminListOrders,
  useAdminUpdateOrderStatus,
} from '@workspace/api-client-react';
import type { AdminOrder } from '@workspace/api-client-react';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';
import { ErrorState } from '@/components/ScreenState';

const PAGE_SIZE = 10;
const STATUS_FILTERS = ['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'];

function statusColor(status: string, colors: ReturnType<typeof useColors>): string {
  if (status === 'delivered') return colors.secondary;
  if (status === 'cancelled') return colors.destructive;
  return colors.primary;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function OrderDetailModal({
  order,
  colors,
  bottomInset,
  onClose,
  onEditDelivery,
  onChangeStatus,
}: {
  order: AdminOrder | null;
  colors: ReturnType<typeof useColors>;
  bottomInset: number;
  onClose: () => void;
  onEditDelivery: () => void;
  onChangeStatus: (status: string) => void;
}) {
  const productQueries = useQueries({
    queries: (order?.items ?? []).map((item) =>
      getGetProductQueryOptions(item.productId, {
        query: { enabled: Boolean(order) },
      }),
    ),
  });

  if (!order) return null;

  const itemCount = order.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  const orderStatusColor = statusColor(order.status, colors);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.modalBackdrop, { backgroundColor: `${colors.foreground}66` }]}>
        <View style={[styles.detailsSheet, { backgroundColor: colors.background }]}>
          <View style={styles.detailsHeader}>
            <View style={styles.detailsHeaderCopy}>
              <Text style={[styles.detailsKicker, { color: colors.secondary }]}>ORDER DETAILS</Text>
              <Text style={[styles.detailsTitle, { color: colors.foreground }]}>#{order.orderNumber}</Text>
              <Text style={[styles.detailsSubtitle, { color: colors.mutedForeground }]}>
                {formatDate(order.createdAt)}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close order details"
              hitSlop={10}
              onPress={onClose}
              style={styles.closeButton}
            >
              <Feather name="x" size={22} color={colors.foreground} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: bottomInset + 22 }}
          >
            <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.summaryTop}>
                <View>
                  <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Status</Text>
                  <View style={[styles.statusPill, { backgroundColor: colors.accent, alignSelf: 'flex-start', marginTop: 6 }]}>
                    <View style={[styles.statusDot, { backgroundColor: orderStatusColor }]} />
                    <Text style={[styles.statusText, { color: orderStatusColor }]}>{order.status}</Text>
                  </View>
                </View>
                <View style={styles.summaryMetric}>
                  <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Total</Text>
                  <Text style={[styles.detailsTotal, { color: colors.primary }]}>
                    {order.total == null ? '—' : `${order.total.toFixed(2)} JOD`}
                  </Text>
                </View>
              </View>
              <View style={[styles.detailGridDivider, { backgroundColor: colors.border }]} />
              <View style={styles.detailGrid}>
                <DetailRow label="Customer" value={order.customerName ?? '—'} colors={colors} />
                <DetailRow label="Phone" value={order.customerPhone ?? '—'} colors={colors} />
                <DetailRow label="Payment" value={order.paymentMethod ?? '—'} colors={colors} />
                <DetailRow label="Items" value={`${itemCount} item${itemCount === 1 ? '' : 's'}`} colors={colors} />
                <DetailRow label="Delivery" value={order.estimatedDelivery || 'Pending'} colors={colors} />
                <DetailRow label="Shipping fee" value={order.shippingFee == null ? '—' : `${order.shippingFee.toFixed(2)} JOD`} colors={colors} />
              </View>
              <View style={styles.addressBlock}>
                <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Shipping address</Text>
                <Text style={[styles.addressText, { color: colors.foreground }]}>{order.shippingAddress ?? '—'}</Text>
              </View>
            </View>

            <Text style={[styles.productsSectionTitle, { color: colors.foreground }]}>
              Products ({order.items?.length ?? 0})
            </Text>
            {(order.items ?? []).map((item, index) => {
              const productQuery = productQueries[index];
              const product = productQuery?.data;
              const imageUrl = resolveMediaUrl(product?.largeUrl ?? product?.mediumUrl ?? product?.imageUrl);
              const gallery = (product?.galleryUrls ?? []).filter((url) => url !== imageUrl);
              const lineTotal = item.price * item.quantity;

              return (
                <View key={`${item.productId}-${index}`} style={[styles.productDetailCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  {productQuery?.isLoading ? (
                    <View style={[styles.productImagePlaceholder, { backgroundColor: colors.muted }]}>
                      <ActivityIndicator color={colors.primary} />
                    </View>
                  ) : imageUrl ? (
                    <Image
                      source={{ uri: imageUrl }}
                      accessibilityLabel={product?.imageAlt ?? item.name}
                      style={[styles.productDetailImage, { backgroundColor: colors.muted }]}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.productImagePlaceholder, { backgroundColor: colors.muted }]}>
                      <Feather name="image" size={25} color={colors.mutedForeground} />
                    </View>
                  )}

                  <View style={styles.productDetailCopy}>
                    <View style={styles.productDetailTitleRow}>
                      <Text style={[styles.productDetailName, { color: colors.foreground }]}>{product?.name ?? item.name}</Text>
                      {product?.badge ? (
                        <View style={[styles.productBadge, { backgroundColor: colors.accent }]}>
                          <Text style={[styles.productBadgeText, { color: colors.accentForeground }]}>{product.badge}</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={[styles.productDetailMeta, { color: colors.mutedForeground }]}>
                      {product?.categoryName ?? 'Product'} · Quantity {item.quantity}
                    </Text>
                    <Text style={[styles.productDetailPrice, { color: colors.primary }]}>
                      {item.price.toFixed(2)} JOD each · {lineTotal.toFixed(2)} JOD total
                    </Text>

                    {productQuery?.isError ? (
                      <Text style={[styles.productUnavailable, { color: colors.mutedForeground }]}>
                        Full product details are unavailable, but the saved order item is shown above.
                      </Text>
                    ) : product ? (
                      <>
                        <Text style={[styles.productShortDescription, { color: colors.mutedForeground }]}>
                          {product.shortDescription}
                        </Text>
                        <Text style={[styles.productDescription, { color: colors.foreground }]}>
                          {product.description}
                        </Text>
                          <View style={[styles.productStats, { borderTopColor: colors.border }]}>
                          <DetailRow label="Catalog price" value={`${product.price.toFixed(2)} ${product.currency}`} colors={colors} />
                          <DetailRow label="Availability" value={product.inStock ? `${product.stockQuantity} in stock` : 'Out of stock'} colors={colors} />
                          <DetailRow label="Rating" value={`${product.rating.toFixed(1)} (${product.reviewCount} reviews)`} colors={colors} />
                          <DetailRow label="Slug" value={product.slug} colors={colors} />
                        </View>
                        {product.features.length > 0 ? (
                          <View style={styles.featuresBlock}>
                            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Features</Text>
                            {product.features.map((feature) => (
                              <View key={feature} style={styles.featureRow}>
                                <Feather name="check" size={14} color={colors.secondary} />
                                <Text style={[styles.featureText, { color: colors.foreground }]}>{feature}</Text>
                              </View>
                            ))}
                          </View>
                        ) : null}
                        {gallery.length > 0 ? (
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gallery}>
                            {gallery.map((url) => (
                              <Image
                                key={url}
                                source={{ uri: resolveMediaUrl(url) ?? undefined }}
                                style={[styles.galleryImage, { backgroundColor: colors.muted }]}
                                resizeMode="cover"
                              />
                            ))}
                          </ScrollView>
                        ) : null}
                        {product.reviews.length > 0 ? (
                          <View style={styles.reviewsBlock}>
                            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Recent reviews</Text>
                            {product.reviews.slice(0, 3).map((review) => (
                              <View key={review.id} style={[styles.reviewRow, { borderTopColor: colors.border }]}>
                                <Text style={[styles.reviewAuthor, { color: colors.foreground }]}>{review.author} · {review.rating}/5</Text>
                                <Text style={[styles.reviewText, { color: colors.mutedForeground }]}>{review.comment}</Text>
                              </View>
                            ))}
                          </View>
                        ) : null}
                      </>
                    ) : null}
                  </View>
                </View>
              );
            })}

            <View style={[styles.trackingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.productsSectionTitle, { color: colors.foreground, marginTop: 0 }]}>Tracking</Text>
              {order.steps.map((step) => (
                <View key={step.label} style={styles.trackingRow}>
                  <Feather name={step.completed ? 'check-circle' : 'circle'} size={17} color={step.completed ? colors.secondary : colors.mutedForeground} />
                  <View style={styles.trackingCopy}>
                    <Text style={[styles.trackingLabel, { color: colors.foreground }]}>{step.label}</Text>
                    {step.date ? <Text style={[styles.trackingDate, { color: colors.mutedForeground }]}>{formatDate(step.date)}</Text> : null}
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.orderActions}>
              <Pressable
                accessibilityRole="button"
                onPress={onEditDelivery}
                style={[styles.actionButton, { borderColor: colors.border }]}
              >
                <Feather name="calendar" size={16} color={colors.foreground} />
                <Text style={[styles.actionButtonText, { color: colors.foreground }]}>Edit delivery</Text>
              </Pressable>
              {order.status !== 'processing' ? <StatusAction label="Processing" status="processing" colors={colors} onPress={onChangeStatus} /> : null}
              {order.status !== 'shipped' ? <StatusAction label="Shipped" status="shipped" colors={colors} onPress={onChangeStatus} /> : null}
              {order.status !== 'out_for_delivery' ? <StatusAction label="Out for delivery" status="out_for_delivery" colors={colors} onPress={onChangeStatus} /> : null}
              {order.status !== 'delivered' ? <StatusAction label="Delivered" status="delivered" colors={colors} onPress={onChangeStatus} /> : null}
              {order.status !== 'cancelled' ? <StatusAction label="Cancel order" status="cancelled" colors={colors} destructive onPress={onChangeStatus} /> : null}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function DetailRow({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: colors.foreground }]} numberOfLines={3}>{value}</Text>
    </View>
  );
}

function StatusAction({
  label,
  status,
  colors,
  destructive = false,
  onPress,
}: {
  label: string;
  status: string;
  colors: ReturnType<typeof useColors>;
  destructive?: boolean;
  onPress: (status: string) => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onPress(status)}
      style={[styles.actionButton, { borderColor: destructive ? colors.destructive : colors.border }]}
    >
      <Text style={[styles.actionButtonText, { color: destructive ? colors.destructive : colors.primary }]}>{label}</Text>
    </Pressable>
  );
}

export default function OrdersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const updateStatus = useAdminUpdateOrderStatus();
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [deliveryOrder, setDeliveryOrder] = useState<{ id: string; status: string; value: string } | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const query = useAdminListOrders({
    status: status === 'all' ? undefined : status,
    page,
    pageSize: PAGE_SIZE,
  });
  const orders = query.data?.items ?? [];
  const totalPages = Math.max(1, Math.ceil((query.data?.total ?? 0) / PAGE_SIZE));
  const topInset = insets.top < 67 ? 67 : insets.top;
  const bottomInset = insets.bottom < 34 ? 34 : insets.bottom;

  const changeStatus = (id: string, nextStatus: string) => {
    updateStatus.mutate(
      { id, data: { status: nextStatus } },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({ queryKey: getAdminListOrdersQueryKey() });
        },
        onError: (error) => {
          Alert.alert('Could not update order', error instanceof Error ? error.message : 'The API rejected this update.');
        },
      },
    );
  };

  const saveDeliveryDate = () => {
    if (!deliveryOrder?.value.trim()) return;
    updateStatus.mutate(
      {
        id: deliveryOrder.id,
        data: { status: deliveryOrder.status, estimatedDelivery: deliveryOrder.value.trim() },
      },
      {
        onSuccess: () => {
          setDeliveryOrder(null);
          void queryClient.invalidateQueries({ queryKey: getAdminListOrdersQueryKey() });
        },
        onError: (error) => Alert.alert(
          'Could not update delivery date',
          error instanceof Error ? error.message : 'The API rejected this update.',
        ),
      },
    );
  };

  if (query.isError) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <ErrorState message="We could not load your orders." onRetry={() => void query.refetch()} />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingTop: topInset + 16, paddingBottom: bottomInset + 90 }}
        showsVerticalScrollIndicator={false}
        refreshing={query.isFetching && !query.isLoading}
        onRefresh={() => void query.refetch()}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View>
                <Text style={[styles.kicker, { color: colors.secondary }]}>FULFILLMENT</Text>
                <Text style={[styles.title, { color: colors.foreground }]}>Orders</Text>
                <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                  {query.data?.total ?? 0} orders in the system
                </Text>
              </View>
              <View style={[styles.countBadge, { backgroundColor: colors.accent }]}>
                <Feather name="shopping-bag" size={19} color={colors.primary} />
              </View>
            </View>
            <FlatList
              horizontal
              data={STATUS_FILTERS}
              keyExtractor={(item) => item}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filters}
              renderItem={({ item }) => {
                const selected = item === status;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => {
                      setStatus(item);
                      setPage(1);
                    }}
                    style={[
                      styles.filter,
                      {
                        backgroundColor: selected ? colors.primary : colors.card,
                        borderColor: selected ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.filterText, { color: selected ? colors.primaryForeground : colors.mutedForeground }]}>
                      {item}
                    </Text>
                  </Pressable>
                );
              }}
            />
            {query.isLoading ? (
              <ActivityIndicator style={styles.headerLoader} color={colors.primary} />
            ) : null}
          </View>
        }
        ListEmptyComponent={
          query.isLoading ? null : (
            <View style={styles.empty}>
              <Feather name="shopping-bag" size={28} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No orders found</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                There are no orders in this status.
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => {
          const accent = statusColor(item.status, colors);
          return (
            <Pressable
              onPress={() => {
                setSelectedOrder(item);
              }}
              style={({ pressed }) => [
                styles.orderCard,
                { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.76 : 1 },
              ]}
            >
              <View style={styles.orderTop}>
                <View>
                  <Text style={[styles.orderNumber, { color: colors.foreground }]}>#{item.orderNumber}</Text>
                  <Text style={[styles.customer, { color: colors.mutedForeground }]} numberOfLines={1}>
                    {item.customerName ?? 'Customer'}
                  </Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: colors.accent }]}>
                  <View style={[styles.statusDot, { backgroundColor: accent }]} />
                  <Text style={[styles.statusText, { color: accent }]}>{item.status}</Text>
                </View>
              </View>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.orderBottom}>
                <View style={styles.detail}>
                  <Feather name="calendar" size={14} color={colors.mutedForeground} />
                  <Text style={[styles.detailText, { color: colors.mutedForeground }]}>
                    {item.estimatedDelivery || 'Delivery pending'}
                  </Text>
                </View>
                <Text style={[styles.total, { color: colors.primary }]}>
                  {item.total == null ? '—' : `${item.total.toFixed(2)} JOD`}
                </Text>
              </View>
            </Pressable>
          );
        }}
        ListFooterComponent={
          <View style={styles.pagination}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous orders page"
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
              accessibilityLabel="Next orders page"
              disabled={page >= totalPages}
              onPress={() => setPage((value) => Math.min(totalPages, value + 1))}
              style={[styles.pageButton, { borderColor: colors.border, opacity: page >= totalPages ? 0.35 : 1 }]}
            >
              <Feather name="chevron-right" size={18} color={colors.foreground} />
            </Pressable>
          </View>
        }
      />
      <OrderDetailModal
        order={selectedOrder}
        colors={colors}
        bottomInset={bottomInset}
        onClose={() => setSelectedOrder(null)}
        onEditDelivery={() => {
          if (!selectedOrder) return;
          const orderToEdit = selectedOrder;
          setSelectedOrder(null);
          setDeliveryOrder({
            id: orderToEdit.id,
            status: orderToEdit.status,
            value: orderToEdit.estimatedDelivery ?? '',
          });
        }}
        onChangeStatus={(nextStatus) => {
          if (!selectedOrder) return;
          changeStatus(selectedOrder.id, nextStatus);
          setSelectedOrder(null);
        }}
      />
      <Modal visible={Boolean(deliveryOrder)} transparent animationType="slide" onRequestClose={() => setDeliveryOrder(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setDeliveryOrder(null)}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Estimated delivery</Text>
            <Text style={[styles.modalHint, { color: colors.mutedForeground }]}>
              Enter the date or delivery note customers should see.
            </Text>
            <TextInput
              value={deliveryOrder?.value ?? ''}
              onChangeText={(value) => setDeliveryOrder((current) => current ? { ...current, value } : current)}
              placeholder="e.g. 2026-08-15"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.modalInput, { color: colors.foreground, borderColor: colors.input, backgroundColor: colors.background }]}
            />
            <View style={styles.modalActions}>
              <Pressable onPress={() => setDeliveryOrder(null)} style={[styles.modalButton, { borderColor: colors.border }]}>
                <Text style={[styles.modalButtonText, { color: colors.mutedForeground }]}>Cancel</Text>
              </Pressable>
              <Pressable
                disabled={!deliveryOrder?.value.trim() || updateStatus.isPending}
                onPress={saveDeliveryDate}
                style={[styles.modalButton, { backgroundColor: colors.primary, opacity: !deliveryOrder?.value.trim() || updateStatus.isPending ? 0.6 : 1 }]}
              >
                <Text style={[styles.modalButtonText, { color: colors.primaryForeground }]}>Save</Text>
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
  filters: { gap: 8, paddingRight: 18 },
  filter: { borderRadius: 9, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  filterText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, textTransform: 'capitalize' },
  headerLoader: { alignSelf: 'flex-start' },
  orderCard: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10, gap: 12 },
  orderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  orderNumber: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  customer: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 4, maxWidth: 180 },
  statusPill: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 5 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontFamily: 'Inter_600SemiBold', fontSize: 11, textTransform: 'capitalize' },
  divider: { height: 1 },
  orderBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detail: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailText: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  total: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  empty: { alignItems: 'center', paddingVertical: 70, gap: 8 },
  emptyTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 17, marginTop: 5 },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 13 },
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18, paddingVertical: 16 },
  pageButton: { width: 38, height: 38, borderWidth: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  pageText: { fontFamily: 'Inter_500Medium', fontSize: 13 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end' },
  detailsSheet: { maxHeight: '94%', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 20 },
  detailsHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16 },
  detailsHeaderCopy: { flex: 1, gap: 4 },
  detailsKicker: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.7 },
  detailsTitle: { fontFamily: 'Inter_700Bold', fontSize: 26, letterSpacing: -0.4 },
  detailsSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  closeButton: { padding: 4, marginLeft: 12 },
  summaryCard: { marginHorizontal: 16, borderWidth: 1, borderRadius: 16, padding: 14, gap: 14 },
  summaryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  summaryMetric: { alignItems: 'flex-end' },
  detailsTotal: { fontFamily: 'Inter_700Bold', fontSize: 20, marginTop: 5 },
  detailGridDivider: { height: 1 },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 },
  detailRow: { width: '50%', gap: 4, paddingRight: 8 },
  sectionLabel: { fontFamily: 'Inter_500Medium', fontSize: 10, letterSpacing: 0.3 },
  detailValue: { fontFamily: 'Inter_600SemiBold', fontSize: 13, lineHeight: 18 },
  addressBlock: { gap: 5 },
  addressText: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19 },
  productsSectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 17, marginHorizontal: 16, marginTop: 20, marginBottom: 10 },
  productDetailCard: { marginHorizontal: 16, borderWidth: 1, borderRadius: 16, padding: 12, marginBottom: 12, gap: 12 },
  productDetailImage: { width: '100%', height: 190, borderRadius: 12 },
  productImagePlaceholder: { width: '100%', height: 190, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  productDetailCopy: { gap: 8 },
  productDetailTitleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  productDetailName: { flex: 1, fontFamily: 'Inter_700Bold', fontSize: 17, lineHeight: 23 },
  productBadge: { borderRadius: 7, paddingHorizontal: 7, paddingVertical: 4 },
  productBadgeText: { fontFamily: 'Inter_700Bold', fontSize: 10, textTransform: 'capitalize' },
  productDetailMeta: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  productDetailPrice: { fontFamily: 'Inter_700Bold', fontSize: 13 },
  productUnavailable: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18 },
  productShortDescription: { fontFamily: 'Inter_500Medium', fontSize: 13, lineHeight: 19 },
  productDescription: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 20 },
  productStats: { borderTopWidth: 1, paddingTop: 10, gap: 10 },
  featuresBlock: { gap: 8 },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  featureText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 18 },
  gallery: { gap: 8, paddingTop: 2 },
  galleryImage: { width: 72, height: 72, borderRadius: 9 },
  reviewsBlock: { gap: 8 },
  reviewRow: { borderTopWidth: 1, paddingTop: 8, gap: 3 },
  reviewAuthor: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  reviewText: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18 },
  trackingCard: { marginHorizontal: 16, borderWidth: 1, borderRadius: 16, padding: 14, marginTop: 4 },
  trackingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  trackingCopy: { flex: 1, gap: 2 },
  trackingLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  trackingDate: { fontFamily: 'Inter_400Regular', fontSize: 11 },
  orderActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginHorizontal: 16, marginTop: 16 },
  actionButton: { minHeight: 40, borderWidth: 1, borderRadius: 10, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  actionButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  modalCard: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 12 },
  modalTitle: { fontFamily: 'Inter_700Bold', fontSize: 18 },
  modalHint: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19 },
  modalInput: { minHeight: 48, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontFamily: 'Inter_400Regular', fontSize: 14 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  modalButton: { minHeight: 46, flex: 1, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  modalButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
});