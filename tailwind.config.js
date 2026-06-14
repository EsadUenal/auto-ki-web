/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        sidebar: {
          bg: '#1a1a1a',
          hover: '#2a2a2a',
          active: '#333333',
          text: '#e5e5e5',
          muted: '#888888',
          border: '#2e2e2e',
        },
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
            color: '#374151',
            a: { color: '#2563eb' },
            'h1,h2,h3,h4': { color: '#111827', fontWeight: '600' },
            code: { color: '#111827', backgroundColor: '#f3f4f6', padding: '0.125rem 0.25rem', borderRadius: '0.25rem' },
            'code::before': { content: 'none' },
            'code::after': { content: 'none' },
          },
        },
      },
    },
  },
  plugins: [],
}
