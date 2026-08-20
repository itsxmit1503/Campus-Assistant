import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        campus: {
          bg: 'var(--bg-primary)',
          surface: 'var(--bg-surface)',
          surfaceHover: 'var(--bg-surface-hover)',
          surfaceAlt: 'var(--bg-surface-alt)',
          text: 'var(--text-primary)',
          muted: 'var(--text-muted)',
          border: 'var(--border-subtle)',
          borderFocus: 'var(--border-focus)',
          green: '#1F5E39',
          greenHover: '#17472B',
          greenLight: '#EAF3EC',
          greenDark: '#123821',
          accent: '#2D7A4B',
          accentGold: '#9A7B38',
          accentRed: '#B9382F',
          tagBg: 'var(--tag-bg)',
        },
      },
      fontFamily: {
        heading: ['var(--font-space-grotesk)', 'sans-serif'],
        body: ['var(--font-dm-sans)', 'sans-serif'],
      },
      boxShadow: {
        'subtle': '0 1px 3px rgba(0, 0, 0, 0.05)',
        'elevated': '0 4px 12px rgba(0, 0, 0, 0.07)',
      },
    },
  },
  plugins: [],
};

export default config;
