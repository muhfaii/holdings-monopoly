/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brown: { DEFAULT: '#8B4513', light: '#A0522D' },
        'light-blue': { DEFAULT: '#87CEEB', dark: '#5BA3C9' },
        pink: { DEFAULT: '#FF69B4', dark: '#E0559A' },
        orange: { DEFAULT: '#FF8C00', dark: '#E07800' },
        red: { DEFAULT: '#DC143C', dark: '#B01030' },
        yellow: { DEFAULT: '#FFD700', dark: '#E0BE00' },
        green: { DEFAULT: '#228B22', dark: '#1A6B1A' },
        'dark-blue': { DEFAULT: '#00008B', dark: '#000066' },
      },
    },
  },
  plugins: [],
};
