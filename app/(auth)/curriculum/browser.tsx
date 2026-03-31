import React, { useMemo, useState, useRef } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl, Modal, Dimensions, Alert, ActivityIndicator, Linking } from 'react-native';
import { WebView } from 'react-native-webview';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft, BookOpen, ChevronRight, Atom, FlaskConical, Leaf,
  Trophy, CircleDashed, RotateCcw, RotateCw, Play, Pause, GraduationCap, Star,
  X, Info, FileText, Headphones, ImageIcon, Map, BarChart3,
  ThumbsUp, ThumbsDown, CheckCircle2, ExternalLink, ChevronDown, ChevronUp
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

// ─── URL helpers (mirrors web) ─────────────────────────────────────────────
const extractDriveFileId = (url: string): string | null => {
  if (!url) return null;
  const byQuery = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (byQuery?.[1]) return byQuery[1];
  const byPath = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return byPath?.[1] ?? null;
};

const toEmbedDriveUrl = (raw: string): string => {
  if (!raw) return raw;
  if (/google\.com/i.test(raw)) {
    const id = extractDriveFileId(raw);
    if (id) return `https://drive.google.com/file/d/${id}/preview?rm=minimal`;
  }
  return raw;
};

const getYouTubeEmbedUrl = (url: string): string | null => {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s?#]+)/);
  return m ? `https://www.youtube.com/embed/${m[1]}?rel=0` : null;
};

// ─── Reaction Row ──────────────────────────────────────────────────────────
interface ReactionRowProps {
  reaction: { likes: number; dislikes: number; userReaction: 'like' | 'dislike' | 'none' };
  onLike: () => void;
  onDislike: () => void;
  dark?: boolean;
}
const ReactionRow = ({ reaction, onLike, onDislike, dark }: ReactionRowProps) => {
  const likeColor = reaction.userReaction === 'like' ? '#6a7ef5' : (dark ? 'rgba(255,255,255,0.4)' : '#888');
  const dislikeColor = reaction.userReaction === 'dislike' ? '#fb7185' : (dark ? 'rgba(255,255,255,0.4)' : '#888');
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 24, paddingVertical: 4 }}>
      <Pressable onPress={onLike} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <ThumbsUp size={22} color={likeColor} fill={reaction.userReaction === 'like' ? likeColor : 'none'} />
        <Text style={{ fontSize: 14, fontWeight: '600', color: likeColor }}>{reaction.likes}</Text>
      </Pressable>
      <Pressable onPress={onDislike} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <ThumbsDown size={22} color={dislikeColor} fill={reaction.userReaction === 'dislike' ? dislikeColor : 'none'} />
        <Text style={{ fontSize: 14, fontWeight: '600', color: dislikeColor }}>{reaction.dislikes}</Text>
      </Pressable>
    </View>
  );
};

// ─── Native Audio Player ───────────────────────────────────────────────────
const NativeAudioPlayer = ({ src }: { src: string }) => {
  const [sound, setSound] = React.useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [position, setPosition] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [rate, setRate] = React.useState(1);

  React.useEffect(() => {
    let s: Audio.Sound | null = null;
    const load = async () => {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound: loaded } = await Audio.Sound.createAsync(
        { uri: src },
        { shouldPlay: false },
        (status) => {
          if (status.isLoaded) {
            setPosition(Math.floor((status.positionMillis || 0) / 1000));
            setDuration(Math.floor((status.durationMillis || 0) / 1000));
            setIsPlaying(status.isPlaying);
          }
        }
      );
      s = loaded;
      setSound(loaded);
    };
    load().catch(() => { });
    return () => { s?.unloadAsync().catch(() => { }); };
  }, [src]);

  const toggle = async () => {
    if (!sound) return;
    if (isPlaying) { await sound.pauseAsync(); } else { await sound.playAsync(); }
  };
  const seekBy = async (delta: number) => {
    if (!sound) return;
    await sound.setPositionAsync(Math.max(0, Math.min(duration * 1000, (position + delta) * 1000)));
  };
  const cycleRate = async () => {
    if (!sound) return;
    const rates = [1, 1.25, 1.5, 2];
    const next = rates[(rates.indexOf(rate) + 1) % rates.length];
    await sound.setRateAsync(next, true);
    setRate(next);
  };
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const prog = duration > 0 ? (position / duration) * 100 : 0;

  // Animated wave bars
  const bars = Array.from({ length: 24 }, (_, i) => {
    const h = 8 + Math.abs(Math.sin(i * 0.7 + (isPlaying ? Date.now() / 500 : 0))) * 40;
    return h;
  });

  return (
    <View style={{ flex: 1, backgroundColor: '#0d0d1e', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
      {/* Waveform visualizer */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, height: 60, marginBottom: 32 }}>
        {bars.map((h, i) => (
          <View key={i} style={{
            width: 3, height: h,
            borderRadius: 2,
            backgroundColor: i % 3 === 0 ? '#6a7ef5' : i % 3 === 1 ? '#00c896' : '#9bb0ff',
            opacity: isPlaying ? 1 : 0.4,
          }} />
        ))}
      </View>

      {/* Progress bar */}
      <View style={{ width: '100%', marginBottom: 8 }}>
        <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
          <View style={{ width: `${prog}%`, height: '100%', backgroundColor: '#6a7ef5', borderRadius: 2 }} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
          <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{fmt(position)}</Text>
          <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{fmt(duration)}</Text>
        </View>
      </View>

      {/* Controls */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 32, marginTop: 16 }}>
        <Pressable onPress={() => seekBy(-10)} style={{ alignItems: 'center', gap: 2 }}>
          <RotateCcw size={24} color="#6a7ef5" />
          <Text style={{ fontSize: 9, color: '#6a7ef5', fontWeight: '700' }}>10</Text>
        </Pressable>
        <Pressable onPress={toggle} style={{
          width: 64, height: 64, borderRadius: 32,
          backgroundColor: '#6a7ef5', alignItems: 'center', justifyContent: 'center',
        }}>
          {isPlaying
            ? <Pause size={28} color="#fff" fill="#fff" />
            : <Play size={28} color="#fff" fill="#fff" style={{ marginLeft: 2 }} />}
        </Pressable>
        <Pressable onPress={() => seekBy(10)} style={{ alignItems: 'center', gap: 2 }}>
          <RotateCw size={24} color="#6a7ef5" />
          <Text style={{ fontSize: 9, color: '#6a7ef5', fontWeight: '700' }}>10</Text>
        </Pressable>
      </View>
      <Pressable onPress={cycleRate} style={{ marginTop: 20 }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.55)' }}>{rate}x</Text>
      </Pressable>
    </View>
  );
};

// ─── Mind Map tree renderer ────────────────────────────────────────────────
const MindMapNode = ({ node, depth = 0, colors }: { node: any; depth?: number; colors: any }) => {
  const [open, setOpen] = React.useState(depth < 2);
  const children = node.children || node.sub || node.subtopics || [];
  const label = String(node.label || node.name || node.title || node.text || JSON.stringify(node));
  const hasKids = children.length > 0;

  return (
    <View style={{ marginLeft: depth * 16 }}>
      <Pressable
        onPress={() => hasKids && setOpen(!open)}
        style={{
          flexDirection: 'row', alignItems: 'center', gap: 8,
          paddingVertical: 8, paddingHorizontal: 12,
          marginVertical: 2, borderRadius: 10,
          backgroundColor: depth === 0 ? colors.primary + '1A' : depth === 1 ? colors.card : 'transparent',
          borderWidth: depth <= 1 ? 1 : 0,
          borderColor: depth === 0 ? colors.primary + '33' : colors.border,
        }}
      >
        {hasKids && (
          open ? <ChevronDown size={14} color={colors.mutedForeground} /> : <ChevronUp size={14} color={colors.mutedForeground} />
        )}
        <Text style={{
          fontSize: depth === 0 ? 15 : depth === 1 ? 13 : 12,
          fontWeight: depth <= 1 ? '700' : '500',
          color: depth === 0 ? colors.primary : colors.foreground,
          flex: 1,
        }}>
          {label}
        </Text>
      </Pressable>
      {open && hasKids && children.map((child: any, i: number) => (
        <MindMapNode key={i} node={child} depth={depth + 1} colors={colors} />
      ))}
    </View>
  );
};

const NativeMindMap = ({ data, colors }: { data: any; colors: any }) => {
  if (!data) return null;
  // Normalise: the mindmap data can be a raw object or an array of nodes
  const nodes: any[] = Array.isArray(data) ? data : (data.children || data.nodes || [data]);
  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      {nodes.map((n: any, i: number) => <MindMapNode key={i} node={n} depth={0} colors={colors} />)}
    </ScrollView>
  );
};

// ─── Per-resource viewer ──────────────────────────────────────────────────

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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
            <Pressable
              onPress={goBack}
              style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}
            >
              <ArrowLeft size={20} color={colors.foreground} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text
                style={{ fontSize: 18, fontWeight: '800', color: colors.primary, fontFamily: 'PlusJakartaSans_800ExtraBold' }}
                numberOfLines={1}
              >
                {panel === 'subjects' ? 'Question Bank' : (panel === 'chapters' ? `${subjectMeta?.label} Chapters` : (panel === 'topics' ? (selectedChapter?._id || selectedChapter?.name) : (selectedTopic || 'Roadmap')))}
              </Text>
              {breadcrumb.length > 0 && (
                <Text style={{ fontSize: 11, color: colors.mutedForeground, marginTop: -2, fontFamily: 'Inter_400Regular' }} numberOfLines={1}>
                  {breadcrumb.join(' > ')}
                </Text>
              )}
            </View>
          </View>
          <View style={{
            width: 35, height: 35, borderRadius: 16,
            backgroundColor: colors.primary + '14',
            alignItems: 'center', justifyContent: 'center',
          }}>
            {panel === 'roadmap' ? (
              <BookOpen size={20} color={colors.primary} />
            ) : subjectMeta ? (
              <subjectMeta.icon size={20} color={subjectMeta.tint} />
            ) : (
              <BookOpen size={20} color={colors.primary} />
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
                {false && toppersEssentials && hasAnyEssential(toppersEssentials) && (
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
              {(() => {
                if (!toppersEssentials || !toppersPreviewResource) return null;
                const te = toppersEssentials;
                const key = toppersPreviewResource;
                const reaction = chapterReactions[key] || { likes: 0, dislikes: 0, userReaction: 'none' as const };
                const toggleReaction = async (rt: ResourceKey, r: 'like' | 'dislike') => {
                  const chapId = String(selectedChapter?._id || selectedChapter?.id || selectedChapter?.chapterId || '');
                  if (!chapId) return;

                  const cur = chapterReactions[rt] || { likes: 0, dislikes: 0, userReaction: 'none' as const };
                  const wasThis = cur.userReaction === r;
                  const newReaction = wasThis ? 'none' : r;

                  // Optimistic update
                  setChapterReactions(prev => ({
                    ...prev,
                    [rt]: {
                      likes: r === 'like' ? cur.likes + (wasThis ? -1 : 1) : cur.likes - (cur.userReaction === 'like' ? 1 : 0),
                      dislikes: r === 'dislike' ? cur.dislikes + (wasThis ? -1 : 1) : cur.dislikes - (cur.userReaction === 'dislike' ? 1 : 0),
                      userReaction: newReaction,
                    }
                  }));

                  try {
                    await apiService.curriculum.toggleResourceReaction({
                      chapterId: chapId,
                      resourceType: rt,
                      reaction: newReaction
                    });
                  } catch (e) {
                    // Rollback on error
                    setChapterReactions(prev => ({ ...prev, [rt]: cur }));
                    Alert.alert('Error', 'Failed to update reaction. Please try again.');
                  }
                };

                // ── VIDEO ──────────────────────────────────────────────
                if (key === 'video' && te.video?.url) {
                  const ytUrl = getYouTubeEmbedUrl(te.video.url);
                  const driveUrl = ytUrl ? null : toEmbedDriveUrl(te.video.url);
                  const embedUrl = ytUrl || driveUrl;
                  return (
                    <View style={{ flex: 1, backgroundColor: '#1c1c1e' }}>
                      {/* 16:9 video embed */}
                      <View style={{ width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000' }}>
                        {embedUrl ? (
                          <WebView
                            source={{ uri: embedUrl }}
                            style={{ flex: 1 }}
                            allowsFullscreenVideo
                            mediaPlaybackRequiresUserAction={false}
                          />
                        ) : (
                          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>No video available</Text>
                          </View>
                        )}
                      </View>
                      {/* Metadata + reactions */}
                      <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 }}>
                        <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff', lineHeight: 24 }}>
                          {te.video.title || 'Video Lecture'}
                        </Text>
                        {te.video.time && (
                          <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>
                            {te.video.time}
                          </Text>
                        )}
                        <View style={{ marginTop: 16 }}>
                          <ReactionRow
                            reaction={reaction}
                            onLike={() => toggleReaction(key, 'like')}
                            onDislike={() => toggleReaction(key, 'dislike')}
                            dark
                          />
                        </View>
                      </View>
                    </View>
                  );
                }

                // ── AUDIO (Podcast) ────────────────────────────────────
                if (key === 'audio' && te.audio) {
                  const isDirect = /\.(mp3|m4a|ogg|wav|aac)$/i.test(te.audio);
                  return (
                    <View style={{ flex: 1, backgroundColor: '#0d0d1e' }}>
                      {isDirect ? (
                        <NativeAudioPlayer src={te.audio} />
                      ) : (
                        // Fall back to WebView for Google Drive audio
                        <WebView source={{ uri: toEmbedDriveUrl(te.audio) }} style={{ flex: 1 }} />
                      )}
                      {/* Podcast info & reactions */}
                      <View style={{
                        paddingHorizontal: 20, paddingVertical: 14,
                        borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)',
                        backgroundColor: 'rgba(0,0,0,0.5)',
                      }}>
                        <View style={{ alignItems: 'center', gap: 8 }}>
                          <View style={{ padding: 10, borderRadius: 999, backgroundColor: '#6a7ef533' }}>
                            <Headphones size={22} color="#6a7ef5" />
                          </View>
                          <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>Podcast Episode</Text>
                          <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', textAlign: 'center' }}>
                            Listen to the chapter audio summary
                          </Text>
                        </View>
                        <View style={{ alignItems: 'center', marginTop: 12 }}>
                          <ReactionRow
                            reaction={reaction}
                            onLike={() => toggleReaction(key, 'like')}
                            onDislike={() => toggleReaction(key, 'dislike')}
                            dark
                          />
                        </View>
                      </View>
                    </View>
                  );
                }

                // ── SLIDES ─────────────────────────────────────────────
                if (key === 'slides' && te.slidesdeck?.url) {
                  return (
                    <View style={{ flex: 1 }}>
                      <WebView
                        source={{ uri: toEmbedDriveUrl(te.slidesdeck.url) }}
                        style={{ flex: 1 }}
                        startInLoadingState
                      />
                      <View style={{
                        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                        paddingHorizontal: 16, paddingVertical: 12,
                        borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background
                      }}>
                        <View>
                          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.foreground }}>
                            {te.slidesdeck.title || 'Slides'}
                          </Text>
                          <Text style={{ fontSize: 10, color: colors.mutedForeground }}>Presentation</Text>
                        </View>
                        <ReactionRow
                          reaction={reaction}
                          onLike={() => toggleReaction(key, 'like')}
                          onDislike={() => toggleReaction(key, 'dislike')}
                        />
                      </View>
                    </View>
                  );
                }

                // ── MIND MAP ───────────────────────────────────────────
                if (key === 'mindmap' && te.mindmap) {
                  return (
                    <View style={{ flex: 1, backgroundColor: colors.background }}>
                      <NativeMindMap data={te.mindmap} colors={colors} />
                      <View style={{
                        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                        paddingHorizontal: 16, paddingVertical: 12,
                        borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background
                      }}>
                        <View>
                          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.foreground }}>Mind Map</Text>
                          <Text style={{ fontSize: 10, color: colors.mutedForeground }}>Visual summary</Text>
                        </View>
                        <ReactionRow
                          reaction={reaction}
                          onLike={() => toggleReaction(key, 'like')}
                          onDislike={() => toggleReaction(key, 'dislike')}
                        />
                      </View>
                    </View>
                  );
                }

                // ── INFOGRAPHIC ────────────────────────────────────────
                if (key === 'infographic' && te.infographic) {
                  return (
                    <View style={{ flex: 1 }}>
                      <WebView
                        source={{ uri: toEmbedDriveUrl(te.infographic) }}
                        style={{ flex: 1 }}
                        startInLoadingState
                      />
                      <View style={{
                        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                        paddingHorizontal: 16, paddingVertical: 12,
                        borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background
                      }}>
                        <View>
                          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.foreground }}>Infographic</Text>
                          <Text style={{ fontSize: 10, color: colors.mutedForeground }}>Chapter visual</Text>
                        </View>
                        <ReactionRow
                          reaction={reaction}
                          onLike={() => toggleReaction(key, 'like')}
                          onDislike={() => toggleReaction(key, 'dislike')}
                        />
                      </View>
                    </View>
                  );
                }

                // ── QUICK REVISION (Report) ────────────────────────────
                if (key === 'report' && te.report) {
                  return (
                    <View style={{ flex: 1 }}>
                      <WebView
                        source={{ uri: toEmbedDriveUrl(te.report) }}
                        style={{ flex: 1 }}
                        startInLoadingState
                      />
                      <View style={{
                        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                        paddingHorizontal: 16, paddingVertical: 12,
                        borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background
                      }}>
                        <View>
                          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.foreground }}>Quick Revision</Text>
                          <Text style={{ fontSize: 10, color: colors.mutedForeground }}>Chapter Report</Text>
                        </View>
                        <ReactionRow
                          reaction={reaction}
                          onLike={() => toggleReaction(key, 'like')}
                          onDislike={() => toggleReaction(key, 'dislike')}
                        />
                      </View>
                    </View>
                  );
                }

                // ── FLASHCARDS ─────────────────────────────────────────
                if (key === 'flashcards' && te.flashcards) {
                  return (
                    <View style={{ flex: 1 }}>
                      <WebView
                        source={{ uri: toEmbedDriveUrl(te.flashcards) }}
                        style={{ flex: 1 }}
                        startInLoadingState
                      />
                      <View style={{
                        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                        paddingHorizontal: 16, paddingVertical: 12,
                        borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background
                      }}>
                        <View>
                          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.foreground }}>Flashcards</Text>
                          <Text style={{ fontSize: 10, color: colors.mutedForeground }}>Study cards</Text>
                        </View>
                        <ReactionRow
                          reaction={reaction}
                          onLike={() => toggleReaction(key, 'like')}
                          onDislike={() => toggleReaction(key, 'dislike')}
                        />
                      </View>
                    </View>
                  );
                }

                // ── Fallback ───────────────────────────────────────────
                return (
                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                    <Text style={{ color: colors.mutedForeground, textAlign: 'center' }}>
                      This resource is not available yet.
                    </Text>
                  </View>
                );
              })()}
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}
