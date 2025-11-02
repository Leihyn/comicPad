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
          yellow: '#FFD700',
          red: '#FF0000',
          blue: '#0066FF',
          purple: '#9B30FF',
          green: '#00FF00',
          orange: '#FF8C00',
          pink: '#FF69B4',
          cyan: '#00FFFF',
        },
        dark: {
          900: '#0A0A0A',
          800: '#1A1A1A',
          700: '#2A2A2A',
          600: '#3A3A3A',
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