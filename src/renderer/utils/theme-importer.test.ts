import { describe, it, expect } from 'vitest'
import { BUILTIN_THEMES, parseWindowsTerminalTheme, parseIterm2Theme } from './theme-importer'

describe('theme-importer', () => {
  it('contains essential built-in themes', () => {
    expect(BUILTIN_THEMES['TermDeck Dark']).toBeDefined()
    expect(BUILTIN_THEMES['Dracula']).toBeDefined()
    expect(BUILTIN_THEMES['Solarized Dark']).toBeDefined()
    expect(BUILTIN_THEMES['Nord']).toBeDefined()
  })

  describe('parseWindowsTerminalTheme', () => {
    it('parses valid Windows Terminal JSON object', () => {
      const json = JSON.stringify({
        name: 'My Cool Theme',
        background: '#101010',
        foreground: '#e0e0e0',
        cursorColor: '#ffffff',
        red: '#ff0000',
        green: '#00ff00'
      })

      const res = parseWindowsTerminalTheme(json)
      expect(res).not.toBeNull()
      expect(res?.name).toBe('My Cool Theme')
      expect(res?.theme.background).toBe('#101010')
      expect(res?.theme.foreground).toBe('#e0e0e0')
      expect(res?.theme.red).toBe('#ff0000')
      expect(res?.theme.green).toBe('#00ff00')
    })

    it('returns null on invalid JSON string', () => {
      expect(parseWindowsTerminalTheme('{invalid-json')).toBeNull()
    })
  })

  describe('parseIterm2Theme', () => {
    it('parses iTerm2 XML plist representation', () => {
      const xml = `
        <?xml version="1.0" encoding="UTF-8"?>
        <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN">
        <plist version="1.0">
        <dict>
          <key>Background Color</key>
          <dict>
            <key>Red Component</key><real>0.1</real>
            <key>Green Component</key><real>0.2</real>
            <key>Blue Component</key><real>0.3</real>
          </dict>
          <key>Foreground Color</key>
          <dict>
            <key>Red Component</key><real>0.9</real>
            <key>Green Component</key><real>0.9</real>
            <key>Blue Component</key><real>0.9</real>
          </dict>
        </dict>
        </plist>
      `

      const res = parseIterm2Theme(xml)
      expect(res).not.toBeNull()
      expect(res?.name).toBe('iTerm2 Imported Theme')
      expect(res?.theme.background).toBeDefined()
      expect(res?.theme.foreground).toBeDefined()
    })
  })
})
