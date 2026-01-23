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
        // Backgrounds escuros
        dark: {
          DEFAULT: '#0f0f0f',
          50: '#404040',
          100: '#333333',
          200: '#2a2a2a',
          300: '#252525',
          400: '#1e1e1e',
          500: '#1a1a1a',
          600: '#151515',
          700: '#121212',
          800: '#0f0f0f',
          900: '#0a0a0a',
        },
        // Cores de status
        success: {
          DEFAULT: '#22c55e',
          dark: '#16a34a',
        },
        warning: {
          DEFAULT: '#eab308',
          dark: '#ca8a04',
        },
        error: {
          DEFAULT: '#ef4444',
          dark: '#dc2626',
        },
        // Aliases
        background: 'var(--background)',
        foreground: 'var(--foreground)',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      // Breakpoints otimizados para mobile
      screens: {
        'xs': '375px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
      },
      // Espaçamentos touch-friendly
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-top': 'env(safe-area-inset-top)',
      },
      // Min heights para elementos touch
      minHeight: {
        'touch': '44px',
      },
      minWidth: {
        'touch': '44px',
      },
      // Shadows para modo escuro
      boxShadow: {
        'dark': '0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.3)',
        'dark-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
        'brand': '0 4px 14px 0 rgba(196, 168, 108, 0.3)',
      },
    },
  },
  plugins: [],
}
export default config
