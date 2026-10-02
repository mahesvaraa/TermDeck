import { describe, it, expect } from 'vitest'
import { getLanguageFromPath } from './editor-languages'

describe('getLanguageFromPath', () => {
  it('detects common programming languages', () => {
    expect(getLanguageFromPath('/var/www/index.ts')).toBe('typescript')
    expect(getLanguageFromPath('/app/main.py')).toBe('python')
    expect(getLanguageFromPath('/src/App.tsx')).toBe('typescript')
    expect(getLanguageFromPath('/scripts/build.js')).toBe('javascript')
    expect(getLanguageFromPath('/scripts/deploy.sh')).toBe('shell')
    expect(getLanguageFromPath('/config/settings.json')).toBe('json')
    expect(getLanguageFromPath('/config/docker-compose.yml')).toBe('yaml')
    expect(getLanguageFromPath('/db/schema.sql')).toBe('sql')
  })

  it('detects special file names', () => {
    expect(getLanguageFromPath('/app/Dockerfile')).toBe('dockerfile')
    expect(getLanguageFromPath('/etc/nginx/nginx.conf')).toBe('ini')
    expect(getLanguageFromPath('/app/.env.production')).toBe('ini')
  })

  it('falls back to plaintext for unknown files', () => {
    expect(getLanguageFromPath('/var/log/syslog')).toBe('plaintext')
    expect(getLanguageFromPath('/etc/hosts')).toBe('plaintext')
  })
})
