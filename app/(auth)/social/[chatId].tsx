import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Send } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import apiService from '@/lib/apiService';
import { GlassCard } from '@/components/ui/GlassCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { Avatar } from '@/components/ui/Avatar';

export default function ChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { chatId } = useLocalSearchParams<{ chatId: string }>();

  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const fetchMessages = async () => {
    try {
      const res = await apiService.social.getMessages(chatId, 50, 0);
      if (res.data?.success) {
        setMessages((res.data.data || []).reverse());
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMessages(); }, []);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const res = await apiService.social.sendMessage({ chatId, text: text.trim() });
      if (res.data?.success) {
        setMessages((prev) => [...prev, res.data.data]);
        setText('');
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } catch {} finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isMe = item.isMe || item.isSender;
    return (
      <View style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '80%', marginBottom: 8 }}>
        {!isMe && (
          <Text style={{ fontSize: 11, color: colors.mutedForeground, marginBottom: 2, marginLeft: 4 }}>
            {item.sender?.name || 'User'}
          </Text>
        )}
        <View
          style={{
            backgroundColor: isMe ? colors.primary : colors.card,
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 16,
            borderBottomRightRadius: isMe ? 4 : 16,
            borderBottomLeftRadius: isMe ? 16 : 4,
            borderWidth: isMe ? 0 : 1,
            borderColor: colors.border,
          }}
        >
          <Text style={{ fontSize: 15, color: isMe ? '#fff' : colors.foreground, lineHeight: 22 }}>
            {item.text}
          </Text>
          <Text style={{ fontSize: 10, color: isMe ? 'rgba(255,255,255,0.6)' : colors.mutedForeground, marginTop: 4, alignSelf: 'flex-end' }}>
            {item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={{ paddingTop: insets.top, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 }}>
          <Pressable onPress={() => router.back()} style={{ padding: 8 }}>
            <ArrowLeft size={24} color={colors.foreground} />
          </Pressable>
          <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold' }}>
            Chat
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, padding: 16, gap: 12 }}>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} height={50} width={i % 2 === 0 ? '60%' : '75%'} borderRadius={16} style={{ alignSelf: i % 2 === 0 ? 'flex-end' : 'flex-start' }} />
          ))}
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item, i) => item._id || String(i)}
          renderItem={renderMessage}
          contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 }}>
              <Text style={{ fontSize: 14, color: colors.mutedForeground }}>No messages yet. Say hello!</Text>
            </View>
          }
        />
      )}

      {/* Input */}
      <View
        style={{
          paddingHorizontal: 16, paddingBottom: insets.bottom + 8, paddingTop: 8,
          backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border,
          flexDirection: 'row', alignItems: 'center', gap: 10,
        }}
      >
        <TextInput
          placeholder="Type a message..."
          placeholderTextColor={colors.mutedForeground}
          value={text}
          onChangeText={setText}
          multiline
          style={{
            flex: 1, minHeight: 44, maxHeight: 100, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10,
            backgroundColor: colors.input, color: colors.foreground, fontSize: 15,
            borderWidth: 1, borderColor: colors.border,
          }}
        />
        <Pressable
          onPress={handleSend}
          disabled={!text.trim() || sending}
          style={{
            width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary,
            alignItems: 'center', justifyContent: 'center', opacity: text.trim() && !sending ? 1 : 0.5,
          }}
        >
          <Send size={18} color="#fff" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
