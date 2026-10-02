import type { TransferItem } from './types'

export const mockDefaultTransfers: TransferItem[] = [
  {
    id: 'xf-1',
    sessionId: 'mock-session-1',
    fileName: 'backup-2026-10-01.tar.gz',
    localPath: '/local/backup-2026-10-01.tar.gz',
    remotePath: '/remote/backup-2026-10-01.tar.gz',
    totalBytes: 104857600,
    transferredBytes: 67108864,
    direction: 'upload',
    progress: 64,
    status: 'in_progress',
    speed: '4.2 MB/s',
    eta: '12s'
  },
  {
    id: 'xf-2',
    sessionId: 'mock-session-1',
    fileName: 'error.log',
    localPath: '/local/error.log',
    remotePath: '/remote/error.log',
    totalBytes: 1024,
    transferredBytes: 1024,
    direction: 'download',
    progress: 100,
    status: 'completed'
  }
]

export const mockAllStatusTransfers: TransferItem[] = [
  {
    id: 'xf-q',
    sessionId: 'mock-session-1',
    fileName: 'archive-monthly.zip',
    localPath: '/local/archive-monthly.zip',
    remotePath: '/remote/archive-monthly.zip',
    totalBytes: 52428800,
    transferredBytes: 0,
    direction: 'upload',
    progress: 0,
    status: 'queued'
  },
  {
    id: 'xf-p',
    sessionId: 'mock-session-1',
    fileName: 'database-dump.sql',
    localPath: '/local/database-dump.sql',
    remotePath: '/remote/database-dump.sql',
    totalBytes: 209715200,
    transferredBytes: 88080384,
    direction: 'upload',
    progress: 42,
    status: 'paused',
    speed: '0 B/s',
    eta: '—'
  },
  {
    id: 'xf-r',
    sessionId: 'mock-session-1',
    fileName: 'app-update.deb',
    localPath: '/local/app-update.deb',
    remotePath: '/remote/app-update.deb',
    totalBytes: 104857600,
    transferredBytes: 67108864,
    direction: 'upload',
    progress: 64,
    status: 'in_progress',
    speed: '4.2 MB/s',
    eta: '12s'
  },
  {
    id: 'xf-d',
    sessionId: 'mock-session-1',
    fileName: 'access-2026.log',
    localPath: '/local/access-2026.log',
    remotePath: '/remote/access-2026.log',
    totalBytes: 2048,
    transferredBytes: 2048,
    direction: 'download',
    progress: 100,
    status: 'completed'
  },
  {
    id: 'xf-e',
    sessionId: 'mock-session-1',
    fileName: 'server-config.yml',
    localPath: '/local/server-config.yml',
    remotePath: '/remote/server-config.yml',
    totalBytes: 4096,
    transferredBytes: 614,
    direction: 'upload',
    progress: 15,
    status: 'error',
    errorMessage: 'Ошибка соединения: Broken pipe'
  }
]
