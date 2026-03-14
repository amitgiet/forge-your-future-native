import React, { useState } from 'react';
import { View, Text, Pressable, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { Mail, Lock, Eye, EyeOff, LogIn, Zap, ArrowRight } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { GlassCard } from '@/components/ui/GlassCard';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { GlowOrb } from '@/components/ui/GlowOrb';
import { Separator } from '@/components/ui/Separator';

export default function LoginScreen() {
  const router = useRouter();
  const { login, demoLogin } = useAuth();
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          padding: 24,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <GlowOrb color="#0080ff" size={500} top={-200} right={-100} opacity={0.1} />
        <GlowOrb color="#4a42d1" size={400} bottom={-150} left={-100} opacity={0.08} />

        <MotiView
          from={{ opacity: 0, translateY: 24 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ duration: 600, type: 'timing' }}
        >
          {/* Logo */}
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            <Text
              style={{
                fontSize: 28,
                fontWeight: '800',
                color: colors.primary,
                fontFamily: 'PlusJakartaSans_800ExtraBold',
                letterSpacing: -1,
              }}
            >
              NEETFORGE
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: colors.mutedForeground,
                marginTop: 4,
                fontFamily: 'Inter_400Regular',
              }}
            >
              Welcome back — let's continue learning
            </Text>
          </View>

          {/* Login Form */}
          <GlassCard>
            <Text
              style={{
                fontSize: 18,
                fontWeight: '700',
                color: colors.foreground,
                marginBottom: 16,
                fontFamily: 'PlusJakartaSans_700Bold',
              }}
            >
              Sign in
            </Text>

            {error ? (
              <View
                style={{
                  marginBottom: 16,
                  padding: 12,
                  borderRadius: 12,
                  backgroundColor: colors.destructive + '10',
                  borderWidth: 1,
                  borderColor: colors.destructive + '20',
                }}
              >
                <Text style={{ fontSize: 13, color: colors.destructive, fontFamily: 'Inter_400Regular' }}>
                  {error}
                </Text>
              </View>
            ) : null}

            <View style={{ gap: 12 }}>
              <Input
                label="EMAIL"
                placeholder="your@email.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <View>
                <Input
                  label="PASSWORD"
                  placeholder="••••••••"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: 16, bottom: 14 }}
                >
                  {showPassword ? (
                    <EyeOff size={18} color={colors.mutedForeground} />
                  ) : (
                    <Eye size={18} color={colors.mutedForeground} />
                  )}
                </Pressable>
              </View>

              <Button onPress={handleLogin} loading={loading} style={{ marginTop: 4 }}>
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>
            </View>

            {/* Demo */}
            <Separator style={{ marginVertical: 16 }} />

            <Button variant="outline" onPress={demoLogin}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Zap size={16} color={colors.foreground} />
                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.foreground }}>
                  Enter Demo Mode
                </Text>
                <ArrowRight size={16} color={colors.foreground} />
              </View>
            </Button>

            <View style={{ marginTop: 16, alignItems: 'center' }}>
              <Text style={{ fontSize: 14, color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }}>
                Don't have an account?{' '}
              </Text>
              <Pressable onPress={() => router.push('/signup')}>
                <Text
                  style={{
                    fontSize: 14,
                    color: colors.primary,
                    fontWeight: '600',
                    fontFamily: 'Inter_600SemiBold',
                    marginTop: 4,
                  }}
                >
                  Sign up
                </Text>
              </Pressable>
            </View>
          </GlassCard>
        </MotiView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
