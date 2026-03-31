import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, Image, TextInput, Modal, Linking, Platform, Animated, Easing, Dimensions } from 'react-native';
import { MotiView } from 'moti';
import { WebView } from 'react-native-webview';
import {
  ChevronLeft, ChevronRight, Clock, Menu, X, Flag, Star, StickyNote,
  AlertTriangle, Eraser, CheckCircle2, Send, Eye, BookOpen, ArrowUp, ArrowDown, RotateCcw
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DiagramGallery from '@/components/questions/DiagramGallery';
import apiService from '@/lib/apiService';
import {
  AnswerPayload,
  NormalizedQuestion,
  MatchPair,
  OrderItem,
  isAnswerPayloadAttempted,
  getCorrectOptionIndex,
} from '@/lib/questionNormalization';
import { ColorTokens } from '@/theme/colors';

const PALETTE_DRAWER_WIDTH = Math.min(Dimensions.get('window').width * 0.85, 400);

export type NTAQuestion = NormalizedQuestion;

export interface NTASection {
  name: string;
  emoji?: string;
  startIndex: number;
  endIndex: number;
}

export type QuestionState = 'not-visited' | 'not-answered' | 'answered' | 'marked-review' | 'answered-marked';

export interface QuestionMeta {
  state: QuestionState;
  answerPayload: AnswerPayload | null;
  bookmarked: boolean;
  note: string;
  timeSpent: number;
}

export interface NTATestPlayerProps {
  questions: NTAQuestion[];
  sections?: NTASection[];
  title?: string;
  duration: number;
  onSubmit: (data: NTASubmitData) => void;
  onAnswerChange?: (questionIndex: number, answer: AnswerPayload | null, meta: QuestionMeta) => void;
  initialMeta?: QuestionMeta[];
  readOnly?: boolean;
}

export interface NTASubmitData {
  answers: (AnswerPayload | null)[];
  meta: QuestionMeta[];
  timeTaken: number;
}

const DEFAULT_SECTIONS: NTASection[] = [
  { name: 'Physics', emoji: '⚙️', startIndex: 0, endIndex: 44 },
  { name: 'Chemistry', emoji: '🧪', startIndex: 45, endIndex: 89 },
  { name: 'Botany', emoji: '🌿', startIndex: 90, endIndex: 134 },
  { name: 'Zoology', emoji: '🐾', startIndex: 135, endIndex: 179 },
];

const isAttempted = (answerPayload: AnswerPayload | null | undefined) => isAnswerPayloadAttempted(answerPayload);

function getOptionArray(q: NTAQuestion): string[] {
  const options = q.options ?? q.typeData?.options;
  if (!q || options === null || options === undefined) return ['', '', '', ''];

  if (Array.isArray(options)) {
    return options.map((opt: any) => {
      if (typeof opt === 'string') return opt;
      if (opt && typeof opt === 'object') {
        if (typeof opt.text === 'string') return opt.text;
        if (opt.text && typeof opt.text === 'object') {
          return String(opt.text.en || opt.text.hi || '');
        }
        if (typeof opt.value === 'string') return opt.value;
      }
      return String(opt ?? '');
    });
  }

  if (typeof options === 'object') {
    return ['A', 'B', 'C', 'D'].map((k) => {
      const value: any = (options as Record<string, any>)?.[k];
      if (typeof value === 'string') return value;
      if (value && typeof value === 'object') {
        if (typeof value.text === 'string') return value.text;
        if (value.text && typeof value.text === 'object') {
          return String(value.text.en || value.text.hi || '');
        }
      }
      return '';
    });
  }

  return ['', '', '', ''];
}

function formatTime(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

const getEmbeddableVideoUrl = (value: string | null | undefined) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (YOUTUBE_ID_PATTERN.test(trimmed)) return `https://www.youtube.com/embed/${trimmed}`;
  const match = trimmed.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/]+)/);
  return match?.[1] ? `https://www.youtube.com/embed/${match[1]}` : trimmed;
};

const getVideoSource = (question: NTAQuestion) => {
  const candidates = [question.videoUrl, question.typeData?.videoUrl, question.imageId, question.question];
  for (const candidate of candidates) {
    const embeddableUrl = getEmbeddableVideoUrl(candidate as string | null | undefined);
    if (embeddableUrl) {
      return {
        embedUrl: embeddableUrl,
        rawValue: typeof candidate === 'string' ? candidate.trim() : '',
      };
    }
  }
  return { embedUrl: null, rawValue: '' };
};

interface RendererProps {
  question: NTAQuestion;
  answerPayload: AnswerPayload | null;
  onChange: (answer: AnswerPayload | null) => void;
  readOnly: boolean;
  colors: ColorTokens;
}

const MCQRenderer: React.FC<RendererProps> = ({ question, answerPayload, onChange, readOnly, colors }) => {
  const options = Array.isArray(question.typeData?.options) ? question.typeData.options : getOptionArray(question);
  const selected = answerPayload?.kind === 'mcq' ? answerPayload.selectedOption : null;
  const correctIdx = getCorrectOptionIndex(question as NormalizedQuestion);
  const labels = ['A', 'B', 'C', 'D'];

  return (
    <View style={{ gap: 10 }}>
      {options.map((opt: any, i: number) => {
        const isSelected = selected === i;
        let bg = colors.card;
        let borderColor = colors.border;
        let textColor = colors.foreground;
        let badgeBg = 'transparent';
        let badgeBorder = colors.mutedForeground + '4D';
        let badgeText = colors.mutedForeground;

        if (readOnly) {
          if (correctIdx === i) {
            borderColor = colors.success;
            bg = colors.success + '1A';
            badgeBg = colors.success;
            badgeBorder = colors.success;
            badgeText = '#fff';
          } else if (isSelected && correctIdx !== i) {
            borderColor = colors.destructive;
            bg = colors.destructive + '1A';
            badgeBg = colors.destructive;
            badgeBorder = colors.destructive;
            badgeText = '#fff';
          }
        } else if (isSelected) {
          borderColor = colors.primary;
          bg = colors.primary + '1A';
          badgeBg = colors.primary;
          badgeBorder = colors.primary;
          badgeText = '#fff';
        }

        return (
          <Pressable
            key={i}
            onPress={() => onChange({ kind: 'mcq', selectedOption: i })}
            disabled={readOnly}
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              padding: 14,
              borderRadius: 12,
              borderWidth: 2,
              borderColor,
              backgroundColor: bg,
            }}
          >
            <View style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: badgeBorder, backgroundColor: badgeBg, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: badgeText }}>{labels[i]}</Text>
            </View>
            <Text style={{ flex: 1, fontSize: 14, lineHeight: 22, color: textColor, marginTop: 2 }}>{String(opt || '')}</Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const FillupRenderer: React.FC<RendererProps> = ({ answerPayload, onChange, readOnly, colors }) => (
  <View style={{ borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 12 }}>
    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.mutedForeground, marginBottom: 8 }}>Your Answer</Text>
    <TextInput
      value={answerPayload?.kind === 'fillup' ? answerPayload.value : ''}
      placeholder="Type your answer"
      placeholderTextColor={colors.mutedForeground}
      onChangeText={(value) => onChange({ kind: 'fillup', value })}
      editable={!readOnly}
      multiline
      style={{ minHeight: 44, padding: 10, borderRadius: 12, backgroundColor: colors.muted + '22', color: colors.foreground }}
    />
  </View>
);

const MatchRenderer: React.FC<RendererProps> = ({ question, answerPayload, onChange, readOnly, colors }) => {
  const pairs: MatchPair[] = Array.isArray(question.typeData?.pairs) ? question.typeData.pairs : [];
  const selectedPairs = answerPayload?.kind === 'match' ? answerPayload.pairs : {};
  const [activeLeft, setActiveLeft] = useState<string | null>(null);
  const rightColumn = useMemo(() => [...pairs].sort((a, b) => a.right.localeCompare(b.right)), [pairs]);

  const assign = (leftId: string, rightValue: string) => {
    onChange({ kind: 'match', pairs: { ...selectedPairs, [leftId]: rightValue } });
    setActiveLeft(null);
  };

  return (
    <View style={{ gap: 12 }}>
      <View style={{ borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 12 }}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.mutedForeground, marginBottom: 8 }}>Column A</Text>
        {pairs.map((pair) => (
          <Pressable
            key={pair.id}
            onPress={() => setActiveLeft(pair.id)}
            disabled={readOnly}
            style={{ borderRadius: 12, borderWidth: 1, borderColor: activeLeft === pair.id ? colors.primary : colors.border, backgroundColor: activeLeft === pair.id ? colors.primary + '1A' : colors.background, padding: 12, marginBottom: 8 }}
          >
            <Text style={{ fontSize: 14, color: colors.foreground }}>{pair.left}</Text>
            <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 4 }}>{selectedPairs[pair.id] ? `Matched: ${selectedPairs[pair.id]}` : 'Select this row, then choose from Column B'}</Text>
          </Pressable>
        ))}
      </View>
      <View style={{ borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 12 }}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.mutedForeground, marginBottom: 8 }}>Column B</Text>
        {rightColumn.map((pair) => {
          const linked = Object.entries(selectedPairs).find(([, value]) => value === pair.right)?.[0];
          return (
            <Pressable
              key={`${pair.id}-right`}
              onPress={() => activeLeft && assign(activeLeft, pair.right)}
              disabled={readOnly || !activeLeft}
              style={{
                borderRadius: 12,
                borderWidth: 1,
                borderColor: linked ? colors.primary : colors.border,
                backgroundColor: linked ? colors.primary + '1A' : colors.background,
                padding: 12,
                marginBottom: 8,
                opacity: !activeLeft && !readOnly ? 0.6 : 1,
              }}
            >
              <Text style={{ fontSize: 14, color: colors.foreground }}>{pair.right}</Text>
              <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 4 }}>{linked ? `Assigned to ${pairs.find((item) => item.id === linked)?.left || 'left item'}` : 'Tap after selecting a left item'}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const OrderRenderer: React.FC<RendererProps> = ({ question, answerPayload, onChange, readOnly, colors }) => {
  const items: OrderItem[] = Array.isArray(question.typeData?.items) ? question.typeData.items : [];
  const orderedIds = answerPayload?.kind === 'order' && answerPayload.orderedIds.length ? answerPayload.orderedIds : items.map((item) => item.id);

  const move = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= orderedIds.length) return;
    const next = [...orderedIds];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    onChange({ kind: 'order', orderedIds: next });
  };

  return (
    <View style={{ gap: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 12 }}>
      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.mutedForeground, marginBottom: 8 }}>Arrange in the correct order</Text>
      {orderedIds.map((id, index) => {
        const item = items.find((entry) => entry.id === id);
        return (
          <View key={id} style={{ borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 14, color: colors.foreground }}>{index + 1}. {item?.text || id}</Text>
            {!readOnly && (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable onPress={() => move(index, -1)} disabled={index === 0} style={{ padding: 8, borderRadius: 10, backgroundColor: index === 0 ? colors.muted : colors.primary + '22' }}>
                  <ArrowUp size={16} color={index === 0 ? colors.mutedForeground : colors.primary} />
                </Pressable>
                <Pressable onPress={() => move(index, 1)} disabled={index === orderedIds.length - 1} style={{ padding: 8, borderRadius: 10, backgroundColor: index === orderedIds.length - 1 ? colors.muted : colors.primary + '22' }}>
                  <ArrowDown size={16} color={index === orderedIds.length - 1 ? colors.mutedForeground : colors.primary} />
                </Pressable>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
};

const FlashcardRenderer: React.FC<RendererProps> = ({ question, answerPayload, onChange, readOnly, colors }) => {
  const flipped = answerPayload?.kind === 'flashcard' ? answerPayload.flipped : false;
  const completed = answerPayload?.kind === 'flashcard' ? answerPayload.completed : false;
  const front = question.typeData?.front || question.question;
  const back = question.typeData?.back || question.explanation;

  const update = (next: Partial<{ flipped: boolean; completed: boolean }>) => {
    onChange({ kind: 'flashcard', flipped: next.flipped ?? flipped, completed: next.completed ?? completed });
  };

  return (
    <View style={{ gap: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 12 }}>
      <View style={{ minHeight: 180, borderRadius: 12, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.primary + '11', padding: 16, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 14, color: colors.foreground, textAlign: 'center' }}>{(flipped ? back : front || '').replace(/\n/g, '\n').replace(/\/n/g, '\n')}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button variant="outline" size="sm" style={{ flex: 1 }} disabled={readOnly} onPress={() => update({ flipped: !flipped })}>
          <RotateCcw size={16} color={colors.foreground} />
          <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: '700', marginLeft: 6 }}>{flipped ? 'Show Front' : 'Flip Card'}</Text>
        </Button>
        <Button size="sm" style={{ flex: 1 }} disabled={readOnly} onPress={() => update({ completed: !completed, flipped: true })}>
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>{completed ? 'Completed' : 'Mark Complete'}</Text>
        </Button>
      </View>
    </View>
  );
};

const VideoRenderer: React.FC<RendererProps> = ({ question, answerPayload, onChange, readOnly, colors }) => {
  const completed = answerPayload?.kind === 'video' ? answerPayload.completed : false;
  const { embedUrl: videoUrl, rawValue: rawVideoValue } = getVideoSource(question);
  const prompt = question.typeData?.prompt || question.question;
  const openVideoUrl = rawVideoValue ? (YOUTUBE_ID_PATTERN.test(rawVideoValue) ? `https://www.youtube.com/watch?v=${rawVideoValue}` : rawVideoValue) : null;

  return (
    <View style={{ gap: 12 }}>
      {videoUrl ? (
        <View style={{ borderRadius: 12, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', backgroundColor: colors.card, height: 220 }}>
          {Platform.OS === 'web' ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
              <Text style={{ color: colors.mutedForeground, textAlign: 'center' }}>
                Open the video using the button below in web preview.
              </Text>
            </View>
          ) : (
            <WebView
              source={{ uri: videoUrl }}
              style={{ flex: 1 }}
              javaScriptEnabled
              domStorageEnabled
              allowsFullscreenVideo
              mediaPlaybackRequiresUserAction
              startInLoadingState
            />
          )}
        </View>
      ) : (
        <View style={{ borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 12 }}>
          <Text style={{ color: colors.mutedForeground }}>Video URL is not available for this question.</Text>
        </View>
      )}
      {prompt ? (
        <View style={{ borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 12 }}>
          <Text style={{ color: colors.foreground, fontSize: 14, lineHeight: 20 }}>
            {String(prompt || '').replace(/\\n/g, '\n').replace(/\/n/g, '\n')}
          </Text>
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button size="sm" style={{ flex: 1 }} disabled={readOnly} onPress={() => onChange({ kind: 'video', completed: !completed })}>
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>{completed ? 'Completed' : 'Mark Watched'}</Text>
        </Button>
        {openVideoUrl ? (
          <Button variant="outline" size="sm" style={{ flex: 1 }} onPress={() => Linking.openURL(openVideoUrl)}>
            <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: '700' }}>Open Video</Text>
          </Button>
        ) : null}
      </View>
    </View>
  );
};

const UnsupportedRenderer: React.FC<RendererProps> = ({ question, colors }) => (
  <View style={{ borderRadius: 12, borderWidth: 1, borderColor: '#dc2626', backgroundColor: '#fee2e2', padding: 14 }}>
    <Text style={{ fontSize: 14, fontWeight: '700', color: '#b91c1c' }}>This question type is not available in the current dataset.</Text>
    <Text style={{ marginTop: 6, color: '#991b1b' }}>Type: {question.type}</Text>
    <Text style={{ marginTop: 4, color: '#991b1b' }}>Question ID: {String(question.questionId || question.id || '')}</Text>
    <Text style={{ marginTop: 6, color: '#b91c1c' }}>{question.unsupportedReason || 'Missing structured data for rendering.'}</Text>
  </View>
);

const QuestionRenderer: React.FC<RendererProps> = ({ question, answerPayload, onChange, readOnly, colors }) => {
  if (question.isSupported === false) return <UnsupportedRenderer question={question} answerPayload={answerPayload} onChange={onChange} readOnly={readOnly} colors={colors} />;
  switch (question.type) {
    case 'mcq': return <MCQRenderer question={question} answerPayload={answerPayload} onChange={onChange} readOnly={readOnly} colors={colors} />;
    case 'fillup': return <FillupRenderer question={question} answerPayload={answerPayload} onChange={onChange} readOnly={readOnly} colors={colors} />;
    case 'match': return <MatchRenderer question={question} answerPayload={answerPayload} onChange={onChange} readOnly={readOnly} colors={colors} />;
    case 'order': return <OrderRenderer question={question} answerPayload={answerPayload} onChange={onChange} readOnly={readOnly} colors={colors} />;
    case 'flashcard': return <FlashcardRenderer question={question} answerPayload={answerPayload} onChange={onChange} readOnly={readOnly} colors={colors} />;
    case 'video': return <VideoRenderer question={question} answerPayload={answerPayload} onChange={onChange} readOnly={readOnly} colors={colors} />;
    default: return <UnsupportedRenderer question={question} answerPayload={answerPayload} onChange={onChange} readOnly={readOnly} colors={colors} />;
  }
};

const NTATestPlayer: React.FC<NTATestPlayerProps> = ({
  questions,
  sections: sectionsProp,
  title = 'Mock Test',
  duration,
  onSubmit,
  onAnswerChange,
  initialMeta,
  readOnly = false,
}) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const totalQ = questions.length;

  const sections = useMemo(() => {
    if (sectionsProp && sectionsProp.length > 0) return sectionsProp;
    if (totalQ <= 50) return [{ name: 'All', emoji: '📝', startIndex: 0, endIndex: totalQ - 1 }];
    return DEFAULT_SECTIONS.map((s) => ({
      ...s,
      endIndex: Math.min(s.endIndex, totalQ - 1),
    })).filter((s) => s.startIndex < totalQ);
  }, [sectionsProp, totalQ]);

  const [currentQ, setCurrentQ] = useState(0);
  const [meta, setMeta] = useState<QuestionMeta[]>(() =>
    initialMeta ??
    Array.from({ length: totalQ }, () => ({
      state: 'not-visited' as QuestionState,
      answerPayload: null,
      bookmarked: false,
      note: '',
      timeSpent: 0,
    }))
  );
  const [timeLeft, setTimeLeft] = useState(duration);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fetchedImages, setFetchedImages] = useState<Record<string, string>>({});
  const [timerTick, setTimerTick] = useState(0);
  const paletteTranslateX = useRef(new Animated.Value(PALETTE_DRAWER_WIDTH)).current;
  const questionScrollRef = useRef<ScrollView>(null);

  const questionEntryTime = useRef(Date.now());

  useEffect(() => {
    const q = questions[currentQ];
    if (q && !q.imageUrl && q.questionId && (q.subject === 'biology' || !q.subject) && !fetchedImages[q.questionId]) {
      apiService.curriculum.getImageFallback(q.subject || 'biology', String(q.questionId))
        .then((res) => {
          if (res.data.success && res.data.imageUrl) {
            setFetchedImages((prev) => ({ ...prev, [String(q.questionId)]: res.data.imageUrl }));
          }
        })
        .catch((err) => console.log('Image fetch fallback failed', err));
    }
  }, [currentQ, questions, fetchedImages]);

  useEffect(() => {
    questionEntryTime.current = Date.now();
    questionScrollRef.current?.scrollTo({ y: 0, animated: false });
    setMeta((prev) => {
      const next = [...prev];
      if (!next[currentQ]) return prev;
      if (next[currentQ].state === 'not-visited') {
        next[currentQ] = { ...next[currentQ], state: 'not-answered' };
      }
      return next;
    });
  }, [currentQ]);

  const recordTimeSpent = useCallback(() => {
    const elapsed = Math.round((Date.now() - questionEntryTime.current) / 1000);
    setMeta((prev) => {
      const next = [...prev];
      const nextMeta = { ...next[currentQ], timeSpent: next[currentQ].timeSpent + Math.max(0, elapsed) };
      next[currentQ] = nextMeta;
      onAnswerChange?.(currentQ, nextMeta.answerPayload, nextMeta);
      return next;
    });
    questionEntryTime.current = Date.now();
  }, [currentQ, onAnswerChange]);

  useEffect(() => {
    if (readOnly) return;
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval);
          handleSubmit();
          return 0;
        }
        return t - 1;
      });
      setTimerTick((value) => value + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [readOnly]);

  useEffect(() => {
    if (readOnly) return;
    if (Platform.OS !== 'web') return;
    const onVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.hidden) recordTimeSpent();
      else questionEntryTime.current = Date.now();
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibilityChange);
      return () => document.removeEventListener('visibilitychange', onVisibilityChange);
    }
  }, [recordTimeSpent, readOnly]);

  useEffect(() => {
    Animated.timing(paletteTranslateX, {
      toValue: paletteOpen ? 0 : PALETTE_DRAWER_WIDTH,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [paletteOpen, paletteTranslateX]);

  const currentSection = useMemo(() => sections.find((s) => currentQ >= s.startIndex && currentQ <= s.endIndex) ?? sections[0], [currentQ, sections]);

  const stats = useMemo(() => {
    const s = { answered: 0, notAnswered: 0, markedReview: 0, notVisited: 0, answeredMarked: 0 };
    meta.forEach((m) => {
      if (m.state === 'answered') s.answered++;
      else if (m.state === 'not-answered') s.notAnswered++;
      else if (m.state === 'marked-review') s.markedReview++;
      else if (m.state === 'not-visited') s.notVisited++;
      else if (m.state === 'answered-marked') s.answeredMarked++;
    });
    return s;
  }, [meta]);

  const sectionStats = useCallback((sec: NTASection) => {
    let attempted = 0;
    let total = 0;
    for (let i = sec.startIndex; i <= Math.min(sec.endIndex, totalQ - 1); i++) {
      if (!meta[i]) continue;
      total++;
      if (meta[i].state === 'answered' || meta[i].state === 'answered-marked') attempted++;
    }
    return { attempted, total };
  }, [meta, totalQ]);

  const updateCurrentMeta = (updater: (current: QuestionMeta) => QuestionMeta) => {
    setMeta((prev) => {
      const next = [...prev];
      next[currentQ] = updater(next[currentQ]);
      onAnswerChange?.(currentQ, next[currentQ].answerPayload, next[currentQ]);
      return next;
    });
  };

  const handleAnswerPayloadChange = (answerPayload: AnswerPayload | null) => {
    if (readOnly) return;
    updateCurrentMeta((current) => {
      const attempted = isAttempted(answerPayload);
      const marked = current.state === 'marked-review' || current.state === 'answered-marked';
      return { ...current, answerPayload, state: attempted ? (marked ? 'answered-marked' : 'answered') : (marked ? 'marked-review' : 'not-answered') };
    });
  };

  const clearAnswer = () => !readOnly && handleAnswerPayloadChange(null);
  const toggleMarkReview = () => !readOnly && updateCurrentMeta((current) => {
    const attempted = isAttempted(current.answerPayload);
    const marked = current.state === 'marked-review' || current.state === 'answered-marked';
    return { ...current, state: marked ? (attempted ? 'answered' : 'not-answered') : (attempted ? 'answered-marked' : 'marked-review') };
  });
  const toggleBookmark = () => updateCurrentMeta((current) => ({ ...current, bookmarked: !current.bookmarked }));
  const updateNote = (text: string) => updateCurrentMeta((current) => ({ ...current, note: text }));

  const goTo = (index: number) => {
    if (index < 0 || index >= totalQ) return;
    recordTimeSpent();
    setCurrentQ(index);
    setPaletteOpen(false);
  };

  const saveAndNext = () => {
    recordTimeSpent();
    if (currentQ < totalQ - 1) setCurrentQ(currentQ + 1);
  };

  const markAndNext = () => {
    if (!readOnly) toggleMarkReview();
    recordTimeSpent();
    if (currentQ < totalQ - 1) setCurrentQ(currentQ + 1);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setShowSubmitDialog(false);
    recordTimeSpent();
    try {
      await onSubmit({ answers: meta.map((entry) => entry.answerPayload), meta, timeTaken: duration - timeLeft });
    } catch (error) {
      console.error('Failed to submit test:', error);
      setIsSubmitting(false);
      setShowSubmitDialog(true);
    }
  };

  const q = questions[currentQ];
  const curMeta = meta[currentQ] || {
    state: 'not-visited' as QuestionState,
    answerPayload: null,
    bookmarked: false,
    note: '',
    timeSpent: 0,
  };
  const isMarked = curMeta.state === 'marked-review' || curMeta.state === 'answered-marked';
  const currentQuestionElapsed = useMemo(() => {
    const stored = Number(curMeta?.timeSpent || 0);
    if (readOnly || isSubmitting) return stored;
    return stored + Math.max(0, Math.round((Date.now() - questionEntryTime.current) / 1000));
  }, [curMeta?.timeSpent, isSubmitting, readOnly, timerTick]);

  const timerUrgent = timeLeft < 300;
  const timerWarning = timeLeft < 900 && !timerUrgent;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* ═══ TOP BAR ═══ */}
      <View style={{ paddingTop: insets.top, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: 12, paddingBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, marginTop: 8 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground, flex: 1, marginRight: 8 }} numberOfLines={1}>{title}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: timerUrgent ? colors.destructive + '26' : timerWarning ? colors.warning + '26' : colors.primary + '1A' }}>
            <Clock size={14} color={timerUrgent ? colors.destructive : timerWarning ? colors.warning : colors.primary} />
            <Text style={{ fontSize: 12, fontWeight: '700', fontFamily: 'Courier', color: timerUrgent ? colors.destructive : timerWarning ? colors.warning : colors.primary }}>{formatTime(timeLeft)}</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Badge variant="secondary"><Text style={{ fontSize: 12, fontWeight: '500' }}>{currentSection.emoji} {currentSection.name}</Text></Badge>
            <Text style={{ fontSize: 12, fontWeight: '500', color: colors.mutedForeground }}>Q {currentQ + 1}/{totalQ}</Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Pressable onPress={() => setPaletteOpen(true)} style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
              <Menu size={16} color={colors.foreground} />
            </Pressable>
            {!readOnly && (
              <Button variant="destructive" size="sm" onPress={() => setShowSubmitDialog(true)} >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f10505ff', paddingHorizontal: 12, height: 30, borderRadius: 999 }}>
                  <Send size={14} color="#fff" />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>Submit</Text>
                </View>
              </Button>
            )}
          </View>
        </View>
      </View>

      {/* ═══ QUESTION AREA ═══ */}
      <ScrollView ref={questionScrollRef} style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <MotiView
          key={currentQ}
          from={{ opacity: 0.96, translateX: 10 }}
          animate={{ opacity: 1, translateX: 0 }}
          transition={{ type: 'timing', duration: 120 }}
        >

          {/* Header row */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}
          >
            <View
              style={{
                backgroundColor: colors.primary + '1A',
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 999,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>
                Question {currentQ + 1}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 999,
                  marginLeft: 6,
                  backgroundColor: colors.muted + '66',
                }}
              >
                <Clock size={14} color={colors.mutedForeground} />
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.mutedForeground, marginLeft: 4 }}>
                  {formatTime(currentQuestionElapsed)}
                </Text>
              </View>
              <Pressable
                onPress={toggleBookmark}
                style={{
                  padding: 6,
                  borderRadius: 8,
                  marginLeft: 6,
                  backgroundColor: curMeta.bookmarked
                    ? colors.warning + '1A'
                    : 'transparent',
                }}
              >
                <Star
                  size={16}
                  color={curMeta.bookmarked ? colors.warning : colors.mutedForeground}
                  fill={curMeta.bookmarked ? colors.warning : 'none'}
                />
              </Pressable>

              <Pressable
                onPress={() => setNoteOpen(!noteOpen)}
                style={{
                  padding: 6,
                  borderRadius: 8,
                  marginLeft: 6,
                  backgroundColor: curMeta.note
                    ? colors.info + '1A'
                    : 'transparent',
                }}
              >
                <StickyNote
                  size={16}
                  color={curMeta.note ? colors.info : colors.mutedForeground}
                />
              </Pressable>

              {isMarked && (
                <View
                  style={{
                    padding: 6,
                    borderRadius: 8,
                    marginLeft: 6,
                    backgroundColor: colors.secondary + '1A',
                  }}
                >
                  <Flag size={16} color={colors.secondary} fill={colors.secondary} />
                </View>
              )}
            </View>
          </View>

          {/* Notes Section */}
          {noteOpen && (
            <MotiView
              from={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ type: 'timing', duration: 160 }}
              style={{ marginBottom: 12 }}
            >
              <TextInput
                placeholder="Add a personal note for this question..."
                placeholderTextColor={colors.mutedForeground}
                value={curMeta.note}
                onChangeText={updateNote}
                multiline
                editable={!readOnly}
                style={{
                  minHeight: 60,
                  padding: 12,
                  backgroundColor: colors.muted + '80',
                  borderRadius: 12,
                  fontSize: 14,
                  color: colors.foreground,
                  textAlignVertical: 'top',
                }}
              />
            </MotiView>
          )}

          {/* Question */}
          <Text
            style={{
              fontSize: 14,
              lineHeight: 22,
              color: colors.foreground,
              marginBottom: 16,
            }}
          >
            {(q?.question || '').replace(/\\n/g, '\n').replace(/\/n/g, '\n')}
          </Text>

          {(q?.imageUrl || (q?.questionId && fetchedImages[String(q.questionId)])) ? (
            <View
              style={{
                marginBottom: 16,
                borderRadius: 12,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Image
                source={{ uri: q?.imageUrl || fetchedImages[String(q?.questionId)] }}
                style={{ width: '100%', height: 240, resizeMode: 'contain' }}
              />
            </View>
          ) : null}

          <DiagramGallery
            diagrams={q?.resolvedQuestionDiagrams?.filter((d) =>
              d.status !== 'missing' || !(q?.imageUrl || fetchedImages[String(q.questionId)])
            )}
            style={{ marginBottom: 16 }}
          />

          <QuestionRenderer
            question={q}
            answerPayload={curMeta.answerPayload}
            onChange={handleAnswerPayloadChange}
            readOnly={readOnly}
            colors={colors}
          />

          {/* Explanation */}
          {readOnly && (q?.explanation || q?.resolvedExplanationDiagrams?.length) && (
            <View
              style={{
                marginTop: 16,
                padding: 12,
                borderRadius: 12,
                backgroundColor: colors.muted + '80',
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: 4,
                }}
              >
                <BookOpen size={14} color={colors.primary} />
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color: colors.primary,
                    marginLeft: 4,
                  }}
                >
                  Explanation
                </Text>
              </View>

              <Text
                style={{
                  fontSize: 14,
                  lineHeight: 20,
                  color: colors.mutedForeground,
                }}
              >
                {(q?.explanation || '').replace(/\\n/g, '\n').replace(/\/n/g, '\n')}
              </Text>
              {q?.explanationImageUrl ? (
                <View
                  style={{
                    marginTop: 12,
                    borderRadius: 12,
                    overflow: 'hidden',
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Image
                    source={{ uri: q.explanationImageUrl }}
                    style={{ width: '100%', height: 220, resizeMode: 'contain' }}
                  />
                </View>
              ) : null}
              <DiagramGallery diagrams={q?.resolvedExplanationDiagrams} style={{ marginTop: 12 }} />
            </View>
          )}
        </MotiView>
      </ScrollView>

      {/* ═══ BOTTOM CONTROLS ═══ */}
      <View style={{
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: Math.max(insets.bottom + 12, 24),
        backgroundColor: colors.card,
        borderTopWidth: 1,
        borderTopColor: colors.border
      }}>
        {/* Row 1: Action buttons */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10, alignItems: 'center' }}>
          <Button
            variant="ghost"
            style={{ flex: 1 }}
            onPress={clearAnswer}
            disabled={readOnly || !isAnswerPayloadAttempted(curMeta.answerPayload)}
          >
            <View style={{
              flex: 1,
              height: 32,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.card,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              paddingHorizontal: 12,
            }}>
              <Eraser size={14} color={colors.foreground} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.foreground, textAlign: 'center' }}>Clear</Text>
            </View>
          </Button>

          <Button
            variant="ghost"
            style={{ flex: 1 }}
            onPress={toggleMarkReview}
            disabled={readOnly}
          >
            <View style={{
              flex: 1,
              height: 32,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: isMarked ? '#7c3aed' : colors.border,
              backgroundColor: isMarked ? '#7c3aed' : colors.card,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              paddingHorizontal: 12,
            }}>
              <Flag size={14} color={isMarked ? '#ffffff' : colors.foreground} fill={isMarked ? '#ffffff' : 'none'} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: isMarked ? '#ffffff' : colors.foreground, textAlign: 'center' }}>
                {isMarked ? 'Unmark' : 'Mark Review'}
              </Text>
            </View>
          </Button>

          {/* <Button
            variant="ghost"
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: curMeta.bookmarked ? '#f59e0b' : colors.muted + '1A'
            }}
            onPress={toggleBookmark}
          >
            <Star size={16} color={curMeta.bookmarked ? '#ffffff' : colors.mutedForeground} fill={curMeta.bookmarked ? '#ffffff' : 'none'} />
          </Button> */}
        </View>

        {/* Row 2: Navigation */}
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Button
            variant="ghost"
            style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'transparent' }}
            onPress={() => goTo(currentQ - 1)}
            disabled={currentQ === 0}
          >
            <ChevronLeft size={20} color={currentQ === 0 ? colors.mutedForeground : colors.foreground} />
          </Button>

          {!readOnly ? (
            <View style={{ flex: 1, flexDirection: 'row', gap: 4 }}>
              <Button
                variant="primary"
                style={{
                  flex: 1,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: '#3b82f6'
                }}
                onPress={saveAndNext}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>Save & Next</Text>
                  <ChevronRight size={16} color="#fff" />
                </View>
              </Button>
              <Button
                variant="secondary"
                style={{
                  flex: 1,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: '#7c3aed'
                }}
                onPress={markAndNext}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>Mark & Next</Text>
                  <ChevronRight size={16} color="#fff" />
                </View>
              </Button>
            </View>
          ) : (
            <Button
              variant="primary"
              style={{ flex: 1, height: 40, borderRadius: 12, backgroundColor: colors.muted }}
              onPress={() => goTo(currentQ + 1)}
              disabled={currentQ >= totalQ - 1}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.foreground }}>Next</Text>
                <ChevronRight size={16} color={colors.foreground} />
              </View>
            </Button>
          )}
        </View>
      </View>

      {/* Palette Modal */}
      <Modal visible={paletteOpen} animationType="none" transparent onRequestClose={() => setPaletteOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <Pressable style={{ flex: 1 }} onPress={() => setPaletteOpen(false)} />
          <Animated.View
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              width: PALETTE_DRAWER_WIDTH,
              transform: [{ translateX: paletteTranslateX }],
              backgroundColor: colors.card,
            }}
          >
            <QuestionPalette
              sections={sections} meta={meta} currentQ={currentQ} totalQ={totalQ}
              stats={stats} sectionStats={sectionStats}
              onSelect={goTo} onClose={() => setPaletteOpen(false)} colors={colors}
            />
          </Animated.View>
        </View>
      </Modal>

      {/* Submit Warning Modal */}
      <Modal visible={showSubmitDialog} transparent animationType="fade" onRequestClose={() => setShowSubmitDialog(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: colors.card, width: '100%', maxWidth: 360, borderRadius: 24, padding: 24 }}>
            <View style={{ marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <AlertTriangle size={20} color="#f59e0b" />
                <Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground }}>Submit Test?</Text>
              </View>
              <Text style={{ fontSize: 14, color: colors.mutedForeground, lineHeight: 20 }}>
                Are you sure you want to submit? You cannot change answers after submission.
              </Text>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              <View style={{ width: '48%', backgroundColor: '#ecfdf5', borderColor: '#10b98122', borderWidth: 1, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={16} color="#10b981" />
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#065f46' }}>Answered: {stats.answered + stats.answeredMarked}</Text>
              </View>
              <View style={{ width: '48%', backgroundColor: '#fef2f2', borderColor: '#ef444422', borderWidth: 1, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <X size={16} color="#ef4444" />
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#991b1b' }}>Unanswered: {stats.notAnswered}</Text>
              </View>
              <View style={{ width: '48%', backgroundColor: '#f5f3ff', borderColor: '#8b5cf622', borderWidth: 1, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Flag size={16} color="#8b5cf6" />
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#5b21b6' }}>Review: {stats.markedReview + stats.answeredMarked}</Text>
              </View>
              <View style={{ width: '48%', backgroundColor: '#f8fafc', borderColor: '#64748b22', borderWidth: 1, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Eye size={16} color="#64748b" />
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#334155' }}>Not Visited: {stats.notVisited}</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Button
                onPress={() => setShowSubmitDialog(false)}
                style={{
                  flex: 1,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: '#ffffff',
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                }}
              >
                <Text style={{ color: '#0f172a', fontWeight: '600', fontSize: 14 }}>Continue Test</Text>
              </Button>
              <Button
                variant='secondary'
                onPress={handleSubmit}
                loading={isSubmitting}
                style={{
                  flex: 1,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: '#dc2626',
                  width: '100%'
                }}
              >
                <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 14 }}>{isSubmitting ? 'Submitting...' : 'Submit Test'}</Text>
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {isSubmitting && (
        <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 20, paddingVertical: 18 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <MotiView
                from={{ rotate: '0deg' }}
                animate={{ rotate: '360deg' }}
                transition={{ loop: true, type: 'timing', duration: 900 }}
              >
                <Send size={18} color={colors.primary} />
              </MotiView>
              <View>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground }}>Submitting your test</Text>
                <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 2 }}>Preparing report and analysis...</Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const STATE_COLORS: Record<QuestionState, { bg: string, border: string, text: string }> = {
  'not-visited': { bg: 'transparent', border: '#8888884D', text: '#888' },
  'not-answered': { bg: '#ef444433', border: '#ef444466', text: '#ef4444' },
  'answered': { bg: '#10b98133', border: '#10b98166', text: '#10b981' },
  'marked-review': { bg: '#8b5cf633', border: '#8b5cf666', text: '#8b5cf6' },
  'answered-marked': { bg: '#3b82f633', border: '#3b82f666', text: '#3b82f6' },
};

const QuestionPalette: React.FC<any> = ({ sections, meta, currentQ, totalQ, stats, sectionStats, onSelect, onClose, colors }) => {
  const [activeSection, setActiveSection] = useState(0);
  const safeSections = Array.isArray(sections) ? sections : [];
  const resolvedSection = safeSections[activeSection] || safeSections[0] || null;

  useEffect(() => {
    if (!safeSections.length) return;
    if (activeSection >= safeSections.length) {
      setActiveSection(0);
    }
  }, [activeSection, safeSections.length]);

  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground }}>Question Palette</Text>
      </View>

      <View style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><View style={{ width: 12, height: 12, borderRadius: 2, borderWidth: 1, borderColor: STATE_COLORS['not-visited'].border, backgroundColor: STATE_COLORS['not-visited'].bg }} /><Text style={{ fontSize: 10, color: colors.mutedForeground }}>Not Visited</Text></View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><View style={{ width: 12, height: 12, borderRadius: 2, borderWidth: 1, borderColor: STATE_COLORS['not-answered'].border, backgroundColor: STATE_COLORS['not-answered'].bg }} /><Text style={{ fontSize: 10, color: colors.mutedForeground }}>Not Answered</Text></View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><View style={{ width: 12, height: 12, borderRadius: 2, borderWidth: 1, borderColor: STATE_COLORS['answered'].border, backgroundColor: STATE_COLORS['answered'].bg }} /><Text style={{ fontSize: 10, color: colors.mutedForeground }}>Answered</Text></View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><View style={{ width: 12, height: 12, borderRadius: 2, borderWidth: 1, borderColor: STATE_COLORS['marked-review'].border, backgroundColor: STATE_COLORS['marked-review'].bg }} /><Text style={{ fontSize: 10, color: colors.mutedForeground }}>Marked for Review</Text></View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><View style={{ width: 12, height: 12, borderRadius: 2, borderWidth: 1, borderColor: STATE_COLORS['answered-marked'].border, backgroundColor: STATE_COLORS['answered-marked'].bg }} /><Text style={{ fontSize: 10, color: colors.mutedForeground }}>Answered & Marked</Text></View>
        </View>
      </View>

      <View style={{ paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <Text style={{ fontSize: 12, fontWeight: '600', color: '#059669' }}>✓ {stats.answered + stats.answeredMarked}</Text>
        <Text style={{ fontSize: 12, fontWeight: '600', color: '#dc2626' }}>✕ {stats.notAnswered}</Text>
        <Text style={{ fontSize: 12, fontWeight: '600', color: '#7c3aed' }}>⚑ {stats.markedReview + stats.answeredMarked}</Text>
        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.mutedForeground }}>○ {stats.notVisited}</Text>
      </View>

      <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ padding: 12, gap: 8 }}>
          {safeSections.map((sec: any, si: number) => {
            const ss = sectionStats(sec);
            const isActive = activeSection === si;
            return (
              <Pressable key={`${si}-${sec?.name || 'section'}`} onPress={() => setActiveSection(si)} style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, backgroundColor: isActive ? colors.primary : colors.muted }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: isActive ? '#fff' : colors.mutedForeground }}>{sec.emoji} {sec.name} <Text style={{ opacity: 0.7 }}>{ss.attempted}/{ss.total}</Text></Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {!resolvedSection ? null : Array.from({ length: Math.min(resolvedSection.endIndex, totalQ - 1) - resolvedSection.startIndex + 1 }, (_, i) => {
          const qIdx = resolvedSection.startIndex + i;
          const m = meta[qIdx];
          if (!m) return null;
          const isCurrent = qIdx === currentQ;
          const { bg, border, text } = STATE_COLORS[m.state] || STATE_COLORS['not-visited'];

          return (
            <Pressable key={qIdx} onPress={() => onSelect(qIdx)} style={{ width: 44, height: 44, borderRadius: 10, borderWidth: isCurrent ? 2 : 1.5, borderColor: isCurrent ? colors.primary : border, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: text }}>{qIdx + 1}</Text>
              {m.bookmarked && <Star size={10} color={colors.warning} fill={colors.warning} style={{ position: 'absolute', top: -4, right: -4 }} />}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

export default NTATestPlayer;
