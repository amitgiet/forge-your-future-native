import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, ChevronRight, CheckCircle2, Search, Target, Zap, Clock3, BookOpen, Atom, FlaskConical } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import apiService from '@/lib/apiService';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { Input } from '@/components/ui/Input';

type Subject = 'biology' | 'chemistry' | 'physics';
type Mode = 'practice' | 'test';
type Difficulty = 'easy' | 'medium' | 'hard' | 'mixed';
type Step = 'subject' | 'chapter' | 'subtopics' | 'config';

interface Chapter {
  _id: string;
  subject?: string;
}

interface TopicGroup {
  topic: string;
  sub_topics: Array<{ subTopic: string; uid_count: number }>;
}

const SUBJECT_CONFIG: Record<Subject, { label: string; short: string; Icon: any }> = {
  biology: { label: 'Biology', short: 'BIO', Icon: BookOpen },
  chemistry: { label: 'Chemistry', short: 'CHEM', Icon: FlaskConical },
  physics: { label: 'Physics', short: 'PHY', Icon: Atom },
};

const QUESTION_PRESETS = [10, 20, 30, 45, 60, 90];

function formatChapterId(id: string): string {
  return String(id || '')
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export default function CustomTestCreateScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [step, setStep] = useState<Step>('subject');
  const [subject, setSubject] = useState<Subject | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [chapterSearch, setChapterSearch] = useState('');
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [topicGroups, setTopicGroups] = useState<TopicGroup[]>([]);
  const [selectedSubTopics, setSelectedSubTopics] = useState<Set<string>>(new Set());
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);

  const [difficulty, setDifficulty] = useState<Difficulty>('mixed');
  const [mode, setMode] = useState<Mode>('test');
  const [isPYQ, setIsPYQ] = useState(false);
  const [title, setTitle] = useState('');
  const [numQuestions, setNumQuestions] = useState<number>(30);
  const [duration, setDuration] = useState<number>(45);

  const [loadingChapters, setLoadingChapters] = useState(false);
  const [loadingSubTopics, setLoadingSubTopics] = useState(false);
  const [creating, setCreating] = useState(false);

  const steps: Step[] = ['subject', 'chapter', 'subtopics', 'config'];
  const stepLabels: Record<Step, string> = {
    subject: 'Subject',
    chapter: 'Chapter',
    subtopics: 'Topics',
    config: 'Config',
  };
  const stepIndex = steps.indexOf(step);

  const filteredChapters = useMemo(() => {
    const q = chapterSearch.trim().toLowerCase();
    if (!q) return chapters;
    return chapters.filter((c) => String(c._id || '').toLowerCase().includes(q));
  }, [chapterSearch, chapters]);

  const availableQuestionCount = useMemo(() => {
    let total = 0;
    topicGroups.forEach((group) => {
      group.sub_topics.forEach((st) => {
        const key = `${group.topic}|||${st.subTopic}`;
        if (selectedSubTopics.size === 0 || selectedSubTopics.has(key)) {
          total += Number(st.uid_count || 0);
        }
      });
    });
    return total;
  }, [topicGroups, selectedSubTopics]);

  const effectiveQuestionCount = Math.min(numQuestions, availableQuestionCount || numQuestions);

  const handleSelectSubject = async (nextSubject: Subject) => {
    setSubject(nextSubject);
    setSelectedChapter(null);
    setTopicGroups([]);
    setSelectedSubTopics(new Set());
    setExpandedTopic(null);

    setLoadingChapters(true);
    try {
      const res = await apiService.curriculum.getChapters(nextSubject);
      const data = Array.isArray(res.data?.data) ? res.data.data : [];
      setChapters(data);
      setStep('chapter');
    } catch (e) {
      console.error('Failed to load chapters', e);
      Alert.alert('Error', 'Failed to load chapters');
    } finally {
      setLoadingChapters(false);
    }
  };

  const handleSelectChapter = async (chapter: Chapter) => {
    if (!subject) return;
    setSelectedChapter(chapter);
    setSelectedSubTopics(new Set());
    setExpandedTopic(null);

    setLoadingSubTopics(true);
    try {
      const res = await apiService.curriculum.getSubTopics(subject, chapter._id);
      const data = Array.isArray(res.data?.data) ? res.data.data : [];
      setTopicGroups(data);
      setStep('subtopics');
    } catch (e) {
      console.error('Failed to load subtopics', e);
      Alert.alert('Error', 'Failed to load subtopics');
    } finally {
      setLoadingSubTopics(false);
    }
  };

  const toggleSubTopic = (topic: string, subTopic: string) => {
    const key = `${topic}|||${subTopic}`;
    setSelectedSubTopics((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleAllInTopic = (group: TopicGroup) => {
    setSelectedSubTopics((prev) => {
      const next = new Set(prev);
      const allSelected = group.sub_topics.every((st) => next.has(`${group.topic}|||${st.subTopic}`));
      group.sub_topics.forEach((st) => {
        const key = `${group.topic}|||${st.subTopic}`;
        if (allSelected) next.delete(key);
        else next.add(key);
      });
      return next;
    });
  };

  const handleBack = () => {
    if (step === 'subject') {
      router.back();
      return;
    }
    if (step === 'chapter') {
      setStep('subject');
      return;
    }
    if (step === 'subtopics') {
      setStep('chapter');
      return;
    }
    setStep('subtopics');
  };

  const handleCreate = async () => {
    if (!subject) {
      Alert.alert('Missing Subject', 'Please select subject');
      return;
    }

    setCreating(true);
    try {
      const payload: any = {
        title: title.trim() || `${SUBJECT_CONFIG[subject].label} Custom Test`,
        subject,
        numberOfQuestions: effectiveQuestionCount,
        duration,
        difficulty,
        mode,
        isPYQ,
      };

      if (selectedChapter?._id) payload.chapterId = selectedChapter._id;
      if (selectedSubTopics.size > 0) {
        payload.subTopics = Array.from(selectedSubTopics).map((entry) => entry.split('|||')[1]);
      }

      const createRes = await apiService.tests.createCustomTest(payload);
      const testId = createRes.data?.data?._id;
      if (!testId) throw new Error('Custom test id missing');

      const startRes = await apiService.tests.startTest(testId);
      const attemptId = startRes.data?.data?._id || startRes.data?.data?.attemptId;
      if (!attemptId) throw new Error('Attempt id missing');

      router.replace({
        pathname: '/(auth)/test/custom-session',
        params: { attemptId: String(attemptId) },
      } as any);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || err?.message || 'Failed to create test');
    } finally {
      setCreating(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: insets.top, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 }}>
          <Pressable onPress={handleBack} style={{ padding: 8 }}>
            <ArrowLeft size={24} color={colors.foreground} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold' }}>
              Custom Test
            </Text>
            <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 2 }}>
              Build your perfect test flow
            </Text>
          </View>
          <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.primary + '15' }}>
            <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 11 }}>
              {step === 'subject' ? '1/4' : step === 'chapter' ? '2/4' : step === 'subtopics' ? '3/4' : '4/4'}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', paddingBottom: 10 }}>
          {steps.map((s, i) => {
            const done = i < stepIndex;
            const active = i === stepIndex;
            return (
              <React.Fragment key={s}>
                <View style={{ alignItems: 'center' }}>
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      backgroundColor: done || active ? colors.primary : colors.muted,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: done || active ? '#fff' : colors.mutedForeground, fontSize: 11, fontWeight: '700' }}>
                      {done ? '✓' : i + 1}
                    </Text>
                  </View>
                  <Text style={{ marginTop: 4, fontSize: 10, color: active ? colors.primary : colors.mutedForeground, fontWeight: active ? '700' : '500' }}>
                    {stepLabels[s]}
                  </Text>
                </View>
                {i < steps.length - 1 && (
                  <View style={{ flex: 1, height: 2, backgroundColor: i < stepIndex ? colors.primary : colors.border, marginHorizontal: 4, marginBottom: 14 }} />
                )}
              </React.Fragment>
            );
          })}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 14 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {step === 'subject' && (
          <GlassCard style={{ gap: 10 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground }}>Choose Subject</Text>
            {(Object.keys(SUBJECT_CONFIG) as Subject[]).map((sub) => {
              const active = subject === sub;
              const Icon = SUBJECT_CONFIG[sub].Icon;
              return (
                <Pressable
                  key={sub}
                  onPress={() => handleSelectSubject(sub)}
                  style={{
                    borderWidth: 1,
                    borderColor: active ? colors.primary : colors.border,
                    borderRadius: 12,
                    backgroundColor: active ? colors.primary + '15' : colors.card,
                    padding: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: active ? colors.primary + '22' : colors.muted, alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={16} color={active ? colors.primary : colors.mutedForeground} />
                    </View>
                    <View>
                      <Text style={{ color: colors.foreground, fontWeight: '700' }}>{SUBJECT_CONFIG[sub].label}</Text>
                      <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 2 }}>{SUBJECT_CONFIG[sub].short}</Text>
                    </View>
                  </View>
                  {active && <CheckCircle2 size={16} color={colors.primary} />}
                </Pressable>
              );
            })}
            {loadingChapters && <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Loading chapters...</Text>}
          </GlassCard>
        )}

        {step === 'chapter' && (
          <GlassCard style={{ gap: 10 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground }}>Select Chapter</Text>
            <View style={{ height: 42, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, gap: 8 }}>
              <Search size={15} color={colors.mutedForeground} />
              <TextInput
                value={chapterSearch}
                onChangeText={setChapterSearch}
                placeholder="Search chapters..."
                placeholderTextColor={colors.mutedForeground}
                style={{ flex: 1, color: colors.foreground, fontSize: 13 }}
              />
            </View>

            {loadingChapters ? (
              <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Loading...</Text>
            ) : (
              filteredChapters.map((chapter) => (
                <Pressable
                  key={chapter._id}
                  onPress={() => handleSelectChapter(chapter)}
                  style={{
                    borderWidth: 1,
                    borderColor: selectedChapter?._id === chapter._id ? colors.primary : colors.border,
                    borderRadius: 12,
                    backgroundColor: selectedChapter?._id === chapter._id ? colors.primary + '15' : colors.card,
                    padding: 12,
                  }}
                >
                  <Text style={{ color: colors.foreground, fontWeight: '600' }}>{formatChapterId(chapter._id)}</Text>
                </Pressable>
              ))
            )}
          </GlassCard>
        )}

        {step === 'subtopics' && (
          <GlassCard style={{ gap: 10 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground }}>Select Topics</Text>
            <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
              {selectedSubTopics.size > 0 ? `${selectedSubTopics.size} selected` : 'Leave empty for all subtopics'}
            </Text>

            {loadingSubTopics ? (
              <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Loading subtopics...</Text>
            ) : (
              topicGroups.map((group) => {
                const selectedCount = group.sub_topics.filter((st) => selectedSubTopics.has(`${group.topic}|||${st.subTopic}`)).length;
                const expanded = expandedTopic === group.topic;
                return (
                  <View key={group.topic} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, overflow: 'hidden' }}>
                    <Pressable
                      onPress={() => setExpandedTopic(expanded ? null : group.topic)}
                      style={{ padding: 12, backgroundColor: colors.muted + '55', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                    >
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 13 }}>{group.topic}</Text>
                        <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 2 }}>
                          {group.sub_topics.length} subtopics - {selectedCount} selected
                        </Text>
                      </View>
                      <ChevronRight size={16} color={colors.mutedForeground} style={{ transform: [{ rotate: expanded ? '90deg' : '0deg' }] }} />
                    </Pressable>

                    {expanded && (
                      <View style={{ padding: 10, gap: 8 }}>
                        <Pressable
                          onPress={() => toggleAllInTopic(group)}
                          style={{ alignSelf: 'flex-end', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: colors.border }}
                        >
                          <Text style={{ fontSize: 11, color: colors.foreground, fontWeight: '600' }}>Toggle All</Text>
                        </Pressable>

                        {group.sub_topics.map((st) => {
                          const key = `${group.topic}|||${st.subTopic}`;
                          const active = selectedSubTopics.has(key);
                          return (
                            <Pressable
                              key={key}
                              onPress={() => toggleSubTopic(group.topic, st.subTopic)}
                              style={{
                                borderWidth: 1,
                                borderColor: active ? colors.primary : colors.border,
                                borderRadius: 10,
                                backgroundColor: active ? colors.primary + '15' : colors.card,
                                padding: 10,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 8,
                              }}
                            >
                              <Text style={{ flex: 1, color: colors.foreground, fontSize: 12 }}>{st.subTopic}</Text>
                              <Badge variant="outline">{st.uid_count}Q</Badge>
                            </Pressable>
                          );
                        })}
                      </View>
                    )}
                  </View>
                );
              })
            )}

            <Button onPress={() => setStep('config')} size="sm">
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Continue</Text>
                <ChevronRight size={14} color="#fff" />
              </View>
            </Button>
          </GlassCard>
        )}

        {step === 'config' && (
          <>
            <GlassCard style={{ gap: 12 }}>
              <Input
                label="Test Title"
                placeholder={`${subject ? SUBJECT_CONFIG[subject].label : 'Custom'} Test`}
                value={title}
                onChangeText={setTitle}
              />

              <View style={{ gap: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.foreground }}>Mode</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {(['practice', 'test'] as Mode[]).map((m) => {
                    const active = mode === m;
                    return (
                      <Pressable
                        key={m}
                        onPress={() => setMode(m)}
                        style={{ flex: 1, borderRadius: 12, borderWidth: 1, borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primary + '18' : colors.card, paddingVertical: 10, alignItems: 'center' }}
                      >
                        <Text style={{ color: active ? colors.primary : colors.mutedForeground, fontWeight: '700', fontSize: 13 }}>
                          {m === 'practice' ? 'Practice' : 'Timed Test'}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <Select
                label="Difficulty"
                options={[
                  { label: 'Mixed', value: 'mixed' },
                  { label: 'Easy', value: 'easy' },
                  { label: 'Medium', value: 'medium' },
                  { label: 'Hard', value: 'hard' },
                ]}
                value={difficulty}
                onValueChange={(v) => setDifficulty(v as Difficulty)}
              />

              <View style={{ gap: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.foreground }}>Question Count</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {QUESTION_PRESETS.map((n) => {
                    const active = numQuestions === n;
                    return (
                      <Pressable
                        key={n}
                        onPress={() => setNumQuestions(n)}
                        style={{ minWidth: 48, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primary : colors.card }}
                      >
                        <Text style={{ color: active ? '#fff' : colors.foreground, fontWeight: '700', fontSize: 12, textAlign: 'center' }}>{n}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <Select
                label="Duration (minutes)"
                options={[
                  { label: '15 minutes', value: '15' },
                  { label: '30 minutes', value: '30' },
                  { label: '45 minutes', value: '45' },
                  { label: '60 minutes', value: '60' },
                  { label: '90 minutes', value: '90' },
                  { label: '120 minutes', value: '120' },
                ]}
                value={String(duration)}
                onValueChange={(v) => setDuration(Number(v))}
              />

              <Switch value={isPYQ} onValueChange={setIsPYQ} label="PYQ Only" />
            </GlassCard>

            <GlassCard style={{ gap: 8 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground }}>Summary</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {subject && <Badge variant="primary">{subject}</Badge>}
                {selectedChapter?._id && <Badge variant="outline">{formatChapterId(selectedChapter._id)}</Badge>}
                <Badge variant="outline">{effectiveQuestionCount} questions</Badge>
                <Badge variant="warning">{duration} min</Badge>
                <Badge variant="secondary">{difficulty}</Badge>
                <Badge variant="outline">{mode}</Badge>
                {isPYQ && <Badge variant="success">PYQ</Badge>}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Target size={14} color={colors.primary} />
                  <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>{effectiveQuestionCount * 4} marks total</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Clock3 size={14} color={colors.warning} />
                  <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>{duration} min window</Text>
                </View>
              </View>
            </GlassCard>

            <Button onPress={handleCreate} loading={creating} disabled={creating} size="lg">
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Zap size={16} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Create & Start Test</Text>
              </View>
            </Button>
          </>
        )}
      </ScrollView>
    </View>
  );
}


