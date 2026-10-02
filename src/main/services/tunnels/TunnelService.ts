import net from 'node:net'
import type {
  Client,
  TcpConnectionDetails,
  ClientChannel,
  AcceptConnection,
  RejectConnection
} from 'ssh2'
import type { TunnelConfig } from '@shared/types'
import { sshConnectionManager } from '../ssh/SshConnectionManager'
import {
  parseSocks5Greeting,
  SOCKS5_HANDSHAKE_RESPONSE,
  SOCKS5_AUTH_FAILED_RESPONSE,
  parseSocks5ConnectRequest,
  SOCKS5_REPLY_SUCCESS,
  createSocks5ErrorReply
} from './socks5-parser'

interface ActiveTunnelInstance {
  config: TunnelConfig
  server?: net.Server
  sockets: Set<net.Socket>
  stopHandler?: () => Promise<void>
}

export class TunnelService {
  private tunnelConfigs = new Map<string, TunnelConfig>() // id -> TunnelConfig
  private activeTunnels = new Map<string, ActiveTunnelInstance>() // id -> ActiveTunnelInstance

  /**
   * Save or update a tunnel configuration.
   */
  public saveTunnelConfig(config: TunnelConfig): TunnelConfig {
    const existing = this.tunnelConfigs.get(config.id)
    const updated: TunnelConfig = {
      ...existing,
      ...config,
      status: existing?.status || 'inactive',
      bytesIn: existing?.bytesIn || 0,
      bytesOut: existing?.bytesOut || 0
    }
    this.tunnelConfigs.set(config.id, updated)
    return updated
  }

  /**
   * Get all registered tunnels, optionally filtered by sessionId.
   */
  public getTunnels(sessionId?: string): TunnelConfig[] {
    const all = Array.from(this.tunnelConfigs.values())
    if (!sessionId) return all
    return all.filter((t) => t.sessionId === sessionId)
  }

  /**
   * Delete a tunnel configuration and stop it if active.
   */
  public async deleteTunnel(tunnelId: string): Promise<void> {
    if (this.activeTunnels.has(tunnelId)) {
      await this.stopTunnel(tunnelId)
    }
    this.tunnelConfigs.delete(tunnelId)
  }

  /**
   * Start an SSH tunnel according to its type.
   */
  public async startTunnel(config: TunnelConfig): Promise<TunnelConfig> {
    // If already running, stop first
    if (this.activeTunnels.has(config.id)) {
      await this.stopTunnel(config.id)
    }

    const client = sshConnectionManager.getClient(config.sessionId)
    if (!client) {
      const errConfig: TunnelConfig = {
        ...config,
        status: 'error',
        errorMessage: 'SSH-сессия не подключена'
      }
      this.tunnelConfigs.set(config.id, errConfig)
      throw new Error('SSH-сессия не подключена')
    }

    // Save configuration
    this.saveTunnelConfig(config)
    const storedConfig = this.tunnelConfigs.get(config.id)!

    try {
      if (config.type === 'local') {
        await this.startLocalTunnel(storedConfig, client)
      } else if (config.type === 'remote') {
        await this.startRemoteTunnel(storedConfig, client)
      } else if (config.type === 'dynamic') {
        await this.startDynamicTunnel(storedConfig, client)
      }

      storedConfig.status = 'active'
      storedConfig.errorMessage = undefined
      storedConfig.enabled = true
      return storedConfig
    } catch (err) {
      storedConfig.status = 'error'
      storedConfig.errorMessage = (err as Error).message
      storedConfig.enabled = false
      throw err
    }
  }

  /**
   * Start Local (-L) port forwarding.
   * Listens on localPort and forwards connections through SSH client.forwardOut.
   */
  private async startLocalTunnel(config: TunnelConfig, client: Client): Promise<void> {
    const host = config.localHost || '127.0.0.1'
    const port = config.localPort
    const dstHost = config.dstHost || '127.0.0.1'
    const dstPort = config.dstPort

    if (port === undefined || dstPort === undefined) {
      throw new Error('Не указан локальный или удалённый порт для туннеля')
    }

    const sockets = new Set<net.Socket>()

    return new Promise((resolve, reject) => {
      const server = net.createServer((socket) => {
        sockets.add(socket)
        socket.on('close', () => sockets.delete(socket))

        client.forwardOut('127.0.0.1', socket.remotePort || 0, dstHost, dstPort, (err, stream) => {
          if (err) {
            socket.destroy()
            return
          }

          socket.on('data', (chunk) => {
            config.bytesOut = (config.bytesOut || 0) + chunk.length
          })

          stream.on('data', (chunk: Buffer) => {
            config.bytesIn = (config.bytesIn || 0) + chunk.length
          })

          socket.pipe(stream).pipe(socket)

          socket.on('error', () => stream.end())
          stream.on('error', () => socket.destroy())
        })
      })

      server.once('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          reject(new Error(`Порт ${port} уже занят другим приложением`))
        } else {
          reject(new Error(`Ошибка запуска сервера: ${err.message}`))
        }
      })

      server.listen(port, host, () => {
        this.activeTunnels.set(config.id, {
          config,
          server,
          sockets,
          stopHandler: async () => {
            sockets.forEach((s) => s.destroy())
            sockets.clear()
            await new Promise<void>((res) => server.close(() => res()))
          }
        })
        resolve()
      })
    })
  }

  /**
   * Start Remote (-R) port forwarding.
   * Asks remote SSH server to listen on remotePort, accepts connections and forwards to local dstHost:dstPort.
   */
  private async startRemoteTunnel(config: TunnelConfig, client: Client): Promise<void> {
    const remoteHost = config.remoteHost || '127.0.0.1'
    const remotePort = config.remotePort
    const localHost = config.dstHost || '127.0.0.1'
    const localPort = config.dstPort

    if (remotePort === undefined || localPort === undefined) {
      throw new Error('Не указан удалённый или целевой порт для обратного туннеля')
    }

    const sockets = new Set<net.Socket>()

    return new Promise((resolve, reject) => {
      client.forwardIn(remoteHost, remotePort, (err) => {
        if (err) {
          reject(new Error(`Не удалось открыть удалённый порт ${remotePort}: ${err.message}`))
          return
        }

        const tcpHandler = (
          details: TcpConnectionDetails,
          accept: AcceptConnection<ClientChannel>,
          rejectConn: RejectConnection
        ): void => {
          if (details.destPort === remotePort) {
            const stream = accept()
            const localSocket = net.connect(localPort, localHost, () => {
              sockets.add(localSocket)
              localSocket.on('close', () => sockets.delete(localSocket))

              localSocket.on('data', (chunk) => {
                config.bytesOut = (config.bytesOut || 0) + chunk.length
              })

              stream.on('data', (chunk: Buffer) => {
                config.bytesIn = (config.bytesIn || 0) + chunk.length
              })

              stream.pipe(localSocket).pipe(stream)
            })

            localSocket.on('error', () => {
              stream.end()
            })
            stream.on('error', () => {
              localSocket.destroy()
            })
          } else {
            rejectConn()
          }
        }

        client.on('tcp connection', tcpHandler)

        this.activeTunnels.set(config.id, {
          config,
          sockets,
          stopHandler: async () => {
            const ee = client as unknown as NodeJS.EventEmitter
            ee.removeListener('tcp connection', tcpHandler as (...args: unknown[]) => void)
            sockets.forEach((s) => s.destroy())
            sockets.clear()
            await new Promise<void>((res) =>
              client.unforwardIn(remoteHost, remotePort, () => res())
            )
          }
        })

        resolve()
      })
    })
  }

  /**
   * Start Dynamic (-D) SOCKS5 proxy port forwarding.
   * Listens on socksPort and resolves target hosts dynamically via client.forwardOut.
   */
  private async startDynamicTunnel(config: TunnelConfig, client: Client): Promise<void> {
    const host = config.localHost || '127.0.0.1'
    const port = config.socksPort

    if (port === undefined) {
      throw new Error('Не указан порт SOCKS5 для динамического туннеля')
    }

    const sockets = new Set<net.Socket>()

    return new Promise((resolve, reject) => {
      const server = net.createServer((socket) => {
        sockets.add(socket)
        socket.on('close', () => sockets.delete(socket))

        let stage: 'greeting' | 'connect' | 'piping' = 'greeting'

        socket.on('data', (data) => {
          if (stage === 'greeting') {
            if (parseSocks5Greeting(data)) {
              socket.write(SOCKS5_HANDSHAKE_RESPONSE)
              stage = 'connect'
            } else {
              socket.write(SOCKS5_AUTH_FAILED_RESPONSE)
              socket.destroy()
            }
          } else if (stage === 'connect') {
            const req = parseSocks5ConnectRequest(data)
            if (!req) {
              socket.write(createSocks5ErrorReply(0x01))
              socket.destroy()
              return
            }

            // Forward out dynamically
            client.forwardOut(
              '127.0.0.1',
              socket.remotePort || 0,
              req.dstHost,
              req.dstPort,
              (err, stream) => {
                if (err) {
                  socket.write(createSocks5ErrorReply(0x05)) // Connection refused
                  socket.destroy()
                  return
                }

                socket.write(SOCKS5_REPLY_SUCCESS)
                stage = 'piping'

                socket.on('data', (chunk) => {
                  config.bytesOut = (config.bytesOut || 0) + chunk.length
                })

                stream.on('data', (chunk: Buffer) => {
                  config.bytesIn = (config.bytesIn || 0) + chunk.length
                })

                socket.pipe(stream).pipe(socket)

                socket.on('error', () => stream.end())
                stream.on('error', () => socket.destroy())
              }
            )
          }
        })
      })

      server.once('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          reject(new Error(`Порт SOCKS5 ${port} уже занят другим приложением`))
        } else {
          reject(new Error(`Ошибка запуска SOCKS5 сервера: ${err.message}`))
        }
      })

      server.listen(port, host, () => {
        this.activeTunnels.set(config.id, {
          config,
          server,
          sockets,
          stopHandler: async () => {
            sockets.forEach((s) => s.destroy())
            sockets.clear()
            await new Promise<void>((res) => server.close(() => res()))
          }
        })
        resolve()
      })
    })
  }

  /**
   * Stop an active tunnel.
   */
  public async stopTunnel(tunnelId: string): Promise<TunnelConfig> {
    const active = this.activeTunnels.get(tunnelId)
    if (active && active.stopHandler) {
      try {
        await active.stopHandler()
      } catch {
        // Ignored
      }
      this.activeTunnels.delete(tunnelId)
    }

    const config = this.tunnelConfigs.get(tunnelId)
    if (config) {
      config.status = 'inactive'
      config.enabled = false
      return config
    }

    return {
      id: tunnelId,
      sessionId: '',
      name: '',
      type: 'local',
      enabled: false,
      autoStart: false,
      status: 'inactive'
    }
  }

  /**
   * Close all tunnels for a given session.
   */
  public async closeSessionTunnels(sessionId: string): Promise<void> {
    const tunnels = this.getTunnels(sessionId)
    for (const t of tunnels) {
      await this.stopTunnel(t.id)
    }
  }

  /**
   * Close all active tunnels on app shutdown.
   */
  public closeAll(): void {
    for (const [id] of this.activeTunnels) {
      this.stopTunnel(id).catch(() => {})
    }
  }
}

export const tunnelService = new TunnelService()
