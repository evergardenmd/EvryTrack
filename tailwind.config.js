/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        vibrant: {
          terracotta: '#A26360',
          rosedust: '#D4A29C',
          peach: '#E8B298',
          honey: '#EDCC8B',
          mintsage: '#BDD1C5',
          slatesage: '#9DAAA2',
          bg: '#171314',
          card: 'rgba(34, 27, 28, 0.88)',
          border: 'rgba(162, 99, 96, 0.28)',
        },
        pine: {
          950: '#100D0E',
          900: '#171314',
          800: '#221B1C',
          700: '#2F2426',
          600: '#3D2F32',
          500: '#4D3B3F',
        },
        emerald: {
          300: '#EDCC8B',
          400: '#EDCC8B',
          500: '#BDD1C5',
          600: '#E8B298',
          700: '#A26360',
        },
        sage: {
          400: '#9DAAA2',
          500: '#BDD1C5',
          600: '#6E8077',
        },
        smoked: {
          DEFAULT: 'rgba(34, 27, 28, 0.88)',
          border: 'rgba(162, 99, 96, 0.28)',
          hover: 'rgba(232, 178, 152, 0.15)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'glass': '0 4px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(16,185,129,0.08)',
        'glow-sm': '0 0 12px rgba(16,185,129,0.25)',
        'glow': '0 0 24px rgba(16,185,129,0.35)',
        'glow-lg': '0 0 48px rgba(16,185,129,0.4)',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.35s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'bar-fill': 'barFill 1s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        barFill: {
          '0%': { width: '0%' },
          '100%': { width: 'var(--bar-width)' },
        },
      },
    },
  },
  plugins: [],
}
