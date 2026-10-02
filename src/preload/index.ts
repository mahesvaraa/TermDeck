import { contextBridge, ipcRenderer, webUtils, type IpcRendererEvent } from 'electron'
import type { IpcInput, IpcOutput, IpcEventPayload } from '../shared/ipc-contract'
import type { SftpItem, TransferItem } from '../shared/types'

/**
 * Type declaration for the exposed window.api
 */
export interface ElectronApi {
  getVersion: () => Promise<IpcOutput<'app:getVersion'>>
  getPathForFile: (file: File) => string

  // Local PTY
  createTerminal: (input?: IpcInput<'term:create'>) => Promise<IpcOutput<'term:create'>>
  writeTerminal: (terminalId: string, data: string) => Promise<void>
  resizeTerminal: (terminalId: string, cols: number, rows: number) => Promise<void>
  closeTerminal: (terminalId: string) => Promise<void>
  logTerminal: (input: IpcInput<'term:log'>) => Promise<void>
  onTerminalData: (listener: (payload: IpcEventPayload<'term:data'>) => void) => () => void
  onTerminalExit: (listener: (payload: IpcEventPayload<'term:exit'>) => void) => () => void

  // Sessions CRUD
  listSessions: () => Promise<IpcOutput<'session:list'>>
  saveSession: (input: IpcInput<'session:save'>) => Promise<IpcOutput<'session:save'>>
  deleteSession: (id: string) => Promise<void>
  saveFolder: (input: IpcInput<'folder:save'>) => Promise<IpcOutput<'folder:save'>>
  deleteFolder: (id: string) => Promise<void>

  // SSH
  connectSsh: (input: IpcInput<'ssh:connect'>) => Promise<IpcOutput<'ssh:connect'>>
  writeSsh: (channelId: string, data: string) => Promise<void>
  resizeSsh: (channelId: string, cols: number, rows: number) => Promise<void>
  closeSsh: (channelId: string) => Promise<void>
  confirmHostKey: (input: IpcInput<'ssh:confirmHostKey'>) => Promise<void>
  onSshData: (listener: (payload: IpcEventPayload<'ssh:data'>) => void) => () => void
  onSshExit: (listener: (payload: IpcEventPayload<'ssh:exit'>) => void) => () => void
  onSshStatus: (listener: (payload: IpcEventPayload<'ssh:status'>) => void) => () => void
  onSshHostKeyPrompt: (
    listener: (payload: IpcEventPayload<'ssh:hostKeyPrompt'>) => void
  ) => () => void

  // SFTP Operations
  sftpList: (input: IpcInput<'sftp:list'>) => Promise<{ path: string; items: SftpItem[] }>
  sftpStat: (input: IpcInput<'sftp:stat'>) => Promise<SftpItem>
  sftpMkdir: (input: IpcInput<'sftp:mkdir'>) => Promise<{ success: boolean }>
  sftpRename: (input: IpcInput<'sftp:rename'>) => Promise<{ success: boolean }>
  sftpDelete: (input: IpcInput<'sftp:delete'>) => Promise<{ success: boolean }>
  sftpChmod: (input: IpcInput<'sftp:chmod'>) => Promise<{ success: boolean }>
  sftpRealpath: (input: IpcInput<'sftp:realpath'>) => Promise<{ path: string }>
  sftpReadFile: (input: IpcInput<'sftp:readFile'>) => Promise<{ content: string }>
  sftpWriteFile: (input: IpcInput<'sftp:writeFile'>) => Promise<{ success: boolean }>

  // Transfer Queue
  transferStart: (input: IpcInput<'transfer:start'>) => Promise<{ transferId: string }>
  transferPause: (input: IpcInput<'transfer:pause'>) => Promise<{ success: boolean }>
  transferResume: (input: IpcInput<'transfer:resume'>) => Promise<{ success: boolean }>
  transferCancel: (input: IpcInput<'transfer:cancel'>) => Promise<{ success: boolean }>
  transferRetry: (input: IpcInput<'transfer:retry'>) => Promise<{ success: boolean }>
  transferResolveConflict: (
    input: IpcInput<'transfer:resolveConflict'>
  ) => Promise<{ success: boolean }>
  transferList: (input?: IpcInput<'transfer:list'>) => Promise<TransferItem[]>
  onTransferProgress: (
    listener: (payload: IpcEventPayload<'transfer:progress'>) => void
  ) => () => void
  onTransferConflict: (
    listener: (payload: IpcEventPayload<'transfer:conflict'>) => void
  ) => () => void

  // Native Dialogs
  showOpenDialog: (
    input?: IpcInput<'dialog:showOpenDialog'>
  ) => Promise<IpcOutput<'dialog:showOpenDialog'>>
  showSaveDialog: (
    input?: IpcInput<'dialog:showSaveDialog'>
  ) => Promise<IpcOutput<'dialog:showSaveDialog'>>

  // Remote Editor
  editorOpenFile: (input: IpcInput<'editor:openFile'>) => Promise<IpcOutput<'editor:openFile'>>
  editorSaveFile: (input: IpcInput<'editor:saveFile'>) => Promise<IpcOutput<'editor:saveFile'>>
  editorOpenExternal: (
    input: IpcInput<'editor:openExternal'>
  ) => Promise<IpcOutput<'editor:openExternal'>>
  editorCloseExternal: (
    input: IpcInput<'editor:closeExternal'>
  ) => Promise<IpcOutput<'editor:closeExternal'>>
  editorSyncExternal: (
    input: IpcInput<'editor:syncExternal'>
  ) => Promise<IpcOutput<'editor:syncExternal'>>
  onEditorExternalModified: (
    listener: (payload: IpcEventPayload<'editor:externalModified'>) => void
  ) => () => void

  // Tunnels
  listTunnels: (input?: IpcInput<'tunnel:list'>) => Promise<IpcOutput<'tunnel:list'>>
  saveTunnel: (input: IpcInput<'tunnel:save'>) => Promise<IpcOutput<'tunnel:save'>>
  deleteTunnel: (id: string) => Promise<IpcOutput<'tunnel:delete'>>
  startTunnel: (input: IpcInput<'tunnel:start'>) => Promise<IpcOutput<'tunnel:start'>>
  stopTunnel: (id: string) => Promise<IpcOutput<'tunnel:stop'>>

  // SSH Key Manager
  listKeys: () => Promise<IpcOutput<'key:list'>>
  generateKey: (input: IpcInput<'key:generate'>) => Promise<IpcOutput<'key:generate'>>
  importKey: (input: IpcInput<'key:import'>) => Promise<IpcOutput<'key:import'>>
  installKeyToServer: (
    input: IpcInput<'key:installToServer'>
  ) => Promise<IpcOutput<'key:installToServer'>>

  // Auto Updater
  checkForUpdates: (manual?: boolean) => Promise<IpcOutput<'updater:check'>>
  installUpdate: () => Promise<void>
  onUpdaterStatus: (listener: (payload: IpcEventPayload<'updater:status'>) => void) => () => void
}

const api: ElectronApi = {
  getVersion: (): Promise<IpcOutput<'app:getVersion'>> => {
    return ipcRenderer.invoke('app:getVersion')
  },
  getPathForFile: (file: File): string => {
    return webUtils.getPathForFile(file)
  },

  // Local PTY
  createTerminal: (input): Promise<IpcOutput<'term:create'>> => {
    return ipcRenderer.invoke('term:create', input)
  },
  writeTerminal: (terminalId: string, data: string): Promise<void> => {
    return ipcRenderer.invoke('term:write', { terminalId, data })
  },
  resizeTerminal: (terminalId: string, cols: number, rows: number): Promise<void> => {
    return ipcRenderer.invoke('term:resize', { terminalId, cols, rows })
  },
  closeTerminal: (terminalId: string): Promise<void> => {
    return ipcRenderer.invoke('term:close', { terminalId })
  },
  logTerminal: (input: IpcInput<'term:log'>): Promise<void> => {
    return ipcRenderer.invoke('term:log', input)
  },
  onTerminalData: (listener: (payload: IpcEventPayload<'term:data'>) => void): (() => void) => {
    const handler = (_event: IpcRendererEvent, payload: IpcEventPayload<'term:data'>): void => {
      listener(payload)
    }
    ipcRenderer.on('term:data', handler)
    return () => {
      ipcRenderer.removeListener('term:data', handler)
    }
  },
  onTerminalExit: (listener: (payload: IpcEventPayload<'term:exit'>) => void): (() => void) => {
    const handler = (_event: IpcRendererEvent, payload: IpcEventPayload<'term:exit'>): void => {
      listener(payload)
    }
    ipcRenderer.on('term:exit', handler)
    return () => {
      ipcRenderer.removeListener('term:exit', handler)
    }
  },

  // Sessions CRUD
  listSessions: (): Promise<IpcOutput<'session:list'>> => {
    return ipcRenderer.invoke('session:list')
  },
  saveSession: (input): Promise<IpcOutput<'session:save'>> => {
    return ipcRenderer.invoke('session:save', input)
  },
  deleteSession: (id: string): Promise<void> => {
    return ipcRenderer.invoke('session:delete', { id })
  },
  saveFolder: (input): Promise<IpcOutput<'folder:save'>> => {
    return ipcRenderer.invoke('folder:save', input)
  },
  deleteFolder: (id: string): Promise<void> => {
    return ipcRenderer.invoke('folder:delete', { id })
  },

  // SSH
  connectSsh: (input): Promise<IpcOutput<'ssh:connect'>> => {
    return ipcRenderer.invoke('ssh:connect', input)
  },
  writeSsh: (channelId: string, data: string): Promise<void> => {
    return ipcRenderer.invoke('ssh:write', { channelId, data })
  },
  resizeSsh: (channelId: string, cols: number, rows: number): Promise<void> => {
    return ipcRenderer.invoke('ssh:resize', { channelId, cols, rows })
  },
  closeSsh: (channelId: string): Promise<void> => {
    return ipcRenderer.invoke('ssh:close', { channelId })
  },
  confirmHostKey: (input): Promise<void> => {
    return ipcRenderer.invoke('ssh:confirmHostKey', input)
  },
  onSshData: (listener: (payload: IpcEventPayload<'ssh:data'>) => void): (() => void) => {
    const handler = (_event: IpcRendererEvent, payload: IpcEventPayload<'ssh:data'>): void => {
      listener(payload)
    }
    ipcRenderer.on('ssh:data', handler)
    return () => {
      ipcRenderer.removeListener('ssh:data', handler)
    }
  },
  onSshExit: (listener: (payload: IpcEventPayload<'ssh:exit'>) => void): (() => void) => {
    const handler = (_event: IpcRendererEvent, payload: IpcEventPayload<'ssh:exit'>): void => {
      listener(payload)
    }
    ipcRenderer.on('ssh:exit', handler)
    return () => {
      ipcRenderer.removeListener('ssh:exit', handler)
    }
  },
  onSshStatus: (listener: (payload: IpcEventPayload<'ssh:status'>) => void): (() => void) => {
    const handler = (_event: IpcRendererEvent, payload: IpcEventPayload<'ssh:status'>): void => {
      listener(payload)
    }
    ipcRenderer.on('ssh:status', handler)
    return () => {
      ipcRenderer.removeListener('ssh:status', handler)
    }
  },
  onSshHostKeyPrompt: (
    listener: (payload: IpcEventPayload<'ssh:hostKeyPrompt'>) => void
  ): (() => void) => {
    const handler = (
      _event: IpcRendererEvent,
      payload: IpcEventPayload<'ssh:hostKeyPrompt'>
    ): void => {
      listener(payload)
    }
    ipcRenderer.on('ssh:hostKeyPrompt', handler)
    return () => {
      ipcRenderer.removeListener('ssh:hostKeyPrompt', handler)
    }
  },

  // SFTP Operations
  sftpList: (input): Promise<{ path: string; items: SftpItem[] }> => {
    return ipcRenderer.invoke('sftp:list', input)
  },
  sftpStat: (input): Promise<SftpItem> => {
    return ipcRenderer.invoke('sftp:stat', input)
  },
  sftpMkdir: (input): Promise<{ success: boolean }> => {
    return ipcRenderer.invoke('sftp:mkdir', input)
  },
  sftpRename: (input): Promise<{ success: boolean }> => {
    return ipcRenderer.invoke('sftp:rename', input)
  },
  sftpDelete: (input): Promise<{ success: boolean }> => {
    return ipcRenderer.invoke('sftp:delete', input)
  },
  sftpChmod: (input): Promise<{ success: boolean }> => {
    return ipcRenderer.invoke('sftp:chmod', input)
  },
  sftpRealpath: (input): Promise<{ path: string }> => {
    return ipcRenderer.invoke('sftp:realpath', input)
  },
  sftpReadFile: (input): Promise<{ content: string }> => {
    return ipcRenderer.invoke('sftp:readFile', input)
  },
  sftpWriteFile: (input): Promise<{ success: boolean }> => {
    return ipcRenderer.invoke('sftp:writeFile', input)
  },

  // Transfer Queue
  transferStart: (input): Promise<{ transferId: string }> => {
    return ipcRenderer.invoke('transfer:start', input)
  },
  transferPause: (input): Promise<{ success: boolean }> => {
    return ipcRenderer.invoke('transfer:pause', input)
  },
  transferResume: (input): Promise<{ success: boolean }> => {
    return ipcRenderer.invoke('transfer:resume', input)
  },
  transferCancel: (input): Promise<{ success: boolean }> => {
    return ipcRenderer.invoke('transfer:cancel', input)
  },
  transferRetry: (input): Promise<{ success: boolean }> => {
    return ipcRenderer.invoke('transfer:retry', input)
  },
  transferResolveConflict: (input): Promise<{ success: boolean }> => {
    return ipcRenderer.invoke('transfer:resolveConflict', input)
  },
  transferList: (input): Promise<TransferItem[]> => {
    return ipcRenderer.invoke('transfer:list', input)
  },
  onTransferProgress: (
    listener: (payload: IpcEventPayload<'transfer:progress'>) => void
  ): (() => void) => {
    const handler = (
      _event: IpcRendererEvent,
      payload: IpcEventPayload<'transfer:progress'>
    ): void => {
      listener(payload)
    }
    ipcRenderer.on('transfer:progress', handler)
    return () => {
      ipcRenderer.removeListener('transfer:progress', handler)
    }
  },
  onTransferConflict: (
    listener: (payload: IpcEventPayload<'transfer:conflict'>) => void
  ): (() => void) => {
    const handler = (
      _event: IpcRendererEvent,
      payload: IpcEventPayload<'transfer:conflict'>
    ): void => {
      listener(payload)
    }
    ipcRenderer.on('transfer:conflict', handler)
    return () => {
      ipcRenderer.removeListener('transfer:conflict', handler)
    }
  },

  // Native Dialogs
  showOpenDialog: (input): Promise<IpcOutput<'dialog:showOpenDialog'>> => {
    return ipcRenderer.invoke('dialog:showOpenDialog', input)
  },
  showSaveDialog: (input): Promise<IpcOutput<'dialog:showSaveDialog'>> => {
    return ipcRenderer.invoke('dialog:showSaveDialog', input)
  },

  // Remote Editor
  editorOpenFile: (input: IpcInput<'editor:openFile'>): Promise<IpcOutput<'editor:openFile'>> => {
    return ipcRenderer.invoke('editor:openFile', input)
  },
  editorSaveFile: (input: IpcInput<'editor:saveFile'>): Promise<IpcOutput<'editor:saveFile'>> => {
    return ipcRenderer.invoke('editor:saveFile', input)
  },
  editorOpenExternal: (
    input: IpcInput<'editor:openExternal'>
  ): Promise<IpcOutput<'editor:openExternal'>> => {
    return ipcRenderer.invoke('editor:openExternal', input)
  },
  editorCloseExternal: (
    input: IpcInput<'editor:closeExternal'>
  ): Promise<IpcOutput<'editor:closeExternal'>> => {
    return ipcRenderer.invoke('editor:closeExternal', input)
  },
  editorSyncExternal: (
    input: IpcInput<'editor:syncExternal'>
  ): Promise<IpcOutput<'editor:syncExternal'>> => {
    return ipcRenderer.invoke('editor:syncExternal', input)
  },
  onEditorExternalModified: (
    listener: (payload: IpcEventPayload<'editor:externalModified'>) => void
  ): (() => void) => {
    const handler = (
      _event: IpcRendererEvent,
      payload: IpcEventPayload<'editor:externalModified'>
    ): void => {
      listener(payload)
    }
    ipcRenderer.on('editor:externalModified', handler)
    return () => {
      ipcRenderer.removeListener('editor:externalModified', handler)
    }
  },

  // Tunnels
  listTunnels: (input): Promise<IpcOutput<'tunnel:list'>> => {
    return ipcRenderer.invoke('tunnel:list', input)
  },
  saveTunnel: (input): Promise<IpcOutput<'tunnel:save'>> => {
    return ipcRenderer.invoke('tunnel:save', input)
  },
  deleteTunnel: (id: string): Promise<IpcOutput<'tunnel:delete'>> => {
    return ipcRenderer.invoke('tunnel:delete', { id })
  },
  startTunnel: (input): Promise<IpcOutput<'tunnel:start'>> => {
    return ipcRenderer.invoke('tunnel:start', input)
  },
  stopTunnel: (id: string): Promise<IpcOutput<'tunnel:stop'>> => {
    return ipcRenderer.invoke('tunnel:stop', { id })
  },

  // SSH Key Manager
  listKeys: (): Promise<IpcOutput<'key:list'>> => {
    return ipcRenderer.invoke('key:list')
  },
  generateKey: (input): Promise<IpcOutput<'key:generate'>> => {
    return ipcRenderer.invoke('key:generate', input)
  },
  importKey: (input): Promise<IpcOutput<'key:import'>> => {
    return ipcRenderer.invoke('key:import', input)
  },
  installKeyToServer: (input): Promise<IpcOutput<'key:installToServer'>> => {
    return ipcRenderer.invoke('key:installToServer', input)
  },

  // Auto Updater
  checkForUpdates: (manual?: boolean): Promise<IpcOutput<'updater:check'>> => {
    return ipcRenderer.invoke('updater:check', { manual })
  },
  installUpdate: (): Promise<void> => {
    return ipcRenderer.invoke('updater:install')
  },
  onUpdaterStatus: (
    listener: (payload: IpcEventPayload<'updater:status'>) => void
  ): (() => void) => {
    const handler = (
      _event: IpcRendererEvent,
      payload: IpcEventPayload<'updater:status'>
    ): void => {
      listener(payload)
    }
    ipcRenderer.on('updater:status', handler)
    return () => {
      ipcRenderer.removeListener('updater:status', handler)
    }
  }
}

// Expose API safely via contextBridge
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error('Failed to expose api to main world:', error)
  }
} else {
  const target = window as unknown as { api: ElectronApi }
  target.api = api
}
