import { randomUUID } from 'node:crypto'
import os from 'node:os'
import * as pty from '@homebridge/node-pty-prebuilt-multiarch'

export interface PtyOptions {
  cols?: number
  rows?: number
  cwd?: string
}

interface PtySession {
  terminalId: string
  process: pty.IPty
  buffer: string[]
  batchTimer: NodeJS.Timeout | null
  onData: (data: string) => void
  onExit: (exitCode: number, signal?: number) => void
}

export class LocalPtyService {
  private sessions = new Map<string, PtySession>()

  /**
   * Determine the default shell for the platform.
   */
  private getDefaultShell(): { shell: string; args: string[] } {
    if (os.platform() === 'win32') {
      const systemRoot = process.env.SystemRoot || 'C:\\Windows'
      const powershellPath = `${systemRoot}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`
      return {
        shell: powershellPath,
        args: ['-NoLogo']
      }
    }

    const unixShell = process.env.SHELL || '/bin/bash'
    return {
      shell: unixShell,
      args: ['-l']
    }
  }

  /**
   * Spawn a new local PTY process.
   */
  public create(
    options: PtyOptions | undefined,
    onData: (data: string) => void,
    onExit: (exitCode: number, signal?: number) => void
  ): string {
    const terminalId = randomUUID()
    const { shell, args } = this.getDefaultShell()

    const cols = options?.cols || 80
    const rows = options?.rows || 24
    const cwd = options?.cwd || process.env.HOME || process.env.USERPROFILE || process.cwd()

    const isWindows = os.platform() === 'win32'
    let ptyProcess: pty.IPty
    try {
      ptyProcess = pty.spawn(shell, args, {
        name: 'xterm-256color',
        cols,
        rows,
        cwd,
        env: process.env as { [key: string]: string },
        useConpty: isWindows
      })
    } catch {
      ptyProcess = pty.spawn(shell, args, {
        name: 'xterm-256color',
        cols,
        rows,
        cwd,
        env: process.env as { [key: string]: string },
        useConpty: false
      })
    }

    const session: PtySession = {
      terminalId,
      process: ptyProcess,
      buffer: [],
      batchTimer: null,
      onData,
      onExit
    }

    const flush = (): void => {
      if (session.batchTimer) {
        clearTimeout(session.batchTimer)
        session.batchTimer = null
      }
      if (session.buffer.length > 0) {
        const payload = session.buffer.join('')
        session.buffer = []
        session.onData(payload)
      }
    }

    ptyProcess.onData((data: string) => {
      session.buffer.push(data)
      // Flush immediately if buffer reaches 64KB (preventing memory blowup on flood)
      const currentLength = session.buffer.reduce((acc, str) => acc + str.length, 0)
      if (currentLength >= 65536) {
        flush()
      } else if (!session.batchTimer) {
        // Batch outgoing data over 12ms (within the 8-16ms window)
        session.batchTimer = setTimeout(flush, 12)
      }
    })

    ptyProcess.onExit((event: { exitCode: number; signal?: number }) => {
      flush()
      this.sessions.delete(terminalId)
      session.onExit(event.exitCode, event.signal)
    })

    this.sessions.set(terminalId, session)
    return terminalId
  }

  /**
   * Write data to the PTY process.
   */
  public write(terminalId: string, data: string): void {
    const session = this.sessions.get(terminalId)
    if (session) {
      session.process.write(data)
    }
  }

  /**
   * Resize the PTY process window geometry.
   */
  public resize(terminalId: string, cols: number, rows: number): void {
    const session = this.sessions.get(terminalId)
    if (session) {
      try {
        session.process.resize(cols, rows)
      } catch {
        // Process might be exiting
      }
    }
  }

  /**
   * Close and kill a single PTY process.
   */
  public close(terminalId: string): void {
    const session = this.sessions.get(terminalId)
    if (session) {
      if (session.batchTimer) {
        clearTimeout(session.batchTimer)
        session.batchTimer = null
      }
      try {
        session.process.kill()
      } catch {
        // Already dead
      }
      this.sessions.delete(terminalId)
    }
  }

  /**
   * Terminate all active PTY processes (called on window/app shutdown).
   */
  public closeAll(): void {
    for (const [id, session] of this.sessions.entries()) {
      if (session.batchTimer) {
        clearTimeout(session.batchTimer)
        session.batchTimer = null
      }
      try {
        session.process.kill()
      } catch {
        // Ignore errors during mass teardown
      }
      this.sessions.delete(id)
    }
  }
}

export const localPtyService = new LocalPtyService()
