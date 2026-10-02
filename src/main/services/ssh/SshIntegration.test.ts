import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Server, Client } from 'ssh2'
import { generateKeyPairSync } from 'node:crypto'
import { SshConnectionManager } from './SshConnectionManager'
import { SftpService } from '../sftp/SftpService'
import { sessionStore } from '../sessions/SessionStore'
import type { SessionConfig } from '@shared/types'

describe('SSH & SFTP mock server integration', () => {
  let server: Server
  let serverPort = 22222
  let sshManager: SshConnectionManager
  let sftpService: SftpService

  // Generate in-memory RSA host key for test server
  const { privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'pkcs1', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs1', format: 'pem' }
  })

  beforeAll(async () => {
    sshManager = new SshConnectionManager()
    sftpService = new SftpService(sshManager)

    await new Promise<void>((resolve) => {
      server = new Server(
        {
          hostKeys: [privateKey]
        },
        (client) => {
          client
            .on('authentication', (ctx) => {
              if (
                ctx.method === 'password' &&
                ctx.username === 'testuser' &&
                ctx.password === 'testpass'
              ) {
                ctx.accept()
              } else {
                ctx.reject()
              }
            })
            .on('ready', () => {
              client.on('session', (accept) => {
                const session = accept()

                // Support exec command
                session.on('exec', (acceptExec, _reject, info) => {
                  const stream = acceptExec()
                  if (info.command === 'echo "Hello TermDeck"') {
                    stream.write('Hello TermDeck\n')
                  } else {
                    stream.write(`Executed: ${info.command}\n`)
                  }
                  stream.exit(0)
                  stream.end()
                })

                // Support pty
                session.on('pty', (acceptPty) => {
                  if (acceptPty) acceptPty()
                })

                // Support shell
                session.on('shell', (acceptShell) => {
                  const stream = acceptShell()
                  stream.write('Welcome to Mock SSH\r\n$ ')
                  stream.on('data', (data: Buffer) => {
                    const str = data.toString()
                    if (str.includes('exit')) {
                      stream.exit(0)
                      stream.end()
                    } else if (str.includes('td_done')) {
                      stream.write('\x1b]777;td_done\x07\r\nuser@host:~$ ')
                    } else {
                      stream.write(`echo: ${str}`)
                    }
                  })
                })

                // Support sftp subsystem
                session.on('sftp', (acceptSftp) => {
                  const sftpStream = acceptSftp()
                  const inMemoryFs = new Map<string, Buffer>()
                  inMemoryFs.set('/test.txt', Buffer.from('Integration test file content'))

                  sftpStream.on('OPEN', (reqId, filename) => {
                    sftpStream.handle(reqId, Buffer.from(filename))
                  })

                  sftpStream.on('READ', (reqId, handle, offset, length) => {
                    const filename = handle.toString()
                    const data = inMemoryFs.get(filename) || Buffer.alloc(0)
                    if (offset >= data.length) {
                      sftpStream.status(reqId, 1) // SSH_FX_EOF
                    } else {
                      const slice = data.subarray(offset, offset + length)
                      sftpStream.data(reqId, slice)
                    }
                  })

                  sftpStream.on('WRITE', (reqId, handle, offset, data) => {
                    const filename = handle.toString()
                    inMemoryFs.set(filename, data)
                    sftpStream.status(reqId, 0) // SSH_FX_OK
                  })

                  sftpStream.on('CLOSE', (reqId) => {
                    sftpStream.status(reqId, 0) // SSH_FX_OK
                  })

                  sftpStream.on('STAT', (reqId) => {
                    sftpStream.attrs(reqId, {
                      mode: 0o100644,
                      uid: 1000,
                      gid: 1000,
                      size: 29,
                      atime: Date.now(),
                      mtime: Date.now()
                    })
                  })

                  sftpStream.on('REALPATH', (reqId, path) => {
                    const resolved = path === '.' ? '/' : path
                    sftpStream.name(reqId, [
                      {
                        filename: resolved,
                        longname: resolved,
                        attrs: {
                          mode: 0o040755,
                          uid: 1000,
                          gid: 1000,
                          size: 0,
                          atime: Date.now(),
                          mtime: Date.now()
                        }
                      }
                    ])
                  })

                  sftpStream.on('OPENDIR', (reqId, path) => {
                    sftpStream.handle(reqId, Buffer.from(path))
                  })

                  let dirRead = false
                  sftpStream.on('READDIR', (reqId) => {
                    if (!dirRead) {
                      dirRead = true
                      sftpStream.name(reqId, [
                        {
                          filename: 'test.txt',
                          longname: '-rw-r--r-- 1 testuser testuser 29 Jan 01 00:00 test.txt',
                          attrs: {
                            mode: 0o100644,
                            uid: 1000,
                            gid: 1000,
                            size: 29,
                            atime: Date.now(),
                            mtime: Date.now()
                          }
                        }
                      ])
                    } else {
                      sftpStream.status(reqId, 1) // SSH_FX_EOF
                    }
                  })
                })
              })
            })
        }
      )

      server.listen(0, '127.0.0.1', () => {
        const addr = server.address()
        if (typeof addr === 'object' && addr !== null) {
          serverPort = addr.port
        }
        resolve()
      })
    })
  })

  afterAll(async () => {
    sftpService.closeAll()
    sshManager.closeAll()
    await new Promise<void>((resolve) => {
      server.close(() => resolve())
    })
  })

  it('connects to mock SSH server and executes command', async () => {
    const client = new Client()

    const output = await new Promise<string>((resolve, reject) => {
      client
        .on('ready', () => {
          client.exec('echo "Hello TermDeck"', (err, stream) => {
            if (err) return reject(err)
            let result = ''
            stream.on('data', (d: Buffer) => {
              result += d.toString()
            })
            stream.on('close', () => {
              client.end()
              resolve(result)
            })
          })
        })
        .on('error', reject)
        .connect({
          host: '127.0.0.1',
          port: serverPort,
          username: 'testuser',
          password: 'testpass',
          readyTimeout: 3000
        })
    })

    expect(output.trim()).toBe('Hello TermDeck')
  })

  it('connects and opens shell channel via SshConnectionManager', async () => {
    const config: SessionConfig = {
      id: 'mock-session-test',
      name: 'Mock Test Server',
      host: '127.0.0.1',
      port: serverPort,
      username: 'testuser',
      auth: 'password',
      keepaliveSec: 30,
      encoding: 'utf-8'
    }

    sessionStore.saveSession(config, 'testpass')

    let receivedData = ''
    const { channelId, connectionId } = await sshManager.connect(
      {
        sessionId: config.id,
        temporarySecret: 'testpass',
        trustHostKeyOnce: true
      },
      {
        onData: (_cId, data) => {
          receivedData += data
        },
        onExit: () => {},
        onStatus: () => {},
        onHostKeyPrompt: () => {}
      }
    )

    expect(channelId).toBeDefined()
    expect(connectionId).toBeDefined()
    expect(sshManager.isConnected(config.id)).toBe(true)

    // Wait for shell welcome banner
    await new Promise((r) => setTimeout(r, 120))
    expect(receivedData).toContain('Welcome to Mock SSH')
    // Ensure the integration command itself is filtered out
    expect(receivedData).not.toContain('BASH_VERSION')
    // Ensure line erase sequence was emitted to prevent double prompt
    expect(receivedData).toContain('\r\x1b[2K')

    // Clean up channel
    sshManager.closeChannel(channelId)
  })

  it('performs SFTP file listing and reading via SftpService', async () => {
    const config: SessionConfig = {
      id: 'mock-session-sftp-test',
      name: 'Mock SFTP Server',
      host: '127.0.0.1',
      port: serverPort,
      username: 'testuser',
      auth: 'password',
      keepaliveSec: 30,
      encoding: 'utf-8'
    }

    sessionStore.saveSession(config, 'testpass')

    await sshManager.connect(
      {
        sessionId: config.id,
        temporarySecret: 'testpass',
        trustHostKeyOnce: true
      },
      {
        onData: () => {},
        onExit: () => {},
        onStatus: () => {},
        onHostKeyPrompt: () => {}
      }
    )

    // Test directory listing
    const listing = await sftpService.list(config.id, '/')
    expect(listing.items).toHaveLength(1)
    expect(listing.items[0].name).toBe('test.txt')
    expect(listing.items[0].size).toBe(29)

    // Test file reading
    const content = await sftpService.readFile(config.id, '/test.txt')
    expect(content).toBe('Integration test file content')

    // Test file writing
    const writeRes = await sftpService.writeFile(config.id, '/uploaded.txt', 'New uploaded content')
    expect(writeRes).toBe(true)

    sftpService.closeAll()
  })
})
