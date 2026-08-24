/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        neon: {
          cyan: "#22d3ee",
          magenta: "#e879f9",
          lime: "#a3e635"
        }
      },
      boxShadow: {
        neon: "0 0 24px rgba(34, 211, 238, 0.25)"
      },
      fontFamily: {
        mono: ["IBM Plex Mono", "ui-monospace", "SFMono-Regular", "monospace"],
        display: ["Orbitron", "ui-sans-serif", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};
