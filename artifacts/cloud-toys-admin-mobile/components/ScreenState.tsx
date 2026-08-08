import { Feather } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';

export function LoadingState({ label = 'Loading your store...' }: { label?: string }) {
  const colors = useColors();
  return (
    <View style={styles.center}>
      <ActivityIndicator size="small" color={colors.primary} />
      <Text style={[styles.message, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const colors = useColors();
  return (
    <View style={styles.center}>
      <View style={[styles.iconCircle, { backgroundColor: colors.accent }]}>
        <Feather name="alert-circle" size={22} color={colors.destructive} />
      </View>
      <Text style={[styles.title, { color: colors.foreground }]}>Something went wrong</Text>
      <Text style={[styles.message, { color: colors.mutedForeground }]}>{message}</Text>
      {onRetry ? (
        <Text
          accessibilityRole="button"
          onPress={onRetry}
          style={[styles.retry, { color: colors.primary }]}
        >
          Try again
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    gap: 10,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
    textAlign: 'center',
  },
  message: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  retry: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    marginTop: 4,
  },
});