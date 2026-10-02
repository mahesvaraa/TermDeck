import { create } from 'zustand'
import type { SessionItem, TabStatus, TransferItem, SplitNode, SplitDirection } from '@shared/types'
import {
  createInitialSplit,
  splitLeaf,
  removeLeaf,
  findLeaf,
  getAllLeaves,
  navigatePane,
  updateBranchSizes
} from '../utils/split-tree'

export interface RemoteEditorTabState {
  sessionId: string
  remotePath: string
  originalContent: string
  content: string
  isDirty: boolean
  encoding: string
  lineEndings: 'LF' | 'CRLF'
  mtime: number
  size: number
  mode: number
}

export interface TabData {
  id: string
  title: string
  host: string
  type: 'ssh' | 'local' | 'editor'
  status: TabStatus
  uptime: string
  termText?: string
  terminalId?: string
  sessionId?: string
  channelId?: string
  errorMessage?: string
  // Per-tab UI state
  currentPath: string
  selectedFileName: string | null
  osc7Follow: boolean
  transfers: TransferItem[]
  // Splits Tree state
  rootSplit?: SplitNode
  activePaneId?: string
  isMultiExec?: boolean
  // Remote editor state
  editorState?: RemoteEditorTabState
  sessionItem?: SessionItem
}

export interface TabsState {
  tabs: TabData[]
  activeTabId: string
  pendingCloseTabId: string | null
  setPendingCloseTabId: (id: string | null) => void
  requestCloseTab: (id: string) => void
  setActiveTabId: (id: string) => void
  openLocalTab: () => Promise<string>
  openTab: (session: SessionItem) => Promise<string>
  connectSshTab: (tabId: string, temporarySecret?: string) => Promise<void>
  closeTab: (id: string) => void
  renameTab: (id: string, newTitle: string) => void
  duplicateTab: (id: string) => Promise<void>
  reorderTabs: (fromIndex: number, toIndex: number) => void
  closeOtherTabs: (id: string) => void
  nextTab: () => void
  prevTab: () => void
  setTabPath: (tabId: string, path: string) => void
  setTabSelection: (tabId: string, fileName: string | null) => void
  toggleOsc7: (tabId: string) => void
  setTabTerminalId: (tabId: string, terminalId: string) => void
  setTabStatus: (tabId: string, status: TabStatus, errorMessage?: string) => void
  getActiveTab: () => TabData | undefined
  // Splits Tree actions
  splitActivePane: (direction: SplitDirection) => Promise<string | undefined>
  closePane: (tabId: string, paneId: string) => Promise<void>
  setActivePane: (tabId: string, paneId: string) => void
  focusAdjacentPane: (direction: 'up' | 'down' | 'left' | 'right') => void
  toggleMultiExec: (tabId: string) => void
  setSplitSizes: (tabId: string, branchId: string, sizes: [number, number]) => void
  // Editor actions
  openEditorTab: (sessionId: string, remotePath: string) => Promise<string | undefined>
  updateEditorContent: (tabId: string, content: string) => void
  updateEditorEncoding: (tabId: string, encoding: string) => void
  updateEditorLineEndings: (tabId: string, lineEndings: 'LF' | 'CRLF') => void
  markEditorSaved: (tabId: string, newMtime: number, newSize: number, newPath?: string) => void
}

const initialTabs: TabData[] = [
  {
    id: 'tab-local-1',
    title: 'Локальный терминал',
    host: 'localhost',
    type: 'local',
    status: 'connected',
    uptime: '—',
    currentPath: '~',
    selectedFileName: null,
    osc7Follow: false,
    transfers: []
  }
]

export const useTabsStore = create<TabsState>((set, get) => ({
  tabs: initialTabs,
  activeTabId: initialTabs[0].id,
  pendingCloseTabId: null,

  setPendingCloseTabId: (id) => set({ pendingCloseTabId: id }),

  requestCloseTab: (id) => {
    const tab = get().tabs.find((t) => t.id === id)
    if (tab?.type === 'editor' && tab.editorState?.isDirty) {
      set({ pendingCloseTabId: id })
    } else {
      get().closeTab(id)
    }
  },

  setActiveTabId: (id) => set({ activeTabId: id }),

  openLocalTab: async () => {
    let terminalId: string | undefined
    if (typeof window !== 'undefined' && window.api?.createTerminal) {
      try {
        const res = await window.api.createTerminal()
        terminalId = res.terminalId
      } catch (err) {
        console.error('Failed to create terminal:', err)
      }
    }

    const id = `local-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
    const newTab: TabData = {
      id,
      title: 'Локальный терминал',
      host: 'localhost',
      type: 'local',
      status: 'connected',
      uptime: '0м',
      terminalId,
      currentPath: '~',
      selectedFileName: null,
      osc7Follow: false,
      transfers: []
    }

    set((state) => ({
      tabs: [...state.tabs, newTab],
      activeTabId: newTab.id
    }))

    return id
  },

  connectSshTab: async (tabId: string, temporarySecret?: string) => {
    const tab = get().tabs.find((t) => t.id === tabId)
    if (!tab || !tab.sessionId) return

    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === tabId ? { ...t, status: 'connecting', errorMessage: undefined } : t
      )
    }))

    if (typeof window !== 'undefined' && window.api?.connectSsh) {
      try {
        const res = await window.api.connectSsh({
          sessionId: tab.sessionId,
          cols: 80,
          rows: 24,
          temporarySecret,
          enableOsc7: tab.osc7Follow ?? true
        })

        set((state) => ({
          tabs: state.tabs.map((t) =>
            t.id === tabId
              ? {
                  ...t,
                  status: 'connected',
                  channelId: res.channelId,
                  terminalId: res.channelId
                }
              : t
          )
        }))
      } catch (err) {
        console.error('SSH connection failed:', err)
        set((state) => ({
          tabs: state.tabs.map((t) =>
            t.id === tabId
              ? {
                  ...t,
                  status: 'error',
                  errorMessage: (err as Error).message
                }
              : t
          )
        }))
      }
    }
  },

  openTab: async (session) => {
    const existing = get().tabs.find((t) => t.sessionId === session.id || t.id === session.id)
    if (existing) {
      set({ activeTabId: existing.id })
      return existing.id
    }

    const newTabId = session.id
    const newTab: TabData = {
      id: newTabId,
      title: session.name,
      host: session.host,
      type: session.type,
      status: session.type === 'ssh' ? 'connecting' : 'connected',
      uptime: session.uptime || '0м',
      sessionId: session.id,
      currentPath: session.defaultPath || '/',
      selectedFileName: null,
      osc7Follow: session.type === 'ssh',
      transfers: [],
      sessionItem: session
    }

    set((state) => ({
      tabs: [...state.tabs, newTab],
      activeTabId: newTab.id
    }))

    if (session.type === 'ssh') {
      get()
        .connectSshTab(newTab.id)
        .catch(() => {})
    }

    return newTab.id
  },

  closeTab: (id) => {
    const state = get()
    const target = state.tabs.find((t) => t.id === id)

    if (target && typeof window !== 'undefined') {
      const leaves = target.rootSplit ? getAllLeaves(target.rootSplit) : []
      if (leaves.length > 0) {
        for (const leaf of leaves) {
          if (leaf.channelId && window.api?.closeSsh) {
            window.api.closeSsh(leaf.channelId).catch(() => {})
          } else if (leaf.terminalId && window.api?.closeTerminal) {
            window.api.closeTerminal(leaf.terminalId).catch(() => {})
          }
        }
      } else {
        if (target.type === 'ssh' && target.channelId && window.api?.closeSsh) {
          window.api.closeSsh(target.channelId).catch(() => {})
        } else if (target.terminalId && window.api?.closeTerminal) {
          window.api.closeTerminal(target.terminalId).catch(() => {})
        }
      }
    }

    set((curr) => {
      const newTabs = curr.tabs.filter((t) => t.id !== id)
      if (newTabs.length === 0) {
        return curr
      }
      let nextActive = curr.activeTabId
      if (curr.activeTabId === id) {
        const idx = curr.tabs.findIndex((t) => t.id === id)
        const nextTab = newTabs[Math.max(0, idx - 1)]
        nextActive = nextTab.id
      }
      return {
        tabs: newTabs,
        activeTabId: nextActive
      }
    })
  },

  renameTab: (id, newTitle) => {
    set((state) => ({
      tabs: state.tabs.map((tab) => (tab.id === id ? { ...tab, title: newTitle } : tab))
    }))
  },

  duplicateTab: async (id) => {
    const state = get()
    const tab = state.tabs.find((t) => t.id === id)
    if (!tab) return

    const newId = `${tab.id}-copy-${Date.now().toString(36)}`
    const newTab: TabData = {
      ...tab,
      id: newId,
      title: `${tab.title} (копия)`,
      terminalId: undefined,
      channelId: undefined,
      status: tab.type === 'ssh' ? 'connecting' : 'connected',
      transfers: []
    }

    const idx = state.tabs.findIndex((t) => t.id === id)
    const newTabs = [...state.tabs]
    newTabs.splice(idx + 1, 0, newTab)

    set({
      tabs: newTabs,
      activeTabId: newTab.id
    })

    if (tab.type === 'local') {
      if (typeof window !== 'undefined' && window.api?.createTerminal) {
        try {
          const res = await window.api.createTerminal()
          set((s) => ({
            tabs: s.tabs.map((t) => (t.id === newId ? { ...t, terminalId: res.terminalId } : t))
          }))
        } catch (err) {
          console.error('Failed to duplicate terminal:', err)
        }
      }
    } else if (tab.type === 'ssh' && tab.sessionId) {
      get()
        .connectSshTab(newId)
        .catch(() => {})
    }
  },

  reorderTabs: (fromIndex, toIndex) => {
    set((state) => {
      if (
        fromIndex < 0 ||
        fromIndex >= state.tabs.length ||
        toIndex < 0 ||
        toIndex >= state.tabs.length
      ) {
        return state
      }
      const newTabs = [...state.tabs]
      const [moved] = newTabs.splice(fromIndex, 1)
      newTabs.splice(toIndex, 0, moved)
      return { tabs: newTabs }
    })
  },

  closeOtherTabs: (id) => {
    const state = get()
    state.tabs.forEach((t) => {
      if (t.id !== id && typeof window !== 'undefined') {
        if (t.type === 'ssh' && t.channelId && window.api?.closeSsh) {
          window.api.closeSsh(t.channelId).catch(() => {})
        } else if (t.terminalId && window.api?.closeTerminal) {
          window.api.closeTerminal(t.terminalId).catch(() => {})
        }
      }
    })

    set((curr) => {
      const remaining = curr.tabs.filter((t) => t.id === id)
      return {
        tabs: remaining.length > 0 ? remaining : curr.tabs,
        activeTabId: id
      }
    })
  },

  nextTab: () => {
    set((state) => {
      if (state.tabs.length <= 1) return state
      const currIdx = state.tabs.findIndex((t) => t.id === state.activeTabId)
      const nextIdx = (currIdx + 1) % state.tabs.length
      return { activeTabId: state.tabs[nextIdx].id }
    })
  },

  prevTab: () => {
    set((state) => {
      if (state.tabs.length <= 1) return state
      const currIdx = state.tabs.findIndex((t) => t.id === state.activeTabId)
      const prevIdx = (currIdx - 1 + state.tabs.length) % state.tabs.length
      return { activeTabId: state.tabs[prevIdx].id }
    })
  },

  setTabPath: (tabId, path) => {
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === tabId ? { ...tab, currentPath: path, selectedFileName: null } : tab
      )
    }))
  },

  setTabSelection: (tabId, fileName) => {
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === tabId ? { ...tab, selectedFileName: fileName } : tab
      )
    }))
  },

  toggleOsc7: (tabId) => {
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === tabId ? { ...tab, osc7Follow: !tab.osc7Follow } : tab
      )
    }))
  },

  setTabTerminalId: (tabId, terminalId) => {
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === tabId
          ? {
              ...tab,
              terminalId,
              rootSplit:
                tab.rootSplit?.type === 'leaf' && !tab.rootSplit.terminalId
                  ? { ...tab.rootSplit, terminalId }
                  : tab.rootSplit
            }
          : tab
      )
    }))
  },

  setTabStatus: (tabId, status, errorMessage) => {
    set((state) => ({
      tabs: state.tabs.map((tab) => (tab.id === tabId ? { ...tab, status, errorMessage } : tab))
    }))
  },

  getActiveTab: () => {
    const state = get()
    return state.tabs.find((t) => t.id === state.activeTabId) || state.tabs[0]
  },

  splitActivePane: async (direction) => {
    const state = get()
    const activeTab = state.getActiveTab()
    if (!activeTab) return undefined

    const root =
      activeTab.rootSplit ||
      createInitialSplit(`pane-${activeTab.id}-1`, activeTab.channelId, activeTab.terminalId)
    const activePaneId = activeTab.activePaneId || `pane-${activeTab.id}-1`

    let channelId: string | undefined
    let terminalId: string | undefined

    if (activeTab.type === 'ssh') {
      if (activeTab.sessionId && typeof window !== 'undefined' && window.api?.connectSsh) {
        try {
          const res = await window.api.connectSsh({
            sessionId: activeTab.sessionId,
            cols: 80,
            rows: 24,
            enableOsc7: true
          })
          channelId = res.channelId
        } catch (err) {
          console.error('Failed to create SSH channel for split:', err)
          return undefined
        }
      }
    } else {
      if (typeof window !== 'undefined' && window.api?.createTerminal) {
        try {
          const res = await window.api.createTerminal()
          terminalId = res.terminalId
        } catch (err) {
          console.error('Failed to create local terminal for split:', err)
          return undefined
        }
      }
    }

    const newPaneId = `pane-${activeTab.id}-${Date.now()}`
    const newLeaf = {
      type: 'leaf' as const,
      id: newPaneId,
      channelId,
      terminalId
    }

    const newRoot = splitLeaf(root, activePaneId, direction, newLeaf)

    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.id === activeTab.id
          ? {
              ...t,
              rootSplit: newRoot,
              activePaneId: newPaneId
            }
          : t
      )
    }))

    return newPaneId
  },

  closePane: async (tabId, paneId) => {
    const state = get()
    const tab = state.tabs.find((t) => t.id === tabId)
    if (!tab) return

    const root =
      tab.rootSplit || createInitialSplit(`pane-${tab.id}-1`, tab.channelId, tab.terminalId)
    const leaf = findLeaf(root, paneId)

    if (leaf) {
      if (leaf.channelId && typeof window !== 'undefined' && window.api?.closeSsh) {
        window.api.closeSsh(leaf.channelId).catch(() => {})
      } else if (leaf.terminalId && typeof window !== 'undefined' && window.api?.closeTerminal) {
        window.api.closeTerminal(leaf.terminalId).catch(() => {})
      }
    }

    const newRoot = removeLeaf(root, paneId)
    if (!newRoot) {
      state.closeTab(tabId)
      return
    }

    const remainingLeaves = getAllLeaves(newRoot)
    const newActivePaneId =
      tab.activePaneId === paneId ? remainingLeaves[0]?.id || '' : tab.activePaneId

    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.id === tabId
          ? {
              ...t,
              rootSplit: newRoot,
              activePaneId: newActivePaneId
            }
          : t
      )
    }))
  },

  setActivePane: (tabId, paneId) => {
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === tabId ? { ...t, activePaneId: paneId } : t))
    }))
  },

  focusAdjacentPane: (direction) => {
    const state = get()
    const activeTab = state.getActiveTab()
    if (!activeTab) return

    const root =
      activeTab.rootSplit ||
      createInitialSplit(`pane-${activeTab.id}-1`, activeTab.channelId, activeTab.terminalId)
    const activePaneId = activeTab.activePaneId || `pane-${activeTab.id}-1`
    const nextPaneId = navigatePane(root, activePaneId, direction)

    state.setActivePane(activeTab.id, nextPaneId)
  },

  toggleMultiExec: (tabId) => {
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === tabId ? { ...t, isMultiExec: !t.isMultiExec } : t))
    }))
  },

  setSplitSizes: (tabId, branchId, sizes) => {
    set((s) => ({
      tabs: s.tabs.map((t) => {
        if (t.id !== tabId || !t.rootSplit) return t
        return {
          ...t,
          rootSplit: updateBranchSizes(t.rootSplit, branchId, sizes)
        }
      })
    }))
  },

  openEditorTab: async (sessionId, remotePath) => {
    const state = get()
    const existing = state.tabs.find(
      (t) =>
        t.type === 'editor' &&
        t.editorState?.sessionId === sessionId &&
        t.editorState?.remotePath === remotePath
    )
    if (existing) {
      set({ activeTabId: existing.id })
      return existing.id
    }

    if (typeof window === 'undefined' || !window.api?.editorOpenFile) {
      return undefined
    }

    try {
      const res = await window.api.editorOpenFile({ sessionId, remotePath })
      const fileName = remotePath.split('/').filter(Boolean).pop() || 'file'
      const sessionTab = state.tabs.find((t) => t.sessionId === sessionId)
      const hostLabel = sessionTab?.host || 'SSH'

      const newTabId = `editor-${sessionId}-${Date.now().toString(36)}`
      const parentDir = remotePath.includes('/')
        ? remotePath.substring(0, remotePath.lastIndexOf('/')) || '/'
        : '/'

      const newTab: TabData = {
        id: newTabId,
        title: fileName,
        host: hostLabel,
        type: 'editor',
        status: 'connected',
        uptime: '0м',
        sessionId,
        currentPath: parentDir,
        selectedFileName: null,
        osc7Follow: false,
        transfers: [],
        editorState: {
          sessionId,
          remotePath,
          originalContent: res.content,
          content: res.content,
          isDirty: false,
          encoding: res.encoding,
          lineEndings: res.lineEndings,
          mtime: res.mtime,
          size: res.size,
          mode: res.mode
        }
      }

      set((s) => ({
        tabs: [...s.tabs, newTab],
        activeTabId: newTab.id
      }))

      return newTabId
    } catch (err) {
      const msg = (err as Error).message || ''
      if (
        (msg.includes('двоичные') ||
          msg.includes('слишком велик') ||
          msg.includes('binary') ||
          msg.includes('лимит')) &&
        typeof window !== 'undefined' &&
        window.api?.editorOpenExternal
      ) {
        try {
          await window.api.editorOpenExternal({ sessionId, remotePath })
          return undefined
        } catch (extErr) {
          alert(`Не удалось открыть файл: ${(extErr as Error).message}`)
          return undefined
        }
      }
      alert(`Не удалось открыть файл: ${msg}`)
      return undefined
    }
  },

  updateEditorContent: (tabId, content) => {
    set((s) => ({
      tabs: s.tabs.map((t) => {
        if (t.id !== tabId || !t.editorState) return t
        const isDirty = content !== t.editorState.originalContent
        return {
          ...t,
          editorState: {
            ...t.editorState,
            content,
            isDirty
          }
        }
      })
    }))
  },

  updateEditorEncoding: (tabId, encoding) => {
    set((s) => ({
      tabs: s.tabs.map((t) => {
        if (t.id !== tabId || !t.editorState) return t
        return {
          ...t,
          editorState: {
            ...t.editorState,
            encoding
          }
        }
      })
    }))
  },

  updateEditorLineEndings: (tabId, lineEndings) => {
    set((s) => ({
      tabs: s.tabs.map((t) => {
        if (t.id !== tabId || !t.editorState) return t
        return {
          ...t,
          editorState: {
            ...t.editorState,
            lineEndings
          }
        }
      })
    }))
  },

  markEditorSaved: (tabId, newMtime, newSize, newPath) => {
    set((s) => ({
      tabs: s.tabs.map((t) => {
        if (t.id !== tabId || !t.editorState) return t
        const fileName = newPath ? newPath.split('/').filter(Boolean).pop() || t.title : t.title
        return {
          ...t,
          title: fileName,
          currentPath: newPath || t.currentPath,
          editorState: {
            ...t.editorState,
            remotePath: newPath || t.editorState.remotePath,
            originalContent: t.editorState.content,
            isDirty: false,
            mtime: newMtime,
            size: newSize
          }
        }
      })
    }))
  }
}))
