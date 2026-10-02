import { z } from 'zod'

/**
 * Zod Schemas for data validation
 */
export const SessionConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  folderId: z.string().optional(),
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535),
  username: z.string().min(1),
  auth: z.enum(['password', 'key', 'agent']),
  keyPath: z.string().optional(),
  color: z.string().optional(),
  tags: z.array(z.string()).optional(),
  startupCommand: z.string().optional(),
  keepaliveSec: z.number().int().min(0).default(30),
  encoding: z.string().default('utf-8'),
  jumpHostId: z.string().optional()
})

export const SessionFolderSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  parentId: z.string().optional()
})

export const SftpItemSchema = z.object({
  name: z.string(),
  type: z.enum(['directory', 'file', 'symlink']),
  size: z.number(),
  permissions: z.string(),
  modifyTime: z.number(),
  owner: z.string().optional(),
  group: z.string().optional()
})

export const TransferItemSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  fileName: z.string(),
  direction: z.enum(['upload', 'download']),
  localPath: z.string(),
  remotePath: z.string(),
  totalBytes: z.number(),
  transferredBytes: z.number(),
  progress: z.number(),
  status: z.enum(['queued', 'in_progress', 'paused', 'completed', 'error', 'cancelled']),
  speed: z.string().optional(),
  eta: z.string().optional(),
  errorMessage: z.string().optional(),
  conflictAction: z.enum(['overwrite', 'skip', 'rename']).optional()
})

export const TunnelConfigSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  name: z.string(),
  type: z.enum(['local', 'remote', 'dynamic']),
  enabled: z.boolean(),
  autoStart: z.boolean(),
  localHost: z.string().optional(),
  localPort: z.number().optional(),
  dstHost: z.string().optional(),
  dstPort: z.number().optional(),
  remoteHost: z.string().optional(),
  remotePort: z.number().optional(),
  socksPort: z.number().optional(),
  status: z.enum(['active', 'inactive', 'error']).optional(),
  errorMessage: z.string().optional(),
  bytesIn: z.number().optional(),
  bytesOut: z.number().optional()
})

export const SshKeyItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  path: z.string(),
  type: z.enum(['ed25519', 'rsa', 'ecdsa', 'dsa', 'unknown']),
  isEncrypted: z.boolean(),
  publicKeyText: z.string(),
  fingerprintSha256: z.string(),
  comment: z.string().optional(),
  source: z.enum(['system', 'custom'])
})

/**
 * IPC Invoke channel contracts.
 */
export const IpcInvokeContracts = {
  // App info
  'app:getVersion': {
    input: z.void().optional(),
    output: z.object({
      version: z.string(),
      name: z.string()
    })
  },

  // Local PTY
  'term:create': {
    input: z
      .object({
        shell: z.string().optional(),
        args: z.array(z.string()).optional(),
        cwd: z.string().optional(),
        env: z.record(z.string()).optional(),
        cols: z.number().int().positive().optional(),
        rows: z.number().int().positive().optional()
      })
      .optional(),
    output: z.object({
      terminalId: z.string()
    })
  },
  'term:write': {
    input: z.object({
      terminalId: z.string(),
      data: z.string()
    }),
    output: z.void().optional()
  },
  'term:resize': {
    input: z.object({
      terminalId: z.string(),
      cols: z.number().int().positive(),
      rows: z.number().int().positive()
    }),
    output: z.void().optional()
  },
  'term:close': {
    input: z.object({
      terminalId: z.string()
    }),
    output: z.void().optional()
  },

  // Sessions & Folders CRUD
  'session:list': {
    input: z.void().optional(),
    output: z.object({
      sessions: z.array(SessionConfigSchema),
      folders: z.array(SessionFolderSchema)
    })
  },
  'session:save': {
    input: z.object({
      session: SessionConfigSchema,
      secret: z.string().optional()
    }),
    output: SessionConfigSchema
  },
  'session:delete': {
    input: z.object({
      id: z.string()
    }),
    output: z.void().optional()
  },
  'folder:save': {
    input: z.object({
      folder: SessionFolderSchema
    }),
    output: SessionFolderSchema
  },
  'folder:delete': {
    input: z.object({
      id: z.string()
    }),
    output: z.void().optional()
  },

  // SSH Connection & Shell Channels
  'ssh:connect': {
    input: z.object({
      sessionId: z.string(),
      cols: z.number().int().positive().optional(),
      rows: z.number().int().positive().optional(),
      temporarySecret: z.string().optional(),
      trustHostKeyOnce: z.boolean().optional(),
      rememberHostKey: z.boolean().optional(),
      enableOsc7: z.boolean().optional()
    }),
    output: z.object({
      channelId: z.string(),
      connectionId: z.string()
    })
  },
  'ssh:write': {
    input: z.object({
      channelId: z.string(),
      data: z.string()
    }),
    output: z.void().optional()
  },
  'ssh:resize': {
    input: z.object({
      channelId: z.string(),
      cols: z.number().int().positive(),
      rows: z.number().int().positive()
    }),
    output: z.void().optional()
  },
  'ssh:close': {
    input: z.object({
      channelId: z.string()
    }),
    output: z.void().optional()
  },
  'ssh:confirmHostKey': {
    input: z.object({
      sessionId: z.string(),
      trustOnce: z.boolean(),
      remember: z.boolean()
    }),
    output: z.void().optional()
  },

  // SFTP Operations
  'sftp:list': {
    input: z.object({
      sessionId: z.string(),
      remotePath: z.string()
    }),
    output: z.object({
      path: z.string(),
      items: z.array(SftpItemSchema)
    })
  },
  'sftp:stat': {
    input: z.object({
      sessionId: z.string(),
      remotePath: z.string()
    }),
    output: SftpItemSchema
  },
  'sftp:mkdir': {
    input: z.object({
      sessionId: z.string(),
      remotePath: z.string()
    }),
    output: z.object({
      success: z.boolean()
    })
  },
  'sftp:rename': {
    input: z.object({
      sessionId: z.string(),
      oldPath: z.string(),
      newPath: z.string()
    }),
    output: z.object({
      success: z.boolean()
    })
  },
  'sftp:delete': {
    input: z.object({
      sessionId: z.string(),
      remotePath: z.string(),
      recursive: z.boolean().optional()
    }),
    output: z.object({
      success: z.boolean()
    })
  },
  'sftp:chmod': {
    input: z.object({
      sessionId: z.string(),
      remotePath: z.string(),
      mode: z.number().int()
    }),
    output: z.object({
      success: z.boolean()
    })
  },
  'sftp:realpath': {
    input: z.object({
      sessionId: z.string(),
      remotePath: z.string()
    }),
    output: z.object({
      path: z.string()
    })
  },
  'sftp:readFile': {
    input: z.object({
      sessionId: z.string(),
      remotePath: z.string(),
      maxSize: z.number().optional()
    }),
    output: z.object({
      content: z.string()
    })
  },
  'sftp:writeFile': {
    input: z.object({
      sessionId: z.string(),
      remotePath: z.string(),
      content: z.string()
    }),
    output: z.object({
      success: z.boolean()
    })
  },

  // Transfer Queue
  'transfer:start': {
    input: z.object({
      sessionId: z.string(),
      direction: z.enum(['upload', 'download']),
      localPath: z.string(),
      remotePath: z.string(),
      conflictAction: z.enum(['overwrite', 'skip', 'rename']).optional()
    }),
    output: z.object({
      transferId: z.string()
    })
  },
  'transfer:pause': {
    input: z.object({
      transferId: z.string()
    }),
    output: z.object({
      success: z.boolean()
    })
  },
  'transfer:resume': {
    input: z.object({
      transferId: z.string()
    }),
    output: z.object({
      success: z.boolean()
    })
  },
  'transfer:cancel': {
    input: z.object({
      transferId: z.string()
    }),
    output: z.object({
      success: z.boolean()
    })
  },
  'transfer:retry': {
    input: z.object({
      transferId: z.string()
    }),
    output: z.object({
      success: z.boolean()
    })
  },
  'transfer:resolveConflict': {
    input: z.object({
      transferId: z.string(),
      action: z.enum(['overwrite', 'skip', 'rename']),
      applyToAll: z.boolean().optional(),
      newName: z.string().optional()
    }),
    output: z.object({
      success: z.boolean()
    })
  },
  'transfer:list': {
    input: z
      .object({
        sessionId: z.string().optional()
      })
      .optional(),
    output: z.array(TransferItemSchema)
  },

  // Native File Dialogs
  'dialog:showOpenDialog': {
    input: z.object({
      title: z.string().optional(),
      properties: z.array(z.string()).optional()
    }),
    output: z.object({
      canceled: z.boolean(),
      filePaths: z.array(z.string())
    })
  },
  'dialog:showSaveDialog': {
    input: z.object({
      title: z.string().optional(),
      defaultPath: z.string().optional()
    }),
    output: z.object({
      canceled: z.boolean(),
      filePath: z.string().optional()
    })
  },

  // --- Remote Editor Handlers ---
  'editor:openFile': {
    input: z.object({
      sessionId: z.string(),
      remotePath: z.string()
    }),
    output: z.object({
      content: z.string(),
      encoding: z.string(),
      lineEndings: z.enum(['LF', 'CRLF']),
      mtime: z.number(),
      size: z.number(),
      mode: z.number()
    })
  },
  'editor:saveFile': {
    input: z.object({
      sessionId: z.string(),
      remotePath: z.string(),
      content: z.string(),
      expectedMtime: z.number(),
      expectedSize: z.number(),
      forceOverwrite: z.boolean().optional(),
      saveAsCopy: z.boolean().optional(),
      copyPath: z.string().optional()
    }),
    output: z.object({
      success: z.boolean(),
      conflict: z.boolean().optional(),
      currentMtime: z.number().optional(),
      currentSize: z.number().optional(),
      newMtime: z.number().optional(),
      newSize: z.number().optional(),
      savedPath: z.string().optional()
    })
  },
  'editor:openExternal': {
    input: z.object({
      sessionId: z.string(),
      remotePath: z.string()
    }),
    output: z.object({
      watchId: z.string(),
      localPath: z.string()
    })
  },
  'editor:closeExternal': {
    input: z.object({
      watchId: z.string()
    }),
    output: z.object({
      success: z.boolean()
    })
  },
  'editor:syncExternal': {
    input: z.object({
      watchId: z.string(),
      sessionId: z.string(),
      remotePath: z.string(),
      localPath: z.string()
    }),
    output: z.object({
      success: z.boolean()
    })
  },

  // --- Tunnel Handlers ---
  'tunnel:list': {
    input: z
      .object({
        sessionId: z.string().optional()
      })
      .optional(),
    output: z.array(TunnelConfigSchema)
  },
  'tunnel:save': {
    input: TunnelConfigSchema,
    output: TunnelConfigSchema
  },
  'tunnel:delete': {
    input: z.object({
      id: z.string()
    }),
    output: z.object({
      success: z.boolean()
    })
  },
  'tunnel:start': {
    input: TunnelConfigSchema,
    output: TunnelConfigSchema
  },
  'tunnel:stop': {
    input: z.object({
      id: z.string()
    }),
    output: TunnelConfigSchema
  },

  // --- SSH Key Manager Handlers ---
  'key:list': {
    input: z.void().optional(),
    output: z.array(SshKeyItemSchema)
  },
  'key:generate': {
    input: z.object({
      name: z.string().min(1),
      comment: z.string().optional(),
      passphrase: z.string().optional()
    }),
    output: SshKeyItemSchema
  },
  'key:import': {
    input: z.object({
      filePath: z.string().min(1)
    }),
    output: SshKeyItemSchema
  },
  'key:installToServer': {
    input: z.object({
      publicKeyText: z.string().min(1),
      sessionId: z.string().min(1)
    }),
    output: z.object({
      success: z.boolean()
    })
  },

  // Terminal logging
  'term:log': {
    input: z.object({
      sessionId: z.string(),
      data: z.string(),
      stripAnsi: z.boolean().optional()
    }),
    output: z.void().optional()
  },

  // Auto Updater
  'updater:check': {
    input: z
      .object({
        manual: z.boolean().optional()
      })
      .optional(),
    output: z.object({
      status: z.string()
    })
  },
  'updater:install': {
    input: z.void().optional(),
    output: z.void().optional()
  }
} as const

export type IpcInvokeChannel = keyof typeof IpcInvokeContracts

export type IpcInput<C extends IpcInvokeChannel> = z.infer<(typeof IpcInvokeContracts)[C]['input']>

export type IpcOutput<C extends IpcInvokeChannel> = z.infer<
  (typeof IpcInvokeContracts)[C]['output']
>

/**
 * IPC Event channel contracts (for push events from main to renderer).
 */
export const IpcEventContracts = {
  'term:data': z.object({
    terminalId: z.string(),
    data: z.string()
  }),
  'term:exit': z.object({
    terminalId: z.string(),
    exitCode: z.number(),
    signal: z.number().optional()
  }),

  // SSH events
  'ssh:data': z.object({
    channelId: z.string(),
    data: z.string()
  }),
  'ssh:exit': z.object({
    channelId: z.string(),
    exitCode: z.number()
  }),
  'ssh:status': z.object({
    sessionId: z.string(),
    channelId: z.string().optional(),
    status: z.enum(['connecting', 'connected', 'disconnected', 'error']),
    error: z.string().optional()
  }),
  'ssh:hostKeyPrompt': z.object({
    sessionId: z.string(),
    host: z.string(),
    port: z.number(),
    keyType: z.string(),
    fingerprintSha256: z.string(),
    status: z.enum(['new', 'mismatch'])
  }),

  // Transfer Queue events
  'transfer:progress': z.object({
    transferId: z.string(),
    sessionId: z.string(),
    progress: z.number(),
    transferredBytes: z.number(),
    totalBytes: z.number(),
    speed: z.string(),
    eta: z.string(),
    status: z.enum(['queued', 'in_progress', 'paused', 'completed', 'error', 'cancelled']),
    errorMessage: z.string().optional()
  }),
  'transfer:conflict': z.object({
    transferId: z.string(),
    sessionId: z.string(),
    fileName: z.string(),
    localPath: z.string(),
    remotePath: z.string(),
    direction: z.enum(['upload', 'download']),
    existingSize: z.number().optional(),
    newSize: z.number().optional()
  }),
  'editor:externalModified': z.object({
    watchId: z.string(),
    sessionId: z.string(),
    remotePath: z.string(),
    localPath: z.string()
  }),
  'updater:status': z.object({
    status: z.enum([
      'idle',
      'checking',
      'available',
      'not-available',
      'downloading',
      'downloaded',
      'error'
    ]),
    version: z.string().optional(),
    percent: z.number().optional(),
    error: z.string().optional()
  })
} as const

export type IpcEventChannel = keyof typeof IpcEventContracts

export type IpcEventPayload<E extends IpcEventChannel> = z.infer<(typeof IpcEventContracts)[E]>
