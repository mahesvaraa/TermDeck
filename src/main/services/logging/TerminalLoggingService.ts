import { app } from 'electron'
import { join } from 'node:path'
import { existsSync, mkdirSync, createWriteStream, type WriteStream } from 'node:fs'
import { stripAnsi } from '../../../shared/ansi'

export class TerminalLoggingService {
  private logStreams = new Map<string, WriteStream>() // sessionId -> WriteStream
  private logsDir: string

  constructor() {
    try {
      this.logsDir = join(app.getPath('userData'), 'terminal-logs')
    } catch {
      this.logsDir = join(process.cwd(), 'terminal-logs')
    }
  }

  private ensureDir(): void {
    if (!existsSync(this.logsDir)) {
      mkdirSync(this.logsDir, { recursive: true })
    }
  }

  /**
   * Log terminal data to file.
   */
  public logOutput(sessionId: string, data: string, shouldStripAnsi = true): void {
    if (!sessionId || !data) return
    this.ensureDir()

    let stream = this.logStreams.get(sessionId)
    if (!stream) {
      const sanitizedId = sessionId.replace(/[^a-zA-Z0-9_-]/g, '_')
      const dateStr = new Date().toISOString().slice(0, 10)
      const filePath = join(this.logsDir, `${sanitizedId}_${dateStr}.log`)
      stream = createWriteStream(filePath, { flags: 'a', encoding: 'utf-8' })
      this.logStreams.set(sessionId, stream)
    }

    const payload = shouldStripAnsi ? stripAnsi(data) : data
    stream.write(payload)
  }

  /**
   * Close a specific session's log stream.
   */
  public closeSessionLog(sessionId: string): void {
    const stream = this.logStreams.get(sessionId)
    if (stream) {
      stream.end()
      this.logStreams.delete(sessionId)
    }
  }

  /**
   * Close all active log streams.
   */
  public closeAll(): void {
    for (const stream of this.logStreams.values()) {
      stream.end()
    }
    this.logStreams.clear()
  }
}

export const terminalLoggingService = new TerminalLoggingService()
