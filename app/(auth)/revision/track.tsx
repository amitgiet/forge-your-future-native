import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert, RefreshControl } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, BookOpen, ChevronRight, Check } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import apiService from '@/lib/apiService';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';

export default function RevisionTrackScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ level?: string }>();

  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [chapters, setChapters] = useState<any[]>([]);
  const [trackedChapters, setTrackedChapters] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [tracking, setTracking] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const res = await apiService.ncertSearch.getSubjects();
      if (res.data?.success) {
        setSubjects(res.data.data || []);
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (!selectedSubject) return;
    const loadChapters = async () => {
      try {
        const res = await apiService.ncertSearch.getChapters(selectedSubject);
        if (res.data?.success) {
          setChapters(res.data.data || []);
        }
      } catch {}
    };
    loadChapters();
  }, [selectedSubject]);

  const handleTrackChapter = async (chapterId: string) => {
    setTracking(chapterId);
    try {
      await apiService.neuronz.trackChapter(chapterId);
      setTrackedChapters((prev) => new Set([...prev, chapterId]));
      Alert.alert('Tracked!', 'Chapter added to your revision schedule.');
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to track chapter');
    } finally {
      setTracking(null);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
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
            Track Chapters
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={{ gap: 12 }}>
            <Skeleton height={48} borderRadius={12} />
            <Skeleton height={80} borderRadius={12} />
            <Skeleton height={80} borderRadius={12} />
          </View>
        ) : (
          <View style={{ gap: 16 }}>
            <GlassCard style={{ gap: 8 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground, fontFamily: 'Inter_600SemiBold' }}>
                Add chapters to your revision tracker
              </Text>
              <Text style={{ fontSize: 13, color: colors.mutedForeground, lineHeight: 20 }}>
                Once tracked, concepts will be scheduled using the 7-level spaced repetition system.
              </Text>
            </GlassCard>

            <Select
              label="Subject"
              placeholder="Select a subject"
              options={subjects.map((s: any) => ({ label: s.name || s, value: s._id || s }))}
              value={selectedSubject}
              onValueChange={setSelectedSubject}
            />

            {chapters.length > 0 && (
              <View style={{ gap: 10 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground, textTransform: 'uppercase', letterSpacing: 1, fontFamily: 'PlusJakartaSans_700Bold' }}>
                  Chapters
                </Text>
                {chapters.map((chapter: any) => {
                  const chId = chapter._id || chapter.id;
                  const isTracked = trackedChapters.has(chId);
                  return (
                    <GlassCard key={chId} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View style={{ padding: 10, borderRadius: 10, backgroundColor: colors.success + '15' }}>
                        <BookOpen size={18} color={colors.success} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground, fontFamily: 'Inter_600SemiBold' }}>
                          {chapter.title || chapter.name}
                        </Text>
                        {chapter.topicCount && (
                          <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 2 }}>
                            {chapter.topicCount} topics
                          </Text>
                        )}
                      </View>
                      {isTracked ? (
                        <Badge variant="success">
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Check size={12} color={colors.success} />
                            <Text style={{ fontSize: 12, color: colors.success, fontWeight: '600' }}>Tracked</Text>
                          </View>
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onPress={() => handleTrackChapter(chId)}
                          loading={tracking === chId}
                          disabled={tracking === chId}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Plus size={14} color={colors.foreground} />
                            <Text style={{ fontSize: 13, color: colors.foreground, fontWeight: '600' }}>Track</Text>
                          </View>
                        </Button>
                      )}
                    </GlassCard>
                  );
                })}
              </View>
            )}

            {selectedSubject && chapters.length === 0 && (
              <GlassCard style={{ alignItems: 'center', paddingVertical: 32 }}>
                <Text style={{ color: colors.mutedForeground }}>No chapters found for this subject.</Text>
              </GlassCard>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
