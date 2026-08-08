import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { identity, login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (identity) router.replace('/(tabs)');
  }, [identity, router]);

  if (identity) return null;

  const handleSubmit = async () => {
    Keyboard.dismiss();
    setError('');
    if (!username.trim() || !password) {
      setError('Enter your username and password.');
      return;
    }
    setIsSubmitting(true);
    try {
      await login(username.trim(), password);
      router.replace('/(tabs)');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to sign in');
    } finally {
      setIsSubmitting(false);
    }
  };

  const topInset = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;
  const bottomInset = Platform.OS === 'web' ? Math.max(insets.bottom, 34) : insets.bottom;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[
          styles.content,
          { paddingTop: topInset + 32, paddingBottom: bottomInset + 24 },
        ]}
        bottomOffset={24}
      >
        <View style={styles.brand}>
          <Image
            source={require('../assets/images/icon.png')}
            style={styles.logo}
            accessibilityLabel="Cloud Toys"
          />
          <Text style={[styles.eyebrow, { color: colors.secondary }]}>CLOUD TOYS</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>Welcome back</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Sign in to manage your store from anywhere.
          </Text>
        </View>

        <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.foreground }]}>Username</Text>
            <View style={[styles.inputWrap, { borderColor: colors.input, backgroundColor: colors.background }]}>
              <Feather name="user" size={18} color={colors.mutedForeground} />
              <TextInput
                testID="admin-username"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="username"
                placeholder="Enter your username"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.input, { color: colors.foreground }]}
                returnKeyType="next"
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.foreground }]}>Password</Text>
            <View style={[styles.inputWrap, { borderColor: colors.input, backgroundColor: colors.background }]}>
              <Feather name="lock" size={18} color={colors.mutedForeground} />
              <TextInput
                testID="admin-password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="current-password"
                placeholder="Enter your password"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.input, { color: colors.foreground }]}
                onSubmitEditing={handleSubmit}
                returnKeyType="done"
              />
            </View>
          </View>

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: colors.accent }]}>
              <Feather name="alert-circle" size={16} color={colors.destructive} />
              <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
            </View>
          ) : null}

          <Pressable
            testID="admin-sign-in"
            accessibilityRole="button"
            accessibilityState={{ disabled: isSubmitting }}
            disabled={isSubmitting}
            onPress={handleSubmit}
            style={({ pressed }) => [
              styles.submit,
              { backgroundColor: colors.primary, opacity: pressed || isSubmitting ? 0.82 : 1 },
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <>
                <Text style={[styles.submitText, { color: colors.primaryForeground }]}>Sign in</Text>
                <Feather name="arrow-right" size={18} color={colors.primaryForeground} />
              </>
            )}
          </Pressable>
        </View>

        <Text style={[styles.footer, { color: colors.mutedForeground }]}>
          Your session is stored securely on this device.
        </Text>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 22 },
  brand: { alignItems: 'center', marginBottom: 30 },
  logo: { width: 72, height: 72, borderRadius: 20, marginBottom: 16 },
  eyebrow: { fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 2.2, marginBottom: 9 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 30, letterSpacing: -0.6 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 14, marginTop: 8, textAlign: 'center', lineHeight: 21 },
  formCard: {
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    gap: 18,
  },
  field: { gap: 8 },
  label: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  inputWrap: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: { flex: 1, minHeight: 50, fontFamily: 'Inter_400Regular', fontSize: 15 },
  errorBox: { padding: 12, borderRadius: 10, flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  errorText: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 13, lineHeight: 19 },
  submit: {
    minHeight: 52,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  submitText: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  footer: { fontFamily: 'Inter_400Regular', fontSize: 12, textAlign: 'center', marginTop: 20 },
});