import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, BookOpen, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import apiService from '@/lib/apiService';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';

export default function QuizStartScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [chapters, setChapters] = useState<any[]>([]);
  const [selectedChapter, setSelectedChapter] = useState('');
  const [topics, setTopics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiService.ncertSearch.getSubjects();
        if (res.data?.success) {
          setSubjects(res.data.data || []);
        }
      } catch {} finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!selectedSubject) return;
    const load = async () => {
      try {
        const res = await apiService.ncertSearch.getChapters(selectedSubject);
        if (res.data?.success) {
          setChapters(res.data.data || []);
          setSelectedChapter('');
          setTopics([]);
        }
      } catch {}
    };
    load();
  }, [selectedSubject]);

  useEffect(() => {
    if (!selectedChapter) return;
    const load = async () => {
      try {
        const res = await apiService.ncertSearch.getTopics({ chapterId: selectedChapter });
        if (res.data?.success) {
          setTopics(res.data.data || []);
        }
      } catch {}
    };
    load();
  }, [selectedChapter]);

  const handleStartQuiz = async (topicId: string) => {
    setStarting(true);
    try {
      const res = await apiService.ncertSearch.getTopicQuiz(topicId, 10);
      if (res.data?.success) {
        router.push({
          pathname: '/(auth)/quiz/session',
          params: { topicId, questions: JSON.stringify(res.data.data?.questions || []) },
        } as any);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to load quiz');
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
            Start Topic Quiz
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {loading ? (
          <View style={{ gap: 12 }}>
            <Skeleton height={48} borderRadius={12} />
            <Skeleton height={48} borderRadius={12} />
          </View>
        ) : (
          <View style={{ gap: 16 }}>
            <Select
              label="Subject"
              placeholder="Select a subject"
              options={subjects.map((s: any) => ({ label: s.name || s, value: s._id || s }))}
              value={selectedSubject}
              onValueChange={setSelectedSubject}
            />

            {chapters.length > 0 && (
              <Select
                label="Chapter"
                placeholder="Select a chapter"
                options={chapters.map((c: any) => ({ label: c.title || c.name || c, value: c._id || c }))}
                value={selectedChapter}
                onValueChange={setSelectedChapter}
              />
            )}

            {topics.length > 0 && (
              <View style={{ gap: 12, marginTop: 8 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground, textTransform: 'uppercase', letterSpacing: 1, fontFamily: 'PlusJakartaSans_700Bold' }}>
                  Select a topic to quiz
                </Text>
                {topics.map((topic: any) => (
                  <Pressable
                    key={topic._id}
                    onPress={() => handleStartQuiz(topic._id)}
                    disabled={starting}
                  >
                    <GlassCard style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View style={{ padding: 10, borderRadius: 10, backgroundColor: colors.primary + '15' }}>
                        <BookOpen size={18} color={colors.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground, fontFamily: 'Inter_600SemiBold' }}>
                          {topic.title || topic.name}
                        </Text>
                        {topic.lineCount && (
                          <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 2 }}>
                            {topic.lineCount} concepts
                          </Text>
                        )}
                      </View>
                      <ChevronRight size={18} color={colors.mutedForeground} />
                    </GlassCard>
                  </Pressable>
                ))}
              </View>
            )}

            {!selectedSubject && (
              <GlassCard style={{ alignItems: 'center', paddingVertical: 32, gap: 12 }}>
                <BookOpen size={40} color={colors.mutedForeground} />
                <Text style={{ fontSize: 14, color: colors.mutedForeground, textAlign: 'center' }}>
                  Select a subject and chapter to browse quiz topics
                </Text>
              </GlassCard>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
