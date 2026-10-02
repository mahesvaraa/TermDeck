import type { SessionItem } from '../mocks/types'
import type { TabData } from '../stores/tabs-store'

export interface RestorableTab {
  type: 'local' | 'ssh'
  title: string
  sessionItem?: SessionItem
}

const STORAGE_KEY = 'termdeck_session_restore_tabs'

let memoryStorage: Record<string, string> = {}

function getStorage(): {
  getItem: (key: string) => string | null
  setItem: (key: string, val: string) => void
  removeItem: (key: string) => void
} {
  if (typeof localStorage !== 'undefined') {
    return localStorage
  }
  return {
    getItem: (k) => memoryStorage[k] ?? null,
    setItem: (k, v) => {
      memoryStorage[k] = v
    },
    removeItem: (k) => {
      delete memoryStorage[k]
    }
  }
}

export function saveTabsSnapshot(tabs: TabData[]): void {
  try {
    const list: RestorableTab[] = tabs
      .filter((t) => t.type === 'local' || t.type === 'ssh')
      .map((t) => ({
        type: t.type as 'local' | 'ssh',
        title: t.title,
        sessionItem: t.sessionItem
      }))

    if (list.length > 0) {
      getStorage().setItem(STORAGE_KEY, JSON.stringify(list))
    }
  } catch {
    // Ignore quota errors
  }
}

export function loadTabsSnapshot(): RestorableTab[] {
  try {
    const data = getStorage().getItem(STORAGE_KEY)
    if (!data) return []
    const parsed = JSON.parse(data)
    if (Array.isArray(parsed)) return parsed
    return []
  } catch {
    return []
  }
}

export function clearTabsSnapshot(): void {
  try {
    getStorage().removeItem(STORAGE_KEY)
    memoryStorage = {}
  } catch {
    // Ignore
  }
}
