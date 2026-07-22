/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./admin/**/*.{html,js,jsx}",
    "./minside/**/*.{html,js,jsx}",
    "./js/**/*.js",
    "./*.html",
    "./en/**/*.html",
    "./es/**/*.html",
    "./ressurser/**/*.html",
  ],
  theme: {
    extend: {
      colors: {
        'primary-orange': '#D17D39',
        'primary-red': '#B54D2B',
        'primary-blue': '#1B4965',
        'text-dark': '#2C3E50',
      }
    }
  },
  plugins: [],
}
