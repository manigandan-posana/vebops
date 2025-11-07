/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html","./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        /**
         * Customised brand palette providing a modern blue tone and variants.
         * These colours will be used throughout the application for a
         * professional look and feel. A light variant supports subtle
         * backgrounds and a dark variant for hover states and emphasis.
         */
        brand: {
          DEFAULT: "#2E5AAC",
          dark: "#244a93",
          light: "#f5f7fb",
        },
        /** Retain existing posana colour for legacy elements */
        posana: "#0C7328",
      },
      borderRadius: {
        "2xl": "1.25rem"
      },
      fontFamily: {
        sans: ["Roboto","Poppins"],
      },
    },
  },
  plugins: [],
}