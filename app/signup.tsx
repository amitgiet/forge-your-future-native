import React, { useState } from 'react';
import { View, Text, Pressable, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { GlassCard } from '@/components/ui/GlassCard';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { GlowOrb } from '@/components/ui/GlowOrb';

export default function SignupScreen() {
  const router = useRouter();
  const { signup } = useAuth();
  const { colors } = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignup = async () => {
    setError('');
    setLoading(true);
    try {
      await signup(name, email, password, phone || undefined);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Signup failed');
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
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <GlowOrb color="#0080ff" size={500} top={-200} right={-100} opacity={0.1} />
        <GlowOrb color="#4a42d1" size={400} bottom={-150} left={-100} opacity={0.08} />

        <MotiView
          from={{ opacity: 0, translateY: 24 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ duration: 600, type: 'timing' }}
        >
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
              style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 4, fontFamily: 'Inter_400Regular' }}
            >
              Create your account and start learning
            </Text>
          </View>

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
              Sign up
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
                <Text style={{ fontSize: 13, color: colors.destructive }}>{error}</Text>
              </View>
            ) : null}

            <View style={{ gap: 12 }}>
              <Input label="NAME" placeholder="Your name" value={name} onChangeText={setName} />
              <Input
                label="EMAIL"
                placeholder="your@email.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Input
                label="PASSWORD"
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
              <Input
                label="PHONE (Optional)"
                placeholder="Phone number"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
              <Button onPress={handleSignup} loading={loading} style={{ marginTop: 4 }}>
                {loading ? 'Creating account...' : 'Create account'}
              </Button>
            </View>

            <View style={{ marginTop: 16, alignItems: 'center' }}>
              <Text style={{ fontSize: 14, color: colors.mutedForeground }}>
                Already have an account?{' '}
              </Text>
              <Pressable onPress={() => router.push('/login')}>
                <Text
                  style={{ fontSize: 14, color: colors.primary, fontWeight: '600', marginTop: 4 }}
                >
                  Sign in
                </Text>
              </Pressable>
            </View>
          </GlassCard>
        </MotiView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
