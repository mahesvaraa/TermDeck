import { describe, it, expect } from 'vitest'
import { parseOsc7Uri, formatTerminalCdCommand } from './osc7'

describe('parseOsc7Uri', () => {
  it('parses standard file:// URL with hostname', () => {
    expect(parseOsc7Uri('file://prod-server/var/log')).toBe('/var/log')
    expect(parseOsc7Uri('file://localhost/etc/nginx')).toBe('/etc/nginx')
  })

  it('parses file:/// with triple slash', () => {
    expect(parseOsc7Uri('file:///var/www/html')).toBe('/var/www/html')
    expect(parseOsc7Uri('file:///')).toBe('/')
  })

  it('decodes URI-encoded characters including spaces and quotes', () => {
    expect(parseOsc7Uri('file://host/home/anna/my%20documents')).toBe('/home/anna/my documents')
    expect(parseOsc7Uri('file://host/home/anna/don%27t%20delete')).toBe("/home/anna/don't delete")
  })

  it('strips trailing slashes from paths other than root', () => {
    expect(parseOsc7Uri('file://host/var/log/')).toBe('/var/log')
    expect(parseOsc7Uri('file:///var/log/')).toBe('/var/log')
  })

  it('returns null for non-file schemes or empty strings', () => {
    expect(parseOsc7Uri('')).toBeNull()
    expect(parseOsc7Uri('http://localhost/path')).toBeNull()
    expect(parseOsc7Uri('random text')).toBeNull()
  })
})

describe('formatTerminalCdCommand', () => {
  it('wraps simple path in single quotes and appends newline', () => {
    expect(formatTerminalCdCommand('/var/log')).toBe("cd '/var/log'\n")
  })

  it('handles paths with spaces without breakages', () => {
    expect(formatTerminalCdCommand('/var/log/nginx logs')).toBe("cd '/var/log/nginx logs'\n")
  })

  it('safely escapes single quotes in path', () => {
    expect(formatTerminalCdCommand("/home/user/don't touch")).toBe(
      "cd '/home/user/don'\\''t touch'\n"
    )
  })
})
