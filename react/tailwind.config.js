/** @type {import('tailwindcss').Config} */
export default {
  content: [],
  content: ["./src/**/*.tsx"],
  theme: {
    extend: {
      boxShadow: {
        'highlight': '0 0px 9px -2px #90E0EF',
      },
      colors: {
        ambiance: "#001233",
        highlight: "#90E0EF",
        inter: "#0096C7"
      },
    },
  },
  plugins: [],
}

