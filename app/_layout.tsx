import '../global.css';
import React, { useEffect, useCallback } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider } from 'react-redux';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { store } from '@/store';
import { queryClient, asyncStoragePersister } from '@/lib/queryClient';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { RevisionProvider } from '@/contexts/RevisionContext';
import Toast from 'react-native-toast-message';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';

SplashScreen.preventAutoHideAsync();

function InnerLayout() {
  const { isDark, colors } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
        }}
      />
      <Toast />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular: require('../assets/fonts/Inter-Regular.ttf'),
    Inter_500Medium: require('../assets/fonts/Inter-Medium.ttf'),
    Inter_600SemiBold: require('../assets/fonts/Inter-SemiBold.ttf'),
    Inter_700Bold: require('../assets/fonts/Inter-Bold.ttf'),
    Inter_800ExtraBold: require('../assets/fonts/Inter-ExtraBold.ttf'),
    Inter_900Black: require('../assets/fonts/Inter-Black.ttf'),
    PlusJakartaSans_500Medium: require('../assets/fonts/PlusJakartaSans-Medium.ttf'),
    PlusJakartaSans_600SemiBold: require('../assets/fonts/PlusJakartaSans-SemiBold.ttf'),
    PlusJakartaSans_700Bold: require('../assets/fonts/PlusJakartaSans-Bold.ttf'),
    PlusJakartaSans_800ExtraBold: require('../assets/fonts/PlusJakartaSans-ExtraBold.ttf'),
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    onLayoutRootView();
  }, [onLayoutRootView]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{ persister: asyncStoragePersister }}
        >
          <ThemeProvider>
            <AuthProvider>
              <LanguageProvider>
                <RevisionProvider>
                  <InnerLayout />
                </RevisionProvider>
              </LanguageProvider>
            </AuthProvider>
          </ThemeProvider>
        </PersistQueryClientProvider>
      </Provider>
    </GestureHandlerRootView>
  );
}
