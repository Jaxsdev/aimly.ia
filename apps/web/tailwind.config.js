/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        aimly: {
          bg: '#F7F3EB',
          surface: '#FFFDF9',
          text: '#25221F',
          orange: '#E8683A',
          orangeHover: '#D95A30',
          peach: '#F1B29A',
          sage: '#A8B49A',
          butter: '#E9CF87',
          lavender: '#C7B8EA',
          border: '#E8E1D7'
        }
      },
      fontFamily: {
        newsreader: ['Newsreader', 'serif'],
        sans: ['Inter', 'Instrument Sans', 'sans-serif']
      }
    }
  },
  plugins: []
};
