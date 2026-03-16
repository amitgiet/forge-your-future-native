import React, { useMemo, useState, useRef } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl, Modal, Dimensions, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft, BookOpen, ChevronRight, Atom, FlaskConical, Leaf,
  Trophy, CircleDashed, RotateCcw, Play, GraduationCap, Star,
  X, Info, FileText, Headphones, ImageIcon, Map, BarChart3,
  ThumbsUp, ThumbsDown, CheckCircle2
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import apiService from '@/lib/apiService';
import { Skeleton } from '@/components/ui/Skeleton';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView, AnimatePresence } from 'moti';

type SubjectKey = 'biology' | 'chemistry' | 'physics';
type Panel = 'subjects' | 'chapters' | 'topics' | 'roadmap';
type ResourceKey = 'video' | 'audio' | 'slides' | 'mindmap' | 'infographic' | 'report' | 'flashcards';

type TopicLite = {
  topic: string;
  sub_topics: { subTopic: string }[];
};

type SubTopic = {
  subTopic: string;
  uid_count: number;
  uids: number[];
  progress?: {
    completed: boolean;
    hasTaken: boolean;
    attempts: number;
    bestScore: number;
    lastScore: number;
    lastAttemptAt: string | null;
  };
  activeRun?: {
    runId: string;
    mode: 'practice' | 'test';
    attemptedQuestions: number;
    totalQuestions: number;
  } | null;
};

type TopicWithSubs = {
  topic: string;
  sub_topics: SubTopic[];
};

type ToppersVideo = { title?: string | null; url?: string | null; time?: string | null };
type ToppersSlidesdeck = { title?: string | null; url?: string | null };
type ToppersEssentials = {
  video?: ToppersVideo | null;
  audio?: string | null;
  slidesdeck?: ToppersSlidesdeck | null;
  mindmap?: any;
  infographic?: string | null;
  report?: string | null;
  flashcards?: string | null;
};

interface ResourceReactions {
  [resourceType: string]: { likes: number; dislikes: number; userReaction: 'like' | 'dislike' | 'none' };
}

const TOPPER_RESOURCES: { key: ResourceKey; label: string; icon: any }[] = [
  { key: 'video', label: 'Video', icon: Play },
  { key: 'report', label: 'Quick Revision', icon: BarChart3 },
  { key: 'slides', label: 'Slides', icon: FileText },
  { key: 'audio', label: 'Podcast', icon: Headphones },
  { key: 'infographic', label: 'Infographic', icon: ImageIcon },
  { key: 'mindmap', label: 'Mind Map', icon: Map },
  { key: 'flashcards', label: 'Flashcards', icon: BookOpen },
];

const hasResource = (te: ToppersEssentials, key: ResourceKey): boolean => {
  if (key === 'video') return !!te?.video?.url;
  if (key === 'audio') return !!te?.audio;
  if (key === 'slides') return !!te?.slidesdeck?.url;
  if (key === 'mindmap') return !!te?.mindmap;
  if (key === 'infographic') return !!te?.infographic;
  if (key === 'report') return !!te?.report;
  if (key === 'flashcards') return !!te?.flashcards;
  return false;
};

const hasAnyEssential = (te: ToppersEssentials): boolean =>
  TOPPER_RESOURCES.some((r) => hasResource(te, r.key));

const SUBJECT_META: Record<SubjectKey, { label: string; icon: any; tint: string; grad: [string, string] }> = {
  biology: { label: 'Biology', icon: Leaf, tint: '#22c55e', grad: ['rgba(34, 197, 94, 0.2)', 'rgba(34, 197, 94, 0.05)'] },
  chemistry: { label: 'Chemistry', icon: FlaskConical, tint: '#f59e0b', grad: ['rgba(245, 158, 11, 0.2)', 'rgba(245, 158, 11, 0.05)'] },
  physics: { label: 'Physics', icon: Atom, tint: '#3b82f6', grad: ['rgba(59, 130, 246, 0.2)', 'rgba(59, 130, 246, 0.05)'] },
};

export default function CurriculumBrowserScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [panel, setPanel] = useState<Panel>('subjects');
  const [subject, setSubject] = useState<SubjectKey | null>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [topicFlows, setTopicFlows] = useState<any[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<any | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [startingQuiz, setStartingQuiz] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Toppers Corner States
  const [toppersEssentials, setToppersEssentials] = useState<ToppersEssentials | null>(null);
  const [toppersOpen, setToppersOpen] = useState(false);
  const [toppersPreviewResource, setToppersPreviewResource] = useState<ResourceKey | null>(null);
  const [chapterReactions, setChapterReactions] = useState<ResourceReactions>({});
  const resourceOpenedAtRef = useRef<number | null>(null);

  const subjectMeta = subject ? SUBJECT_META[subject] : null;

  const openResource = (key: ResourceKey) => {
    resourceOpenedAtRef.current = Date.now();
    setToppersPreviewResource(key);
  };

  const closeResource = () => {
    if (toppersPreviewResource && selectedChapter && resourceOpenedAtRef.current) {
      const durationSeconds = Math.round((Date.now() - resourceOpenedAtRef.current) / 1000);
      if (durationSeconds > 3) {
        apiService.curriculum.logResource({
          chapterId: String(selectedChapter._id || selectedChapter.id || ''),
          subject: subject || undefined,
          resourceType: toppersPreviewResource,
          durationSeconds,
        }).catch(() => { });
      }
      resourceOpenedAtRef.current = null;
    }
    setToppersPreviewResource(null);
  };

  const loadChapters = async (sub: SubjectKey) => {
    setError(null);
    setLoading(true);
    setChapters([]);
    try {
      const res = await apiService.curriculum.getChapters(sub);
      const payload = res?.data;
      const list = payload?.data || payload?.chapters || [];
      setChapters(Array.isArray(list) ? list : []);
      setPanel('chapters');
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load chapters. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  const loadTopics = async (sub: SubjectKey, chapter: any) => {
    const chapterId = String(chapter?._id || chapter?.id || chapter?.chapterId || '');
    if (!chapterId) {
      setError('Invalid chapter selected.');
      return;
    }
    setError(null);
    setLoading(true);
    setTopics([]);
    setToppersEssentials(null);
    setChapterReactions({});
    setSelectedChapter(chapter);
    try {
      const [res, reactionsRes] = await Promise.all([
        apiService.curriculum.getTopics(sub, chapterId),
        apiService.curriculum.getResourceReactions(chapterId).catch(() => ({ data: { data: {} } }))
      ]);
      const payload = res?.data;
      const list = payload?.data || payload?.topics || [];
      setTopics(Array.isArray(list) ? list : []);
      setToppersEssentials(payload?.toppersEssentials || null);
      setChapterReactions(reactionsRes?.data?.data || {});
      setPanel('topics');
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load topics. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  const loadRoadmap = async (sub: SubjectKey, chapter: any, topicName: string) => {
    const chapterId = String(chapter?._id || chapter?.id || chapter?.chapterId || '');
    if (!chapterId || !topicName) return;
    setError(null);
    setLoading(true);
    setTopicFlows([]);
    try {
      const res = await apiService.curriculum.getSubTopics(sub, chapterId, topicName);
      const payload = res?.data;
      const list = payload?.data || [];
      setTopicFlows(Array.isArray(list) ? list : []);
      setPanel('roadmap');
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load curriculum flow. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  const selectSubject = async (sub: SubjectKey) => {
    setSubject(sub);
    setSelectedChapter(null);
    setSelectedTopic(null);
    setTopics([]);
    setTopicFlows([]);
    await loadChapters(sub);
  };

  const selectChapter = async (chapter: any) => {
    setSelectedChapter(chapter);
    setSelectedTopic(null);
    setTopicFlows([]);
    await loadTopics(subject!, chapter);
  };

  const selectTopic = async (topic: any) => {
    const topicName = String(topic?.topic || topic?.name || topic || '');
    setSelectedTopic(topicName);
    if (subject && selectedChapter) await loadRoadmap(subject, selectedChapter, topicName);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (panel === 'chapters' && subject) {
      await loadChapters(subject);
    } else if (panel === 'topics' && subject && selectedChapter) {
      await loadTopics(subject, selectedChapter);
    } else if (panel === 'roadmap' && subject && selectedChapter && selectedTopic) {
      await loadRoadmap(subject, selectedChapter, selectedTopic);
    }
    setRefreshing(false);
  };

  const goBack = () => {
    if (panel === 'topics') {
      setPanel('chapters');
      setError(null);
      return;
    }
    if (panel === 'roadmap') {
      setPanel('topics');
      setError(null);
      return;
    }
    if (panel === 'chapters') {
      setPanel('subjects');
      setError(null);
      return;
    }
    router.back();
  };

  const chapterStats = useMemo(() => {
    const validSubTopics = topicFlows.flatMap((topic) =>
      Array.isArray(topic.sub_topics) ? topic.sub_topics.filter((sub: any) => sub.uid_count > 0) : []
    );

    const total = validSubTopics.length;
    const completed = validSubTopics.filter((sub: any) => sub.progress?.completed).length;
    const bestScoreSum = validSubTopics.reduce(
      (sum, sub: any) => sum + Number(sub.progress?.bestScore || 0),
      0
    );
    const averageBest = total > 0 ? Math.round(bestScoreSum / total) : 0;

    return {
      total,
      completed,
      completionPercent: total > 0 ? Math.round((completed / total) * 100) : 0,
      averageBest,
    };
  }, [topicFlows]);

  const getStatus = (sub: any) => {
    const progress = sub?.progress;
    if (progress?.completed) {
      return {
        label: 'Completed',
        chip: { bg: colors.success + '26', text: colors.success, border: colors.success + '4D' },
        node: { bg: colors.success + '33', border: colors.success + '66' },
      };
    }
    if (progress?.hasTaken || sub?.activeRun) {
      return {
        label: 'In Progress',
        chip: { bg: colors.warning + '26', text: colors.warning, border: colors.warning + '4D' },
        node: { bg: colors.warning + '26', border: colors.warning + '66' },
      };
    }
    return {
      label: 'Not Started',
      chip: { bg: colors.muted, text: colors.mutedForeground, border: colors.border },
      node: { bg: colors.card, border: colors.border },
    };
  };

  const breadcrumb = [
    subject ? SUBJECT_META[subject].label : null,
    selectedChapter ? (selectedChapter._id || selectedChapter.name) : null,
    selectedTopic,
  ].filter(Boolean) as string[];

  const startQuiz = async (topicName: string, subTopic: any, mode: 'practice' | 'test') => {
    if (!subject || !selectedChapter) return;
    const uids = Array.isArray(subTopic?.uids) ? subTopic.uids : [];
    if (uids.length === 0) {
      setError('No questions found for this sub-topic.');
      return;
    }
    const chapterId = String(selectedChapter?._id || selectedChapter?.id || selectedChapter?.chapterId || '');

    setStartingQuiz(subTopic.subTopic || subTopic.name);
    setError(null);
    try {
      const runRes = await apiService.curriculum.startRun({
        subject,
        chapterId,
        topic: topicName,
        subTopic: String(subTopic?.subTopic || subTopic?.name || 'Sub-topic'),
        mode,
        uids,
      });

      const rawQuestions = runRes.data?.data?.questions || [];
      const runData = runRes.data?.data?.run || runRes.data?.run || runRes.data?.data || null;
      const runId = runData?._id || runData?.runId;

      if (!runId) {
        Alert.alert('Error', 'Could not start test session. Run ID missing.');
        return;
      }

      // Explicitly pushing to instructions screen for web parity
      router.push({
        pathname: '/(auth)/curriculum/quiz-instructions',
        params: {
          runId: String(runId),
          questions: JSON.stringify(rawQuestions),
          title: `${subTopic.subTopic || subTopic.name} – ${mode === 'test' ? 'Test' : 'Practice'}`,
          duration: String(Math.max(Math.ceil(rawQuestions.length * 1.5), 10)),
          subject,
          chapterId,
          topic: topicName,
          mode,
          subTopic: subTopic.subTopic || subTopic.name
        }
      } as any);
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'Could not start test. Please try again.';
      setError(msg);
      Alert.alert('Error', msg);
    } finally {
      setStartingQuiz(null);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: insets.top, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 }}>
          <Pressable
            onPress={goBack}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 2,
              borderColor: colors.border,
              backgroundColor: colors.card,
            }}
          >
            <ArrowLeft size={20} color={colors.foreground} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold' }} numberOfLines={1}>
              {panel === 'subjects' ? 'Question Bank' : (panel === 'chapters' ? `${subjectMeta?.label} Chapters` : (panel === 'topics' ? (selectedChapter?._id || selectedChapter?.name) : (selectedTopic || 'Roadmap')))}
            </Text>
            {breadcrumb.length > 0 && (
              <Text style={{ fontSize: 12, color: colors.mutedForeground }} numberOfLines={1}>
                {breadcrumb.join(' > ')}
              </Text>
            )}
          </View>
          <View style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
            {panel === 'roadmap' ? (
              <BookOpen size={24} color={colors.primary} />
            ) : subjectMeta ? (
              <subjectMeta.icon size={24} color={subjectMeta.tint} />
            ) : (
              <BookOpen size={24} color={colors.primary} />
            )}
          </View>
        </View>
      </View>

      <ScrollView
            contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
            showsVerticalScrollIndicator={false}
          >
            <AnimatePresence >
              <MotiView
                key={panel}
                from={{ opacity: 0, translateX: 16 }}
                animate={{ opacity: 1, translateX: 0 }}
                exit={{ opacity: 0, translateX: -16 }}
                transition={{ type: 'timing', duration: 200 }}
              >
                {loading ? (
                  <View style={{ gap: 12 }}>
                    {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} height={70} borderRadius={16} />)}
                  </View>
                ) : panel === 'subjects' ? (
                  <View style={{ gap: 16 }}>
                    {(Object.keys(SUBJECT_META) as SubjectKey[]).map((sub) => {
                      const meta = SUBJECT_META[sub];
                      const Icon = meta.icon;
                      return (
                        <Pressable key={sub} onPress={() => void selectSubject(sub)}>
                          <MotiView
                            from={{ scale: 1 }}
                            animate={{ scale: 1 }}
                          >
                            <LinearGradient
                              colors={meta.grad}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 1 }}
                              style={{
                                borderRadius: 22,
                                borderWidth: 1,
                                borderColor: colors.border,
                                padding: 20,
                              }}
                            >
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                                <View style={{ borderRadius: 12, backgroundColor: colors.background + 'A0', padding: 12 }}>
                                  <Icon size={28} color={meta.tint} />
                                </View>
                                <View style={{ flex: 1 }}>
                                  <Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold' }}>{meta.label}</Text>
                                  <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 2 }}>Browse chapters and track sub-topic mastery</Text>
                                </View>
                                <ChevronRight size={20} color={meta.tint} />
                              </View>
                            </LinearGradient>
                          </MotiView>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : panel === 'chapters' ? (
                  <View style={{ gap: 8 }}>
                    {chapters.map((chapter: any, index: number) => (
                      <Pressable key={chapter._id || index} onPress={() => void selectChapter(chapter)}>
                        <MotiView
                          animate={{ scale: 1 }}
                          style={{
                            padding: 16, borderRadius: 16, backgroundColor: colors.card,
                            borderWidth: 1, borderColor: colors.border,
                            flexDirection: 'row', alignItems: 'center', gap: 12
                          }}
                        >
                          <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: colors.primary + '1A', alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>{index + 1}</Text>
                          </View>
                          <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: colors.foreground }}>{chapter._id || chapter.name}</Text>
                          <ChevronRight size={16} color={colors.mutedForeground} />
                        </MotiView>
                      </Pressable>
                    ))}
                  </View>
                ) : panel === 'topics' ? (
                  <View style={{ gap: 8 }}>
                    {toppersEssentials && hasAnyEssential(toppersEssentials) && (
                      <Pressable onPress={() => setToppersOpen(true)}>
                        <LinearGradient
                          colors={['rgba(245, 158, 11, 0.15)', 'rgba(250, 204, 21, 0.05)']}
                          style={{ borderRadius: 16, borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.3)', padding: 16, marginBottom: 8 }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                              <View style={{ borderRadius: 8, backgroundColor: 'rgba(245, 158, 11, 0.2)', padding: 6 }}>
                                <Star size={16} color="#fbbf24" fill="#fbbf24" />
                              </View>
                              <View>
                                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground }}>Toppers Corner</Text>
                                <Text style={{ fontSize: 10, color: colors.mutedForeground, marginTop: 2 }}>{TOPPER_RESOURCES.filter(r => hasResource(toppersEssentials!, r.key)).length} resources curated</Text>
                              </View>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <Text style={{ fontSize: 11, fontWeight: '600', color: '#fbbf24' }}>View All</Text>
                              <ChevronRight size={14} color="#fbbf24" />
                            </View>
                          </View>
                        </LinearGradient>
                      </Pressable>
                    )}
                    {topics.map((topic: any, index: number) => (
                      <Pressable key={index} onPress={() => void selectTopic(topic)}>
                        <MotiView
                          animate={{ scale: 1 }}
                          style={{
                            padding: 16, borderRadius: 16, backgroundColor: colors.card,
                            borderWidth: 1, borderColor: colors.border,
                            flexDirection: 'row', alignItems: 'center', gap: 12
                          }}
                        >
                          <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: colors.primary + '1A', alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>{index + 1}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground }} numberOfLines={1}>
                              {topic.topic || topic.name || topic}
                            </Text>
                            {topic.sub_topics && <Text style={{ fontSize: 11, color: colors.mutedForeground }}>{topic.sub_topics.length} sub-topics</Text>}
                          </View>
                          <ChevronRight size={16} color={colors.mutedForeground} />
                        </MotiView>
                      </Pressable>
                    ))}
                  </View>
                ) : (
                  <View style={{ gap: 16 }}>
                    {/* Progress Card */}
                    <View style={{ padding: 16, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                        <View>
                          <Text style={{ fontSize: 12, color: colors.mutedForeground }}>Chapter Progress</Text>
                          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground }}>{chapterStats.completed}/{chapterStats.total} sub-topics</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>{chapterStats.completionPercent}% complete</Text>
                          <Text style={{ fontSize: 12, color: colors.mutedForeground }}>Avg best: {chapterStats.averageBest}%</Text>
                        </View>
                      </View>
                      <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.muted, overflow: 'hidden' }}>
                        <MotiView
                          from={{ width: '0%' }}
                          animate={{ width: `${chapterStats.completionPercent}%` }}
                          style={{ height: '100%', backgroundColor: colors.primary }}
                        />
                      </View>
                    </View>

                    {topicFlows.map((flow: any) => {
                      const validSubs = Array.isArray(flow.sub_topics) ? flow.sub_topics.filter((sub: any) => sub.uid_count > 0) : [];
                      const completedCount = validSubs.filter((sub: any) => sub.progress?.completed).length;
                      const bestAvg = validSubs.length > 0
                        ? Math.round(validSubs.reduce((sum, s: any) => sum + (s.progress?.bestScore || 0), 0) / validSubs.length)
                        : 0;

                      return (
                        <View key={flow.topic} style={{ padding: 16, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground }}>{flow.topic}</Text>
                              <Text style={{ fontSize: 12, color: colors.mutedForeground }}>{completedCount}/{validSubs.length} completed</Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <BarChart3 size={14} color={colors.mutedForeground} />
                              <Text style={{ fontSize: 12, color: colors.mutedForeground }}>Best Avg {bestAvg}%</Text>
                            </View>
                          </View>

                          <View style={{ gap: 12 }}>
                            {validSubs.map((sub: any, index: number) => {
                              const status = getStatus(sub);
                              const isRight = index % 2 === 1;
                              const buttonLabel = sub.progress?.completed ? 'Retake Test' : (sub.progress?.hasTaken ? 'Resume Test' : 'Start Test');
                              const ButtonIcon = sub.progress?.completed ? RotateCcw : (sub.progress?.hasTaken ? Play : GraduationCap);

                              return (
                                <MotiView
                                  key={sub.subTopic}
                                  from={{ opacity: 0, translateY: 10 }}
                                  animate={{ opacity: 1, translateY: 0 }}
                                  transition={{ delay: index * 50 }}
                                  style={{ alignItems: isRight ? 'flex-end' : 'flex-start' }}
                                >
                                  <View style={{ width: '92%', padding: 12, borderRadius: 16, backgroundColor: status.node.bg, borderWidth: 1, borderColor: status.node.border }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                                      <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: status.node.bg, borderWidth: 1, borderColor: status.node.border, alignItems: 'center', justifyContent: 'center' }}>
                                        {sub.progress?.completed ? (
                                          <CheckCircle2 size={16} color={colors.success} />
                                        ) : sub.progress?.hasTaken ? (
                                          <Trophy size={16} color={colors.warning} />
                                        ) : (
                                          <CircleDashed size={16} color={colors.mutedForeground} />
                                        )}
                                      </View>
                                      <View style={{ flex: 1 }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground, flex: 1 }} numberOfLines={1}>{sub.subTopic}</Text>
                                          <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99, backgroundColor: status.chip.bg, borderWidth: 1, borderColor: status.chip.border }}>
                                            <Text style={{ fontSize: 10, color: status.chip.text }}>{status.label}</Text>
                                          </View>
                                        </View>
                                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                                          <Text style={{ fontSize: 10, color: colors.mutedForeground }}>{sub.uid_count} questions</Text>
                                          <Text style={{ fontSize: 10, color: colors.mutedForeground }}>Best: {sub.progress?.bestScore || 0}%</Text>
                                          {sub.progress?.lastAttemptAt && <Text style={{ fontSize: 10, color: colors.mutedForeground }}>{new Date(sub.progress.lastAttemptAt).toLocaleDateString()}</Text>}
                                        </View>
                                        <Pressable
                                          onPress={() => void startQuiz(flow.topic, sub, 'test')}
                                          disabled={!!startingQuiz}
                                          style={{
                                            flexDirection: 'row', alignItems: 'center', gap: 6,
                                            paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
                                            backgroundColor: colors.success + '26', borderWidth: 1, borderColor: colors.success + '4D',
                                            alignSelf: 'flex-start',
                                            opacity: !!startingQuiz ? 0.7 : 1
                                          }}
                                        >
                                          {startingQuiz === (sub.subTopic || sub.name) ? (
                                            <ActivityIndicator size="small" color={colors.success} />
                                          ) : (
                                            <>
                                              <ButtonIcon size={14} color={colors.success} />
                                              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.success }}>{buttonLabel}</Text>
                                            </>
                                          )}
                                        </Pressable>
                                      </View>
                                    </View>
                                  </View>
                                </MotiView>
                              );
                            })}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </MotiView>
            </AnimatePresence>
          </ScrollView>

          <Modal visible={toppersOpen} animationType="slide" transparent={false} onRequestClose={() => { setToppersOpen(false); closeResource(); }}>
            <View style={{ flex: 1, backgroundColor: colors.background }}>
              <View style={{ paddingTop: insets.top, paddingHorizontal: 16, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 }}>
                  <Pressable
                    onPress={() => toppersPreviewResource ? closeResource() : setToppersOpen(false)}
                    style={{ width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card }}
                  >
                    {toppersPreviewResource ? <ChevronRight size={20} color={colors.foreground} style={{ transform: [{ rotate: '180deg' }] }} /> : <X size={20} color={colors.foreground} />}
                  </Pressable>
                  {!toppersPreviewResource ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 }}>
                      <View style={{ padding: 4, borderRadius: 6, backgroundColor: 'rgba(245, 158, 11, 0.2)' }}>
                        <Star size={14} color="#fbbf24" fill="#fbbf24" />
                      </View>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground }}>Toppers Corner</Text>
                    </View>
                  ) : (
                    <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground, flex: 1 }}>
                      {TOPPER_RESOURCES.find(r => r.key === toppersPreviewResource)?.label}
                    </Text>
                  )}
                </View>
              </View>

              {!toppersPreviewResource ? (
                <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }}>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                    {TOPPER_RESOURCES.filter(r => toppersEssentials && hasResource(toppersEssentials, r.key)).map(r => (
                      <Pressable
                        key={r.key}
                        onPress={() => openResource(r.key)}
                        style={{
                          width: Math.floor((Dimensions.get('window').width - 44) / 2) - 2,
                          minHeight: 130,
                          backgroundColor: colors.card,
                          borderWidth: 1,
                          borderColor: colors.border,
                          borderRadius: 20,
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 16,
                          gap: 12
                        }}
                      >
                        <View style={{ padding: 12, borderRadius: 12, backgroundColor: 'rgba(245, 158, 11, 0.15)' }}>
                          <r.icon size={28} color="#fbbf24" />
                        </View>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground, textAlign: 'center' }}>{r.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              ) : (
                <View style={{ flex: 1 }}>
                  <View style={{ flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ color: colors.mutedForeground, textAlign: 'center' }}>
                      Resource: {toppersPreviewResource.toUpperCase()} Rendering
                    </Text>
                    <Text style={{ color: colors.mutedForeground, textAlign: 'center', fontSize: 12, marginTop: 8 }}>
                      Native implementation for specific viewers following soon.
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </Modal>
        </View>
        );
}
