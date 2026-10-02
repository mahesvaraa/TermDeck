import { app, BrowserWindow, session } from 'electron'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { registerAllIpcHandlers } from './ipc'
import { localPtyService } from './services/pty/LocalPtyService'
import { sshConnectionManager } from './services/ssh/SshConnectionManager'
import { sftpService } from './services/sftp/SftpService'
import { remoteEditorService } from './services/editor/RemoteEditorService'
import { tunnelService } from './services/tunnels/TunnelService'
import { terminalLoggingService } from './services/logging/TerminalLoggingService'
import { autoUpdaterService } from './services/updater/AutoUpdaterService'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

function getPreloadPath(): string {
  const cjsPath = join(__dirname, '../preload/index.cjs')
  if (existsSync(cjsPath)) return cjsPath
  const jsPath = join(__dirname, '../preload/index.js')
  if (existsSync(jsPath)) return jsPath
  return join(__dirname, '../preload/index.mjs')
}

function createWindow(): BrowserWindow {
  const iconPath = join(__dirname, '../../resources/icon.png')
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#12141a',
    title: 'TermDeck',
    icon: existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      preload: getPreloadPath(),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  })

  mainWindow.webContents.on('dom-ready', () => {
    if (process.env['TERMDECK_HEADLESS_TEST'] === '1') {
      console.log('TERMDECK_DOM_READY')
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    if (process.env['TERMDECK_SCREENSHOT'] === '1') {
      setTimeout(async () => {
        try {
          const image = await mainWindow.capturePage()
          const { writeFileSync } = await import('node:fs')
          writeFileSync('termdeck-stage-0-5.png', image.toPNG())
          console.log('TERMDECK_SCREENSHOT_SAVED')
        } catch (err) {
          console.error('Screenshot error:', err)
        } finally {
          app.quit()
        }
      }, 800)
    } else if (process.env['TERMDECK_HEADLESS_TEST'] === '1') {
      console.log('TERMDECK_READY_TO_SHOW')
      setTimeout(() => {
        app.quit()
      }, 500)
    }
  })

  const isDev = !app.isPackaged && Boolean(process.env['ELECTRON_RENDERER_URL'])

  // Apply strict Content Security Policy
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const cspPolicy = isDev
      ? "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data:; connect-src 'self' ws://localhost:* ws://127.0.0.1:* http://localhost:* http://127.0.0.1:*;"
      : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data:; connect-src 'none';"

    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [cspPolicy]
      }
    })
  })

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  autoUpdaterService.init(mainWindow)

  return mainWindow
}

app.whenReady().then(() => {
  // Register all typed IPC handlers before window creation
  registerAllIpcHandlers()

  // Clean up session tunnels on connection closed
  sshConnectionManager.onConnectionClosed((sessionId) => {
    tunnelService.closeSessionTunnels(sessionId).catch(() => {})
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  localPtyService.closeAll()
  sshConnectionManager.closeAll()
  sftpService.closeAll()
  remoteEditorService.closeAll()
  tunnelService.closeAll()
  terminalLoggingService.closeAll()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  localPtyService.closeAll()
  sshConnectionManager.closeAll()
  sftpService.closeAll()
  remoteEditorService.closeAll()
  tunnelService.closeAll()
  terminalLoggingService.closeAll()
})
