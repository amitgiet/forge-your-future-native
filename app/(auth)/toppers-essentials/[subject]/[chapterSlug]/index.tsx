import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import ToppersEssentialsScreen from '@/components/toppers/ToppersEssentialsScreen';

export default function ToppersEssentialsChapterRoute() {
  const { subject, chapterSlug } = useLocalSearchParams<{ subject?: string; chapterSlug?: string }>();
  return <ToppersEssentialsScreen subject={subject || null} chapterSlug={chapterSlug || null} />;
}
