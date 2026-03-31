import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Crown } from 'lucide-react-native';
import BottomNav from '@/components/BottomNav';
import EmptyResourceState from '@/components/toppers/EmptyResourceState';
import ResourceChapterHeader from '@/components/toppers/ResourceChapterHeader';
import ResourceChapterList from '@/components/toppers/ResourceChapterList';
import ResourceSubjectPicker from '@/components/toppers/ResourceSubjectPicker';
import ResourceTypeGrid from '@/components/toppers/ResourceTypeGrid';
import type { ChapterResourceDetail, ResourceChapterSummary, ResourceTypeKey, Subject } from '@/components/toppers/types';
import { SUBJECT_META, getResourceStats, getResourceTiles } from '@/components/toppers/utils';
import CrosswordViewer from '@/components/toppers/viewers/CrosswordViewer';
import GridlockViewer from '@/components/toppers/viewers/GridlockViewer';
import MemeGalleryViewer from '@/components/toppers/viewers/MemeGalleryViewer';
import NotesViewer from '@/components/toppers/viewers/NotesViewer';
import PodcastViewer from '@/components/toppers/viewers/PodcastViewer';
import { useTheme } from '@/contexts/ThemeContext';
import apiService from '@/lib/apiService';

const SUBJECTS: Subject[] = ['biology', 'chemistry', 'physics'];
const RESOURCE_KEYS: ResourceTypeKey[] = ['notes', 'podcasts', 'crosswords', 'memes', 'gridlocks'];
const BASE_PATH = '/toppers-essentials';

type Props = {
  subject?: string | null;
  chapterSlug?: string | null;
  resourceType?: string | null;
  item?: string | null;
  slide?: string | null;
};

const isSubject = (value?: string | null): value is Subject =>
  Boolean(value && SUBJECTS.includes(value as Subject));

const isResourceType = (value?: string | null): value is ResourceTypeKey =>
  Boolean(value && RESOURCE_KEYS.includes(value as ResourceTypeKey));

export default function ToppersEssentialsScreen({
  subject,
  chapterSlug,
  resourceType,
  item,
  slide,
}: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const selectedSubject = isSubject(subject) ? subject : null;
  const selectedChapterSlug = chapterSlug ? decodeURIComponent(chapterSlug) : null;
  const activeResource = isResourceType(resourceType) ? resourceType : null;

  const [chapters, setChapters] = useState<ResourceChapterSummary[]>([]);
  const [chapterDetail, setChapterDetail] = useState<ChapterResourceDetail | null>(null);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [loadingChapterDetail, setLoadingChapterDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedChapter = useMemo(
    () => chapters.find((chapter) => chapter.slug === selectedChapterSlug) || null,
    [chapters, selectedChapterSlug]
  );
  const tiles = useMemo(() => getResourceTiles(chapterDetail), [chapterDetail]);
  const stats = useMemo(() => getResourceStats(chapterDetail), [chapterDetail]);

  useEffect(() => {
    if (!selectedSubject) {
      setChapters([]);
      setChapterDetail(null);
      return;
    }

    const loadChapters = async () => {
      setLoadingChapters(true);
      setError(null);
      setChapterDetail(null);
      try {
        const res = await apiService.chapterResources.getChapters(selectedSubject);
        const data = Array.isArray(res.data?.data) ? res.data.data : [];
        setChapters(data);
      } catch (err: any) {
        setChapters([]);
        setError(err?.response?.data?.error || 'Failed to load chapter resources.');
      } finally {
        setLoadingChapters(false);
      }
    };

    loadChapters();
  }, [selectedSubject]);

  useEffect(() => {
    if (!selectedSubject || !selectedChapterSlug) {
      setChapterDetail(null);
      return;
    }

    const loadChapterDetail = async () => {
      setLoadingChapterDetail(true);
      setError(null);
      try {
        const res = await apiService.chapterResources.getChapterDetail(selectedSubject, selectedChapterSlug);
        setChapterDetail(res.data?.data || null);
      } catch (err: any) {
        setChapterDetail(null);
        setError(err?.response?.data?.error || 'Failed to load chapter details.');
      } finally {
        setLoadingChapterDetail(false);
      }
    };

    loadChapterDetail();
  }, [selectedSubject, selectedChapterSlug]);

  const crosswordIndex = (() => {
    const raw = Number(item);
    return Number.isInteger(raw) && raw > 0 ? raw - 1 : null;
  })();

  const memeSlideIndex = (() => {
    const raw = Number(slide);
    return Number.isInteger(raw) && raw > 0 ? raw - 1 : null;
  })();

  const updateParams = (updates: Record<string, string | null>) => {
    router.setParams({
      item: updates.item === null ? undefined : updates.item,
      slide: updates.slide === null ? undefined : updates.slide,
    } as any);
  };

  const goBack = () => {
    if (activeResource === 'crosswords' && crosswordIndex !== null) {
      updateParams({ item: null, slide: null });
      return;
    }
    if (activeResource && selectedSubject && selectedChapterSlug) {
      router.push(`${BASE_PATH}/${selectedSubject}/${selectedChapterSlug}` as any);
      return;
    }
    if (selectedChapterSlug && selectedSubject) {
      router.push(`${BASE_PATH}/${selectedSubject}` as any);
      return;
    }
    if (selectedSubject) {
      router.push(BASE_PATH as any);
      return;
    }
    router.back();
  };

  const navigateToSubject = (nextSubject: Subject) => {
    router.push(`${BASE_PATH}/${nextSubject}` as any);
  };

  const navigateToChapter = (chapter: ResourceChapterSummary) => {
    router.push(`${BASE_PATH}/${chapter.subject}/${encodeURIComponent(chapter.slug)}` as any);
  };

  const navigateToResource = (nextResource: ResourceTypeKey) => {
    router.push(`${BASE_PATH}/${selectedSubject}/${selectedChapterSlug}/${nextResource}` as any);
  };

  const renderViewer = () => {
    if (!chapterDetail || !activeResource) return null;

    switch (activeResource) {
      case 'notes':
        return <NotesViewer notes={chapterDetail.notes} />;
      case 'podcasts':
        return <PodcastViewer podcasts={chapterDetail.podcasts || []} />;
      case 'crosswords':
        return (
          <CrosswordViewer
            crosswords={chapterDetail.crosswords || []}
            selectedIndex={crosswordIndex}
            onSelectIndex={(index) => updateParams({ item: String(index + 1), slide: null })}
            onBackToList={() => updateParams({ item: null, slide: null })}
          />
        );
      case 'memes':
        return (
          <MemeGalleryViewer
            memes={chapterDetail.memes || []}
            currentIndex={memeSlideIndex}
            onChangeIndex={(index) => updateParams({ slide: String(index + 1), item: null })}
          />
        );
      case 'gridlocks':
        return <GridlockViewer gridlocks={chapterDetail.gridlocks || []} />;
      default:
        return null;
    }
  };

  const pageTitle = selectedChapter
    ? chapterDetail?.chapterName || selectedChapter.chapterName
    : selectedSubject
      ? `${SUBJECT_META[selectedSubject].label} Chapters`
      : "Toppers' Essentials";

  const pageSubtitle = selectedChapter
    ? 'Notes & fun resources for this chapter'
    : selectedSubject
      ? 'Choose a chapter resource'
      : 'Select a subject to explore chapter resources';

  const activeResourceTitle = activeResource
    ? tiles.find((tile) => tile.key === activeResource)?.title || 'Resource'
    : '';

  if (activeResource) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {activeResource !== 'crosswords' || crosswordIndex === null ? (
          <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.background, paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Pressable onPress={goBack} style={{ width: 40, height: 40, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card }}>
                <ArrowLeft size={16} color={colors.foreground} />
              </Pressable>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground }}>{activeResourceTitle}</Text>
              </View>
            </View>
          </View>
        ) : null}
        <View style={{ flex: 1 }}>{renderViewer()}</View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 16, paddingBottom: 120 }}>
        <View style={{ marginBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable onPress={goBack} style={{ width: 40, height: 40, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card }}>
            <ArrowLeft size={20} color={colors.foreground} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={{ fontSize: 20, fontWeight: '700', color: colors.foreground }}>{pageTitle}</Text>
            <Text style={{ marginTop: 2, fontSize: 12, color: colors.mutedForeground }}>{pageSubtitle}</Text>
          </View>
          <View style={{ borderRadius: 16, backgroundColor: '#f59e0b26', padding: 8 }}>
            <Crown size={20} color="#f59e0b" />
          </View>
        </View>

        {error ? (
          <View style={{ marginBottom: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.destructive + '4D', backgroundColor: colors.destructive + '1A', padding: 12 }}>
            <Text style={{ fontSize: 14, color: colors.destructive }}>{error}</Text>
          </View>
        ) : null}

        {!selectedSubject ? (
          <ResourceSubjectPicker subjects={SUBJECTS} selectedSubject={selectedSubject} onSelect={navigateToSubject} />
        ) : !selectedChapter ? (
          <View style={{ gap: 16 }}>
            <View style={{ borderRadius: 24, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 20 }}>
              <Text style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: colors.mutedForeground }}>Selected Subject</Text>
              <Text style={{ marginTop: 8, fontSize: 28, fontWeight: '700', color: colors.foreground }}>{SUBJECT_META[selectedSubject].label}</Text>
              <Text style={{ marginTop: 8, fontSize: 14, color: colors.mutedForeground }}>Only chapter resources from the dedicated Toppers' Essentials collection are shown here.</Text>
            </View>
            <ResourceChapterList chapters={chapters} loading={loadingChapters} onSelect={navigateToChapter} />
          </View>
        ) : loadingChapterDetail ? (
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 64 }}>
            <Text style={{ fontSize: 16, color: colors.primary }}>Loading...</Text>
          </View>
        ) : chapterDetail ? (
          <View style={{ gap: 16 }}>
            <ResourceChapterHeader
              title={chapterDetail.chapterName}
              subtitle={`${SUBJECT_META[chapterDetail.subject].label} chapter`}
              categories={stats.categories}
              totalItems={stats.totalItems}
              onBack={goBack}
            />
            {tiles.length ? (
              <ResourceTypeGrid tiles={tiles} onSelect={navigateToResource} />
            ) : (
              <EmptyResourceState title="No chapter resources" description="This chapter exists in the resource collection but does not have usable Notes & Fun items yet." />
            )}
          </View>
        ) : null}
      </ScrollView>

      <BottomNav />
    </View>
  );
}
