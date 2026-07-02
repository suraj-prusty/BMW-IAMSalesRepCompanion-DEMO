/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0A0A0A',
        surface: '#141414',
        surface2: '#1C1C1C',
        border: '#2A2A2A',
        accent: '#A100FF',
        accent2: '#7B2D8B',
        txtPrimary: '#FFFFFF',
        txtSecondary: '#A0A0A0',
        success: '#22C55E',
        warning: '#F59E0B',
        error: '#EF4444',
      },
      fontFamily: {
        sans: ['"DM Sans"', 'sans-serif'],
      },
      borderRadius: {
        card: '8px',
        btn: '6px',
        input: '4px',
      },
    },
  },
  plugins: [],
}
