import { promises as fsPromises, statSync, existsSync } from 'node:fs'
import { homedir, platform } from 'node:os'
import { join, resolve } from 'node:path'

export interface LocalFsEntry {
  name: string
  type: 'file' | 'directory' | 'symlink'
  size: number
  modifyTime: number
  permissions: string
  owner?: string
  group?: string
}

export class LocalFsService {
  public getHomeDir(): string {
    return homedir()
  }

  public getDrives(): string[] {
    if (platform() === 'win32') {
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
      const drives: string[] = []
      for (const char of letters) {
        const drivePath = `${char}:\\`
        try {
          if (existsSync(drivePath)) {
            drives.push(drivePath)
          }
        } catch {
          // Drive not available / removable disk empty
        }
      }
      return drives.length > 0 ? drives : ['C:\\']
    }
    return ['/']
  }

  public async listDirectory(rawPath?: string): Promise<{ path: string; items: LocalFsEntry[] }> {
    let targetPath = rawPath?.trim()
    if (!targetPath) {
      targetPath = this.getHomeDir()
    }

    const resolvedPath = resolve(targetPath)
    const entries = await fsPromises.readdir(resolvedPath, { withFileTypes: true })
    const items: LocalFsEntry[] = []

    for (const entry of entries) {
      const fullPath = join(resolvedPath, entry.name)
      let type: 'file' | 'directory' | 'symlink' = 'file'
      if (entry.isDirectory()) type = 'directory'
      else if (entry.isSymbolicLink()) type = 'symlink'

      let rawSize = 0
      let modifyTime = 0
      let permissions = type === 'directory' ? 'drwxr-xr-x' : '-rw-r--r--'

      try {
        const stat = statSync(fullPath)
        rawSize = stat.size
        modifyTime = Math.round(stat.mtimeMs)
        const mode = stat.mode
        const isDir = (mode & 0o40000) !== 0
        const perms = (mode & 0o777).toString(8).padStart(3, '0')
        permissions = `${isDir ? 'd' : '-'}${perms}`
      } catch {
        // Restricted file or broken symlink
      }

      items.push({
        name: entry.name,
        type,
        size: rawSize,
        modifyTime,
        permissions
      })
    }

    return {
      path: resolvedPath,
      items
    }
  }
}

export const localFsService = new LocalFsService()
