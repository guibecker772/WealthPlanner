/* eslint-disable no-undef */
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
        // Usaremos 'Inter' para texto geral e 'Manrope' para titulos elegantes
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
        display: ['Manrope', ...defaultTheme.fontFamily.sans],
      },
      colors: {
        // TOKENS HSL (design system premium)
        
        // Backgrounds
        bg: 'hsl(var(--bg) / <alpha-value>)',
        'surface-1': 'hsl(var(--surface-1) / <alpha-value>)',
        'surface-2': 'hsl(var(--surface-2) / <alpha-value>)',
        'surface-3': 'hsl(var(--surface-3) / <alpha-value>)',
        
        // Text
        text: 'hsl(var(--text) / <alpha-value>)',
        'text-muted': 'hsl(var(--text-muted) / <alpha-value>)',
        'text-faint': 'hsl(var(--text-faint) / <alpha-value>)',
        'text-inverted': 'hsl(var(--text-inverted) / <alpha-value>)',
        
        // Borders
        border: 'hsl(var(--border))',
        'border-highlight': 'hsl(var(--border-highlight))',
        divider: 'hsl(var(--divider))',
        
        // Accent (gold)
        accent: {
          DEFAULT: 'hsl(var(--accent) / <alpha-value>)',
          2: 'hsl(var(--accent-2) / <alpha-value>)',
          fg: 'hsl(var(--accent-fg) / <alpha-value>)',
          subtle: 'hsl(var(--accent-subtle))',
        },
        
        // Semantic
        success: {
          DEFAULT: 'hsl(var(--success) / <alpha-value>)',
          subtle: 'hsl(var(--success-subtle))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning) / <alpha-value>)',
          subtle: 'hsl(var(--warning-subtle))',
        },
        danger: {
          DEFAULT: 'hsl(var(--danger) / <alpha-value>)',
          subtle: 'hsl(var(--danger-subtle))',
        },
        info: {
          DEFAULT: 'hsl(var(--info) / <alpha-value>)',
          subtle: 'hsl(var(--info-subtle))',
        },
        
        // ALIASES DE COMPATIBILIDADE (evita refactor)
        
        // Fundos (compat legacy)
        background: {
          DEFAULT: 'hsl(var(--bg) / <alpha-value>)',
          secondary: 'hsl(var(--surface-1) / <alpha-value>)',
        },
        // Superficies (Cards) - compat legacy
        surface: {
          DEFAULT: 'hsl(var(--surface-2) / <alpha-value>)',
          highlight: 'hsl(var(--surface-3) / <alpha-value>)',
          muted: 'hsl(var(--surface-1) / <alpha-value>)',
        },
        // Textos - compat legacy
        'text-primary': 'hsl(var(--text) / <alpha-value>)',
        'text-secondary': 'hsl(var(--text-muted) / <alpha-value>)',
        
        // Gold tokens (compat com classes gold-*)
        gold: {
          200: 'hsl(43 65% 75% / <alpha-value>)',
          400: 'hsl(var(--accent-2) / <alpha-value>)',
          500: 'hsl(var(--accent) / <alpha-value>)',
          600: 'hsl(43 70% 42% / <alpha-value>)',
        },
        
        // Navy tokens (compat com classes navy-*)
        navy: {
          900: 'hsl(var(--surface-1) / <alpha-value>)',
          950: 'hsl(var(--bg) / <alpha-value>)',
        },
        
        // Chart tokens (séries de dados)
        chart: {
          1: 'hsl(var(--chart-1) / <alpha-value>)',
          2: 'hsl(var(--chart-2) / <alpha-value>)',
          3: 'hsl(var(--chart-3) / <alpha-value>)',
          4: 'hsl(var(--chart-4) / <alpha-value>)',
          5: 'hsl(var(--chart-5) / <alpha-value>)',
          grid: 'hsl(var(--chart-grid))',
          axis: 'hsl(var(--chart-axis) / <alpha-value>)',
        },
      },
      boxShadow: {
        // Shadows tokenizadas
        'soft': 'var(--shadow-soft)',
        'soft-2': 'var(--shadow-soft-2)',
        'elevated': 'var(--shadow-elevated)',
        'glow-accent': 'var(--shadow-glow-accent)',
        // Compat legacy
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '20px',
      },
    },
  },
  plugins: [],
}