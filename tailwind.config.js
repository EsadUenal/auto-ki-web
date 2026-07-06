/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        sidebar: {
          bg: '#f6f2ec',
          hover: '#ece6dd',
          active: '#f97316',
          text: '#3d382f',
          muted: '#9a938a',
          border: '#e7e3dd',
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
