/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        orange: {
          DEFAULT: '#F97316',
          50: '#FFF4EB',
          100: '#FFE6D2',
          200: '#FDC9A5',
          300: '#FBA46D',
          400: '#FB8138',
          500: '#F97316',
          600: '#EA580C',
          700: '#C65316',
          800: '#9A3F12',
          900: '#7A340F',
        },
        charcoal: '#171717',
        warmblack: '#292524',
        ivory: '#F7F5F0',
        sand: '#EDE8DF',
        stone: '#8A857D',
      },
      fontFamily: {
        display: ['Anton', 'Impact', 'sans-serif'],
        sans: ['"DM Sans Variable"', 'DM Sans', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        widest2: '0.22em',
      },
      boxShadow: {
        soft: '0 18px 50px -24px rgba(23, 23, 23, 0.28)',
        lift: '0 26px 60px -30px rgba(23, 23, 23, 0.45)',
        glow: '0 16px 40px -18px rgba(249, 115, 22, 0.65)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(18px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '.45', transform: 'scale(.8)' },
        },
      },
      animation: {
        marquee: 'marquee 28s linear infinite',
        'fade-up': 'fade-up .7s cubic-bezier(.22,1,.36,1) both',
        'pulse-dot': 'pulse-dot 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
