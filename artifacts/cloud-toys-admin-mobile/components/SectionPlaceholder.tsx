import { Feather } from '@expo/vector-icons';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

export function SectionPlaceholder({
  icon,
  title,
  description,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  description: string;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;
  const bottomInset = Platform.OS === 'web' ? Math.max(insets.bottom, 34) : insets.bottom;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: topInset + 24, paddingBottom: bottomInset + 90 }]}>
      <View style={[styles.iconCircle, { backgroundColor: colors.accent }]}>
        <Feather name={icon} size={28} color={colors.primary} />
      </View>
      <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.description, { color: colors.mutedForeground }]}>{description}</Text>
      <Text style={[styles.note, { color: colors.secondaryForeground, backgroundColor: colors.accent }]}>
        This section is next in the mobile admin rollout.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  iconCircle: { width: 68, height: 68, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 24, textAlign: 'center' },
  description: { fontFamily: 'Inter_400Regular', fontSize: 14, textAlign: 'center', lineHeight: 21, marginTop: 8, maxWidth: 320 },
  note: { fontFamily: 'Inter_500Medium', fontSize: 12, textAlign: 'center', lineHeight: 18, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, marginTop: 20 },
});