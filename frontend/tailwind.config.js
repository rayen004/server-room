/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}", "./index.html"],
  theme: {
    extend: {
      colors: {
        app: {
          bg: "#06070A",
          panel: "rgba(18, 18, 22, 0.78)",
          stroke: "rgba(255, 255, 255, 0.08)",
          muted: "#8C94A6",
          text: "#F7F8FA",
          success: "#22C55E",
          warning: "#F59E0B",
          danger: "#EF4444",
          cyan: "#38BDF8"
        }
      },
      boxShadow: {
        glow: "0 24px 80px rgba(8, 15, 30, 0.45)"
      },
      backgroundImage: {
        mesh:
          "radial-gradient(circle at top left, rgba(56, 189, 248, 0.12), transparent 30%), radial-gradient(circle at top right, rgba(34, 197, 94, 0.1), transparent 24%), linear-gradient(180deg, #08090d 0%, #06070a 100%)"
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" }
        },
        "badge-pulse": {
          "0%, 100%": {
            transform: "scale(1)",
            boxShadow: "0 0 0 0 rgba(34, 197, 94, 0.45)"
          },
          "50%": {
            transform: "scale(1.08)",
            boxShadow: "0 0 18px 3px rgba(34, 197, 94, 0.35)"
          }
        }
      },
      animation: {
        float: "float 5s ease-in-out infinite",
        "badge-pulse": "badge-pulse 1.8s ease-in-out infinite"
      }
    }
  },
  plugins: []
};
