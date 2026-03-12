module.exports = {
  plugins: {
    tailwindcss: {
      content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
      ],
      theme: {
        extend: {},
      },
      plugins: [],
    },
    autoprefixer: {},
  },
}