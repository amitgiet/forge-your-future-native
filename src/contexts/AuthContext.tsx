import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'expo-router';
import { secureStore } from '@/lib/secureStore';
import { apiService } from '@/lib/apiService';
import { setAuthToken } from '@/lib/api';
import { storage } from '@/lib/storage';
import { EventEmitter } from '@/lib/events';

interface User {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  profile?: {
    preferredLanguage?: 'en' | 'hi';
  };
  subscription?: {
    plan: string;
  };
  onboardingCompleted?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string, phone?: string) => Promise<void>;
  logout: () => void;
  demoLogin: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const syncPreferredLanguage = async (lang?: string) => {
    if (lang === 'en' || lang === 'hi') {
      await storage.setString('preferredLanguage', lang);
      EventEmitter.emit('preferred-language-changed');
    }
  };

  useEffect(() => {
    checkAuth();

    const unsub = EventEmitter.on('auth:unauthorized', () => {
      setUser(null);
      secureStore.deleteItemAsync('token').catch(() => {});
      setAuthToken(null);
    });

    return unsub;
  }, []);

  const checkAuth = async () => {
    try {
      const token = await secureStore.getItemAsync('token');

      if (!token) {
        setLoading(false);
        return;
      }

      setAuthToken(token);

      // Demo mode
      if (token === 'demo-token-12345') {
        setUser({
          _id: 'demo-user',
          name: 'Demo User',
          email: 'demo@neetforge.com',
          profile: { preferredLanguage: 'en' },
          subscription: { plan: 'free' },
        });
        await syncPreferredLanguage('en');
        setLoading(false);
        return;
      }

      const response = await apiService.auth.getProfile();
      if (response.data.success) {
        const profile = response.data.data;
        setUser(profile);
        await syncPreferredLanguage(profile?.profile?.preferredLanguage);
      }
    } catch {
      await secureStore.deleteItemAsync('token');
      setAuthToken(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await apiService.auth.login({ email, password });

    if (response.data.success) {
      await secureStore.setItemAsync('token', response.data.token);
      setAuthToken(response.data.token);
      setUser(response.data.user);
      await syncPreferredLanguage(response.data.user?.profile?.preferredLanguage);

      if (response.data.user.onboardingCompleted === false) {
        router.replace('/(auth)/onboarding');
      } else {
        router.replace('/(auth)/(tabs)');
      }
    }
  };

  const signup = async (name: string, email: string, password: string, phone?: string) => {
    const response = await apiService.auth.register({ name, email, password, phone });

    if (response.data.success) {
      await secureStore.setItemAsync('token', response.data.token);
      setAuthToken(response.data.token);
      setUser(response.data.user);
      await syncPreferredLanguage(response.data.user?.profile?.preferredLanguage);
      router.replace('/(auth)/onboarding');
    }
  };

  const logout = async () => {
    await secureStore.deleteItemAsync('token');
    setAuthToken(null);
    await storage.remove('preferredLanguage');
    setUser(null);
    router.replace('/login');
  };

  const demoLogin = async () => {
    await secureStore.setItemAsync('token', 'demo-token-12345');
    setAuthToken('demo-token-12345');
    const demoUser: User = {
      _id: 'demo-user',
      name: 'Demo User',
      email: 'demo@neetforge.com',
      subscription: { plan: 'free' },
    };
    setUser(demoUser);
    router.replace('/(auth)/(tabs)');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        signup,
        logout,
        demoLogin,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
