import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, FileText } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import apiService from '@/lib/apiService';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';

const SUBJECTS = [
  { label: 'Physics', value: 'physics' },
  { label: 'Chemistry', value: 'chemistry' },
  { label: 'Biology', value: 'biology' },
];

export default function CustomTestCreateScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [numQuestions, setNumQuestions] = useState('20');
  const [duration, setDuration] = useState('30');
  const [difficulty, setDifficulty] = useState('medium');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert('Enter a title', 'Please give your custom test a name.');
      return;
    }
    if (!subject) {
      Alert.alert('Select a subject', 'Please choose a subject.');
      return;
    }

    setCreating(true);
    try {
      const res = await apiService.tests.createCustomTest({
        title: title.trim(),
        subject,
        numberOfQuestions: Number(numQuestions),
        duration: Number(duration),
        difficulty,
      });

      if (res.data?.success) {
        const testId = res.data.data?._id;
        if (testId) {
          const startRes = await apiService.tests.startTest(testId);
          if (startRes.data?.success) {
            router.replace({
              pathname: '/(auth)/test/custom-session',
              params: { attemptId: startRes.data.data?._id || startRes.data.data?.attemptId },
            } as any);
          }
        }
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to create test');
    } finally {
      setCreating(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: insets.top, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 }}>
          <Pressable onPress={() => router.back()} style={{ padding: 8 }}>
            <ArrowLeft size={24} color={colors.foreground} />
          </Pressable>
          <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold' }}>
            Create Custom Test
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <GlassCard style={{ alignItems: 'center', paddingVertical: 24, marginBottom: 24, gap: 8 }}>
          <View style={{ padding: 14, borderRadius: 16, backgroundColor: colors.warning + '15' }}>
            <FileText size={28} color={colors.warning} />
          </View>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold' }}>
            Custom Test
          </Text>
          <Text style={{ fontSize: 13, color: colors.mutedForeground, textAlign: 'center' }}>
            Create a personalized test with your preferred settings
          </Text>
        </GlassCard>

        <View style={{ gap: 20 }}>
          <Input
            label="Test Title"
            placeholder="e.g. Physics Chapter 1-5 Review"
            value={title}
            onChangeText={setTitle}
          />

          <Select
            label="Subject"
            placeholder="Select subject"
            options={SUBJECTS}
            value={subject}
            onValueChange={setSubject}
          />

          <Select
            label="Number of Questions"
            options={[
              { label: '10 Questions', value: '10' },
              { label: '20 Questions', value: '20' },
              { label: '30 Questions', value: '30' },
              { label: '50 Questions', value: '50' },
            ]}
            value={numQuestions}
            onValueChange={setNumQuestions}
          />

          <Select
            label="Duration (minutes)"
            options={[
              { label: '15 minutes', value: '15' },
              { label: '30 minutes', value: '30' },
              { label: '45 minutes', value: '45' },
              { label: '60 minutes', value: '60' },
              { label: '90 minutes', value: '90' },
            ]}
            value={duration}
            onValueChange={setDuration}
          />

          <Select
            label="Difficulty"
            options={[
              { label: 'Easy', value: 'easy' },
              { label: 'Medium', value: 'medium' },
              { label: 'Hard', value: 'hard' },
              { label: 'Mixed', value: 'mixed' },
            ]}
            value={difficulty}
            onValueChange={setDifficulty}
          />

          {/* Summary */}
          <GlassCard style={{ gap: 8 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold' }}>Summary</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {subject && <Badge variant="primary">{subject}</Badge>}
              <Badge variant="outline">{numQuestions} questions</Badge>
              <Badge variant="warning">{duration} min</Badge>
              <Badge variant="secondary">{difficulty}</Badge>
            </View>
          </GlassCard>

          <Button onPress={handleCreate} loading={creating} disabled={creating} size="lg">
            Create & Start Test
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}
