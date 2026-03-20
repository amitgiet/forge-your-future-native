import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { secureStore } from '@/lib/secureStore';

const TOKEN_KEYS = ['fcmToken', 'fcm_token'] as const;

const getStoredToken = async () => {
  for (const key of TOKEN_KEYS) {
    const val = await secureStore.getItemAsync(key);
    if (val) return val;
  }
  return null;
};

const persistToken = async (token: string) => {
  await Promise.all(TOKEN_KEYS.map((key) => secureStore.setItemAsync(key, token)));
};

const extractToken = (value: any): string | null => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value?.data === 'string') return value.data;
  if (typeof value?.token === 'string') return value.token;
  return null;
};

export const ensurePushToken = async (): Promise<string | null> => {
  // Web has no FCM device token in this app setup.
  if (Platform.OS === 'web') return null;
  // In current Expo setup, Android can provide an FCM token via device push token.
  // iOS typically yields APNs token here (not FCM), so skip to avoid sending wrong token type.
  if (Platform.OS !== 'android') return null;

  const existing = await getStoredToken();
  if (existing) return existing;

  const permissionState = await Notifications.getPermissionsAsync();
  let finalStatus = permissionState.status;
  if (finalStatus !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    finalStatus = requested.status;
  }
  if (finalStatus !== 'granted') return null;

  try {
    const nativeToken = await Notifications.getDevicePushTokenAsync();
    const extractedNativeToken = extractToken(nativeToken);
    if (extractedNativeToken) {
      await persistToken(extractedNativeToken);
      return extractedNativeToken;
    }
  } catch {
    return null;
  }

  return null;
};
