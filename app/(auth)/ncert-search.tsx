import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, ActivityIndicator, Linking, Modal, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { MotiView, AnimatePresence } from 'moti';
import {
  ArrowLeft, BookOpen, Search, ChevronRight, CheckCircle2, Trophy, X, Filter
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import apiService from '@/lib/apiService';
import { LinearGradient } from 'expo-linear-gradient';
import { gradients, gradientProps } from '@/theme/gradients';
import { API_BASE_URL } from '@/lib/api';

const { height } = Dimensions.get('window');

type ContentSource = { resourceType?: 'pdf' | 'text' | 'html' | 'external'; resourceUrl?: string; en?: any; hi?: any };
type Chapter = { _id: string; chapterId: string; subject: string; name: { en: string }; displayName?: string; ncert?: { class?: number; chapterNumber?: number }; contentSource?: ContentSource | null; resolvedContentSource?: ContentSource | null; };
type TopicResult = { _id: string; topicId: string; name: { en: string; hi?: string }; displayName?: string; subject: string; chapterId: string; chapter: Chapter | null; ncertReference?: { pageNumber?: number; lineRange?: string } | null; contentSource?: ContentSource | null; resolvedContentSource?: ContentSource | null; quiz: { sourceType: 'topic' | 'chapter'; available: boolean; totalQuestions: number; hasTaken: boolean; attempts: number; bestScore: number; lastScore: number; lastAttemptAt: string | null; }; };
type QuizQuestion = { questionId: string; question: string; options: Array<{ key: string; text: string }>; explanation?: string; };

const NCERTSearch = () => {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { language } = useLanguage();

  const [subjects, setSubjects] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [query, setQuery] = useState('');
  const [topics, setTopics] = useState<TopicResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<TopicResult | null>(null);

  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string | null>>({});
  const [quizResult, setQuizResult] = useState<{ percentage: number; bestScore: number; attempts: number } | null>(null);
  const [isLoadingQuiz, setIsLoadingQuiz] = useState(false);
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);
  const [quizStartedAt, setQuizStartedAt] = useState<number | null>(null);
  const [readConfirmed, setReadConfirmed] = useState(false);
  const [showDetailSheet, setShowDetailSheet] = useState(false);

  useEffect(() => { loadSubjects(); }, []);

  const loadSubjects = async () => {
    try {
      const response = await apiService.ncertSearch.getSubjects();
      setSubjects(response.data?.data || []);
    } catch (e) { }
  };

  const loadChapters = async (subject: string, ncertClass?: 11 | 12) => {
    try {
      const response = await apiService.ncertSearch.getChapters(subject || undefined, language, ncertClass);
      setChapters(response.data?.data || []);
    } catch (e) { }
  };

  const searchTopics = async () => {
    setIsSearching(true);
    try {
      const response = await apiService.ncertSearch.getTopics({
        subject: selectedSubject || undefined,
        query: query.trim() || undefined,
        limit: 100,
        lang: language,
        class: selectedClass ? Number(selectedClass) as 11 | 12 : undefined
      });
      setTopics(response.data?.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (!selectedSubject) { setChapters([]); return; }
    loadChapters(selectedSubject, selectedClass ? Number(selectedClass) as 11 | 12 : undefined);
  }, [selectedSubject, selectedClass, language]);

  useEffect(() => {
    if (selectedSubject || query.trim()) searchTopics();
  }, [language]);

  useEffect(() => {
    if (selectedSubject) searchTopics();
  }, [selectedSubject, selectedClass]);

  const resolveItemContentSource = (item: TopicResult) =>
    item?.resolvedContentSource?.resourceUrl ? item.resolvedContentSource : item?.chapter?.resolvedContentSource || null;

  const openReader = (item: TopicResult) => {
    const source = resolveItemContentSource(item);
    if (!source?.resourceUrl) return;
    Linking.openURL(source.resourceUrl);
  };

  const openTopicDetail = (topic: TopicResult) => {
    setSelectedTopic(topic);
    setQuizQuestions([]);
    setQuizAnswers({});
    setQuizResult(null);
    setReadConfirmed(false);
    setShowDetailSheet(true);
  };

  const startTopicQuiz = async () => {
    if (!selectedTopic) return;
    setIsLoadingQuiz(true);
    setQuizResult(null);
    try {
      const response = await apiService.ncertSearch.getTopicQuiz(selectedTopic._id, 10);
      const questions = response.data?.data?.questions || [];
      setQuizQuestions(questions);
      setQuizAnswers({});
      setQuizStartedAt(Date.now());
    } catch (e) {
    } finally { setIsLoadingQuiz(false); }
  };

  const submitTopicQuiz = async () => {
    if (!selectedTopic || quizQuestions.length === 0) return;
    setIsSubmittingQuiz(true);
    try {
      const answers = quizQuestions.map((q) => ({
        questionId: q.questionId,
        selectedOption: quizAnswers[q.questionId] ?? null
      }));
      const response = await apiService.ncertSearch.submitTopicQuiz(selectedTopic._id, {
        questionIds: quizQuestions.map((q) => q.questionId),
        answers,
        timeTaken: quizStartedAt ? Math.floor((Date.now() - quizStartedAt) / 1000) : 0
      });
      const data = response.data?.data;
      setQuizResult({
        percentage: data?.score?.percentage || 0,
        bestScore: data?.analytics?.bestScore || 0,
        attempts: data?.analytics?.attempts || 1
      });
      await searchTopics();
    } catch (e) {
    } finally { setIsSubmittingQuiz(false); }
  };

  const closeDetail = () => {
    setShowDetailSheet(false);
    setSelectedTopic(null);
    setQuizQuestions([]);
    setQuizAnswers({});
    setQuizResult(null);
    setReadConfirmed(false);
  };

  const selectedContentSource = selectedTopic?.resolvedContentSource?.resourceUrl
    ? selectedTopic.resolvedContentSource
    : selectedTopic?.chapter?.resolvedContentSource || null;

  const attemptedCount = topics.filter(t => t.quiz.hasTaken).length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Sticky Header */}
      <View style={{
        paddingTop: insets.top + 8, paddingBottom: 12, paddingHorizontal: 16,
        backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border,
        flexDirection: 'row', alignItems: 'center', gap: 12, zIndex: 30,
      }}>
        <Pressable onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' }}>
          <ArrowLeft size={20} color={colors.foreground} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground, fontFamily: 'Inter_700Bold' }}>NCERT Search</Text>
          <Text style={{ fontSize: 12, color: colors.mutedForeground }}>Browse topics & practice quizzes</Text>
        </View>
        {topics.length > 0 && (
          <View style={{ backgroundColor: colors.primary + '1A', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>
              {attemptedCount}/{topics.length}
            </Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 16 }} showsVerticalScrollIndicator={false}>
        {/* Filters Card */}
        <MotiView from={{ opacity: 0, translateY: 8 }} animate={{ opacity: 1, translateY: 0 }}
          style={{ backgroundColor: colors.card, borderRadius: 24, borderWidth: 1, borderColor: colors.border, padding: 16 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Filter size={16} color={colors.primary} />
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground }}>Filters</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
            <View style={{ flex: 1, borderRadius: 12, backgroundColor: colors.muted + '80', borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
              <Pressable style={{ padding: 12 }} onPress={() => setSelectedClass(selectedClass === '11' ? '12' : selectedClass === '12' ? '' : '11')}>
                <Text style={{ fontSize: 14, color: selectedClass ? colors.foreground : colors.mutedForeground }}>
                  {selectedClass ? `Class ${selectedClass}` : 'All Classes (Tap to toggle)'}
                </Text>
              </Pressable>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} contentContainerStyle={{ gap: 8 }}>
            <Pressable onPress={() => setSelectedSubject('')} style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: !selectedSubject ? colors.primary : colors.muted, borderWidth: 1, borderColor: !selectedSubject ? colors.primary : colors.border }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: !selectedSubject ? '#fff' : colors.foreground }}>All Subjects</Text>
            </Pressable>
            {subjects.map(s => (
              <Pressable key={s} onPress={() => setSelectedSubject(s)} style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: selectedSubject === s ? colors.primary : colors.muted, borderWidth: 1, borderColor: selectedSubject === s ? colors.primary : colors.border }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: selectedSubject === s ? '#fff' : colors.foreground }}>{s}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1, position: 'relative', justifyContent: 'center' }}>
              <View style={{ position: 'absolute', left: 12, zIndex: 1 }}><Search size={16} color={colors.mutedForeground} /></View>
              <TextInput
                value={query} onChangeText={setQuery} onSubmitEditing={searchTopics}
                placeholder="Search topic..." placeholderTextColor={colors.mutedForeground}
                style={{ width: '100%', height: 44, paddingLeft: 36, paddingRight: 12, borderRadius: 12, backgroundColor: colors.muted + '80', borderWidth: 1, borderColor: colors.border, color: colors.foreground, fontSize: 14 }}
              />
            </View>
            <Pressable onPress={searchTopics} disabled={isSearching} style={({ pressed }) => ({ opacity: pressed || isSearching ? 0.7 : 1 })}>
              <LinearGradient colors={[...gradients.primary]} start={gradientProps.start} end={gradientProps.end} style={{ height: 44, paddingHorizontal: 20, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>{isSearching ? '...' : 'Go'}</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </MotiView>

        {/* Topics List */}
        <View style={{ gap: 12 }}>
          {isSearching ? (
            <View style={{ padding: 48, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : topics.length === 0 ? (
            <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, borderRadius: 24, borderWidth: 1, borderColor: colors.border }}>
              <BookOpen size={40} color={colors.mutedForeground} style={{ opacity: 0.4, marginBottom: 12 }} />
              <Text style={{ fontSize: 14, fontWeight: '500', color: colors.mutedForeground }}>Select a class & subject to browse topics</Text>
            </MotiView>
          ) : (
            topics.map((topic, i) => {
              const itemSource = resolveItemContentSource(topic);
              return (
                <MotiView key={topic._id} from={{ opacity: 0, translateY: 6 }} animate={{ opacity: 1, translateY: 0 }} transition={{ delay: i * 0.05 }}
                  style={{ backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.border }}
                >
                  <Pressable onPress={() => openTopicDetail(topic)} style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: topic.quiz.hasTaken ? colors.success + '1A' : colors.primary + '1A' }}>
                      {topic.quiz.hasTaken ? <CheckCircle2 size={20} color={colors.success} /> : <BookOpen size={20} color={colors.primary} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground }} numberOfLines={1}>{topic.displayName || topic.name.en}</Text>
                      <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 2 }} numberOfLines={1}>{topic.chapter?.displayName || topic.chapter?.name?.en || topic.chapterId}</Text>
                      {topic.quiz.hasTaken && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                          <Text style={{ fontSize: 12, fontWeight: '500', color: colors.success }}>Best {topic.quiz.bestScore}%</Text>
                          <Text style={{ fontSize: 12, color: colors.mutedForeground }}>· {topic.quiz.attempts} attempt{topic.quiz.attempts !== 1 ? 's' : ''}</Text>
                        </View>
                      )}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      {itemSource?.resourceUrl && (
                        <Pressable onPress={() => openReader(topic)} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.primary + '1A' }}>
                          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>Read</Text>
                        </Pressable>
                      )}
                      <ChevronRight size={16} color={colors.mutedForeground} />
                    </View>
                  </Pressable>
                </MotiView>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Detail Bottom Sheet */}
      <Modal visible={showDetailSheet && !!selectedTopic} transparent animationType="slide" onRequestClose={closeDetail}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <Pressable style={{ flex: 1 }} onPress={closeDetail} />
          <View style={{ backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: height * 0.9 }}>
            <View style={{ width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <View style={{ flex: 1, paddingRight: 16 }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground }}>{selectedTopic?.displayName || selectedTopic?.name?.en}</Text>
                <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 4 }}>{selectedTopic?.chapter?.displayName || selectedTopic?.chapter?.name?.en || selectedTopic?.chapterId}</Text>
              </View>
              <Pressable onPress={closeDetail} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} color={colors.foreground} />
              </Pressable>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16, backgroundColor: colors.primary + '1A' }}><Text style={{ fontSize: 12, fontWeight: '500', color: colors.primary }}>Class {selectedTopic?.chapter?.ncert?.class || '—'}</Text></View>
              <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16, backgroundColor: colors.muted }}><Text style={{ fontSize: 12, fontWeight: '500', color: colors.mutedForeground }}>Ch. {selectedTopic?.chapter?.ncert?.chapterNumber || '—'}</Text></View>
              {selectedTopic?.ncertReference?.pageNumber && (
                <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16, backgroundColor: colors.muted }}><Text style={{ fontSize: 12, fontWeight: '500', color: colors.mutedForeground }}>Pg. {selectedTopic.ncertReference.pageNumber}</Text></View>
              )}
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingBottom: 40 }}>
              {selectedContentSource?.resourceUrl && (
                <View style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: colors.muted + '80' }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.foreground }}>NCERT Source</Text>
                    <Pressable onPress={() => openReader(selectedTopic!)}><Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>Open ↗</Text></Pressable>
                  </View>
                  <Pressable onPress={() => openReader(selectedTopic!)} style={{ padding: 16, alignItems: 'center', backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border }}>
                    <Text style={{ fontSize: 14, color: colors.primary, textAlign: 'center' }}>Open PDF / HTML Source in Browser</Text>
                  </Pressable>
                </View>
              )}

              {!readConfirmed && (
                <View style={{ borderRadius: 16, backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A', padding: 16 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: '#92400E' }}>📖 Read this topic first, then mark as read to unlock the quiz.</Text>
                  <Pressable onPress={() => setReadConfirmed(true)} style={{ marginTop: 12, width: '100%', paddingVertical: 12, borderRadius: 12, backgroundColor: '#F59E0B', alignItems: 'center' }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>Mark as Read ✓</Text>
                  </Pressable>
                </View>
              )}

              {readConfirmed && !quizQuestions.length && !quizResult && (
                <View style={{ borderRadius: 16, backgroundColor: colors.success + '1A', borderWidth: 1, borderColor: colors.success + '33', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <CheckCircle2 size={16} color={colors.success} />
                  <Text style={{ fontSize: 14, fontWeight: '500', color: colors.success }}>Marked as read</Text>
                </View>
              )}

              {selectedTopic?.quiz?.available ? (
                quizQuestions.length === 0 && !quizResult && (
                  <Pressable onPress={startTopicQuiz} disabled={!readConfirmed || isLoadingQuiz} style={({ pressed }) => ({ opacity: !readConfirmed || isLoadingQuiz || pressed ? 0.7 : 1 })}>
                    <LinearGradient colors={readConfirmed ? [...gradients.primary] : [colors.muted, colors.muted]} start={gradientProps.start} end={gradientProps.end} style={{ width: '100%', paddingVertical: 14, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <BookOpen size={16} color={readConfirmed ? '#fff' : colors.mutedForeground} />
                      <Text style={{ fontSize: 14, fontWeight: '600', color: readConfirmed ? '#fff' : colors.mutedForeground }}>{isLoadingQuiz ? 'Loading...' : selectedTopic.quiz.hasTaken ? 'Reattempt Quiz' : 'Take Quiz'}</Text>
                    </LinearGradient>
                  </Pressable>
                )
              ) : (
                <Text style={{ fontSize: 12, color: colors.mutedForeground, textAlign: 'center', paddingVertical: 8 }}>No quiz available for this topic yet.</Text>
              )}

              {quizQuestions.length > 0 && !quizResult && (
                <View style={{ gap: 12 }}>
                  {quizQuestions.map((q, index) => (
                    <View key={q.questionId} style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16, backgroundColor: colors.muted + '4D' }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground, lineHeight: 20 }}>{index + 1}. {q.question}</Text>
                      <View style={{ marginTop: 12, gap: 8 }}>
                        {q.options.map((opt) => {
                          const selected = quizAnswers[q.questionId] === opt.key;
                          return (
                            <Pressable key={opt.key} onPress={() => setQuizAnswers(prev => ({ ...prev, [q.questionId]: opt.key }))}
                              style={{ width: '100%', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary + '1A' : colors.card, flexDirection: 'row' }}
                            >
                              <Text style={{ fontSize: 14, fontWeight: '600', color: selected ? colors.primary : colors.foreground, marginRight: 6 }}>{opt.key}.</Text>
                              <Text style={{ flex: 1, fontSize: 14, color: selected ? colors.primary : colors.foreground }}>{opt.text}</Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  ))}
                  <Pressable onPress={submitTopicQuiz} disabled={isSubmittingQuiz} style={({ pressed }) => ({ opacity: pressed || isSubmittingQuiz ? 0.7 : 1, marginTop: 12 })}>
                    <LinearGradient colors={[...gradients.primary]} start={gradientProps.start} end={gradientProps.end} style={{ width: '100%', paddingVertical: 14, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>{isSubmittingQuiz ? 'Submitting...' : 'Submit Quiz'}</Text>
                    </LinearGradient>
                  </Pressable>
                </View>
              )}

              {quizResult && (
                <MotiView from={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ borderRadius: 24, borderWidth: 1, borderColor: colors.primary + '4D', backgroundColor: colors.primary + '0D', padding: 24, alignItems: 'center' }}>
                  <Trophy size={32} color={colors.primary} style={{ marginBottom: 12 }} />
                  <Text style={{ fontSize: 32, fontWeight: '800', color: colors.foreground }}>{quizResult.percentage}%</Text>
                  <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 4 }}>Best: {quizResult.bestScore}% · Attempts: {quizResult.attempts}</Text>
                  <Pressable
                    onPress={() => {
                      setQuizQuestions([]);
                      setQuizResult(null);
                    }}
                    style={{
                      marginTop: 16,
                      paddingHorizontal: 20,
                      paddingVertical: 10,
                      borderRadius: 12,
                      backgroundColor: colors.primary + '1A',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: colors.primary,
                      }}
                    >
                      Try Again
                    </Text>
                  </Pressable>
                </MotiView>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

    </View>
  );
};

export default NCERTSearch;
