import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Play, BookOpen } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import apiService from '@/lib/apiService';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';

export default function PracticeStartScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ subject?: string; chapterId?: string; topic?: string; mode?: string }>();

  const [subTopics, setSubTopics] = useState<any[]>([]);
  const [selectedSubTopic, setSelectedSubTopic] = useState('');
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!params.subject || !params.chapterId) {
        setLoading(false);
        return;
      }
      try {
        const res = await apiService.curriculum.getSubTopics(params.subject, params.chapterId, params.topic);
        if (res.data?.success) {
          setSubTopics(res.data.data || []);
        }
      } catch {} finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleStartPractice = async () => {
    if (!params.subject || !params.chapterId || !params.topic) {
      Alert.alert('Error', 'Missing required parameters');
      return;
    }

    setStarting(true);
    try {
      const subTopic = selectedSubTopic || subTopics[0]?.name || subTopics[0]?.title || subTopics[0] || params.topic;
      const uids = subTopics.find((st: any) => (st.name || st.title || st) === subTopic)?.uids || [];

      const res = await apiService.curriculum.startRun({
        subject: params.subject as any,
        chapterId: params.chapterId,
        topic: params.topic,
        subTopic: String(subTopic),
        mode: (params.mode || 'practice') as 'practice' | 'test',
        uids: uids.slice(0, 20),
      });

      if (res.data?.success) {
        router.replace({
          pathname: '/(auth)/practice/session/[challengeId]',
          params: { challengeId: res.data.data?._id || res.data.data?.runId },
        } as any);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to start practice');
    } finally {
      setStarting(false);
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
            Start Practice
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Topic Info */}
        <GlassCard style={{ marginBottom: 20, gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <BookOpen size={18} color={colors.primary} />
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold' }}>
              {params.topic || 'Practice'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {params.subject && <Badge variant="primary">{params.subject}</Badge>}
            <Badge variant={params.mode === 'test' ? 'warning' : 'success'}>
              {params.mode === 'test' ? 'Test Mode' : 'Practice Mode'}
            </Badge>
          </View>
        </GlassCard>

        {loading ? (
          <View style={{ gap: 12 }}>
            <Skeleton height={48} borderRadius={12} />
            <Skeleton height={48} borderRadius={12} />
          </View>
        ) : subTopics.length > 0 ? (
          <View style={{ gap: 16 }}>
            <Select
              label="Select Sub-topic"
              placeholder="Choose a sub-topic"
              options={subTopics.map((st: any) => {
                const name = typeof st === 'string' ? st : (st.name || st.title);
                return { label: name, value: name };
              })}
              value={selectedSubTopic}
              onValueChange={setSelectedSubTopic}
            />
            <Button onPress={handleStartPractice} loading={starting} disabled={starting} size="lg">
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Play size={20} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Start Practice</Text>
              </View>
            </Button>
          </View>
        ) : (
          <View style={{ gap: 16 }}>
            <GlassCard style={{ alignItems: 'center', paddingVertical: 20 }}>
              <Text style={{ fontSize: 14, color: colors.mutedForeground }}>
                No sub-topics found. Starting with the main topic.
              </Text>
            </GlassCard>
            <Button onPress={handleStartPractice} loading={starting} disabled={starting} size="lg">
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Play size={20} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Start Practice</Text>
              </View>
            </Button>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
