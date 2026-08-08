import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';

const tools = [
  { label: 'Categories', description: 'Organize your product catalog', icon: 'folder' as const, route: '/categories' as const },
  { label: 'Images', description: 'Browse uploaded store media', icon: 'image' as const, route: '/images' as const },
  { label: 'Users', description: 'View customer accounts', icon: 'users' as const, route: '/users' as const },
  { label: 'Staff & admins', description: 'Manage team access', icon: 'shield' as const, route: '/staff' as const },
  { label: 'Security', description: 'Review abuse and blocked IPs', icon: 'shield' as const, route: '/security' as const },
  { label: 'Newsletter', description: 'View subscribers', icon: 'mail' as const, route: '/newsletter' as const },
  { label: 'Store settings', description: 'Payment and delivery settings', icon: 'sliders' as const, route: '/settings' as const },
];

export default function MoreScreen() {
  const colors = useColors();
  const { identity, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const topInset = insets.top < 67 ? 67 : insets.top;
  const bottomInset = insets.bottom < 34 ? 34 : insets.bottom;
  const visibleTools = tools.filter((tool) => {
    if (tool.label === 'Staff & admins' || tool.label === 'Security' || tool.label === 'Store settings') {
      return identity?.role === 'admin';
    }
    return true;
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: topInset + 18, paddingBottom: bottomInset + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heading}>
          <Text style={[styles.kicker, { color: colors.secondary }]}>WORKSPACE</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>More tools</Text>
          <Text style={[styles.description, { color: colors.mutedForeground }]}>
            Everything you need to run Cloud Toys.
          </Text>
        </View>
        <View style={styles.toolList}>
          {visibleTools.map((tool) => (
            <Pressable
              key={tool.label}
              accessibilityRole="button"
              accessibilityLabel={tool.label}
              onPress={() => {
                if (tool.route) router.push(tool.route);
              }}
              style={({ pressed }) => [
                styles.tool,
                { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.72 : 1 },
              ]}
            >
              <View style={[styles.toolIcon, { backgroundColor: colors.accent }]}>
                <Feather name={tool.icon} size={19} color={colors.primary} />
              </View>
              <View style={styles.toolCopy}>
                <Text style={[styles.toolLabel, { color: colors.foreground }]}>{tool.label}</Text>
                <Text style={[styles.toolDescription, { color: colors.mutedForeground }]}>{tool.description}</Text>
              </View>
              {tool.route ? <Feather name="chevron-right" size={18} color={colors.mutedForeground} /> : null}
            </Pressable>
          ))}
        </View>
      </ScrollView>
      <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <View style={styles.identity}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={[styles.avatarText, { color: colors.primaryForeground }]}>
              {identity?.username.slice(0, 1).toUpperCase() ?? 'C'}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.username, { color: colors.foreground }]} numberOfLines={1}>
              {identity?.username}
            </Text>
            <Text style={[styles.role, { color: colors.mutedForeground }]}>{identity?.role}</Text>
          </View>
        </View>
        <Pressable
          testID="admin-sign-out"
          accessibilityRole="button"
          onPress={async () => {
            await logout();
            router.replace('/login');
          }}
          style={({ pressed }) => [styles.logout, { borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
        >
          <Feather name="log-out" size={17} color={colors.destructive} />
          <Text style={[styles.logoutText, { color: colors.destructive }]}>Sign out</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, gap: 20 },
  heading: { gap: 5 },
  kicker: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.7 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 28, letterSpacing: -0.5 },
  description: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19 },
  toolList: { gap: 10 },
  tool: { minHeight: 70, borderWidth: 1, borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 11 },
  toolIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  toolCopy: { flex: 1, gap: 3 },
  toolLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  toolDescription: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  footer: { borderTopWidth: 1, padding: 16, gap: 14 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  username: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  role: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 2, textTransform: 'capitalize' },
  logout: { height: 46, borderWidth: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  logoutText: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
});