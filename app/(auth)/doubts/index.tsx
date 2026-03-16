import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, ActivityIndicator, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { ArrowLeft, MessageCircleQuestion, Plus, CheckCircle2, ThumbsUp, ChevronRight, Search, Send, X } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { apiService } from '@/lib/apiService';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import BottomNav from '@/components/BottomNav';

interface DoubtItem {
  _id: string;
  title: string;
  body: string;
  subject: string;
  chapterId?: string;
  tags?: string[];
  upvotes: number;
  answerCount: number;
  isResolved: boolean;
  views: number;
  createdAt: string;
  userId: { _id: string; name: string };
}

const SUBJECTS = ['all', 'biology', 'chemistry', 'physics', 'general'] as const;
type SubjectFilter = typeof SUBJECTS[number];

const subjectEmoji: Record<string, string> = {
  biology: '🧬',
  chemistry: '⚗️',
  physics: '⚛️',
  general: '📌',
};

// ── Doubt Card ───────────────────────────────────────────────────────────────
function DoubtCard({ doubt, onClick, colors, shadows }: { doubt: DoubtItem; onClick: () => void; colors: any; shadows: any }) {
  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 60) return `${m}m ago`;
    if (m < 1440) return `${Math.floor(m / 60)}h ago`;
    return `${Math.floor(m / 1440)}d ago`;
  };

  return (
    <Pressable onPress={onClick} style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1, marginBottom: 12 })}>
      <View style={{
        backgroundColor: colors.card,
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
        ...shadows.card
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 20 }}>{subjectEmoji[doubt.subject] ?? '📌'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              {doubt.isResolved && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary + '15', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}>
                  <CheckCircle2 size={10} color={colors.primary} />
                  <Text style={{ fontSize: 10, fontWeight: '600', color: colors.primary, fontFamily: 'Inter_600SemiBold' }}>Resolved</Text>
                </View>
              )}
              <Text style={{ fontSize: 10, color: colors.mutedForeground, marginLeft: 'auto', fontFamily: 'Inter_400Regular' }}>
                {timeAgo(doubt.createdAt)}
              </Text>
            </View>
            <Text numberOfLines={2} style={{ fontSize: 14, fontWeight: '700', color: colors.foreground, fontFamily: 'Inter_700Bold', lineHeight: 20 }}>
              {doubt.title}
            </Text>
            <Text numberOfLines={1} style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 4, fontFamily: 'Inter_400Regular' }}>
              {doubt.body}
            </Text>
          </View>
          <ChevronRight size={16} color={colors.mutedForeground} style={{ marginTop: 12 }} />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <ThumbsUp size={12} color={colors.mutedForeground} />
            <Text style={{ fontSize: 12, color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }}>{doubt.upvotes}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <MessageCircleQuestion size={12} color={colors.mutedForeground} />
            <Text style={{ fontSize: 12, color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }}>{doubt.answerCount}</Text>
          </View>
          <Text style={{ fontSize: 12, fontWeight: '500', color: colors.foreground, marginLeft: 'auto', fontFamily: 'Inter_500Medium' }}>
            {doubt.userId?.name ?? 'Unknown'}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function DoubtForumScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, shadows } = useTheme();

  const [doubts, setDoubts] = useState<DoubtItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [subject, setSubject] = useState<SubjectFilter>('all');
  const [search, setSearch] = useState('');
  const [showResolved, setShowResolved] = useState(false);
  
  // Modal State
  const [showCreate, setShowCreate] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createBody, setCreateBody] = useState('');
  const [createSubject, setCreateSubject] = useState<'biology' | 'chemistry' | 'physics' | 'general'>('general');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  const fetchDoubts = useCallback(async (q?: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (subject !== 'all') params.set('subject', subject);
      if (q?.trim()) params.set('search', q.trim());
      if (showResolved) params.set('isResolved', 'true');
      
      const res = await apiService.doubts.getDoubts(Object.fromEntries(params.entries()));
      setDoubts(res.data?.data || res.data || []);
    } catch {
      setError('Failed to load doubts. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [subject, showResolved]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => fetchDoubts(search), 350);
    return () => clearTimeout(delayDebounceFn);
  }, [fetchDoubts, search]);

  const handleCreateDoubt = async () => {
    if (!createTitle.trim() || !createBody.trim()) { setCreateError('Title and description are required'); return; }
    setCreateLoading(true);
    try {
      await apiService.doubts.createDoubt({ title: createTitle.trim(), body: createBody.trim(), subject: createSubject });
      setShowCreate(false);
      setCreateTitle('');
      setCreateBody('');
      setCreateSubject('general');
      fetchDoubts(search);
    } catch {
      setCreateError('Failed to post doubt. Please try again.');
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header (Sticky) */}
      <View style={{ 
        paddingTop: insets.top, 
        backgroundColor: colors.background, 
        borderBottomWidth: 1, 
        borderBottomColor: colors.border,
        zIndex: 10 
      }}>
        <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
          {/* Top Row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <Pressable 
              onPress={() => router.back()} 
              style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}
            >
              <ArrowLeft size={16} color={colors.foreground} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MessageCircleQuestion size={20} color={colors.primary} />
                <Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold' }}>
                  Doubt Forum
                </Text>
              </View>
              <Text style={{ fontSize: 12, color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }}>
                Ask & answer with the community
              </Text>
            </View>
            <Pressable
              onPress={() => setShowCreate(true)}
              style={({ pressed }) => ({
                height: 36, paddingHorizontal: 12, borderRadius: 12, backgroundColor: colors.primary,
                flexDirection: 'row', alignItems: 'center', gap: 6, opacity: pressed ? 0.8 : 1
              })}
            >
              <Plus size={16} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700', fontFamily: 'Inter_700Bold' }}>Ask</Text>
            </Pressable>
          </View>

          {/* Search Row */}
          <View style={{ 
            flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, 
            borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, height: 44 
          }}>
            <Search size={16} color={colors.mutedForeground} style={{ marginRight: 8 }} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search doubts..."
              placeholderTextColor={colors.mutedForeground}
              style={{ flex: 1, color: colors.foreground, fontSize: 14, fontFamily: 'Inter_400Regular' }}
            />
          </View>

          {/* Filter Row */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }} contentContainerStyle={{ gap: 8, paddingRight: 16 }}>
            {SUBJECTS.map((s) => (
              <Pressable
                key={s}
                onPress={() => setSubject(s)}
                style={{
                  paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1,
                  backgroundColor: subject === s ? colors.primary : colors.card,
                  borderColor: subject === s ? colors.primary : colors.border,
                }}
              >
                <Text style={{ 
                  fontSize: 12, fontWeight: '600', textTransform: 'capitalize', fontFamily: 'Inter_600SemiBold',
                  color: subject === s ? '#fff' : colors.mutedForeground 
                }}>
                  {s === 'all' ? 'All' : s}
                </Text>
              </Pressable>
            ))}
            <Pressable
              onPress={() => setShowResolved(!showResolved)}
              style={{
                paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1,
                flexDirection: 'row', alignItems: 'center', gap: 6,
                backgroundColor: showResolved ? colors.primary : colors.card,
                borderColor: showResolved ? colors.primary : colors.border,
              }}
            >
              <CheckCircle2 size={12} color={showResolved ? '#fff' : colors.mutedForeground} />
              <Text style={{ 
                fontSize: 12, fontWeight: '600', fontFamily: 'Inter_600SemiBold',
                color: showResolved ? '#fff' : colors.mutedForeground 
              }}>
                Resolved
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>

      {/* Body List */}
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {error && (
          <View style={{ backgroundColor: colors.destructive + '15', borderWidth: 1, borderColor: colors.destructive + '40', padding: 16, borderRadius: 16, marginBottom: 16 }}>
            <Text style={{ color: colors.destructive, fontSize: 14 }}>{error}</Text>
          </View>
        )}

        {loading ? (
          <View style={{ gap: 12 }}>
            {[1, 2, 3, 4].map(i => (
              <View key={i} style={{ height: 112, backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.border, opacity: 0.5 }} />
            ))}
          </View>
        ) : doubts.length === 0 ? (
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 64 }}>
            <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <MessageCircleQuestion size={32} color={colors.mutedForeground} />
            </View>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.foreground, fontFamily: 'Inter_600SemiBold', marginBottom: 4 }}>
              No doubts found
            </Text>
            <Text style={{ fontSize: 13, color: colors.mutedForeground, textAlign: 'center', fontFamily: 'Inter_400Regular', marginBottom: 16 }}>
              Be the first to ask a doubt!
            </Text>
            <Button onPress={() => setShowCreate(true)}>Ask a Doubt</Button>
          </View>
        ) : (
          <View>
            {doubts.map((d, index) => (
              <MotiView
                key={d._id}
                from={{ opacity: 0, translateY: 10 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ delay: index * 50 }}
              >
                <DoubtCard doubt={d} onClick={() => router.push(`/(auth)/doubts/${d._id}` as any)} colors={colors} shadows={shadows} />
              </MotiView>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Create Doubt Modal */}
      <Modal visible={showCreate} animationType="slide" transparent={true} onRequestClose={() => setShowCreate(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ 
            backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, 
            padding: 20, paddingBottom: insets.bottom + 20 
          }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.muted, alignSelf: 'center', marginBottom: 16 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold' }}>Ask a Doubt</Text>
              <Pressable onPress={() => setShowCreate(false)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} color={colors.mutedForeground} />
              </Pressable>
            </View>

            {createError ? (
              <View style={{ backgroundColor: colors.destructive + '15', padding: 12, borderRadius: 12, marginBottom: 12 }}>
                <Text style={{ color: colors.destructive, fontSize: 13 }}>{createError}</Text>
              </View>
            ) : null}

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 8 }}>
              {(['biology', 'chemistry', 'physics', 'general'] as const).map(s => (
                <Pressable
                  key={s}
                  onPress={() => setCreateSubject(s)}
                  style={{
                    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1,
                    flexDirection: 'row', alignItems: 'center', gap: 6,
                    backgroundColor: createSubject === s ? colors.primary : colors.background,
                    borderColor: createSubject === s ? colors.primary : colors.border,
                  }}
                >
                  <Text style={{ fontSize: 14 }}>{subjectEmoji[s]}</Text>
                  <Text style={{ 
                    fontSize: 13, fontWeight: '600', textTransform: 'capitalize', fontFamily: 'Inter_600SemiBold',
                    color: createSubject === s ? '#fff' : colors.mutedForeground 
                  }}>
                    {s}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <TextInput
              value={createTitle}
              onChangeText={setCreateTitle}
              placeholder="Short title for your doubt..."
              placeholderTextColor={colors.mutedForeground}
              style={{ 
                backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, 
                borderRadius: 12, padding: 14, fontSize: 14, color: colors.foreground, fontFamily: 'Inter_400Regular', marginBottom: 12 
              }}
            />

            <TextInput
              value={createBody}
              onChangeText={setCreateBody}
              placeholder="Describe your doubt in detail..."
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={4}
              style={{ 
                backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, 
                borderRadius: 12, padding: 14, fontSize: 14, color: colors.foreground, fontFamily: 'Inter_400Regular', 
                minHeight: 100, textAlignVertical: 'top', marginBottom: 20 
              }}
            />

            <Button onPress={handleCreateDoubt} disabled={createLoading} style={{ height: 52 }}>
              {createLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Send size={16} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', fontFamily: 'Inter_700Bold' }}>Post Doubt</Text>
                </View>
              )}
            </Button>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <BottomNav />
    </View>
  );
}
