import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, MessageCircle, ChevronRight, HelpCircle, Plus } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';

export default function DoubtsIndexScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [doubts, setDoubts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDoubts = async () => {
    // Doubts are loaded from social/community features
    // Placeholder data structure for the forum
    setLoading(false);
  };

  useEffect(() => { fetchDoubts(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDoubts();
    setRefreshing(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: insets.top, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 }}>
          <Pressable onPress={() => router.back()} style={{ padding: 8 }}>
            <ArrowLeft size={24} color={colors.foreground} />
          </Pressable>
          <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold' }}>
            Doubt Forum
          </Text>
          <Button size="sm" onPress={() => {}}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Plus size={16} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>Ask</Text>
            </View>
          </Button>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={{ gap: 12 }}>
            {[1, 2, 3].map((i) => <Skeleton key={i} height={100} borderRadius={12} />)}
          </View>
        ) : doubts.length === 0 ? (
          <GlassCard style={{ alignItems: 'center', paddingVertical: 40, gap: 12 }}>
            <HelpCircle size={40} color={colors.mutedForeground} />
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.foreground }}>No doubts yet</Text>
            <Text style={{ fontSize: 13, color: colors.mutedForeground, textAlign: 'center', lineHeight: 20 }}>
              Have a question about a topic? Ask the community and get help from peers and mentors.
            </Text>
            <Button size="sm" onPress={() => {}} style={{ marginTop: 8 }}>
              Ask Your First Doubt
            </Button>
          </GlassCard>
        ) : (
          <View style={{ gap: 12 }}>
            {doubts.map((doubt: any) => (
              <Pressable
                key={doubt._id}
                onPress={() => router.push({
                  pathname: '/(auth)/doubts/[id]',
                  params: { id: doubt._id },
                } as any)}
              >
                <GlassCard style={{ gap: 8 }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: colors.foreground, fontFamily: 'Inter_600SemiBold' }}>
                    {doubt.title}
                  </Text>
                  {doubt.description && (
                    <Text style={{ fontSize: 13, color: colors.mutedForeground }} numberOfLines={2}>
                      {doubt.description}
                    </Text>
                  )}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {doubt.subject && <Badge variant="primary">{doubt.subject}</Badge>}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <MessageCircle size={14} color={colors.mutedForeground} />
                      <Text style={{ fontSize: 12, color: colors.mutedForeground }}>{doubt.answers || 0} answers</Text>
                    </View>
                  </View>
                </GlassCard>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
