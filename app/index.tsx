import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import { Zap } from 'lucide-react-native';
import * as SecureStore from 'expo-secure-store';
import { useTheme } from '@/contexts/ThemeContext';
import { gradients, gradientProps } from '@/theme/gradients';
import { GlowOrb } from '@/components/ui/GlowOrb';

export default function SplashScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  useEffect(() => {
    const timer = setTimeout(async () => {
      const token = await SecureStore.getItemAsync('token');
      if (token) {
        router.replace('/(auth)/(tabs)');
      } else {
        router.replace('/login');
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.background,
      }}
    >
      <GlowOrb color="#0080ff" size={500} top={-100} opacity={0.12} />
      <GlowOrb color="#4a42d1" size={300} bottom={100} left={-50} opacity={0.1} />

      {/* Logo */}
      <MotiView
        from={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      >
        {/* Pulsing ring */}
        <MotiView
          from={{ scale: 1, opacity: 0.6 }}
          animate={{ scale: 1.5, opacity: 0 }}
          transition={{ loop: true, duration: 1500, type: 'timing' }}
          style={{
            position: 'absolute',
            top: -4,
            left: -4,
            right: -4,
            bottom: -4,
            borderRadius: 24,
            borderWidth: 2,
            borderColor: 'rgba(99, 102, 241, 0.3)',
          }}
        />

        <LinearGradient
          colors={[...gradients.primary]}
          start={gradientProps.start}
          end={gradientProps.end}
          style={{
            width: 112,
            height: 112,
            borderRadius: 24,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Zap size={56} color="#ffffff" fill="#ffffff" />
        </LinearGradient>
      </MotiView>

      {/* Title */}
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ delay: 400, duration: 500, type: 'timing' }}
      >
        <Text
          style={{
            marginTop: 32,
            fontSize: 36,
            fontWeight: '800',
            color: colors.primary,
            fontFamily: 'PlusJakartaSans_800ExtraBold',
            letterSpacing: -1,
          }}
        >
          NEETFORGE
        </Text>
      </MotiView>

      {/* Tagline */}
      <MotiView
        from={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 600, duration: 400, type: 'timing' }}
      >
        <Text
          style={{
            marginTop: 8,
            fontSize: 14,
            color: colors.mutedForeground,
            fontFamily: 'Inter_500Medium',
          }}
        >
          Forge your future
        </Text>
      </MotiView>

      {/* Loading dots */}
      <MotiView
        from={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1000, duration: 400, type: 'timing' }}
        style={{ flexDirection: 'row', gap: 8, marginTop: 48 }}
      >
        {[colors.primary, colors.secondary, colors.accent].map((color, i) => (
          <MotiView
            key={i}
            from={{ scale: 1, opacity: 0.4 }}
            animate={{ scale: 1.5, opacity: 1 }}
            transition={{
              loop: true,
              duration: 800,
              delay: i * 150,
              type: 'timing',
            }}
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: color,
            }}
          />
        ))}
      </MotiView>
    </View>
  );
}
