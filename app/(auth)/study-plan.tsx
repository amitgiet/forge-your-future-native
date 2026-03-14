import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Calendar, CheckCircle, Circle, Plus, Sparkles } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import apiService from '@/lib/apiService';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Progress } from '@/components/ui/Progress';
import { Input } from '@/components/ui/Input';

export default function StudyPlanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [targetDate, setTargetDate] = useState('2026-05-04');
  const [showGenerate, setShowGenerate] = useState(false);

  const fetchPlan = async () => {
    try {
      const res = await apiService.studyPlan.getStudyPlan();
      if (res.data?.success) {
        setPlan(res.data.data);
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPlan(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPlan();
    setRefreshing(false);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await apiService.studyPlan.generateStudyPlan({ targetDate });
      if (res.data?.success) {
        setPlan(res.data.data);
        setShowGenerate(false);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to generate plan');
    } finally {
      setGenerating(false);
    }
  };

  const handleToggleTask = async (taskId: string, isCompleted: boolean) => {
    try {
      await apiService.studyPlan.updateTaskStatus(taskId, !isCompleted);
      await fetchPlan();
    } catch {}
  };

  const tasks = plan?.tasks || plan?.schedule || [];
  const completedCount = tasks.filter((t: any) => t.isCompleted || t.completed).length;
  const progressPct = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: insets.top, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 }}>
          <Pressable onPress={() => router.back()} style={{ padding: 8 }}>
            <ArrowLeft size={24} color={colors.foreground} />
          </Pressable>
          <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold' }}>
            Study Plan
          </Text>
          {plan && (
            <Button size="sm" variant="outline" onPress={() => setShowGenerate(true)}>
              <Sparkles size={14} color={colors.foreground} />
            </Button>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={{ gap: 12 }}>
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} height={80} borderRadius={12} />)}
          </View>
        ) : !plan || showGenerate ? (
          <View style={{ gap: 20 }}>
            <GlassCard style={{ alignItems: 'center', paddingVertical: 32, gap: 12 }}>
              <Calendar size={40} color={colors.primary} />
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold' }}>
                {plan ? 'Regenerate Plan' : 'Generate Study Plan'}
              </Text>
              <Text style={{ fontSize: 13, color: colors.mutedForeground, textAlign: 'center', lineHeight: 20 }}>
                AI will create a personalized study schedule based on your target exam date.
              </Text>
            </GlassCard>
            <Input
              label="Target Exam Date (YYYY-MM-DD)"
              placeholder="e.g. 2026-05-04"
              value={targetDate}
              onChangeText={setTargetDate}
            />
            <Button onPress={handleGenerate} loading={generating} disabled={generating} size="lg">
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Sparkles size={20} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Generate Plan</Text>
              </View>
            </Button>
            {showGenerate && (
              <Button variant="outline" onPress={() => setShowGenerate(false)}>Cancel</Button>
            )}
          </View>
        ) : (
          <View style={{ gap: 16 }}>
            {/* Progress */}
            <GlassCard style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold' }}>
                  Overall Progress
                </Text>
                <Badge variant={progressPct >= 100 ? 'success' : 'primary'}>{progressPct}%</Badge>
              </View>
              <Progress value={progressPct} height={10} />
              <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
                {completedCount}/{tasks.length} tasks completed
              </Text>
            </GlassCard>

            {/* Tasks */}
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground, textTransform: 'uppercase', letterSpacing: 1, fontFamily: 'PlusJakartaSans_700Bold' }}>
              Today's Tasks
            </Text>
            {tasks.length === 0 ? (
              <GlassCard style={{ alignItems: 'center', paddingVertical: 24 }}>
                <Text style={{ color: colors.mutedForeground }}>No tasks scheduled</Text>
              </GlassCard>
            ) : (
              tasks.map((task: any, i: number) => {
                const isComplete = task.isCompleted || task.completed;
                return (
                  <Pressable key={task._id || i} onPress={() => handleToggleTask(task._id, isComplete)}>
                    <GlassCard style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      {isComplete ? (
                        <CheckCircle size={22} color={colors.success} />
                      ) : (
                        <Circle size={22} color={colors.border} />
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={{
                          fontSize: 14, fontWeight: '600', color: colors.foreground,
                          textDecorationLine: isComplete ? 'line-through' : 'none',
                          opacity: isComplete ? 0.6 : 1,
                        }}>
                          {task.title || task.subject || 'Study Task'}
                        </Text>
                        {task.description && (
                          <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 2 }}>
                            {task.description}
                          </Text>
                        )}
                        <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                          {task.subject && <Badge variant="outline">{task.subject}</Badge>}
                          {task.duration && <Badge variant="secondary">{task.duration}m</Badge>}
                        </View>
                      </View>
                    </GlassCard>
                  </Pressable>
                );
              })
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
