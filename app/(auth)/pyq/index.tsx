import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, BookOpen, Lock, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import apiService from '@/lib/apiService';
import { GlassCard } from '@/components/ui/GlassCard';

interface Topic {
  _id?: string;
  topicName: string;
  url: string;
  isAvailable?: boolean;
}

interface SubjectData {
  name: string;
  topics: Topic[];
}

const subjectOrder = ['physics', 'chemistry', 'biology', 'zoology'];

export default function PYQIndexScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [activeSubject, setActiveSubject] = useState<string>('physics');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [subjects, setSubjects] = useState<Record<string, SubjectData>>({
    physics: { name: 'Physics', topics: [] },
    chemistry: { name: 'Chemistry', topics: [] },
    biology: { name: 'Botany', topics: [] },
    zoology: { name: 'Zoology', topics: [] },
  });

  const subjectStyles: Record<string, { bg: string; icon: string; border: string }> = {
    physics: { bg: colors.primary + '1A', icon: colors.primary, border: colors.primary + '33' },
    chemistry: { bg: colors.success + '1A', icon: colors.success, border: colors.success + '33' },
    biology: { bg: colors.warning + '1A', icon: colors.warning, border: colors.warning + '33' },
    zoology: { bg: colors.secondary + '1A', icon: colors.secondary, border: colors.secondary + '33' },
  };

  const fetchPYQData = async () => {
    try {
      const response = await apiService.pyqMarkedNCERT.getAllPYQData();
      if (response.data?.success && response.data?.data) {
        const data = response.data.data;
        setSubjects({
          physics: { name: 'Physics', topics: data.physics || [] },
          chemistry: { name: 'Chemistry', topics: data.chemistry || [] },
          biology: { name: 'Botany', topics: data.biology?.botany || [] },
          zoology: { name: 'Zoology', topics: data.biology?.zoology || [] },
        });
        if (data.physics && data.physics.length > 0) {
          setActiveSubject('physics');
        }
      }
    } catch (err) {
      console.error('Error fetching PYQ data:', err);
      setError('Failed to load PYQ data. Please try again.');
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchPYQData().finally(() => setLoading(false));
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPYQData();
    setRefreshing(false);
  };

  const currentSubjectData = subjects[activeSubject];
  const activeStyles = subjectStyles[activeSubject] || subjectStyles.physics;
  const availableCount = currentSubjectData?.topics?.filter(t => t.isAvailable).length || 0;
  const totalCount = currentSubjectData?.topics?.length || 0;

  if (loading && !refreshing) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ width: 64, height: 64, borderRadius: 16, backgroundColor: colors.primary + '1A', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
        <Text style={{ color: colors.mutedForeground, fontSize: 14, fontWeight: '500' }}>Loading PYQ materials...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: 15, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: 16, paddingVertical: 12, elevation: 3, zIndex: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable
            onPress={() => router.back()}
            style={{ width: 36, height: 36, justifyContent: 'center', alignItems: 'center', borderRadius: 22, backgroundColor: colors.muted }}
          >
            <ChevronLeft size={20} color={colors.foreground} />
          </Pressable>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ width: 36, height: 36, borderRadius: 22, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' }}>
              <BookOpen size={18} color="#FFF" />
            </View>
            <View>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold' }}>PYQ Marked NCERT</Text>
              <Text style={{ fontSize: 11, color: colors.mutedForeground }}>Previous year questions highlighted</Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 8 }}>
          {subjectOrder
            .filter((s) => (subjects[s]?.topics?.length || 0) > 0)
            .map((subject) => {
              const isActive = activeSubject === subject;
              return (
                <Pressable
                  key={subject}
                  onPress={() => setActiveSubject(subject)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 99,
                    borderWidth: 1,
                    backgroundColor: isActive ? colors.primary : colors.card,
                    borderColor: isActive ? colors.primary : colors.border,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: isActive ? '#FFF' : colors.mutedForeground,
                    fontFamily: 'Inter_600SemiBold',
                  }}>
                    {subjects[subject].name}
                  </Text>
                </Pressable>
              );
            })}
        </ScrollView>

        {totalCount > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <View style={{ backgroundColor: colors.muted, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 99 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.mutedForeground }}>
                {availableCount} of {totalCount} available
              </Text>
            </View>
          </View>
        )}

        {error && (
          <View style={{ padding: 14, marginBottom: 16, borderRadius: 12, backgroundColor: colors.destructive + '1A', borderWidth: 1, borderColor: colors.destructive + '4D' }}>
            <Text style={{ fontSize: 14, color: colors.destructive, fontWeight: '500' }}>{error}</Text>
          </View>
        )}

        {currentSubjectData?.topics?.length > 0 ? (
          <View style={{ gap: 8 }}>
            {currentSubjectData.topics.map((topic, index) => {
              const available = topic.isAvailable;
              return (
                <Pressable
                  key={topic._id || index}
                  onPress={() => available && router.push({ pathname: '/(auth)/pyq/[topicId]', params: { topicId: topic._id } } as any)}
                  disabled={!available}
                  style={({ pressed }) => [
                    {
                      width: '100%',
                      opacity: available ? 1 : 0.6,
                    },
                    pressed && available && { opacity: 0.8, transform: [{ scale: 0.98 }] },
                  ]}
                >
                  <GlassCard
                    small
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      backgroundColor: available ? colors.card : colors.background,
                      borderColor: available ? colors.border : colors.muted,
                    }}
                  >
                    <View style={{ width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center', backgroundColor: !available ? colors.muted : activeStyles.bg }}>
                      {!available ? (
                        <Lock size={16} color={colors.mutedForeground} />
                      ) : (
                        <BookOpen size={16} color={activeStyles.icon} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '500', color: !available ? colors.mutedForeground : colors.foreground, fontFamily: 'Inter_500Medium' }} numberOfLines={1}>
                        {topic.topicName}
                      </Text>
                      {!available && (
                        <Text style={{ fontSize: 11, color: colors.mutedForeground }}>Coming soon</Text>
                      )}
                    </View>
                    {available && (
                      <ChevronRight size={16} color={colors.mutedForeground} />
                    )}
                  </GlassCard>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <GlassCard style={{ padding: 40, alignItems: 'center' }}>
            <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: colors.muted, justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
              <BookOpen size={28} color={colors.mutedForeground} />
            </View>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.foreground, marginBottom: 4 }}>No topics available</Text>
            <Text style={{ fontSize: 14, color: colors.mutedForeground }}>Please select another subject</Text>
          </GlassCard>
        )}

        <View style={{ marginTop: 20, padding: 16, borderRadius: 12, backgroundColor: colors.primary + '0D', borderWidth: 1, borderColor: colors.primary + '26' }}>
          <Text style={{ fontSize: 14, color: colors.mutedForeground, lineHeight: 20 }}>
            <Text style={{ fontWeight: '700', color: colors.foreground }}>📖 Tip: </Text>
            Tap any topic to view PYQ marked NCERT material directly in the app.
          </Text>
        </View>

      </ScrollView>
    </View>
  );
}
