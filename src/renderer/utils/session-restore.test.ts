import { describe, it, expect, beforeEach } from 'vitest'
import { saveTabsSnapshot, loadTabsSnapshot, clearTabsSnapshot } from './session-restore'
import type { TabData } from '../stores/tabs-store'

describe('session-restore utils', () => {
  beforeEach(() => {
    clearTabsSnapshot()
  })

  it('saves and restores snapshot of valid terminal tabs', () => {
    const tabs: TabData[] = [
      {
        id: 'tab-1',
        title: 'Local',
        host: 'local',
        type: 'local',
        status: 'connected',
        uptime: '0м',
        terminalId: 'term-1',
        currentPath: '/',
        selectedFileName: null,
        osc7Follow: false,
        transfers: []
      },
      {
        id: 'tab-2',
        title: 'prod-server',
        host: '10.0.0.1',
        type: 'ssh',
        status: 'connected',
        uptime: '0м',
        sessionId: 'sess-1',
        channelId: 'chan-1',
        currentPath: '/home/user',
        selectedFileName: null,
        osc7Follow: true,
        transfers: [],
        sessionItem: {
          id: 'sess-1',
          name: 'prod-server',
          host: '10.0.0.1',
          username: 'root',
          type: 'ssh',
          auth: 'password'
        }
      }
    ]

    saveTabsSnapshot(tabs)
    const loaded = loadTabsSnapshot()

    expect(loaded).toHaveLength(2)
    expect(loaded[0].title).toBe('Local')
    expect(loaded[0].type).toBe('local')
    expect(loaded[1].title).toBe('prod-server')
    expect(loaded[1].type).toBe('ssh')
    expect(loaded[1].sessionItem?.host).toBe('10.0.0.1')
  })

  it('clears snapshot correctly', () => {
    saveTabsSnapshot([
      {
        id: 'tab-1',
        title: 'Local',
        host: 'local',
        type: 'local',
        status: 'connected',
        uptime: '0м',
        terminalId: 'term-1',
        currentPath: '/',
        selectedFileName: null,
        osc7Follow: false,
        transfers: []
      }
    ])

    expect(loadTabsSnapshot()).toHaveLength(1)
    clearTabsSnapshot()
    expect(loadTabsSnapshot()).toEqual([])
  })

  it('handles empty data gracefully', () => {
    expect(loadTabsSnapshot()).toEqual([])
  })
})
