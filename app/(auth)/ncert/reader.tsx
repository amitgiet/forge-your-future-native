import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, BookOpen, Play } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import apiService from '@/lib/apiService';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';

export default function NCERTReaderScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ topicId: string; title?: string }>();

  const [topic, setTopic] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params.topicId) return;
    const loadTopic = async () => {
      try {
        const res = await apiService.ncertSearch.getTopics({ query: params.title, limit: 1 });
        if (res.data?.success && res.data.data?.length > 0) {
          setTopic(res.data.data[0]);
        }
      } catch {} finally {
        setLoading(false);
      }
    };
    loadTopic();
  }, [params.topicId]);

  const handleStartQuiz = () => {
    router.push({
      pathname: '/(auth)/curriculum/quiz-instructions',
      params: { topicId: params.topicId, title: params.title || topic?.title },
    } as any);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: insets.top, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 }}>
          <Pressable onPress={() => router.back()} style={{ padding: 8 }}>
            <ArrowLeft size={24} color={colors.foreground} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold' }} numberOfLines={1}>
              {params.title || 'NCERT Content'}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={{ gap: 12 }}>
            <Skeleton height={40} borderRadius={8} />
            <Skeleton height={200} borderRadius={12} />
            <Skeleton height={100} borderRadius={12} />
          </View>
        ) : topic ? (
          <View style={{ gap: 16 }}>
            {/* Topic Header */}
            <GlassCard style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {topic.subject && <Badge variant="primary">{topic.subject}</Badge>}
                {topic.chapter && <Badge variant="outline">{topic.chapter}</Badge>}
                {topic.class && <Badge variant="secondary">Class {topic.class}</Badge>}
              </View>
              <Text style={{ fontSize: 20, fontWeight: '700', color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold' }}>
                {topic.title || topic.name}
              </Text>
            </GlassCard>

            {/* Content */}
            {topic.content && (
              <GlassCard>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, fontFamily: 'PlusJakartaSans_700Bold' }}>
                  Content
                </Text>
                <Text style={{ fontSize: 15, color: colors.foreground, lineHeight: 24, fontFamily: 'Inter_400Regular' }}>
                  {topic.content}
                </Text>
              </GlassCard>
            )}

            {/* Key Points */}
            {topic.keyPoints && topic.keyPoints.length > 0 && (
              <GlassCard>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, fontFamily: 'PlusJakartaSans_700Bold' }}>
                  Key Points
                </Text>
                {topic.keyPoints.map((point: string, i: number) => (
                  <View key={i} style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                    <Text style={{ fontSize: 14, color: colors.primary, fontWeight: '700' }}>{i + 1}.</Text>
                    <Text style={{ flex: 1, fontSize: 14, color: colors.foreground, lineHeight: 22 }}>{point}</Text>
                  </View>
                ))}
              </GlassCard>
            )}

            {/* Lines/Concepts */}
            {topic.lines && topic.lines.length > 0 && (
              <GlassCard>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, fontFamily: 'PlusJakartaSans_700Bold' }}>
                  Concepts
                </Text>
                {topic.lines.map((line: any, i: number) => (
                  <View key={i} style={{ paddingVertical: 8, borderBottomWidth: i < topic.lines.length - 1 ? 1 : 0, borderBottomColor: colors.border }}>
                    <Text style={{ fontSize: 14, color: colors.foreground, lineHeight: 22 }}>
                      {typeof line === 'string' ? line : line.text || line.content}
                    </Text>
                  </View>
                ))}
              </GlassCard>
            )}

            {/* Quiz CTA */}
            <Button onPress={handleStartQuiz} size="lg">
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Play size={20} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Take Quiz on This Topic</Text>
              </View>
            </Button>
          </View>
        ) : (
          <GlassCard style={{ alignItems: 'center', paddingVertical: 40, gap: 12 }}>
            <BookOpen size={40} color={colors.mutedForeground} />
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.foreground }}>Content not found</Text>
            <Text style={{ fontSize: 13, color: colors.mutedForeground }}>This topic may have been removed or moved.</Text>
          </GlassCard>
        )}
      </ScrollView>
    </View>
  );
}
