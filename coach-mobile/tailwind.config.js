/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#EFEDE6',
          secondary: '#E5E3DB',
          tertiary: '#DCD9D0',
          card: '#ffffff',
          'card-hover': '#F8F7F4',
        },
        accent: {
          primary: '#CD0000',
          'primary-hover': '#A00000',
          green: '#10b981',
          cyan: '#06b6d4',
          purple: '#8b5cf6',
          orange: '#f97316',
          red: '#CD0000',
        },
        text: {
          primary: '#121212',
          secondary: '#475569',
          muted: '#64748b',
        },
        border: {
          default: 'rgba(0, 0, 0, 0.1)',
        }
      }
    },
  },
  plugins: [],
}
