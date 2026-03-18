import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, Pressable,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MotiView } from 'moti';
import { Brain, ArrowRight, BookOpen, Target, Zap } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import apiService from '@/lib/apiService';
import { gradients, gradientProps } from '@/theme/gradients';

// Same constants as web
const SUBJECTS = [
  { id: 'physics', name: 'Physics', color: '#3B82F6' },
  { id: 'chemistry', name: 'Chemistry', color: '#22C55E' },
  { id: 'biology', name: 'Biology', color: '#EF4444' },
  { id: 'mathematics', name: 'Mathematics', color: '#A855F7' },
];

const POPULAR_TOPICS: Record<string, string[]> = {
  physics: ['Thermodynamics', 'Electrostatics', 'Optics', 'Modern Physics', 'Mechanics'],
  chemistry: ['Organic Chemistry', 'Chemical Bonding', 'Equilibrium', 'Electrochemistry', 'Coordination'],
  biology: ['Cell Biology', 'Genetics', 'Evolution', 'Ecology', 'Human Physiology'],
  mathematics: ['Calculus', 'Algebra', 'Trigonometry', 'Vectors', 'Probability'],
};

const StartPractice = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [customTopic, setCustomTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [availability, setAvailability] = useState<{
    available: boolean;
    mappedLineCount: number;
  } | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  // Same URL param logic as web
  useEffect(() => {
    const subjectParam = String(params.subject || '').toLowerCase().trim();
    const topicParam = String(params.topic || '').trim();
    if (subjectParam && SUBJECTS.some((s) => s.id === subjectParam)) setSelectedSubject(subjectParam);
    if (topicParam) { setCustomTopic(topicParam); setSelectedTopic(''); }
  }, []);

  // Same debounced availability check as web (350ms)
  useEffect(() => {
    const topic = (customTopic || selectedTopic || '').trim();
    if (!selectedSubject || !topic) { setAvailability(null); return; }
    const timer = setTimeout(async () => {
      setCheckingAvailability(true);
      try {
        const response = await apiService.neuronz.getTopicAvailability(selectedSubject, topic);
        const data = response.data?.data;
        setAvailability({ available: Boolean(data?.available), mappedLineCount: Number(data?.mappedLineCount || 0) });
      } catch { setAvailability(null); }
      finally { setCheckingAvailability(false); }
    }, 350);
    return () => clearTimeout(timer);
  }, [selectedSubject, selectedTopic, customTopic]);

  const handleStart = async () => {
    const topic = customTopic || selectedTopic;
    if (!selectedSubject || !topic) {
      Alert.alert('Missing info', 'Please select subject and topic');
      return;
    }
    if (availability && !availability.available) {
      Alert.alert('Not mapped', 'No mapped NCERT lines/questions yet for this topic. Please ask admin/content team to map it first.');
      return;
    }
    setLoading(true);
    try {
      const response = await apiService.neuronz.trackBySubjectAndTopic(selectedSubject, topic);
      if (response.data.success) {
        router.push('/(auth)/revision?autoStart=1' as any);
      }
    } catch (error: any) {
      const backendMessage = error.response?.data?.error || error.response?.data?.message;
      Alert.alert('Error', backendMessage || 'No mapped NCERT lines/questions yet for this topic.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, paddingTop: insets.top + 8, paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header — same as web */}
      <MotiView
        from={{ opacity: 0, translateY: -20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 300 }}
        style={{ marginBottom: 24 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: colors.primary + '30', alignItems: 'center', justifyContent: 'center' }}>
            <Brain size={24} color={colors.primary} />
          </View>
          <View>
            <Text style={{ fontSize: 24, fontWeight: '700', color: colors.foreground, fontFamily: 'Inter_700Bold' }}>
              Start NeuronZ Practice
            </Text>
            <Text style={{ fontSize: 13, color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }}>
              Track a topic and revise mapped NCERT lines
            </Text>
          </View>
        </View>
      </MotiView>

      {/* How it Works card — same as web */}
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 300 }}
        style={{
          backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border,
          padding: 16, marginBottom: 24,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Zap size={16} color={colors.primary} />
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground, fontFamily: 'Inter_600SemiBold' }}>
            How NeuronZ Works
          </Text>
        </View>
        <View style={{ gap: 6 }}>
          {[
            '- Track one topic and start from Level 1 with mapped lines',
            '- Correct answers unlock next levels (L2-L3-L4-L5-L6-L7)',
            '- Intervals: 24h to 3d to 5d to 7d to 10d to 15d to 30d',
            '- System brings questions back when revision is due',
          ].map((line, i) => (
            <Text key={i} style={{ fontSize: 13, color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }}>{line}</Text>
          ))}
        </View>
      </MotiView>

      {/* Subject Selection — same 2-col grid as web */}
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 300, delay: 100 }}
        style={{ marginBottom: 24 }}
      >
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground, fontFamily: 'Inter_600SemiBold', marginBottom: 12 }}>
          Select Subject
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {SUBJECTS.map((subject) => (
            <Pressable
              key={subject.id}
              onPress={() => { setSelectedSubject(subject.id); setSelectedTopic(''); setCustomTopic(''); }}
              style={{
                width: '47%',
                borderRadius: 16, borderWidth: 1,
                borderColor: selectedSubject === subject.id ? colors.primary : colors.border,
                padding: 16,
                opacity: 1,
                backgroundColor: selectedSubject === subject.id ? colors.primary + '14' : colors.card,
              }}
            >
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: subject.color, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                <BookOpen size={20} color="#fff" />
              </View>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground, fontFamily: 'Inter_600SemiBold' }}>
                {subject.name}
              </Text>
            </Pressable>
          ))}
        </View>
      </MotiView>

      {/* Topic Selection — shows when subject selected, same as web */}
      {selectedSubject && (
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 300 }}
          style={{ marginBottom: 24 }}
        >
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground, fontFamily: 'Inter_600SemiBold', marginBottom: 12 }}>
            Select Topic
          </Text>

          {/* Popular topics list — same as web */}
          <View style={{ gap: 8, marginBottom: 16 }}>
            {POPULAR_TOPICS[selectedSubject].map((topic) => (
              <Pressable
                key={topic}
                onPress={() => { setSelectedTopic(topic); setCustomTopic(''); }}
                style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  backgroundColor: selectedTopic === topic ? colors.primary + '14' : colors.card,
                  borderRadius: 12, borderWidth: 1,
                  borderColor: selectedTopic === topic ? colors.primary : colors.border,
                  padding: 12,
                  opacity: 1,
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '500', color: colors.foreground, fontFamily: 'Inter_500Medium' }}>
                  {topic}
                </Text>
                {selectedTopic === topic && <Target size={16} color={colors.primary} />}
              </Pressable>
            ))}
          </View>

          {/* Custom topic input — same as web */}
          <View style={{
            backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16,
          }}>
            <Text style={{ fontSize: 13, fontWeight: '500', color: colors.foreground, fontFamily: 'Inter_500Medium', marginBottom: 8 }}>
              Or enter custom topic
            </Text>
            <TextInput
              value={customTopic}
              onChangeText={(t) => { setCustomTopic(t); setSelectedTopic(''); }}
              placeholder="e.g., Photoelectric Effect"
              placeholderTextColor={colors.mutedForeground}
              style={{
                paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12,
                backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border,
                fontSize: 14, color: colors.foreground, fontFamily: 'Inter_400Regular',
              }}
            />
          </View>
        </MotiView>
      )}

      {/* Availability banner + Start button — same as web */}
      {selectedSubject && (selectedTopic || customTopic) && (
        <>
          {/* Availability status — same color logic as web */}
          <View style={{
            marginBottom: 12, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
            backgroundColor:
              checkingAvailability ? colors.muted :
                availability?.available ? colors.success + '25' :
                  availability ? colors.warning + '25' :
                    colors.muted,
          }}>
            <Text style={{
              fontSize: 12, fontFamily: 'Inter_400Regular',
              color:
                checkingAvailability ? colors.mutedForeground :
                  availability?.available ? colors.success :
                    availability ? colors.warning :
                      colors.mutedForeground,
            }}>
              {checkingAvailability
                ? 'Checking topic mapping...'
                : availability?.available
                  ? `Mapped content found (${availability.mappedLineCount} lines). You can start revision.`
                  : availability
                    ? 'No mapped NCERT lines/questions found for this topic yet.'
                    : 'Select topic to check mapped content.'}
            </Text>
          </View>

          {/* Start button */}
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 300 }}
          >
            <Pressable
              onPress={handleStart}
              disabled={loading || checkingAvailability || (availability !== null && !availability.available)}
              style={{ opacity: (loading || checkingAvailability || (availability !== null && !availability.available)) ? 0.6 : 1 }}
            >
              <LinearGradient
                colors={[...gradients.primary]}
                start={gradientProps.start}
                end={gradientProps.end}
                style={{
                  minHeight: 52, borderRadius: 12,
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                {loading ? (
                  <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff', fontFamily: 'Inter_600SemiBold' }}>
                    Starting NeuronZ Practice...
                  </Text>
                ) : (
                  <>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff', fontFamily: 'Inter_600SemiBold' }}>
                      Start Topic Revision
                    </Text>
                    <ArrowRight size={20} color="#fff" />
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </MotiView>
        </>
      )}
    </ScrollView>
  );
};

export default StartPractice;
