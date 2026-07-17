/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        recloud: {
          50: '#f3f1fa',
          100: '#e5e1f4',
          200: '#cdc5e8',
          300: '#aaa0d8',
          400: '#877ac4',
          500: '#6c56b3', // Primary brand color - deep vibrant purple
          600: '#58439e',
          700: '#483584',
          800: '#3c2d6e',
          900: '#322659',
        }
      }
    },
  },
  plugins: [],
}
