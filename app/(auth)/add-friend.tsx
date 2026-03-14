import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Search, UserPlus, Check, Users } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import apiService from '@/lib/apiService';
import { GlassCard } from '@/components/ui/GlassCard';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';

export default function AddFriendScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());

  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback((text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setSearched(true);
      try {
        const res = await apiService.social.searchUsers(text.trim());
        if (res.data?.success) {
          setResults(res.data.data || []);
        }
      } catch {} finally {
        setLoading(false);
      }
    }, 500);
  }, []);

  const handleSendRequest = async (userId: string) => {
    setSending(userId);
    try {
      await apiService.social.sendFriendRequest(userId);
      setSentRequests((prev) => new Set([...prev, userId]));
      Alert.alert('Request Sent!', 'Friend request has been sent.');
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to send request');
    } finally {
      setSending(null);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: insets.top, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 }}>
          <Pressable onPress={() => router.back()} style={{ padding: 8 }}>
            <ArrowLeft size={24} color={colors.foreground} />
          </Pressable>
          <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold' }}>
            Add Friend
          </Text>
        </View>
        <Input
          placeholder="Search by name or email..."
          value={query}
          onChangeText={handleSearch}
          autoFocus
        />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {loading ? (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ color: colors.mutedForeground, marginTop: 12 }}>Searching...</Text>
          </View>
        ) : results.length > 0 ? (
          <View style={{ gap: 10 }}>
            {results.map((user: any) => {
              const isSent = sentRequests.has(user._id);
              return (
                <GlassCard key={user._id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Avatar size={44} name={user.name || 'User'} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: colors.foreground, fontFamily: 'Inter_600SemiBold' }}>
                      {user.name}
                    </Text>
                    {user.email && (
                      <Text style={{ fontSize: 12, color: colors.mutedForeground }}>{user.email}</Text>
                    )}
                  </View>
                  {isSent ? (
                    <Badge variant="success">
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Check size={12} color={colors.success} />
                        <Text style={{ fontSize: 12, color: colors.success, fontWeight: '600' }}>Sent</Text>
                      </View>
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      onPress={() => handleSendRequest(user._id)}
                      loading={sending === user._id}
                      disabled={!!sending}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <UserPlus size={14} color="#fff" />
                        <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>Add</Text>
                      </View>
                    </Button>
                  )}
                </GlassCard>
              );
            })}
          </View>
        ) : searched && !loading ? (
          <GlassCard style={{ alignItems: 'center', paddingVertical: 40, gap: 12 }}>
            <Search size={40} color={colors.mutedForeground} />
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.foreground }}>No users found</Text>
            <Text style={{ fontSize: 13, color: colors.mutedForeground }}>Try a different search term</Text>
          </GlassCard>
        ) : (
          <GlassCard style={{ alignItems: 'center', paddingVertical: 40, gap: 12 }}>
            <Users size={40} color={colors.mutedForeground} />
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.foreground }}>Find Friends</Text>
            <Text style={{ fontSize: 13, color: colors.mutedForeground, textAlign: 'center', lineHeight: 20 }}>
              Search for friends by name or email to connect and study together.
            </Text>
          </GlassCard>
        )}
      </ScrollView>
    </View>
  );
}
