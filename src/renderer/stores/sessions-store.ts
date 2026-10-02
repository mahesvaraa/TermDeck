import { create } from 'zustand'
import type { SessionConfig, SessionFolder } from '@shared/types'

interface SessionsState {
  sessions: SessionConfig[]
  folders: SessionFolder[]
  isLoading: boolean
  error: string | null
  loadSessions: () => Promise<void>
  saveSession: (session: SessionConfig, secret?: string) => Promise<void>
  deleteSession: (id: string) => Promise<void>
  saveFolder: (folder: SessionFolder) => Promise<void>
  deleteFolder: (id: string) => Promise<void>
}

export const useSessionsStore = create<SessionsState>((set, get) => ({
  sessions: [],
  folders: [],
  isLoading: false,
  error: null,

  loadSessions: async () => {
    if (typeof window === 'undefined' || !window.api) {
      return
    }

    set({ isLoading: true, error: null })
    try {
      const data = await window.api.listSessions()
      set({
        sessions: data.sessions,
        folders: data.folders,
        isLoading: false
      })
    } catch (err) {
      console.error('Failed to load sessions:', err)
      set({ error: (err as Error).message, isLoading: false })
    }
  },

  saveSession: async (session, secret) => {
    if (typeof window !== 'undefined' && window.api) {
      try {
        const saved = await window.api.saveSession({ session, secret })
        const current = get().sessions
        const index = current.findIndex((s) => s.id === saved.id)
        const updated = [...current]
        if (index >= 0) {
          updated[index] = saved
        } else {
          updated.push(saved)
        }
        set({ sessions: updated })
      } catch (err) {
        console.error('Failed to save session:', err)
        throw err
      }
    } else {
      // Local fallback
      const current = get().sessions
      const index = current.findIndex((s) => s.id === session.id)
      const updated = [...current]
      if (index >= 0) {
        updated[index] = session
      } else {
        updated.push(session)
      }
      set({ sessions: updated })
    }
  },

  deleteSession: async (id) => {
    if (typeof window !== 'undefined' && window.api) {
      try {
        await window.api.deleteSession(id)
      } catch (err) {
        console.error('Failed to delete session:', err)
        throw err
      }
    }
    set((state) => ({
      sessions: state.sessions.filter((s) => s.id !== id)
    }))
  },

  saveFolder: async (folder) => {
    if (typeof window !== 'undefined' && window.api) {
      try {
        const saved = await window.api.saveFolder({ folder })
        const current = get().folders
        const index = current.findIndex((f) => f.id === saved.id)
        const updated = [...current]
        if (index >= 0) {
          updated[index] = saved
        } else {
          updated.push(saved)
        }
        set({ folders: updated })
      } catch (err) {
        console.error('Failed to save folder:', err)
        throw err
      }
    } else {
      const current = get().folders
      const index = current.findIndex((f) => f.id === folder.id)
      const updated = [...current]
      if (index >= 0) {
        updated[index] = folder
      } else {
        updated.push(folder)
      }
      set({ folders: updated })
    }
  },

  deleteFolder: async (id) => {
    if (typeof window !== 'undefined' && window.api) {
      try {
        await window.api.deleteFolder(id)
      } catch (err) {
        console.error('Failed to delete folder:', err)
        throw err
      }
    }
    set((state) => ({
      folders: state.folders.filter((f) => f.id !== id),
      sessions: state.sessions.map((s) => (s.folderId === id ? { ...s, folderId: undefined } : s))
    }))
  }
}))

// Initial load
if (typeof window !== 'undefined' && window.api) {
  useSessionsStore.getState().loadSessions()
}
