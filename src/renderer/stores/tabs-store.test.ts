import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useTabsStore } from './tabs-store'
import type { SessionItem } from '@shared/types'

describe('useTabsStore', () => {
  beforeEach(() => {
    useTabsStore.setState({
      tabs: [
        {
          id: 'tab-1',
          title: 'Tab 1',
          host: 'localhost',
          type: 'local',
          status: 'connected',
          uptime: '—',
          currentPath: '~',
          selectedFileName: null,
          osc7Follow: false,
          transfers: []
        },
        {
          id: 'tab-2',
          title: 'Tab 2',
          host: '10.0.0.1',
          type: 'ssh',
          status: 'connected',
          uptime: '—',
          currentPath: '/var/www',
          selectedFileName: null,
          osc7Follow: false,
          transfers: []
        },
        {
          id: 'tab-3',
          title: 'Tab 3',
          host: '10.0.0.2',
          type: 'ssh',
          status: 'connected',
          uptime: '—',
          currentPath: '/home',
          selectedFileName: null,
          osc7Follow: false,
          transfers: []
        }
      ],
      activeTabId: 'tab-1'
    })

    // Reset window.api mock
    vi.stubGlobal('window', {
      api: {
        createTerminal: vi.fn().mockResolvedValue({ terminalId: 'mock-term-id' }),
        closeTerminal: vi.fn().mockResolvedValue(undefined)
      }
    })
  })

  it('initializes with default tabs and active tab', () => {
    const state = useTabsStore.getState()
    expect(state.tabs.length).toBeGreaterThan(0)
    expect(state.activeTabId).toBe(state.tabs[0].id)
  })

  it('opens a new local tab with generated terminalId', async () => {
    const store = useTabsStore.getState()
    const initialCount = store.tabs.length

    const newTabId = await store.openLocalTab()
    const updated = useTabsStore.getState()

    expect(updated.tabs.length).toBe(initialCount + 1)
    expect(updated.activeTabId).toBe(newTabId)
    const createdTab = updated.tabs.find((t) => t.id === newTabId)
    expect(createdTab).toBeDefined()
    expect(createdTab?.type).toBe('local')
    expect(createdTab?.terminalId).toBe('mock-term-id')
  })

  it('opens session tab or switches to existing tab', () => {
    const session: SessionItem = {
      id: 'custom-session-123',
      name: 'Custom Server',
      host: '192.168.1.100',
      type: 'ssh',
      defaultPath: '/opt'
    }

    useTabsStore.getState().openTab(session)
    let state = useTabsStore.getState()
    expect(state.activeTabId).toBe('custom-session-123')
    expect(state.tabs.some((t) => t.id === 'custom-session-123')).toBe(true)

    // Opening again should switch to it without duplicating
    const count = state.tabs.length
    useTabsStore.getState().openTab(session)
    state = useTabsStore.getState()
    expect(state.tabs.length).toBe(count)
    expect(state.activeTabId).toBe('custom-session-123')
  })

  it('renames a tab', () => {
    const tabId = useTabsStore.getState().tabs[0].id
    useTabsStore.getState().renameTab(tabId, 'Renamed Tab')

    const updated = useTabsStore.getState().tabs.find((t) => t.id === tabId)
    expect(updated?.title).toBe('Renamed Tab')
  })

  it('duplicates a tab with copy suffix', async () => {
    const firstTab = useTabsStore.getState().tabs[0]
    await useTabsStore.getState().duplicateTab(firstTab.id)

    const state = useTabsStore.getState()
    const duplicated = state.tabs.find((t) => t.id === state.activeTabId)
    expect(duplicated).toBeDefined()
    expect(duplicated?.title).toContain('копия')
  })

  it('reorders tabs properly', () => {
    const store = useTabsStore.getState()
    const firstId = store.tabs[0].id
    const secondId = store.tabs[1].id

    store.reorderTabs(0, 1)
    const updated = useTabsStore.getState()
    expect(updated.tabs[0].id).toBe(secondId)
    expect(updated.tabs[1].id).toBe(firstId)
  })

  it('closes a tab and activates the adjacent one', () => {
    const store = useTabsStore.getState()
    const targetId = store.tabs[1].id
    store.setActiveTabId(targetId)

    store.closeTab(targetId)
    const updated = useTabsStore.getState()
    expect(updated.tabs.some((t) => t.id === targetId)).toBe(false)
    expect(updated.activeTabId).toBe(updated.tabs[0].id)
  })

  it('closes all other tabs', () => {
    const store = useTabsStore.getState()
    const keepId = store.tabs[0].id

    store.closeOtherTabs(keepId)
    const updated = useTabsStore.getState()
    expect(updated.tabs.length).toBe(1)
    expect(updated.tabs[0].id).toBe(keepId)
    expect(updated.activeTabId).toBe(keepId)
  })

  it('navigates next and prev tabs cyclically', () => {
    // Ensure at least 3 tabs
    const store = useTabsStore.getState()
    store.setActiveTabId(store.tabs[0].id)

    store.nextTab()
    expect(useTabsStore.getState().activeTabId).toBe(store.tabs[1].id)

    store.prevTab()
    expect(useTabsStore.getState().activeTabId).toBe(store.tabs[0].id)

    // Prev from 0 wraps to end
    store.prevTab()
    const lastTabId = store.tabs[store.tabs.length - 1].id
    expect(useTabsStore.getState().activeTabId).toBe(lastTabId)
  })

  it('splits active pane horizontally and vertically', async () => {
    const store = useTabsStore.getState()
    const firstTab = store.tabs[0]
    store.setActiveTabId(firstTab.id)

    // Split horizontally
    const pane2Id = await store.splitActivePane('horizontal')
    expect(pane2Id).toBeDefined()

    let tab = useTabsStore.getState().getActiveTab()
    expect(tab?.rootSplit?.type).toBe('split')
    expect(tab?.activePaneId).toBe(pane2Id)

    // Split vertically
    const pane3Id = await store.splitActivePane('vertical')
    expect(pane3Id).toBeDefined()

    tab = useTabsStore.getState().getActiveTab()
    expect(tab?.activePaneId).toBe(pane3Id)
  })

  it('navigates focus between split panes and closes a pane', async () => {
    const store = useTabsStore.getState()
    const firstTab = store.tabs[0]
    store.setActiveTabId(firstTab.id)

    const pane2Id = await store.splitActivePane('horizontal')
    expect(pane2Id).toBeDefined()

    // Move focus
    store.focusAdjacentPane('left')
    let tab = useTabsStore.getState().getActiveTab()
    expect(tab?.activePaneId).not.toBe(pane2Id)

    // Close pane 2
    if (pane2Id) {
      await store.closePane(firstTab.id, pane2Id)
    }

    tab = useTabsStore.getState().getActiveTab()
    expect(tab?.rootSplit?.type).toBe('leaf')
  })

  it('toggles multi-exec mode on active tab', () => {
    const store = useTabsStore.getState()
    const firstTab = store.tabs[0]

    expect(firstTab.isMultiExec).toBeFalsy()
    store.toggleMultiExec(firstTab.id)

    let updated = useTabsStore.getState().getActiveTab()
    expect(updated?.isMultiExec).toBe(true)

    store.toggleMultiExec(firstTab.id)
    updated = useTabsStore.getState().getActiveTab()
    expect(updated?.isMultiExec).toBe(false)
  })

  it('opens editor tab, manages content and dirty flag, handles close confirmation', async () => {
    vi.stubGlobal('window', {
      api: {
        editorOpenFile: vi.fn().mockResolvedValue({
          content: 'console.log("hello")',
          encoding: 'UTF-8',
          lineEndings: 'LF',
          mtime: 1700000000000,
          size: 22,
          mode: 0o644
        }),
        closeTerminal: vi.fn().mockResolvedValue(undefined)
      }
    })

    const store = useTabsStore.getState()
    const tabId = await store.openEditorTab('sess-1', '/var/www/test.js')
    expect(tabId).toBeDefined()

    let tab = useTabsStore.getState().tabs.find((t) => t.id === tabId)
    expect(tab?.type).toBe('editor')
    expect(tab?.title).toBe('test.js')
    expect(tab?.editorState?.isDirty).toBe(false)

    // Updating content marks it dirty
    store.updateEditorContent(tabId!, 'console.log("modified")')
    tab = useTabsStore.getState().tabs.find((t) => t.id === tabId)
    expect(tab?.editorState?.isDirty).toBe(true)

    // Requesting close for dirty tab sets pendingCloseTabId
    store.requestCloseTab(tabId!)
    expect(useTabsStore.getState().pendingCloseTabId).toBe(tabId)

    // Marking saved resets dirty flag
    store.markEditorSaved(tabId!, 1700000050000, 25)
    tab = useTabsStore.getState().tabs.find((t) => t.id === tabId)
    expect(tab?.editorState?.isDirty).toBe(false)
    expect(tab?.editorState?.mtime).toBe(1700000050000)

    // Requesting close for clean tab closes it directly
    store.setPendingCloseTabId(null)
    store.requestCloseTab(tabId!)
    expect(useTabsStore.getState().tabs.some((t) => t.id === tabId)).toBe(false)
  })
})
