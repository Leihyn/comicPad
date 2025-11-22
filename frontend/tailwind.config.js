/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        comic: {
          yellow: '#E8D7BF',      // beige/cream (replacing yellow)
          red: '#A85858',         // desaturated red
          blue: '#2C3E62',        // dark blue/navy
          purple: '#6B5B7F',      // desaturated purple
          green: '#5C7F6B',       // desaturated green
          orange: '#B8886B',      // desaturated orange/tan
          pink: '#9F7B7B',        // desaturated pink/mauve
          cyan: '#5C7A8C',        // desaturated cyan/slate
        },
        dark: {
          900: '#1A1A1C',         // charcoal black (darkest)
          800: '#2A2A2E',         // charcoal black (lighter)
          700: '#3A3A40',         // charcoal gray
          600: '#4A4A52',         // medium charcoal
        },
        navy: {
          900: '#1A2332',         // deep navy
          800: '#2C3E62',         // navy
          700: '#3D5A80',         // lighter navy
          600: '#5C7A9E',         // slate blue
        },
        cream: {
          100: '#F5EFE6',         // lightest cream
          200: '#E8D7BF',         // cream
          300: '#D4C4AF',         // darker cream
        }
      },
      fontFamily: {
        comic: ['Bangers', 'cursive'],
        display: ['Righteous', 'cursive'],
      },
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'pop': 'pop 0.3s ease-out',
        'shake': 'shake 0.5s ease-in-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        pop: {
          '0%': { transform: 'scale(0.8)' },
          '50%': { transform: 'scale(1.1)' },
          '100%': { transform: 'scale(1)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-5px)' },
          '75%': { transform: 'translateX(5px)' },
        }
      }
    },
  },
  plugins: [],
}
