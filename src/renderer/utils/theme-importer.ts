import type { ITheme } from '@xterm/xterm'

export const BUILTIN_THEMES: Record<string, ITheme> = {
  'TermDeck Dark': {
    background: '#0d0f14',
    foreground: '#c9d1e0',
    cursor: '#c9d1e0',
    cursorAccent: '#0d0f14',
    selectionBackground: 'rgba(122, 162, 247, 0.35)',
    black: '#1b1e28',
    red: '#f07178',
    green: '#8bd49c',
    yellow: '#e5b567',
    blue: '#7aa2f7',
    magenta: '#bb9af7',
    cyan: '#7dcfff',
    white: '#c9d1e0',
    brightBlack: '#565f89',
    brightRed: '#f7768e',
    brightGreen: '#9ece6a',
    brightYellow: '#e0af68',
    brightBlue: '#7aa2f7',
    brightMagenta: '#bb9af7',
    brightCyan: '#7dcfff',
    brightWhite: '#ffffff'
  },
  Dracula: {
    background: '#282a36',
    foreground: '#f8f8f2',
    cursor: '#f8f8f2',
    cursorAccent: '#282a36',
    selectionBackground: '#44475a',
    black: '#21222c',
    red: '#ff5555',
    green: '#50fa7b',
    yellow: '#f1fa8c',
    blue: '#bd93f9',
    magenta: '#ff79c6',
    cyan: '#8be9fd',
    white: '#f8f8f2',
    brightBlack: '#6272a4',
    brightRed: '#ff6e6e',
    brightGreen: '#69ff94',
    brightYellow: '#ffffa5',
    brightBlue: '#d6acff',
    brightMagenta: '#ff92df',
    brightCyan: '#a4ffff',
    brightWhite: '#ffffff'
  },
  'Solarized Dark': {
    background: '#002b36',
    foreground: '#839496',
    cursor: '#839496',
    cursorAccent: '#002b36',
    selectionBackground: '#073642',
    black: '#073642',
    red: '#dc322f',
    green: '#859900',
    yellow: '#b58900',
    blue: '#268bd2',
    magenta: '#d33682',
    cyan: '#2aa198',
    white: '#eee8d5',
    brightBlack: '#002b36',
    brightRed: '#cb4b16',
    brightGreen: '#586e75',
    brightYellow: '#657b83',
    brightBlue: '#839496',
    brightMagenta: '#6c71c4',
    brightCyan: '#93a1a1',
    brightWhite: '#fdf6e3'
  },
  Nord: {
    background: '#2e3440',
    foreground: '#d8dee9',
    cursor: '#d8dee9',
    cursorAccent: '#2e3440',
    selectionBackground: '#434c5e',
    black: '#3b4252',
    red: '#bf616a',
    green: '#a3be8c',
    yellow: '#ebcb8b',
    blue: '#81a1c1',
    magenta: '#b48ead',
    cyan: '#88c0d0',
    white: '#e5e9f0',
    brightBlack: '#4c566a',
    brightRed: '#bf616a',
    brightGreen: '#a3be8c',
    brightYellow: '#ebcb8b',
    brightBlue: '#81a1c1',
    brightMagenta: '#b48ead',
    brightCyan: '#8fbcbb',
    brightWhite: '#eceff4'
  },
  'One Dark': {
    background: '#1e1e1e',
    foreground: '#abb2bf',
    cursor: '#528bff',
    cursorAccent: '#1e1e1e',
    selectionBackground: '#3e4451',
    black: '#282c34',
    red: '#e06c75',
    green: '#98c379',
    yellow: '#e5c07b',
    blue: '#61afef',
    magenta: '#c678dd',
    cyan: '#56b6c2',
    white: '#abb2bf',
    brightBlack: '#5c6370',
    brightRed: '#e06c75',
    brightGreen: '#98c379',
    brightYellow: '#e5c07b',
    brightBlue: '#61afef',
    brightMagenta: '#c678dd',
    brightCyan: '#56b6c2',
    brightWhite: '#ffffff'
  },
  'GitHub Light': {
    background: '#ffffff',
    foreground: '#24292e',
    cursor: '#24292e',
    cursorAccent: '#ffffff',
    selectionBackground: '#c8e1ff',
    black: '#24292e',
    red: '#d73a49',
    green: '#22863a',
    yellow: '#b08800',
    blue: '#0366d6',
    magenta: '#6f42c1',
    cyan: '#1b7c83',
    white: '#6a737d',
    brightBlack: '#959da5',
    brightRed: '#cb2431',
    brightGreen: '#28a745',
    brightYellow: '#dbab09',
    brightBlue: '#2188ff',
    brightMagenta: '#8a63d2',
    brightCyan: '#3192aa',
    brightWhite: '#d1d5da'
  }
}

/**
 * Parses Windows Terminal color scheme JSON or object.
 */
export function parseWindowsTerminalTheme(
  input: string | Record<string, string>
): { name: string; theme: ITheme } | null {
  try {
    const data = typeof input === 'string' ? JSON.parse(input) : input
    const name = data.name || 'Custom WT Theme'

    const theme: ITheme = {
      background: data.background || '#000000',
      foreground: data.foreground || '#ffffff',
      cursor: data.cursorColor || data.foreground || '#ffffff',
      selectionBackground: data.selectionBackground || 'rgba(128, 128, 128, 0.4)',
      black: data.black || '#000000',
      red: data.red || '#cc0000',
      green: data.green || '#4e9a06',
      yellow: data.yellow || '#c4a000',
      blue: data.blue || '#3465a4',
      magenta: data.purple || data.magenta || '#75507b',
      cyan: data.cyan || '#06989a',
      white: data.white || '#d3d7cf',
      brightBlack: data.brightBlack || '#555753',
      brightRed: data.brightRed || '#ef2929',
      brightGreen: data.brightGreen || '#8ae234',
      brightYellow: data.brightYellow || '#fce94f',
      brightBlue: data.brightBlue || '#729fcf',
      brightMagenta: data.brightPurple || data.brightMagenta || '#ad7fa8',
      brightCyan: data.brightCyan || '#34e2e2',
      brightWhite: data.brightWhite || '#eeeeec'
    }

    return { name, theme }
  } catch {
    return null
  }
}

/**
 * Parses iTerm2 (.itermcolors) XML plist text.
 */
export function parseIterm2Theme(xmlText: string): { name: string; theme: ITheme } | null {
  try {
    const parseRgb = (block: string): string => {
      const redMatch = /<key>Red Component<\/key>\s*<real>([0-9.]+)<\/real>/i.exec(block)
      const greenMatch = /<key>Green Component<\/key>\s*<real>([0-9.]+)<\/real>/i.exec(block)
      const blueMatch = /<key>Blue Component<\/key>\s*<real>([0-9.]+)<\/real>/i.exec(block)

      const r = Math.round(parseFloat(redMatch?.[1] || '0') * 255)
      const g = Math.round(parseFloat(greenMatch?.[1] || '0') * 255)
      const b = Math.round(parseFloat(blueMatch?.[1] || '0') * 255)

      return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
    }

    const getColor = (colorName: string): string | undefined => {
      const regex = new RegExp(`<key>${colorName}<\\/key>\\s*<dict>([\\s\\S]*?)<\\/dict>`, 'i')
      const match = regex.exec(xmlText)
      return match ? parseRgb(match[1]) : undefined
    }

    const bg = getColor('Background Color') || '#000000'
    const fg = getColor('Foreground Color') || '#ffffff'

    const theme: ITheme = {
      background: bg,
      foreground: fg,
      cursor: getColor('Cursor Color') || fg,
      selectionBackground: getColor('Selection Color') || 'rgba(128, 128, 128, 0.4)',
      black: getColor('Ansi 0 Color') || '#000000',
      red: getColor('Ansi 1 Color') || '#cc0000',
      green: getColor('Ansi 2 Color') || '#4e9a06',
      yellow: getColor('Ansi 3 Color') || '#c4a000',
      blue: getColor('Ansi 4 Color') || '#3465a4',
      magenta: getColor('Ansi 5 Color') || '#75507b',
      cyan: getColor('Ansi 6 Color') || '#06989a',
      white: getColor('Ansi 7 Color') || '#d3d7cf',
      brightBlack: getColor('Ansi 8 Color') || '#555753',
      brightRed: getColor('Ansi 9 Color') || '#ef2929',
      brightGreen: getColor('Ansi 10 Color') || '#8ae234',
      brightYellow: getColor('Ansi 11 Color') || '#fce94f',
      brightBlue: getColor('Ansi 12 Color') || '#729fcf',
      brightMagenta: getColor('Ansi 13 Color') || '#ad7fa8',
      brightCyan: getColor('Ansi 14 Color') || '#34e2e2',
      brightWhite: getColor('Ansi 15 Color') || '#eeeeec'
    }

    return { name: 'iTerm2 Imported Theme', theme }
  } catch {
    return null
  }
}
