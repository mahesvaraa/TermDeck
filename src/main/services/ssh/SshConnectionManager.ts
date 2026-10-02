import { Client, type ClientChannel } from 'ssh2'
import { randomUUID } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { sessionStore } from '../sessions/SessionStore'
import { secretStorageService } from '../secrets/SecretStorageService'

export interface SshConnectOptions {
  sessionId: string
  cols?: number
  rows?: number
  temporarySecret?: string
  trustHostKeyOnce?: boolean
  rememberHostKey?: boolean
  enableOsc7?: boolean
}

interface SshShellChannel {
  channelId: string
  stream: ClientChannel
  buffer: string[]
  batchTimer: NodeJS.Timeout | null
  onData: (data: string) => void
  onExit: (exitCode: number) => void
}

interface SshConnection {
  connectionId: string
  sessionId: string
  client: Client
  state: 'connecting' | 'ready' | 'closed' | 'error'
  channels: Map<string, SshShellChannel>
}

type HostKeyVerifyCallback = (result: boolean) => void

export class SshConnectionManager {
  private connections = new Map<string, SshConnection>() // sessionId -> SshConnection
  private channelToConnection = new Map<string, string>() // channelId -> sessionId
  private onConnectionClosedCallback?: (sessionId: string) => void
  private pendingHostKeyVerifications = new Map<
    string,
    {
      verifyCallback: HostKeyVerifyCallback
      fingerprintSha256: string
      host: string
      port: number
      keyType: string
    }
  >()

  public onConnectionClosed(cb: (sessionId: string) => void): void {
    this.onConnectionClosedCallback = cb
  }

  /**
   * Translates common SSH errors to user-friendly Russian messages.
   */
  public getFriendlyErrorMessage(err: Error): string {
    const msg = err.message || ''
    if (msg.includes('All configured authentication methods failed')) {
      return 'Ошибка аутентификации: неверный пароль, passphrase или приватный ключ'
    }
    if (msg.includes('Timed out') || msg.includes('ETIMEDOUT')) {
      return 'Таймаут подключения: удалённый сервер не отвечает'
    }
    if (msg.includes('ECONNREFUSED')) {
      return 'Сервер отклонил подключение (порт закрыт или SSH-сервис не запущен)'
    }
    if (msg.includes('EHOSTUNREACH') || msg.includes('ENETUNREACH')) {
      return 'Хост недоступен: проверьте сетевое подключение'
    }
    if (msg.includes('ENOTFOUND')) {
      return 'Хост не найден (ошибка разрешения доменного имени)'
    }
    if (msg.includes('Host key verification failed')) {
      return 'Проверка подлинности сервера отклонена'
    }
    return `Ошибка SSH-соединения: ${msg}`
  }

  private resolveKeyPath(keyPath?: string): string | undefined {
    if (!keyPath) return undefined
    if (keyPath.startsWith('~')) {
      return keyPath.replace(/^~/, homedir())
    }
    return keyPath
  }

  /**
   * Connect to an SSH session or reuse an existing connection (reference-counted).
   * Opens a new interactive shell channel.
   */
  public async connect(
    options: SshConnectOptions,
    callbacks: {
      onData: (channelId: string, data: string) => void
      onExit: (channelId: string, exitCode: number) => void
      onStatus: (
        sessionId: string,
        channelId: string,
        status: 'connecting' | 'connected' | 'disconnected' | 'error',
        error?: string
      ) => void
      onHostKeyPrompt: (
        sessionId: string,
        host: string,
        port: number,
        keyType: string,
        fingerprintSha256: string,
        status: 'new' | 'mismatch'
      ) => void
    }
  ): Promise<{ channelId: string; connectionId: string }> {
    const session = sessionStore.getSession(options.sessionId)
    if (!session) {
      throw new Error(`Session "${options.sessionId}" not found`)
    }

    const channelId = randomUUID()
    this.channelToConnection.set(channelId, session.id)

    // Check if an existing ready connection can be reused
    let conn = this.connections.get(session.id)
    if (conn && conn.state === 'ready') {
      const channel = await this.openShellChannel(conn, channelId, options, callbacks)
      conn.channels.set(channelId, channel)
      callbacks.onStatus(session.id, channelId, 'connected')
      return { channelId, connectionId: conn.connectionId }
    }

    // Otherwise initiate a new SSH client
    const connectionId = randomUUID()
    const client = new Client()

    conn = {
      connectionId,
      sessionId: session.id,
      client,
      state: 'connecting',
      channels: new Map()
    }
    this.connections.set(session.id, conn)
    callbacks.onStatus(session.id, channelId, 'connecting')

    return new Promise<{ channelId: string; connectionId: string }>((resolve, reject) => {
      let isSettled = false

      // Retrieve secret (password or key passphrase)
      const secret =
        options.temporarySecret || secretStorageService.getSecret(session.id) || undefined

      // Prepare private key buffer if auth is key
      let privateKey: Buffer | undefined
      if (session.auth === 'key') {
        const resolvedPath = this.resolveKeyPath(session.keyPath)
        if (resolvedPath && existsSync(resolvedPath)) {
          try {
            privateKey = readFileSync(resolvedPath)
          } catch (readErr) {
            console.error('Failed to read private key file:', readErr)
          }
        }
      }

      client.on('ready', async () => {
        if (!conn) return
        conn.state = 'ready'
        try {
          const channel = await this.openShellChannel(conn, channelId, options, callbacks)
          conn.channels.set(channelId, channel)
          callbacks.onStatus(session.id, channelId, 'connected')
          if (!isSettled) {
            isSettled = true
            resolve({ channelId, connectionId: conn.connectionId })
          }
        } catch (err) {
          if (!isSettled) {
            isSettled = true
            reject(err)
          }
        }
      })

      client.on('error', (err) => {
        const friendlyMsg = this.getFriendlyErrorMessage(err)
        if (conn) {
          conn.state = 'error'
          for (const chId of conn.channels.keys()) {
            callbacks.onStatus(session.id, chId, 'error', friendlyMsg)
          }
        }
        if (!isSettled) {
          isSettled = true
          reject(new Error(friendlyMsg))
        }
      })

      client.on('close', () => {
        if (conn) {
          conn.state = 'closed'
          for (const ch of conn.channels.values()) {
            ch.onExit(0)
            callbacks.onStatus(session.id, ch.channelId, 'disconnected')
          }
          conn.channels.clear()
          this.connections.delete(session.id)
          this.onConnectionClosedCallback?.(session.id)
        }
      })

      // Host key verification
      const hostVerifier = (keyBuffer: Buffer, verifyCallback: HostKeyVerifyCallback): void => {
        const verification = sessionStore.verifyHostKey(
          session.host,
          session.port,
          'ssh',
          keyBuffer
        )

        if (options.trustHostKeyOnce || verification.status === 'trusted') {
          verifyCallback(true)
          return
        }

        if (verification.status === 'new' && options.rememberHostKey) {
          sessionStore.addKnownHost({
            host: session.host,
            port: session.port,
            keyType: 'ssh',
            fingerprintSha256: verification.fingerprintSha256,
            trustedAt: new Date().toISOString()
          })
          verifyCallback(true)
          return
        }

        // Store pending verification and prompt user via IPC
        this.pendingHostKeyVerifications.set(session.id, {
          verifyCallback,
          fingerprintSha256: verification.fingerprintSha256,
          host: session.host,
          port: session.port,
          keyType: 'ssh'
        })

        callbacks.onHostKeyPrompt(
          session.id,
          session.host,
          session.port,
          'ssh',
          verification.fingerprintSha256,
          verification.status
        )
      }

      // Handle Jump Host (ProxyJump) forwarding
      const setupJumpHost = async (): Promise<ClientChannel | undefined> => {
        if (!session.jumpHostId) return undefined

        let jumpClient = this.getClient(session.jumpHostId)
        if (!jumpClient) {
          await this.connect(
            { sessionId: session.jumpHostId, cols: options.cols, rows: options.rows },
            callbacks
          )
          jumpClient = this.getClient(session.jumpHostId)
        }

        if (!jumpClient) {
          throw new Error(`Не удалось подключиться к jump host "${session.jumpHostId}"`)
        }

        return new Promise<ClientChannel>((resSock, rejSock) => {
          jumpClient!.forwardOut(
            '127.0.0.1',
            0,
            session.host,
            session.port || 22,
            (err, stream) => {
              if (err) {
                rejSock(new Error(`Ошибка ProxyJump через бастион: ${err.message}`))
              } else {
                resSock(stream)
              }
            }
          )
        })
      }

      setupJumpHost()
        .then((sockStream) => {
          // Connect client
          try {
            client.connect({
              host: session.host,
              port: session.port,
              username: session.username,
              password: session.auth === 'password' ? secret : undefined,
              privateKey,
              passphrase: session.auth === 'key' ? secret : undefined,
              agent: session.auth === 'agent' ? process.env.SSH_AUTH_SOCK : undefined,
              keepaliveInterval: (session.keepaliveSec || 30) * 1000,
              readyTimeout: 15000,
              hostVerifier,
              sock: sockStream
            })
          } catch (connectErr) {
            if (!isSettled) {
              isSettled = true
              reject(connectErr)
            }
          }
        })
        .catch((jumpErr) => {
          if (!isSettled) {
            isSettled = true
            reject(jumpErr)
          }
        })
    })
  }

  /**
   * Handle user decision from host key prompt.
   */
  public confirmHostKey(
    sessionId: string,
    decision: { trustOnce: boolean; remember: boolean }
  ): void {
    const pending = this.pendingHostKeyVerifications.get(sessionId)
    if (!pending) return

    this.pendingHostKeyVerifications.delete(sessionId)

    if (decision.remember) {
      sessionStore.addKnownHost({
        host: pending.host,
        port: pending.port,
        keyType: pending.keyType,
        fingerprintSha256: pending.fingerprintSha256,
        trustedAt: new Date().toISOString()
      })
      pending.verifyCallback(true)
    } else if (decision.trustOnce) {
      pending.verifyCallback(true)
    } else {
      pending.verifyCallback(false)
    }
  }

  /**
   * Open an interactive shell channel on an established connection with 12ms data batching.
   */
  private openShellChannel(
    conn: SshConnection,
    channelId: string,
    options: SshConnectOptions,
    callbacks: {
      onData: (channelId: string, data: string) => void
      onExit: (channelId: string, exitCode: number) => void
    }
  ): Promise<SshShellChannel> {
    return new Promise((resolve, reject) => {
      conn.client.shell(
        {
          term: 'xterm-256color',
          cols: options.cols || 80,
          rows: options.rows || 24
        },
        (err, stream) => {
          if (err) {
            reject(err)
            return
          }

          const channel: SshShellChannel = {
            channelId,
            stream,
            buffer: [],
            batchTimer: null,
            onData: (data) => callbacks.onData(channelId, data),
            onExit: (code) => callbacks.onExit(channelId, code)
          }

          const flush = (): void => {
            if (channel.batchTimer) {
              clearTimeout(channel.batchTimer)
              channel.batchTimer = null
            }
            if (channel.buffer.length > 0) {
              const payload = channel.buffer.join('')
              channel.buffer = []
              channel.onData(payload)
            }
          }

          stream.on('data', (chunk: Buffer) => {
            channel.buffer.push(chunk.toString('utf-8'))
            const currentLen = channel.buffer.reduce((acc, str) => acc + str.length, 0)
            if (currentLen >= 65536) {
              flush()
            } else if (!channel.batchTimer) {
              channel.batchTimer = setTimeout(flush, 12)
            }
          })

          stream.on('close', () => {
            flush()
            channel.onExit(0)
            this.closeChannel(channelId)
          })

          resolve(channel)

          // Silent shell integration for OSC 7 (only if explicitly requested by user)
          if (options.enableOsc7 === true) {
            setTimeout(() => {
              try {
                const integrationCmd = ` if [ -n "$BASH_VERSION" ]; then PROMPT_COMMAND='printf "\\033]7;file://%s%s\\007" "\${HOSTNAME:-localhost}" "$PWD"'"\${PROMPT_COMMAND:+;$PROMPT_COMMAND}"; elif [ -n "$ZSH_VERSION" ]; then __td_osc7(){ printf "\\033]7;file://%s%s\\007" "\${HOST:-localhost}" "$PWD"; }; precmd_functions+=(__td_osc7); fi\r\x1b[2K`
                stream.write(integrationCmd)
              } catch {
                // Stream may already be closed
              }
            }, 120)
          }
        }
      )
    })
  }

  /**
   * Write input data to an SSH shell channel.
   */
  public write(channelId: string, data: string): void {
    const sessionId = this.channelToConnection.get(channelId)
    if (!sessionId) return
    const conn = this.connections.get(sessionId)
    const channel = conn?.channels.get(channelId)
    if (channel) {
      channel.stream.write(data)
    }
  }

  /**
   * Resize the SSH shell channel window geometry.
   */
  public resize(channelId: string, cols: number, rows: number): void {
    const sessionId = this.channelToConnection.get(channelId)
    if (!sessionId) return
    const conn = this.connections.get(sessionId)
    const channel = conn?.channels.get(channelId)
    if (channel) {
      try {
        channel.stream.setWindow(rows, cols, 0, 0)
      } catch {
        // Ignored
      }
    }
  }

  /**
   * Close a specific shell channel and release connection when last channel closes.
   */
  public getClient(sessionId: string): Client | undefined {
    const conn = this.connections.get(sessionId)
    if (conn && conn.state === 'ready') {
      return conn.client
    }
    return undefined
  }

  public isConnected(sessionId: string): boolean {
    const conn = this.connections.get(sessionId)
    return Boolean(conn && conn.state === 'ready')
  }

  /**
   * Close a specific shell channel and release connection when last channel closes.
   */
  public closeChannel(channelId: string): void {
    const sessionId = this.channelToConnection.get(channelId)
    if (!sessionId) return

    this.channelToConnection.delete(channelId)
    const conn = this.connections.get(sessionId)
    if (!conn) return

    const channel = conn.channels.get(channelId)
    if (channel) {
      if (channel.batchTimer) {
        clearTimeout(channel.batchTimer)
        channel.batchTimer = null
      }
      try {
        channel.stream.close()
      } catch {
        // Ignored
      }
      conn.channels.delete(channelId)
    }

    // If no more channels are using this connection, close it
    if (conn.channels.size === 0) {
      try {
        conn.client.end()
      } catch {
        // Ignored
      }
      this.connections.delete(sessionId)
      this.onConnectionClosedCallback?.(sessionId)
    }
  }

  /**
   * Close all active SSH connections on application shutdown.
   */
  public closeAll(): void {
    for (const pending of this.pendingHostKeyVerifications.values()) {
      pending.verifyCallback(false)
    }
    this.pendingHostKeyVerifications.clear()

    for (const [sessionId, conn] of this.connections.entries()) {
      for (const ch of conn.channels.values()) {
        if (ch.batchTimer) {
          clearTimeout(ch.batchTimer)
          ch.batchTimer = null
        }
        try {
          ch.stream.close()
        } catch {
          // Ignored
        }
      }
      conn.channels.clear()
      try {
        conn.client.end()
      } catch {
        // Ignored
      }
      this.connections.delete(sessionId)
    }
    this.channelToConnection.clear()
  }
}

export const sshConnectionManager = new SshConnectionManager()
