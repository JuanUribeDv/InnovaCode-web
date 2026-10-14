/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          base: "#0F1117",
          sidebar: "#0D1021",
          card: "#141824",
          input: "#0D1021",
        },
        border: {
          DEFAULT: "#1E2640",
          light: "#252D40",
          input: "#2A2A45",
        },
        accent: {
          purple: "#6C63FF",
          blue: "#29ABE2",
        },
        text: {
          primary: "#E8ECFA",
          secondary: "#8892AA",
          muted: "#4A5568",
        },
        success: "#4ADE80",
        danger: "#F87171",
        warning: "#FBBF24",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
}