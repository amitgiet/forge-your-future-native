import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Send, MessageCircle, ThumbsUp } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Avatar } from '@/components/ui/Avatar';

export default function DoubtDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [doubt, setDoubt] = useState<any>(null);
  const [answers, setAnswers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');

  useEffect(() => {
    // Load doubt detail
    setLoading(false);
  }, []);

  const handleSendReply = () => {
    if (!reply.trim()) return;
    // Submit reply
    setReply('');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: insets.top, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 }}>
          <Pressable onPress={() => router.back()} style={{ padding: 8 }}>
            <ArrowLeft size={24} color={colors.foreground} />
          </Pressable>
          <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold' }}>
            Doubt Detail
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 80 }}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={{ gap: 12 }}>
            <Skeleton height={120} borderRadius={12} />
            <Skeleton height={80} borderRadius={12} />
          </View>
        ) : doubt ? (
          <View style={{ gap: 16 }}>
            {/* Question */}
            <GlassCard style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Avatar size={32} name={doubt.author?.name || 'User'} />
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground }}>{doubt.author?.name || 'Anonymous'}</Text>
                  <Text style={{ fontSize: 11, color: colors.mutedForeground }}>{doubt.createdAt || 'Just now'}</Text>
                </View>
              </View>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground }}>{doubt.title}</Text>
              <Text style={{ fontSize: 14, color: colors.foreground, lineHeight: 22 }}>{doubt.description}</Text>
              {doubt.subject && <Badge variant="primary">{doubt.subject}</Badge>}
            </GlassCard>

            {/* Answers */}
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground, textTransform: 'uppercase', letterSpacing: 1, fontFamily: 'PlusJakartaSans_700Bold' }}>
              Answers ({answers.length})
            </Text>
            {answers.length === 0 ? (
              <GlassCard style={{ alignItems: 'center', paddingVertical: 24 }}>
                <MessageCircle size={32} color={colors.mutedForeground} />
                <Text style={{ fontSize: 14, color: colors.mutedForeground, marginTop: 8 }}>No answers yet. Be the first to help!</Text>
              </GlassCard>
            ) : (
              answers.map((answer: any, i: number) => (
                <GlassCard key={i} style={{ gap: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Avatar size={28} name={answer.author?.name || 'User'} />
                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.foreground }}>{answer.author?.name}</Text>
                  </View>
                  <Text style={{ fontSize: 14, color: colors.foreground, lineHeight: 22 }}>{answer.text}</Text>
                  <Pressable style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' }}>
                    <ThumbsUp size={14} color={colors.mutedForeground} />
                    <Text style={{ fontSize: 12, color: colors.mutedForeground }}>{answer.likes || 0}</Text>
                  </Pressable>
                </GlassCard>
              ))
            )}
          </View>
        ) : (
          <GlassCard style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Text style={{ color: colors.mutedForeground }}>Doubt not found</Text>
          </GlassCard>
        )}
      </ScrollView>

      {/* Reply Input */}
      <View
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          paddingHorizontal: 16, paddingBottom: insets.bottom + 8, paddingTop: 8,
          backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border,
          flexDirection: 'row', alignItems: 'center', gap: 10,
        }}
      >
        <TextInput
          placeholder="Write your answer..."
          placeholderTextColor={colors.mutedForeground}
          value={reply}
          onChangeText={setReply}
          style={{
            flex: 1, minHeight: 44, borderRadius: 12, paddingHorizontal: 16,
            backgroundColor: colors.input, color: colors.foreground, fontSize: 14,
            borderWidth: 1, borderColor: colors.border,
          }}
        />
        <Pressable
          onPress={handleSendReply}
          style={{
            width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primary,
            alignItems: 'center', justifyContent: 'center', opacity: reply.trim() ? 1 : 0.5,
          }}
        >
          <Send size={18} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}
