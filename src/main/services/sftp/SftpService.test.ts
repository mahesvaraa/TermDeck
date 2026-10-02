import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Client } from 'ssh2'
import { SftpService, formatPosixPermissions } from './SftpService'
import { sshConnectionManager } from '../ssh/SshConnectionManager'

vi.mock('../ssh/SshConnectionManager', () => ({
  sshConnectionManager: {
    getClient: vi.fn()
  }
}))

describe('SftpService', () => {
  let sftpService: SftpService

  beforeEach(() => {
    sftpService = new SftpService()
    vi.clearAllMocks()
  })

  describe('formatPosixPermissions', () => {
    it('formats directory permissions correctly', () => {
      // 0o040755: directory + rwxr-xr-x
      expect(formatPosixPermissions(0o040755)).toBe('drwxr-xr-x')
    })

    it('formats regular file permissions correctly', () => {
      // 0o100644: file + rw-r--r--
      expect(formatPosixPermissions(0o100644)).toBe('-rw-r--r--')
      // 0o100777: file + rwxrwxrwx
      expect(formatPosixPermissions(0o100777)).toBe('-rwxrwxrwx')
    })

    it('formats symbolic link permissions correctly', () => {
      // 0o120777: symlink + rwxrwxrwx
      expect(formatPosixPermissions(0o120777)).toBe('lrwxrwxrwx')
    })
  })

  describe('Directory listing & file operations', () => {
    it('throws error when session is not connected', async () => {
      vi.mocked(sshConnectionManager.getClient).mockReturnValue(undefined)

      await expect(sftpService.list('offline-sess', '/var/www')).rejects.toThrow(/не подключена/)
    })

    it('lists directory entries, filters dot-files and sorts directories first', async () => {
      const mockSftpWrapper = {
        on: vi.fn(),
        realpath: vi.fn((path, cb) => cb(undefined, path)),
        readdir: vi.fn((path, cb) => {
          cb(undefined, [
            { filename: '.', attrs: { isDirectory: () => true, mode: 0o040755 } },
            { filename: '..', attrs: { isDirectory: () => true, mode: 0o040755 } },
            {
              filename: 'zebra.txt',
              attrs: {
                isDirectory: () => false,
                isSymbolicLink: () => false,
                size: 1024,
                mode: 0o100644,
                mtime: 1700000000,
                uid: 1000
              }
            },
            {
              filename: 'alpha-dir',
              attrs: {
                isDirectory: () => true,
                isSymbolicLink: () => false,
                size: 4096,
                mode: 0o040755,
                mtime: 1700000000,
                uid: 1000
              }
            },
            {
              filename: 'beta.txt',
              attrs: {
                isDirectory: () => false,
                isSymbolicLink: () => false,
                size: 2048,
                mode: 0o100644,
                mtime: 1700000000,
                uid: 1000
              }
            }
          ])
        }),
        end: vi.fn()
      }

      const mockClient = {
        sftp: vi.fn((cb) => cb(undefined, mockSftpWrapper))
      }

      vi.mocked(sshConnectionManager.getClient).mockReturnValue(mockClient as unknown as Client)

      const result = await sftpService.list('sess-1', '/var/www')
      expect(result.path).toBe('/var/www')
      expect(result.items.length).toBe(3)

      // Directories must appear first
      expect(result.items[0].name).toBe('alpha-dir')
      expect(result.items[0].type).toBe('directory')
      expect(result.items[0].permissions).toBe('drwxr-xr-x')

      // Files follow alphabetically
      expect(result.items[1].name).toBe('beta.txt')
      expect(result.items[2].name).toBe('zebra.txt')
    })
  })
})
