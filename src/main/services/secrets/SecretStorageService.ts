import { app, safeStorage } from 'electron'
import { join } from 'node:path'
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs'

export class SecretStorageService {
  private secretsPath: string | null = null
  private memorySecrets = new Map<string, string>()

  private getFilePath(): string {
    if (!this.secretsPath) {
      this.secretsPath = join(app.getPath('userData'), 'secrets.enc.json')
    }
    return this.secretsPath
  }

  public isAvailable(): boolean {
    try {
      return safeStorage.isEncryptionAvailable()
    } catch {
      return false
    }
  }

  private loadEncryptedMap(): Record<string, string> {
    try {
      const path = this.getFilePath()
      if (existsSync(path)) {
        const raw = readFileSync(path, 'utf-8')
        return JSON.parse(raw)
      }
    } catch {
      // Ignored
    }
    return {}
  }

  private saveEncryptedMap(map: Record<string, string>): void {
    try {
      const path = this.getFilePath()
      writeFileSync(path, JSON.stringify(map, null, 2), 'utf-8')
    } catch (err) {
      console.error('Failed to save encrypted secrets:', err)
    }
  }

  /**
   * Save a secret encrypted with Electron safeStorage.
   * If safeStorage is unavailable, stores only in memory for current app run.
   */
  public setSecret(key: string, plainText: string): boolean {
    if (!plainText) {
      this.deleteSecret(key)
      return true
    }

    if (!this.isAvailable()) {
      // Do NOT write unencrypted secrets to disk. Keep in memory only.
      this.memorySecrets.set(key, plainText)
      return false
    }

    try {
      const encryptedBuffer = safeStorage.encryptString(plainText)
      const map = this.loadEncryptedMap()
      map[key] = encryptedBuffer.toString('base64')
      this.saveEncryptedMap(map)
      return true
    } catch (err) {
      console.error('safeStorage encryption failed:', err)
      this.memorySecrets.set(key, plainText)
      return false
    }
  }

  /**
   * Retrieve and decrypt a secret.
   */
  public getSecret(key: string): string | null {
    // Check in-memory secrets first
    if (this.memorySecrets.has(key)) {
      return this.memorySecrets.get(key) || null
    }

    if (!this.isAvailable()) {
      return null
    }

    try {
      const map = this.loadEncryptedMap()
      const base64Str = map[key]
      if (!base64Str) return null

      const buffer = Buffer.from(base64Str, 'base64')
      return safeStorage.decryptString(buffer)
    } catch (err) {
      console.error('safeStorage decryption failed:', err)
      return null
    }
  }

  /**
   * Delete a stored secret.
   */
  public deleteSecret(key: string): void {
    this.memorySecrets.delete(key)
    try {
      const map = this.loadEncryptedMap()
      if (map[key]) {
        delete map[key]
        this.saveEncryptedMap(map)
      }
    } catch {
      // Ignored
    }
  }

  /**
   * Clear all secrets (for testing or reset).
   */
  public clearAll(): void {
    this.memorySecrets.clear()
    try {
      const path = this.getFilePath()
      if (existsSync(path)) {
        unlinkSync(path)
      }
    } catch {
      // Ignored
    }
  }
}

export const secretStorageService = new SecretStorageService()
