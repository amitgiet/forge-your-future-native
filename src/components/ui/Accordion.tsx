import React, { useState } from 'react';
import { Pressable, View, Text } from 'react-native';
import Animated, { useAnimatedStyle, withTiming, useDerivedValue } from 'react-native-reanimated';
import { ChevronDown } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface AccordionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export const Accordion = ({ title, children, defaultOpen = false }: AccordionProps) => {
  const { colors } = useTheme();
  const [open, setOpen] = useState(defaultOpen);

  const rotation = useDerivedValue(() => withTiming(open ? 180 : 0, { duration: 200 }));
  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <Pressable
        onPress={() => setOpen(!open)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: 16,
        }}
      >
        <Text
          style={{
            fontSize: 15,
            fontWeight: '600',
            color: colors.foreground,
            flex: 1,
            fontFamily: 'Inter_600SemiBold',
          }}
        >
          {title}
        </Text>
        <Animated.View style={chevronStyle}>
          <ChevronDown size={20} color={colors.mutedForeground} />
        </Animated.View>
      </Pressable>
      {open && <View style={{ paddingBottom: 16 }}>{children}</View>}
    </View>
  );
};
