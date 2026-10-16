/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)", surface: "var(--surface)", accent: "var(--accent)",
        muted: "var(--muted)", text: "var(--text)", "text-dim": "var(--text-dim)",
        border: "var(--border)", "surface-hover": "var(--surface-hover)",
        "severity-low": "var(--severity-low)", "severity-medium": "var(--severity-medium)",
        "severity-high": "var(--severity-high)",
      },
      fontFamily: { heading: ["Anton", "Impact", "Arial Narrow", "sans-serif"], body: ["Alegreya Sans", "system-ui", "sans-serif"] },
    },
  },
  plugins: [],
};
