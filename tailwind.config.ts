import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Cores da marca Majollo
        brand: {
          DEFAULT: '#C4A86C',
          light: '#D4BC8A',
          dark: '#A68B4B',
          50: '#FAF7F0',
          100: '#F2EBD9',
          200: '#E5D7B3',
          300: '#D4BC8A',
          400: '#C4A86C',
          500: '#A68B4B',
          600: '#8B7340',
          700: '#6B5830',
          800: '#4A3D21',
          900: '#2A2313',
        },
        // Backgrounds
        dark: {
          DEFAULT: '#0F1117',
          50: '#64748B',
          100: '#2A2F42',
          200: '#252A3A',
          300: '#232736',
          400: '#1E2130',
          500: '#1A1D28',
          600: '#151823',
          700: '#12141D',
          800: '#0F1117',
          900: '#0A0C12',
        },
        // Accent colors
        accent: {
          blue: '#4F8CFF',
          purple: '#7C5CFC',
          teal: '#2DD4BF',
          pink: '#F472B6',
          orange: '#FB923C',
        },
        // Cores de status
        success: {
          DEFAULT: '#22C55E',
          dark: '#16A34A',
        },
        warning: {
          DEFAULT: '#F59E0B',
          dark: '#D97706',
        },
        error: {
          DEFAULT: '#EF4444',
          dark: '#DC2626',
        },
        // Aliases
        background: 'var(--background)',
        foreground: 'var(--foreground)',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      // Breakpoints
      screens: {
        'xs': '375px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
      },
      // Espaçamentos
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-top': 'env(safe-area-inset-top)',
        'sidebar': '260px',
        'sidebar-collapsed': '72px',
      },
      // Min heights para elementos touch
      minHeight: {
        'touch': '44px',
      },
      minWidth: {
        'touch': '44px',
      },
      // Shadows modernos
      boxShadow: {
        'soft': '0 1px 2px rgba(0, 0, 0, 0.04)',
        'medium': '0 4px 12px rgba(0, 0, 0, 0.06)',
        'elevated': '0 8px 30px rgba(0, 0, 0, 0.08)',
        'float': '0 20px 50px rgba(0, 0, 0, 0.12)',
        'dark': '0 4px 12px rgba(0, 0, 0, 0.3)',
        'dark-lg': '0 8px 30px rgba(0, 0, 0, 0.4)',
        'brand': '0 4px 20px rgba(196, 168, 108, 0.25)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.06)',
        'inner-glow': 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
      },
      // Border radius
      borderRadius: {
        'xl': '16px',
        '2xl': '20px',
        '3xl': '24px',
      },
      // Animations
      animation: {
        'fade-in': 'fadeIn 0.4s ease forwards',
        'fade-in-up': 'fadeInUp 0.5s ease forwards',
        'slide-in-left': 'slideInLeft 0.4s ease forwards',
        'scale-in': 'scaleIn 0.3s ease forwards',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideInLeft: {
          from: { opacity: '0', transform: 'translateX(-24px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
    },
  },
  plugins: [],
}
export default config
