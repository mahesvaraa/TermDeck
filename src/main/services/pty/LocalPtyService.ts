import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import * as pty from '@homebridge/node-pty-prebuilt-multiarch'

export interface PtyOptions {
  cols?: number
  rows?: number
  cwd?: string
  shell?: string
  args?: string[]
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
   * Determine the default shell for the platform with prototype-style colored prompt
   * and command/syntax highlighting.
   */
  private getDefaultShell(): { shell: string; args: string[] } {
    if (os.platform() === 'win32') {
      const systemRoot = process.env.SystemRoot || 'C:\\Windows'
      const defaultPs = `${systemRoot}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`
      let powershellPath = defaultPs

      // Prefer PowerShell Core (pwsh.exe) if installed
      const pwshLocations = [
        `${process.env.ProgramFiles || 'C:\\Program Files'}\\PowerShell\\7\\pwsh.exe`,
        `${process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)'}\\PowerShell\\7\\pwsh.exe`,
        `${process.env.LOCALAPPDATA || ''}\\Microsoft\\WindowsApps\\pwsh.exe`
      ]
      for (const loc of pwshLocations) {
        if (loc && fs.existsSync(loc)) {
          powershellPath = loc
          break
        }
      }

      // Prototype-styled prompt and syntax highlighting for PowerShell:
      // - user@host in green (\x1b[32m, --ok #8bd49c)
      // - path in blue (\x1b[34m, --acc #7aa2f7) with ~ replacement for HOME
      // - git branch in yellow (\x1b[33m, --warn #e5b567)
      // - prompt symbol in yellow (\x1b[33m)
      // - PSReadLine syntax highlighting (commands in yellow, parameters in cyan, strings in green)
      const initScript = [
        '$e = [char]27',
        'function global:prompt {',
        '  $u = $env:USERNAME',
        '  $h = $env:COMPUTERNAME',
        '  $p = "$pwd"',
        '  if ($HOME -and $p.StartsWith($HOME, [System.StringComparison]::OrdinalIgnoreCase)) {',
        '    $p = "~" + $p.Substring($HOME.Length)',
        '  }',
        '  $branch = ""',
        '  try {',
        '    $b = (git branch --show-current 2>$null)',
        '    if ($b) { $branch = " $e[33mgit:($b)$e[0m" }',
        '  } catch {}',
        '  "$e[32m$u@$h$e[0m $e[34m$p$e[0m$branch $e[33m>$e[0m "',
        '}',
        'if (Get-Module -ListAvailable PSReadLine) {',
        '  Import-Module PSReadLine -ErrorAction SilentlyContinue',
        '  Set-PSReadLineOption -Colors @{',
        '    Command = "$e[93m"',
        '    Parameter = "$e[36m"',
        '    String = "$e[32m"',
        '    Variable = "$e[35m"',
        '    Error = "$e[91m"',
        '    Number = "$e[95m"',
        '    Comment = "$e[90m"',
        '    Operator = "$e[37m"',
        '  } -ErrorAction SilentlyContinue',
        '}'
      ].join('\n')

      const encodedCommand = Buffer.from(initScript, 'utf16le').toString('base64')

      return {
        shell: powershellPath,
        args: ['-NoLogo', '-NoExit', '-EncodedCommand', encodedCommand]
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
    const defaultShell = this.getDefaultShell()
    const shell = options?.shell || defaultShell.shell
    const args = options?.args || defaultShell.args

    const cols = options?.cols || 80
    const rows = options?.rows || 24
    const cwd = options?.cwd || process.env.HOME || process.env.USERPROFILE || process.cwd()

    const isWindows = os.platform() === 'win32'
    const env: Record<string, string> = {
      ...(process.env as Record<string, string>),
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor',
      CLICOLOR: '1',
      CLICOLOR_FORCE: '1',
      FORCE_COLOR: '1',
      TERM_PROGRAM: 'TermDeck'
    }

    let ptyProcess: pty.IPty
    try {
      ptyProcess = pty.spawn(shell, args, {
        name: 'xterm-256color',
        cols,
        rows,
        cwd,
        env,
        useConpty: isWindows
      })
    } catch {
      ptyProcess = pty.spawn(shell, args, {
        name: 'xterm-256color',
        cols,
        rows,
        cwd,
        env,
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
