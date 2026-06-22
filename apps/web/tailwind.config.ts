import type { Config } from 'tailwindcss';

/**
 * Brand palette derived from velvichinfra.com:
 *  - navy  : deep navy used for the site header, sidebar and display headings.
 *  - brand : the blue call-to-action accent (#2563eb) — kept as `brand` so all
 *            existing brand-* utility classes continue to work unchanged.
 */
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#f1f5fa',
          100: '#e3eaf4',
          200: '#c6d4e8',
          300: '#9cb3d3',
          400: '#6a87b3',
          500: '#446196',
          600: '#2e497b',
          700: '#1f3a5f',
          800: '#16293f',
          900: '#0f2742',
          950: '#0a1c30',
        },
        brand: {
          50: '#eff5ff',
          100: '#dbe8fe',
          200: '#bedbfe',
          300: '#92c0fd',
          400: '#609afa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(15 39 66 / 0.04), 0 4px 16px -4px rgb(15 39 66 / 0.08)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
