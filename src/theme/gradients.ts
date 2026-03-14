export const gradients = {
  primary: ['#0080ff', '#4a42d1'] as const,
  secondary: ['#4a42d1', '#6b5ce7'] as const,
  success: ['#1fad64', '#29b88a'] as const,
  warning: ['#f5a623', '#e8742e'] as const,
  fun: ['#0080ff', '#6b5ce7'] as const,
};

// 135deg → start: top-left, end: bottom-right
export const gradientProps = {
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
};
