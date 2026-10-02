import type { Config } from 'tailwindcss'

export default {
  content: ['./src/renderer/**/*.{html,js,ts,jsx,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        panel: 'var(--panel)',
        panel2: 'var(--panel2)',
        line: 'var(--line)',
        tx: 'var(--tx)',
        mut: 'var(--mut)',
        acc: 'var(--acc)',
        ok: 'var(--ok)',
        warn: 'var(--warn)',
        err: 'var(--err)',
        term: 'var(--term)',
        termtx: 'var(--termtx)'
      },
      fontFamily: {
        sans: ['var(--sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--mono)', 'monospace']
      }
    }
  },
  plugins: []
} satisfies Config
