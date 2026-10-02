export interface SessionItem {
  id: string
  name: string
  host: string
  username?: string
  port?: number
  type: 'ssh' | 'local'
  online?: boolean
  defaultPath?: string
  uptime?: string
  termText?: string
  folderId?: string
  auth?: 'password' | 'key' | 'agent'
  keyPath?: string
  jumpHostId?: string
}

export interface SessionFolder {
  id: string
  name: string
  items: SessionItem[]
}

export interface SftpFileItem {
  name: string
  type: 'directory' | 'file' | 'symlink'
  size: string
  rawSize?: number
  permissions: string
  date?: string
  modifyTime?: number
  owner?: string
  group?: string
}

export type TransferStatus =
  'queued' | 'in_progress' | 'paused' | 'completed' | 'error' | 'cancelled'
export type TransferDirection = 'upload' | 'download'

export interface TransferItem {
  id: string
  sessionId?: string
  fileName: string
  direction: TransferDirection
  localPath?: string
  remotePath?: string
  totalBytes?: number
  transferredBytes?: number
  progress: number // 0 - 100
  status: TransferStatus
  speed?: string
  eta?: string
  errorMessage?: string
}

export type TabStatus = 'connecting' | 'connected' | 'disconnected' | 'error'
