import { promises as fsPromises, statSync } from 'node:fs'
import { join } from 'node:path'

export function formatTransferSpeed(bytesPerSec: number): string {
  if (bytesPerSec >= 1024 * 1024) {
    return `${(bytesPerSec / 1024 / 1024).toFixed(1)} MB/s`
  }
  if (bytesPerSec >= 1024) {
    return `${(bytesPerSec / 1024).toFixed(1)} KB/s`
  }
  return `${Math.round(bytesPerSec)} B/s`
}

export function formatTransferEta(seconds: number): string {
  const s = Math.round(seconds)
  if (s < 60) return `${s}с`
  const m = Math.floor(s / 60)
  const remS = s % 60
  return `${m}м ${remS}с`
}

export interface FileTransferPair {
  local: string
  remote: string
  size: number
}

export async function scanLocalDirectory(
  srcLocalDir: string,
  destRemoteDir: string,
  onDirectoryFound?: (remoteDirPath: string) => Promise<void>
): Promise<FileTransferPair[]> {
  const result: FileTransferPair[] = []

  const scan = async (currentLocal: string, currentRemote: string): Promise<void> => {
    const entries = await fsPromises.readdir(currentLocal, { withFileTypes: true })
    for (const entry of entries) {
      const nextLocal = join(currentLocal, entry.name)
      const nextRemote = `${currentRemote.replace(/\/+$/, '')}/${entry.name}`

      if (entry.isDirectory()) {
        if (onDirectoryFound) {
          try {
            await onDirectoryFound(nextRemote)
          } catch {
            // Directory might already exist
          }
        }
        await scan(nextLocal, nextRemote)
      } else if (entry.isFile()) {
        const stat = statSync(nextLocal)
        result.push({ local: nextLocal, remote: nextRemote, size: stat.size })
      }
    }
  }

  await scan(srcLocalDir, destRemoteDir)
  return result
}
