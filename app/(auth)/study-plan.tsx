import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import {
  Calendar as CalendarIcon, CheckCircle2, Circle, Clock, Play, ArrowLeft,
  CalendarDays, Target, Sparkles, BookOpen
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import apiService from '@/lib/apiService';
import { LinearGradient } from 'expo-linear-gradient';
import BottomNav from '@/components/BottomNav';

interface StudyTask {
  _id: string;
  chapterId: string;
  subject: string;
  taskType: string;
  title: string;
  duration: number;
  timeSlot: string;
  isCompleted: boolean;
}

interface DailyPlan {
  date: string;
  dailyGoal: {
    studyHours: number;
    completedHours: number;
    percentage: number;
  };
  tasks: StudyTask[];
}

interface StudyPlanData {
  title: string;
  examType: string;
  targetDate: string;
  startDate: string;
  endDate: string;
  status: string;
  progress: {
    totalChapters: number;
    completedChapters: number;
    totalHours: number;
    completedHours: number;
    overallProgress: number;
  };
  dailyTasks: DailyPlan[];
  recommendations: Array<{
    type: string;
    message: string;
    priority: string;
  }>;
}

const StudyPlanner = () => {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<StudyPlanData | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [generating, setGenerating] = useState(false);

  useEffect(() => { fetchPlan(); }, []);

  const fetchPlan = async () => {
    try {
      setLoading(true);
      const res = await apiService.studyPlan.getStudyPlan();
      if (res.data?.success && res.data?.data) {
        setPlan(res.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch plan', error);
    } finally {
      setLoading(false);
    }
  };

  const generateNewPlan = async () => {
    try {
      setGenerating(true);
      const targetDate = new Date();
      targetDate.setMonth(targetDate.getMonth() + 4);

      const res = await apiService.studyPlan.generateStudyPlan({ targetDate: targetDate.toISOString() });
      if (res.data?.success && res.data?.data) {
        setPlan(res.data.data);
        setSelectedDate(new Date());
      }
    } catch (error) {
      console.error('Failed to generate plan', error);
    } finally {
      setGenerating(false);
    }
  };

  const toggleTaskStatus = async (taskId: string, currentStatus: boolean) => {
    if (!plan) return;
    const updatedPlan = { ...plan };
    let taskFound = false;
    updatedPlan.dailyTasks.forEach(dt => {
      dt.tasks.forEach(t => {
        if (t._id === taskId) {
          t.isCompleted = !currentStatus;
          taskFound = true;
        }
      });
    });

    if (taskFound) {
      setPlan(updatedPlan);
      try {
        await apiService.studyPlan.updateTaskStatus(taskId, !currentStatus);
      } catch (error) {
        console.error('Failed to update task', error);
        fetchPlan();
      }
    }
  };

  const getDayPlan = (date: Date) => {
    if (!plan || !plan.dailyTasks) return null;
    return plan.dailyTasks.find(dt => {
      const dtDate = new Date(dt.date);
      return dtDate.getDate() === date.getDate() &&
        dtDate.getMonth() === date.getMonth() &&
        dtDate.getFullYear() === date.getFullYear();
    });
  };

  const generateWeekDays = () => {
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setDate(today.getDate() - 1);
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const weekDays = generateWeekDays();
  const selectedDayPlan = getDayPlan(selectedDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 16, fontSize: 12, fontWeight: '600', color: colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 1 }}>Loading Plan...</Text>
      </View>
    );
  }

  if (!plan) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + 16, paddingHorizontal: 16 }}>
        <Pressable onPress={() => router.back()} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
          <ArrowLeft size={20} color={colors.foreground} />
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <LinearGradient colors={[colors.primary + '33', colors.secondary + '33']} style={{ width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 24, borderWidth: 1, borderColor: colors.border }}>
            <CalendarDays size={40} color={colors.foreground} />
          </LinearGradient>
          <Text style={{ fontSize: 24, fontWeight: '700', color: colors.foreground, marginBottom: 12, fontFamily: 'Inter_700Bold' }}>No Study Plan</Text>
          <Text style={{ fontSize: 14, color: colors.mutedForeground, textAlign: 'center', marginBottom: 32, paddingHorizontal: 32 }}>
            You haven't generated a personalized schedule yet. Let AI build a plan tailored to your NEET goals.
          </Text>
          <Pressable onPress={generateNewPlan} disabled={generating} style={{
            paddingHorizontal: 32, paddingVertical: 16, borderRadius: 16, backgroundColor: colors.foreground,
            flexDirection: 'row', alignItems: 'center', gap: 8, opacity: generating ? 0.7 : 1
          }}>
            {generating ? <ActivityIndicator size="small" color={colors.background} /> : <Sparkles size={20} color={colors.background} />}
            <Text style={{ fontSize: 14, fontWeight: '800', color: colors.background, textTransform: 'uppercase', letterSpacing: 1 }}>
              {generating ? 'Generating...' : 'Generate AI Plan'}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const completedTasks = selectedDayPlan?.tasks.filter(t => t.isCompleted).length || 0;
  const totalTasks = selectedDayPlan?.tasks.length || 0;
  const dayProgress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  const overdueTasksCount = plan.dailyTasks.reduce((acc, dt) => {
    const dtDate = new Date(dt.date);
    dtDate.setHours(0, 0, 0, 0);
    if (dtDate < today) return acc + dt.tasks.filter(t => !t.isCompleted).length;
    return acc;
  }, 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* ── Sticky Header ── */}
      <View style={{
        paddingTop: insets.top,
        paddingHorizontal: 16,
        paddingBottom: 4,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        zIndex: 10,
      }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: 8
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Pressable
              onPress={() => router.back()}
              style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}
            >
              <ArrowLeft size={20} color={colors.foreground} />
            </Pressable>
            <View>
              <Text style={{ fontSize: 20, fontWeight: '800', color: colors.primary, fontFamily: 'PlusJakartaSans_800ExtraBold' }}>
                Study Planner
              </Text>
              <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: -2, fontFamily: 'Inter_400Regular' }}>
                AI Personalized Roadmap
              </Text>
            </View>
          </View>
          <View style={{ backgroundColor: colors.primary + '14', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Target size={14} color={colors.primary} />
            <Text style={{ fontSize: 11, fontWeight: '800', color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.5 }}>{plan.examType}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 64, paddingTop: 16 }}
        showsVerticalScrollIndicator={false}
      >

        {/* Global Progress Card */}
        <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }}
          style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 24, padding: 20, marginBottom: 24 }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
            <View>
              <Text style={{ fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, color: colors.mutedForeground, marginBottom: 4 }}>Overall Progress</Text>
              <Text style={{ fontSize: 32, fontWeight: '900', color: colors.foreground, fontFamily: 'Inter_700Bold' }}>{plan.progress?.overallProgress || 0}%</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, color: colors.mutedForeground, marginBottom: 4 }}>Chapters</Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground }}>
                {plan.progress?.completedChapters || 0} <Text style={{ color: colors.mutedForeground, fontWeight: '400' }}>/ {plan.progress?.totalChapters || 97}</Text>
              </Text>
            </View>
          </View>
          <View style={{ height: 8, backgroundColor: colors.muted, borderRadius: 4, overflow: 'hidden' }}>
            <MotiView from={{ width: 0 }} animate={{ width: `${plan.progress?.overallProgress || 0}%` }} transition={{ duration: 1000, delay: 200 }} style={{ height: '100%', backgroundColor: colors.primary, borderRadius: 4 }} />
          </View>
        </MotiView>

        {/* Backlog Warning */}
        {overdueTasksCount > 0 && (
          <MotiView from={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            style={{ backgroundColor: colors.destructive + '1A', borderWidth: 1, borderColor: colors.destructive + '4D', borderRadius: 16, padding: 12, marginBottom: 24, flexDirection: 'row', alignItems: 'center', gap: 12 }}
          >
            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.destructive + '33', borderWidth: 1, borderColor: colors.destructive + '4D', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: colors.destructive }}>{overdueTasksCount}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.destructive, textTransform: 'uppercase', letterSpacing: 1 }}>Tasks Overdue</Text>
              <Text style={{ fontSize: 12, color: colors.mutedForeground }}>You have uncompleted tasks from previous days.</Text>
            </View>
          </MotiView>
        )}

        {/* AI Recommendations */}
        {plan.recommendations && plan.recommendations.length > 0 && (
          <View style={{ gap: 12, marginBottom: 24 }}>
            {plan.recommendations.map((rec, idx) => (
              <MotiView key={idx} from={{ opacity: 0, translateX: -20 }} animate={{ opacity: 1, translateX: 0 }} transition={{ delay: 0.1 * idx }}
                style={{ backgroundColor: colors.primary + '1A', borderWidth: 1, borderColor: colors.primary + '33', borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}
              >
                <Sparkles size={20} color={colors.primary} style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{rec.type.replace('_', ' ')}</Text>
                  <Text style={{ fontSize: 14, color: colors.foreground, lineHeight: 20 }}>{rec.message}</Text>
                </View>
              </MotiView>
            ))}
          </View>
        )}

        {/* Week Calendar Strip */}
        <View style={{ marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground, textTransform: 'uppercase', letterSpacing: 1, fontFamily: 'Inter_700Bold' }}>Schedule</Text>
            <Text style={{ fontSize: 12, fontWeight: '500', color: colors.mutedForeground, textTransform: 'uppercase' }}>{selectedDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {weekDays.map((d, i) => {
              const isSelected = d.toDateString() === selectedDate.toDateString();
              const isToday = d.toDateString() === today.toDateString();
              const dayStr = d.toLocaleDateString('en-US', { weekday: 'short' });
              const dPlan = getDayPlan(d);
              const allDone = dPlan && dPlan.tasks.length > 0 && dPlan.tasks.every(t => t.isCompleted);
              const hasTasks = dPlan && dPlan.tasks.length > 0;

              return (
                <Pressable
                  key={i} onPress={() => setSelectedDate(d)}
                  style={{
                    width: 64, paddingVertical: 12, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
                    backgroundColor: isSelected ? colors.primary : colors.card,
                    borderWidth: 1, borderColor: isSelected ? colors.primary : colors.border
                  }}
                >
                  <Text style={{ fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, color: isSelected ? colors.primaryForeground : colors.mutedForeground, marginBottom: 4 }}>{dayStr}</Text>
                  <Text style={{ fontSize: 20, fontWeight: '800', color: isSelected ? colors.primaryForeground : isToday ? colors.primary : colors.foreground }}>{d.getDate()}</Text>
                  <View style={{ flexDirection: 'row', gap: 4, marginTop: 8 }}>
                    {hasTasks ? (
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: allDone ? colors.success : colors.warning }} />
                    ) : <View style={{ width: 6, height: 6 }} />}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Daily Tasks */}
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground, textTransform: 'uppercase', letterSpacing: 1, fontFamily: 'Inter_700Bold' }}>
              {selectedDate.toDateString() === today.toDateString() ? "Today's Tasks" : selectedDate.toLocaleDateString('en-US', { weekday: 'long' }) + "'s Tasks"}
            </Text>
            {totalTasks > 0 && <Text style={{ fontSize: 12, fontWeight: '700', color: colors.mutedForeground }}>{completedTasks}/{totalTasks} Done</Text>}
          </View>

          {!selectedDayPlan || selectedDayPlan.tasks.length === 0 ? (
            <View style={{ backgroundColor: colors.card, borderRadius: 24, borderWidth: 1, borderColor: colors.border, padding: 40, alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <CalendarIcon size={24} color={colors.mutedForeground} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground, marginBottom: 4 }}>Rest Day!</Text>
              <Text style={{ fontSize: 12, color: colors.mutedForeground }}>No tasks scheduled for this day.</Text>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {selectedDayPlan.tasks.map((task, idx) => (
                <MotiView key={task._id || idx} from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ delay: 0.05 * idx }}
                  style={{
                    backgroundColor: task.isCompleted ? colors.success + '0D' : colors.card,
                    borderWidth: 1, borderColor: task.isCompleted ? colors.success + '33' : colors.border,
                    borderRadius: 16, padding: 20, flexDirection: 'row', gap: 16, opacity: task.isCompleted ? 0.7 : 1
                  }}
                >
                  <Pressable onPress={() => toggleTaskStatus(task._id, task.isCompleted)} style={{ marginTop: 4 }}>
                    {task.isCompleted ? <CheckCircle2 size={24} color={colors.success} /> : <Circle size={24} color={colors.mutedForeground} />}
                  </Pressable>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <View style={{
                          flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1,
                          backgroundColor: task.subject?.toLowerCase() === 'physics' ? '#3B82F626' : task.subject?.toLowerCase() === 'chemistry' ? '#F9731626' : '#22C55E26',
                          borderColor: task.subject?.toLowerCase() === 'physics' ? '#3B82F64D' : task.subject?.toLowerCase() === 'chemistry' ? '#F973164D' : '#22C55E4D',
                        }}>
                          {task.taskType === 'STUDY' ? <BookOpen size={12} color="#fff" /> : task.taskType === 'REVISION' ? <Target size={12} color="#fff" /> : <CalendarIcon size={12} color="#fff" />}
                          <Text style={{ fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, color: task.subject?.toLowerCase() === 'physics' ? '#60A5FA' : task.subject?.toLowerCase() === 'chemistry' ? '#FB923C' : '#4ADE80' }}>{task.subject}</Text>
                        </View>
                        <View style={{ backgroundColor: colors.muted, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                          <Text style={{ fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, color: colors.mutedForeground }}>{task.taskType}</Text>
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.muted, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
                        <Clock size={12} color={colors.mutedForeground} />
                        <Text style={{ fontSize: 12, fontWeight: '500', color: colors.mutedForeground }}>{task.duration}m</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: task.isCompleted ? colors.mutedForeground : colors.foreground, textDecorationLine: task.isCompleted ? 'line-through' : 'none', marginBottom: 12 }}>
                      {task.title}
                    </Text>
                    {!task.isCompleted && (
                      <View style={{ flexDirection: 'row', marginTop: 8 }}>
                        <Pressable onPress={() => router.push(task.taskType === 'MOCK' ? '/(auth)/quiz-session' as any : '/(auth)/curriculum-browser' as any)}
                          style={{ backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}
                        >
                          <Play size={12} fill="#fff" color="#fff" />
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>{task.taskType === 'MOCK' ? 'Start Test' : 'Open Curriculum'}</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                </MotiView>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
      <BottomNav />
    </View>
  );
};

export default StudyPlanner;
