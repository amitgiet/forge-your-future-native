import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, ActivityIndicator, Modal, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, BookOpen, Search, ChevronRight, CheckCircle2, Trophy, X, Filter } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import apiService from '@/lib/apiService';
import { API_BASE_URL } from '@/lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '@/contexts/LanguageContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const FILTERS_STORAGE_KEY = 'ncert_search_filters';

export default function NCERTSearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  // We approximate useLanguage by not providing true i18n native context in this mocked file, 
  // but if real context is missing we default 'en'
  const language = 'en'; 

  const [subjects, setSubjects] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [chapters, setChapters] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [query, setQuery] = useState('');
  const [topics, setTopics] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<any | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string | null>>({});
  const [quizResult, setQuizResult] = useState<any | null>(null);
  const [isLoadingQuiz, setIsLoadingQuiz] = useState(false);
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);
  const [quizStartedAt, setQuizStartedAt] = useState<number | null>(null);
  const [readConfirmed, setReadConfirmed] = useState(false);
  const [showDetailSheet, setShowDetailSheet] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(FILTERS_STORAGE_KEY).then(raw => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed.selectedClass) setSelectedClass(parsed.selectedClass);
          if (parsed.selectedSubject) setSelectedSubject(parsed.selectedSubject);
          if (parsed.query) setQuery(parsed.query);
        } catch {}
      }
    });
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    try {
      const response = await apiService.ncertSearch.getSubjects();
      setSubjects(response.data?.data || []);
    } catch {}
  };

  const loadChapters = async (subject: string, ncertClass?: number) => {
    try {
      const response = await apiService.ncertSearch.getChapters(
        subject || undefined,
        language as 'en' | 'hi',
        ncertClass as 11 | 12 | undefined
      );
      setChapters(response.data?.data || []);
    } catch {}
  };

  const searchTopics = async () => {
    setIsSearching(true);
    try {
      const response = await apiService.ncertSearch.getTopics({
        subject: selectedSubject || undefined,
        query: query.trim() || undefined,
        limit: 100,
        lang: language as 'en' | 'hi',
        class: selectedClass ? (Number(selectedClass) as 11 | 12) : undefined
      });
      setTopics(response.data?.data || []);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (!selectedSubject) { setChapters([]); return; }
    loadChapters(selectedSubject, selectedClass ? Number(selectedClass) : undefined);
  }, [selectedSubject, selectedClass]);

  useEffect(() => {
    if (selectedSubject || query.trim()) searchTopics();
  }, [selectedSubject, selectedClass]);

  useEffect(() => {
    AsyncStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify({ selectedClass, selectedSubject, query }));
  }, [selectedClass, selectedSubject, query]);

  const resolveItemContentSource = (item: any) =>
    item?.resolvedContentSource?.resourceUrl
      ? item.resolvedContentSource
      : item?.chapter?.resolvedContentSource || null;

  const openReader = (item: any) => {
    const source = resolveItemContentSource(item);
    if (!source?.resourceUrl) return;
    const title = item.displayName || item.name?.en || item.chapter?.displayName || item.chapterId;
    // In React Native we would push a specific PDF viewing route or modal. Since we may not have `ncert-reader` natively yet, we can re-use the generic webview route if present.
    router.push({ pathname: '/(auth)/ncert-reader' as any, params: { url: source.resourceUrl, type: source.resourceType || 'external', title } });
  };

  const openTopicDetail = (topic: any) => {
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
    } finally { setIsLoadingQuiz(false); }
  };

  const submitTopicQuiz = async () => {
    if (!selectedTopic || quizQuestions.length === 0) return;
    setIsSubmittingQuiz(true);
    try {
      const answers = quizQuestions.map(q => ({
        questionId: q.questionId,
        selectedOption: quizAnswers[q.questionId] ?? null
      }));
      const response = await apiService.ncertSearch.submitTopicQuiz(selectedTopic._id, {
        questionIds: quizQuestions.map(q => q.questionId),
        answers,
        timeTaken: quizStartedAt ? Math.floor((Date.now() - quizStartedAt) / 1000) : 0
      });
      const data = response.data?.data;
      setQuizResult({
        percentage: data?.score?.percentage || 0,
        bestScore: data?.analytics?.bestScore || 0,
        attempts: data?.analytics?.attempts || 1
      });
      searchTopics();
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

  const attemptedCount = topics.filter(t => t.quiz?.hasTaken).length;

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
                NCERT Search
              </Text>
              <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: -2, fontFamily: 'Inter_400Regular' }}>
                Browse topics & practice quizzes
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {topics.length > 0 && (
              <View style={{ backgroundColor: colors.primary + '14', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: colors.primary }}>{attemptedCount}/{topics.length}</Text>
              </View>
            )}
            <View style={{
              width: 44, height: 44, borderRadius: 16,
              backgroundColor: colors.primary + '14',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Search size={22} color={colors.primary} />
            </View>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}>
        {/* Filters */}
        <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 19, padding: 16, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Filter size={16} color={colors.primary} />
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground }}>Filters</Text>
          </View>
          
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
             {/* Class Selector Mock */}
             <Pressable style={{ flex: 1, height: 40, borderRadius: 15, backgroundColor: colors.muted, justifyContent: 'center', paddingHorizontal: 12 }}>
                <Text style={{ fontSize: 14, color: selectedClass ? colors.foreground : colors.mutedForeground }}>{selectedClass ? `Class ${selectedClass}` : 'All Classes'}</Text>
             </Pressable>
             {/* Subject Selector Mock */}
             <Pressable style={{ flex: 1, height: 40, borderRadius: 15, backgroundColor: colors.muted, justifyContent: 'center', paddingHorizontal: 12 }}>
                <Text style={{ fontSize: 14, color: selectedSubject ? colors.foreground : colors.mutedForeground }}>{selectedSubject || 'All Subjects'}</Text>
             </Pressable>
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
             <View style={{ flex: 1, height: 40, backgroundColor: colors.muted, borderRadius: 15, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 }}>
               <Search size={16} color={colors.mutedForeground} style={{ marginRight: 8 }} />
               <TextInput
                 value={query}
                 onChangeText={setQuery}
                 onSubmitEditing={searchTopics}
                 placeholder="Search topic..."
                 placeholderTextColor={colors.mutedForeground}
                 style={{ flex: 1, fontSize: 14, color: colors.foreground }}
               />
             </View>
             <Pressable onPress={searchTopics} disabled={isSearching} style={{ height: 40, paddingHorizontal: 20, borderRadius: 15, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
               <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>{isSearching ? '...' : 'Go'}</Text>
             </Pressable>
          </View>
        </View>

        {/* List */}
        {isSearching && <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />}
        
        {!isSearching && topics.length === 0 && (
          <View style={{ padding: 40, alignItems: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 19 }}>
            <BookOpen size={40} color={colors.mutedForeground} style={{ opacity: 0.5, marginBottom: 16 }} />
            <Text style={{ fontSize: 14, fontWeight: '500', color: colors.mutedForeground }}>Select a class & subject to browse topics</Text>
          </View>
        )}

        {!isSearching && Array.isArray(topics) && topics.map((topic, i) => {
          const itemSource = resolveItemContentSource(topic);
          return (
            <Pressable
              key={topic._id}
              onPress={() => openTopicDetail(topic)}
              style={{ padding: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 19, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}
            >
              <View style={{ width: 40, height: 40, borderRadius: 15, backgroundColor: topic.quiz?.hasTaken ? '#22c55e15' : colors.primary + '15', alignItems: 'center', justifyContent: 'center' }}>
                {topic.quiz?.hasTaken ? <CheckCircle2 size={20} color="#22c55e" /> : <BookOpen size={20} color={colors.primary} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground }} numberOfLines={1}>{topic.displayName || topic.name?.en || 'Unknown Topic'}</Text>
                <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 2 }} numberOfLines={1}>{topic.chapter?.displayName || topic.chapter?.name?.en || topic.chapterId}</Text>
                
                {topic.quiz?.hasTaken && (
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                    <Text style={{ fontSize: 11, fontWeight: '500', color: '#22c55e' }}>Best {topic.quiz.bestScore}%</Text>
                    <Text style={{ fontSize: 11, color: colors.mutedForeground }}>• {topic.quiz.attempts} attempts</Text>
                  </View>
                )}
              </View>
              {itemSource?.resourceUrl && (
                <Pressable onPress={() => openReader(topic)} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 11, backgroundColor: colors.primary + '15' }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>Read</Text>
                </Pressable>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Detail Modal */}
      <Modal visible={showDetailSheet} transparent animationType="slide" onRequestClose={closeDetail}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.card, borderTopLeftRadius: 27, borderTopRightRadius: 27, maxHeight: SCREEN_HEIGHT * 0.9, paddingBottom: insets.bottom }}>
             {/* Handle */}
             <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 8 }}>
               <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
             </View>

             <ScrollView contentContainerStyle={{ padding: 20 }}>
               <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                 <View style={{ flex: 1, paddingRight: 16 }}>
                   <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground }}>{selectedTopic?.displayName || selectedTopic?.name?.en}</Text>
                   <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 4 }}>{selectedTopic?.chapter?.displayName || selectedTopic?.chapter?.name?.en || selectedTopic?.chapterId}</Text>
                 </View>
                 <Pressable onPress={closeDetail} style={{ width: 32, height: 32, borderRadius: 13, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' }}>
                   <X size={16} color={colors.foreground} />
                 </Pressable>
               </View>

               <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                 <View style={{ backgroundColor: colors.primary + '15', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 15 }}>
                   <Text style={{ fontSize: 11, fontWeight: '600', color: colors.primary }}>Class {selectedTopic?.chapter?.ncert?.class || '—'}</Text>
                 </View>
                 <View style={{ backgroundColor: colors.muted, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 15 }}>
                   <Text style={{ fontSize: 11, fontWeight: '600', color: colors.foreground }}>Ch. {selectedTopic?.chapter?.ncert?.chapterNumber || '—'}</Text>
                 </View>
                 {selectedTopic?.ncertReference?.pageNumber && (
                   <View style={{ backgroundColor: colors.muted, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 18 }}>
                     <Text style={{ fontSize: 11, fontWeight: '600', color: colors.foreground }}>Pg. {selectedTopic.ncertReference.pageNumber}</Text>
                   </View>
                 )}
               </View>

               {!readConfirmed && (
                 <View style={{ backgroundColor: '#f59e0b15', borderWidth: 1, borderColor: '#f59e0b40', borderRadius: 19, padding: 16, marginBottom: 20 }}>
                   <Text style={{ fontSize: 14, fontWeight: '600', color: '#d97706', marginBottom: 12 }}>📖 Read this topic first, then mark as read to unlock the quiz.</Text>
                   <Pressable onPress={() => setReadConfirmed(true)} style={{ width: '100%', height: 40, borderRadius: 15, backgroundColor: '#f59e0b', alignItems: 'center', justifyContent: 'center' }}>
                     <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>Mark as Read ✓</Text>
                   </Pressable>
                 </View>
               )}

               {readConfirmed && quizQuestions.length === 0 && !quizResult && (
                 <View style={{ backgroundColor: '#22c55e15', borderWidth: 1, borderColor: '#22c55e40', borderRadius: 15, padding: 12, marginBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                   <CheckCircle2 size={16} color="#22c55e" />
                   <Text style={{ fontSize: 14, fontWeight: '600', color: '#16a34a' }}>Marked as read</Text>
                 </View>
               )}

               {selectedTopic?.quiz?.available ? (
                 quizQuestions.length === 0 && !quizResult && (
                   <Pressable 
                     onPress={startTopicQuiz}
                     disabled={!readConfirmed || isLoadingQuiz}
                     style={{ width: '100%', height: 48, borderRadius: 19, backgroundColor: readConfirmed ? colors.primary : colors.muted, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}
                   >
                     <BookOpen size={18} color={readConfirmed ? "#fff" : colors.mutedForeground} />
                     <Text style={{ fontSize: 15, fontWeight: '700', color: readConfirmed ? "#fff" : colors.mutedForeground }}>
                       {isLoadingQuiz ? 'Loading...' : selectedTopic?.quiz?.hasTaken ? 'Reattempt Quiz' : 'Take Quiz'}
                     </Text>
                   </Pressable>
                 )
               ) : (
                 <Text style={{ fontSize: 12, color: colors.mutedForeground, textAlign: 'center', paddingVertical: 10 }}>No quiz available for this topic yet.</Text>
               )}

               {quizQuestions.length > 0 && !quizResult && (
                 <View style={{ gap: 16 }}>
                   {quizQuestions.map((q, index) => (
                     <View key={q.questionId} style={{ backgroundColor: colors.muted, padding: 16, borderRadius: 19 }}>
                       <Text style={{ fontSize: 15, fontWeight: '600', color: colors.foreground, lineHeight: 22, marginBottom: 12 }}>{index + 1}. {q.question}</Text>
                       <View style={{ gap: 8 }}>
                         {q.options.map((opt: any) => {
                           const selected = quizAnswers[q.questionId] === opt.key;
                           return (
                             <Pressable 
                               key={opt.key}
                               onPress={() => setQuizAnswers(prev => ({ ...prev, [q.questionId]: opt.key }))}
                               style={{ padding: 12, borderRadius: 13, backgroundColor: selected ? colors.primary + '20' : colors.card, borderWidth: 1, borderColor: selected ? colors.primary : colors.border }}
                             >
                               <Text style={{ fontSize: 14, fontWeight: selected ? '600' : '400', color: selected ? colors.primary : colors.foreground }}>
                                 <Text style={{ fontWeight: '700' }}>{opt.key}. </Text>{opt.text}
                               </Text>
                             </Pressable>
                           )
                         })}
                       </View>
                     </View>
                   ))}

                   <Pressable
                     onPress={submitTopicQuiz}
                     disabled={isSubmittingQuiz}
                     style={{ width: '100%', height: 48, borderRadius: 19, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 10 }}
                   >
                     <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>{isSubmittingQuiz ? 'Submitting...' : 'Submit Quiz'}</Text>
                   </Pressable>
                 </View>
               )}

               {quizResult && (
                 <View style={{ padding: 24, alignItems: 'center', backgroundColor: colors.primary + '10', borderWidth: 1, borderColor: colors.primary + '30', borderRadius: 23 }}>
                   <Trophy size={48} color={colors.primary} style={{ marginBottom: 12 }} />
                   <Text style={{ fontSize: 32, fontWeight: '800', color: colors.foreground }}>{quizResult.percentage}%</Text>
                   <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 4 }}>Best: {quizResult.bestScore}% • Attempts: {quizResult.attempts}</Text>
                   
                   <Pressable
                     onPress={() => { setQuizQuestions([]); setQuizResult(null); }}
                     style={{ paddingHorizontal: 20, paddingVertical: 10, borderRadius: 15, backgroundColor: colors.primary + '20', marginTop: 20 }}
                   >
                     <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>Try Again</Text>
                   </Pressable>
                 </View>
               )}
             </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
