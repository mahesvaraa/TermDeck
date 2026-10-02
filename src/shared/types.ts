export interface AppVersionInfo {
  version: string
  name: string
}

export type SshAuthType = 'password' | 'key' | 'agent'

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
  auth?: SshAuthType
  keyPath?: string
  jumpHostId?: string
}

export type TabStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

export interface SessionConfig {
  id: string
  name: string
  folderId?: string
  host: string
  port: number
  username: string
  auth: SshAuthType
  keyPath?: string
  color?: string
  tags?: string[]
  startupCommand?: string
  keepaliveSec: number
  encoding: string
  jumpHostId?: string
}

export interface SessionFolder {
  id: string
  name: string
  parentId?: string
  items?: SessionItem[]
}

export interface SessionTreeFolder {
  id: string
  name: string
  items: SessionItem[]
}

export interface KnownHostRecord {
  host: string
  port: number
  keyType: string
  fingerprintSha256: string
  trustedAt: string
}

export interface HostKeyPrompt {
  sessionId: string
  host: string
  port: number
  keyType: string
  fingerprintSha256: string
  status: 'new' | 'mismatch'
}

// --- SFTP Types ---

export interface SftpItem {
  name: string
  type: 'directory' | 'file' | 'symlink'
  size: number
  permissions: string // e.g. "-rw-r--r--" or "drwxr-xr-x"
  modifyTime: number // Unix timestamp in ms
  owner?: string
  group?: string
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

export type SftpPanelState = 'normal' | 'loading' | 'empty' | 'permission_denied' | 'no_connection'

export type TransferStatus =
  'queued' | 'in_progress' | 'paused' | 'completed' | 'error' | 'cancelled'

export type TransferDirection = 'upload' | 'download'
export type TransferConflictAction = 'overwrite' | 'skip' | 'rename'

export interface TransferItem {
  id: string
  sessionId: string
  fileName: string
  direction: TransferDirection
  localPath: string
  remotePath: string
  totalBytes: number
  transferredBytes: number
  progress: number // 0 - 100
  status: TransferStatus
  speed?: string // e.g. "4.2 MB/s"
  eta?: string // e.g. "12с"
  errorMessage?: string
  conflictAction?: TransferConflictAction
}

export interface TransferProgressEvent {
  transferId: string
  sessionId: string
  progress: number
  transferredBytes: number
  totalBytes: number
  speed: string
  eta: string
  status: TransferStatus
  errorMessage?: string
}

export interface TransferConflictPrompt {
  transferId: string
  sessionId: string
  fileName: string
  localPath: string
  remotePath: string
  direction: TransferDirection
  existingSize?: number
  newSize?: number
}

export type SftpPanelPosition = 'left' | 'bottom'

export interface SftpColumnSettings {
  showDate: boolean
  showOwner: boolean
  showPermissions: boolean
}

// --- Terminal Splits Tree Types ---

export type SplitDirection = 'horizontal' | 'vertical'

export interface SplitPaneLeaf {
  type: 'leaf'
  id: string // e.g. "pane-xxx"
  channelId?: string // for SSH session channel
  terminalId?: string // for local PTY process
}

export interface SplitBranchNode {
  type: 'split'
  id: string // e.g. "split-xxx"
  direction: SplitDirection // horizontal: left | right; vertical: top / bottom
  children: [SplitNode, SplitNode]
  sizes: [number, number]
}

export type SplitNode = SplitPaneLeaf | SplitBranchNode

// --- Remote Editor Types ---

export interface EditorOpenFileResult {
  content: string
  encoding: string
  lineEndings: 'LF' | 'CRLF'
  mtime: number
  size: number
  mode: number
}

export interface EditorSaveFileResult {
  success: boolean
  conflict?: boolean
  currentMtime?: number
  currentSize?: number
  newMtime?: number
  newSize?: number
  savedPath?: string
}

export interface ExternalEditorWatchEvent {
  watchId: string
  sessionId: string
  remotePath: string
  localPath: string
}

// --- SSH Tunnel Types ---

export type TunnelType = 'local' | 'remote' | 'dynamic'

export interface TunnelConfig {
  id: string
  sessionId: string
  name: string
  type: TunnelType
  enabled: boolean
  autoStart: boolean
  // Local (-L): localHost:localPort -> dstHost:dstPort
  localHost?: string
  localPort?: number
  dstHost?: string
  dstPort?: number
  // Remote (-R): remoteHost:remotePort -> dstHost:dstPort
  remoteHost?: string
  remotePort?: number
  // Dynamic (-D): localHost:socksPort
  socksPort?: number
  // Runtime status & traffic
  status?: 'active' | 'inactive' | 'error'
  errorMessage?: string
  bytesIn?: number
  bytesOut?: number
}

// --- SSH Key Manager Types ---

export interface SshKeyItem {
  id: string
  name: string
  path: string
  type: 'ed25519' | 'rsa' | 'ecdsa' | 'dsa' | 'unknown'
  isEncrypted: boolean
  publicKeyText: string
  fingerprintSha256: string
  comment?: string
  source: 'system' | 'custom'
}
