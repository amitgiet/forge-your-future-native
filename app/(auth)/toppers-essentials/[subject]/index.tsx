import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import ToppersEssentialsScreen from '@/components/toppers/ToppersEssentialsScreen';

export default function ToppersEssentialsSubjectRoute() {
  const { subject } = useLocalSearchParams<{ subject?: string }>();
  return <ToppersEssentialsScreen subject={subject || null} />;
}
