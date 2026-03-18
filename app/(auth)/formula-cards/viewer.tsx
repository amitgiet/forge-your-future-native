/**
 * FormulaCardViewer - Swipeable individual formula card image viewer.
 *
 * Uses Animated and PanResponder to implement an interactive draggable card 
 * that swipes away (Tinder-style swapping effect), replacing the structural FlatList.
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, Pressable, ActivityIndicator, Image,
  Dimensions, Animated, PanResponder, Modal, ScrollView, Alert, TouchableOpacity
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Bookmark, ThumbsUp, ThumbsDown, ChevronLeft, ChevronRight, Menu } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import apiService from '@/lib/apiService';
import { getImageUrl } from '@/lib/utils';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

interface Card {
  _id: string;
  title: string;
  imgUrl: string;
}

interface CardProgress {
  status: 'unseen' | 'learning' | 'memorized' | 'need_revision';
  isBookmarked: boolean;
}

export default function FormulaCardViewerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const params = useLocalSearchParams();

  const topicTitle = decodeURIComponent((params.topicTitle as string) || '');
  const chapterTitle = (params.chapterTitle as string) || '';
  const subjectTitle = (params.subjectTitle as string) || '';

  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const [progressMap, setProgressMap] = useState<Record<string, CardProgress>>({});
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [imageLoading, setImageLoading] = useState(true);
  const [loadingCardId, setLoadingCardId] = useState<string | null>(null);

  // ── Animation Refs ─────────────────────────────────────────────────────────
  const pan = useRef(new Animated.ValueXY()).current;
  const currentRef = useRef(0);
  const cardsRef = useRef<Card[]>([]);
  const currentCardIdRef = useRef<string | null>(null);

  useEffect(() => { currentRef.current = current; }, [current]);
  useEffect(() => { cardsRef.current = cards; }, [cards]);
  useEffect(() => {
    const card = cards[current];
    if (!card) return;
    currentCardIdRef.current = card._id;
    setLoadingCardId(card._id);
    setImageLoading(!imageErrors[card._id]);
  }, [current, cards, imageErrors]);

  // ── Data fetching ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!topicTitle) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const [cardsRes, progRes] = await Promise.all([
          apiService.formulas.getCards(topicTitle),
          apiService.formulas.getTopicProgress(topicTitle),
        ]);

        if (cardsRes.data?.success) {
          const mapped: Card[] = (cardsRes.data.data || []).map((c: any) => ({
            _id: c._id,
            title: c.title || '',
            imgUrl: getImageUrl(c.imgUrl || ''),
          }));
          setCards(mapped);
        }

        if (progRes.data?.success) {
          const map: Record<string, CardProgress> = {};
          (progRes.data.data || []).forEach((p: any) => {
            map[p.cardId] = { status: p.status, isBookmarked: p.isBookmarked };
          });
          setProgressMap(map);
        }
      } catch (err) {
        console.error('Failed to load formula cards:', err);
        Alert.alert('Error', 'Failed to load formula cards. Please try again.');
      } finally {
        setLoading(false);
      }
    })();
  }, [topicTitle]);

  // ── Gesture Handling (Swiping) ────────────────────────────────────────────
  const forceSwipe = (direction: 'left' | 'right') => {
    const x = direction === 'right' ? SCREEN_WIDTH : -SCREEN_WIDTH;
    Animated.timing(pan, {
      toValue: { x, y: 0 },
      duration: 250,
      useNativeDriver: false
    }).start(() => {
      // after animation -> increment/decrement index and reset position seamlessly
      const nextIdx = direction === 'left' ? currentRef.current + 1 : currentRef.current - 1;
      goTo(nextIdx);
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: (e, gesture) => {
        const cur = currentRef.current;
        const total = cardsRef.current.length;

        // Note: drag right (dx > 0) usually goes to PREVIOUS card
        // drag left (dx < 0) usually goes to NEXT card
        if (gesture.dx > SWIPE_THRESHOLD && cur > 0) {
          forceSwipe('right');
        } else if (gesture.dx < -SWIPE_THRESHOLD && cur < total - 1) {
          forceSwipe('left');
        } else {
          // Not enough drag -> snap back to center
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, friction: 4, useNativeDriver: false }).start();
        }
      }
    })
  ).current;

  // ── Navigation helpers ────────────────────────────────────────────────────
  const goTo = (idx: number) => {
    if (idx < 0 || idx >= cardsRef.current.length) return;

    setImageLoading(true);
    setLoadingCardId(cardsRef.current[idx]?._id || null);
    setCurrent(idx);
    // Reset pan after index switch to avoid flashing previous card at center
    requestAnimationFrame(() => pan.setValue({ x: 0, y: 0 }));

    // Auto mark as learning for new card
    const nextCard = cardsRef.current[idx];
    if (!nextCard) return;
    const prevStatus = progressMap[nextCard._id]?.status;
    if (!prevStatus || prevStatus === 'unseen') {
      setTimeout(() => {
        apiService.formulas
          .updateCardProgress(nextCard._id, { status: 'learning', chapterTitle, topicTitle })
          .then(() => {
            setProgressMap(m => ({
              ...m,
              [nextCard._id]: { ...(m[nextCard._id] || { isBookmarked: false }), status: 'learning' },
            }));
          })
          .catch(() => { });
      }, 500);
    }
  };

  const manualGoNext = () => forceSwipe('left');
  const manualGoPrev = () => forceSwipe('right');

  // ── Progress helpers ──────────────────────────────────────────────────────
  const updateProgress = async (updates: Partial<CardProgress>) => {
    const card = cards[current];
    if (!card) return;
    setProgressMap(prev => ({
      ...prev,
      [card._id]: { ...(prev[card._id] || { status: 'unseen', isBookmarked: false }), ...updates },
    }));
    try {
      await apiService.formulas.updateCardProgress(card._id, { ...updates, chapterTitle, topicTitle });
    } catch { }
  };

  const toggleBookmark = () =>
    updateProgress({ isBookmarked: !(progressMap[cards[current]?._id]?.isBookmarked || false) });
  const setStatus = (status: CardProgress['status']) => updateProgress({ status });

  // ── Render Card Wrapper ───────────────────────────────────────────────────
  const renderInteractiveCard = () => {
    const card = cards[current];
    if (!card) return null;
    const isCurrentCardLoading = loadingCardId === card._id && imageLoading;

    const prog = progressMap[card._id] || { status: 'unseen', isBookmarked: false };
    const borderColor =
      prog.status === 'memorized' ? 'rgba(34,197,94,0.55)' :
        prog.status === 'need_revision' ? 'rgba(239,68,68,0.55)' :
          colors.border;

    const hasError = imageErrors[card._id];

    // Compute rotation based on swipe X for Tinder effect
    const rotate = pan.x.interpolate({
      inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
      outputRange: ['-5deg', '0deg', '5deg'],
      extrapolate: 'clamp',
    });

    const activeStyle = {
      transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate }] as any,
    };

    return (
      <Animated.View
        {...panResponder.panHandlers}
        style={[activeStyle, {
          width: '100%',
          maxWidth: 440,
          borderRadius: 21,
          borderWidth: 2,
          borderColor,
          backgroundColor: '#ffffff',
          overflow: 'hidden',
          shadowColor: prog.status === 'memorized' ? '#22c55e' : prog.status === 'need_revision' ? '#ef4444' : '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.13,
          shadowRadius: 14,
          elevation: 7,
          zIndex: 10,
        }]}
      >
        {hasError ? (
          <View style={{ aspectRatio: 3 / 4, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center', padding: 24, minHeight: 400 }}>
            <Text style={{ fontSize: 13, color: colors.mutedForeground, textAlign: 'center', lineHeight: 20 }}>
              📄 {card.title}{'\n\n'}
              <Text style={{ fontSize: 11, color: colors.mutedForeground }}>Image could not load</Text>
            </Text>
          </View>
        ) : (
          <View style={{ width: '100%', height: SCREEN_HEIGHT * 0.55, minHeight: 400, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' }}>
            <Image
              key={card._id} // Force re-render on card change
              source={{ uri: card.imgUrl }}
              style={{ width: '100%', height: '100%', resizeMode: 'contain', backgroundColor: '#ffffff', opacity: isCurrentCardLoading ? 0 : 1 }}
              onLoadStart={() => {
                if (currentCardIdRef.current === card._id) setImageLoading(true);
              }}
              onLoadEnd={() => {
                if (currentCardIdRef.current === card._id) setImageLoading(false);
              }}
              onError={(e) => {
                console.warn('Image failed:', card.imgUrl, 'Reason:', e.nativeEvent.error);
                if (currentCardIdRef.current === card._id) setImageLoading(false);
                setImageErrors(prev => ({ ...prev, [card._id]: true }));
              }}
              onLoad={() => console.log('Image loaded:', card.imgUrl?.slice(0, 80))}
            />
            {isCurrentCardLoading && (
              <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{ marginTop: 8, fontSize: 12, color: colors.mutedForeground }}>Loading image...</Text>
              </View>
            )}
          </View>
        )}
      </Animated.View>
    );
  };

  // ── Loaders ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginBottom: 12 }} />
        <Text style={{ color: colors.mutedForeground }}>Loading cards...</Text>
      </View>
    );
  }

  if (!cards.length) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ fontSize: 16, color: colors.mutedForeground, textAlign: 'center', marginBottom: 16 }}>
          No cards found for this topic.
        </Text>
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: colors.primary, fontWeight: '600' }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const progress = progressMap[cards[current]?._id] || { status: 'unseen', isBookmarked: false };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>

      {/* ── Header ── */}
      <View style={{
        paddingTop: insets.top + 8, paddingHorizontal: 20, paddingBottom: 16,
        borderBottomWidth: 1, borderBottomColor: colors.border,
        backgroundColor: colors.card,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        zIndex: 20, // Always on top of cards
        elevation: 8,
      }}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={{ fontSize: 13, color: colors.mutedForeground, marginBottom: 4 }} numberOfLines={1}>
            {chapterTitle} • {topicTitle}
          </Text>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground }} numberOfLines={1}>
            {cards[current]?.title || topicTitle}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ backgroundColor: colors.muted, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
            <Text style={{ fontSize: 13, color: colors.mutedForeground, fontWeight: '600' }}>
              {current + 1}/{cards.length}
            </Text>
          </View>
          <Pressable onPress={() => setPaletteOpen(true)} style={{ padding: 8 }} hitSlop={10}>
            <Menu size={24} color={colors.foreground} />
          </Pressable>
          <Pressable
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(auth)/(tabs)/curriculum');
              }
            }}
            style={{ padding: 8, marginLeft: 2 }}
            hitSlop={15}
          >
            <X size={26} color={colors.foreground} />
          </Pressable>
        </View>
      </View>

      {/* ── Card Swiping Area ── */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, zIndex: 10 }}>
        {renderInteractiveCard()}

        {/* Arrow overlays (ignoring touches if dragging) */}
        <View style={{
          position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: 8, pointerEvents: 'box-none', zIndex: 30, elevation: 12
        }}>
          {current > 0 ? (
            <Pressable onPress={manualGoPrev} style={{ padding: 10, backgroundColor: 'rgba(0,0,0,0.20)', borderRadius: 24, zIndex: 31, elevation: 13 }}>
              <ChevronLeft size={28} color={colors.foreground} />
            </Pressable>
          ) : <View style={{ width: 48 }} />}

          {current < cards.length - 1 ? (
            <Pressable onPress={manualGoNext} style={{ padding: 10, backgroundColor: 'rgba(0,0,0,0.20)', borderRadius: 24, zIndex: 31, elevation: 13 }}>
              <ChevronRight size={28} color={colors.foreground} />
            </Pressable>
          ) : <View style={{ width: 48 }} />}
        </View>
      </View>

      {/* ── Dot Pagination ── */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 14, zIndex: 20 }}>
        {cards.length <= 15 ? (
          cards.map((_, i) => (
            <Pressable key={i} onPress={() => goTo(i)}>
              <View style={{
                width: i === current ? 20 : 8, height: 8, borderRadius: 4,
                backgroundColor: i === current ? colors.primary : colors.mutedForeground + '40',
              }} />
            </Pressable>
          ))
        ) : (
          <Text style={{ fontSize: 11, color: colors.mutedForeground }}>
            Swipe left/right to browse {cards.length} cards
          </Text>
        )}
      </View>

      {/* ── Bottom Action Bar ── */}
      <View style={{
        borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.card,
        paddingVertical: 14, paddingHorizontal: 32, paddingBottom: insets.bottom + 14,
        flexDirection: 'row', justifyContent: 'center', gap: 28, zIndex: 20
      }}>
        <Pressable onPress={toggleBookmark} style={{
          padding: 14, borderRadius: 30, backgroundColor: progress.isBookmarked ? colors.primary + '25' : colors.muted,
        }}>
          <Bookmark size={24} color={progress.isBookmarked ? colors.primary : colors.mutedForeground} fill={progress.isBookmarked ? colors.primary : 'none'} />
        </Pressable>
        <Pressable onPress={() => setStatus('memorized')} style={{
          padding: 14, borderRadius: 30, backgroundColor: progress.status === 'memorized' ? '#22c55e40' : '#22c55e18',
        }}>
          <ThumbsUp size={24} color="#22c55e" />
        </Pressable>
        <Pressable onPress={() => setStatus('need_revision')} style={{
          padding: 14, borderRadius: 30, backgroundColor: progress.status === 'need_revision' ? '#ef444440' : '#ef444418',
        }}>
          <ThumbsDown size={24} color="#ef4444" />
        </Pressable>
      </View>

      {/* ── Card Palette Modal ── */}
      <Modal visible={paletteOpen} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setPaletteOpen(false)}>
        <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground }}>Cards Palette</Text>
            <Pressable onPress={() => setPaletteOpen(false)}><X size={24} color={colors.foreground} /></Pressable>
          </View>
          <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            {[{ color: '#3b82f6', label: 'Learning' }, { color: '#22c55e', label: 'Memorized' }, { color: '#ef4444', label: 'Revision' }, { color: colors.border, label: 'Unseen' }].map(item => (
              <View key={item.label} style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: item.color }} />
                <Text style={{ fontSize: 10, color: colors.mutedForeground }}>{item.label}</Text>
              </View>
            ))}
          </View>
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {cards.map((c, i) => {
                const p = progressMap[c._id] || { status: 'unseen', isBookmarked: false };
                const isCur = i === current;
                let bg = colors.card, tc = colors.foreground, bc = colors.border;
                if (p.status === 'learning') { bg = '#3b82f622'; tc = '#3b82f6'; bc = '#3b82f650'; }
                if (p.status === 'memorized') { bg = '#22c55e22'; tc = '#22c55e'; bc = '#22c55e50'; }
                if (p.status === 'need_revision') { bg = '#ef444422'; tc = '#ef4444'; bc = '#ef444450'; }
                return (
                  <TouchableOpacity key={c._id} onPress={() => { goTo(i); setPaletteOpen(false); }}
                    style={{ width: (SCREEN_WIDTH - 32 - 40) / 5, aspectRatio: 1, borderRadius: 8, borderWidth: 2, borderColor: isCur ? colors.primary : bc, backgroundColor: isCur ? colors.primary : bg, alignItems: 'center', justifyContent: 'center', marginTop: -4 }}>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '700',
                        color: isCur ? '#fff' : tc,
                        textAlign: 'center',
                        textAlignVertical: 'center',
                        lineHeight: 14,
                        includeFontPadding: false,
                      }}
                    >
                      {i + 1}
                    </Text>
                    {p.isBookmarked && <View style={{ position: 'absolute', top: -4, right: -4 }}><Bookmark size={12} fill="#f59e0b" color="#f59e0b" /></View>}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </Modal>

    </View>
  );
}
