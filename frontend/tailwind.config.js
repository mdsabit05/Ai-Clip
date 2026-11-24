/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        forge: {
          bg: '#0A0A0F',
          surface: '#13131A',
          elevated: '#1C1C27',
          border: '#2A2A3D',
          accent: '#7C3AED',
          'accent-light': '#9F67FF',
          'accent-dim': '#3D1A7A',
          cyan: '#06B6D4',
          'cyan-dim': '#0E4D5C',
          green: '#10B981',
          'green-dim': '#064E3B',
          red: '#EF4444',
          'red-dim': '#450A0A',
          amber: '#F59E0B',
          text: '#E2E8F0',
          muted: '#64748B',
          subtle: '#94A3B8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      backgroundImage: {
        'forge-gradient': 'linear-gradient(135deg, #7C3AED 0%, #06B6D4 100%)',
        'surface-gradient': 'linear-gradient(180deg, #13131A 0%, #0A0A0F 100%)',
        'card-gradient': 'linear-gradient(135deg, #1C1C27 0%, #13131A 100%)',
        'glow-purple': 'radial-gradient(ellipse at center, rgba(124,58,237,0.15) 0%, transparent 70%)',
        'glow-cyan': 'radial-gradient(ellipse at center, rgba(6,182,212,0.1) 0%, transparent 70%)',
      },
      boxShadow: {
        'forge': '0 0 0 1px rgba(124,58,237,0.3), 0 4px 24px rgba(124,58,237,0.15)',
        'forge-sm': '0 0 0 1px rgba(124,58,237,0.2), 0 2px 8px rgba(124,58,237,0.1)',
        'glow': '0 0 20px rgba(124,58,237,0.4)',
        'card': '0 4px 24px rgba(0,0,0,0.4)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 3s linear infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'shimmer': 'shimmer 2s infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}
