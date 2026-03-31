export type Subject = 'biology' | 'chemistry' | 'physics';

export type ResourceTypeKey = 'notes' | 'podcasts' | 'crosswords' | 'memes' | 'gridlocks';

export type PageFile = {
  pageId: string;
  driveLink?: string | null;
  driveId?: string | null;
};

export type NotesResource = {
  mode?: 'pdf' | 'image_pages' | null;
  driveLink?: string | null;
  driveId?: string | null;
  pageFiles?: PageFile[];
  pageCount?: number;
  migratedAt?: string | null;
};

export type ContentItem = {
  uniqueId: string;
  title?: string | null;
  question?: string | null;
  answer?: string | null;
  driveLink?: string | null;
  driveId?: string | null;
  files?: PageFile[];
  englishDriveLink?: string | null;
  englishDriveId?: string | null;
  hindiDriveLink?: string | null;
  hindiDriveId?: string | null;
};

export type GridlockCell = {
  value?: string | null;
  isImage?: boolean;
  driveLink?: string | null;
  driveId?: string | null;
};

export type GridlockColumn = {
  header?: string | null;
  cells?: GridlockCell[];
};

export type GridlockItem = {
  uniqueId: string;
  title?: string | null;
  columns?: GridlockColumn[];
};

export type ResourceChapterSummary = {
  subject: Subject;
  chapterName: string;
  slug: string;
  hasNotes: boolean;
  podcastCount: number;
  crosswordCount: number;
  memeCount: number;
  gridlockCount: number;
  availableResourceTypes: ResourceTypeKey[];
};

export type ChapterResourceDetail = {
  _id: string;
  subject: Subject;
  chapterName: string;
  slug: string;
  notes?: NotesResource;
  podcasts?: ContentItem[];
  crosswords?: ContentItem[];
  memes?: ContentItem[];
  gridlocks?: GridlockItem[];
  hasNotes: boolean;
  podcastCount: number;
  crosswordCount: number;
  memeCount: number;
  gridlockCount: number;
  availableResourceTypes: ResourceTypeKey[];
};

export type ResourceTile = {
  key: ResourceTypeKey;
  title: string;
  description: string;
  countLabel: string;
  available: boolean;
};
