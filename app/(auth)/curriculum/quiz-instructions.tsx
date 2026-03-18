import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Play, Clock, Target, Info } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import apiService from '@/lib/apiService';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';

export default function QuizInstructionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{
    subject?: string;
    chapterId?: string;
    topic?: string;
    topicId?: string;
    title?: string;
    runId?: string;
    duration?: string;
    questions?: string;
    mode?: 'practice' | 'test';
  }>();

  const [mode, setMode] = useState<'practice' | 'test'>(params.mode || 'practice');
  const [starting, setStarting] = useState(false);

  const topicName = params.topic || params.title || 'Quiz';

  const handleStart = async () => {
    setStarting(true);
    try {
      if (params.runId) {
        // Already started curriculum run
        router.replace({
          pathname: '/(auth)/practice/session/[challengeId]',
          params: { challengeId: params.runId },
        } as any);
        return;
      }

      if (params.topicId) {
        // NCERT topic quiz
        const res = await apiService.ncertSearch.getTopicQuiz(params.topicId, 10);
        if (res.data?.success) {
          router.replace({
            pathname: '/(auth)/quiz/session',
            params: { topicId: params.topicId, questions: JSON.stringify(res.data.data?.questions || []) },
          } as any);
        }
      } else if (params.subject && params.chapterId && params.topic) {
        // Curriculum practice (needs starting)
        router.replace({
          pathname: '/(auth)/practice/start',
          params: { subject: params.subject, chapterId: params.chapterId, topic: params.topic, mode },
        } as any);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to start quiz');
    } finally {
      setStarting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* ── Sticky Header ── */}
      <View style={{
        paddingTop: insets.top,
        paddingHorizontal: 16,
        paddingBottom: 4,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        zIndex: 10,
      }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: 8
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Pressable 
              onPress={() => router.back()}
              style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}
            >
              <ArrowLeft size={20} color={colors.foreground} />
            </Pressable>
            <View>
              <Text style={{ fontSize: 20, fontWeight: '800', color: colors.primary, fontFamily: 'PlusJakartaSans_800ExtraBold' }}>
                Instructions
              </Text>
              <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: -2, fontFamily: 'Inter_400Regular' }}>
                Quick guide before you start
              </Text>
            </View>
          </View>
          <View style={{
            width: 44, height: 44, borderRadius: 16,
            backgroundColor: colors.primary + '14',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Info size={24} color={colors.primary} />
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Topic Info */}
        <GlassCard style={{ alignItems: 'center', paddingVertical: 24, marginBottom: 20, gap: 8 }}>
          <View style={{ padding: 14, borderRadius: 16, backgroundColor: colors.primary + '15' }}>
            <Target size={28} color={colors.primary} />
          </View>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold', textAlign: 'center' }}>
            {topicName}
          </Text>
          <View style={{ flexWrap: 'wrap', flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
            {params.subject && <Badge variant="primary">{params.subject}</Badge>}
            {params.questions && (
              <Badge variant="outline">
                {(() => {
                  try {
                    return JSON.parse(params.questions).length;
                  } catch {
                    return '?';
                  }
                })()} questions
              </Badge>
            )}
            {params.duration && <Badge variant="secondary">{params.duration} mins</Badge>}
          </View>
        </GlassCard>

        {/* Mode Selection */}
        {params.subject && (
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground, marginBottom: 10, fontFamily: 'Inter_600SemiBold' }}>
              Select Mode
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {[
                { key: 'practice' as const, label: 'Practice', desc: 'No timer, see answers after each question' },
                { key: 'test' as const, label: 'Test', desc: 'Timed, see results at the end' },
              ].map((m) => (
                <Pressable key={m.key} onPress={() => setMode(m.key)} style={{ flex: 1 }}>
                  <GlassCard
                    style={{
                      alignItems: 'center', gap: 6,
                      borderWidth: mode === m.key ? 2 : 1,
                      borderColor: mode === m.key ? colors.primary : colors.border,
                    }}
                  >
                    <Text style={{ fontSize: 15, fontWeight: '600', color: mode === m.key ? colors.primary : colors.foreground }}>
                      {m.label}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.mutedForeground, textAlign: 'center' }}>
                      {m.desc}
                    </Text>
                  </GlassCard>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Instructions */}
        <GlassCard style={{ gap: 12, marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Info size={16} color={colors.primary} />
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold' }}>
              Instructions
            </Text>
          </View>
          {[
            'Read each question carefully before selecting an answer.',
            'You can navigate between questions using the navigation buttons.',
            mode === 'practice'
              ? 'In practice mode, you can check the answer after each question.'
              : 'In test mode, answers will be revealed only after submission.',
            'Each correct answer earns +4 marks, incorrect answer -1 mark.',
            'Unanswered questions carry no penalty.',
          ].map((instruction, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 8 }}>
              <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '700' }}>{i + 1}.</Text>
              <Text style={{ flex: 1, fontSize: 13, color: colors.foreground, lineHeight: 20 }}>{instruction}</Text>
            </View>
          ))}
        </GlassCard>

        <Button onPress={handleStart} loading={starting} disabled={starting} size="lg">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Play size={20} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold' }}>
              Start {mode === 'practice' ? 'Practice' : 'Test'}
            </Text>
          </View>
        </Button>
      </ScrollView>
    </View>
  );
}
