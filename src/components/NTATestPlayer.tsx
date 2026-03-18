import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, Image, TextInput, Alert, Modal, Dimensions } from 'react-native';
import { MotiView } from 'moti';
import {
  ChevronLeft, ChevronRight, Clock, Menu, X, Flag, Star, StickyNote,
  AlertTriangle, Eraser, CheckCircle2, Send, Eye, BookOpen
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface NTAQuestion {
  _id?: string;
  id?: string;
  question: string;
  options: Record<string, string> | string[];
  correctAnswer?: string | number | null;
  explanation?: string;
  subject?: string;
  chapter?: string;
  topic?: string;
  difficulty?: string;
  imageUrl?: string;
}

export interface NTASection {
  name: string;
  emoji?: string;
  startIndex: number;
  endIndex: number;
}

export type QuestionState = 'not-visited' | 'not-answered' | 'answered' | 'marked-review' | 'answered-marked';

export interface QuestionMeta {
  state: QuestionState;
  selectedOption: number | null;
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
  onAnswerChange?: (questionIndex: number, answer: number | null, meta: QuestionMeta) => void;
  initialMeta?: QuestionMeta[];
  readOnly?: boolean;
}

export interface NTASubmitData {
  answers: (number | null)[];
  meta: QuestionMeta[];
  timeTaken: number;
}

const DEFAULT_SECTIONS: NTASection[] = [
  { name: 'Physics', emoji: '⚙️', startIndex: 0, endIndex: 44 },
  { name: 'Chemistry', emoji: '🧪', startIndex: 45, endIndex: 89 },
  { name: 'Botany', emoji: '🌿', startIndex: 90, endIndex: 134 },
  { name: 'Zoology', emoji: '🐾', startIndex: 135, endIndex: 179 },
];

function getOptionArray(q: NTAQuestion): string[] {
  if (!q || q.options === null || q.options === undefined) return ['', '', '', ''];

  if (Array.isArray(q.options)) {
    return q.options.map((opt: any) => {
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

  if (typeof q.options === 'object') {
    return ['A', 'B', 'C', 'D'].map((k) => {
      const value: any = (q.options as Record<string, any>)?.[k];
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
      selectedOption: null,
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
  const questionScrollRef = useRef<ScrollView>(null);

  const questionEntryTime = useRef(Date.now());

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
      next[currentQ] = { ...next[currentQ], timeSpent: next[currentQ].timeSpent + elapsed };
      return next;
    });
  }, [currentQ]);

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
    }, 1000);
    return () => clearInterval(interval);
  }, [readOnly]);

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

  const selectOption = (optIndex: number) => {
    if (readOnly) return;
    setMeta((prev) => {
      const next = [...prev];
      const cur = next[currentQ];
      if (!cur) return prev;
      const wasMarked = cur.state === 'marked-review' || cur.state === 'answered-marked';
      next[currentQ] = {
        ...cur,
        selectedOption: optIndex,
        state: wasMarked ? 'answered-marked' : 'answered',
      };
      return next;
    });
    onAnswerChange?.(currentQ, optIndex, meta[currentQ]);
  };

  const clearAnswer = () => {
    if (readOnly) return;
    setMeta((prev) => {
      const next = [...prev];
      const cur = next[currentQ];
      if (!cur) return prev;
      const wasMarked = cur.state === 'marked-review' || cur.state === 'answered-marked';
      next[currentQ] = {
        ...cur,
        selectedOption: null,
        state: wasMarked ? 'marked-review' : 'not-answered',
      };
      return next;
    });
    onAnswerChange?.(currentQ, null, meta[currentQ]);
  };

  const toggleMarkReview = () => {
    if (readOnly) return;
    setMeta((prev) => {
      const next = [...prev];
      const cur = next[currentQ];
      if (!cur) return prev;
      const hasAnswer = cur.selectedOption !== null;
      const isMarked = cur.state === 'marked-review' || cur.state === 'answered-marked';
      if (isMarked) {
        next[currentQ] = { ...cur, state: hasAnswer ? 'answered' : 'not-answered' };
      } else {
        next[currentQ] = { ...cur, state: hasAnswer ? 'answered-marked' : 'marked-review' };
      }
      return next;
    });
  };

  const toggleBookmark = () => {
    setMeta((prev) => {
      const next = [...prev];
      if (!next[currentQ]) return prev;
      next[currentQ] = { ...next[currentQ], bookmarked: !next[currentQ].bookmarked };
      return next;
    });
  };

  const updateNote = (text: string) => {
    setMeta((prev) => {
      const next = [...prev];
      if (!next[currentQ]) return prev;
      next[currentQ] = { ...next[currentQ], note: text };
      return next;
    });
  };

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
    if (!readOnly) {
      setMeta((prev) => {
        const next = [...prev];
        const cur = next[currentQ];
        if (!cur) return prev;
        const hasAnswer = cur.selectedOption !== null;
        next[currentQ] = { ...cur, state: hasAnswer ? 'answered-marked' : 'marked-review' };
        return next;
      });
    }
    recordTimeSpent();
    if (currentQ < totalQ - 1) setCurrentQ(currentQ + 1);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    recordTimeSpent();
    const answers = meta.map((m) => m.selectedOption);
    await onSubmit({ answers, meta, timeTaken: duration - timeLeft });
  };

  const q = questions[currentQ];
  const opts = getOptionArray(q);
  const curMeta = meta[currentQ] || {
    state: 'not-visited' as QuestionState,
    selectedOption: null,
    bookmarked: false,
    note: '',
    timeSpent: 0,
  };
  const isMarked = curMeta.state === 'marked-review' || curMeta.state === 'answered-marked';
  const optionLabels = ['A', 'B', 'C', 'D'];

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
              {q?.question || ''}
            </Text>

            {/* Question Image */}
            {q?.imageUrl && (
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
                  source={{ uri: q?.imageUrl }}
                  style={{ width: '100%', height: 240, resizeMode: 'contain' }}
                />
              </View>
            )}

            {/* Options */}
            <View style={{ gap: 10 }}>
              {opts.map((opt, i) => {
                const isSelected = curMeta.selectedOption === i;

                let bg = colors.card;
                let borderColor = colors.border;
                let textColor = colors.foreground;

                let badgeBg = 'transparent';
                let badgeBorder = colors.mutedForeground + '4D';
                let badgeText = colors.mutedForeground;

                if (readOnly) {
                  const correctIdx =
                    typeof q?.correctAnswer === 'string'
                      ? q.correctAnswer.charCodeAt(0) - 65
                      : typeof q?.correctAnswer === 'number'
                        ? q.correctAnswer
                        : null;

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
                    onPress={() => selectOption(i)}
                    disabled={readOnly}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                      padding: 14,
                      borderRadius: 12,
                      borderWidth: 2,
                      borderColor,
                      backgroundColor: bg,
                      // opacity: pressed && !readOnly ? 0.95 : 1,
                    }}
                  >
                    <View
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        borderWidth: 2,
                        borderColor: badgeBorder,
                        backgroundColor: badgeBg,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 12,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '700',
                          color: badgeText,
                        }}
                      >
                        {optionLabels[i]}
                      </Text>
                    </View>

                    <Text
                      style={{
                        flex: 1,
                        fontSize: 14,
                        lineHeight: 22,
                        color: textColor,
                        marginTop: 2,
                      }}
                    >
                      {opt}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Explanation */}
            {readOnly && q?.explanation && (
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
                  {q?.explanation}
                </Text>
              </View>
            )}
        </MotiView>
      </ScrollView>

      {/* ═══ BOTTOM CONTROLS ═══ */}
      <View style={{
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: Math.max(insets.bottom, 12),
        backgroundColor: colors.card,
        borderTopWidth: 1,
        borderTopColor: colors.border + '33'
      }}>
        {/* Row 1: Action buttons */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10, alignItems: 'center' }}>
          <Button
            variant="ghost"
            style={{ flex: 1, height: 40, borderRadius: 20, backgroundColor: colors.muted + '1A' }}
            onPress={clearAnswer}
            disabled={readOnly || curMeta.selectedOption === null}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Eraser size={14} color={readOnly || curMeta.selectedOption === null ? colors.mutedForeground : colors.mutedForeground} />
              <Text style={{ fontSize: 13, fontWeight: '600', color: readOnly || curMeta.selectedOption === null ? colors.mutedForeground : colors.mutedForeground }}>Clear</Text>
            </View>
          </Button>

          <Button
            variant="ghost"
            style={{
              flex: 1.5,
              height: 40,
              borderRadius: 20,
              backgroundColor: isMarked ? '#7c3aed' : colors.muted + '1A'
            }}
            onPress={toggleMarkReview}
            disabled={readOnly}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Flag size={14} color={isMarked ? '#ffffff' : colors.mutedForeground} fill={isMarked ? '#7e4e4eff' : 'none'} />
              <Text style={{ fontSize: 13, fontWeight: '600', color: isMarked ? '#7e4e4eff' : colors.mutedForeground }}>
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
            style={{ width: 35, height: 35, borderRadius: 12, backgroundColor: colors.muted + '1A' }}
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
                  height: 30,
                  borderRadius: 22,
                  backgroundColor: '#3b82f6' // Vibrant Blue
                }}
                onPress={saveAndNext}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, width: '44%', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#fff' }}>Save & Next</Text>
                  <ChevronRight size={16} color="#fff" />
                </View>
              </Button>
              <Button
                variant="secondary"
                style={{
                  flex: 1,
                  height: 30,
                  borderRadius: 22,
                  backgroundColor: '#8b5cf6' // Vibrant Violet
                }}
                onPress={markAndNext}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, width: '45%', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#fff' }}>Mark & Next</Text>
                  <ChevronRight size={16} color="#fff" />
                </View>
              </Button>
            </View>
          ) : (
            <Button
              variant="primary"
              style={{ flex: 1, height: 44, borderRadius: 22, backgroundColor: '#3b82f6' }}
              onPress={() => goTo(currentQ + 1)}
              disabled={currentQ >= totalQ - 1}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, width: '45%', justifyContent: 'center' }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>Next Question</Text>
                <ChevronRight size={18} color="#fff" />
              </View>
            </Button>
          )}
        </View>
      </View>

      {/* Palette Modal */}
      <Modal visible={paletteOpen} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <Pressable style={{ flex: 1 }} onPress={() => setPaletteOpen(false)} />
          <View style={{ backgroundColor: colors.card, height: '85%', borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
            <QuestionPalette
              sections={sections} meta={meta} currentQ={currentQ} totalQ={totalQ}
              stats={stats} sectionStats={sectionStats}
              onSelect={goTo} onClose={() => setPaletteOpen(false)} colors={colors}
            />
          </View>
        </View>
      </Modal>

      {/* Submit Warning Modal */}
      <Modal visible={showSubmitDialog} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: colors.card, width: '100%', borderRadius: 24, padding: 24 }}>
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <AlertTriangle size={24} color="#f59e0b" />
                <Text style={{ fontSize: 20, fontWeight: '700', color: colors.foreground }}>Submit Test?</Text>
              </View>
              <Text style={{ fontSize: 15, color: colors.mutedForeground, textAlign: 'center', lineHeight: 22 }}>
                Are you sure you want to submit? You cannot change answers after submission.
              </Text>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 32 }}>
              <View style={{ width: '48%', backgroundColor: '#ecfdf5', borderColor: '#10b98122', borderWidth: 1, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={16} color="#10b981" />
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#065f46' }}>Answered: {stats.answered + stats.answeredMarked}</Text>
              </View>
              <View style={{ width: '48%', backgroundColor: '#fef2f2', borderColor: '#ef444422', borderWidth: 1, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <X size={16} color="#ef4444" />
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#991b1b' }}>Unanswered: {stats.notAnswered}</Text>
              </View>
              <View style={{ width: '48%', backgroundColor: '#f5f3ff', borderColor: '#8b5cf622', borderWidth: 1, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Flag size={16} color="#8b5cf6" />
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#5b21b6' }}>Review: {stats.markedReview + stats.answeredMarked}</Text>
              </View>
              <View style={{ width: '48%', backgroundColor: '#f8fafc', borderColor: '#64748b22', borderWidth: 1, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Eye size={16} color="#64748b" />
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#334155' }}>Not Visited: {stats.notVisited}</Text>
              </View>
            </View>

            <View style={{ gap: 12 }}>
              <Button
                variant='secondary'
                onPress={handleSubmit}
                loading={isSubmitting}
                style={{
                  height: 52,
                  borderRadius: 14,
                  backgroundColor: '#dc2626',
                  width: '100%'
                }}
              >
                <Text style={{ color: '#ffffffff', fontWeight: '700', fontSize: 16 }}>Submit Test</Text>
              </Button>
              <Button
                onPress={() => setShowSubmitDialog(false)}
                style={{
                  height: 52,
                  borderRadius: 14,
                  backgroundColor: '#f8fafc',
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                  width: '100%'
                }}
              >
                <Text style={{ color: '#ffffffff', fontWeight: '600', fontSize: 16 }}>Continue Test</Text>
              </Button>
            </View>
          </View>
        </View>
      </Modal>
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
      <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground }}>Question Palette</Text>
        <Pressable onPress={onClose}><X size={20} color={colors.mutedForeground} /></Pressable>
      </View>

      <View style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><View style={{ width: 12, height: 12, borderRadius: 2, borderWidth: 1, borderColor: STATE_COLORS['answered'].border, backgroundColor: STATE_COLORS['answered'].bg }} /><Text style={{ fontSize: 10, color: colors.mutedForeground }}>Ans: {stats.answered + stats.answeredMarked}</Text></View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><View style={{ width: 12, height: 12, borderRadius: 2, borderWidth: 1, borderColor: STATE_COLORS['not-answered'].border, backgroundColor: STATE_COLORS['not-answered'].bg }} /><Text style={{ fontSize: 10, color: colors.mutedForeground }}>Unans: {stats.notAnswered}</Text></View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><View style={{ width: 12, height: 12, borderRadius: 2, borderWidth: 1, borderColor: STATE_COLORS['marked-review'].border, backgroundColor: STATE_COLORS['marked-review'].bg }} /><Text style={{ fontSize: 10, color: colors.mutedForeground }}>Rev: {stats.markedReview + stats.answeredMarked}</Text></View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><View style={{ width: 12, height: 12, borderRadius: 2, borderWidth: 1, borderColor: STATE_COLORS['not-visited'].border, backgroundColor: STATE_COLORS['not-visited'].bg }} /><Text style={{ fontSize: 10, color: colors.mutedForeground }}>Not Vis: {stats.notVisited}</Text></View>
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
