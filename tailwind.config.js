/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        white: '#f3f4ec',
        gray: {
          50: '#f7f8f3', 100: '#f3f4ec', 200: '#dfe3d9',
          300: '#ccd2c6', 400: '#aab4a5', 500: '#929e8e',
          600: '#64705f', 700: '#343c34', 800: '#1d241d',
          900: '#161c17', 950: '#131813',
        },
        primary: {
          50: '#f4f8e9', 100: '#e9f1d4', 200: '#e0ecc0',
          300: '#dce9b7', 400: '#d4e6a3', 500: '#d4e6a3',
          600: '#c5d99c', 700: '#71845d', 800: '#3f5135',
          900: '#283524', 950: '#1b2619',
        },
      },
    },
  },
  plugins: [],
}

