import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, Image, TextInput, Alert, Modal, Dimensions } from 'react-native';
import { MotiView, AnimatePresence } from 'moti';
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
  if (Array.isArray(q.options)) return q.options;
  return ['A', 'B', 'C', 'D'].map((k) => (q.options as Record<string, string>)[k] ?? '');
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

  const questionEntryTime = useRef(Date.now());

  useEffect(() => {
    questionEntryTime.current = Date.now();
    setMeta((prev) => {
      const next = [...prev];
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
      next[currentQ] = { ...next[currentQ], bookmarked: !next[currentQ].bookmarked };
      return next;
    });
  };

  const updateNote = (text: string) => {
    setMeta((prev) => {
      const next = [...prev];
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
  const curMeta = meta[currentQ];
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
              <Button variant="destructive" size="sm" onPress={() => setShowSubmitDialog(true)} style={{ height: 32, paddingHorizontal: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Send size={14} color="#fff" />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>Submit</Text>
                </View>
              </Button>
            )}
          </View>
        </View>
      </View>

      {/* ═══ QUESTION AREA ═══ */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <AnimatePresence >
          <MotiView
            key={currentQ}
            from={{ opacity: 0, translateX: 20 }}
            animate={{ opacity: 1, translateX: 0 }}
            exit={{ opacity: 0, translateX: -20 }}
            transition={{ type: 'timing', duration: 150 }}
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
            <AnimatePresence>
              {noteOpen && (
                <MotiView
                  from={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ type: 'timing', duration: 200 }}
                  style={{ overflow: 'hidden', marginBottom: 12 }}
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
            </AnimatePresence>

            {/* Question */}
            <Text
              style={{
                fontSize: 14,
                lineHeight: 22,
                color: colors.foreground,
                marginBottom: 16,
              }}
            >
              {q.question}
            </Text>

            {/* Question Image */}
            {q.imageUrl && (
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
                  source={{ uri: q.imageUrl }}
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
                    typeof q.correctAnswer === 'string'
                      ? q.correctAnswer.charCodeAt(0) - 65
                      : typeof q.correctAnswer === 'number'
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
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                      padding: 14,
                      borderRadius: 12,
                      borderWidth: 2,
                      borderColor,
                      backgroundColor: bg,
                      opacity: pressed && !readOnly ? 0.95 : 1,
                    })}
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
            {readOnly && q.explanation && (
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
                  {q.explanation}
                </Text>
              </View>
            )}
          </MotiView>
        </AnimatePresence>
      </ScrollView>

      {/* ═══ BOTTOM CONTROLS ═══ */}
      <View style={{ padding: 8, paddingBottom: Math.max(insets.bottom, 8), backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border }}>
        <View style={{ flexDirection: 'row', gap: 4, marginBottom: 8 }}>
          <Button variant="outline" size="sm" style={{ flex: 1, height: 32 }} onPress={clearAnswer} disabled={readOnly || curMeta.selectedOption === null}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Eraser size={14} color={readOnly || curMeta.selectedOption === null ? colors.mutedForeground : colors.foreground} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: readOnly || curMeta.selectedOption === null ? colors.mutedForeground : colors.foreground }}>Clear</Text>
            </View>
          </Button>
          <Button variant={isMarked ? 'primary' : 'outline'} size="sm" style={{ flex: 1, height: 32, backgroundColor: isMarked ? colors.secondary : 'transparent' }} onPress={toggleMarkReview} disabled={readOnly}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Flag size={14} color={isMarked ? '#fff' : colors.foreground} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: isMarked ? '#fff' : colors.foreground }}>{isMarked ? 'Unmark' : 'Review'}</Text>
            </View>
          </Button>
          <Button variant={curMeta.bookmarked ? 'primary' : 'outline'} size="sm" style={{ flex: 1, height: 32, backgroundColor: curMeta.bookmarked ? colors.warning : 'transparent' }} onPress={toggleBookmark}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Star size={14} color={curMeta.bookmarked ? '#fff' : colors.foreground} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: curMeta.bookmarked ? '#fff' : colors.foreground }}>Bookmark</Text>
            </View>
          </Button>
        </View>

        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Button variant="outline" size="sm" style={{ width: 40, height: 40 }} onPress={() => goTo(currentQ - 1)} disabled={currentQ === 0}>
            <ChevronLeft size={16} color={currentQ === 0 ? colors.mutedForeground : colors.foreground} />
          </Button>
          {!readOnly ? (
            <>
              <Button variant="secondary" size="sm" style={{ flex: 1, height: 40 }} onPress={saveAndNext}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.foreground }}>Save & Next</Text>
                  <ChevronRight size={16} color={colors.foreground} />
                </View>
              </Button>
              <Button size="sm" style={{ flex: 1, height: 40, backgroundColor: colors.secondary }} onPress={markAndNext}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>Mark & Next</Text>
                  <ChevronRight size={16} color="#fff" />
                </View>
              </Button>
            </>
          ) : (
            <Button variant="secondary" size="sm" style={{ flex: 1, height: 40 }} onPress={() => goTo(currentQ + 1)} disabled={currentQ >= totalQ - 1}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.foreground }}>Next</Text>
                <ChevronRight size={16} color={colors.foreground} />
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <AlertTriangle size={24} color={colors.warning} />
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground }}>Submit Test?</Text>
            </View>
            <Text style={{ fontSize: 14, color: colors.mutedForeground, marginBottom: 20 }}>Are you sure you want to submit? You cannot change answers after submission.</Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
              <View style={{ width: '48%', backgroundColor: colors.success + '1A', padding: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={16} color={colors.success} />
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.success }}>Ans: {stats.answered + stats.answeredMarked}</Text>
              </View>
              <View style={{ width: '48%', backgroundColor: colors.destructive + '1A', padding: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <X size={16} color={colors.destructive} />
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.destructive }}>Unans: {stats.notAnswered}</Text>
              </View>
              <View style={{ width: '48%', backgroundColor: colors.secondary + '1A', padding: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Flag size={16} color={colors.secondary} />
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.secondary }}>Rev: {stats.markedReview + stats.answeredMarked}</Text>
              </View>
              <View style={{ width: '48%', backgroundColor: colors.muted, padding: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Eye size={16} color={colors.mutedForeground} />
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.mutedForeground }}>Not Vis: {stats.notVisited}</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Button variant="outline" style={{ flex: 1 }} onPress={() => setShowSubmitDialog(false)}>
                <Text style={{ color: colors.foreground }}>Continue</Text>
              </Button>
              <Button variant="destructive" style={{ flex: 1 }} onPress={handleSubmit} loading={isSubmitting}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Submit Test</Text>
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
          {sections.map((sec: any, si: number) => {
            const ss = sectionStats(sec);
            const isActive = activeSection === si;
            return (
              <Pressable key={si} onPress={() => setActiveSection(si)} style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, backgroundColor: isActive ? colors.primary : colors.muted }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: isActive ? '#fff' : colors.mutedForeground }}>{sec.emoji} {sec.name} <Text style={{ opacity: 0.7 }}>{ss.attempted}/{ss.total}</Text></Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {Array.from({ length: Math.min(sections[activeSection].endIndex, totalQ - 1) - sections[activeSection].startIndex + 1 }, (_, i) => {
          const qIdx = sections[activeSection].startIndex + i;
          const m = meta[qIdx];
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
