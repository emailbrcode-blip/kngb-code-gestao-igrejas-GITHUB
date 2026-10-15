/** @type {import('tailwindcss').Config} */
// Paleta preto, branco e cinza da identidade visual BrCode >_.
// As cores funcionais (success/danger) continuam só para estados e alertas.
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        coal: {
          DEFAULT: '#111111',
          dark: '#000000',
          light: '#2B2B2B',
        },
        metal: {
          DEFAULT: '#4D4D4D',
          light: '#A6A6A6',
          dark: '#333333',
        },
        canvas: '#F5F5F5',
        ink: '#1A1A1A',
        success: '#23824B',
        danger: '#C23B42',
        // Tokens do site público (/igreja) — isolados com prefixo "site-"
        // para não interferir nas cores do painel administrativo.
        site: {
          bg: '#FFFFFF',
          fg: '#141414',
          primary: '#1A1A1A',
          'primary-fg': '#FFFFFF',
          secondary: '#F3F3F3',
          muted: '#F1F1F1',
          'muted-fg': '#666666',
          accent: '#E8E8E8',
          'accent-fg': '#222222',
          border: '#E3E3E3',
          ink: '#0D0D0D',
          'ink-fg': '#F4F4F4',
        },
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        sans: ['"Inter"', 'sans-serif'],
        serif: ['"Source Serif 4"', 'Georgia', 'serif'],
      },
      keyframes: {
        'site-in': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'site-sheet': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
      },
      animation: {
        'site-in': 'site-in 0.7s ease-out both',
        'site-sheet': 'site-sheet 0.25s ease-out both',
      },
    },
  },
  plugins: [],
};
