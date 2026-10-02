import { describe, it, expect } from 'vitest'
import { stripAnsi } from './ansi'

describe('stripAnsi', () => {
  it('returns plain text unmodified', () => {
    expect(stripAnsi('Hello, World!')).toBe('Hello, World!')
  })

  it('strips standard color codes (SGR)', () => {
    const colored = '\x1b[31mRed text\x1b[0m and \x1b[32mGreen\x1b[0m'
    expect(stripAnsi(colored)).toBe('Red text and Green')
  })

  it('strips complex 256-color and bold codes', () => {
    const complex = '\x1b[1;38;5;196mBold Red\x1b[0m \x1b[4;34mUnderline Blue\x1b[0m'
    expect(stripAnsi(complex)).toBe('Bold Red Underline Blue')
  })

  it('strips cursor movement and clear screen codes', () => {
    const cursor = '\x1b[2J\x1b[Hroot@server:~$ \x1b[K'
    expect(stripAnsi(cursor)).toBe('root@server:~$ ')
  })

  it('strips OSC sequences such as window title or OSC 7', () => {
    const osc = '\x1b]0;User@Host: /var/log\x07\x1b]7;file://host/path\x07Prompt$ '
    expect(stripAnsi(osc)).toBe('Prompt$ ')
  })
})
