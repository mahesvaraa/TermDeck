import Store from 'electron-store'
import { createHash } from 'node:crypto'
import type { SessionConfig, SessionFolder, KnownHostRecord } from '@shared/types'
import { secretStorageService } from '../secrets/SecretStorageService'

interface StoreSchema {
  sessions: SessionConfig[]
  folders: SessionFolder[]
  knownHosts: KnownHostRecord[]
}

const defaultSessions: SessionConfig[] = []

const defaultFolders: SessionFolder[] = []

export class SessionStore {
  private store: Store<StoreSchema>

  constructor(options?: { name?: string; cwd?: string }) {
    this.store = new Store<StoreSchema>({
      name: options?.name || 'termdeck-sessions',
      cwd: options?.cwd,
      defaults: {
        sessions: defaultSessions,
        folders: defaultFolders,
        knownHosts: []
      }
    })

    // Clean up legacy dummy demo sessions if present in existing stores
    const legacyIds = new Set(['s-prod-web-01', 's-prod-db-primary', 's-stage-api'])
    const existing = this.store.get('sessions', [])
    if (existing.some((s) => legacyIds.has(s.id))) {
      this.store.set(
        'sessions',
        existing.filter((s) => !legacyIds.has(s.id))
      )
    }
    const legacyFolderIds = new Set(['f-prod', 'f-stage'])
    const existingFolders = this.store.get('folders', [])
    if (existingFolders.some((f) => legacyFolderIds.has(f.id))) {
      this.store.set(
        'folders',
        existingFolders.filter((f) => !legacyFolderIds.has(f.id))
      )
    }
  }

  // --- Sessions CRUD ---

  public listSessions(): SessionConfig[] {
    return this.store.get('sessions', [])
  }

  public getSession(id: string): SessionConfig | undefined {
    return this.listSessions().find((s) => s.id === id)
  }

  public saveSession(session: SessionConfig, secret?: string): SessionConfig {
    const sessions = this.listSessions()
    const index = sessions.findIndex((s) => s.id === session.id)

    if (index >= 0) {
      sessions[index] = session
    } else {
      sessions.push(session)
    }

    this.store.set('sessions', sessions)

    if (secret !== undefined) {
      secretStorageService.setSecret(session.id, secret)
    }

    return session
  }

  public deleteSession(id: string): void {
    const sessions = this.listSessions().filter((s) => s.id !== id)
    this.store.set('sessions', sessions)
    secretStorageService.deleteSecret(id)
  }

  // --- Folders CRUD ---

  public listFolders(): SessionFolder[] {
    return this.store.get('folders', [])
  }

  public saveFolder(folder: SessionFolder): SessionFolder {
    const folders = this.listFolders()
    const index = folders.findIndex((f) => f.id === folder.id)

    if (index >= 0) {
      folders[index] = folder
    } else {
      folders.push(folder)
    }

    this.store.set('folders', folders)
    return folder
  }

  public deleteFolder(id: string): void {
    const folders = this.listFolders().filter((f) => f.id !== id)
    this.store.set('folders', folders)

    // Unassign folder from any sessions belonging to this folder
    const sessions = this.listSessions().map((s) =>
      s.folderId === id ? { ...s, folderId: undefined } : s
    )
    this.store.set('sessions', sessions)
  }

  // --- Known Hosts Verification ---

  public listKnownHosts(): KnownHostRecord[] {
    return this.store.get('knownHosts', [])
  }

  public getKnownHost(host: string, port: number): KnownHostRecord | undefined {
    return this.listKnownHosts().find((h) => h.host === host && h.port === port)
  }

  public addKnownHost(record: KnownHostRecord): void {
    const knownHosts = this.listKnownHosts().filter(
      (h) => !(h.host === record.host && h.port === record.port)
    )
    knownHosts.push(record)
    this.store.set('knownHosts', knownHosts)
  }

  public removeKnownHost(host: string, port: number): void {
    const knownHosts = this.listKnownHosts().filter((h) => !(h.host === host && h.port === port))
    this.store.set('knownHosts', knownHosts)
  }

  /**
   * Verify an incoming SSH host public key against known_hosts.
   */
  public verifyHostKey(
    host: string,
    port: number,
    keyType: string,
    keyBuffer: Buffer
  ): { status: 'trusted' | 'new' | 'mismatch'; fingerprintSha256: string } {
    const fingerprintSha256 = `SHA256:${createHash('sha256').update(keyBuffer).digest('base64')}`
    const existing = this.getKnownHost(host, port)

    if (!existing) {
      return { status: 'new', fingerprintSha256 }
    }

    if (existing.fingerprintSha256 === fingerprintSha256) {
      return { status: 'trusted', fingerprintSha256 }
    }

    return { status: 'mismatch', fingerprintSha256 }
  }

  /**
   * Reset store for unit tests.
   */
  public clearAll(): void {
    this.store.clear()
  }
}

export const sessionStore = new SessionStore()
