import { useCallback } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useGetAdminStats } from '@workspace/api-client-react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import { ErrorState, LoadingState } from '@/components/ScreenState';

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: number;
  accent?: boolean;
}) {
  const colors = useColors();
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.statIcon, { backgroundColor: accent ? colors.accent : colors.muted }]}>
        <Feather name={icon} size={18} color={accent ? colors.secondaryForeground : colors.primary} />
      </View>
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { identity } = useAuth();
  const statsQuery = useGetAdminStats();
  const webTopInset = insets.top < 67 ? 67 : insets.top;
  const webBottomInset = insets.bottom < 34 ? 34 : insets.bottom;

  const refresh = useCallback(() => {
    void statsQuery.refetch();
  }, [statsQuery]);

  if (statsQuery.isLoading) return <LoadingState />;
  if (statsQuery.isError || !statsQuery.data) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ErrorState
          message="We could not load the latest store summary."
          onRetry={refresh}
        />
      </View>
    );
  }

  const stats = statsQuery.data;
  const stockRatio = stats.totalProducts ? Math.round((stats.inStockProducts / stats.totalProducts) * 100) : 0;
  const storageRatio = stats.storageLimitBytes
    ? Math.min(100, Math.round((stats.storageUsedBytes / stats.storageLimitBytes) * 100))
    : 0;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: webTopInset + 18, paddingBottom: webBottomInset + 92 },
      ]}
      refreshControl={
        <RefreshControl refreshing={statsQuery.isFetching} onRefresh={refresh} tintColor={colors.primary} />
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.kicker, { color: colors.secondary }]}>CLOUD TOYS ADMIN</Text>
          <Text style={[styles.heading, { color: colors.foreground }]}>Good morning</Text>
          <Text style={[styles.caption, { color: colors.mutedForeground }]}>
            Here is today’s store snapshot.
          </Text>
        </View>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={[styles.avatarText, { color: colors.primaryForeground }]}>
            {identity?.username.slice(0, 1).toUpperCase() ?? 'C'}
          </Text>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <StatCard icon="shopping-bag" label="Orders" value={stats.totalOrders} />
        <StatCard icon="package" label="Products" value={stats.totalProducts} />
        <StatCard icon="folder" label="Categories" value={stats.totalCategories} />
        <StatCard icon="alert-triangle" label="Out of stock" value={stats.outOfStockProducts} accent />
      </View>

      <View style={[styles.healthCard, { backgroundColor: colors.primary }]}>
        <View style={styles.healthTitleRow}>
          <View>
            <Text style={[styles.healthKicker, { color: colors.primaryForeground }]}>STORE HEALTH</Text>
            <Text style={[styles.healthTitle, { color: colors.primaryForeground }]}>Inventory overview</Text>
          </View>
          <Feather name="activity" size={22} color={colors.secondary} />
        </View>
        <View style={styles.progressRow}>
          <Text style={[styles.progressLabel, { color: colors.primaryForeground }]}>In stock</Text>
          <Text style={[styles.progressValue, { color: colors.primaryForeground }]}>{stockRatio}%</Text>
        </View>
        <View style={[styles.progressTrack, { backgroundColor: colors.primaryForeground + '33' }]}>
          <View style={[styles.progressFill, { width: `${stockRatio}%`, backgroundColor: colors.secondary }]} />
        </View>
        <Text style={[styles.healthNote, { color: colors.primaryForeground + 'CC' }]}>
          {stats.inStockProducts} products are currently available to customers.
        </Text>
      </View>

      <View style={[styles.storageCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.storageHeader}>
          <View style={[styles.storageIcon, { backgroundColor: colors.accent }]}>
            <Feather name="database" size={18} color={colors.primary} />
          </View>
          <View style={styles.storageCopy}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Image storage</Text>
            <Text style={[styles.cardCaption, { color: colors.mutedForeground }]}>
              {stats.storageFileCount} files uploaded
            </Text>
          </View>
          <Text style={[styles.storagePercent, { color: colors.primary }]}>{storageRatio}%</Text>
        </View>
        <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
          <View style={[styles.progressFill, { width: `${storageRatio}%`, backgroundColor: colors.secondary }]} />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, gap: 18 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kicker: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.8, marginBottom: 7 },
  heading: { fontFamily: 'Inter_700Bold', fontSize: 28, letterSpacing: -0.5 },
  caption: { fontFamily: 'Inter_400Regular', fontSize: 13, marginTop: 5 },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: 'Inter_700Bold', fontSize: 17 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { width: '48%', flexGrow: 1, minHeight: 128, borderWidth: 1, borderRadius: 14, padding: 14 },
  statIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  statValue: { fontFamily: 'Inter_700Bold', fontSize: 25 },
  statLabel: { fontFamily: 'Inter_500Medium', fontSize: 12, marginTop: 3 },
  healthCard: { borderRadius: 16, padding: 18, gap: 16 },
  healthTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  healthKicker: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.5, opacity: 0.8 },
  healthTitle: { fontFamily: 'Inter_700Bold', fontSize: 19, marginTop: 5 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { fontFamily: 'Inter_500Medium', fontSize: 13 },
  progressValue: { fontFamily: 'Inter_700Bold', fontSize: 13 },
  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  healthNote: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18 },
  storageCard: { borderWidth: 1, borderRadius: 14, padding: 16, gap: 16 },
  storageHeader: { flexDirection: 'row', alignItems: 'center' },
  storageIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  storageCopy: { flex: 1, marginLeft: 11 },
  cardTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  cardCaption: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 3 },
  storagePercent: { fontFamily: 'Inter_700Bold', fontSize: 16 },
});