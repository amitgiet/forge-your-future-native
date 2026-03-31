import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MotiView, AnimatePresence } from 'moti';
import { Trophy, Check, ChevronRight, Lightbulb, X, ChevronLeft } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import apiService from '@/lib/apiService';
import { Button } from '@/components/ui/Button';

const LearningPathFlow = () => {
  const { pathId } = useLocalSearchParams<{ pathId: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [path, setPath] = useState<any>(null);
  const [currentContent, setCurrentContent] = useState<any>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);

  useEffect(() => {
    if (pathId) loadPath();
  }, [pathId]);

  const loadPath = async () => {
    try {
      const response = await apiService.learningPaths.getPathById(pathId as string);
      setPath(response.data?.data);
      await loadNextContent();
    } catch (error) {
      console.error('Error loading path:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadNextContent = async () => {
    try {
      const response = await apiService.learningPaths.getNextContent(pathId as string);
      const data = response.data?.data;
      setQuizzes([]);

      if (data?.completed) {
        setCurrentContent(null);
        return;
      }

      setCurrentContent(data?.content);
      setProgress(data?.progress);

      if (data?.content?.contentType === 'ncert_line' && data?.content?.lineId?._id) {
        await loadQuizzes(data.content.lineId._id);
      }
    } catch (error) {
      console.error('Error loading next content:', error);
    }
  };

  const loadQuizzes = async (lineId: string) => {
    try {
      const response = await apiService.neuronz.generateMicroQuizzes(lineId);
      setQuizzes(response.data?.data || []);
      setCurrentQuizIndex(0);
      setSelectedAnswer(null);
      setShowResult(false);
      setShowExplanation(false);
      setCorrectCount(0);
    } catch (error) {
      console.error('Error loading quizzes:', error);
    }
  };

  const handleSelect = (index: number) => {
    setSelectedAnswer(index);
    setShowResult(true);
    if (index === quizzes[currentQuizIndex]?.correctAnswer) {
      setCorrectCount(prev => prev + 1);
    }
  };

  const handleNext = async () => {
    if (currentQuizIndex < quizzes.length - 1) {
      setCurrentQuizIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
      setShowExplanation(false);
    } else {
      await completeContent();
    }
  };

  const completeContent = async () => {
    try {
      if (currentContent?.lineId?._id && quizzes.length > 0) {
        try {
          const review = quizzes.map((quiz, idx) => {
            const isCorrect = idx < quizzes.length ? (quiz.correctAnswer === idx) : false;
            return {
              question: quiz.question,
              options: Array.isArray(quiz.options) ? quiz.options.map((opt: any) => String(opt)) : [],
              selectedAnswer: isCorrect ? idx : null,
              correctAnswer: Number(quiz.correctAnswer),
              explanation: quiz.explanation
            };
          });

          await apiService.neuronz.processLineSession({
            lineId: currentContent.lineId._id,
            correctAnswers: correctCount,
            totalQuizzes: quizzes.length,
            timeSpent: 0,
            review
          });
        } catch (neuronzError) {
          console.warn('NeuronZ sync failed, continuing path progression:', neuronzError);
        }
      }

      await apiService.learningPaths.markContentComplete(pathId as string, progress.current - 1);
      await loadNextContent();
    } catch (error) {
      console.error('Error completing content:', error);
    }
  };

  const getOptionStyles = (index: number) => {
    if (selectedAnswer === null) {
      return { borderColor: colors.border, backgroundColor: colors.card, iconColor: colors.foreground };
    }
    if (index === quizzes[currentQuizIndex]?.correctAnswer) {
      return { borderColor: colors.success, backgroundColor: colors.success + '1A', iconColor: colors.success };
    }
    if (index === selectedAnswer) {
      return { borderColor: colors.destructive, backgroundColor: colors.destructive + '1A', iconColor: colors.destructive };
    }
    return { borderColor: colors.border, backgroundColor: colors.muted + '4D', iconColor: colors.mutedForeground };
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 16, color: colors.mutedForeground, fontSize: 14 }}>Loading your learning path...</Text>
      </View>
    );
  }

  if (!currentContent) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <MotiView from={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ width: '100%', alignItems: 'center' }}>
            <View style={{ width: 80, height: 80, borderRadius: 24, backgroundColor: colors.success + '33', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
              <Trophy size={40} color={colors.success} />
            </View>
            <Text style={{ fontSize: 24, fontWeight: '700', color: colors.foreground, marginBottom: 8 }}>Path Completed! 🎉</Text>
            <Text style={{ fontSize: 16, color: colors.mutedForeground, textAlign: 'center', marginBottom: 32 }}>
              You've finished all content in this learning path
            </Text>
            <Button size="lg" onPress={() => router.push('/(auth)/(tabs)')} style={{ width: '100%' }}>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Back to Dashboard</Text>
            </Button>
          </MotiView>
        </View>
      </View>
    );
  }

  const currentQuiz = quizzes[currentQuizIndex];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: insets.top, paddingHorizontal: 16, paddingBottom: 16, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, marginTop: 12 }}>
          <Pressable onPress={() => router.back()} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
            <ChevronLeft size={24} color={colors.foreground} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground, flex: 1 }} numberOfLines={1}>{path?.title}</Text>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.mutedForeground, marginLeft: 8 }}>
                {progress.current}/{progress.total}
              </Text>
            </View>
            <View style={{ width: '100%', height: 6, backgroundColor: colors.muted, borderRadius: 3, overflow: 'hidden' }}>
              <MotiView
                from={{ width: 0 }}
                animate={{ width: `${(progress.current / progress.total) * 100}%` }}
                transition={{ type: 'timing', duration: 500 }}
                style={{ height: '100%', backgroundColor: colors.primary, borderRadius: 3 }}
              />
            </View>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}>
        {currentQuiz ? (
          <AnimatePresence>
            <MotiView
              key={currentQuizIndex}
              from={{ opacity: 0, translateX: 20 }}
              animate={{ opacity: 1, translateX: 0 }}
              exit={{ opacity: 0, translateX: -20 }}
              transition={{ type: 'timing', duration: 200 }}
              style={{ backgroundColor: colors.card, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: colors.border }}
            >
              {currentContent.lineId?.ncertText && (
                <View style={{ marginBottom: 20, padding: 12, borderRadius: 12, backgroundColor: colors.muted + '4D', borderWidth: 1, borderColor: colors.border }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: colors.mutedForeground, marginBottom: 4 }}>NCERT LINE</Text>
                  <Text style={{ fontSize: 14, color: colors.foreground, lineHeight: 22 }}>{currentContent.lineId.ncertText}</Text>
                </View>
              )}

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <View style={{ backgroundColor: colors.primary + '1A', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: colors.primary + '33' }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>{currentContent.topic || 'Subject'}</Text>
                </View>
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.mutedForeground }}>Quiz {currentQuizIndex + 1}/{quizzes.length}</Text>
              </View>

              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground, marginBottom: 24, lineHeight: 26 }}>
                {currentQuiz.question}
              </Text>

              <View style={{ gap: 12 }}>
                {currentQuiz.options.map((option: string, index: number) => {
                  const styles = getOptionStyles(index);
                  const isCorrect = index === currentQuiz.correctAnswer;
                  const isSelected = selectedAnswer === index;

                  return (
                    <Pressable
                      key={index}
                      onPress={() => handleSelect(index)}
                      disabled={selectedAnswer !== null}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 12,
                        padding: 16, borderRadius: 16, borderWidth: 2,
                        borderColor: styles.borderColor, backgroundColor: styles.backgroundColor,
                        transform: [{ scale: selectedAnswer === null ? 0.98 : 1 }],
                        opacity: selectedAnswer !== null && !isCorrect && !isSelected ? 0.5 : 1
                      }}
                    >
                      <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: colors.background + '80', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: styles.iconColor }}>{String.fromCharCode(65 + index)}</Text>
                      </View>
                      <Text style={{ flex: 1, fontSize: 15, color: colors.foreground, fontWeight: isSelected || (selectedAnswer !== null && isCorrect) ? '600' : '500' }}>
                        {option}
                      </Text>
                      {selectedAnswer !== null && isCorrect && <Check size={20} color={colors.success} />}
                      {isSelected && !isCorrect && <X size={20} color={colors.destructive} />}
                    </Pressable>
                  );
                })}
              </View>

              <AnimatePresence>
                {showResult && (
                  <MotiView
                    from={{ opacity: 0, translateY: 10 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    style={{
                      marginTop: 20, padding: 12, borderRadius: 12, borderWidth: 1,
                      backgroundColor: selectedAnswer === currentQuiz.correctAnswer ? colors.success + '1A' : colors.destructive + '1A',
                      borderColor: selectedAnswer === currentQuiz.correctAnswer ? colors.success + '33' : colors.destructive + '33'
                    }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '700', color: selectedAnswer === currentQuiz.correctAnswer ? colors.success : colors.destructive }}>
                      {selectedAnswer === currentQuiz.correctAnswer ? '✓ Correct! Great job.' : '✗ Incorrect. Keep learning!'}
                    </Text>
                  </MotiView>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {showExplanation && (
                  <MotiView
                    from={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <View style={{ marginTop: 16, padding: 16, borderRadius: 16, backgroundColor: colors.muted + '80', borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                      <Lightbulb size={20} color={colors.primary} style={{ marginTop: 2 }} />
                      <Text style={{ flex: 1, fontSize: 14, lineHeight: 22, color: colors.foreground + 'E6' }}>
                        {currentQuiz.explanation}
                      </Text>
                    </View>
                  </MotiView>
                )}
              </AnimatePresence>

              {selectedAnswer !== null && (
                <MotiView
                  from={{ opacity: 0, translateY: 10 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}
                >
                  <Button
                    variant="outline"
                    onPress={() => setShowExplanation(!showExplanation)}
                    style={{ flex: 1 }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Lightbulb size={18} color={colors.foreground} />
                      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground }}>Explain</Text>
                    </View>
                  </Button>
                  <Button
                    onPress={handleNext}
                    style={{ flex: 1 }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>
                        {currentQuizIndex < quizzes.length - 1 ? 'Next' : 'Complete'}
                      </Text>
                      <ChevronRight size={18} color="#fff" />
                    </View>
                  </Button>
                </MotiView>
              )}
            </MotiView>
          </AnimatePresence>
        ) : (
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            style={{ backgroundColor: colors.card, borderRadius: 24, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: colors.border }}
          >
            <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: colors.primary + '1A', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Check size={32} color={colors.primary} />
            </View>
            <Text style={{ fontSize: 20, fontWeight: '700', color: colors.foreground, marginBottom: 8 }}>No Quiz Available</Text>
            <Text style={{ fontSize: 14, color: colors.mutedForeground, textAlign: 'center', marginBottom: 24, lineHeight: 20 }}>
              This content item has no quiz right now. You can continue to the next item in your learning path.
            </Text>
            <Button onPress={completeContent} style={{ width: '100%' }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>Mark Complete & Continue</Text>
            </Button>
          </MotiView>
        )}
      </ScrollView>
    </View>
  );
};

export default LearningPathFlow;
