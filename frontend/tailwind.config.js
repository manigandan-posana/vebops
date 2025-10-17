/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html","./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#1173d4",
          dark: "#0f63b7"
        },
        posana: "#0C7328"
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