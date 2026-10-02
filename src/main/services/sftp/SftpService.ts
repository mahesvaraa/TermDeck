import type { SFTPWrapper, Stats } from 'ssh2'
import type { SftpItem } from '@shared/types'
import { sshConnectionManager, type SshConnectionManager } from '../ssh/SshConnectionManager'

export function formatPosixPermissions(mode: number): string {
  const isDir = (mode & 0o170000) === 0o040000
  const isSymlink = (mode & 0o170000) === 0o120000

  let prefix = '-'
  if (isDir) prefix = 'd'
  else if (isSymlink) prefix = 'l'

  const rwx = [
    mode & 0o400 ? 'r' : '-',
    mode & 0o200 ? 'w' : '-',
    mode & 0o100 ? 'x' : '-',
    mode & 0o040 ? 'r' : '-',
    mode & 0o020 ? 'w' : '-',
    mode & 0o010 ? 'x' : '-',
    mode & 0o004 ? 'r' : '-',
    mode & 0o002 ? 'w' : '-',
    mode & 0o001 ? 'x' : '-'
  ].join('')

  return `${prefix}${rwx}`
}

export class SftpService {
  private sftpWrappers = new Map<string, SFTPWrapper>()
  private connectingPromises = new Map<string, Promise<SFTPWrapper>>()

  constructor(private sshManager: SshConnectionManager = sshConnectionManager) {}

  /**
   * Lazily obtain or open an SFTP channel for the specified session.
   */
  public async getSftp(sessionId: string): Promise<SFTPWrapper> {
    const existing = this.sftpWrappers.get(sessionId)
    if (existing) {
      return existing
    }

    const inFlight = this.connectingPromises.get(sessionId)
    if (inFlight) {
      return inFlight
    }

    let client = this.sshManager.getClient(sessionId)
    if (!client) {
      // If SSH connection is still in the middle of handshake/auth, wait briefly for ready state
      for (let attempt = 0; attempt < 15; attempt++) {
        await new Promise((r) => setTimeout(r, 200))
        client = this.sshManager.getClient(sessionId)
        if (client) break
      }
    }

    if (!client) {
      throw new Error(`SSH-сессия "${sessionId}" не подключена или не готова`)
    }

    const promise = new Promise<SFTPWrapper>((resolve, reject) => {
      client.sftp((err: Error | undefined, sftp: SFTPWrapper) => {
        this.connectingPromises.delete(sessionId)
        if (err) {
          reject(new Error(`Не удалось открыть SFTP-подсистему: ${err.message}`))
          return
        }

        sftp.on('close', () => {
          this.sftpWrappers.delete(sessionId)
        })

        sftp.on('end', () => {
          this.sftpWrappers.delete(sessionId)
        })

        this.sftpWrappers.set(sessionId, sftp)
        resolve(sftp)
      })
    })

    this.connectingPromises.set(sessionId, promise)
    return promise
  }

  /**
   * Resolve an absolute real path on the remote host (e.g. "." -> "/home/user").
   */
  public async realpath(sessionId: string, remotePath: string): Promise<string> {
    const sftp = await this.getSftp(sessionId)
    return new Promise((resolve, reject) => {
      sftp.realpath(remotePath, (err, resolved) => {
        if (err) {
          reject(new Error(`Ошибка определения пути: ${err.message}`))
        } else {
          resolve(resolved)
        }
      })
    })
  }

  /**
   * List files and folders in a remote directory.
   */
  public async list(
    sessionId: string,
    remotePath: string
  ): Promise<{ path: string; items: SftpItem[] }> {
    const sftp = await this.getSftp(sessionId)
    const targetPath = remotePath || '.'

    return new Promise((resolve, reject) => {
      sftp.realpath(targetPath, (errReal, absPath) => {
        const pathToRead = errReal ? targetPath : absPath

        sftp.readdir(pathToRead, (err, list) => {
          if (err) {
            reject(new Error(`Не удалось прочитать каталог ${pathToRead}: ${err.message}`))
            return
          }

          const items: SftpItem[] = []
          for (const entry of list) {
            if (entry.filename === '.' || entry.filename === '..') {
              continue
            }

            const attrs = entry.attrs
            const isDir = Boolean(attrs.isDirectory && attrs.isDirectory())
            const isSym = Boolean(attrs.isSymbolicLink && attrs.isSymbolicLink())

            items.push({
              name: entry.filename,
              type: isDir ? 'directory' : isSym ? 'symlink' : 'file',
              size: attrs.size || 0,
              permissions: formatPosixPermissions(attrs.mode || 0),
              modifyTime: (attrs.mtime || 0) * 1000,
              owner: attrs.uid !== undefined ? String(attrs.uid) : undefined,
              group: attrs.gid !== undefined ? String(attrs.gid) : undefined
            })
          }

          // Sort: directories first, then alphabetical by name
          items.sort((a, b) => {
            if (a.type === 'directory' && b.type !== 'directory') return -1
            if (a.type !== 'directory' && b.type === 'directory') return 1
            return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
          })

          resolve({ path: pathToRead, items })
        })
      })
    })
  }

  /**
   * Stat a remote path returning raw Stats from ssh2.
   */
  public async statRaw(sessionId: string, remotePath: string): Promise<Stats> {
    const sftp = await this.getSftp(sessionId)
    return new Promise((resolve, reject) => {
      sftp.stat(remotePath, (err, stats: Stats) => {
        if (err) {
          reject(new Error(`Ошибка stat для ${remotePath}: ${err.message}`))
          return
        }
        resolve(stats)
      })
    })
  }

  /**
   * Stat a remote path.
   */
  public async stat(sessionId: string, remotePath: string): Promise<SftpItem> {
    const sftp = await this.getSftp(sessionId)
    return new Promise((resolve, reject) => {
      sftp.stat(remotePath, (err, stats: Stats) => {
        if (err) {
          reject(new Error(`Ошибка stat для ${remotePath}: ${err.message}`))
          return
        }

        const isDir = Boolean(stats.isDirectory && stats.isDirectory())
        const isSym = Boolean(stats.isSymbolicLink && stats.isSymbolicLink())
        const name = remotePath.split('/').filter(Boolean).pop() || remotePath

        resolve({
          name,
          type: isDir ? 'directory' : isSym ? 'symlink' : 'file',
          size: stats.size || 0,
          permissions: formatPosixPermissions(stats.mode || 0),
          modifyTime: (stats.mtime || 0) * 1000,
          owner: stats.uid !== undefined ? String(stats.uid) : undefined,
          group: stats.gid !== undefined ? String(stats.gid) : undefined
        })
      })
    })
  }

  /**
   * Create a directory.
   */
  public async mkdir(sessionId: string, remotePath: string): Promise<boolean> {
    const sftp = await this.getSftp(sessionId)
    return new Promise((resolve, reject) => {
      sftp.mkdir(remotePath, (err) => {
        if (err) {
          reject(new Error(`Не удалось создать каталог: ${err.message}`))
        } else {
          resolve(true)
        }
      })
    })
  }

  /**
   * Rename or move a remote file/directory.
   * Handles overwriting existing files via posix-rename extension or unlink fallback.
   */
  public async rename(sessionId: string, oldPath: string, newPath: string): Promise<boolean> {
    const sftp = await this.getSftp(sessionId)
    return new Promise((resolve, reject) => {
      sftp.rename(oldPath, newPath, (err) => {
        if (!err) {
          resolve(true)
          return
        }

        // Try OpenSSH posix-rename extension if available
        const sftpAny = sftp as unknown as {
          ext_openssh_rename?: (
            src: string,
            dst: string,
            cb: (extErr?: Error | null) => void
          ) => void
        }

        if (typeof sftpAny.ext_openssh_rename === 'function') {
          sftpAny.ext_openssh_rename(oldPath, newPath, (extErr) => {
            if (!extErr) {
              resolve(true)
              return
            }
            // Fallback: unlink target and retry rename
            sftp.unlink(newPath, (unlinkErr) => {
              if (unlinkErr) {
                reject(new Error(`Не удалось переименовать: ${err.message}`))
              } else {
                sftp.rename(oldPath, newPath, (retryErr) => {
                  if (retryErr) {
                    reject(new Error(`Не удалось переименовать: ${retryErr.message}`))
                  } else {
                    resolve(true)
                  }
                })
              }
            })
          })
        } else {
          // Fallback: unlink target and retry rename
          sftp.unlink(newPath, (unlinkErr) => {
            if (unlinkErr) {
              reject(new Error(`Не удалось переименовать: ${err.message}`))
            } else {
              sftp.rename(oldPath, newPath, (retryErr) => {
                if (retryErr) {
                  reject(new Error(`Не удалось переименовать: ${retryErr.message}`))
                } else {
                  resolve(true)
                }
              })
            }
          })
        }
      })
    })
  }

  /**
   * Delete a remote file or directory (recursively if requested).
   */
  public async delete(sessionId: string, remotePath: string, recursive = false): Promise<boolean> {
    const sftp = await this.getSftp(sessionId)

    const removeRecursive = async (target: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        sftp.stat(target, async (errStat, stats) => {
          if (errStat) {
            // Try unlinking anyway
            sftp.unlink(target, () => resolve())
            return
          }

          if (stats.isDirectory && stats.isDirectory()) {
            if (!recursive) {
              sftp.rmdir(target, (rmErr) => {
                if (rmErr) reject(new Error(`Каталог не пуст: ${rmErr.message}`))
                else resolve()
              })
              return
            }

            sftp.readdir(target, async (readErr, entries) => {
              if (readErr) {
                reject(readErr)
                return
              }
              try {
                for (const item of entries) {
                  if (item.filename === '.' || item.filename === '..') continue
                  const childPath = `${target.replace(/\/+$/, '')}/${item.filename}`
                  await removeRecursive(childPath)
                }
                sftp.rmdir(target, (rmErr) => {
                  if (rmErr) reject(rmErr)
                  else resolve()
                })
              } catch (recErr) {
                reject(recErr)
              }
            })
          } else {
            sftp.unlink(target, (unErr) => {
              if (unErr) reject(unErr)
              else resolve()
            })
          }
        })
      })
    }

    try {
      await removeRecursive(remotePath)
      return true
    } catch (err) {
      throw new Error(`Ошибка удаления ${remotePath}: ${(err as Error).message}`)
    }
  }

  /**
   * Change file/directory permissions (chmod).
   */
  public async chmod(sessionId: string, remotePath: string, mode: number): Promise<boolean> {
    const sftp = await this.getSftp(sessionId)
    return new Promise((resolve, reject) => {
      sftp.chmod(remotePath, mode, (err) => {
        if (err) {
          reject(new Error(`Не удалось изменить права: ${err.message}`))
        } else {
          resolve(true)
        }
      })
    })
  }

  /**
   * Read raw Buffer from remote file.
   */
  public async readFileBuffer(
    sessionId: string,
    remotePath: string,
    maxSize = 5 * 1024 * 1024
  ): Promise<Buffer> {
    const sftp = await this.getSftp(sessionId)
    return new Promise((resolve, reject) => {
      sftp.stat(remotePath, (errStat, stats) => {
        if (errStat) {
          reject(new Error(`Файл не найден: ${errStat.message}`))
          return
        }
        if (stats.size > maxSize) {
          reject(
            new Error(
              `Файл превышает допустимый размер (${(stats.size / 1024 / 1024).toFixed(1)} МБ > ${(maxSize / 1024 / 1024).toFixed(1)} МБ)`
            )
          )
          return
        }

        sftp.readFile(remotePath, (readErr, buffer) => {
          if (readErr) {
            reject(new Error(`Ошибка чтения файла: ${readErr.message}`))
          } else {
            resolve(buffer)
          }
        })
      })
    })
  }

  /**
   * Read small file content as UTF-8 string.
   */
  public async readFile(
    sessionId: string,
    remotePath: string,
    maxSize = 5 * 1024 * 1024
  ): Promise<string> {
    const buffer = await this.readFileBuffer(sessionId, remotePath, maxSize)
    return buffer.toString('utf-8')
  }

  /**
   * Write Buffer content to a remote file.
   */
  public async writeFileBuffer(
    sessionId: string,
    remotePath: string,
    buffer: Buffer
  ): Promise<boolean> {
    const sftp = await this.getSftp(sessionId)
    return new Promise((resolve, reject) => {
      sftp.writeFile(remotePath, buffer, (err) => {
        if (err) {
          reject(new Error(`Ошибка записи файла: ${err.message}`))
        } else {
          resolve(true)
        }
      })
    })
  }

  /**
   * Write UTF-8 string content to a remote file.
   */
  public async writeFile(sessionId: string, remotePath: string, content: string): Promise<boolean> {
    return this.writeFileBuffer(sessionId, remotePath, Buffer.from(content, 'utf-8'))
  }

  /**
   * Close and release the SFTP channel for a session.
   */
  public closeSession(sessionId: string): void {
    const sftp = this.sftpWrappers.get(sessionId)
    if (sftp) {
      try {
        sftp.end()
      } catch {
        // Ignored
      }
      this.sftpWrappers.delete(sessionId)
    }
    this.connectingPromises.delete(sessionId)
  }

  /**
   * Close all active SFTP sessions on app quit.
   */
  public closeAll(): void {
    for (const sftp of this.sftpWrappers.values()) {
      try {
        sftp.end()
      } catch {
        // Ignored
      }
    }
    this.sftpWrappers.clear()
    this.connectingPromises.clear()
  }
}

export const sftpService = new SftpService()
