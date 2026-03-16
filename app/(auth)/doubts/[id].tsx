import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView, AnimatePresence } from 'moti';
import { ArrowLeft, ThumbsUp, CheckCircle2, Send, BadgeCheck, MessageSquare } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { apiService } from '@/lib/apiService';
import { GlassCard } from '@/components/ui/GlassCard';
import BottomNav from '@/components/BottomNav';

interface Answer {
  _id: string;
  body: string;
  upvotes: number;
  isVerified: boolean;
  isAccepted: boolean;
  createdAt: string;
  userId: { _id: string; name: string };
}

interface DoubtFull {
  _id: string;
  title: string;
  body: string;
  subject: string;
  chapterId?: string;
  tags?: string[];
  upvotes: number;
  isResolved: boolean;
  views: number;
  createdAt: string;
  userId: { _id: string; name: string };
  answers: Answer[];
}

const subjectEmoji: Record<string, string> = {
  biology: '🧬',
  chemistry: '⚗️',
  physics: '⚛️',
  general: '📌',
};

const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  if (m < 1440) return `${Math.floor(m / 60)}h ago`;
  return `${Math.floor(m / 1440)}d ago`;
};

export default function DoubtDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, shadows } = useTheme();

  const [doubt, setDoubt] = useState<DoubtFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [answerBody, setAnswerBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [upvotedDoubt, setUpvotedDoubt] = useState(false);
  const [upvotedAnswers, setUpvotedAnswers] = useState<Set<string>>(new Set());

  const fetchDoubt = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await apiService.doubts.getDoubtById(id);
      setDoubt(res.data?.data || res.data);
    } catch {
      setError('Failed to load doubt.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDoubt(); }, [id]);

  const handleUpvoteDoubt = async () => {
    if (!doubt) return;
    try {
      const res = await apiService.doubts.upvoteDoubt(doubt._id);
      const { upvotes, upvoted } = res.data?.data || res.data;
      setDoubt(prev => prev ? { ...prev, upvotes } : prev);
      setUpvotedDoubt(upvoted);
    } catch { /* noop */ }
  };

  const handleUpvoteAnswer = async (aid: string) => {
    if (!doubt) return;
    try {
      const res = await apiService.doubts.upvoteAnswer(doubt._id, aid);
      const { upvotes, upvoted } = res.data?.data || res.data;
      setDoubt(prev => {
        if (!prev) return prev;
        return { ...prev, answers: prev.answers.map(a => a._id === aid ? { ...a, upvotes } : a) };
      });
      setUpvotedAnswers(prev => {
        const next = new Set(prev);
        if (upvoted) next.add(aid); else next.delete(aid);
        return next;
      });
    } catch { /* noop */ }
  };

  const handleSubmitAnswer = async () => {
    if (!answerBody.trim() || !doubt) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiService.doubts.postAnswer(doubt._id, { body: answerBody.trim() });
      setAnswerBody('');
      await fetchDoubt();
    } catch {
      setError('Failed to post answer. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptAnswer = async (aid: string) => {
    if (!doubt) return;
    try {
      await apiService.doubts.acceptAnswer(doubt._id, aid);
      await fetchDoubt();
    } catch { /* noop */ }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!doubt) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, padding: 16 }}>
        <View style={{ paddingTop: insets.top, paddingBottom: 16 }}>
          <Pressable onPress={() => router.back()} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
            <ArrowLeft size={20} color={colors.foreground} />
          </Pressable>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <View style={{ width: 64, height: 64, borderRadius: 24, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' }}>
            <MessageSquare size={32} color={colors.mutedForeground} />
          </View>
          <Text style={{ fontSize: 18, fontWeight: '600', color: colors.foreground, fontFamily: 'Inter_600SemiBold' }}>Doubt not found</Text>
        </View>
      </View>
    );
  }

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
        <View style={{ paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable 
            onPress={() => router.push('/(auth)/doubts' as any)} 
            style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}
          >
            <ArrowLeft size={16} color={colors.foreground} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={{ fontSize: 16, fontWeight: '700', color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold' }}>
              Doubt Detail
            </Text>
          </View>
          {doubt.isResolved && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary + '15', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16, borderWidth: 1, borderColor: colors.primary + '30' }}>
              <CheckCircle2 size={12} color={colors.primary} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary, fontFamily: 'Inter_600SemiBold' }}>Resolved</Text>
            </View>
          )}
        </View>
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 150 }}
          showsVerticalScrollIndicator={false}
        >
          {error && (
            <View style={{ backgroundColor: colors.destructive + '15', borderWidth: 1, borderColor: colors.destructive + '40', padding: 12, borderRadius: 16, marginBottom: 16 }}>
              <Text style={{ color: colors.destructive, fontSize: 13 }}>{error}</Text>
            </View>
          )}

          {/* Doubt Card */}
          <MotiView
            from={{ opacity: 0, translateY: 16 }}
            animate={{ opacity: 1, translateY: 0 }}
          >
            <View style={{ backgroundColor: colors.card, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: colors.border, ...shadows.card }}>
              {/* Meta row */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 16 }}>{subjectEmoji[doubt.subject] ?? '📌'}</Text>
                </View>
                <Text style={{ fontSize: 12, fontWeight: '600', textTransform: 'capitalize', color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }}>
                  {doubt.subject}
                </Text>
                {doubt.chapterId && (
                  <Text numberOfLines={1} style={{ flex: 1, fontSize: 10, color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }}>
                    · {doubt.chapterId}
                  </Text>
                )}
                <Text style={{ fontSize: 12, color: colors.mutedForeground, fontFamily: 'Inter_400Regular', marginLeft: 'auto' }}>
                  {timeAgo(doubt.createdAt)}
                </Text>
              </View>

              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground, fontFamily: 'Inter_700Bold', marginBottom: 8, lineHeight: 24 }}>
                {doubt.title}
              </Text>
              <Text style={{ fontSize: 14, color: colors.mutedForeground, fontFamily: 'Inter_400Regular', lineHeight: 22, marginBottom: 12 }}>
                {doubt.body}
              </Text>

              {(doubt.tags?.length ?? 0) > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                  {doubt.tags!.map((tag, i) => (
                    <View key={i} style={{ backgroundColor: colors.muted, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
                      <Text style={{ fontSize: 10, color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }}>#{tag}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Action row */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 4, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border }}>
                <Text style={{ fontSize: 12, color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }}>
                  by <Text style={{ fontWeight: '600', color: colors.foreground, fontFamily: 'Inter_600SemiBold' }}>{doubt.userId?.name ?? 'Unknown'}</Text>
                </Text>
                <Text style={{ fontSize: 12, color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }}>{doubt.views} views</Text>
                
                <Pressable
                  onPress={handleUpvoteDoubt}
                  style={({ pressed }) => ({
                    flexDirection: 'row', alignItems: 'center', gap: 6,
                    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1,
                    backgroundColor: upvotedDoubt ? colors.primary + '15' : colors.card,
                    borderColor: upvotedDoubt ? colors.primary + '40' : colors.border,
                    marginLeft: 'auto',
                    opacity: pressed ? 0.7 : 1
                  })}
                >
                  <ThumbsUp size={14} color={upvotedDoubt ? colors.primary : colors.mutedForeground} />
                  <Text style={{ fontSize: 12, fontWeight: '600', color: upvotedDoubt ? colors.primary : colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }}>
                    {doubt.upvotes}
                  </Text>
                </Pressable>
              </View>
            </View>
          </MotiView>

          {/* Answers Section */}
          <View style={{ marginTop: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <MessageSquare size={16} color={colors.primary} />
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground, fontFamily: 'Inter_700Bold' }}>
                {doubt.answers.length} Answer{doubt.answers.length !== 1 ? 's' : ''}
              </Text>
            </View>

            {doubt.answers.length === 0 ? (
              <View style={{ paddingVertical: 32, alignItems: 'center' }}>
                <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                  <MessageSquare size={24} color={colors.mutedForeground} />
                </View>
                <Text style={{ fontSize: 14, color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }}>No answers yet. Be the first to help!</Text>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                <AnimatePresence>
                  {doubt.answers
                    .slice()
                    .sort((a, b) => {
                      if (a.isAccepted && !b.isAccepted) return -1;
                      if (!a.isAccepted && b.isAccepted) return 1;
                      if (a.isVerified && !b.isVerified) return -1;
                      if (!a.isVerified && b.isVerified) return 1;
                      return b.upvotes - a.upvotes;
                    })
                    .map((ans, i) => (
                      <MotiView
                        key={ans._id}
                        from={{ opacity: 0, translateY: 12 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ delay: i * 50 }}
                      >
                        <View style={{ 
                          backgroundColor: ans.isAccepted ? colors.primary + '0A' : colors.card, 
                          borderRadius: 20, padding: 16, borderWidth: 1, 
                          borderColor: ans.isAccepted ? colors.primary + '30' : colors.border,
                          ...shadows.sm
                        }}>
                          {/* Answer Header */}
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' }}>
                              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.foreground }}>
                                {(ans.userId?.name ?? 'U').charAt(0).toUpperCase()}
                              </Text>
                            </View>
                            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.foreground, fontFamily: 'Inter_600SemiBold' }}>
                              {ans.userId?.name ?? 'User'}
                            </Text>
                            {ans.isVerified && (
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary + '15', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 }}>
                                <BadgeCheck size={10} color={colors.primary} />
                                <Text style={{ fontSize: 10, fontWeight: '600', color: colors.primary, fontFamily: 'Inter_600SemiBold' }}>Expert</Text>
                              </View>
                            )}
                            {ans.isAccepted && (
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.success + '15', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 }}>
                                <CheckCircle2 size={10} color={colors.success} />
                                <Text style={{ fontSize: 10, fontWeight: '600', color: colors.success, fontFamily: 'Inter_600SemiBold' }}>Accepted</Text>
                              </View>
                            )}
                            <Text style={{ fontSize: 10, color: colors.mutedForeground, marginLeft: 'auto', fontFamily: 'Inter_400Regular' }}>
                              {timeAgo(ans.createdAt)}
                            </Text>
                          </View>

                          <Text style={{ fontSize: 14, color: colors.foreground, lineHeight: 22, fontFamily: 'Inter_400Regular', marginBottom: 16 }}>
                            {ans.body}
                          </Text>

                          {/* Answer Actions */}
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
                            <Pressable
                              onPress={() => handleUpvoteAnswer(ans._id)}
                              style={({ pressed }) => ({
                                flexDirection: 'row', alignItems: 'center', gap: 6,
                                paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1,
                                backgroundColor: upvotedAnswers.has(ans._id) ? colors.primary + '15' : colors.card,
                                borderColor: upvotedAnswers.has(ans._id) ? colors.primary + '40' : colors.border,
                                opacity: pressed ? 0.7 : 1
                              })}
                            >
                              <ThumbsUp size={12} color={upvotedAnswers.has(ans._id) ? colors.primary : colors.mutedForeground} />
                              <Text style={{ fontSize: 12, fontWeight: '600', color: upvotedAnswers.has(ans._id) ? colors.primary : colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }}>
                                {ans.upvotes}
                              </Text>
                            </Pressable>

                            {!doubt.isResolved && !ans.isAccepted && (
                              <Pressable
                                onPress={() => handleAcceptAnswer(ans._id)}
                                style={({ pressed }) => ({
                                  flexDirection: 'row', alignItems: 'center', gap: 6, opacity: pressed ? 0.7 : 1
                                })}
                              >
                                <CheckCircle2 size={12} color={colors.primary} />
                                <Text style={{ fontSize: 12, fontWeight: '500', color: colors.primary, fontFamily: 'Inter_500Medium' }}>Accept</Text>
                              </Pressable>
                            )}
                          </View>
                        </View>
                      </MotiView>
                    ))}
                </AnimatePresence>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Answer Input Area */}
        <View style={{ 
          position: 'absolute', bottom: 100, left: 0, right: 0, 
          paddingHorizontal: 16, paddingVertical: 12, 
          backgroundColor: colors.background + 'F0', 
          borderTopWidth: 1, borderTopColor: colors.border 
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
            <TextInput
              value={answerBody}
              onChangeText={setAnswerBody}
              placeholder="Write your answer..."
              placeholderTextColor={colors.mutedForeground}
              multiline
              maxLength={1000}
              style={{
                flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
                borderRadius: 16, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12,
                fontSize: 14, color: colors.foreground, fontFamily: 'Inter_400Regular',
                minHeight: 44, maxHeight: 120, textAlignVertical: 'top'
              }}
            />
            <Pressable
              onPress={handleSubmitAnswer}
              disabled={!answerBody.trim() || submitting}
              style={({ pressed }) => ({
                width: 44, height: 44, borderRadius: 16, backgroundColor: colors.primary,
                alignItems: 'center', justifyContent: 'center',
                opacity: (!answerBody.trim() || submitting) ? 0.5 : pressed ? 0.8 : 1
              })}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Send size={18} color="#fff" />
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      <BottomNav />
    </View>
  );
}
