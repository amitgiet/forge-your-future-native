import React, { useMemo, useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl, Modal, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, BookOpen, ChevronRight, Atom, FlaskConical, Leaf, Trophy, CircleDashed, RotateCcw, Play, GraduationCap, Star, X, Info, FileText, FileAudio, LayoutDashboard } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import apiService from '@/lib/apiService';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Video, ResizeMode } from 'expo-av';
import { Audio } from 'expo-av';

type SubjectKey = 'biology' | 'chemistry' | 'physics';
type Panel = 'subjects' | 'chapters' | 'topics' | 'roadmap';
type ResourceKey = 'video' | 'slidesdeck' | 'shortnotes' | 'mindmap' | 'audio';

type ToppersVideo = { title?: string | null; url?: string | null; time?: string | null };
type ToppersSlidesdeck = { title?: string | null; url?: string | null };
type ToppersEssentials = {
  video?: ToppersVideo | null;
  audio?: ToppersVideo | null;
  slidesdeck?: ToppersSlidesdeck | null;
  mindmap?: any;
  shortnotes?: any;
};

const TOPPER_RESOURCES: { key: ResourceKey; label: string; icon: any }[] = [
  { key: 'video', label: 'Toppers Video', icon: Play },
  { key: 'audio', label: 'Toppers Audio', icon: FileAudio },
  { key: 'mindmap', label: 'Mind Map', icon: LayoutDashboard },
  { key: 'shortnotes', label: 'Short Notes', icon: FileText },
  { key: 'slidesdeck', label: 'Slides Deck', icon: BookOpen },
];

const hasResource = (te: ToppersEssentials, key: ResourceKey): boolean => {
  if (key === 'video') return !!te?.video?.url;
  if (key === 'audio') return !!te?.audio?.url;
  if (key === 'slidesdeck') return !!te?.slidesdeck?.url;
  if (key === 'mindmap') return !!te?.mindmap;
  if (key === 'shortnotes') return !!te?.shortnotes;
  return false;
};

const hasAnyEssential = (te: ToppersEssentials): boolean =>
  TOPPER_RESOURCES.some((r) => hasResource(te, r.key));

interface ResourceReactions {
  [resourceType: string]: { likes: number; dislikes: number; userReaction: 'like' | 'dislike' | 'none' };
}

const SUBJECT_META: Record<SubjectKey, { label: string; icon: any; tint: string }> = {
  biology: { label: 'Biology', icon: Leaf, tint: '#22c55e' },
  chemistry: { label: 'Chemistry', icon: FlaskConical, tint: '#f59e0b' },
  physics: { label: 'Physics', icon: Atom, tint: '#3b82f6' },
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

  const handleToggleReaction = async (resourceType: ResourceKey, reactionType: 'like' | 'dislike') => {
    if (!selectedChapter) return;
    const chapterId = String(selectedChapter._id || selectedChapter.id || '');

    setChapterReactions(prev => {
      const current = prev[resourceType] || { likes: 0, dislikes: 0, userReaction: 'none' };
      const next = { ...current };

      if (current.userReaction === reactionType) {
        next.userReaction = 'none';
        if (reactionType === 'like') next.likes = Math.max(0, next.likes - 1);
        if (reactionType === 'dislike') next.dislikes = Math.max(0, next.dislikes - 1);
      } else {
        if (current.userReaction === 'like') next.likes = Math.max(0, next.likes - 1);
        if (current.userReaction === 'dislike') next.dislikes = Math.max(0, next.dislikes - 1);

        next.userReaction = reactionType;
        if (reactionType === 'like') next.likes += 1;
        if (reactionType === 'dislike') next.dislikes += 1;
      }

      return { ...prev, [resourceType]: next };
    });

    try {
      const currentReaction = chapterReactions[resourceType]?.userReaction;
      const finalReaction = currentReaction === reactionType ? 'none' : reactionType;
      await apiService.curriculum.toggleResourceReaction({
        chapterId,
        resourceType,
        reaction: finalReaction
      });
    } catch (err) {
      console.error('Failed to toggle reaction', err);
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
    setTopics([]);
    await loadChapters(sub);
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

  const panelTitle = useMemo(() => {
    if (panel === 'subjects') return 'Question Bank';
    if (panel === 'chapters') return `${subjectMeta?.label || ''} Chapters`;
    if (panel === 'topics') return String(selectedChapter?._id || selectedChapter?.name || selectedChapter?.chapterName || 'Topics');
    return String(selectedTopic || 'Curriculum Roadmap');
  }, [panel, subjectMeta, selectedChapter]);

  const SubjectIcon = subjectMeta?.icon || BookOpen;

  const startSubtopicTest = async (topicName: string, subTopic: any) => {
    if (!subject || !selectedChapter) return;
    const uids = Array.isArray(subTopic?.uids) ? subTopic.uids : [];
    if (uids.length === 0) return;
    const chapterId = String(selectedChapter?._id || selectedChapter?.id || selectedChapter?.chapterId || '');
    if (!chapterId) return;

    setLoading(true);
    setError(null);
    try {
      const runRes = await apiService.curriculum.startRun({
        subject,
        chapterId,
        topic: topicName,
        subTopic: String(subTopic?.subTopic || subTopic?.name || 'Sub-topic'),
        mode: 'test',
        uids,
      });
      const runId =
        runRes?.data?.data?._id ||
        runRes?.data?.data?.runId ||
        runRes?.data?.data?.id ||
        runRes?.data?.data?.run?._id ||
        runRes?.data?.data?.run?.runId ||
        runRes?.data?.run?._id ||
        runRes?.data?.run?.runId;
      if (!runId) {
        setError('Could not start test session.');
        return;
      }
      router.push({
        pathname: '/(auth)/practice/session/[challengeId]',
        params: { challengeId: String(runId) },
      } as any);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Could not start test. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: insets.top, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 }}>
          <Pressable
            onPress={goBack}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.card,
            }}
          >
            <ArrowLeft size={20} color={colors.foreground} />
          </Pressable>
          <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold' }}>
            {panelTitle}
          </Text>
          {subjectMeta ? (
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                backgroundColor: subjectMeta.tint + '22',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <SubjectIcon size={18} color={subjectMeta.tint} />
            </View>
          ) : (
            <BookOpen size={20} color={colors.primary} />
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={{ gap: 12 }}>
            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} height={70} borderRadius={12} />)}
          </View>
        ) : error ? (
          <GlassCard style={{ alignItems: 'center', paddingVertical: 28, gap: 10 }}>
            <Text style={{ fontSize: 14, color: colors.destructive, textAlign: 'center' }}>{error}</Text>
            <Pressable
              onPress={() => {
                if (panel === 'chapters' && subject) void loadChapters(subject);
                if (panel === 'topics' && subject && selectedChapter) void loadTopics(subject, selectedChapter);
              }}
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 8,
                backgroundColor: colors.card,
              }}
            >
              <Text style={{ color: colors.foreground, fontSize: 12, fontWeight: '700' }}>Retry</Text>
            </Pressable>
          </GlassCard>
        ) : panel === 'subjects' ? (
          <View style={{ gap: 10 }}>
            {(Object.keys(SUBJECT_META) as SubjectKey[]).map((sub) => {
              const meta = SUBJECT_META[sub];
              const Icon = meta.icon;
              return (
                <Pressable key={sub} onPress={() => void selectSubject(sub)}>
                  <GlassCard style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16 }}>
                    <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: meta.tint + '22', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={22} color={meta.tint} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: colors.foreground }}>{meta.label}</Text>
                      <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 2 }}>Browse chapters and track sub-topic mastery</Text>
                    </View>
                    <ChevronRight size={18} color={meta.tint} />
                  </GlassCard>
                </Pressable>
              );
            })}
          </View>
        ) : panel === 'chapters' ? (
          chapters.length === 0 ? (
            <GlassCard style={{ alignItems: 'center', paddingVertical: 40, gap: 12 }}>
              <BookOpen size={40} color={colors.mutedForeground} />
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.foreground }}>No chapters found</Text>
            </GlassCard>
          ) : (
            <View style={{ gap: 10 }}>
              {chapters.map((chapter: any, i: number) => {
                const chapterTitle = String(chapter?._id || chapter?.name || chapter?.title || chapter?.chapterName || `Chapter ${i + 1}`);
                return (
                  <Pressable key={`${chapterTitle}-${i}`} onPress={() => subject && void loadTopics(subject, chapter)}>
                    <GlassCard style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 }}>
                      <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: (subjectMeta?.tint || colors.primary) + '22', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: subjectMeta?.tint || colors.primary, fontWeight: '800', fontSize: 13 }}>{i + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground }}>{chapterTitle}</Text>
                        <View style={{ marginTop: 4, flexDirection: 'row', gap: 6 }}>
                          <Badge variant="outline">{chapter?.topicCount || 0} topics</Badge>
                        </View>
                      </View>
                      <ChevronRight size={16} color={subjectMeta?.tint || colors.primary} />
                    </GlassCard>
                  </Pressable>
                );
              })}
            </View>
          )
        ) : panel === 'topics' && topics.length === 0 && (!toppersEssentials || !hasAnyEssential(toppersEssentials)) ? (
          <GlassCard style={{ alignItems: 'center', paddingVertical: 40, gap: 12 }}>
            <BookOpen size={40} color={colors.mutedForeground} />
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.foreground }}>No topics found</Text>
          </GlassCard>
        ) : panel === 'topics' ? (
          <View style={{ gap: 8 }}>
            {toppersEssentials && hasAnyEssential(toppersEssentials) && (
              <Pressable onPress={() => setToppersOpen(true)}>
                <View
                  style={{
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: '#f59e0b40',
                    backgroundColor: '#f59e0b15',
                    padding: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 8,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ padding: 6, borderRadius: 8, backgroundColor: '#f59e0b33' }}>
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
              </Pressable>
            )}

            {topics.map((topic: any, i: number) => (
              <Pressable
                key={`topic-${i}`}
                onPress={() => {
                  const topicName = String(typeof topic === 'string' ? topic : (topic?.topic || topic?.name || topic?.title || ''));
                  setSelectedTopic(topicName);
                  if (subject && selectedChapter) void loadRoadmap(subject, selectedChapter, topicName);
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    backgroundColor: colors.card,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 99,
                      backgroundColor: subjectMeta?.tint || colors.primary,
                      opacity: 0.8,
                    }}
                  />
                  <Text style={{ flex: 1, fontSize: 13, color: colors.foreground }}>
                    {String(typeof topic === 'string' ? topic : (topic?.topic || topic?.name || topic?.title || 'Untitled Topic'))}
                  </Text>
                  <ChevronRight size={16} color={subjectMeta?.tint || colors.primary} />
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {topicFlows.map((flow: any, flowIndex: number) => {
              const topicName = String(flow?.topic || selectedTopic || `Topic ${flowIndex + 1}`);
              const subTopics = Array.isArray(flow?.sub_topics) ? flow.sub_topics.filter((s: any) => Number(s?.uid_count || 0) > 0) : [];
              return (
                <GlassCard key={`${topicName}-${flowIndex}`} style={{ paddingVertical: 14 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: colors.foreground }}>{topicName}</Text>
                  <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 2 }}>{subTopics.length} active sub-topics</Text>
                  <View style={{ gap: 8, marginTop: 10 }}>
                    {subTopics.map((sub: any, idx: number) => {
                      const progress = sub?.progress || {};
                      const completed = Boolean(progress?.completed);
                      const hasTaken = Boolean(progress?.hasTaken);
                      const showResume = hasTaken && !completed;
                      const chipText = completed ? 'Completed' : showResume ? 'In Progress' : 'Not Started';
                      const chipBg = completed ? colors.success + '16' : showResume ? colors.warning + '16' : colors.muted;
                      const chipTextColor = completed ? colors.success : showResume ? colors.warning : colors.mutedForeground;
                      const ButtonIcon = completed ? RotateCcw : showResume ? Play : GraduationCap;
                      const btnLabel = completed ? 'Retake Test' : showResume ? 'Resume Test' : 'Start Test';
                      return (
                        <View
                          key={`${sub?.subTopic || 'sub'}-${idx}`}
                          style={{
                            borderWidth: 1,
                            borderColor: colors.border,
                            borderRadius: 12,
                            padding: 10,
                            backgroundColor: colors.card,
                            gap: 8,
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                              {completed ? <Trophy size={15} color={colors.success} /> : <CircleDashed size={15} color={colors.mutedForeground} />}
                              <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: '700', flex: 1 }}>
                                {String(sub?.subTopic || 'Sub-topic')}
                              </Text>
                            </View>
                            <View style={{ borderRadius: 999, backgroundColor: chipBg, paddingHorizontal: 8, paddingVertical: 3 }}>
                              <Text style={{ color: chipTextColor, fontSize: 10, fontWeight: '700' }}>{chipText}</Text>
                            </View>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>{Number(sub?.uid_count || 0)} questions</Text>
                            <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>Best {Number(progress?.bestScore || 0)}%</Text>
                            <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>Attempts {Number(progress?.attempts || 0)}</Text>
                          </View>
                          <Pressable
                            onPress={() => void startSubtopicTest(topicName, sub)}
                            style={{
                              alignSelf: 'flex-start',
                              borderRadius: 10,
                              backgroundColor: colors.success + '18',
                              borderWidth: 1,
                              borderColor: colors.success + '40',
                              paddingHorizontal: 10,
                              paddingVertical: 7,
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 6,
                            }}
                          >
                            <ButtonIcon size={13} color={colors.success} />
                            <Text style={{ color: colors.success, fontSize: 11, fontWeight: '700' }}>{btnLabel}</Text>
                          </Pressable>
                        </View>
                      );
                    })}
                    {subTopics.length === 0 ? (
                      <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>No active sub-topics with questions in this topic.</Text>
                    ) : null}
                  </View>
                </GlassCard>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Toppers Corner Modal */}
      <Modal visible={toppersOpen && !!toppersEssentials} animationType="slide" transparent={false} onRequestClose={() => { setToppersOpen(false); setToppersPreviewResource(null); }}>
        <View style={{ flex: 1, backgroundColor: toppersPreviewResource === 'video' || toppersPreviewResource === 'audio' ? '#1c1c1e' : colors.background }}>
          <View style={{ paddingTop: insets.top, paddingHorizontal: 16, backgroundColor: toppersPreviewResource === 'video' || toppersPreviewResource === 'audio' ? '#1c1c1e' : colors.card, borderBottomWidth: toppersPreviewResource === 'video' || toppersPreviewResource === 'audio' ? 0 : 1, borderBottomColor: colors.border }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 }}>
              {toppersPreviewResource ? (
                <Pressable
                  onPress={closeResource}
                  style={{
                    width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
                    borderWidth: toppersPreviewResource === 'video' || toppersPreviewResource === 'audio' ? 0 : 1,
                    borderColor: colors.border, backgroundColor: toppersPreviewResource === 'video' || toppersPreviewResource === 'audio' ? 'transparent' : colors.card,
                  }}
                >
                  <ArrowLeft size={20} color={toppersPreviewResource === 'video' || toppersPreviewResource === 'audio' ? '#fff' : colors.foreground} />
                </Pressable>
              ) : (
                <>
                  <Pressable
                    onPress={() => { setToppersOpen(false); setToppersPreviewResource(null); }}
                    style={{ width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card }}
                  >
                    <X size={20} color={colors.foreground} />
                  </Pressable>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 }}>
                    <View style={{ padding: 4, borderRadius: 6, backgroundColor: '#f59e0b33' }}>
                      <Star size={14} color="#fbbf24" fill="#fbbf24" />
                    </View>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground }}>Toppers Corner</Text>
                  </View>
                </>
              )}
            </View>
          </View>

          {/* Grid View */}
          {!toppersPreviewResource && (
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {TOPPER_RESOURCES.filter(r => toppersEssentials && hasResource(toppersEssentials, r.key)).map(r => (
                  <Pressable
                    key={r.key}
                    onPress={() => openResource(r.key)}
                    style={{
                      width: (Dimensions.get('window').width - 44) / 2, // 2 columns, 16px padding on sides, 12px gap
                      minHeight: 130,
                      backgroundColor: colors.card,
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: 16,
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 16,
                      gap: 12
                    }}
                  >
                    <View style={{ padding: 12, borderRadius: 12, backgroundColor: '#f59e0b20' }}>
                      <r.icon size={28} color="#fbbf24" />
                    </View>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground, textAlign: 'center' }}>{r.label}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          )}

          {/* Resource Preview */}
          {toppersPreviewResource && (
            <View style={{ flex: 1 }}>
              {toppersPreviewResource === 'video' && toppersEssentials?.video?.url && (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                  <Video
                    source={{ uri: toppersEssentials.video.url?.replace('dl=0', 'raw=1') }}
                    style={{ width: '100%', height: undefined, aspectRatio: 16 / 9 }}
                    useNativeControls
                    resizeMode={ResizeMode.CONTAIN}
                    shouldPlay
                  />

                  <Text
                    style={{
                      color: '#fff',
                      marginTop: 16,
                      fontSize: 16,
                      fontWeight: 'bold',
                      textAlign: 'center',
                      paddingHorizontal: 16,
                    }}
                  >
                    {toppersEssentials.video.title}
                  </Text>
                </View>
              )}

              {toppersPreviewResource === 'audio' && toppersEssentials?.audio?.url && (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
                  <View style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: '#f59e0b20', alignItems: 'center', justifyContent: 'center', marginBottom: 32 }}>
                    <FileAudio size={64} color="#fbbf24" />
                  </View>
                  <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 24 }}>{toppersEssentials.audio.title || 'Audio Notes'}</Text>
                  {/* Basic audio control mapping without complex custom player to save space */}
                  <Video // using video component for audio with hidden visual to leverage native controls easily
                    source={{ uri: toppersEssentials.audio.url.replace('dl=0', 'raw=1') }}
                    style={{ width: '100%', height: 60 }}
                    useNativeControls
                    shouldPlay
                    resizeMode={ResizeMode.CONTAIN}
                  />
                </View>
              )}

              {(toppersPreviewResource === 'shortnotes' || toppersPreviewResource === 'slidesdeck' || toppersPreviewResource === 'mindmap') && (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
                  <View style={{ width: 80, height: 80, borderRadius: 20, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                    <LayoutDashboard size={40} color={colors.mutedForeground} />
                  </View>
                  <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.foreground, textAlign: 'center', marginBottom: 8 }}>
                    {TOPPER_RESOURCES.find(r => r.key === toppersPreviewResource)?.label}
                  </Text>
                  <Text style={{ fontSize: 14, color: colors.mutedForeground, textAlign: 'center' }}>
                    Web visualization mapping required. Please view this resource on the companion desktop app.
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </Modal>

    </View>
  );
}
