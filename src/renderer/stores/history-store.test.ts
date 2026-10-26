import { describe, it, expect, beforeEach } from 'vitest'
import { useCommandHistoryStore } from './history-store'

describe('history-store', () => {
  beforeEach(() => {
    useCommandHistoryStore.setState({
      items: [],
      maxItems: 50
    })
  })

  it('adds command to history and ignores short or blank commands', () => {
    const store = useCommandHistoryStore.getState()
    store.addCommand('ls -la', 'host1', 's1')
    expect(useCommandHistoryStore.getState().items.length).toBe(1)
    expect(useCommandHistoryStore.getState().items[0].command).toBe('ls -la')

    // Ignores 1-char or blank
    store.addCommand(' ', 'host1', 's1')
    store.addCommand('a', 'host1', 's1')
    expect(useCommandHistoryStore.getState().items.length).toBe(1)
  })

  it('deduplicates consecutive identical commands', () => {
    const store = useCommandHistoryStore.getState()
    store.addCommand('top', 'host1')
    store.addCommand('top', 'host1')
    expect(useCommandHistoryStore.getState().items.length).toBe(1)
  })

  it('toggles favorite status and removes item', () => {
    const store = useCommandHistoryStore.getState()
    store.addCommand('docker ps', 'host1')
    const item = useCommandHistoryStore.getState().items[0]
    expect(item.isFavorite).toBe(false)

    store.toggleFavorite(item.id)
    expect(useCommandHistoryStore.getState().items[0].isFavorite).toBe(true)

    store.removeCommand(item.id)
    expect(useCommandHistoryStore.getState().items.length).toBe(0)
  })

  it('clears history while preserving favorites', () => {
    const store = useCommandHistoryStore.getState()
    store.addCommand('cat /etc/hosts', 'host1')
    store.addCommand('systemctl restart nginx', 'host1')
    const items = useCommandHistoryStore.getState().items
    store.toggleFavorite(items[0].id) // favorite nginx

    store.clearHistory()
    const remaining = useCommandHistoryStore.getState().items
    expect(remaining.length).toBe(1)
    expect(remaining[0].command).toBe('systemctl restart nginx')
  })
})
