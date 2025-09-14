/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Couleurs de marque (corrigées)
        brand: {
          dark: '#3c3533',
          light: '#d2c8c3',
          neutral: '#e8d8c9',
          green: '#2e7d6f',
          white: '#ffffff',
          accent: '#c19a5f',
          text: {
            dark: '#000000',
            light: '#e0e0e0',
          },
        },
        // Tokens sémantiques
        surface: {
          DEFAULT: '#ffffff',
          muted: '#f9f7f5',
          neutral: '#e8d8c9',
          dark: '#3c3533',
        },
        primary: {
          DEFAULT: '#3c3533',
          foreground: '#ffffff',
          muted: '#6b7280',
        },
        secondary: {
          DEFAULT: '#c19a5f',
          foreground: '#ffffff',
          muted: '#d2c8c3',
        },
        text: {
          primary: '#000000',
          secondary: '#3c3533',
          muted: '#6b7280',
          inverse: '#ffffff',
          accent: '#c19a5f',
        },
        // Couleurs legacy (pour compatibilité)
        'brand-dark': '#3c3533',
        'brand-light': '#d2c8c3',
        'brand-neutral': '#e8d8c9',
        'brand-green': '#2e7d6f',
        'brand-white': '#ffffff',
        'brand-text-dark': '#000000',
        'brand-text-light': '#e0e0e0',
        'brand-accent': '#c19a5f',
      },
      fontFamily: {
        'headline': ['Montserrat', 'sans-serif'],
        'body': ['Open Sans', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'pulse-ring': 'pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        glow: {
          '0%': {
            boxShadow: '0 0 20px rgba(193, 154, 95, 0.5)',
          },
          '100%': {
            boxShadow: '0 0 30px rgba(193, 154, 95, 0.8), 0 0 40px rgba(193, 154, 95, 0.6)',
          },
        },
        'pulse-ring': {
          '0%': {
            transform: 'scale(0.33)',
            opacity: '1',
          },
          '80%, 100%': {
            transform: 'scale(2.33)',
            opacity: '0',
          },
        },
      },
    },
  },
  plugins: [],
};