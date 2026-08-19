/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#172033',
        brand: '#2563eb',
        mint: '#0f9f8f',
        amber: '#c27803'
      }
    }
  },
  plugins: []
};
