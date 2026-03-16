import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { API_BASE_URL } from './api';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const extractDriveFileId = (urlValue: string): string | null => {
  const url = String(urlValue || '').trim();
  if (!url) return null;

  const fromQuery = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (fromQuery?.[1]) return fromQuery[1];

  const fromPath = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (fromPath?.[1]) return fromPath[1];

  return null;
};

export const getImageUrl = (urlValue: string): string => {
  const raw = String(urlValue || '').trim();
  if (!raw) return raw;

  // Let's unwrap the backend proxy URL recursively if it's nested
  if (raw.includes('/formulas/image-proxy?')) {
    try {
      // Use API_BASE_URL as a dummy origin if raw is a relative path
      const parsed = new URL(raw, raw.startsWith('http') ? undefined : API_BASE_URL);
      const wrapped = parsed.searchParams.get('url');
      if (wrapped) {
        return getImageUrl(decodeURIComponent(wrapped));
      }
    } catch (_) {
      // ignore and fall through to simple processing
    }
  }

  let processed = raw;

  // Normalize Google Drive URLs to browser-friendly thumbnail endpoint.
  if (/drive\.google\.com|googleusercontent\.com/i.test(processed)) {
    const fileId = extractDriveFileId(processed);
    if (fileId) {
      return `https://drive.google.com/thumbnail?id=${fileId}&sz=w2000`;
    }
  }

  // Handle relative backend file paths
  if (processed.startsWith('/')) {
    return `${API_BASE_URL}${processed}`;
  }

  return processed;
};
