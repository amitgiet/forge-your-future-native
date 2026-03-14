import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, FileText, Calendar } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import apiService from '@/lib/apiService';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';

export default function PYQTopicViewerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { topicId } = useLocalSearchParams<{ topicId: string }>();

  const [topic, setTopic] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiService.pyqMarkedNCERT.getTopicById(topicId);
        if (res.data?.success) {
          setTopic(res.data.data);
        }
      } catch {} finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
        <View style={{ padding: 16, gap: 12 }}>
          <Skeleton height={40} borderRadius={8} />
          <Skeleton height={200} borderRadius={12} />
          <Skeleton height={100} borderRadius={12} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: insets.top, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 }}>
          <Pressable onPress={() => router.back()} style={{ padding: 8 }}>
            <ArrowLeft size={24} color={colors.foreground} />
          </Pressable>
          <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold' }} numberOfLines={1}>
            {topic?.topic || topic?.title || 'PYQ Topic'}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
      >
        {topic ? (
          <View style={{ gap: 16 }}>
            {/* Header */}
            <GlassCard style={{ gap: 10 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold' }}>
                {topic.topic || topic.title}
              </Text>
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                {topic.subject && <Badge variant="primary">{topic.subject}</Badge>}
                {topic.chapter && <Badge variant="outline">{topic.chapter}</Badge>}
                {topic.importance && <Badge variant={topic.importance === 'high' ? 'warning' : 'secondary'}>{topic.importance}</Badge>}
              </View>
            </GlassCard>

            {/* NCERT Reference */}
            {topic.ncertReference && (
              <GlassCard style={{ gap: 8 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground, textTransform: 'uppercase', letterSpacing: 1, fontFamily: 'PlusJakartaSans_700Bold' }}>
                  NCERT Reference
                </Text>
                <Text style={{ fontSize: 14, color: colors.foreground, lineHeight: 22 }}>
                  {topic.ncertReference}
                </Text>
              </GlassCard>
            )}

            {/* PYQ Questions */}
            {topic.questions && topic.questions.length > 0 && (
              <View>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, fontFamily: 'PlusJakartaSans_700Bold' }}>
                  Previous Year Questions ({topic.questions.length})
                </Text>
                {topic.questions.map((q: any, i: number) => (
                  <GlassCard key={i} style={{ marginBottom: 10, gap: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Calendar size={14} color={colors.warning} />
                      <Text style={{ fontSize: 12, fontWeight: '600', color: colors.warning }}>
                        {q.year || 'NEET'}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 14, color: colors.foreground, lineHeight: 22 }}>
                      {q.question || q.text}
                    </Text>
                    {q.answer && (
                      <View style={{ paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border }}>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.success }}>
                          Answer: {q.answer}
                        </Text>
                      </View>
                    )}
                  </GlassCard>
                ))}
              </View>
            )}

            {/* Key Points */}
            {topic.keyPoints && topic.keyPoints.length > 0 && (
              <GlassCard style={{ gap: 8 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground, textTransform: 'uppercase', letterSpacing: 1, fontFamily: 'PlusJakartaSans_700Bold' }}>
                  Key Points
                </Text>
                {topic.keyPoints.map((point: string, i: number) => (
                  <View key={i} style={{ flexDirection: 'row', gap: 8 }}>
                    <Text style={{ color: colors.primary, fontWeight: '700' }}>{i + 1}.</Text>
                    <Text style={{ flex: 1, fontSize: 14, color: colors.foreground, lineHeight: 22 }}>{point}</Text>
                  </View>
                ))}
              </GlassCard>
            )}
          </View>
        ) : (
          <GlassCard style={{ alignItems: 'center', paddingVertical: 40 }}>
            <FileText size={40} color={colors.mutedForeground} />
            <Text style={{ color: colors.mutedForeground, marginTop: 12 }}>Topic not found</Text>
          </GlassCard>
        )}
      </ScrollView>
    </View>
  );
}
