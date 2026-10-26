import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface CommandHistoryItem {
  id: string
  command: string
  timestamp: number
  host?: string
  sessionId?: string
  isFavorite?: boolean
}

interface CommandHistoryState {
  items: CommandHistoryItem[]
  maxItems: number
  addCommand: (command: string, host?: string, sessionId?: string) => void
  removeCommand: (id: string) => void
  toggleFavorite: (id: string) => void
  clearHistory: () => void
}

export const useCommandHistoryStore = create<CommandHistoryState>()(
  persist(
    (set) => ({
      items: [
        {
          id: 'cmd-init-1',
          command: 'tail -f /var/log/syslog',
          timestamp: Date.now() - 3600000,
          host: 'server',
          isFavorite: true
        },
        {
          id: 'cmd-init-2',
          command: 'docker ps --format "table {{.ID}}\\t{{.Names}}\\t{{.Status}}"',
          timestamp: Date.now() - 7200000,
          host: 'server',
          isFavorite: true
        },
        {
          id: 'cmd-init-3',
          command: 'systemctl status nginx',
          timestamp: Date.now() - 10800000,
          host: 'server'
        },
        {
          id: 'cmd-init-4',
          command: 'df -h && free -m',
          timestamp: Date.now() - 14400000,
          host: 'server'
        }
      ],
      maxItems: 500,

      addCommand: (command, host, sessionId) => {
        const trimmed = command.trim()
        if (!trimmed || trimmed.length < 2) return

        set((state) => {
          // Filter out identical command if it was the very last one
          const filtered = state.items.filter((item, idx) => {
            if (idx === 0 && item.command === trimmed) return false
            return true
          })

          const newItem: CommandHistoryItem = {
            id: `cmd-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            command: trimmed,
            timestamp: Date.now(),
            host,
            sessionId,
            isFavorite: false
          }

          return {
            items: [newItem, ...filtered].slice(0, state.maxItems)
          }
        })
      },

      removeCommand: (id) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== id)
        })),

      toggleFavorite: (id) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
          )
        })),

      clearHistory: () =>
        set((state) => ({
          items: state.items.filter((item) => item.isFavorite) // keep favorites
        }))
    }),
    {
      name: 'termdeck-command-history-storage',
      storage: createJSONStorage(() => {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage
        }
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {}
        }
      })
    }
  )
)
