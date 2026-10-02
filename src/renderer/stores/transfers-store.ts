import { create } from 'zustand'
import type {
  TransferItem,
  TransferProgressEvent,
  TransferConflictAction,
  TransferConflictPrompt
} from '@shared/types'

interface TransfersState {
  transfers: Record<string, TransferItem>
  conflictPrompt: TransferConflictPrompt | null
  setConflictPrompt: (prompt: TransferConflictPrompt | null) => void

  startUpload: (
    sessionId: string,
    localPath: string,
    remotePath: string,
    conflictAction?: TransferConflictAction
  ) => Promise<string>
  startDownload: (
    sessionId: string,
    remotePath: string,
    localPath: string,
    conflictAction?: TransferConflictAction
  ) => Promise<string>
  pauseTransfer: (transferId: string) => Promise<void>
  resumeTransfer: (transferId: string) => Promise<void>
  cancelTransfer: (transferId: string) => Promise<void>
  retryTransfer: (transferId: string) => Promise<void>
  resolveConflict: (
    transferId: string,
    action: TransferConflictAction,
    applyToAll?: boolean,
    newName?: string
  ) => Promise<void>
  getTransfersForSession: (sessionId?: string) => TransferItem[]
}

export const useTransfersStore = create<TransfersState>((set, get) => ({
  transfers: {},
  conflictPrompt: null,

  setConflictPrompt: (conflictPrompt) => set({ conflictPrompt }),

  startUpload: async (sessionId, localPath, remotePath, conflictAction) => {
    if (typeof window !== 'undefined' && window.api) {
      const res = await window.api.transferStart({
        sessionId,
        direction: 'upload',
        localPath,
        remotePath,
        conflictAction
      })
      return res.transferId
    }
    return 'mock-transfer-id'
  },

  startDownload: async (sessionId, remotePath, localPath, conflictAction) => {
    if (typeof window !== 'undefined' && window.api) {
      const res = await window.api.transferStart({
        sessionId,
        direction: 'download',
        localPath,
        remotePath,
        conflictAction
      })
      return res.transferId
    }
    return 'mock-transfer-id'
  },

  pauseTransfer: async (transferId) => {
    if (typeof window !== 'undefined' && window.api) {
      await window.api.transferPause({ transferId })
    }
  },

  resumeTransfer: async (transferId) => {
    if (typeof window !== 'undefined' && window.api) {
      await window.api.transferResume({ transferId })
    }
  },

  cancelTransfer: async (transferId) => {
    if (typeof window !== 'undefined' && window.api) {
      await window.api.transferCancel({ transferId })
    }
  },

  retryTransfer: async (transferId) => {
    if (typeof window !== 'undefined' && window.api) {
      await window.api.transferRetry({ transferId })
    }
  },

  resolveConflict: async (transferId, action, applyToAll = false, newName) => {
    if (typeof window !== 'undefined' && window.api) {
      await window.api.transferResolveConflict({
        transferId,
        action,
        applyToAll,
        newName
      })
    }
    set({ conflictPrompt: null })
  },

  getTransfersForSession: (sessionId) => {
    const all = Object.values(get().transfers)
    if (!sessionId) return all
    return all.filter((t) => t.sessionId === sessionId)
  }
}))

// Wire up global IPC listeners
if (typeof window !== 'undefined' && window.api) {
  window.api.onTransferProgress((event: TransferProgressEvent) => {
    useTransfersStore.setState((state) => {
      const existing = state.transfers[event.transferId]
      const updated: TransferItem = {
        id: event.transferId,
        sessionId: event.sessionId,
        fileName: existing?.fileName || 'Файл',
        direction: existing?.direction || 'download',
        localPath: existing?.localPath || '',
        remotePath: existing?.remotePath || '',
        totalBytes: event.totalBytes,
        transferredBytes: event.transferredBytes,
        progress: event.progress,
        status: event.status,
        speed: event.speed,
        eta: event.eta,
        errorMessage: event.errorMessage
      }

      return {
        transfers: {
          ...state.transfers,
          [event.transferId]: updated
        }
      }
    })
  })

  window.api.onTransferConflict((prompt) => {
    useTransfersStore.setState({ conflictPrompt: prompt })
  })
}
