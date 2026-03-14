import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, BookMarked, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import apiService from '@/lib/apiService';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';

const SUBJECT_COLORS: Record<string, string> = {
  physics: '#1a8dff',
  chemistry: '#1fad64',
  biology: '#f5a623',
};

export default function FormulaCardsIndexScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSubjects = async () => {
    try {
      const res = await apiService.formulas.getSubjects();
      if (res.data?.success) {
        setSubjects(res.data.data || []);
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSubjects(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSubjects();
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
            Formula Cards
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <GlassCard style={{ marginBottom: 20, gap: 4 }}>
          <BookMarked size={24} color={colors.primary} />
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold', marginTop: 8 }}>
            Quick Formula Reference
          </Text>
          <Text style={{ fontSize: 13, color: colors.mutedForeground, lineHeight: 20 }}>
            Browse and bookmark important formulas organized by subject and chapter.
          </Text>
        </GlassCard>

        {loading ? (
          <View style={{ gap: 12 }}>
            {[1, 2, 3].map((i) => <Skeleton key={i} height={100} borderRadius={12} />)}
          </View>
        ) : subjects.length === 0 ? (
          <GlassCard style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Text style={{ color: colors.mutedForeground }}>No subjects available</Text>
          </GlassCard>
        ) : (
          <View style={{ gap: 12 }}>
            {subjects.map((subject: any, i: number) => {
              const name = typeof subject === 'string' ? subject : (subject.name || subject.title);
              const subjectColor = SUBJECT_COLORS[name?.toLowerCase()] || colors.primary;
              const chapters = subject.chapters || [];
              return (
                <GlassCard key={i} style={{ gap: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ padding: 10, borderRadius: 10, backgroundColor: subjectColor + '15' }}>
                      <BookMarked size={20} color={subjectColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold' }}>
                        {name}
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
                        {chapters.length || subject.chapterCount || '—'} chapters
                      </Text>
                    </View>
                  </View>

                  {chapters.length > 0 ? (
                    <View style={{ gap: 6 }}>
                      {chapters.slice(0, 5).map((ch: any, ci: number) => (
                        <Pressable
                          key={ci}
                          onPress={() => router.push({
                            pathname: '/(auth)/formula-cards/[chapterId]',
                            params: { chapterId: ch._id || ch.title || ch, title: ch.title || ch },
                          } as any)}
                          style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: ci < chapters.length - 1 ? 1 : 0, borderBottomColor: colors.border }}
                        >
                          <Text style={{ flex: 1, fontSize: 14, color: colors.foreground }}>{ch.title || ch.name || ch}</Text>
                          <ChevronRight size={16} color={colors.mutedForeground} />
                        </Pressable>
                      ))}
                      {chapters.length > 5 && (
                        <Text style={{ fontSize: 12, color: colors.primary, textAlign: 'center', paddingVertical: 4 }}>
                          +{chapters.length - 5} more chapters
                        </Text>
                      )}
                    </View>
                  ) : (
                    <Pressable
                      onPress={() => router.push({
                        pathname: '/(auth)/formula-cards/[chapterId]',
                        params: { chapterId: name, title: name },
                      } as any)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                    >
                      <Text style={{ fontSize: 14, color: colors.primary, fontWeight: '600' }}>Browse chapters</Text>
                      <ChevronRight size={16} color={colors.primary} />
                    </Pressable>
                  )}
                </GlassCard>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
