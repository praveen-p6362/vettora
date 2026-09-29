/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { 900: '#0F172A', 700: '#334155', 500: '#64748B', 300: '#CBD5E1', 100: '#F1F5F9' },
        indigo: { 700: '#3730A3', 600: '#4338CA', 500: '#4F46E5', 100: '#E9E8FC', 50: '#F5F4FF' },
        violet: { 600: '#7C3AED', 100: '#F1E9FE' },
        surf: { 50: '#F8FAFC', 100: '#F1F5F9' },
        good: { 600: '#059669', 100: '#DCFCE7' },
        warn: { 600: '#D97706', 100: '#FEF3C7' },
        bad: { 600: '#DC2626', 100: '#FEE2E2' },
      },
      fontFamily: {
        display: ['Sora', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,23,42,0.04), 0 1px 8px rgba(15,23,42,0.04)',
        pop: '0 8px 24px rgba(67,56,202,0.14)',
      },
    },
  },
  plugins: [],
};
