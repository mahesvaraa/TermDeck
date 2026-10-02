import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SessionStore } from './SessionStore'
import type { SessionConfig, SessionFolder } from '@shared/types'

// Mock Electron modules
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn().mockReturnValue('/tmp')
  },
  safeStorage: {
    isEncryptionAvailable: vi.fn().mockReturnValue(false)
  }
}))

// Mock electron-store with in-memory map
vi.mock('electron-store', () => {
  return {
    default: class MockStore<T extends Record<string, unknown>> {
      private data: Record<string, unknown>

      constructor(options?: { defaults?: Record<string, unknown> }) {
        this.data = { ...(options?.defaults || {}) }
      }

      get<K extends keyof T>(key: K, defaultValue?: unknown): unknown {
        return this.data[key as string] !== undefined ? this.data[key as string] : defaultValue
      }

      set(key: string, value: unknown): void {
        this.data[key] = value
      }

      clear(): void {
        this.data = {}
      }
    }
  }
})

describe('SessionStore', () => {
  let sessionStore: SessionStore

  beforeEach(() => {
    sessionStore = new SessionStore({ name: 'test-sessions' })
  })

  it('initializes with empty sessions and folders by default', () => {
    const sessions = sessionStore.listSessions()
    const folders = sessionStore.listFolders()

    expect(sessions).toEqual([])
    expect(folders).toEqual([])
  })

  it('creates and updates a session', () => {
    const newSession: SessionConfig = {
      id: 's-test-srv',
      name: 'Test Server',
      host: '192.168.1.50',
      port: 22,
      username: 'admin',
      auth: 'password',
      keepaliveSec: 30,
      encoding: 'utf-8'
    }

    sessionStore.saveSession(newSession)
    let found = sessionStore.getSession('s-test-srv')
    expect(found).toBeDefined()
    expect(found?.username).toBe('admin')

    // Update
    sessionStore.saveSession({ ...newSession, username: 'root' })
    found = sessionStore.getSession('s-test-srv')
    expect(found?.username).toBe('root')
  })

  it('deletes a session', () => {
    const targetSession: SessionConfig = {
      id: 's-to-delete',
      name: 'Temp Server',
      host: '1.2.3.4',
      port: 22,
      username: 'root',
      auth: 'password',
      keepaliveSec: 30,
      encoding: 'utf-8'
    }

    sessionStore.saveSession(targetSession)
    expect(sessionStore.getSession('s-to-delete')).toBeDefined()

    sessionStore.deleteSession('s-to-delete')
    expect(sessionStore.getSession('s-to-delete')).toBeUndefined()
  })

  it('creates, lists and deletes folders, unlinking assigned sessions', () => {
    const folder: SessionFolder = {
      id: 'f-custom',
      name: 'Database Cluster'
    }

    sessionStore.saveFolder(folder)
    expect(sessionStore.listFolders().some((f) => f.id === 'f-custom')).toBe(true)

    const sessionInFolder: SessionConfig = {
      id: 's-db-clustered',
      name: 'DB Clustered',
      folderId: 'f-custom',
      host: '10.0.0.10',
      port: 5432,
      username: 'pg',
      auth: 'key',
      keepaliveSec: 30,
      encoding: 'utf-8'
    }

    sessionStore.saveSession(sessionInFolder)
    expect(sessionStore.getSession('s-db-clustered')?.folderId).toBe('f-custom')

    // Deleting the folder should unassign folderId
    sessionStore.deleteFolder('f-custom')
    expect(sessionStore.listFolders().some((f) => f.id === 'f-custom')).toBe(false)
    expect(sessionStore.getSession('s-db-clustered')?.folderId).toBeUndefined()
  })

  describe('Known Hosts Verification', () => {
    const fakeKey1 = Buffer.from('ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIGo1fakeKey1')
    const fakeKey2 = Buffer.from('ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIGo1fakeKey2')

    it('reports new host key when host is unknown', () => {
      const res = sessionStore.verifyHostKey('192.168.1.1', 22, 'ssh-ed25519', fakeKey1)

      expect(res.status).toBe('new')
      expect(res.fingerprintSha256).toMatch(/^SHA256:[A-Za-z0-9+/=]+$/)
    })

    it('reports trusted host key when fingerprint matches known host', () => {
      const { fingerprintSha256 } = sessionStore.verifyHostKey(
        '192.168.1.1',
        22,
        'ssh-ed25519',
        fakeKey1
      )

      sessionStore.addKnownHost({
        host: '192.168.1.1',
        port: 22,
        keyType: 'ssh-ed25519',
        fingerprintSha256,
        trustedAt: new Date().toISOString()
      })

      const verified = sessionStore.verifyHostKey('192.168.1.1', 22, 'ssh-ed25519', fakeKey1)
      expect(verified.status).toBe('trusted')
      expect(verified.fingerprintSha256).toBe(fingerprintSha256)
    })

    it('reports mismatch when key differs from known host', () => {
      const { fingerprintSha256 } = sessionStore.verifyHostKey(
        '192.168.1.1',
        22,
        'ssh-ed25519',
        fakeKey1
      )

      sessionStore.addKnownHost({
        host: '192.168.1.1',
        port: 22,
        keyType: 'ssh-ed25519',
        fingerprintSha256,
        trustedAt: new Date().toISOString()
      })

      // Host presents a different key
      const verified = sessionStore.verifyHostKey('192.168.1.1', 22, 'ssh-ed25519', fakeKey2)
      expect(verified.status).toBe('mismatch')
      expect(verified.fingerprintSha256).not.toBe(fingerprintSha256)
    })

    it('removes known host', () => {
      sessionStore.addKnownHost({
        host: '10.0.0.1',
        port: 22,
        keyType: 'ssh',
        fingerprintSha256: 'SHA256:abc',
        trustedAt: new Date().toISOString()
      })

      expect(sessionStore.getKnownHost('10.0.0.1', 22)).toBeDefined()
      sessionStore.removeKnownHost('10.0.0.1', 22)
      expect(sessionStore.getKnownHost('10.0.0.1', 22)).toBeUndefined()
    })
  })
})
