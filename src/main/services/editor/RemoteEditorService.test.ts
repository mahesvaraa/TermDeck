import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Stats } from 'ssh2'
import { RemoteEditorService } from './RemoteEditorService'
import { sftpService } from '../sftp/SftpService'

describe('RemoteEditorService', () => {
  let service: RemoteEditorService

  beforeEach(() => {
    service = new RemoteEditorService()
    vi.clearAllMocks()
  })

  it('opens a valid text file and detects CRLF line endings', async () => {
    vi.spyOn(sftpService, 'statRaw').mockResolvedValue({
      size: 24,
      mtime: 1700000000,
      mode: 0o644
    } as unknown as Stats)

    vi.spyOn(sftpService, 'readFileBuffer').mockResolvedValue(
      Buffer.from('line1\r\nline2\r\nline3')
    )

    const result = await service.openFile('sess-1', '/var/www/test.txt')
    expect(result.content).toBe('line1\r\nline2\r\nline3')
    expect(result.lineEndings).toBe('CRLF')
    expect(result.encoding).toBe('UTF-8')
    expect(result.size).toBe(24)
    expect(result.mtime).toBe(1700000000000)
    expect(result.mode).toBe(0o644)
  })

  it('rejects files larger than 5 MB', async () => {
    vi.spyOn(sftpService, 'statRaw').mockResolvedValue({
      size: 6 * 1024 * 1024,
      mtime: 1700000000,
      mode: 0o644
    } as unknown as Stats)

    await expect(service.openFile('sess-1', '/var/www/large.log')).rejects.toThrow(
      'Лимит встроенного редактора — 5 МБ'
    )
  })

  it('rejects binary files containing NUL bytes in the first 8 KB', async () => {
    vi.spyOn(sftpService, 'statRaw').mockResolvedValue({
      size: 100,
      mtime: 1700000000,
      mode: 0o644
    } as unknown as Stats)

    const binaryBuffer = Buffer.from([0x7f, 0x45, 0x4c, 0x46, 0x00, 0x01, 0x01])
    vi.spyOn(sftpService, 'readFileBuffer').mockResolvedValue(binaryBuffer)

    await expect(service.openFile('sess-1', '/bin/busybox')).rejects.toThrow(
      'Файл содержит двоичные символы'
    )
  })

  it('performs atomic save with temp file and rename preserving permissions', async () => {
    vi.spyOn(sftpService, 'statRaw')
      .mockResolvedValueOnce({
        size: 50,
        mtime: 1700000000,
        mode: 0o755
      } as unknown as Stats)
      .mockResolvedValueOnce({
        size: 100,
        mtime: 1700000500,
        mode: 0o755
      } as unknown as Stats)

    const writeSpy = vi.spyOn(sftpService, 'writeFileBuffer').mockResolvedValue(true)
    const chmodSpy = vi.spyOn(sftpService, 'chmod').mockResolvedValue(true)
    const renameSpy = vi.spyOn(sftpService, 'rename').mockResolvedValue(true)

    const res = await service.saveFile(
      'sess-1',
      '/var/www/index.html',
      '<html><body>Hello</body></html>',
      1700000000000,
      50
    )

    expect(res.success).toBe(true)
    expect(res.conflict).toBeUndefined()
    expect(writeSpy).toHaveBeenCalled()
    expect(chmodSpy).toHaveBeenCalledWith(
      'sess-1',
      expect.stringContaining('.termdeck-tmp.'),
      0o755
    )
    expect(renameSpy).toHaveBeenCalledWith(
      'sess-1',
      expect.stringContaining('.termdeck-tmp.'),
      '/var/www/index.html'
    )
  })

  it('detects server conflict when mtime differs', async () => {
    vi.spyOn(sftpService, 'statRaw').mockResolvedValue({
      size: 60,
      mtime: 1700009999, // Modified on server
      mode: 0o644
    } as unknown as Stats)

    const res = await service.saveFile(
      'sess-1',
      '/var/www/app.js',
      'console.log("new")',
      1700000000000, // Expected initial mtime
      50 // Expected initial size
    )

    expect(res.success).toBe(false)
    expect(res.conflict).toBe(true)
    expect(res.currentMtime).toBe(1700009999000)
    expect(res.currentSize).toBe(60)
  })

  it('allows force overwrite despite server conflict', async () => {
    vi.spyOn(sftpService, 'statRaw')
      .mockResolvedValueOnce({
        size: 60,
        mtime: 1700009999,
        mode: 0o644
      } as unknown as Stats)
      .mockResolvedValueOnce({
        size: 70,
        mtime: 1700010000,
        mode: 0o644
      } as unknown as Stats)

    vi.spyOn(sftpService, 'writeFileBuffer').mockResolvedValue(true)
    vi.spyOn(sftpService, 'rename').mockResolvedValue(true)

    const res = await service.saveFile(
      'sess-1',
      '/var/www/app.js',
      'console.log("force")',
      1700000000000,
      50,
      true // forceOverwrite
    )

    expect(res.success).toBe(true)
    expect(res.conflict).toBeUndefined()
  })

  it('supports save as copy', async () => {
    vi.spyOn(sftpService, 'writeFileBuffer').mockResolvedValue(true)
    vi.spyOn(sftpService, 'statRaw').mockResolvedValue({
      size: 40,
      mtime: 1700011111,
      mode: 0o644
    } as unknown as Stats)

    const res = await service.saveFile(
      'sess-1',
      '/var/www/app.js',
      'console.log("copy")',
      1700000000000,
      50,
      false,
      true, // saveAsCopy
      '/var/www/app.backup.js'
    )

    expect(res.success).toBe(true)
    expect(res.savedPath).toBe('/var/www/app.backup.js')
  })
})
