import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Sparkles, Send, Bot, User, X, TrendingUp, BookOpen, Target, Download, MessageSquare } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import apiService from '@/lib/apiService';
import api from '@/lib/api';
import Markdown from 'react-native-markdown-display';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Native equivalent of web AIAssistant with chat, basic markdown, and actions
interface Message {
  role: 'user' | 'ai';
  content: string;
  timestamp: Date;
  mode?: 'coach' | 'analysis' | 'doubt';
  actions?: Array<{ id: string; label: string; actionType: string; payload?: any }>;
}

const CACHE_KEY = 'aiChat.cache.native';

export default function AIAssistantScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuth();
  const params = useLocalSearchParams();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [mode, setMode] = useState<'coach' | 'analysis' | 'doubt'>('coach');
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (params.prefillPrompt && typeof params.prefillPrompt === 'string') {
      setInput(params.prefillPrompt);
    }
  }, [params.prefillPrompt]);

  useEffect(() => {
    loadCache();
  }, []);

  const loadCache = async () => {
    try {
      const raw = await AsyncStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.chatId) setChatId(parsed.chatId);
        if (parsed.mode) setMode(parsed.mode);
        if (Array.isArray(parsed.messages)) {
          const hydrated = parsed.messages.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp)
          }));
          setMessages(hydrated);
        }
      }
    } catch (e) { console.warn(e); }
  };

  const persistCache = async (nextChatId: string | null, nextMessages: Message[], nextMode: string) => {
    try {
      const trimmed = nextMessages.slice(-15);
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({
        chatId: nextChatId, mode: nextMode, messages: trimmed
      }));
    } catch {}
  };

  useEffect(() => {
    persistCache(chatId, messages, mode);
  }, [messages, chatId, mode]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMessage: Message = { role: 'user', content: text, timestamp: new Date(), mode };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await api.post('/ai-chat/message', {
        message: text,
        chatId,
        mode,
        clientContext: { route: 'native-app', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }
      });
      
      const nextChatId = response.data?.data?.chatId;
      if (!chatId && nextChatId) setChatId(nextChatId);
      
      const payload = response.data?.data || {};
      const aiMessage: Message = {
        role: 'ai',
        content: String(payload.message || ''),
        timestamp: new Date(),
        mode,
        actions: Array.isArray(payload.ui?.actions) ? payload.ui.actions : undefined,
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', content: 'Sorry, I encountered an error. Please try again.', timestamp: new Date() }]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setChatId(null);
    AsyncStorage.removeItem(CACHE_KEY);
  };

  const handleActionClick = (action: any) => {
    const type = String(action?.actionType || '');
    const payload = action?.payload || {};

    if (type === 'resume_curriculum' || type === 'start_curriculum_quiz') {
      router.push('/(auth)/curriculum/browser' as any);
      return;
    }
    if (type === 'open_mock_pdf' && payload.questionPdf) {
      router.push({ pathname: '/(auth)/(tabs)/tests', params: { pdfUrl: payload.questionPdf } } as any);
      return;
    }
    if (type === 'open_test_series') { router.push('/(auth)/(tabs)/tests' as any); return; }
    if (type === 'take_quiz' || type === 'start_ai_quiz') {
      if (payload.quizId) {
        // Direct navigation to quiz session if we support it natively
        router.push({ pathname: '/(auth)/practice/session/[challengeId]?ai=true', params: { challengeId: payload.quizId } } as any);
      }
      return;
    }
  };

  const quickQuestions = [
    { icon: TrendingUp, text: "What are my weak points?", color: "#ef4444" },
    { icon: BookOpen, text: "Review my last quiz", color: "#3b82f6" },
    { icon: Target, text: "Build my today plan", color: "#22c55e" }
  ];

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View style={{ paddingTop: insets.top, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.card, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' }}>
            <ArrowLeft size={20} color={colors.foreground} />
          </Pressable>
          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={18} color="#fff" />
          </View>
          <View>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground }}>AI Study Assistant</Text>
            <Text style={{ fontSize: 11, color: colors.mutedForeground }}>Powered by your study data</Text>
          </View>
        </View>
        
        {messages.length > 0 && (
          <Pressable onPress={startNewChat} style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
            <X size={20} color={colors.mutedForeground} />
          </Pressable>
        )}
      </View>

      {/* Mode Selector */}
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        {[{ id: 'coach', label: '🧠 Coach' }, { id: 'analysis', label: '📊 Analysis' }, { id: 'doubt', label: '❓ Doubt' }].map(m => (
          <Pressable
            key={m.id}
            onPress={() => setMode(m.id as any)}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 6,
              borderRadius: 20,
              backgroundColor: mode === m.id ? colors.primary : colors.muted,
              borderWidth: 1,
              borderColor: mode === m.id ? colors.primary : colors.border
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: mode === m.id ? '#fff' : colors.mutedForeground }}>{m.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Chat Area */}
      <ScrollView ref={scrollViewRef} contentContainerStyle={{ padding: 16, paddingBottom: 24, flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        {messages.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 }}>
             <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: colors.primary + '20', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
               <MessageSquare size={32} color={colors.primary} />
             </View>
             <Text style={{ fontSize: 20, fontWeight: '800', color: colors.foreground, marginBottom: 4 }}>Hi {user?.name?.split(' ')[0] || 'there'}! 👋</Text>
             <Text style={{ fontSize: 14, color: colors.mutedForeground, marginBottom: 32, textAlign: 'center' }}>I can help you analyze your performance and study better</Text>

             <View style={{ width: '100%', gap: 12 }}>
               {quickQuestions.map((q, i) => (
                 <Pressable
                   key={i}
                   onPress={() => setInput(q.text)}
                   style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 16 }}
                 >
                   <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: q.color + '15', alignItems: 'center', justifyContent: 'center' }}>
                     <q.icon size={18} color={q.color} />
                   </View>
                   <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: colors.foreground }}>{q.text}</Text>
                 </Pressable>
               ))}
             </View>
          </View>
        ) : (
          <View style={{ gap: 16 }}>
            {messages.map((msg, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 10, justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                {msg.role === 'ai' && (
                  <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
                    <Bot size={16} color="#fff" />
                  </View>
                )}
                
                <View style={{
                  maxWidth: '80%',
                  padding: 14,
                  borderRadius: 16,
                  backgroundColor: msg.role === 'user' ? colors.primary : colors.card,
                  borderWidth: msg.role === 'user' ? 0 : 1,
                  borderColor: colors.border,
                  borderBottomRightRadius: msg.role === 'user' ? 4 : 16,
                  borderBottomLeftRadius: msg.role === 'ai' ? 4 : 16,
                }}>
                  {msg.role === 'user' ? (
                    <Text style={{ color: '#fff', fontSize: 15 }}>{msg.content}</Text>
                  ) : (
                    <View>
                      <Markdown style={{ body: { color: colors.foreground, fontSize: 14, lineHeight: 22 } }}>{msg.content}</Markdown>
                      {msg.actions && msg.actions.length > 0 && (
                        <View style={{ marginTop: 12, gap: 8 }}>
                          {msg.actions.map(action => (
                            <Pressable 
                              key={action.id || action.label} 
                              onPress={() => handleActionClick(action)}
                              style={{ paddingVertical: 10, paddingHorizontal: 14, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 10 }}
                            >
                              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground }}>{action.label}</Text>
                              <Text style={{ fontSize: 11, color: colors.mutedForeground, marginTop: 2 }}>Execute action</Text>
                            </Pressable>
                          ))}
                        </View>
                      )}
                    </View>
                  )}
                  <Text style={{ fontSize: 9, color: msg.role === 'user' ? 'rgba(255,255,255,0.6)' : colors.mutedForeground, marginTop: 6, alignSelf: 'flex-end' }}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>

                {msg.role === 'user' && (
                  <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' }}>
                    <User size={16} color={colors.foreground} />
                  </View>
                )}
              </View>
            ))}

            {loading && (
              <View style={{ flexDirection: 'row', gap: 10 }}>
                 <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
                    <Bot size={16} color="#fff" />
                  </View>
                  <View style={{ padding: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 16, borderBottomLeftRadius: 4 }}>
                    <ActivityIndicator size="small" color={colors.primary} />
                  </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Input Area */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 12, paddingBottom: insets.bottom + 12, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.card, flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Ask me anything..."
          placeholderTextColor={colors.mutedForeground}
          style={{ flex: 1, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12, color: colors.foreground, fontSize: 15 }}
          multiline
          maxLength={500}
        />
        <Pressable 
          onPress={sendMessage}
          disabled={!input.trim() || loading}
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: input.trim() && !loading ? colors.primary : colors.muted, alignItems: 'center', justifyContent: 'center', opacity: (!input.trim() || loading) ? 0.5 : 1 }}
        >
          {loading ? <ActivityIndicator size="small" color="#fff" /> : <Send size={20} color={input.trim() ? "#fff" : colors.mutedForeground} style={{ marginLeft: -2 }} />}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
