import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SshKeyManager, rawEd25519ToOpenSshPub, calculateSshFingerprint } from './SshKeyManager'
import { sftpService } from '../sftp/SftpService'

describe('SshKeyManager', () => {
  let manager: SshKeyManager

  beforeEach(() => {
    manager = new SshKeyManager()
    vi.clearAllMocks()
  })

  it('formats raw Ed25519 public key into OpenSSH wire format', () => {
    const rawKey = Buffer.alloc(32, 1) // 32 dummy bytes
    const openSsh = rawEd25519ToOpenSshPub(rawKey, 'test-key')

    expect(openSsh.startsWith('ssh-ed25519 ')).toBe(true)
    expect(openSsh.endsWith(' test-key')).toBe(true)

    const fingerprint = calculateSshFingerprint(openSsh)
    expect(fingerprint.startsWith('SHA256:')).toBe(true)
  })

  it('calculates SHA256 fingerprint from OpenSSH public key', () => {
    // Example well-known dummy ed25519 pubkey
    const pub =
      'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIGt6P67q0J8b9Q5qjY/2jV/7XpL8N8tV2d6Z9m0J1K2L termdeck'
    const fp = calculateSshFingerprint(pub)

    expect(fp).toMatch(/^SHA256:[A-Za-z0-9+/=]+$/)
  })

  it('installs public key to remote authorized_keys via SFTP (ssh-copy-id)', async () => {
    vi.spyOn(sftpService, 'mkdir').mockResolvedValue(true)
    vi.spyOn(sftpService, 'chmod').mockResolvedValue(true)
    vi.spyOn(sftpService, 'readFile').mockResolvedValue('ssh-rsa AAAAB3Nza... old-key\n')
    const writeSpy = vi.spyOn(sftpService, 'writeFile').mockResolvedValue(true)

    const newKey = 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIGt6P... new-key'
    const result = await manager.installKeyToServer(newKey, 'sess-1')

    expect(result).toBe(true)
    expect(writeSpy).toHaveBeenCalledWith(
      'sess-1',
      '.ssh/authorized_keys',
      expect.stringContaining(newKey)
    )
  })

  it('skips installation if public key is already in authorized_keys', async () => {
    const existingKey = 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIGt6P... existing-key'
    vi.spyOn(sftpService, 'mkdir').mockResolvedValue(true)
    vi.spyOn(sftpService, 'chmod').mockResolvedValue(true)
    vi.spyOn(sftpService, 'readFile').mockResolvedValue(`${existingKey}\n`)
    const writeSpy = vi.spyOn(sftpService, 'writeFile')

    const result = await manager.installKeyToServer(existingKey, 'sess-1')

    expect(result).toBe(true)
    expect(writeSpy).not.toHaveBeenCalled()
  })
})
