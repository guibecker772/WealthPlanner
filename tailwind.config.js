// tailwind.config.js
/** @type {import('tailwindcss').Config} */
const defaultTheme = require('tailwindcss/defaultTheme');

module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Usaremos 'Inter' para texto geral e 'Manrope' para títulos elegantes
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
        display: ['Manrope', ...defaultTheme.fontFamily.sans],
      },
      colors: {
        // Fundos
        background: {
          DEFAULT: '#0A0C14', // Azul/preto muito profundo
          secondary: '#11131F', // Um pouco mais claro para sidebars
        },
        // Superfícies (Cards)
        surface: {
          DEFAULT: '#1A1D2E', // Cor base dos cards
          highlight: '#242842', // Hover ou destaque
          muted: '#141625', // Inputs
        },
        // Bordas
        border: {
          DEFAULT: 'rgba(255, 255, 255, 0.08)',
          highlight: 'rgba(255, 255, 255, 0.15)',
        },
        // Textos
        text: {
          primary: '#FFFFFF',
          secondary: '#9CA3AF', // Cinza azulado (gray-400)
          muted: '#6B7280', // (gray-500)
          inverted: '#0A0C14', // Texto sobre fundos claros
        },
        // Acento Principal (Dourado Premium)
        accent: {
          DEFAULT: '#D4AF37',
          light: '#E5C55B',
          dark: '#B3932B',
          subtle: 'rgba(212, 175, 55, 0.15)',
        },
        // Cores Semânticas Elegantes
        success: { DEFAULT: '#10B981', subtle: 'rgba(16, 185, 129, 0.15)' },
        warning: { DEFAULT: '#F59E0B', subtle: 'rgba(245, 158, 11, 0.15)' },
        danger: { DEFAULT: '#EF4444', subtle: 'rgba(239, 68, 68, 0.15)' }
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
        'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.2)',
        'elevated': '0 20px 40px -10px rgba(0, 0, 0, 0.4)',
        'glow-accent': '0 0 25px -5px rgba(212, 175, 55, 0.4)',
      },
      borderRadius: {
        'xl': '12px', '2xl': '16px', '3xl': '20px',
      },
    },
  },
  plugins: [],
}