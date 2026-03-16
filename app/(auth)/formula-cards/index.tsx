import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, FlaskConical, Atom, Zap } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import apiService from '@/lib/apiService';
import { getImageUrl } from '@/lib/utils';

const subjectIcons: Record<string, React.ReactNode> = {
  physics: <Zap size={20} color="#3b82f6" />,
  chemistry: <FlaskConical size={20} color="#f59e0b" />,
  biology: <Atom size={20} color="#22c55e" />,
};

export default function FormulaCardsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const res = await apiService.formulas.getSubjects();
        if (res.data?.success) {
          setSubjects(res.data.data);
        }
      } catch (error) {
        console.error('Failed to load formula subjects:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSubjects();
  }, []);

  const openChapter = (subjectTitle: string, chapter: any) => {
    router.push({
      pathname: '/(auth)/formula-cards/[chapter]',
      params: {
        chapter: chapter.title,
        subjectTitle,
        chapterColor: chapter.color,
      }
    } as any);
  };

  const calculateCardsCount = (subject: any) => {
    return subject.chapters?.reduce((acc: number, curr: any) => acc + (curr.cardsCount || 0), 0) || 0;
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: insets.top, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.card, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
          <ChevronLeft size={24} color={colors.foreground} />
        </Pressable>
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground }}>📋 Formula Cards</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }}>
        {loading ? (
          <View style={{ paddingVertical: 40, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color={colors.primary} style={{ marginBottom: 16 }} />
            <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>Loading concepts...</Text>
          </View>
        ) : (
          <View style={{ gap: 24 }}>
            {subjects.map((subject) => (
              <View key={subject._id}>
                {/* Subject Header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ padding: 8, borderRadius: 13, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
                      {subjectIcons[subject.title?.toLowerCase()] || <Atom size={20} color={colors.foreground} />}
                    </View>
                    <View>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground }}>{subject.title}</Text>
                      <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 2 }}>{calculateCardsCount(subject)} Formula Cards</Text>
                    </View>
                  </View>
                  <ChevronRight size={20} color={colors.mutedForeground} />
                </View>

                <Text style={{ fontSize: 12, color: colors.mutedForeground, marginBottom: 12 }}>Explore chapters</Text>

                {/* Chapters Carousel */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 16 }}>
                  {subject.chapters?.map((chapter: any) => (
                    <Pressable
                      key={chapter._id}
                      onPress={() => openChapter(subject.title, chapter)}
                      style={{
                        width: 140,
                        height: 150,
                        borderRadius: 19,
                        padding: 16,
                        backgroundColor: chapter.color || '#37B24D',
                        justifyContent: 'space-between',
                        overflow: 'hidden',
                      }}
                    >
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff', zIndex: 10 }} numberOfLines={3}>
                        {chapter.title}
                      </Text>

                      <View style={{ alignSelf: 'flex-start', backgroundColor: 'rgba(0,0,0,0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, zIndex: 10 }}>
                        <Text style={{ fontSize: 11, fontWeight: '600', color: '#fff' }}>📄 {chapter.cardsCount || 0}</Text>
                      </View>

                      {/* Decorative elements */}
                      <View style={{ position: 'absolute', bottom: -16, right: -16, width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.1)' }} />

                      {chapter.bgColor && (
                        <Image
                          source={{ uri: getImageUrl(chapter.bgColor) }}
                          style={{ position: 'absolute', width: '100%', height: '100%', opacity: 0.2, resizeMode: 'cover' }}
                        />
                      )}
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
