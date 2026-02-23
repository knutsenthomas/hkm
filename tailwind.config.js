/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./**/*.html",
    "./**/*.js",
  ],
  theme: {
    extend: {
      colors: {
        'primary-orange': '#f39c12',
        'primary-red': '#e74c3c',
        'text-dark': '#333333',
      }
    }
  },
  plugins: [],
}
