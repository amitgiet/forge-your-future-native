import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { MotiView, AnimatePresence } from 'moti';
import { ArrowLeft, Clock, BookOpen, Play, CheckCircle, XCircle, Trophy, Zap, Target } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import apiService from '@/lib/apiService';
import { Button } from '@/components/ui/Button';

type Phase = 'intro' | 'reading' | 'quiz' | 'results' | 'already-completed';

const DailyChallenge = () => {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = Dimensions.get('window');

  const [phase, setPhase] = useState<Phase>('intro');
  const [challenge, setChallenge] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600);
  const [quizStarted, setQuizStarted] = useState(false);

  useEffect(() => {
    fetchChallenge();
  }, []);

  const fetchChallenge = async () => {
    try {
      setLoading(true);
      const response = await apiService.dailyChallenge.getTodaysChallenge();
      if (response.data?.success) {
        const challengeData = response.data.data;
        setChallenge(challengeData);

        if (challengeData.completed) {
          setPhase('already-completed');
          setLoading(false);
          return;
        }

        setTimeLeft(challengeData.timeLimit * 60);
      }
    } catch (error) {
      console.error('Error fetching challenge:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (phase === 'quiz' && quizStarted && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setPhase('results');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [phase, quizStarted, timeLeft]);

  const handleStartReading = () => setPhase('reading');

  const handleStartQuiz = () => {
    setPhase('quiz');
    setQuizStarted(true);
  };

  const handleSelectAnswer = (index: number) => {
    if (showFeedback) return;
    setSelectedAnswer(index);
  };

  const handleSubmitAnswer = async () => {
    if (selectedAnswer === null) return;
    setShowFeedback(true);
    const newAnswers = [...answers, selectedAnswer];
    setAnswers(newAnswers);

    setTimeout(async () => {
      if (currentQuestion < challenge.questions.length - 1) {
        setCurrentQuestion(prev => prev + 1);
        setSelectedAnswer(null);
        setShowFeedback(false);
      } else {
        try {
          await apiService.dailyChallenge.submitChallenge({
            answers: newAnswers,
            challengeId: challenge.id
          });
        } catch (error) {
          console.error('Error submitting challenge:', error);
        }
        setPhase('results');
      }
    }, 1500);
  };

  const getCorrectAnswerIndex = (question: any) => {
    if (typeof question?.correctAnswer === 'number') return question.correctAnswer;
    if (typeof question?.correct === 'number') return question.correct;
    return -1;
  };

  const calculateScore = (userAnswers: number[]) => {
    if (!challenge?.questions || challenge.questions.length === 0) return 0;
    let correct = 0;
    challenge.questions.forEach((q: any, i: number) => {
      if (userAnswers[i] === getCorrectAnswerIndex(q)) correct++;
    });
    return Math.round((correct / challenge.questions.length) * 100);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const score = challenge ? calculateScore(answers) : 0;
  const correctCount = challenge ? answers.filter((a, i) => a === getCorrectAnswerIndex(challenge?.questions?.[i])).length : 0;

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // --- Reading HTML Rendering helper ---
  const renderReadingContent = (content: string) => {
    const blocks = (content || '').split('\n').filter(Boolean);
    return blocks.map((line, i) => {
      let l = line.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&apos;/g, "'");

      l = l.replace(/\$([^$]+)\$/g, (_, math) => {
        return math.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1/$2)').replace(/\\pi/g, 'π')
          .replace(/\\theta/g, 'θ').replace(/\\sin/g, 'sin').replace(/\\cos/g, 'cos')
          .replace(/\\tan/g, 'tan').replace(/\\cot/g, 'cot').replace(/\\sec/g, 'sec')
          .replace(/\\csc/g, 'csc').replace(/\^\{-1\}/g, '⁻¹').replace(/\\le/g, '≤')
          .replace(/\\ge/g, '≥').replace(/\\ne/g, '≠').replace(/\\{/g, '').replace(/\\}/g, '')
          .replace(/[{}]/g, '');
      }).replace(/\\\{/g, '{').replace(/\\\}/g, '}').replace(/\\0\\/g, '{0}').replace(/\\\(/g, '(').replace(/\\\)/g, ')');

      if (l.startsWith('## ')) return <Text key={i} style={{ fontSize: 18, fontWeight: '700', color: colors.foreground, marginTop: 16, marginBottom: 8, fontFamily: 'Inter_700Bold' }}>{l.replace('## ', '')}</Text>;
      if (l.startsWith('### ')) return <Text key={i} style={{ fontSize: 16, fontWeight: '700', color: colors.foreground, marginTop: 12, marginBottom: 8, fontFamily: 'Inter_700Bold' }}>{l.replace('### ', '')}</Text>;
      if (l.startsWith('**') && l.endsWith('**')) return <Text key={i} style={{ fontSize: 14, fontWeight: '700', color: colors.primary, marginTop: 12, marginBottom: 4 }}>{l.replace(/\*\*/g, '')}</Text>;
      if (l.startsWith('- ')) return (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', marginLeft: 8, marginBottom: 4 }}>
          <Text style={{ fontSize: 14, color: colors.mutedForeground, marginRight: 6 }}>•</Text>
          <Text style={{ fontSize: 14, color: colors.mutedForeground, flex: 1, lineHeight: 22 }}>{l.replace('- ', '')}</Text>
        </View>
      );

      const parts = l.split(/\*\*([^*]+)\*\*/g);
      return (
        <Text key={i} style={{ fontSize: 14, color: colors.mutedForeground, lineHeight: 22, marginVertical: 4 }}>
          {parts.map((part, idx) => idx % 2 === 1 ? <Text key={idx} style={{ fontWeight: '700', color: colors.foreground }}>{part}</Text> : part)}
        </Text>
      );
    });
  };

  if (phase === 'already-completed') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }}>
          <Pressable onPress={() => router.back()} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
            <ArrowLeft size={20} color={colors.foreground} />
          </Pressable>

          <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} style={{ alignItems: 'center', marginBottom: 32 }}>
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.success + '33', borderWidth: 2, borderColor: colors.success, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <CheckCircle size={40} color={colors.success} />
            </View>
            <Text style={{ fontSize: 24, fontWeight: '700', color: colors.foreground, marginBottom: 8 }}>Already Completed!</Text>
            <Text style={{ fontSize: 14, color: colors.mutedForeground, textAlign: 'center' }}>You've already completed today's DPP. Here are your details:</Text>
          </MotiView>

          <View style={{ padding: 20, borderRadius: 24, backgroundColor: colors.success + '1A', borderWidth: 1, borderColor: colors.success + '4D', alignItems: 'center', marginBottom: 24 }}>
            <Text style={{ fontSize: 14, color: colors.mutedForeground, marginBottom: 8 }}>Your Score</Text>
            <Text style={{ fontSize: 40, fontWeight: '900', color: colors.success }}>{challenge?.userScore || 0}/100</Text>
            <Text style={{ fontSize: 14, color: colors.mutedForeground, marginTop: 8 }}>+{challenge?.userXpEarned || 0} XP</Text>
          </View>

          <View style={{ padding: 20, borderRadius: 24, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, marginBottom: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Text style={{ fontSize: 24 }}>{challenge.icon}</Text>
              <Text style={{ fontSize: 20, fontWeight: '700', color: colors.foreground }}>{challenge.topic}</Text>
            </View>
            {renderReadingContent(challenge.content)}
          </View>

          <View style={{ padding: 20, borderRadius: 24, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, marginBottom: 24 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground, marginBottom: 16 }}>Your Answers & Correct Answers</Text>
            {challenge.questions?.map((q: any, i: number) => (
              <View key={i} style={{ marginBottom: 12, padding: 12, borderRadius: 12, backgroundColor: colors.muted + '4D', borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground, marginBottom: 8 }}>Q{i + 1}: {q.question}</Text>
                <View style={{ gap: 4 }}>
                  {q.options?.map((opt: string, idx: number) => {
                    const isCorrect = idx === q.correctAnswer;
                    const isUserSelected = challenge.userAnswers && idx === challenge.userAnswers[i];
                    return (
                      <View key={idx} style={{
                        padding: 10, borderRadius: 8, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                        backgroundColor: isCorrect ? colors.success + '33' : isUserSelected ? colors.primary + '1A' : 'transparent',
                        borderColor: isCorrect ? colors.success + '80' : isUserSelected ? colors.primary + '80' : 'transparent'
                      }}>
                        <Text style={{ fontSize: 13, color: isCorrect ? colors.success : isUserSelected ? colors.primary : colors.mutedForeground, flex: 1 }}>{String.fromCharCode(65 + idx)}. {opt}</Text>
                        {isCorrect && <Text style={{ fontSize: 11, fontWeight: '700', color: colors.success }}>✓ Correct</Text>}
                        {isUserSelected && !isCorrect && <Text style={{ fontSize: 11, color: colors.primary }}>← Your Answer</Text>}
                      </View>
                    );
                  })}
                </View>
                {q.explanation && (
                  <View style={{ marginTop: 8, padding: 8, borderRadius: 8, backgroundColor: colors.muted + '80', borderLeftWidth: 2, borderLeftColor: colors.primary }}>
                    <Text style={{ fontSize: 12, color: colors.mutedForeground }}><Text style={{ fontWeight: '700', color: colors.foreground }}>Explanation:</Text> {q.explanation}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>

          <Button onPress={() => router.push('/(auth)/(tabs)')} style={{ width: '100%' }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>Back to Dashboard</Text>
          </Button>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: insets.top, paddingHorizontal: 16, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable onPress={() => router.back()} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' }}>
          <ArrowLeft size={20} color={colors.foreground} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground }}>Daily DPP</Text>
          <Text style={{ fontSize: 12, color: colors.mutedForeground }}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</Text>
        </View>
        {phase === 'quiz' && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: timeLeft < 60 ? colors.destructive + '33' : colors.muted }}>
            <Clock size={14} color={timeLeft < 60 ? colors.destructive : colors.foreground} />
            <Text style={{ fontSize: 14, fontWeight: '700', color: timeLeft < 60 ? colors.destructive : colors.foreground }}>{formatTime(timeLeft)}</Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}>
        <AnimatePresence>
          {/* INTRO PHASE */}
          {phase === 'intro' && (
            <MotiView key="intro" from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} exit={{ opacity: 0, translateY: -20 }} style={{ gap: 16 }}>
              <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 24, padding: 24, alignItems: 'center' }}>
                <Text style={{ fontSize: 64, marginBottom: 16 }}>{challenge.icon}</Text>
                <Text style={{ fontSize: 24, fontWeight: '900', color: colors.foreground, marginBottom: 8, textAlign: 'center' }}>{challenge.topic}</Text>
                <Text style={{ fontSize: 14, color: colors.mutedForeground, marginBottom: 24 }}>{challenge.subject}</Text>

                <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: 24, width: '100%' }}>
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={{ fontSize: 24, fontWeight: '900', color: colors.primary }}>{challenge.timeLimit}</Text>
                    <Text style={{ fontSize: 12, color: colors.mutedForeground }}>Minutes</Text>
                  </View>
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={{ fontSize: 24, fontWeight: '900', color: colors.secondary }}>{challenge.questions.length}</Text>
                    <Text style={{ fontSize: 12, color: colors.mutedForeground }}>Questions</Text>
                  </View>
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={{ fontSize: 24, fontWeight: '900', color: colors.warning }}>{challenge.xpReward}</Text>
                    <Text style={{ fontSize: 12, color: colors.mutedForeground }}>XP Reward</Text>
                  </View>
                </View>

                <View style={{ backgroundColor: colors.muted + '80', borderRadius: 16, padding: 16, width: '100%', borderWidth: 1, borderColor: colors.border, marginBottom: 24 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <Target size={16} color={colors.primary} />
                    <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground }}>How it works</Text>
                  </View>
                  <View style={{ gap: 8 }}>
                    {["Read today's topic carefully", "Take the timed quiz", "Compete on the leaderboard!"].map((step, i) => (
                      <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: colors.primary + '33', alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ fontSize: 10, fontWeight: '700', color: colors.primary }}>{i + 1}</Text>
                        </View>
                        <Text style={{ fontSize: 13, color: colors.mutedForeground }}>{step}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                <Button onPress={handleStartReading} style={{ width: '100%' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <BookOpen size={20} color="#fff" />
                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>Start Reading</Text>
                  </View>
                </Button>
              </View>
            </MotiView>
          )}

          {/* READING PHASE */}
          {phase === 'reading' && (
            <MotiView key="reading" from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} exit={{ opacity: 0, translateY: -20 }} style={{ gap: 16 }}>
              <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 24, padding: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <Text style={{ fontSize: 28 }}>{challenge.icon}</Text>
                  <Text style={{ fontSize: 20, fontWeight: '700', color: colors.foreground, flex: 1 }}>{challenge.topic}</Text>
                </View>
                {renderReadingContent(challenge.content)}
              </View>

              <Button onPress={handleStartQuiz} style={{ width: '100%' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Play size={20} color="#fff" fill="#fff" />
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>I'm Ready - Start Quiz</Text>
                </View>
              </Button>
            </MotiView>
          )}

          {/* QUIZ PHASE */}
          {phase === 'quiz' && (
            <MotiView key="quiz" from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} exit={{ opacity: 0, translateY: -20 }} style={{ gap: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {challenge.questions.map((_: any, i: number) => (
                  <View key={i} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: i < currentQuestion ? colors.primary : i === currentQuestion ? colors.primary + '80' : colors.muted }} />
                ))}
              </View>

              <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 24, padding: 20 }}>
                <Text style={{ fontSize: 12, color: colors.mutedForeground, marginBottom: 8 }}>Question {currentQuestion + 1} of {challenge.questions.length}</Text>
                <Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground, marginBottom: 24, lineHeight: 26 }}>{challenge.questions[currentQuestion].question}</Text>

                <View style={{ gap: 12 }}>
                  {challenge.questions[currentQuestion].options.map((option: string, index: number) => {
                    const isCorrect = index === getCorrectAnswerIndex(challenge.questions[currentQuestion]);
                    const isSelected = selectedAnswer === index;

                    let bg = colors.card;
                    let borderC = colors.border;
                    let textC = colors.foreground;

                    if (showFeedback) {
                      if (isCorrect) { bg = colors.success + '33'; borderC = colors.success; textC = colors.success; }
                      else if (isSelected && !isCorrect) { bg = colors.destructive + '33'; borderC = colors.destructive; textC = colors.destructive; }
                    } else if (isSelected) {
                      bg = colors.primary + '1A'; borderC = colors.primary; textC = colors.primary;
                    }

                    return (
                      <Pressable
                        key={index}
                        onPress={() => handleSelectAnswer(index)}
                        disabled={showFeedback}
                        style={({ pressed }) => ({
                          flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 16, borderWidth: 2,
                          backgroundColor: bg, borderColor: borderC, opacity: showFeedback && !isCorrect && !isSelected ? 0.5 : 1,
                          transform: [{ scale: pressed && !showFeedback ? 0.98 : 1 }]
                        })}
                      >
                        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: textC }}>{String.fromCharCode(65 + index)}</Text>
                        </View>
                        <Text style={{ flex: 1, fontSize: 15, color: textC, fontWeight: isSelected || (showFeedback && isCorrect) ? '600' : '500' }}>{option}</Text>
                        {showFeedback && isCorrect && <CheckCircle size={20} color={colors.success} />}
                        {showFeedback && isSelected && !isCorrect && <XCircle size={20} color={colors.destructive} />}
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <Button
                onPress={handleSubmitAnswer}
                disabled={selectedAnswer === null || showFeedback}
                style={{ width: '100%', opacity: selectedAnswer === null || showFeedback ? 0.5 : 1 }}
              >
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>{currentQuestion < challenge.questions.length - 1 ? 'Next Question' : 'Finish Quiz'}</Text>
              </Button>
            </MotiView>
          )}

          {/* RESULTS PHASE */}
          {phase === 'results' && (
            <MotiView key="results" from={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ gap: 16 }}>
              <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 24, padding: 32, alignItems: 'center' }}>
                <MotiView from={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 200 }} style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 64 }}>{score >= 80 ? '🏆' : score >= 60 ? '⭐' : '💪'}</Text>
                </MotiView>

                <Text style={{ fontSize: 24, fontWeight: '900', color: colors.foreground, marginBottom: 8 }}>{score >= 80 ? 'Excellent!' : score >= 60 ? 'Great Job!' : 'Keep Practicing!'}</Text>
                <Text style={{ fontSize: 48, fontWeight: '900', color: colors.primary, marginBottom: 8 }}>{score}%</Text>
                <Text style={{ fontSize: 14, color: colors.mutedForeground, marginBottom: 24 }}>{correctCount} of {challenge.questions.length} correct</Text>

                <View style={{ width: '100%', padding: 20, borderRadius: 16, backgroundColor: colors.warning + '1A', borderWidth: 1, borderColor: colors.warning + '4D', flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 32 }}>
                  <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.warning + '33', alignItems: 'center', justifyContent: 'center' }}>
                    <Zap size={24} color={colors.warning} fill={colors.warning} />
                  </View>
                  <View>
                    <Text style={{ fontSize: 24, fontWeight: '900', color: colors.foreground }}>+{score >= 60 ? challenge.xpReward : Math.round(challenge.xpReward * 0.5)}</Text>
                    <Text style={{ fontSize: 12, color: colors.mutedForeground }}>XP Earned</Text>
                  </View>
                </View>

                <View style={{ width: '100%', gap: 12 }}>
                  <Button onPress={() => router.push('/(auth)/(tabs)/social')} style={{ width: '100%' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Trophy size={18} color="#fff" />
                      <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>View Leaderboard</Text>
                    </View>
                  </Button>
                  <Button variant="outline" onPress={() => router.push('/(auth)/(tabs)')} style={{ width: '100%' }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground }}>Back to Dashboard</Text>
                  </Button>
                </View>
              </View>
            </MotiView>
          )}
        </AnimatePresence>
      </ScrollView>
    </View>
  );
};

export default DailyChallenge;
