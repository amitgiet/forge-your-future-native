import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Atom, ChevronRight, FlaskConical, Leaf } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import type { Subject } from '@/components/toppers/types';
import { SUBJECT_META } from '@/components/toppers/utils';

const icons = {
  biology: Leaf,
  chemistry: FlaskConical,
  physics: Atom,
};

type Props = {
  subjects: Subject[];
  selectedSubject: Subject | null;
  onSelect: (subject: Subject) => void;
};

export default function ResourceSubjectPicker({ subjects, selectedSubject, onSelect }: Props) {
  const { colors } = useTheme();

  return (
    <View style={{ gap: 16 }}>
      {subjects.map((subject) => {
        const meta = SUBJECT_META[subject];
        const Icon = icons[subject];
        const active = selectedSubject === subject;

        return (
          <Pressable key={subject} onPress={() => onSelect(subject)}>
            <LinearGradient
              colors={[meta.from, meta.to]}
              style={{
                borderRadius: 24,
                borderWidth: 1,
                borderColor: active ? colors.primary : colors.border,
                padding: 20,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                <View style={{ borderRadius: 16, padding: 12, backgroundColor: 'rgba(255,255,255,0.7)' }}>
                  <Icon size={28} color={meta.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground }}>{meta.label}</Text>
                  <Text style={{ marginTop: 4, fontSize: 12, color: colors.mutedForeground }}>
                    Open notes and fun chapter resources
                  </Text>
                </View>
                <ChevronRight size={20} color={colors.mutedForeground} />
              </View>
            </LinearGradient>
          </Pressable>
        );
      })}
    </View>
  );
}
