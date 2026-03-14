import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Dimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Bookmark, BookmarkCheck, Check, X, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import apiService from '@/lib/apiService';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function FormulaCardViewerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ topicTitle: string; chapterTitle?: string }>();

  const [cards, setCards] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiService.formulas.getCards(params.topicTitle);
        if (res.data?.success) setCards(res.data.data || []);
      } catch (error) {
        console.error('Formula cards load error', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [params.topicTitle]);

  const currentCard = cards[currentIndex];

  const handleBookmark = async () => {
    if (!currentCard) return;
    try {
      await apiService.formulas.updateCardProgress(currentCard._id, {
        isBookmarked: !currentCard.isBookmarked,
        chapterTitle: params.chapterTitle,
        topicTitle: params.topicTitle,
      });
      setCards((prev) => {
        const cp = [...prev];
        cp[currentIndex] = { ...cp[currentIndex], isBookmarked: !cp[currentIndex].isBookmarked };
        return cp;
      });
    } catch (error) {
      console.error('Bookmark toggle error', error);
    }
  };

  const handleStatus = async (status: string) => {
    if (!currentCard) return;
    try {
      await apiService.formulas.updateCardProgress(currentCard._id, {
        status,
        chapterTitle: params.chapterTitle,
        topicTitle: params.topicTitle,
      });
      setCards((prev) => {
        const cp = [...prev];
        cp[currentIndex] = { ...cp[currentIndex], status };
        return cp;
      });
      if (currentIndex < cards.length - 1) {
        setCurrentIndex(currentIndex + 1);
      }
    } catch (error) {
      console.error('Update status error', error);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
        <View style={{ padding: 16, gap: 12 }}>
          <Skeleton height={40} borderRadius={8} />
          <Skeleton height={300} borderRadius={16} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: insets.top, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 }}>
          <Pressable onPress={() => router.back()} style={{ padding: 8 }}><ArrowLeft size={24} color={colors.foreground} /></Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold' }} numberOfLines={1}>{params.topicTitle}</Text>
            <Text style={{ fontSize: 12, color: colors.mutedForeground }}>{currentIndex + 1} of {cards.length}</Text>
          </View>
          {currentCard && (
            <Pressable onPress={handleBookmark} style={{ padding: 8 }}>
              {currentCard.isBookmarked ? <BookmarkCheck size={22} color={colors.warning} /> : <Bookmark size={22} color={colors.mutedForeground} />}
            </Pressable>
          )}
        </View>
      </View>

      <View style={{ flex: 1, justifyContent: 'center', padding: 16 }}>
        {cards.length === 0 ? (
          <GlassCard style={{ alignItems: 'center', paddingVertical: 40, gap: 10 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.foreground }}>No cards available</Text>
            <Text style={{ fontSize: 13, color: colors.mutedForeground }}>Try another topic or refresh.</Text>
          </GlassCard>
        ) : currentCard ? (
          <GlassCard style={{ minHeight: 300, justifyContent: 'center', padding: 20, gap: 16 }}>
            {currentCard.title && <Text style={{ fontSize: 18, fontWeight: '700', color: colors.primary, fontFamily: 'PlusJakartaSans_700Bold', textAlign: 'center' }}>{currentCard.title}</Text>}
            <Text style={{ fontSize: 20, fontWeight: '600', color: colors.foreground, textAlign: 'center', lineHeight: 28 }}>{currentCard.formula || currentCard.content || currentCard.text}</Text>
            {currentCard.description && <Text style={{ fontSize: 14, color: colors.mutedForeground, textAlign: 'center', lineHeight: 22 }}>{currentCard.description}</Text>}
            {currentCard.status && <Badge variant={currentCard.status === 'mastered' ? 'success' : currentCard.status === 'learning' ? 'warning' : 'outline'} style={{ alignSelf: 'center' }}>{currentCard.status}</Badge>}
          </GlassCard>
        ) : null}
      </View>

      <View style={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 14, gap: 10 }}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button size="sm" variant="outline" onPress={() => handleStatus('need_revision')} style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><X size={14} color={colors.destructive} /><Text style={{ color: colors.destructive, fontSize: 13, fontWeight: '600' }}>Need Review</Text></View>
          </Button>
          <Button size="sm" onPress={() => handleStatus('mastered')} style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Check size={14} color="#fff" /><Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>Mastered</Text></View>
          </Button>
        </View>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <Pressable onPress={() => setCurrentIndex(Math.max(0, currentIndex - 1))} disabled={currentIndex === 0} style={{ padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border, opacity: currentIndex === 0 ? 0.4 : 1 }}><ChevronLeft size={20} color={colors.foreground} /></Pressable>
          <View style={{ flex: 1, alignItems: 'center' }}><Text style={{ fontSize: 14, color: colors.mutedForeground }}>{currentIndex + 1} / {cards.length}</Text></View>
          <Pressable onPress={() => setCurrentIndex(Math.min(cards.length - 1, currentIndex + 1))} disabled={currentIndex === cards.length - 1} style={{ padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border, opacity: currentIndex === cards.length - 1 ? 0.4 : 1 }}><ChevronRight size={20} color={colors.foreground} /></Pressable>
        </View>
      </View>
    </View>
  );
}
