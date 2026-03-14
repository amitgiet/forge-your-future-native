import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, X, Sparkles } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import apiService from '@/lib/apiService';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';

export default function CreateLearningPathScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dailyGoal, setDailyGoal] = useState('2');
  const [goals, setGoals] = useState<{ topic: string; target: string }[]>([{ topic: '', target: '' }]);
  const [creating, setCreating] = useState(false);

  const addGoal = () => setGoals([...goals, { topic: '', target: '' }]);
  const removeGoal = (i: number) => setGoals(goals.filter((_, idx) => idx !== i));
  const updateGoal = (i: number, field: 'topic' | 'target', value: string) => {
    const updated = [...goals];
    updated[i][field] = value;
    setGoals(updated);
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert('Enter a title', 'Give your learning path a name.');
      return;
    }
    const validGoals = goals.filter((g) => g.topic.trim());
    if (validGoals.length === 0) {
      Alert.alert('Add goals', 'Add at least one learning goal.');
      return;
    }

    setCreating(true);
    try {
      const res = await apiService.learningPaths.createPath({
        title: title.trim(),
        description: description.trim(),
        goals: validGoals,
        dailyGoal: Number(dailyGoal),
      });
      if (res.data?.success) {
        Alert.alert('Created!', 'Your learning path has been created.');
        router.back();
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to create learning path');
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
            Create Learning Path
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <GlassCard style={{ alignItems: 'center', paddingVertical: 20, marginBottom: 20, gap: 8 }}>
          <Sparkles size={28} color={colors.warning} />
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold' }}>
            Design Your Path
          </Text>
          <Text style={{ fontSize: 13, color: colors.mutedForeground, textAlign: 'center' }}>
            Set goals and daily study targets for structured learning
          </Text>
        </GlassCard>

        <View style={{ gap: 20 }}>
          <Input label="Path Title" placeholder="e.g. Master Organic Chemistry" value={title} onChangeText={setTitle} />
          <Input label="Description (optional)" placeholder="Briefly describe your goal" value={description} onChangeText={setDescription} multiline numberOfLines={3} style={{ minHeight: 80, textAlignVertical: 'top' }} />

          <Select
            label="Daily Study Goal"
            options={[
              { label: '1 hour/day', value: '1' },
              { label: '2 hours/day', value: '2' },
              { label: '3 hours/day', value: '3' },
              { label: '4 hours/day', value: '4' },
              { label: '5+ hours/day', value: '5' },
            ]}
            value={dailyGoal}
            onValueChange={setDailyGoal}
          />

          {/* Goals */}
          <View>
            <Text style={{ fontSize: 14, fontWeight: '500', color: colors.foreground, marginBottom: 10, fontFamily: 'Inter_500Medium' }}>
              Learning Goals
            </Text>
            {goals.map((goal, i) => (
              <GlassCard key={i} style={{ marginBottom: 10, gap: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Badge variant="primary">Goal {i + 1}</Badge>
                  {goals.length > 1 && (
                    <Pressable onPress={() => removeGoal(i)} style={{ padding: 4 }}>
                      <X size={18} color={colors.destructive} />
                    </Pressable>
                  )}
                </View>
                <Input placeholder="Topic (e.g. Thermodynamics)" value={goal.topic} onChangeText={(v) => updateGoal(i, 'topic', v)} />
                <Input placeholder="Target (e.g. Complete all chapters)" value={goal.target} onChangeText={(v) => updateGoal(i, 'target', v)} />
              </GlassCard>
            ))}
            <Button size="sm" variant="outline" onPress={addGoal}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Plus size={16} color={colors.foreground} />
                <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: '600' }}>Add Goal</Text>
              </View>
            </Button>
          </View>

          <Button onPress={handleCreate} loading={creating} disabled={creating} size="lg">
            Create Learning Path
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}
