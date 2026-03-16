import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { ChevronLeft, ChevronRight, FlaskConical, Atom, Zap } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import apiService from '@/lib/apiService';

// Same subject icon map as web
const SubjectIcon = ({ name }: { name: string }) => {
  const lower = name?.toLowerCase();
  const { colors } = useTheme();
  if (lower === 'physics') return <Zap size={20} color={colors.foreground} />;
  if (lower === 'chemistry') return <FlaskConical size={20} color={colors.foreground} />;
  return <Atom size={20} color={colors.foreground} />;
};

const FormulaCards: React.FC = () => {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const res = await apiService.formulas.getSubjects();
        if (res.data?.success) setSubjects(res.data.data);
      } catch (e) {
        console.error('Failed to load formula subjects:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchSubjects();
  }, []);

  const openChapter = (subjectTitle: string, chapter: any) => {
    router.push({
      pathname: '/(auth)/formula-cards/[chapter]' as any,
      params: { chapter: encodeURIComponent(chapter.title), subjectTitle, chapterTitle: chapter.title, chapterColor: chapter.color },
    });
  };

  const calculateCardsCount = (subject: any) =>
    subject.chapters.reduce((acc: number, curr: any) => acc + (curr.cardsCount || 0), 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header — same as web: sticky, backdrop-blur, border-b */}
      <View style={{
        backgroundColor: colors.background + 'F2',
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        paddingHorizontal: 16,
        paddingBottom: 12,
        paddingTop: insets.top + 4,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => ({
            padding: 4, borderRadius: 10,
            backgroundColor: pressed ? colors.muted : 'transparent',
          })}
        >
          <ChevronLeft size={20} color={colors.foreground} />
        </Pressable>
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground, fontFamily: 'Inter_700Bold' }}>
          📋 Formula Cards
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32, gap: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
            <ActivityIndicator size="large" color={colors.primary} style={{ marginBottom: 16 }} />
            <Text style={{ fontSize: 14, color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }}>
              Loading concepts...
            </Text>
          </View>
        ) : (
          subjects.map((subject) => (
            <MotiView
              key={subject._id}
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 300 }}
            >
              {/* Subject header — same as web */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {/* Icon badge */}
                  <View style={{ padding: 6, borderRadius: 10, backgroundColor: colors.muted }}>
                    <SubjectIcon name={subject.title} />
                  </View>
                  <View>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground, fontFamily: 'Inter_700Bold' }}>
                      {subject.title}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }}>
                      {calculateCardsCount(subject)} Formula Cards
                    </Text>
                  </View>
                </View>
                <ChevronRight size={20} color={colors.mutedForeground} />
              </View>

              <Text style={{ fontSize: 12, color: colors.mutedForeground, fontFamily: 'Inter_400Regular', marginBottom: 8 }}>
                Explore chapters
              </Text>

              {/* Horizontal chapter cards — same as web: w-[130px] h-[140px] */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 12, paddingHorizontal: 2 }}
              >
                {subject.chapters.map((chapter: any) => (
                  <Pressable
                    key={chapter._id}
                    onPress={() => openChapter(subject.title, chapter)}
                    style={({ pressed }) => ({
                      width: 130,
                      height: 140,
                      borderRadius: 16,
                      padding: 12,
                      backgroundColor: chapter.color || '#37B24D',
                      justifyContent: 'space-between',
                      overflow: 'hidden',
                      opacity: pressed ? 0.9 : 1,
                    })}
                  >
                    {/* Chapter title — same as web: font-bold text-white leading-tight */}
                    <Text
                      style={{ fontSize: 13, fontWeight: '700', color: '#fff', lineHeight: 18 }}
                      numberOfLines={3}
                    >
                      {chapter.title}
                    </Text>

                    {/* Cards count pill — same as web: bg-black/20 backdrop-blur text-white/90 */}
                    <View style={{
                      flexDirection: 'row', alignItems: 'center', gap: 4,
                      alignSelf: 'flex-start',
                      backgroundColor: 'rgba(0,0,0,0.25)',
                      borderRadius: 999,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                    }}>
                      <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.9)', fontWeight: '500' }}>
                        📄 {chapter.cardsCount || 0}
                      </Text>
                    </View>

                    {/* Decorative circle — same as web */}
                    <View style={{
                      position: 'absolute',
                      bottom: -16,
                      right: -16,
                      width: 64,
                      height: 64,
                      borderRadius: 32,
                      backgroundColor: 'rgba(255,255,255,0.1)',
                    }} />

                    {/* BG Image overlay if provided */}
                    {chapter.bgColor && (
                      <Image
                        source={{ uri: chapter.bgColor }}
                        style={{
                          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                          opacity: 0.2,
                        }}
                        resizeMode="cover"
                      />
                    )}
                  </Pressable>
                ))}
              </ScrollView>
            </MotiView>
          ))
        )}
      </ScrollView>
    </View>
  );
};

export default FormulaCards;
