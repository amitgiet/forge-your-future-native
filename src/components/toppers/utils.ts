import type { ChapterResourceDetail, PageFile, ResourceTile, Subject } from '@/components/toppers/types';

export const SUBJECT_META: Record<Subject, { label: string; accent: string; from: string; to: string }> = {
  biology: { label: 'Biology', accent: '#22c55e', from: 'rgba(34, 197, 94, 0.20)', to: 'rgba(34, 197, 94, 0.05)' },
  chemistry: { label: 'Chemistry', accent: '#f59e0b', from: 'rgba(245, 158, 11, 0.20)', to: 'rgba(245, 158, 11, 0.05)' },
  physics: { label: 'Physics', accent: '#3b82f6', from: 'rgba(59, 130, 246, 0.20)', to: 'rgba(59, 130, 246, 0.05)' },
};

export const extractDriveFileId = (urlValue = ''): string | null => {
  const raw = String(urlValue || '').trim();
  if (!raw) return null;

  const byQuery = raw.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (byQuery?.[1]) return byQuery[1];

  const byPath = raw.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (byPath?.[1]) return byPath[1];

  return null;
};

export const toEmbedDriveUrl = (urlValue = ''): string => {
  const raw = String(urlValue || '').trim();
  if (!raw) return raw;
  if (!/google\.com|googleusercontent\.com/i.test(raw)) return raw;

  const fileId = extractDriveFileId(raw);
  return fileId ? `https://drive.google.com/file/d/${fileId}/preview?rm=minimal` : raw;
};

export const toThumbnailImageUrl = (urlValue = '', driveId?: string | null): string => {
  const raw = String(urlValue || '').trim();
  const fileId = driveId || extractDriveFileId(raw);
  if (fileId) return `https://drive.google.com/thumbnail?id=${fileId}&sz=w2000`;
  return raw;
};

export const toDirectImageUrl = (urlValue = '', driveId?: string | null): string => {
  const raw = String(urlValue || '').trim();
  const fileId = driveId || extractDriveFileId(raw);
  if (fileId) return `https://drive.google.com/uc?export=view&id=${fileId}`;
  return raw;
};

export const getPageImageCandidates = (pageFile?: PageFile | null): string[] => {
  if (!pageFile) return [];

  const candidates = [
    toThumbnailImageUrl(pageFile.driveLink || '', pageFile.driveId || null),
    toDirectImageUrl(pageFile.driveLink || '', pageFile.driveId || null),
    String(pageFile.driveLink || '').trim(),
  ].filter(Boolean);

  return Array.from(new Set(candidates));
};

export const getPageImageUrl = (pageFile?: PageFile | null): string => {
  return getPageImageCandidates(pageFile)[0] || '';
};

export const getResourceTiles = (chapter: ChapterResourceDetail | null): ResourceTile[] => {
  if (!chapter) return [];

  const podcasts = chapter.podcasts || [];
  const crosswords = chapter.crosswords || [];
  const memes = chapter.memes || [];
  const gridlocks = chapter.gridlocks || [];

  const all: ResourceTile[] = [
    {
      key: 'notes',
      title: 'Notes',
      description: chapter.notes?.mode === 'image_pages' ? 'Chapter pages' : 'Chapter pdf',
      countLabel: chapter.notes?.pageCount ? `${chapter.notes.pageCount} pages` : 'Study notes',
      available: Boolean(chapter.hasNotes),
    },
    {
      key: 'podcasts',
      title: 'Podcast',
      description: 'Listen chapter-wise audio',
      countLabel: `${podcasts.length} item${podcasts.length === 1 ? '' : 's'}`,
      available: podcasts.length > 0,
    },
    {
      key: 'crosswords',
      title: 'Crosswords',
      description: 'Fun recall prompts',
      countLabel: `${crosswords.length} puzzle${crosswords.length === 1 ? '' : 's'}`,
      available: crosswords.length > 0,
    },
    {
      key: 'memes',
      title: 'Memes',
      description: 'Visual memory hooks',
      countLabel: `${memes.length} set${memes.length === 1 ? '' : 's'}`,
      available: memes.length > 0,
    },
    {
      key: 'gridlocks',
      title: 'Gridlocks',
      description: 'Structured challenge boards',
      countLabel: `${gridlocks.length} board${gridlocks.length === 1 ? '' : 's'}`,
      available: gridlocks.length > 0,
    },
  ];

  return all.filter((item) => item.available);
};

export const getResourceStats = (chapter: ChapterResourceDetail | null) => {
  if (!chapter) return { categories: 0, totalItems: 0 };
  return {
    categories: getResourceTiles(chapter).length,
    totalItems: (chapter.hasNotes ? 1 : 0) + chapter.podcastCount + chapter.crosswordCount + chapter.memeCount + chapter.gridlockCount,
  };
};
