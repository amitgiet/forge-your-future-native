import React, { useState } from 'react';
import { View, Text, Pressable, Platform, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { ShieldCheck, ArrowRight } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { GlowOrb } from '@/components/ui/GlowOrb';
import Svg, { Path } from 'react-native-svg';

// Custom Google SVG icon
const GoogleIcon = ({ size = 24 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <Path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <Path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <Path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </Svg>
);

export default function LoginScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  // We'll replace this actual authentication hook logic smoothly later
  // For now, it just shows loading state
  const [loadingGoogle, setLoadingGoogle] = useState(false);

  const handleGoogleLogin = async () => {
    setLoadingGoogle(true);
    try {
      // TODO: Implement actual Google login logic here or via Context
      console.log('Google login requested');
      // await loginWithGoogle();
    } catch (err: any) {
      console.error(err);
    } finally {
      setTimeout(() => setLoadingGoogle(false), 1000); // Simulate network
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
          paddingTop: 60,
          paddingBottom: 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        <GlowOrb color="#0080ff" size={500} top={-200} right={-100} opacity={0.1} />
        <GlowOrb color="#4a42d1" size={400} bottom={100} left={-100} opacity={0.08} />

        <MotiView
          from={{ opacity: 0, translateY: 24 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ duration: 600, type: 'timing' }}
          style={{ width: '100%', alignItems: 'center' }}
        >
          {/* Illustration Section (Placeholder) */}
          <View
            style={{
              width: 240,
              height: 240,
              backgroundColor: colors.primary + '10',
              borderRadius: 120,
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 40,
            }}
          >
            {/* The user can replace this with their actual image asset */}
            <GlowOrb color={colors.primary} size={200} opacity={0.3} />
            <Text style={{ position: 'absolute', fontSize: 64 }}>🎓</Text>
          </View>

          {/* Heading */}
          <Text
            style={{
              fontSize: 32,
              fontWeight: '800',
              color: colors.foreground,
              fontFamily: 'PlusJakartaSans_800ExtraBold',
              textAlign: 'center',
              letterSpacing: -0.5,
              marginBottom: 12,
            }}
          >
            Crack Your NEET Exam
          </Text>

          {/* Trusted Badge */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              marginBottom: 40,
            }}
          >
            <ShieldCheck size={20} color={colors.primary} fill={colors.primary + '30'} />
            <Text
              style={{
                fontSize: 16,
                fontWeight: '600',
                color: colors.primary,
                fontFamily: 'Inter_600SemiBold',
              }}
            >
              Trusted by 10L+ users in India
            </Text>
          </View>

          {/* Action Buttons Container */}
          <View style={{ width: '100%', gap: 16 }}>
            {/* Google Sign In Button */}
            <Pressable
              onPress={handleGoogleLogin}
              disabled={loadingGoogle}
              style={({ pressed }) => ({
                height: 56,
                backgroundColor: '#111827', // Dark blackish color
                borderRadius: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                opacity: pressed || loadingGoogle ? 0.8 : 1,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
                elevation: 5,
              })}
            >
              <GoogleIcon size={24} />
              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: 16,
                  fontWeight: '600',
                  fontFamily: 'Inter_600SemiBold',
                }}
              >
                {loadingGoogle ? 'Connecting...' : 'Continue with Google'}
              </Text>
            </Pressable>

            {/* Email Continuation */}
            <Pressable
              onPress={() => router.push('/login-email')}
              style={({ pressed }) => ({
                paddingVertical: 12,
                alignItems: 'center',
                opacity: pressed ? 0.7 : 1,
                marginTop: 8,
              })}
            >
              <Text
                style={{
                  fontSize: 16,
                  color: colors.primary,
                  fontWeight: '600',
                  fontFamily: 'Inter_600SemiBold',
                }}
              >
                Continue with email
              </Text>
            </Pressable>
          </View>

          {/* Footer Terms Label */}
          <View style={{ marginTop: 'auto', paddingTop: 60 }}>
            <Text
              style={{
                fontSize: 12,
                color: colors.mutedForeground,
                fontFamily: 'Inter_400Regular',
                textAlign: 'center',
              }}
            >
              By continuing, you agree to our{' '}
              <Text style={{ textDecorationLine: 'underline' }}>terms & privacy policy</Text>
            </Text>
          </View>
        </MotiView>
      </ScrollView>
    </View>
  );
}

