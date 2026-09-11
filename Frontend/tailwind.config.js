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
        panel: "0 1px 2px rgba(15, 23, 42, 0.08)"
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
        display: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};
