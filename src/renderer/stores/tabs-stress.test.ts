import { describe, it, expect, beforeEach } from 'vitest'
import { useTabsStore } from './tabs-store'
import type { SessionItem } from '@shared/types'

describe('Tabs 20-tab stress and lifecycle cleanup', () => {
  beforeEach(() => {
    // Reset tabs store to initial state
    useTabsStore.setState({
      tabs: [],
      activeTabId: '',
      pendingCloseTabId: null
    })
  })

  it('handles creation and management of 20 concurrent tabs', async () => {
    const store = useTabsStore.getState()

    // 1. Open 20 tabs
    for (let i = 1; i <= 20; i++) {
      const isSsh = i % 2 === 0
      const session: SessionItem = {
        id: `stress-session-${i}`,
        name: `Session ${i}`,
        host: `192.168.1.${i}`,
        type: isSsh ? 'ssh' : 'local'
      }

      await store.openTab(session)
    }

    const currentTabs = useTabsStore.getState().tabs
    expect(currentTabs).toHaveLength(20)

    // 2. Active tab should be the latest opened
    expect(useTabsStore.getState().activeTabId).toBe('stress-session-20')

    // 3. Test splitting panes on multiple tabs
    for (let i = 0; i < 5; i++) {
      const tabId = currentTabs[i].id
      useTabsStore.getState().setActiveTabId(tabId)
      useTabsStore.getState().splitActivePane('horizontal')
      useTabsStore.getState().splitActivePane('vertical')
    }

    const splitTabs = useTabsStore.getState().tabs.slice(0, 5)
    for (const tab of splitTabs) {
      expect(tab.rootSplit).toBeDefined()
      expect(tab.rootSplit?.type).toBe('split')
    }

    // 4. Test reordering tabs under load
    useTabsStore.getState().reorderTabs(0, 19)
    expect(useTabsStore.getState().tabs[19].id).toBe('stress-session-1')

    // 5. Close 10 tabs one by one
    for (let i = 1; i <= 10; i++) {
      useTabsStore.getState().closeTab(`stress-session-${i}`)
    }

    expect(useTabsStore.getState().tabs).toHaveLength(10)

    // 6. Close others to verify single tab clean cleanup
    const remainingFirst = useTabsStore.getState().tabs[0].id
    useTabsStore.getState().closeOtherTabs(remainingFirst)

    expect(useTabsStore.getState().tabs).toHaveLength(1)
    expect(useTabsStore.getState().tabs[0].id).toBe(remainingFirst)

    // 7. Closing the last remaining tab intentionally preserves 1 active tab (by design)
    useTabsStore.getState().closeTab(remainingFirst)
    expect(useTabsStore.getState().tabs).toHaveLength(1)
  })
})
