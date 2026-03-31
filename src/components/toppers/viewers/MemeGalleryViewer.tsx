import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, Image, ScrollView, Modal, Animated, Easing, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Bookmark, ChevronLeft, ChevronRight, Menu } from 'lucide-react-native';
import type { ContentItem } from '@/components/toppers/types';
import EmptyResourceState from '@/components/toppers/EmptyResourceState';
import { getPageImageUrl, toDirectImageUrl } from '@/components/toppers/utils';
import { useTheme } from '@/contexts/ThemeContext';

type MemeGalleryViewerProps = {
  memes: ContentItem[];
  currentIndex: number | null;
  onChangeIndex: (index: number) => void;
};

type MemeSlide = {
  id: string;
  src: string;
  memeIndex: number;
  pageIndex: number;
};

const SWIPE_THRESHOLD = 60;
const DRAWER_WIDTH = Math.min(Dimensions.get('window').width * 0.85, 400);

export default function MemeGalleryViewer({ memes, currentIndex, onChangeIndex }: MemeGalleryViewerProps) {
  const { colors } = useTheme();
  const [direction, setDirection] = useState(0);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [savedIndex, setSavedIndex] = useState<number | null>(null);
  const slideAnim = useRef(new Animated.Value(DRAWER_WIDTH)).current;

  const slides = useMemo<MemeSlide[]>(() => {
    return memes.flatMap((meme, memeIndex) => {
      const files = meme.files || [];
      const fallbackImage = meme.driveLink ? [toDirectImageUrl(meme.driveLink, meme.driveId || null)] : [];
      const images = files.length ? files.map(getPageImageUrl).filter(Boolean) : fallbackImage;
      return images.map((src, pageIndex) => ({
        id: `${meme.uniqueId}-${pageIndex}`,
        src,
        memeIndex,
        pageIndex,
      }));
    });
  }, [memes]);

  const storageKey = useMemo(() => {
    const chapterKey = memes.map((meme) => meme.uniqueId).join('|');
    return `toppers_memes_last_slide:${chapterKey}`;
  }, [memes]);

  useEffect(() => {
    if (!slides.length) return;
    const safeIndex = currentIndex !== null && Number.isInteger(currentIndex) && currentIndex >= 0 && currentIndex < slides.length ? currentIndex : 0;
    AsyncStorage.setItem(storageKey, String(safeIndex)).catch(() => {});
  }, [currentIndex, slides.length, storageKey]);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(storageKey)
      .then((raw) => {
        if (!active) return;
        const next = Number(raw);
        if (Number.isInteger(next) && next >= 0) {
          setSavedIndex(next);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [storageKey]);

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: paletteOpen ? 0 : DRAWER_WIDTH,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [paletteOpen, slideAnim]);

  if (!memes.length) {
    return <EmptyResourceState title="Memes unavailable" description="No meme resources are available for this chapter." />;
  }

  if (!slides.length) {
    return <EmptyResourceState title="Memes unavailable" description="No meme images are available for this chapter." />;
  }

  const current = currentIndex !== null && Number.isInteger(currentIndex) && currentIndex >= 0 && currentIndex < slides.length ? currentIndex : 0;
  const currentSlide = slides[current];
  const currentMemeNumber = currentSlide.memeIndex + 1;

  const goTo = (index: number, dir: number) => {
    if (index < 0 || index >= slides.length) return;
    setDirection(dir);
    onChangeIndex(index);
  };

  const handleDragEnd = (_: unknown, info: { offset: { x: number } }) => {
    if (info.offset.x < -SWIPE_THRESHOLD && current < slides.length - 1) {
      goTo(current + 1, 1);
    } else if (info.offset.x > SWIPE_THRESHOLD && current > 0) {
      goTo(current - 1, -1);
    }
  };

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -300 : 300, opacity: 0 }),
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: colors.mutedForeground }}>Meme Viewer</Text>
          <Text style={{ marginTop: 4, fontSize: 18, fontWeight: '700', color: colors.foreground }}>Meme {currentMemeNumber}</Text>
          <Text style={{ marginTop: 4, fontSize: 12, color: colors.mutedForeground }}>
            {current + 1}/{slides.length} image{slides.length === 1 ? '' : 's'} • resumes from last visit
          </Text>
        </View>
        <Pressable onPress={() => setPaletteOpen(true)} style={{ width: 40, height: 40, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card }}>
          <Menu size={18} color={colors.foreground} />
        </Pressable>
      </View>

      <View style={{ flex: 1, position: 'relative', borderRadius: 24, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 12, alignItems: 'center', justifyContent: 'center' }}>
        <Image source={{ uri: currentSlide.src }} style={{ width: '100%', height: '100%', maxHeight: 540, borderRadius: 16, resizeMode: 'contain' }} />
        {current > 0 ? (
          <Pressable onPress={() => goTo(current - 1, -1)} style={{ position: 'absolute', left: 12, top: '50%', marginTop: -20, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
            <ChevronLeft size={20} color={colors.foreground} />
          </Pressable>
        ) : null}
        {current < slides.length - 1 ? (
          <Pressable onPress={() => goTo(current + 1, 1)} style={{ position: 'absolute', right: 12, top: '50%', marginTop: -20, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
            <ChevronRight size={20} color={colors.foreground} />
          </Pressable>
        ) : null}
      </View>

      <View style={{ marginTop: 16, flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
        {slides.length <= 15 ? (
          slides.map((_, index) => (
            <Pressable key={`dot-${index}`} onPress={() => goTo(index, index > current ? 1 : -1)} style={{ width: index === current ? 20 : 8, height: 8, borderRadius: 999, backgroundColor: index === current ? colors.primary : colors.mutedForeground + '4D' }} />
          ))
        ) : (
          <Text style={{ fontSize: 10, fontWeight: '500', color: colors.mutedForeground }}>Swipe left or right to browse all memes</Text>
        )}
      </View>

      <Modal visible={paletteOpen} transparent animationType="none" onRequestClose={() => setPaletteOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }}>
          <Pressable style={{ flex: 1 }} onPress={() => setPaletteOpen(false)} />
          <Animated.View
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              width: DRAWER_WIDTH,
              transform: [{ translateX: slideAnim }],
              backgroundColor: colors.background,
            }}
          >
            <View style={{ flex: 1, backgroundColor: colors.background }}>
              <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, padding: 16, paddingBottom: 12 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground }}>Meme Palette</Text>
              </View>
              <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: 16, paddingVertical: 12 }}>
                <Text style={{ fontSize: 12, color: colors.mutedForeground }}>Jump directly to any meme by number.</Text>
              </View>
              <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 16 }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {slides.map((slide, index) => {
                    const isCurrent = index === current;
                    return (
                      <Pressable
                        key={slide.id}
                        onPress={() => {
                          goTo(index, index > current ? 1 : -1);
                          setPaletteOpen(false);
                        }}
                        style={{
                          width: '18%',
                          aspectRatio: 1,
                          borderRadius: 12,
                          borderWidth: 2,
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderColor: isCurrent ? colors.primary : colors.border,
                          backgroundColor: isCurrent ? colors.primary + '26' : colors.card,
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '700', color: isCurrent ? colors.primary : colors.foreground }}>{index + 1}</Text>
                        {index === savedIndex ? (
                          <Bookmark size={10} color={colors.warning} style={{ position: 'absolute', top: -4, right: -4 }} />
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}
