import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getAdminListOrdersQueryKey,
  useAdminListOrders,
  useAdminUpdateOrderStatus,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';
import { ErrorState } from '@/components/ScreenState';

const PAGE_SIZE = 10;
const STATUS_FILTERS = ['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'];

function statusColor(status: string, colors: ReturnType<typeof useColors>): string {
  if (status === 'delivered') return colors.secondary;
  if (status === 'cancelled') return colors.destructive;
  return colors.primary;
}

export default function OrdersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const updateStatus = useAdminUpdateOrderStatus();
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
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
                 Alert.alert(
                   `Order #${item.orderNumber}`,
                   [
                     `Customer: ${item.customerName ?? '—'}`,
                     `Phone: ${item.customerPhone ?? '—'}`,
                     `Payment: ${item.paymentMethod ?? '—'}`,
                     `Address: ${item.shippingAddress ?? '—'}`,
                     `Total: ${item.total == null ? '—' : `${item.total.toFixed(2)} JOD`}`,
                   ].join('\n'),
                   [
                     { text: 'Close', style: 'cancel' },
                     ...(item.status !== 'processing' ? [{ text: 'Mark processing', onPress: () => changeStatus(item.id, 'processing') }] : []),
                     ...(item.status !== 'shipped' ? [{ text: 'Mark shipped', onPress: () => changeStatus(item.id, 'shipped') }] : []),
                     ...(item.status !== 'out_for_delivery' ? [{ text: 'Out for delivery', onPress: () => changeStatus(item.id, 'out_for_delivery') }] : []),
                     ...(item.status !== 'delivered' ? [{ text: 'Mark delivered', onPress: () => changeStatus(item.id, 'delivered') }] : []),
                     ...(item.status !== 'cancelled' ? [{ text: 'Cancel order', style: 'destructive' as const, onPress: () => changeStatus(item.id, 'cancelled') }] : []),
                   ],
                 );
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
             </Pressable>
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
            </View>
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
});