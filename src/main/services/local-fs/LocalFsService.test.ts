import { describe, it, expect } from 'vitest'
import { LocalFsService } from './LocalFsService'

describe('LocalFsService', () => {
  const service = new LocalFsService()

  it('gets valid home directory', () => {
    const home = service.getHomeDir()
    expect(home).toBeDefined()
    expect(home.length).toBeGreaterThan(0)
  })

  it('gets drives list', () => {
    const drives = service.getDrives()
    expect(Array.isArray(drives)).toBe(true)
    expect(drives.length).toBeGreaterThan(0)
  })

  it('lists contents of home directory', async () => {
    const res = await service.listDirectory(service.getHomeDir())
    expect(res.path).toBeDefined()
    expect(Array.isArray(res.items)).toBe(true)
    expect(res.items.length).toBeGreaterThan(0)
    for (const item of res.items) {
      expect(item.name).toBeDefined()
      expect(item.type).toMatch(/^(file|directory|symlink)$/)
    }
  })
})
