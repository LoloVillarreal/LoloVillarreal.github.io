/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#F6F3EC',
        ink: '#23302A',
        sage: '#839B84',
        olive: '#5F715D',
        coral: '#E7907B',
      },
      boxShadow: { soft: '0 12px 36px rgba(64, 75, 66, .10)' },
      fontFamily: { sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'] },
    },
  },
  plugins: [],
}
