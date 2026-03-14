import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: '#f4f5f7',
        foreground: '#171c28',
        card: '#ffffff',
        'card-elevated': '#f8f9fb',
        primary: {
          DEFAULT: '#0080ff',
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT: '#4a42d1',
          foreground: '#ffffff',
        },
        muted: {
          DEFAULT: '#ecedf0',
          foreground: '#6a7080',
        },
        accent: '#1f8aef',
        success: '#1fad64',
        warning: '#f5a623',
        destructive: '#df2020',
        border: {
          DEFAULT: '#e2e4e8',
          strong: '#c5c9d0',
        },
        input: '#ecedf0',
      },
      fontFamily: {
        sans: ['Inter'],
        display: ['PlusJakartaSans'],
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '20px',
        '2xl': '24px',
        full: '9999px',
      },
    },
  },
  plugins: [],
};

export default config;
