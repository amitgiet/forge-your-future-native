import { Platform, ViewStyle } from 'react-native';

type ShadowStyle = Pick<ViewStyle, 'shadowColor' | 'shadowOffset' | 'shadowOpacity' | 'shadowRadius' | 'elevation'>;

const createShadow = (color: string, offsetY: number, opacity: number, radius: number, elevation: number): ShadowStyle => ({
  shadowColor: color,
  shadowOffset: { width: 0, height: offsetY },
  shadowOpacity: opacity,
  shadowRadius: radius,
  elevation,
});

export const shadows = {
  sm: createShadow('#000', 1, 0.06, 3, 1),
  card: createShadow('#000', 4, 0.08, 12, 3),
  elevated: createShadow('#000', 10, 0.12, 30, 6),
  glowPrimary: createShadow('#0080ff', 4, 0.25, 20, 4),
  glowSecondary: createShadow('#4a42d1', 4, 0.25, 20, 4),
  glowSuccess: createShadow('#1fad64', 4, 0.25, 20, 4),
};

export const darkShadows = {
  sm: createShadow('#000', 1, 0.15, 3, 1),
  card: createShadow('#000', 4, 0.2, 12, 3),
  elevated: createShadow('#000', 10, 0.3, 30, 6),
  glowPrimary: createShadow('#1a8dff', 4, 0.3, 20, 4),
  glowSecondary: createShadow('#5b53db', 4, 0.3, 20, 4),
  glowSuccess: createShadow('#1fad64', 4, 0.3, 20, 4),
};
