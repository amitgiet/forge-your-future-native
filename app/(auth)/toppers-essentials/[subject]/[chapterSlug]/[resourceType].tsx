import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import ToppersEssentialsScreen from '@/components/toppers/ToppersEssentialsScreen';

export default function ToppersEssentialsResourceRoute() {
  const { subject, chapterSlug, resourceType, item, slide } = useLocalSearchParams<{
    subject?: string;
    chapterSlug?: string;
    resourceType?: string;
    item?: string;
    slide?: string;
  }>();

  return (
    <ToppersEssentialsScreen
      subject={subject || null}
      chapterSlug={chapterSlug || null}
      resourceType={resourceType || null}
      item={item || null}
      slide={slide || null}
    />
  );
}
