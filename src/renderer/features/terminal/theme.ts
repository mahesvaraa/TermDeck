import type { ITheme } from '@xterm/xterm'

/**
 * ANSI color theme matching TermDeck design tokens and Tokyo Night palette.
 */
export const terminalTheme: ITheme = {
  background: '#0d0f14', // var(--term)
  foreground: '#c9d1e0', // var(--termtx)
  cursor: '#c9d1e0',
  cursorAccent: '#0d0f14',
  selectionBackground: 'rgba(122, 162, 247, 0.35)',
  selectionInactiveBackground: 'rgba(122, 162, 247, 0.15)',

  // Normal ANSI 0-7
  black: '#1b1e28',
  red: '#f07178', // var(--err)
  green: '#8bd49c', // var(--ok)
  yellow: '#e5b567', // var(--warn)
  blue: '#7aa2f7', // var(--acc)
  magenta: '#bb9af7',
  cyan: '#7dcfff',
  white: '#c9d1e0',

  // Bright ANSI 8-15
  brightBlack: '#565f89',
  brightRed: '#f7768e',
  brightGreen: '#9ece6a',
  brightYellow: '#e0af68',
  brightBlue: '#7aa2f7',
  brightMagenta: '#bb9af7',
  brightCyan: '#7dcfff',
  brightWhite: '#ffffff'
}
