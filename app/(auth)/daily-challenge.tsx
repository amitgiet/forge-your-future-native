import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { ArrowLeft, Zap, Clock, Trophy, Target, BookOpen, Play, CheckCircle, XCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import apiService from '@/lib/apiService';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { QuizOption } from '@/components/ui/QuizOption';
import { Progress } from '@/components/ui/Progress';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { gradients, gradientProps } from '@/theme/gradients';
import { radii } from '@/theme/spacing';

const OPTION_LABELS = ['A', 'B', 'C', 'D'];
type Phase = 'intro' | 'reading' | 'quiz' | 'results' | 'already-completed';

export default function DailyChallengeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [challenge, setChallenge] = useState<any>(null);
  const [phase, setPhase] = useState<Phase>('intro');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [elapsed, setElapsed] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [challengeRes, completedRes] = await Promise.allSettled([
          apiService.dailyChallenge.getTodaysChallenge(),
          apiService.dailyChallenge.hasCompletedToday(),
        ]);
        if (completedRes.status === 'fulfilled' && completedRes.value.data?.data?.completed) {
          setPhase('already-completed');
        }
        if (challengeRes.status === 'fulfilled' && challengeRes.value.data?.success) {
          const data = challengeRes.value.data.data;
          setChallenge(data);
          setAnswers(new Array(data.questions?.length || 0).fill(-1));
          if (data.completed) setPhase('already-completed');
        }
      } catch {} finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (phase === 'quiz') {
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }
  }, [phase]);

  const questions = challenge?.questions || [];
  const currentQ = questions[currentIndex];

  const handleSelect = (optionIndex: number) => {
    if (showFeedback) return;
    const updated = [...answers];
    updated[currentIndex] = optionIndex;
    setAnswers(updated);
  };

  const handleSubmit = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setSubmitting(true);
    try {
      const res = await apiService.dailyChallenge.submitChallenge({
        challengeId: challenge._id,
        answers,
      });
      if (res.data?.success) {
        setResult(res.data.data);
        setPhase('results');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const getCorrectIndex = (q: any) => {
    if (typeof q?.correctAnswer === 'number') return q.correctAnswer;
    if (typeof q?.correct === 'number') return q.correct;
    return -1;
  };

  const getDifficultyColor = (d?: string) => {
    if (!d) return colors.mutedForeground;
    const l = d.toLowerCase();
    if (l === 'easy') return colors.success;
    if (l === 'hard') return colors.destructive;
    return colors.warning;
  };

  const renderRichText = (content: string) => {
    if (!content) return null;

    return content.split('\n').map((line, i) => {
      // Decode HTML entities
      let decodedLine = line
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'");

      // Convert LaTeX to readable format
      let formattedLine = decodedLine
        .replace(/\$([^$]+)\$/g, (_, math) => {
          return math
            .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1/$2)')
            .replace(/\\pi/g, 'π')
            .replace(/\\theta/g, 'θ')
            .replace(/\\sin/g, 'sin')
            .replace(/\\cos/g, 'cos')
            .replace(/\\tan/g, 'tan')
            .replace(/\\cot/g, 'cot')
            .replace(/\\sec/g, 'sec')
            .replace(/\\csc/g, 'csc')
            .replace(/\^\{-1\}/g, '⁻¹')
            .replace(/\\le/g, '≤')
            .replace(/\\ge/g, '≥')
            .replace(/\\ne/g, '≠')
            .replace(/\\{/g, '')
            .replace(/\\}/g, '')
            .replace(/[{}]/g, '');
        })
        .replace(/\\\{/g, '{')
        .replace(/\\\}/g, '}')
        .replace(/\\0\\/g, '{0}')
        .replace(/\\\(/g, '(')
        .replace(/\\\)/g, ')');

      if (formattedLine.startsWith('## ')) {
        return (
          <Text key={i} style={{ fontSize: 18, fontWeight: '800', marginTop: 16, marginBottom: 8, color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold' }}>
            {formattedLine.replace('## ', '')}
          </Text>
        );
      }
      if (formattedLine.startsWith('### ')) {
        return (
          <Text key={i} style={{ fontSize: 16, fontWeight: '700', marginTop: 12, marginBottom: 6, color: colors.foreground, fontFamily: 'PlusJakartaSans_600SemiBold' }}>
            {formattedLine.replace('### ', '')}
          </Text>
        );
      }
      if (formattedLine.startsWith('**') && formattedLine.endsWith('**')) {
        return (
          <Text key={i} style={{ fontSize: 15, fontWeight: '700', color: colors.primary, marginTop: 12, fontFamily: 'Inter_700Bold' }}>
            {formattedLine.replace(/\*\*/g, '')}
          </Text>
        );
      }
      if (formattedLine.startsWith('- ')) {
        return (
          <View key={i} style={{ flexDirection: 'row', marginLeft: 8, marginTop: 4 }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 15 }}>• </Text>
            <Text style={{ flex: 1, color: colors.mutedForeground, fontSize: 15, lineHeight: 22 }}>
              {formattedLine.replace('- ', '')}
            </Text>
          </View>
        );
      }
      if (formattedLine.trim()) {
        const parts = formattedLine.split(/\*\*([^*]+)\*\*/g);
        return (
          <Text key={i} style={{ fontSize: 15, color: colors.mutedForeground, lineHeight: 24, marginVertical: 4 }}>
            {parts.map((part, idx) =>
              idx % 2 === 1 ? (
                <Text key={idx} style={{ fontWeight: '700', color: colors.foreground, fontFamily: 'Inter_700Bold' }}>
                  {part}
                </Text>
              ) : (
                part
              )
            )}
          </Text>
        );
      }
      return null;
    });
  };

  // ── Header bar (reused across phases) ──────────────────────────────────────
  const HeaderBar = ({ title, showTimer = false, onBack }: { title: string; showTimer?: boolean; onBack?: () => void }) => (
    <View style={{ paddingTop: insets.top, paddingHorizontal: 16, backgroundColor: colors.background }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 }}>
        <Pressable
          onPress={onBack || (() => router.back())}
          style={{
            width: 40, height: 40, borderRadius: radii.md,
            backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <ArrowLeft size={20} color={colors.foreground} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold' }}>
            {title}
          </Text>
          <Text style={{ fontSize: 11, color: colors.mutedForeground }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </Text>
        </View>
        {showTimer && (
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 6,
            paddingHorizontal: 12, paddingVertical: 6, borderRadius: radii.full ?? 99,
            backgroundColor: elapsed > 540 ? colors.destructive + '20' : colors.muted,
          }}>
            <Clock size={14} color={elapsed > 540 ? colors.destructive : colors.foreground} />
            <Text style={{ fontSize: 14, fontWeight: '700', color: elapsed > 540 ? colors.destructive : colors.foreground }}>
              {formatTime(elapsed)}
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
        <View style={{ padding: 16, gap: 12 }}>
          <Skeleton height={40} borderRadius={radii.md} />
          <Skeleton height={200} borderRadius={radii.md} />
          <Skeleton height={60} borderRadius={radii.md} />
        </View>
      </View>
    );
  }

  // ── Already Completed ───────────────────────────────────────────────────────
  if (phase === 'already-completed') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <HeaderBar title="Daily DPP" />
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}
        >
          <GlassCard style={{ alignItems: 'center', gap: 16, paddingVertical: 40, width: '100%' }}>
            <View style={{
              width: 80, height: 80, borderRadius: 40,
              backgroundColor: colors.success + '20',
              borderWidth: 2, borderColor: colors.success + '50',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <CheckCircle size={40} color={colors.success} />
            </View>
            <Text style={{ fontSize: 22, fontWeight: '800', color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold' }}>
              Already Completed!
            </Text>
            <Text style={{ fontSize: 14, color: colors.mutedForeground, textAlign: 'center', lineHeight: 22 }}>
              You've already completed today's DPP.{'\n'}Come back tomorrow!
            </Text>
            {challenge?.userScore != null && (
              <GlassCard style={{ backgroundColor: colors.success + '12', borderColor: colors.success + '40', alignItems: 'center', gap: 4, marginTop: 4 }}>
                <Text style={{ fontSize: 12, color: colors.mutedForeground }}>Your Score</Text>
                <Text style={{ fontSize: 36, fontWeight: '900', color: colors.success, fontFamily: 'Inter_800ExtraBold' }}>
                  {challenge.userScore}/100
                </Text>
                {challenge.userXpEarned != null && (
                  <Text style={{ fontSize: 13, color: colors.mutedForeground }}>+{challenge.userXpEarned} XP</Text>
                )}
              </GlassCard>
            )}
            <Button onPress={() => router.push('/(auth)/leaderboard' as any)} style={{ marginTop: 4 }}>
              View Leaderboard
            </Button>
          </GlassCard>
        </MotiView>
      </View>
    );
  }

  // ── Results ─────────────────────────────────────────────────────────────────
  if (phase === 'results' && result) {
    const score = result.score || 0;
    const total = questions.length;
    const pct = total > 0 ? Math.round((score / total) * 100) : 0;
    const emoji = pct >= 80 ? '🏆' : pct >= 60 ? '⭐' : '💪';
    const label = pct >= 80 ? 'Excellent!' : pct >= 60 ? 'Great Job!' : 'Keep Practicing!';

    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <HeaderBar title="Challenge Results" />
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 30 }}>
          <MotiView from={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'timing', duration: 400 }}>
            <GlassCard style={{ alignItems: 'center', paddingVertical: 36, gap: 12, marginBottom: 16 }}>
              <Text style={{ fontSize: 56 }}>{emoji}</Text>
              <Text style={{ fontSize: 22, fontWeight: '800', color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold' }}>
                {label}
              </Text>
              <Text style={{ fontSize: 52, fontWeight: '900', color: pct >= 60 ? colors.success : colors.warning, fontFamily: 'Inter_800ExtraBold' }}>
                {pct}%
              </Text>
              <Text style={{ fontSize: 15, color: colors.mutedForeground }}>
                {score}/{total} correct
              </Text>
              {result.xpEarned && (
                <View style={{
                  flexDirection: 'row', alignItems: 'center', gap: 8,
                  paddingHorizontal: 16, paddingVertical: 10, borderRadius: radii.md,
                  backgroundColor: colors.warning + '15', borderWidth: 1, borderColor: colors.warning + '40',
                }}>
                  <Zap size={18} color={colors.warning} />
                  <Text style={{ fontSize: 18, fontWeight: '800', color: colors.warning, fontFamily: 'Inter_800ExtraBold' }}>
                    +{result.xpEarned} XP Earned
                  </Text>
                </View>
              )}
            </GlassCard>
            <View style={{ gap: 12 }}>
              <Button onPress={() => router.push('/(auth)/leaderboard' as any)}>
                View Leaderboard
              </Button>
              <Button variant="outline" onPress={() => router.back()}>
                Back to Dashboard
              </Button>
            </View>
          </MotiView>
        </ScrollView>
      </View>
    );
  }

  // ── Intro Phase ─────────────────────────────────────────────────────────────
  if (phase === 'intro' && challenge) {
    const diffColor = getDifficultyColor(challenge.difficulty);

    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <HeaderBar title="Daily DPP" />
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 30 }}>
          <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 400 }}>
            {/* Topic intro card */}
            <GlassCard style={{ alignItems: 'center', marginBottom: 16 }}>
              {challenge.icon && (
                <Text style={{ fontSize: 60, marginBottom: 12 }}>{challenge.icon}</Text>
              )}
              <Text style={{ fontSize: 22, fontWeight: '900', color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold', textAlign: 'center', marginBottom: 6 }}>
                {challenge.topic}
              </Text>
              <Text style={{ fontSize: 14, color: colors.mutedForeground, marginBottom: 20 }}>
                {challenge.subject}
              </Text>

              {/* Stats row: time / questions / XP */}
              <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 24, marginBottom: 20 }}>
                {[
                  { val: String(challenge.timeLimit ?? '—'), label: 'Minutes', color: colors.primary },
                  { val: String(challenge.questions?.length ?? 0), label: 'Questions', color: colors.secondary },
                  { val: String(challenge.xpReward ?? 0), label: 'XP Reward', color: colors.warning },
                ].map((s, i) => (
                  <View key={i} style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 26, fontWeight: '900', color: s.color, fontFamily: 'Inter_800ExtraBold' }}>{s.val}</Text>
                    <Text style={{ fontSize: 11, color: colors.mutedForeground }}>{s.label}</Text>
                  </View>
                ))}
              </View>

              {/* How it works box */}
              <View style={{
                backgroundColor: colors.muted + '80', borderRadius: radii.md,
                padding: 16, borderWidth: 1, borderColor: colors.border,
                alignSelf: 'stretch', marginBottom: 20,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Target size={16} color={colors.primary} />
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground, fontFamily: 'Inter_700Bold' }}>
                    How it works
                  </Text>
                </View>
                {[
                  "Read today's topic carefully",
                  'Answer the timed quiz questions',
                  'Compete on the leaderboard!',
                ].map((step, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: i < 2 ? 10 : 0 }}>
                    <View style={{
                      width: 22, height: 22, borderRadius: 11,
                      backgroundColor: colors.primary + '20',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: colors.primary }}>{i + 1}</Text>
                    </View>
                    <Text style={{ fontSize: 13, color: colors.mutedForeground, flex: 1, lineHeight: 20 }}>{step}</Text>
                  </View>
                ))}
              </View>

              {/* Difficulty badge */}
              {challenge.difficulty && (
                <View style={{
                  paddingHorizontal: 14, paddingVertical: 5, borderRadius: radii.full ?? 99,
                  backgroundColor: diffColor + '18', borderWidth: 1, borderColor: diffColor + '50',
                  marginBottom: 20,
                }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: diffColor }}>{challenge.difficulty}</Text>
                </View>
              )}

              <Pressable
                onPress={() => setPhase('reading')}
                style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1, alignSelf: 'stretch', zIndex: 10 })}
              >
                <LinearGradient
                  colors={[...gradients.primary]}
                  start={gradientProps.start}
                  end={gradientProps.end}
                  style={{
                    minHeight: 52, borderRadius: radii.md, alignItems: 'center',
                    justifyContent: 'center', flexDirection: 'row', gap: 10,
                  }}
                >
                  <BookOpen size={20} color="#fff" />
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff', fontFamily: 'Inter_600SemiBold' }}>
                    Start Reading
                  </Text>
                </LinearGradient>
              </Pressable>
            </GlassCard>
          </MotiView>
        </ScrollView>
      </View>
    );
  }

  // ── Reading Phase ─────────────────────────────────────────────────────────────
  if (phase === 'reading' && challenge) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <HeaderBar title="Topic Overview" onBack={() => setPhase('intro')} />
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 30 }}>
          <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 400 }}>
            <GlassCard style={{ marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                {challenge.icon && <Text style={{ fontSize: 32 }}>{challenge.icon}</Text>}
                <Text style={{ fontSize: 20, fontWeight: '800', color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold' }}>
                  {challenge.topic}
                </Text>
              </View>

              <View style={{ gap: 2 }}>
                {renderRichText(challenge.content)}
              </View>
            </GlassCard>

            <Pressable onPress={() => setPhase('quiz')} style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}>
              <LinearGradient
                colors={[...gradients.primary]}
                start={gradientProps.start}
                end={gradientProps.end}
                style={{
                  minHeight: 52, borderRadius: radii.md, alignItems: 'center',
                  justifyContent: 'center', flexDirection: 'row', gap: 10,
                }}
              >
                <Play size={20} color="#fff" />
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff', fontFamily: 'Inter_600SemiBold' }}>
                  I'm Ready - Start Quiz
                </Text>
              </LinearGradient>
            </Pressable>
          </MotiView>
        </ScrollView>
      </View>
    );
  }
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <HeaderBar title={`Q ${currentIndex + 1}/${questions.length}`} showTimer onBack={() => setPhase('reading')} />
      <View style={{ paddingHorizontal: 16, paddingBottom: 4 }}>
        <Progress value={questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0} style={{ marginBottom: 4 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {currentQ && (
          <>
            <GlassCard style={{ marginBottom: 16 }}>
              {renderRichText(currentQ.question || currentQ.text)}
            </GlassCard>
            <View style={{ gap: 10 }}>
              {(currentQ.options || []).map((opt: any, i: number) => (
                <QuizOption
                  key={i}
                  label={OPTION_LABELS[i]}
                  text={typeof opt === 'string' ? opt : (opt.text || String(opt))}
                  state={answers[currentIndex] === i ? 'selected' : 'default'}
                  onPress={() => handleSelect(i)}
                />
              ))}
            </View>
          </>
        )}
      </ScrollView>

      <View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        paddingHorizontal: 16, paddingBottom: insets.bottom + 16, paddingTop: 12,
        backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border,
        flexDirection: 'row', gap: 12,
      }}>
        {currentIndex > 0 && (
          <Button variant="outline" onPress={() => setCurrentIndex(currentIndex - 1)} style={{ paddingHorizontal: 16 }}>
            Prev
          </Button>
        )}
        <View style={{ flex: 1 }}>
          {currentIndex === questions.length - 1 ? (
            <Button onPress={handleSubmit} loading={submitting}>Submit Challenge</Button>
          ) : (
            <Button onPress={() => setCurrentIndex(currentIndex + 1)}>Next</Button>
          )}
        </View>
      </View>
    </View>
  );
}
