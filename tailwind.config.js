import forms from "@tailwindcss/forms";

import typography from "@tailwindcss/typography";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      boxShadow: {
        custom: '4px 4px #0b0b0b',
        customHover: '7px 7px #0b0b0b',
      },
      fontFamily: {
        custom: ['Onest-Regular', 'sans-serif'],
      }
    },
  },
  plugins: [
    forms,
    typography,
  ],
};
