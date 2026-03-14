import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Send, Sparkles, User } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlowOrb } from '@/components/ui/GlowOrb';
import Markdown from 'react-native-markdown-display';
import { io } from 'socket.io-client';
import { API_BASE_URL, getAuthToken } from '@/lib/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function AIAssistantScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const socketRef = useRef<any>(null);

  useEffect(() => {
    const socket = io(API_BASE_URL, {
      transports: ['websocket', 'polling'],
      auth: { token: getAuthToken() },
    });

    socket.on('connect', () => {
      socket.emit('join_ai_chat', user?._id);
    });

    socket.on('ai_response_chunk', (data: { chunk: string }) => {
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant') {
          return [...prev.slice(0, -1), { ...last, content: last.content + data.chunk }];
        }
        return [...prev, { id: Date.now().toString(), role: 'assistant', content: data.chunk, timestamp: new Date() }];
      });
    });

    socket.on('ai_response_done', () => {
      setIsTyping(false);
    });

    socketRef.current = socket;
    return () => { socket.disconnect(); };
  }, [user?._id]);

  const sendMessage = () => {
    if (!input.trim() || isTyping) return;
    const msg: Message = { id: Date.now().toString(), role: 'user', content: input.trim(), timestamp: new Date() };
    setMessages((prev) => [...prev, msg]);
    setInput('');
    setIsTyping(true);
    socketRef.current?.emit('ai_message', { userId: user?._id, message: input.trim() });
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const markdownStyles = {
    body: { color: colors.foreground, fontSize: 15, fontFamily: 'Inter_400Regular' },
    heading1: { color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold' },
    heading2: { color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold' },
    code_inline: { backgroundColor: colors.muted, color: colors.primary, borderRadius: 4, paddingHorizontal: 4 },
    code_block: { backgroundColor: colors.muted, borderRadius: 8, padding: 12 },
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.bottom + 50}
    >
      <View style={{ flex: 1, paddingTop: insets.top }}>
        <GlowOrb color="#0080ff" size={300} top={-100} right={-50} opacity={0.06} />

        {/* Header */}
        <View style={{ padding: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary + '20', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={20} color={colors.primary} />
          </View>
          <View>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold' }}>
              AI Assistant
            </Text>
            <Text style={{ fontSize: 12, color: colors.mutedForeground }}>Ask anything about NEET</Text>
          </View>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 20 }}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.length === 0 && (
            <View style={{ alignItems: 'center', paddingTop: 60, gap: 16 }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primary + '15', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={32} color={colors.primary} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.foreground, textAlign: 'center' }}>
                How can I help with your NEET prep?
              </Text>
              <Text style={{ fontSize: 13, color: colors.mutedForeground, textAlign: 'center', paddingHorizontal: 40 }}>
                Ask me about concepts, solve doubts, or get study tips
              </Text>
            </View>
          )}

          {messages.map((msg) => (
            <View
              key={msg.id}
              style={{
                flexDirection: 'row',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                gap: 8,
              }}
            >
              {msg.role === 'assistant' && (
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary + '20', alignItems: 'center', justifyContent: 'center', marginTop: 4 }}>
                  <Sparkles size={14} color={colors.primary} />
                </View>
              )}
              <View
                style={{
                  maxWidth: '80%',
                  padding: 14,
                  borderRadius: 16,
                  backgroundColor: msg.role === 'user' ? colors.primary : colors.card,
                  borderWidth: msg.role === 'assistant' ? 1 : 0,
                  borderColor: colors.border,
                }}
              >
                {msg.role === 'user' ? (
                  <Text style={{ color: '#fff', fontSize: 15, fontFamily: 'Inter_400Regular' }}>{msg.content}</Text>
                ) : (
                  <Markdown style={markdownStyles}>{msg.content}</Markdown>
                )}
              </View>
            </View>
          ))}

          {isTyping && (
            <View style={{ flexDirection: 'row', gap: 4, paddingLeft: 36 }}>
              {[0, 1, 2].map((i) => (
                <View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.mutedForeground, opacity: 0.5 }} />
              ))}
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View style={{ padding: 16, paddingBottom: insets.bottom + 8, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.card }}>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Ask anything..."
              placeholderTextColor={colors.mutedForeground}
              multiline
              maxLength={2000}
              style={{
                flex: 1,
                minHeight: 44,
                maxHeight: 120,
                backgroundColor: colors.input,
                borderRadius: 22,
                paddingHorizontal: 16,
                paddingVertical: 12,
                fontSize: 15,
                color: colors.foreground,
              }}
              onSubmitEditing={sendMessage}
            />
            <Pressable
              onPress={sendMessage}
              disabled={!input.trim() || isTyping}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: input.trim() ? colors.primary : colors.muted,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Send size={20} color={input.trim() ? '#fff' : colors.mutedForeground} />
            </Pressable>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
