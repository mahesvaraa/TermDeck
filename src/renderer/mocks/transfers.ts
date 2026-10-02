import type { TransferItem } from './types'

export const mockDefaultTransfers: TransferItem[] = [
  {
    id: 'xf-1',
    fileName: 'backup-2026-10-01.tar.gz',
    direction: 'upload',
    progress: 64,
    status: 'in_progress',
    speed: '4.2 MB/s',
    eta: '12s'
  },
  {
    id: 'xf-2',
    fileName: 'error.log',
    direction: 'download',
    progress: 100,
    status: 'completed'
  }
]

export const mockAllStatusTransfers: TransferItem[] = [
  {
    id: 'xf-q',
    fileName: 'archive-monthly.zip',
    direction: 'upload',
    progress: 0,
    status: 'queued'
  },
  {
    id: 'xf-p',
    fileName: 'database-dump.sql',
    direction: 'upload',
    progress: 42,
    status: 'paused',
    speed: '0 B/s',
    eta: '—'
  },
  {
    id: 'xf-r',
    fileName: 'app-update.deb',
    direction: 'upload',
    progress: 64,
    status: 'in_progress',
    speed: '4.2 MB/s',
    eta: '12s'
  },
  {
    id: 'xf-d',
    fileName: 'access-2026.log',
    direction: 'download',
    progress: 100,
    status: 'completed'
  },
  {
    id: 'xf-e',
    fileName: 'server-config.yml',
    direction: 'upload',
    progress: 15,
    status: 'error',
    errorMessage: 'Ошибка соединения: Broken pipe'
  }
]
