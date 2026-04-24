/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/sidepanel/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        // Surface colours — use --bg-h so they all shift hue to match the active site.
        // Saturation & lightness match the original slate-based palette exactly;
        // only the hue becomes dynamic.
        surface: {
          base:     'hsl(var(--bg-h) 47% 11% / <alpha-value>)',  // was #0F172A (slate-900)
          card:     'hsl(var(--bg-h) 33% 17% / <alpha-value>)',  // was #1E293B (slate-800)
          elevated: 'hsl(var(--bg-h) 25% 27% / <alpha-value>)',  // was #334155 (slate-700)
          hover:    'hsl(var(--bg-h) 22% 32% / <alpha-value>)',  // was #3F4D63
        },

        // Accent — vibrant brand colour extracted from the active tab.
        accent: {
          DEFAULT: 'hsl(var(--accent-h) var(--accent-s) var(--accent-l) / <alpha-value>)',
          hover:   'hsl(var(--accent-h) var(--accent-s) calc(var(--accent-l) - 8%) / <alpha-value>)',
          muted:   'hsl(var(--accent-h) var(--accent-s) var(--accent-l) / 0.12)',
          border:  'hsl(var(--accent-h) var(--accent-s) var(--accent-l) / 0.25)',
        },

        // Override Tailwind's built-in emerald AND slate scales so that every
        // text-emerald-*, bg-slate-700/50, border-slate-700, etc. automatically
        // follows the dynamic CSS variables — zero component changes needed.
        //
        // emerald → accent colour (buttons, links, highlights)
        emerald: {
          300: 'hsl(var(--accent-h) var(--accent-s) calc(var(--accent-l) + 20%) / <alpha-value>)',
          400: 'hsl(var(--accent-h) var(--accent-s) calc(var(--accent-l) + 10%) / <alpha-value>)',
          500: 'hsl(var(--accent-h) var(--accent-s) var(--accent-l) / <alpha-value>)',
          600: 'hsl(var(--accent-h) var(--accent-s) calc(var(--accent-l) - 8%) / <alpha-value>)',
          700: 'hsl(var(--accent-h) var(--accent-s) calc(var(--accent-l) - 16%) / <alpha-value>)',
        },

        // slate → background hue (borders, text, card backgrounds)
        // Saturation values match the original Tailwind slate palette.
        // When --bg-h = 222 (default) this reproduces the original slate exactly.
        slate: {
          50:  'hsl(var(--bg-h) 40% 98% / <alpha-value>)',
          100: 'hsl(var(--bg-h) 40% 96% / <alpha-value>)',
          200: 'hsl(var(--bg-h) 32% 91% / <alpha-value>)',
          300: 'hsl(var(--bg-h) 27% 84% / <alpha-value>)',
          400: 'hsl(var(--bg-h) 20% 65% / <alpha-value>)',
          500: 'hsl(var(--bg-h) 16% 47% / <alpha-value>)',
          600: 'hsl(var(--bg-h) 19% 35% / <alpha-value>)',
          700: 'hsl(var(--bg-h) 25% 27% / <alpha-value>)',
          800: 'hsl(var(--bg-h) 33% 17% / <alpha-value>)',
          900: 'hsl(var(--bg-h) 47% 11% / <alpha-value>)',
          950: 'hsl(var(--bg-h) 84%  5% / <alpha-value>)',
        },
      },

      fontFamily: {
        body: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 1.5s ease-in-out infinite',
        'dot-bounce': 'dot-bounce 1.4s ease-in-out infinite',
      },
      keyframes: {
        'dot-bounce': {
          '0%, 80%, 100%': { transform: 'scale(0.6)', opacity: '0.4' },
          '40%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
