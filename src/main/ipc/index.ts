import { app, dialog, BrowserWindow } from 'electron'
import { registerHandler } from './register-handler'
import { localPtyService } from '../services/pty/LocalPtyService'
import { sessionStore } from '../services/sessions/SessionStore'
import { sshConnectionManager } from '../services/ssh/SshConnectionManager'
import { sftpService } from '../services/sftp/SftpService'
import { transferQueue } from '../services/sftp/TransferQueue'
import { remoteEditorService } from '../services/editor/RemoteEditorService'
import { tunnelService } from '../services/tunnels/TunnelService'
import { sshKeyManager } from '../services/keys/SshKeyManager'
import { terminalLoggingService } from '../services/logging/TerminalLoggingService'
import { autoUpdaterService } from '../services/updater/AutoUpdaterService'

/**
 * Registers all IPC handlers for the main process.
 */
export function registerAllIpcHandlers(): void {
  // Wire transferQueue callbacks to broadcast to renderer windows
  transferQueue.setCallbacks({
    onProgress: (event) => {
      BrowserWindow.getAllWindows().forEach((win) => {
        if (!win.isDestroyed()) {
          win.webContents.send('transfer:progress', event)
        }
      })
    },
    onConflict: (prompt) => {
      BrowserWindow.getAllWindows().forEach((win) => {
        if (!win.isDestroyed()) {
          win.webContents.send('transfer:conflict', prompt)
        }
      })
    }
  })

  // Cleanup SFTP session and cancel transfers when SSH connection is released
  sshConnectionManager.onConnectionClosed((sessionId) => {
    sftpService.closeSession(sessionId)
    transferQueue.cancelSessionTransfers(sessionId)
  })

  registerHandler('app:getVersion', async () => {
    return {
      version: app.getVersion(),
      name: app.getName()
    }
  })

  // --- Local PTY Handlers ---

  registerHandler('term:create', async (input, event) => {
    const webContents = event.sender
    const terminalId = localPtyService.create(
      input,
      (data) => {
        if (!webContents.isDestroyed()) {
          webContents.send('term:data', { terminalId, data })
        }
      },
      (exitCode, signal) => {
        if (!webContents.isDestroyed()) {
          webContents.send('term:exit', { terminalId, exitCode, signal })
        }
      }
    )
    return { terminalId }
  })

  registerHandler('term:write', async (input) => {
    localPtyService.write(input.terminalId, input.data)
  })

  registerHandler('term:resize', async (input) => {
    localPtyService.resize(input.terminalId, input.cols, input.rows)
  })

  registerHandler('term:close', async (input) => {
    localPtyService.close(input.terminalId)
  })

  // --- Session & Folder CRUD Handlers ---

  registerHandler('session:list', async () => {
    return {
      sessions: sessionStore.listSessions(),
      folders: sessionStore.listFolders()
    }
  })

  registerHandler('session:save', async (input) => {
    return sessionStore.saveSession(input.session, input.secret)
  })

  registerHandler('session:delete', async (input) => {
    sessionStore.deleteSession(input.id)
  })

  registerHandler('folder:save', async (input) => {
    return sessionStore.saveFolder(input.folder)
  })

  registerHandler('folder:delete', async (input) => {
    sessionStore.deleteFolder(input.id)
  })

  // --- SSH Connection & Shell Handlers ---

  registerHandler('ssh:connect', async (input, event) => {
    const webContents = event.sender
    return await sshConnectionManager.connect(input, {
      onData: (channelId, data) => {
        if (!webContents.isDestroyed()) {
          webContents.send('ssh:data', { channelId, data })
        }
      },
      onExit: (channelId, exitCode) => {
        if (!webContents.isDestroyed()) {
          webContents.send('ssh:exit', { channelId, exitCode })
        }
      },
      onStatus: (sessionId, channelId, status, error) => {
        if (!webContents.isDestroyed()) {
          webContents.send('ssh:status', { sessionId, channelId, status, error })
        }
      },
      onHostKeyPrompt: (sessionId, host, port, keyType, fingerprintSha256, status) => {
        if (!webContents.isDestroyed()) {
          webContents.send('ssh:hostKeyPrompt', {
            sessionId,
            host,
            port,
            keyType,
            fingerprintSha256,
            status
          })
        }
      }
    })
  })

  registerHandler('ssh:write', async (input) => {
    sshConnectionManager.write(input.channelId, input.data)
  })

  registerHandler('ssh:resize', async (input) => {
    sshConnectionManager.resize(input.channelId, input.cols, input.rows)
  })

  registerHandler('ssh:close', async (input) => {
    sshConnectionManager.closeChannel(input.channelId)
  })

  registerHandler('ssh:confirmHostKey', async (input) => {
    sshConnectionManager.confirmHostKey(input.sessionId, {
      trustOnce: input.trustOnce,
      remember: input.remember
    })
  })

  // --- SFTP Handlers ---

  registerHandler('sftp:list', async (input) => {
    return await sftpService.list(input.sessionId, input.remotePath)
  })

  registerHandler('sftp:stat', async (input) => {
    return await sftpService.stat(input.sessionId, input.remotePath)
  })

  registerHandler('sftp:mkdir', async (input) => {
    const success = await sftpService.mkdir(input.sessionId, input.remotePath)
    return { success }
  })

  registerHandler('sftp:rename', async (input) => {
    const success = await sftpService.rename(input.sessionId, input.oldPath, input.newPath)
    return { success }
  })

  registerHandler('sftp:delete', async (input) => {
    const success = await sftpService.delete(input.sessionId, input.remotePath, input.recursive)
    return { success }
  })

  registerHandler('sftp:chmod', async (input) => {
    const success = await sftpService.chmod(input.sessionId, input.remotePath, input.mode)
    return { success }
  })

  registerHandler('sftp:realpath', async (input) => {
    const path = await sftpService.realpath(input.sessionId, input.remotePath)
    return { path }
  })

  registerHandler('sftp:readFile', async (input) => {
    const content = await sftpService.readFile(input.sessionId, input.remotePath, input.maxSize)
    return { content }
  })

  registerHandler('sftp:writeFile', async (input) => {
    const success = await sftpService.writeFile(input.sessionId, input.remotePath, input.content)
    return { success }
  })

  // --- Transfer Queue Handlers ---

  registerHandler('transfer:start', async (input) => {
    const transferId = await transferQueue.addTransfer(input)
    return { transferId }
  })

  registerHandler('transfer:pause', async (input) => {
    const success = transferQueue.pause(input.transferId)
    return { success }
  })

  registerHandler('transfer:resume', async (input) => {
    const success = transferQueue.resume(input.transferId)
    return { success }
  })

  registerHandler('transfer:cancel', async (input) => {
    const success = transferQueue.cancel(input.transferId)
    return { success }
  })

  registerHandler('transfer:retry', async (input) => {
    const success = transferQueue.retry(input.transferId)
    return { success }
  })

  registerHandler('transfer:resolveConflict', async (input) => {
    const success = transferQueue.resolveConflict(
      input.transferId,
      input.action,
      input.applyToAll,
      input.newName
    )
    return { success }
  })

  registerHandler('transfer:list', async (input) => {
    return transferQueue.listTransfers(input?.sessionId)
  })

  // --- Native Dialog Handlers ---

  registerHandler('dialog:showOpenDialog', async (input) => {
    const properties = (input?.properties as (
      'openFile' | 'openDirectory' | 'multiSelections'
    )[]) || ['openFile']
    const result = await dialog.showOpenDialog({
      title: input?.title,
      properties
    })
    return {
      canceled: result.canceled,
      filePaths: result.filePaths
    }
  })

  registerHandler('dialog:showSaveDialog', async (input) => {
    const result = await dialog.showSaveDialog({
      title: input?.title,
      defaultPath: input?.defaultPath
    })
    return {
      canceled: result.canceled,
      filePath: result.filePath
    }
  })

  // --- Remote Editor Handlers ---

  registerHandler('editor:openFile', async (input) => {
    return await remoteEditorService.openFile(input.sessionId, input.remotePath)
  })

  registerHandler('editor:saveFile', async (input) => {
    return await remoteEditorService.saveFile(
      input.sessionId,
      input.remotePath,
      input.content,
      input.expectedMtime,
      input.expectedSize,
      input.forceOverwrite,
      input.saveAsCopy,
      input.copyPath
    )
  })

  registerHandler('editor:openExternal', async (input) => {
    return await remoteEditorService.openExternal(input.sessionId, input.remotePath, (event) => {
      BrowserWindow.getAllWindows().forEach((win) => {
        if (!win.isDestroyed()) {
          win.webContents.send('editor:externalModified', event)
        }
      })
    })
  })

  registerHandler('editor:closeExternal', async (input) => {
    const success = remoteEditorService.closeExternal(input.watchId)
    return { success }
  })

  registerHandler('editor:syncExternal', async (input) => {
    const success = await remoteEditorService.syncExternal(
      input.sessionId,
      input.remotePath,
      input.localPath
    )
    return { success }
  })

  // --- Tunnel Handlers ---

  registerHandler('tunnel:list', async (input) => {
    return tunnelService.getTunnels(input?.sessionId)
  })

  registerHandler('tunnel:save', async (input) => {
    return tunnelService.saveTunnelConfig(input)
  })

  registerHandler('tunnel:delete', async (input) => {
    await tunnelService.deleteTunnel(input.id)
    return { success: true }
  })

  registerHandler('tunnel:start', async (input) => {
    return await tunnelService.startTunnel(input)
  })

  registerHandler('tunnel:stop', async (input) => {
    return await tunnelService.stopTunnel(input.id)
  })

  // --- SSH Key Manager Handlers ---

  registerHandler('key:list', async () => {
    return sshKeyManager.listKeys()
  })

  registerHandler('key:generate', async (input) => {
    return sshKeyManager.generateEd25519Key(input.name, input.comment, input.passphrase)
  })

  registerHandler('key:import', async (input) => {
    return sshKeyManager.importKey(input.filePath)
  })

  registerHandler('key:installToServer', async (input) => {
    const success = await sshKeyManager.installKeyToServer(input.publicKeyText, input.sessionId)
    return { success }
  })

  registerHandler('term:log', async (input) => {
    terminalLoggingService.logOutput(input.sessionId, input.data, input.stripAnsi ?? true)
  })

  registerHandler('updater:check', async (input) => {
    return autoUpdaterService.checkForUpdates(input?.manual)
  })

  registerHandler('updater:install', async () => {
    autoUpdaterService.quitAndInstall()
  })
}
