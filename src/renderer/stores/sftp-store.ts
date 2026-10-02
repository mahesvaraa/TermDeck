import { create } from 'zustand'
import type { SftpFileItem } from '../mocks/types'
import type { SftpColumnSettings, SftpPanelPosition } from '@shared/types'
import { mockSftpFiles } from '../mocks/sftp'

export function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function formatDate(timestamp: number): string {
  if (!timestamp) return '—'
  const d = new Date(timestamp)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export interface TabSftpState {
  currentPath: string
  items: SftpFileItem[]
  selectedNames: string[]
  isLoading: boolean
  error: string | null
}

export type SftpSortField = 'name' | 'size' | 'date' | 'permissions' | 'owner'
export type SftpSortOrder = 'asc' | 'desc'

interface SftpStoreState {
  tabStates: Record<string, TabSftpState>
  panelPosition: SftpPanelPosition
  columnSettings: SftpColumnSettings
  sortField: SftpSortField
  sortOrder: SftpSortOrder

  // Settings actions
  setPanelPosition: (pos: SftpPanelPosition) => void
  toggleColumn: (column: keyof SftpColumnSettings) => void
  setSorting: (field: SftpSortField) => void

  // Per-tab actions
  getTabState: (tabId: string) => TabSftpState
  loadDirectory: (tabId: string, sessionId?: string, path?: string) => Promise<void>
  navigateTo: (tabId: string, sessionId?: string, targetPath?: string) => Promise<void>
  navigateUp: (tabId: string, sessionId?: string) => Promise<void>
  selectItem: (tabId: string, name: string, isCtrl: boolean, isShift: boolean) => void
  clearSelection: (tabId: string) => void
  createDirectory: (tabId: string, sessionId: string, folderName: string) => Promise<void>
  renameItem: (tabId: string, sessionId: string, oldName: string, newName: string) => Promise<void>
  deleteSelected: (tabId: string, sessionId: string) => Promise<void>
  chmodItem: (tabId: string, sessionId: string, name: string, mode: number) => Promise<void>
}

const defaultColumnSettings: SftpColumnSettings = {
  showDate: true,
  showOwner: false,
  showPermissions: false
}

export const defaultTabSftpState: TabSftpState = {
  currentPath: '/var/www',
  items: mockSftpFiles,
  selectedNames: [],
  isLoading: false,
  error: null
}

export const useSftpStore = create<SftpStoreState>((set, get) => ({
  tabStates: {},
  panelPosition: 'left',
  columnSettings: defaultColumnSettings,
  sortField: 'name',
  sortOrder: 'asc',

  setPanelPosition: (panelPosition) => set({ panelPosition }),

  toggleColumn: (column) =>
    set((state) => ({
      columnSettings: {
        ...state.columnSettings,
        [column]: !state.columnSettings[column]
      }
    })),

  setSorting: (field) =>
    set((state) => {
      if (state.sortField === field) {
        return { sortOrder: state.sortOrder === 'asc' ? 'desc' : 'asc' }
      }
      return { sortField: field, sortOrder: 'asc' }
    }),

  getTabState: (tabId) => {
    return get().tabStates[tabId] || defaultTabSftpState
  },

  loadDirectory: async (tabId, sessionId, targetPath) => {
    const currentState = get().getTabState(tabId)
    const pathToFetch = targetPath || currentState.currentPath || '.'

    // Local / mockup fallback if no API or sessionId
    if (typeof window === 'undefined' || !window.api || !sessionId) {
      set((s) => ({
        tabStates: {
          ...s.tabStates,
          [tabId]: {
            ...currentState,
            currentPath: pathToFetch,
            items: mockSftpFiles,
            isLoading: false,
            error: null
          }
        }
      }))
      return
    }

    set((s) => ({
      tabStates: {
        ...s.tabStates,
        [tabId]: {
          ...currentState,
          isLoading: true,
          error: null
        }
      }
    }))

    try {
      const res = await window.api.sftpList({ sessionId, remotePath: pathToFetch })
      const mappedItems: SftpFileItem[] = res.items.map((item) => ({
        name: item.name,
        type: item.type,
        size: item.type === 'directory' ? '—' : formatFileSize(item.size),
        rawSize: item.size,
        permissions: item.permissions,
        date: formatDate(item.modifyTime),
        modifyTime: item.modifyTime,
        owner: item.owner,
        group: item.group
      }))

      set((s) => ({
        tabStates: {
          ...s.tabStates,
          [tabId]: {
            currentPath: res.path,
            items: mappedItems,
            selectedNames: [],
            isLoading: false,
            error: null
          }
        }
      }))
    } catch (err) {
      const rawMsg = (err as Error).message || ''
      const cleanMsg = rawMsg
        .replace(/^Error invoking remote method '[^']+':\s*/i, '')
        .replace(/^Error:\s*/i, '')
        .trim()
      set((s) => ({
        tabStates: {
          ...s.tabStates,
          [tabId]: {
            ...currentState,
            isLoading: false,
            error: cleanMsg
          }
        }
      }))
    }
  },

  navigateTo: async (tabId, sessionId, targetPath) => {
    await get().loadDirectory(tabId, sessionId, targetPath)
  },

  navigateUp: async (tabId, sessionId) => {
    const currentState = get().getTabState(tabId)
    const current = currentState.currentPath.replace(/\/+$/, '')
    const parent = current.substring(0, current.lastIndexOf('/')) || '/'
    await get().loadDirectory(tabId, sessionId, parent)
  },

  selectItem: (tabId, name, isCtrl, isShift) => {
    set((state) => {
      const current = state.getTabState(tabId)
      let nextSelected: string[] = []

      if (isShift && current.selectedNames.length > 0) {
        const lastSelected = current.selectedNames[current.selectedNames.length - 1]
        const fromIdx = current.items.findIndex((i) => i.name === lastSelected)
        const toIdx = current.items.findIndex((i) => i.name === name)
        if (fromIdx !== -1 && toIdx !== -1) {
          const start = Math.min(fromIdx, toIdx)
          const end = Math.max(fromIdx, toIdx)
          const rangeNames = current.items.slice(start, end + 1).map((i) => i.name)
          const combined = new Set([...current.selectedNames, ...rangeNames])
          nextSelected = Array.from(combined)
        } else {
          nextSelected = [name]
        }
      } else if (isCtrl) {
        if (current.selectedNames.includes(name)) {
          nextSelected = current.selectedNames.filter((n) => n !== name)
        } else {
          nextSelected = [...current.selectedNames, name]
        }
      } else {
        nextSelected = [name]
      }

      return {
        tabStates: {
          ...state.tabStates,
          [tabId]: {
            ...current,
            selectedNames: nextSelected
          }
        }
      }
    })
  },

  clearSelection: (tabId) => {
    set((state) => {
      const current = state.getTabState(tabId)
      return {
        tabStates: {
          ...state.tabStates,
          [tabId]: {
            ...current,
            selectedNames: []
          }
        }
      }
    })
  },

  createDirectory: async (tabId, sessionId, folderName) => {
    if (!sessionId || !folderName.trim()) return
    const currentState = get().getTabState(tabId)
    const fullPath = `${currentState.currentPath.replace(/\/+$/, '')}/${folderName.trim()}`

    if (typeof window !== 'undefined' && window.api) {
      await window.api.sftpMkdir({ sessionId, remotePath: fullPath })
      await get().loadDirectory(tabId, sessionId, currentState.currentPath)
    }
  },

  renameItem: async (tabId, sessionId, oldName, newName) => {
    if (!sessionId || !oldName || !newName || oldName === newName) return
    const currentState = get().getTabState(tabId)
    const base = currentState.currentPath.replace(/\/+$/, '')
    const oldPath = `${base}/${oldName}`
    const newPath = `${base}/${newName.trim()}`

    if (typeof window !== 'undefined' && window.api) {
      await window.api.sftpRename({ sessionId, oldPath, newPath })
      await get().loadDirectory(tabId, sessionId, currentState.currentPath)
    }
  },

  deleteSelected: async (tabId, sessionId) => {
    if (!sessionId) return
    const currentState = get().getTabState(tabId)
    const base = currentState.currentPath.replace(/\/+$/, '')

    if (typeof window !== 'undefined' && window.api) {
      for (const name of currentState.selectedNames) {
        const fullPath = `${base}/${name}`
        await window.api.sftpDelete({ sessionId, remotePath: fullPath, recursive: true })
      }
      await get().loadDirectory(tabId, sessionId, currentState.currentPath)
    }
  },

  chmodItem: async (tabId, sessionId, name, mode) => {
    if (!sessionId || !name) return
    const currentState = get().getTabState(tabId)
    const fullPath = `${currentState.currentPath.replace(/\/+$/, '')}/${name}`

    if (typeof window !== 'undefined' && window.api) {
      await window.api.sftpChmod({ sessionId, remotePath: fullPath, mode })
      await get().loadDirectory(tabId, sessionId, currentState.currentPath)
    }
  }
}))
