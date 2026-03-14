import React, { useState } from 'react';
import { View, Text, Pressable, FlatList, Modal as RNModal } from 'react-native';
import { ChevronDown, Check } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface SelectOption {
  label: string;
  value: string;
}

interface SelectProps {
  options: SelectOption[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  label?: string;
}

export const Select = ({ options, value, onValueChange, placeholder, label }: SelectProps) => {
  const { colors, shadows } = useTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View>
      {label && (
        <Text style={{ fontSize: 14, fontWeight: '500', color: colors.foreground, marginBottom: 6 }}>
          {label}
        </Text>
      )}
      <Pressable
        onPress={() => setOpen(true)}
        style={{
          minHeight: 48,
          borderRadius: 12,
          paddingHorizontal: 16,
          backgroundColor: colors.input,
          borderWidth: 1,
          borderColor: colors.border,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text style={{ fontSize: 16, color: selected ? colors.foreground : colors.mutedForeground }}>
          {selected?.label || placeholder || 'Select...'}
        </Text>
        <ChevronDown size={20} color={colors.mutedForeground} />
      </Pressable>

      <RNModal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          onPress={() => setOpen(false)}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 }}
        >
          <View style={{ backgroundColor: colors.card, borderRadius: 16, maxHeight: 400, ...shadows.elevated }}>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    onValueChange(item.value);
                    setOpen(false);
                  }}
                  style={{
                    paddingHorizontal: 20,
                    paddingVertical: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  }}
                >
                  <Text style={{ fontSize: 16, color: colors.foreground }}>{item.label}</Text>
                  {item.value === value && <Check size={18} color={colors.primary} />}
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </RNModal>
    </View>
  );
};
