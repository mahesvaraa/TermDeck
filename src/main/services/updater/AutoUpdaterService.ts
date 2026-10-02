import { app, type BrowserWindow } from 'electron'
import electronUpdater from 'electron-updater'

const { autoUpdater } = electronUpdater

export type UpdaterStatus =
  'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'

export interface UpdaterStatePayload {
  status: UpdaterStatus
  version?: string
  percent?: number
  error?: string
}

export class AutoUpdaterService {
  private mainWindow: BrowserWindow | null = null
  private isChecking = false

  public init(window: BrowserWindow): void {
    this.mainWindow = window

    // Configure updater logging and behavior
    autoUpdater.autoDownload = true
    autoUpdater.autoInstallOnAppQuit = true

    autoUpdater.on('checking-for-update', () => {
      this.isChecking = true
      this.sendStatus({ status: 'checking' })
    })

    autoUpdater.on('update-available', (info) => {
      this.isChecking = false
      this.sendStatus({ status: 'available', version: info.version })
    })

    autoUpdater.on('update-not-available', () => {
      this.isChecking = false
      this.sendStatus({ status: 'not-available' })
    })

    autoUpdater.on('download-progress', (progressObj) => {
      this.sendStatus({
        status: 'downloading',
        percent: Math.round(progressObj.percent)
      })
    })

    autoUpdater.on('update-downloaded', (info) => {
      this.isChecking = false
      this.sendStatus({ status: 'downloaded', version: info.version })
    })

    autoUpdater.on('error', (err) => {
      this.isChecking = false
      this.sendStatus({
        status: 'error',
        error: err.message || 'Ошибка проверки обновлений'
      })
    })
  }

  private sendStatus(payload: UpdaterStatePayload): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('updater:status', payload)
    }
  }

  public async checkForUpdates(manual = false): Promise<{ status: string }> {
    if (!app.isPackaged) {
      const devMsg = 'В режиме разработки автообновление отключено'
      this.sendStatus({ status: 'not-available', error: devMsg })
      return { status: devMsg }
    }

    if (this.isChecking) {
      return { status: 'Проверка уже выполняется' }
    }

    try {
      await autoUpdater.checkForUpdates()
      return { status: 'ok' }
    } catch (err) {
      const msg = (err as Error).message
      if (manual) {
        this.sendStatus({ status: 'error', error: msg })
      }
      return { status: msg }
    }
  }

  public quitAndInstall(): void {
    if (app.isPackaged) {
      autoUpdater.quitAndInstall()
    }
  }
}

export const autoUpdaterService = new AutoUpdaterService()
