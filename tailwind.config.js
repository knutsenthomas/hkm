/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./**/*.html",
    "./**/*.js",
  ],
  theme: {
    extend: {
      colors: {
        'primary-orange': '#D17D39',
        'primary-red': '#B54D2B',
        'text-dark': '#2C3E50',
      }
    }
  },
  plugins: [],
}
