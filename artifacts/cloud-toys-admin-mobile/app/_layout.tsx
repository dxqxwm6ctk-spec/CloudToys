import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AuthProvider } from '@/context/AuthContext';
import { getApiOrigin, getStoredAdminToken } from '@/lib/auth';
import { setAuthTokenGetter, setBaseUrl } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { router, Stack, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();
setBaseUrl(getApiOrigin() || null);
setAuthTokenGetter(getStoredAdminToken);

function RootLayoutNav() {
  const colors = useColors();
  const segments = useSegments();
  const { identity, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    const firstSegment = segments[0];
    const onLogin = firstSegment === 'login';
    const onEntry = !firstSegment;

    if (!identity && !onLogin && !onEntry) {
      router.replace('/login');
    } else if (identity && onLogin) {
      router.replace('/(tabs)');
    }
  }, [identity, isLoading, segments]);

  return (
    <Stack screenOptions={{ headerBackTitle: 'Back', headerTintColor: colors.primary }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="product-form" options={{ headerShown: false }} />
      <Stack.Screen name="categories" options={{ title: 'Categories' }} />
      <Stack.Screen name="users" options={{ title: 'Users' }} />
      <Stack.Screen name="settings" options={{ headerShown: false }} />
      <Stack.Screen name="security" options={{ title: 'Security' }} />
      <Stack.Screen name="images" options={{ title: 'Images' }} />
      <Stack.Screen name="newsletter" options={{ title: 'Newsletter' }} />
      <Stack.Screen name="staff" options={{ title: 'Staff & admins' }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView>
            <KeyboardProvider>
              <AuthProvider>
                <RootLayoutNav />
              </AuthProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
