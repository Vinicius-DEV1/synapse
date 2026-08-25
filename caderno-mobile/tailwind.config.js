/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}", 
    "./components/**/*.{js,jsx,ts,tsx}", 
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        'dark-bg': '#1e1e2e',
        'dark-card': '#252538',
        'dark-border': '#313244',
        'dark-text': '#cdd6f4',
        'dark-subtext': '#a6adc8',
        'brand': {
          400: '#b4befe',
          500: '#89b4fa',
          600: '#87b0f9',
        }
      }
    },
  },
  plugins: [],
}
