import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft, Trophy, Target, Clock, RotateCcw, Home,
  CheckCircle, XCircle, AlertCircle, BarChart3, Timer,
  Zap, BookOpen, Flag, Eye, TrendingUp
} from 'lucide-react-native';
import { MotiView } from 'moti';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/Button';
import { Progress } from '@/components/ui/Progress';
import { Skeleton } from '@/components/ui/Skeleton';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return `${m}m ${s}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

function getOptionsArray(options: any): string[] {
  if (Array.isArray(options)) return options.map((o: any) => String(o ?? ''));
  if (options && typeof options === 'object') {
    return OPTION_LABELS.map((k) => String(options[k] ?? ''));
  }
  return [];
}

function getAnswerIndex(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const v = value.trim().toUpperCase();
    if (/^[A-D]$/.test(v)) return v.charCodeAt(0) - 65;
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

// ─── Card wrapper ─────────────────────────────────────────────────────────────

function Card({ children, style }: { children: React.ReactNode; style?: any }) {
  const { colors } = useTheme();
  return (
    <View style={[{
      backgroundColor: colors.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      marginBottom: 12,
    }, style]}>
      {children}
    </View>
  );
}

function SectionTitle({ icon: Icon, label, color }: { icon: any; label: string; color?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <Icon size={16} color={color || colors.primary} />
      <Text style={{ fontSize: 14, fontWeight: '700', color: color || colors.foreground }}>{label}</Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function QuizResultsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{
    score?: string;
    total?: string;
    timeTaken?: string;
    correct?: string;
    incorrect?: string;
    skipped?: string;
    totalMarks?: string;
    marksObtained?: string;
    title?: string;
    // JSON-encoded extras
    subjectWise?: string;
    chapterWise?: string;
    weakAreas?: string;
    reviewQuestions?: string;
    ntaMeta?: string;
  }>();

  const [openExplanations, setOpenExplanations] = useState<Record<string, boolean>>({});
  const toggleExplanation = (key: string) =>
    setOpenExplanations((prev) => ({ ...prev, [key]: !prev[key] }));

  // ── Parse params ────────────────────────────────────────────────────────────
  const score    = Number(params.score    || params.correct || 0);
  const total    = Number(params.total    || 0);
  const timeTaken= Number(params.timeTaken|| 0);
  const incorrect= Number(params.incorrect|| 0);
  const skipped  = Number(params.skipped  || Math.max(total - score - incorrect, 0));
  const marksObtained = Number(params.marksObtained ?? score * 4 - incorrect);
  const totalMarks    = Number(params.totalMarks    ?? total * 4);
  const percentage    = total > 0 ? (score / total) * 100 : 0;
  const title = params.title || 'Test Report';

  const subjectWise:    any[] = useMemo(() => { try { return JSON.parse(params.subjectWise    || '[]'); } catch { return []; } }, [params.subjectWise]);
  const chapterWise:    any[] = useMemo(() => { try { return JSON.parse(params.chapterWise    || '[]'); } catch { return []; } }, [params.chapterWise]);
  const weakAreas:      any[] = useMemo(() => { try { return JSON.parse(params.weakAreas      || '[]'); } catch { return []; } }, [params.weakAreas]);
  const reviewQuestions:any[] = useMemo(() => { try { return JSON.parse(params.reviewQuestions|| '[]'); } catch { return []; } }, [params.reviewQuestions]);
  const ntaMeta:        any[] = useMemo(() => { try { return JSON.parse(params.ntaMeta        || '[]'); } catch { return []; } }, [params.ntaMeta]);

  // ── Time analytics ──────────────────────────────────────────────────────────
  const timeAnalytics = useMemo(() => {
    if (!ntaMeta.length) return null;
    const times = ntaMeta.map((m: any) => Number(m.timeSpent || 0));
    const tot   = times.reduce((a, b) => a + b, 0);
    const avg   = tot / times.length;
    return {
      total: tot,
      avg,
      fast:  times.filter((t) => t < 30).length,
      medium:times.filter((t) => t >= 30 && t <= 90).length,
      slow:  times.filter((t) => t > 90).length,
      bookmarked:   ntaMeta.filter((m: any) => m.bookmarked).length,
      markedReview: ntaMeta.filter((m: any) => m.state === 'marked-review' || m.state === 'answered-marked').length,
    };
  }, [ntaMeta]);

  // ── Score colour ────────────────────────────────────────────────────────────
  const scoreColor =
    percentage >= 80 ? colors.success :
    percentage >= 50 ? colors.warning :
    colors.destructive;

  const scoreLabel =
    percentage >= 90 ? 'Excellent! 🎉' :
    percentage >= 80 ? 'Great job! 👏' :
    percentage >= 60 ? 'Good effort! 💪' :
    percentage >= 40 ? 'Keep practicing! 📚' :
    'Needs improvement 📖';

  // ── Anim helper ─────────────────────────────────────────────────────────────
  const anim = (delay: number) => ({
    from: { opacity: 0, translateY: 16 },
    animate: { opacity: 1, translateY: 0 },
    transition: { type: 'timing' as const, duration: 300, delay: delay * 1000 },
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={{
        paddingTop: insets.top,
        paddingHorizontal: 16,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 }}>
          <Pressable onPress={() => router.back()} style={{
            width: 36, height: 36, borderRadius: 10,
            borderWidth: 1, borderColor: colors.border,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <ArrowLeft size={18} color={colors.foreground} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground }} numberOfLines={1}>
              Test Report
            </Text>
            <Text style={{ fontSize: 12, color: colors.mutedForeground }} numberOfLines={1}>{title}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Score Card ──────────────────────────────────────────────────── */}
        <MotiView {...anim(0)} style={{ marginBottom: 12 }}>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <View style={{ backgroundColor: colors.primary + '0D', padding: 20 }}>
              <View style={{ alignItems: 'center', marginBottom: 16 }}>
                <Text style={{
                  fontSize: 56, fontWeight: '900',
                  color: scoreColor, lineHeight: 64
                }}>
                  {percentage.toFixed(1)}%
                </Text>
                <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 2 }}>
                  {marksObtained} / {totalMarks} marks
                </Text>
                <Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground, marginTop: 6 }}>
                  {scoreLabel}
                </Text>
              </View>
              <Progress value={percentage} />
            </View>
          </Card>
        </MotiView>

        {/* ── Stats Row ───────────────────────────────────────────────────── */}
        <MotiView {...anim(0.1)} style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[
              { icon: CheckCircle,  label: 'Correct',  value: score,     color: colors.success     },
              { icon: XCircle,      label: 'Wrong',    value: incorrect, color: colors.destructive  },
              { icon: AlertCircle,  label: 'Skipped',  value: skipped,   color: colors.warning      },
              { icon: Clock,        label: 'Avg Time',
                value: total > 0 ? `${Math.round(timeTaken / total)}s` : '—',
                color: colors.primary },
            ].map((stat, i) => (
              <View key={i} style={{
                flex: 1,
                backgroundColor: colors.card,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: colors.border,
                padding: 12,
                alignItems: 'center',
              }}>
                <stat.icon size={18} color={stat.color} />
                <Text style={{ fontSize: 18, fontWeight: '800', color: colors.foreground, marginTop: 6 }}>
                  {stat.value}
                </Text>
                <Text style={{ fontSize: 10, color: colors.mutedForeground, marginTop: 2 }}>
                  {stat.label}
                </Text>
              </View>
            ))}
          </View>
        </MotiView>

        {/* ── Time Analytics ──────────────────────────────────────────────── */}
        {timeAnalytics && (
          <MotiView {...anim(0.15)}>
            <Card>
              <SectionTitle icon={Timer} label="Time Analysis" />
              <View style={{ gap: 8, marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: colors.mutedForeground }}>Total Time</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.foreground }}>
                    {formatDuration(timeTaken || timeAnalytics.total)}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: colors.mutedForeground }}>Avg per Question</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.foreground }}>
                    {Math.round(timeAnalytics.avg)}s
                  </Text>
                </View>
              </View>

              {/* Speed Distribution */}
              <Text style={{ fontSize: 10, fontWeight: '700', color: colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                Speed Distribution
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                {[
                  { icon: Zap,         color: colors.success,     bg: colors.success + '1A',     count: timeAnalytics.fast,   label: '<30s' },
                  { icon: Clock,       color: colors.warning,     bg: colors.warning + '1A',     count: timeAnalytics.medium, label: '30–90s' },
                  { icon: AlertCircle, color: colors.destructive, bg: colors.destructive + '1A', count: timeAnalytics.slow,   label: '>90s' },
                ].map((b, i) => (
                  <View key={i} style={{
                    flex: 1, backgroundColor: b.bg, borderRadius: 12,
                    padding: 10, alignItems: 'center', gap: 4
                  }}>
                    <b.icon size={14} color={b.color} />
                    <Text style={{ fontSize: 14, fontWeight: '800', color: colors.foreground }}>{b.count}</Text>
                    <Text style={{ fontSize: 10, color: colors.mutedForeground }}>{b.label}</Text>
                  </View>
                ))}
              </View>

              {(timeAnalytics.bookmarked > 0 || timeAnalytics.markedReview > 0) && (
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                  {timeAnalytics.bookmarked > 0 && (
                    <View style={{ paddingHorizontal: 10, paddingVertical: 4, backgroundColor: colors.warning + '1A', borderRadius: 999 }}>
                      <Text style={{ fontSize: 11, color: colors.warning }}>⭐ {timeAnalytics.bookmarked} bookmarked</Text>
                    </View>
                  )}
                  {timeAnalytics.markedReview > 0 && (
                    <View style={{ paddingHorizontal: 10, paddingVertical: 4, backgroundColor: colors.secondary + '1A', borderRadius: 999 }}>
                      <Text style={{ fontSize: 11, color: colors.secondary }}>🔖 {timeAnalytics.markedReview} marked for review</Text>
                    </View>
                  )}
                </View>
              )}
            </Card>
          </MotiView>
        )}

        {/* ── Subject-wise ────────────────────────────────────────────────── */}
        {subjectWise.length > 0 && (
          <MotiView {...anim(0.2)}>
            <Card>
              <SectionTitle icon={BarChart3} label="Subject-wise Performance" />
              <View style={{ gap: 12 }}>
                {subjectWise.map((subj: any, i: number) => (
                  <View key={i}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: colors.foreground }}>{subj.subject}</Text>
                      <Text style={{ fontSize: 11, color: colors.mutedForeground }}>
                        {subj.correct}/{subj.total} • {Number(subj.accuracy).toFixed(0)}%
                      </Text>
                    </View>
                    <Progress value={Number(subj.accuracy)} />
                  </View>
                ))}
              </View>
            </Card>
          </MotiView>
        )}

        {/* ── Weak Areas ──────────────────────────────────────────────────── */}
        {weakAreas.length > 0 && (
          <MotiView {...anim(0.25)}>
            <Card style={{ borderColor: colors.destructive + '33' }}>
              <SectionTitle icon={Target} label="Weak Areas" color={colors.destructive} />
              <View style={{ gap: 8 }}>
                {weakAreas.map((area: any, i: number) => (
                  <View key={i} style={{
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                    backgroundColor: colors.destructive + '0D', borderRadius: 14, padding: 12
                  }}>
                    <View style={{ flex: 1, marginRight: 10 }}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: colors.foreground }} numberOfLines={1}>
                        {area.chapter}
                      </Text>
                      <Text style={{ fontSize: 11, color: colors.mutedForeground }}>
                        {area.subject} • {area.questionsWrong} wrong • {Number(area.accuracy).toFixed(0)}%
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => router.push('/(auth)/curriculum/browser' as any)}
                      style={{
                        paddingHorizontal: 10, paddingVertical: 5,
                        borderRadius: 8, borderWidth: 1, borderColor: colors.border,
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '600', color: colors.foreground }}>Fix →</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            </Card>
          </MotiView>
        )}

        {/* ── Chapter-wise ────────────────────────────────────────────────── */}
        {chapterWise.length > 0 && (
          <MotiView {...anim(0.3)}>
            <Card>
              <SectionTitle icon={BookOpen} label="Chapter-wise Breakdown" />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {chapterWise.map((ch: any, i: number) => {
                  const acc = Number(ch.accuracy);
                  const accColor = acc >= 80 ? colors.success : acc >= 50 ? colors.warning : colors.destructive;
                  return (
                    <View key={i} style={{
                      width: '47%',
                      backgroundColor: colors.muted,
                      borderRadius: 14, padding: 12
                    }}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: colors.foreground }} numberOfLines={1}>{ch.chapter}</Text>
                      <Text style={{ fontSize: 10, color: colors.mutedForeground, marginBottom: 4 }}>{ch.subject}</Text>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 10, color: colors.mutedForeground }}>{ch.correct}/{ch.total}</Text>
                        <Text style={{ fontSize: 12, fontWeight: '800', color: accColor }}>{acc.toFixed(0)}%</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </Card>
          </MotiView>
        )}

        {/* ── Answer Review ───────────────────────────────────────────────── */}
        {reviewQuestions.length > 0 && (
          <MotiView {...anim(0.33)}>
            <Card>
              <SectionTitle icon={Flag} label="Answer Review" />
              <View style={{ gap: 12 }}>
                {reviewQuestions.map((q: any, idx: number) => {
                  const reviewKey = String(q._id || q.id || idx);
                  const options    = getOptionsArray(q.options);
                  const selectedIdx= getAnswerIndex(q.userAnswer);
                  const correctIdx = getAnswerIndex(q.correctAnswer);
                  const isCorrect  = selectedIdx !== null && correctIdx !== null && selectedIdx === correctIdx;
                  const hasExp     = Boolean(String(q.explanation || '').trim());
                  const expOpen    = Boolean(openExplanations[reviewKey]);

                  return (
                    <View key={reviewKey} style={{
                      borderRadius: 16, borderWidth: 1, borderColor: colors.border,
                      padding: 12, backgroundColor: colors.muted + '40'
                    }}>
                      {/* Question header */}
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.foreground, flex: 1, lineHeight: 18 }}>
                          Q{idx + 1}. {q.question}
                        </Text>
                        <View style={{
                          paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
                          backgroundColor: isCorrect ? colors.success + '1A' : colors.destructive + '1A',
                        }}>
                          <Text style={{ fontSize: 10, fontWeight: '700', color: isCorrect ? colors.success : colors.destructive }}>
                            {isCorrect ? 'Correct' : (selectedIdx === null ? 'Skipped' : 'Wrong')}
                          </Text>
                        </View>
                      </View>

                      {/* Options */}
                      <View style={{ gap: 6, marginBottom: 10 }}>
                        {options.map((opt, optIdx) => {
                          const isSelected = selectedIdx === optIdx;
                          const isRight    = correctIdx === optIdx;
                          const bg         = isRight ? colors.success + '1A' : (isSelected && !isRight ? colors.destructive + '1A' : colors.card);
                          const border     = isRight ? colors.success + '66' : (isSelected && !isRight ? colors.destructive + '66' : colors.border);
                          return (
                            <View key={optIdx} style={{
                              borderRadius: 10, borderWidth: 1.5, borderColor: border,
                              backgroundColor: bg, paddingHorizontal: 10, paddingVertical: 8,
                              flexDirection: 'row',
                            }}>
                              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.foreground, marginRight: 4 }}>
                                {OPTION_LABELS[optIdx]}.
                              </Text>
                              <Text style={{ fontSize: 12, color: colors.foreground, flex: 1 }}>{opt}</Text>
                            </View>
                          );
                        })}
                      </View>

                      {/* Your ans / Correct ans + Explanation toggle */}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ gap: 2 }}>
                          <Text style={{ fontSize: 11, color: colors.mutedForeground }}>
                            Your Answer:{' '}
                            <Text style={{ fontWeight: '700', color: selectedIdx === null ? colors.mutedForeground : isCorrect ? colors.success : colors.destructive }}>
                              {selectedIdx === null ? 'Not Attempted' : OPTION_LABELS[selectedIdx] || '?'}
                            </Text>
                          </Text>
                          <Text style={{ fontSize: 11, color: colors.mutedForeground }}>
                            Correct:{' '}
                            <Text style={{ fontWeight: '700', color: colors.success }}>
                              {correctIdx === null ? 'N/A' : OPTION_LABELS[correctIdx] || 'N/A'}
                            </Text>
                          </Text>
                        </View>
                        {hasExp && (
                          <Pressable
                            onPress={() => toggleExplanation(reviewKey)}
                            style={{
                              paddingHorizontal: 10, paddingVertical: 5,
                              borderRadius: 8, borderWidth: 1, borderColor: colors.border,
                            }}
                          >
                            <Text style={{ fontSize: 11, fontWeight: '600', color: colors.primary }}>
                              {expOpen ? 'Hide' : 'Explain'}
                            </Text>
                          </Pressable>
                        )}
                      </View>

                      {hasExp && expOpen && (
                        <View style={{
                          marginTop: 10, borderRadius: 10,
                          borderWidth: 1, borderColor: colors.primary + '33',
                          backgroundColor: colors.primary + '0D', padding: 10
                        }}>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary, marginBottom: 4 }}>
                            Explanation
                          </Text>
                          <Text style={{ fontSize: 12, color: colors.foreground, lineHeight: 18 }}>
                            {String(q.explanation)}
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            </Card>
          </MotiView>
        )}

        {/* ── Actions ─────────────────────────────────────────────────────── */}
        <MotiView {...anim(0.35)}>
          <View style={{ gap: 10 }}>
            {params.quizId && (
              <Button 
                style={{ backgroundColor: colors.warning, height: 56, borderRadius: 16 }} 
                onPress={() => router.replace({ pathname: '/(auth)/ai-quiz-session', params: { quizId: params.quizId } } as any)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <RotateCcw size={20} color="#fff" />
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Retake Quiz</Text>
                </View>
              </Button>
            )}

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button variant="outline" style={{ flex: 1 }} onPress={() => router.back()}>
                <Text style={{ color: colors.foreground, fontWeight: '600' }}>Back</Text>
              </Button>
              <Button style={{ flex: 1 }} onPress={() => router.replace('/(auth)/(tabs)' as any)}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Home size={16} color="#fff" />
                  <Text style={{ color: '#fff', fontWeight: '600' }}>Home</Text>
                </View>
              </Button>
            </View>
          </View>
        </MotiView>

      </ScrollView>
    </View>
  );
}
