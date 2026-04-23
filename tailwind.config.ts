import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: '#0f1117',
        ink2: '#1a1f2e',
        surface: '#f4f3ef',
        card: '#fff',
        'border-custom': '#e8e5de',
        border2: '#d0cdc4',
        text2: '#6b6878',
        accent: '#2557ff',
        'accent-2': '#1a44e0',
        'sd-green': '#16a34a',
        'sd-amber': '#d97706',
        'sd-red': '#dc2626',
        'sd-lime': '#84cc16',
      },
      fontFamily: {
        syne: ['Syne', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
        sans: ['DM Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
