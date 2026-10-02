import { homedir } from 'node:os'
import { join } from 'node:path'
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { generateKeyPairSync, createHash } from 'node:crypto'
import type { SshKeyItem } from '@shared/types'
import { sftpService } from '../sftp/SftpService'

function encodeSshString(data: Buffer | string): Buffer {
  const buf = typeof data === 'string' ? Buffer.from(data, 'utf-8') : data
  const lenBuf = Buffer.alloc(4)
  lenBuf.writeUInt32BE(buf.length, 0)
  return Buffer.concat([lenBuf, buf])
}

export function rawEd25519ToOpenSshPub(rawPubKey: Buffer, comment = 'termdeck'): string {
  const typeStr = 'ssh-ed25519'
  const wireBuf = Buffer.concat([encodeSshString(typeStr), encodeSshString(rawPubKey)])
  const b64 = wireBuf.toString('base64')
  return `${typeStr} ${b64} ${comment}`
}

export function calculateSshFingerprint(publicKeyOpenSsh: string): string {
  try {
    const parts = publicKeyOpenSsh.trim().split(/\s+/)
    if (parts.length < 2) return 'SHA256:unknown'
    const wireBuffer = Buffer.from(parts[1], 'base64')
    const hash = createHash('sha256').update(wireBuffer).digest('base64').replace(/=+$/, '')
    return `SHA256:${hash}`
  } catch {
    return 'SHA256:unknown'
  }
}

export class SshKeyManager {
  private customKeys = new Map<string, SshKeyItem>()

  /**
   * Scan ~/.ssh and list all available public/private SSH keys.
   */
  public listKeys(): SshKeyItem[] {
    const keys: SshKeyItem[] = []
    const sshDir = join(homedir(), '.ssh')

    if (existsSync(sshDir)) {
      try {
        const files = readdirSync(sshDir)
        // Find private keys that have corresponding .pub files or standard names
        for (const file of files) {
          if (
            file.endsWith('.pub') ||
            file.endsWith('.known_hosts') ||
            file === 'config' ||
            file === 'known_hosts'
          ) {
            continue
          }

          const fullPath = join(sshDir, file)
          const pubPath = `${fullPath}.pub`

          let pubText = ''
          if (existsSync(pubPath)) {
            pubText = readFileSync(pubPath, 'utf-8').trim()
          }

          // Check if key is encrypted
          let isEncrypted = false
          let keyContent = ''
          try {
            keyContent = readFileSync(fullPath, 'utf-8')
            isEncrypted =
              keyContent.includes('ENCRYPTED') ||
              keyContent.includes('aes256') ||
              keyContent.includes('bcrypt')
          } catch {
            // Ignore unreadable
          }

          let keyType: SshKeyItem['type'] = 'unknown'
          if (file.includes('ed25519') || pubText.startsWith('ssh-ed25519')) {
            keyType = 'ed25519'
          } else if (file.includes('rsa') || pubText.startsWith('ssh-rsa')) {
            keyType = 'rsa'
          } else if (file.includes('ecdsa') || pubText.startsWith('ecdsa')) {
            keyType = 'ecdsa'
          }

          const fingerprint = pubText ? calculateSshFingerprint(pubText) : '—'
          const comment = pubText ? pubText.split(/\s+/)[2] || file : file

          keys.push({
            id: `sys-${file}`,
            name: file,
            path: fullPath,
            type: keyType,
            isEncrypted,
            publicKeyText: pubText,
            fingerprintSha256: fingerprint,
            comment,
            source: 'system'
          })
        }
      } catch {
        // Ignored if reading directory fails
      }
    }

    // Add custom imported keys
    for (const custom of this.customKeys.values()) {
      if (!keys.some((k) => k.path === custom.path)) {
        keys.push(custom)
      }
    }

    return keys
  }

  /**
   * Generate a new Ed25519 key pair and save to ~/.ssh/<name>.
   */
  public generateEd25519Key(name: string, comment = 'termdeck', passphrase?: string): SshKeyItem {
    const sshDir = join(homedir(), '.ssh')
    if (!existsSync(sshDir)) {
      mkdirSync(sshDir, { recursive: true, mode: 0o700 })
    }

    const { privateKey, publicKey } = generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'der' },
      privateKeyEncoding: passphrase
        ? {
            type: 'pkcs8',
            format: 'pem',
            cipher: 'aes-256-cbc',
            passphrase
          }
        : {
            type: 'pkcs8',
            format: 'pem'
          }
    })

    // Extract raw 32 bytes of public key from SPKI DER
    const rawPubKey = publicKey.subarray(publicKey.length - 32)
    const openSshPub = rawEd25519ToOpenSshPub(rawPubKey, comment)

    const keyPath = join(sshDir, name)
    const pubPath = `${keyPath}.pub`

    writeFileSync(keyPath, privateKey, { mode: 0o600 })
    writeFileSync(pubPath, openSshPub, { mode: 0o644 })

    const fingerprint = calculateSshFingerprint(openSshPub)

    const item: SshKeyItem = {
      id: `gen-${name}-${Date.now().toString(36)}`,
      name,
      path: keyPath,
      type: 'ed25519',
      isEncrypted: Boolean(passphrase),
      publicKeyText: openSshPub,
      fingerprintSha256: fingerprint,
      comment,
      source: 'system'
    }

    this.customKeys.set(item.id, item)
    return item
  }

  /**
   * Import an existing key from disk.
   */
  public importKey(filePath: string): SshKeyItem {
    const fileName = filePath.split(/[/\\]/).filter(Boolean).pop() || 'imported_key'
    const pubPath = `${filePath}.pub`

    let pubText = ''
    if (existsSync(pubPath)) {
      pubText = readFileSync(pubPath, 'utf-8').trim()
    }

    const content = readFileSync(filePath, 'utf-8')
    const isEncrypted =
      content.includes('ENCRYPTED') || content.includes('aes256') || content.includes('bcrypt')

    let keyType: SshKeyItem['type'] = 'unknown'
    if (fileName.includes('ed25519') || pubText.startsWith('ssh-ed25519')) {
      keyType = 'ed25519'
    } else if (fileName.includes('rsa') || pubText.startsWith('ssh-rsa')) {
      keyType = 'rsa'
    }

    const fingerprint = pubText ? calculateSshFingerprint(pubText) : '—'

    const item: SshKeyItem = {
      id: `import-${Date.now().toString(36)}`,
      name: fileName,
      path: filePath,
      type: keyType,
      isEncrypted,
      publicKeyText: pubText,
      fingerprintSha256: fingerprint,
      comment: pubText.split(/\s+/)[2] || fileName,
      source: 'custom'
    }

    this.customKeys.set(item.id, item)
    return item
  }

  /**
   * Install public key to remote server's ~/.ssh/authorized_keys (ssh-copy-id equivalent).
   */
  public async installKeyToServer(publicKeyText: string, sessionId: string): Promise<boolean> {
    if (!publicKeyText || !publicKeyText.trim()) {
      throw new Error('Публичный ключ пуст')
    }

    const keyLine = publicKeyText.trim()

    // Ensure remote ~/.ssh exists with mode 0700
    try {
      await sftpService.mkdir(sessionId, '.ssh')
    } catch {
      // Might already exist
    }

    try {
      await sftpService.chmod(sessionId, '.ssh', 0o700)
    } catch {
      // Ignored
    }

    const authKeysPath = '.ssh/authorized_keys'

    let existingContent = ''
    try {
      existingContent = await sftpService.readFile(sessionId, authKeysPath)
    } catch {
      existingContent = ''
    }

    // Check if key is already authorized
    if (existingContent.includes(keyLine.split(/\s+/)[1] || keyLine)) {
      return true
    }

    const updatedContent =
      existingContent.endsWith('\n') || existingContent === ''
        ? `${existingContent}${keyLine}\n`
        : `${existingContent}\n${keyLine}\n`

    await sftpService.writeFile(sessionId, authKeysPath, updatedContent)

    try {
      await sftpService.chmod(sessionId, authKeysPath, 0o600)
    } catch {
      // Ignored
    }

    return true
  }
}

export const sshKeyManager = new SshKeyManager()
