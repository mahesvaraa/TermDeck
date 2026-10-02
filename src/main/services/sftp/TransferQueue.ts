import { randomUUID } from 'node:crypto'
import {
  createReadStream,
  createWriteStream,
  promises as fsPromises,
  existsSync,
  statSync,
  mkdirSync
} from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { type Readable, type Writable, Transform } from 'node:stream'
import type {
  TransferItem,
  TransferProgressEvent,
  TransferConflictAction,
  TransferConflictPrompt
} from '@shared/types'
import { sftpService } from './SftpService'

export interface TransferQueueCallbacks {
  onProgress: (event: TransferProgressEvent) => void
  onConflict: (prompt: TransferConflictPrompt) => void
}

interface ActiveTransferStreams {
  readStream?: Readable
  writeStream?: Writable
  isAborted?: boolean
}

export class TransferQueue {
  private transfers = new Map<string, TransferItem>()
  private activeStreams = new Map<string, ActiveTransferStreams>()
  private conflictResolvers = new Map<
    string,
    (decision: { action: TransferConflictAction; newName?: string }) => void
  >()
  private globalConflictRules = new Map<string, TransferConflictAction>() // sessionId -> action

  private maxConcurrency = 3
  private activeCount = 0
  private callbacks: TransferQueueCallbacks | null = null

  public setCallbacks(callbacks: TransferQueueCallbacks): void {
    this.callbacks = callbacks
  }

  public listTransfers(sessionId?: string): TransferItem[] {
    const list = Array.from(this.transfers.values())
    if (sessionId) {
      return list.filter((t) => t.sessionId === sessionId)
    }
    return list
  }

  public getTransfer(transferId: string): TransferItem | undefined {
    return this.transfers.get(transferId)
  }

  /**
   * Add a new transfer task to the queue.
   */
  public async addTransfer(options: {
    sessionId: string
    direction: 'upload' | 'download'
    localPath: string
    remotePath: string
    conflictAction?: TransferConflictAction
  }): Promise<string> {
    const id = randomUUID()
    const fileName = basename(
      options.direction === 'upload' ? options.localPath : options.remotePath
    )

    const item: TransferItem = {
      id,
      sessionId: options.sessionId,
      fileName,
      direction: options.direction,
      localPath: options.localPath,
      remotePath: options.remotePath,
      totalBytes: 0,
      transferredBytes: 0,
      progress: 0,
      status: 'queued',
      conflictAction: options.conflictAction || this.globalConflictRules.get(options.sessionId)
    }

    this.transfers.set(id, item)
    this.emitProgress(item)

    // Schedule queue execution
    setImmediate(() => this.processNext())

    return id
  }

  /**
   * Pause an in-progress transfer.
   */
  public pause(transferId: string): boolean {
    const item = this.transfers.get(transferId)
    if (!item) return false

    if (item.status === 'in_progress' || item.status === 'queued') {
      const streams = this.activeStreams.get(transferId)
      if (streams) {
        streams.isAborted = true
        streams.readStream?.destroy()
        streams.writeStream?.destroy()
        this.activeStreams.delete(transferId)
        this.activeCount = Math.max(0, this.activeCount - 1)
      }
      item.status = 'paused'
      this.emitProgress(item)
      this.processNext()
      return true
    }
    return false
  }

  /**
   * Resume a paused transfer.
   */
  public resume(transferId: string): boolean {
    const item = this.transfers.get(transferId)
    if (!item || item.status !== 'paused') return false

    item.status = 'queued'
    this.emitProgress(item)
    this.processNext()
    return true
  }

  /**
   * Cancel a transfer.
   */
  public cancel(transferId: string): boolean {
    const item = this.transfers.get(transferId)
    if (!item) return false

    const streams = this.activeStreams.get(transferId)
    if (streams) {
      streams.isAborted = true
      streams.readStream?.destroy()
      streams.writeStream?.destroy()
      this.activeStreams.delete(transferId)
      this.activeCount = Math.max(0, this.activeCount - 1)
    }

    item.status = 'cancelled'
    this.emitProgress(item)
    this.processNext()
    return true
  }

  /**
   * Retry a failed transfer.
   */
  public retry(transferId: string): boolean {
    const item = this.transfers.get(transferId)
    if (!item || (item.status !== 'error' && item.status !== 'cancelled')) return false

    item.status = 'queued'
    item.transferredBytes = 0
    item.progress = 0
    item.errorMessage = undefined
    this.emitProgress(item)
    this.processNext()
    return true
  }

  /**
   * Cancel all transfers associated with a session (called when tab or session closes).
   */
  public cancelSessionTransfers(sessionId: string): void {
    for (const item of this.transfers.values()) {
      if (
        item.sessionId === sessionId &&
        (item.status === 'queued' || item.status === 'in_progress')
      ) {
        this.cancel(item.id)
      }
    }
    this.globalConflictRules.delete(sessionId)
  }

  /**
   * Resolve a pending conflict prompt.
   */
  public resolveConflict(
    transferId: string,
    action: TransferConflictAction,
    applyToAll = false,
    newName?: string
  ): boolean {
    const resolver = this.conflictResolvers.get(transferId)
    if (!resolver) return false

    const item = this.transfers.get(transferId)
    if (item && applyToAll) {
      this.globalConflictRules.set(item.sessionId, action)
    }

    resolver({ action, newName })
    this.conflictResolvers.delete(transferId)
    return true
  }

  private emitProgress(item: TransferItem): void {
    if (!this.callbacks) return
    this.callbacks.onProgress({
      transferId: item.id,
      sessionId: item.sessionId,
      progress: item.progress,
      transferredBytes: item.transferredBytes,
      totalBytes: item.totalBytes,
      speed: item.speed || '0 B/s',
      eta: item.eta || '—',
      status: item.status,
      errorMessage: item.errorMessage
    })
  }

  private processNext(): void {
    if (this.activeCount >= this.maxConcurrency) return

    for (const item of this.transfers.values()) {
      if (item.status === 'queued') {
        this.activeCount++
        item.status = 'in_progress'
        this.emitProgress(item)
        this.executeTransfer(item).finally(() => {
          this.activeCount = Math.max(0, this.activeCount - 1)
          this.processNext()
        })
        if (this.activeCount >= this.maxConcurrency) break
      }
    }
  }

  private async executeTransfer(item: TransferItem): Promise<void> {
    try {
      if (item.direction === 'upload') {
        await this.handleUpload(item)
      } else {
        await this.handleDownload(item)
      }
      if (item.status === 'in_progress') {
        item.status = 'completed'
        item.progress = 100
        item.transferredBytes = item.totalBytes
        item.speed = '0 B/s'
        item.eta = 'Готово'
        this.emitProgress(item)
      }
    } catch (err) {
      if (item.status !== 'cancelled' && item.status !== 'paused') {
        item.status = 'error'
        item.errorMessage = (err as Error).message
        this.emitProgress(item)
      }
    } finally {
      this.activeStreams.delete(item.id)
    }
  }

  private async handleUpload(item: TransferItem): Promise<void> {
    if (!existsSync(item.localPath)) {
      throw new Error(`Локальный файл не найден: ${item.localPath}`)
    }

    const localStat = statSync(item.localPath)
    if (localStat.isDirectory()) {
      await this.uploadDirectory(item, item.localPath, item.remotePath)
    } else {
      item.totalBytes = localStat.size
      await this.uploadSingleFile(item, item.localPath, item.remotePath, localStat.size)
    }
  }

  private async handleDownload(item: TransferItem): Promise<void> {
    const sftp = await sftpService.getSftp(item.sessionId)

    const remoteStat = await new Promise<{ size: number; isDirectory: boolean }>(
      (resolve, reject) => {
        sftp.stat(item.remotePath, (err, stats) => {
          if (err) reject(new Error(`Удалённый файл не найден: ${err.message}`))
          else
            resolve({
              size: stats.size,
              isDirectory: Boolean(stats.isDirectory && stats.isDirectory())
            })
        })
      }
    )

    if (remoteStat.isDirectory) {
      await this.downloadDirectory(item, item.remotePath, item.localPath)
    } else {
      item.totalBytes = remoteStat.size
      await this.downloadSingleFile(item, item.remotePath, item.localPath, remoteStat.size)
    }
  }

  private async checkConflict(
    item: TransferItem,
    targetPath: string,
    isLocalTarget: boolean,
    newSize: number
  ): Promise<{ action: TransferConflictAction; finalPath: string }> {
    let exists = false
    let existingSize = 0

    if (isLocalTarget) {
      if (existsSync(targetPath)) {
        exists = true
        existingSize = statSync(targetPath).size
      }
    } else {
      try {
        const stat = await sftpService.stat(item.sessionId, targetPath)
        exists = true
        existingSize = stat.size
      } catch {
        exists = false
      }
    }

    if (!exists) {
      return { action: 'overwrite', finalPath: targetPath }
    }

    const predefined = item.conflictAction || this.globalConflictRules.get(item.sessionId)
    if (predefined) {
      if (predefined === 'rename') {
        return { action: 'rename', finalPath: this.generateAltPath(targetPath) }
      }
      return { action: predefined, finalPath: targetPath }
    }

    // Prompt user
    return new Promise((resolve) => {
      this.conflictResolvers.set(item.id, ({ action, newName }) => {
        if (action === 'rename') {
          const folder = isLocalTarget
            ? dirname(targetPath)
            : targetPath.substring(0, targetPath.lastIndexOf('/'))
          const altName = newName || `copy_${basename(targetPath)}`
          const finalPath = isLocalTarget ? join(folder, altName) : `${folder}/${altName}`
          resolve({ action: 'rename', finalPath })
        } else {
          resolve({ action, finalPath: targetPath })
        }
      })

      if (this.callbacks) {
        this.callbacks.onConflict({
          transferId: item.id,
          sessionId: item.sessionId,
          fileName: basename(targetPath),
          localPath: item.localPath,
          remotePath: item.remotePath,
          direction: item.direction,
          existingSize,
          newSize
        })
      }
    })
  }

  private generateAltPath(originalPath: string): string {
    const isWindowsPath = originalPath.includes('\\')
    const slash = isWindowsPath ? '\\' : '/'
    const parts = originalPath.split(slash)
    const fullName = parts.pop() || ''
    const folder = parts.join(slash)
    const dotIdx = fullName.lastIndexOf('.')

    let name = fullName
    let ext = ''
    if (dotIdx > 0) {
      name = fullName.substring(0, dotIdx)
      ext = fullName.substring(dotIdx)
    }

    return `${folder}${slash}${name} (1)${ext}`
  }

  private async uploadSingleFile(
    item: TransferItem,
    srcLocal: string,
    destRemote: string,
    fileSize: number
  ): Promise<void> {
    const conflict = await this.checkConflict(item, destRemote, false, fileSize)
    if (conflict.action === 'skip') {
      item.transferredBytes = fileSize
      item.progress = 100
      return
    }

    const sftp = await sftpService.getSftp(item.sessionId)
    const finalRemotePath = conflict.finalPath

    return new Promise<void>((resolve, reject) => {
      const readStream = createReadStream(srcLocal, { highWaterMark: 64 * 1024 })
      const writeStream = sftp.createWriteStream(finalRemotePath, { flags: 'w', mode: 0o644 })
      const streams: ActiveTransferStreams = { readStream, writeStream }
      this.activeStreams.set(item.id, streams)

      let lastEmit = Date.now()
      let bytesSinceLast = 0

      const meter = new Transform({
        transform: (chunk: Buffer, _encoding, callback) => {
          if (streams.isAborted) {
            callback(new Error('Transfer aborted'))
            return
          }

          item.transferredBytes += chunk.length
          bytesSinceLast += chunk.length

          const now = Date.now()
          const elapsed = (now - lastEmit) / 1000
          if (elapsed >= 0.1) {
            const speedBytes = bytesSinceLast / elapsed
            item.speed = this.formatSpeed(speedBytes)
            const remainingBytes = Math.max(0, item.totalBytes - item.transferredBytes)
            item.eta = speedBytes > 0 ? this.formatEta(remainingBytes / speedBytes) : '—'
            item.progress =
              item.totalBytes > 0
                ? Math.min(100, Math.round((item.transferredBytes / item.totalBytes) * 100))
                : 100

            lastEmit = now
            bytesSinceLast = 0
            this.emitProgress(item)
          }

          callback(null, chunk)
        }
      })

      readStream
        .pipe(meter)
        .pipe(writeStream)
        .on('finish', () => resolve())
        .on('error', (err: unknown) => {
          if (!streams.isAborted) reject(err)
        })

      readStream.on('error', (err: unknown) => {
        if (!streams.isAborted) reject(err)
      })
    })
  }

  private async downloadSingleFile(
    item: TransferItem,
    srcRemote: string,
    destLocal: string,
    fileSize: number
  ): Promise<void> {
    const conflict = await this.checkConflict(item, destLocal, true, fileSize)
    if (conflict.action === 'skip') {
      item.transferredBytes = fileSize
      item.progress = 100
      return
    }

    const sftp = await sftpService.getSftp(item.sessionId)
    const finalLocalPath = conflict.finalPath

    // Ensure parent directory exists
    const localDir = dirname(finalLocalPath)
    if (!existsSync(localDir)) {
      mkdirSync(localDir, { recursive: true })
    }

    return new Promise<void>((resolve, reject) => {
      const readStream = sftp.createReadStream(srcRemote, { flags: 'r' })
      const writeStream = createWriteStream(finalLocalPath, {
        flags: 'w',
        highWaterMark: 64 * 1024
      })
      const streams: ActiveTransferStreams = { readStream, writeStream }
      this.activeStreams.set(item.id, streams)

      let lastEmit = Date.now()
      let bytesSinceLast = 0

      const meter = new Transform({
        transform: (chunk: Buffer, _encoding, callback) => {
          if (streams.isAborted) {
            callback(new Error('Transfer aborted'))
            return
          }

          item.transferredBytes += chunk.length
          bytesSinceLast += chunk.length

          const now = Date.now()
          const elapsed = (now - lastEmit) / 1000
          if (elapsed >= 0.1) {
            const speedBytes = bytesSinceLast / elapsed
            item.speed = this.formatSpeed(speedBytes)
            const remainingBytes = Math.max(0, item.totalBytes - item.transferredBytes)
            item.eta = speedBytes > 0 ? this.formatEta(remainingBytes / speedBytes) : '—'
            item.progress =
              item.totalBytes > 0
                ? Math.min(100, Math.round((item.transferredBytes / item.totalBytes) * 100))
                : 100

            lastEmit = now
            bytesSinceLast = 0
            this.emitProgress(item)
          }

          callback(null, chunk)
        }
      })

      readStream
        .pipe(meter)
        .pipe(writeStream)
        .on('finish', () => resolve())
        .on('error', (err: unknown) => {
          if (!streams.isAborted) reject(err)
        })

      readStream.on('error', (err: unknown) => {
        if (!streams.isAborted) reject(err)
      })
    })
  }

  private async uploadDirectory(
    item: TransferItem,
    srcLocalDir: string,
    destRemoteDir: string
  ): Promise<void> {
    try {
      await sftpService.mkdir(item.sessionId, destRemoteDir)
    } catch {
      // Directory may already exist
    }

    const filesToUpload: { local: string; remote: string; size: number }[] = []

    const scanLocal = async (currentLocal: string, currentRemote: string): Promise<void> => {
      const entries = await fsPromises.readdir(currentLocal, { withFileTypes: true })
      for (const entry of entries) {
        const nextLocal = join(currentLocal, entry.name)
        const nextRemote = `${currentRemote.replace(/\/+$/, '')}/${entry.name}`

        if (entry.isDirectory()) {
          try {
            await sftpService.mkdir(item.sessionId, nextRemote)
          } catch {
            // Ignored
          }
          await scanLocal(nextLocal, nextRemote)
        } else if (entry.isFile()) {
          const stat = statSync(nextLocal)
          filesToUpload.push({ local: nextLocal, remote: nextRemote, size: stat.size })
          item.totalBytes += stat.size
        }
      }
    }

    await scanLocal(srcLocalDir, destRemoteDir)
    this.emitProgress(item)

    for (const f of filesToUpload) {
      if (item.status === 'cancelled' || item.status === 'paused') break
      await this.uploadSingleFile(item, f.local, f.remote, f.size)
    }
  }

  private async downloadDirectory(
    item: TransferItem,
    srcRemoteDir: string,
    destLocalDir: string
  ): Promise<void> {
    if (!existsSync(destLocalDir)) {
      mkdirSync(destLocalDir, { recursive: true })
    }

    const filesToDownload: { remote: string; local: string; size: number }[] = []

    const scanRemote = async (currentRemote: string, currentLocal: string): Promise<void> => {
      const list = await sftpService.list(item.sessionId, currentRemote)
      for (const entry of list.items) {
        const nextRemote = `${currentRemote.replace(/\/+$/, '')}/${entry.name}`
        const nextLocal = join(currentLocal, entry.name)

        if (entry.type === 'directory') {
          if (!existsSync(nextLocal)) {
            mkdirSync(nextLocal, { recursive: true })
          }
          await scanRemote(nextRemote, nextLocal)
        } else if (entry.type === 'file') {
          filesToDownload.push({ remote: nextRemote, local: nextLocal, size: entry.size })
          item.totalBytes += entry.size
        }
      }
    }

    await scanRemote(srcRemoteDir, destLocalDir)
    this.emitProgress(item)

    for (const f of filesToDownload) {
      if (item.status === 'cancelled' || item.status === 'paused') break
      await this.downloadSingleFile(item, f.remote, f.local, f.size)
    }
  }

  private formatSpeed(bytesPerSec: number): string {
    if (bytesPerSec >= 1024 * 1024) {
      return `${(bytesPerSec / 1024 / 1024).toFixed(1)} MB/s`
    }
    if (bytesPerSec >= 1024) {
      return `${(bytesPerSec / 1024).toFixed(1)} KB/s`
    }
    return `${Math.round(bytesPerSec)} B/s`
  }

  private formatEta(seconds: number): string {
    const s = Math.round(seconds)
    if (s < 60) return `${s}с`
    const m = Math.floor(s / 60)
    const remS = s % 60
    return `${m}м ${remS}с`
  }
}

export const transferQueue = new TransferQueue()
