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
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/hooks/useSocket';
import { MotiView, AnimatePresence } from 'moti';

export default function AddFriendScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const { user: currentUser } = useAuth();
  const { notifyFriendRequestSent } = useSocket(currentUser?._id);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const performSearch = async (text: string) => {
    const q = text.trim();
    if (q.length < 2) {
      setError('Please enter at least 2 characters to search.');
      return;
    }
    setLoading(true);
    setSearched(true);
    setError('');
    try {
      const res = await apiService.social.searchUsers(q);
      if (res.data?.success) {
        setResults(res.data.data || []);
        if ((res.data.data || []).length === 0) {
          // no results — empty state will show
        }
      } else {
        setError(res.data?.message || 'Search failed. Please try again.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Search failed. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = useCallback((text: string) => {
    setQuery(text);
    setError('');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      performSearch(text);
    }, 600);
  }, []);

  const handleSendRequest = async (userId: string, targetUser: any) => {
    setSending(userId);
    setError('');
    setSuccess('');
    try {
      await apiService.social.sendFriendRequest(userId);
      setSuccess(`Friend request sent to ${targetUser.name}!`);

      if (currentUser) {
        notifyFriendRequestSent(userId, {
          _id: currentUser._id,
          name: currentUser.name,
          email: currentUser.email,
          avatar: currentUser.avatar
        });
      }

      setSentRequests((prev) => new Set([...prev, userId]));
      setResults(prev => prev.filter(r => r._id !== userId));

      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to send request');
    } finally {
      setSending(null);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Sticky Header — title only */}
      <View style={{
        paddingTop: insets.top,
        paddingHorizontal: 16,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 }}>
          <Pressable onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' }}>
            <ArrowLeft size={20} color={colors.foreground} />
          </Pressable>
          <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: colors.foreground, fontFamily: 'Inter_700Bold' }}>
            Add Friend
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingTop: insets.top + 60 + 16, paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Search bar */}
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 12 }}>
          <View style={{ flex: 1 }}>
            <Input
              placeholder="Search by name, email or phone..."
              value={query}
              onChangeText={(text) => {
                handleSearch(text);
                setError('');
              }}
              onSubmitEditing={() => performSearch(query)}
              autoFocus
              style={{ height: 45, borderRadius: 22 }}
              containerStyle={{ marginBottom: 0 }}
            />
          </View>
          <Button
            onPress={() => performSearch(query)}
            style={{ height: 45, borderRadius: 22, paddingHorizontal: 16 }}
            loading={loading}
          >
            <Search size={18} color="#fff" />
          </Button>
        </View>

        <AnimatePresence>
          {error ? (
            <MotiView from={{ opacity: 0, translateY: -10 }} animate={{ opacity: 1, translateY: 0 }} exit={{ opacity: 0, translateY: -10 }}
              style={{ marginBottom: 12, padding: 12, borderRadius: 12, backgroundColor: '#ef44441a', borderWidth: 1, borderColor: '#ef444433' }}
            >
              <Text style={{ fontSize: 13, color: '#dc2626', fontWeight: '500' }}>{error}</Text>
            </MotiView>
          ) : null}
          {success ? (
            <MotiView from={{ opacity: 0, translateY: -10 }} animate={{ opacity: 1, translateY: 0 }} exit={{ opacity: 0, translateY: -10 }}
              style={{ marginBottom: 12, padding: 12, borderRadius: 12, backgroundColor: '#22c55e1a', borderWidth: 1, borderColor: '#22c55e33' }}
            >
              <Text style={{ fontSize: 13, color: '#16a34a', fontWeight: '500' }}>{success}</Text>
            </MotiView>
          ) : null}
        </AnimatePresence>

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
                <GlassCard key={user._id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 20 }}>
                  <Avatar size={48} name={user.name || 'User'} uri={user.avatar} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: colors.foreground, fontFamily: 'Inter_700Bold' }}>
                      {user.name}
                    </Text>
                    {user.email && (
                      <Text style={{ fontSize: 12, color: colors.mutedForeground }}>{user.email}</Text>
                    )}
                    {user.phone && (
                      <Text style={{ fontSize: 11, color: colors.mutedForeground, marginTop: 2 }}>{user.phone}</Text>
                    )}
                  </View>
                  {isSent ? (
                    <Badge variant="success" style={{ borderRadius: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Check size={12} color={colors.success} />
                        <Text style={{ fontSize: 12, color: colors.success, fontWeight: '700' }}>Sent</Text>
                      </View>
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      onPress={() => handleSendRequest(user._id, user)}
                      loading={sending === user._id}
                      disabled={!!sending}
                      style={{ borderRadius: 12, paddingHorizontal: 16 }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <UserPlus size={14} color="#fff" />
                        <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Add</Text>
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
