import AsyncStorage from '@react-native-async-storage/async-storage';

export const storage = {
  getString: async (key: string): Promise<string | null> => {
    return AsyncStorage.getItem(key);
  },

  setString: async (key: string, value: string): Promise<void> => {
    await AsyncStorage.setItem(key, value);
  },

  getObject: async <T = any>(key: string): Promise<T | null> => {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },

  setObject: async (key: string, value: any): Promise<void> => {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  },

  remove: async (key: string): Promise<void> => {
    await AsyncStorage.removeItem(key);
  },

  multiRemove: async (keys: string[]): Promise<void> => {
    for (const key of keys) {
      await AsyncStorage.removeItem(key);
    }
  },
};
