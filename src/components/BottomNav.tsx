import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, Animated, Platform } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, FileText, Sparkles, MessageCircle, User } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

export default function BottomNav({ state, navigation }: any) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { colors, shadows } = useTheme();

  const translateY = useRef(new Animated.Value(100)).current;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: 0,
      tension: 100,
      friction: 12,
      useNativeDriver: true,
    }).start();
  }, []);

  const navItems = [
    { icon: Home, path: '/(auth)/(tabs)', routeName: 'index', label: 'Home', match: /^\/(auth)?\/?(\(tabs\))?\/?$/ },
    { icon: FileText, path: '/(auth)/(tabs)/tests', routeName: 'tests/index', label: 'Tests', match: /^\/(auth)?\/?(\(tabs\))?\/tests\/?/ },
    { icon: Sparkles, path: '/(auth)/(tabs)/ai-assistant', routeName: 'ai-assistant', label: 'AI', match: /^\/(auth)?\/?(\(tabs\))?\/ai-assistant\/?/ },
    { icon: MessageCircle, path: '/(auth)/(tabs)/social', routeName: 'social/index', label: 'Social', match: /^\/(auth)?\/?(\(tabs\))?\/social\/?/ },
    { icon: User, path: '/(auth)/(tabs)/profile', routeName: 'profile', label: 'Profile', match: /^\/(auth)?\/?(\(tabs\))?\/profile\/?/ },
  ];

  return (
    <Animated.View
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        transform: [{ translateY }],
        backgroundColor: colors.card,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingBottom: Math.max(insets.bottom, 4),
        ...shadows.sm,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 4 }}>
        {navItems.map(({ icon: Icon, path, routeName, label, match }, index) => {
          // If we are given state from the Tabs navigator, use state to determine active tab directly
          const isActive = state ? state.index === index : match.test(pathname);
          
          return (
            <Pressable
              key={index}
              onPress={() => {
                if (!isActive) {
                  // Prefer using the navigator's built in state routing if available
                  if (navigation && state && state.routes[index]) {
                    navigation.navigate(state.routes[index].name);
                  } else {
                    router.push(path as any);
                  }
                }
              }}
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 12,
                position: 'relative',
              }}
            >
              {isActive && (
                <View
                  style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: colors.primary + '15',
                    borderRadius: 12,
                  }}
                />
              )}
              <Icon size={20} color={isActive ? colors.primary : colors.mutedForeground} strokeWidth={isActive ? 2.5 : 1.8} />
              <Text
                style={{
                  fontSize: 10,
                  marginTop: 4,
                  fontWeight: isActive ? '700' : '600',
                  color: isActive ? colors.primary : colors.mutedForeground,
                }}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Animated.View>
  );
}
