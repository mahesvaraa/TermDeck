import { app, shell } from 'electron'
import { join, basename } from 'node:path'
import { existsSync, mkdirSync, writeFileSync, unlinkSync, readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import chokidar, { type FSWatcher } from 'chokidar'
import { sftpService } from '../sftp/SftpService'
import type {
  EditorOpenFileResult,
  EditorSaveFileResult,
  ExternalEditorWatchEvent
} from '@shared/types'

interface ActiveExternalWatch {
  watchId: string
  sessionId: string
  remotePath: string
  localPath: string
  watcher: FSWatcher
}

export class RemoteEditorService {
  private activeWatches = new Map<string, ActiveExternalWatch>()

  /**
   * Open a remote file for in-app editing.
   * Enforces 5 MB limit and verifies non-binary heuristic (no NUL in first 8 KB).
   */
  public async openFile(sessionId: string, remotePath: string): Promise<EditorOpenFileResult> {
    const stat = await sftpService.statRaw(sessionId, remotePath)

    const MAX_SIZE = 5 * 1024 * 1024 // 5 MB
    if (stat.size > MAX_SIZE) {
      throw new Error(
        `Файл слишком велик (${(stat.size / 1024 / 1024).toFixed(1)} МБ). Лимит встроенного редактора — 5 МБ.`
      )
    }

    const buffer = await sftpService.readFileBuffer(sessionId, remotePath)

    // Check for NUL bytes in the first 8 KB to detect binary files
    const checkLen = Math.min(buffer.length, 8192)
    for (let i = 0; i < checkLen; i++) {
      if (buffer[i] === 0) {
        throw new Error(
          'Файл содержит двоичные символы и не может быть открыт в текстовом редакторе.'
        )
      }
    }

    const content = buffer.toString('utf-8')
    const lineEndings = content.includes('\r\n') ? 'CRLF' : 'LF'

    return {
      content,
      encoding: 'UTF-8',
      lineEndings,
      mtime: (stat.mtime || 0) * 1000,
      size: stat.size || 0,
      mode: stat.mode || 0
    }
  }

  /**
   * Atomically save a file back to the server with conflict detection and preserved permissions.
   */
  public async saveFile(
    sessionId: string,
    remotePath: string,
    content: string,
    expectedMtime: number,
    expectedSize: number,
    forceOverwrite = false,
    saveAsCopy = false,
    copyPath?: string
  ): Promise<EditorSaveFileResult> {
    const payload = Buffer.from(content, 'utf-8')

    // Handle saving as a separate copy
    if (saveAsCopy) {
      const targetPath = copyPath || `${remotePath}.copy-${Date.now().toString(36)}`
      await sftpService.writeFileBuffer(sessionId, targetPath, payload)
      const copyStat = await sftpService.statRaw(sessionId, targetPath)
      return {
        success: true,
        newMtime: (copyStat.mtime || 0) * 1000,
        newSize: copyStat.size || 0,
        savedPath: targetPath
      }
    }

    // Check conflict against current server state
    let currentStat
    try {
      currentStat = await sftpService.statRaw(sessionId, remotePath)
    } catch {
      // File may have been deleted or is newly created
    }

    if (currentStat && !forceOverwrite) {
      const currentMtime = (currentStat.mtime || 0) * 1000
      if (currentMtime !== expectedMtime || currentStat.size !== expectedSize) {
        return {
          success: false,
          conflict: true,
          currentMtime,
          currentSize: currentStat.size
        }
      }
    }

    // Atomic save: write to temporary file alongside original, chmod, then rename
    const dir = remotePath.substring(0, remotePath.lastIndexOf('/')) || '/'
    const base = remotePath.substring(remotePath.lastIndexOf('/') + 1)
    const tempPath = `${dir === '/' ? '' : dir}/.${base}.termdeck-tmp.${Date.now()}`

    await sftpService.writeFileBuffer(sessionId, tempPath, payload)

    // Preserve original file permissions
    if (currentStat && currentStat.mode) {
      try {
        await sftpService.chmod(sessionId, tempPath, currentStat.mode)
      } catch {
        // Ignored if chmod fails
      }
    }

    // Rename atomically replacing the original, with direct write fallback
    try {
      await sftpService.rename(sessionId, tempPath, remotePath)
    } catch {
      await sftpService.writeFileBuffer(sessionId, remotePath, payload)
      try {
        await sftpService.delete(sessionId, tempPath)
      } catch {
        // Ignored
      }
    }

    const finalStat = await sftpService.statRaw(sessionId, remotePath)

    return {
      success: true,
      newMtime: (finalStat.mtime || 0) * 1000,
      newSize: finalStat.size,
      savedPath: remotePath
    }
  }

  /**
   * Download to system temporary directory, open in default external editor,
   * and monitor file for changes with chokidar.
   */
  public async openExternal(
    sessionId: string,
    remotePath: string,
    onModified: (event: ExternalEditorWatchEvent) => void
  ): Promise<{ watchId: string; localPath: string }> {
    const buffer = await sftpService.readFileBuffer(sessionId, remotePath)

    const baseTemp = join(app.getPath('temp'), 'termdeck-external-edits', sessionId)
    if (!existsSync(baseTemp)) {
      mkdirSync(baseTemp, { recursive: true })
    }

    const fileName = basename(remotePath)
    const localPath = join(baseTemp, `${Date.now()}-${fileName}`)
    writeFileSync(localPath, buffer)

    const watchId = randomUUID()

    // Watch local file with chokidar
    const watcher = chokidar.watch(localPath, {
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 300,
        pollInterval: 100
      }
    })

    watcher.on('change', () => {
      onModified({
        watchId,
        sessionId,
        remotePath,
        localPath
      })
    })

    this.activeWatches.set(watchId, {
      watchId,
      sessionId,
      remotePath,
      localPath,
      watcher
    })

    // Open file in system default application
    await shell.openPath(localPath)

    return { watchId, localPath }
  }

  /**
   * Sync changes made in an external editor back to the remote server.
   */
  public async syncExternal(
    sessionId: string,
    remotePath: string,
    localPath: string
  ): Promise<boolean> {
    if (!existsSync(localPath)) {
      throw new Error('Локальный временный файл не найден')
    }
    const buffer = readFileSync(localPath)
    await sftpService.writeFileBuffer(sessionId, remotePath, buffer)
    return true
  }

  /**
   * Stop watching an external file and clean up temporary file.
   */
  public closeExternal(watchId: string): boolean {
    const watch = this.activeWatches.get(watchId)
    if (!watch) return false

    try {
      watch.watcher.close().catch(() => {})
      if (existsSync(watch.localPath)) {
        unlinkSync(watch.localPath)
      }
    } catch {
      // Ignored
    }

    this.activeWatches.delete(watchId)
    return true
  }

  /**
   * Close all external watches on application shutdown.
   */
  public closeAll(): void {
    for (const [watchId] of this.activeWatches) {
      this.closeExternal(watchId)
    }
  }
}

export const remoteEditorService = new RemoteEditorService()
