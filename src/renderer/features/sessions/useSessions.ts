import { useState, useMemo } from 'react'
import { useSessionsStore } from '../../stores/sessions-store'
import type { SessionTreeFolder, SessionItem } from '@shared/types'

export interface UseSessionsResult {
  folders: SessionTreeFolder[]
  allSessions: SessionItem[]
  searchQuery: string
  setSearchQuery: (query: string) => void
}

export function useSessions(): UseSessionsResult {
  const [searchQuery, setSearchQuery] = useState('')
  const rawSessions = useSessionsStore((s) => s.sessions)
  const rawFolders = useSessionsStore((s) => s.folders)

  const allSessions: SessionItem[] = useMemo(() => {
    return rawSessions.map((s) => ({
      id: s.id,
      name: s.name,
      host: s.host,
      username: s.username,
      port: s.port,
      type: 'ssh',
      online: true,
      folderId: s.folderId,
      auth: s.auth,
      keyPath: s.keyPath,
      tags: s.tags
    }))
  }, [rawSessions])

  const folders: SessionTreeFolder[] = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    const cleanQuery = q.startsWith('#') ? q.slice(1).trim() : q
    const filtered = cleanQuery
      ? allSessions.filter(
          (s) =>
            s.name.toLowerCase().includes(cleanQuery) ||
            s.host.toLowerCase().includes(cleanQuery) ||
            (s.username && s.username.toLowerCase().includes(cleanQuery)) ||
            (s.tags && s.tags.some((t) => t.toLowerCase().includes(cleanQuery)))
        )
      : allSessions

    const result: SessionTreeFolder[] = rawFolders.map((f) => ({
      id: f.id,
      name: f.name,
      items: filtered.filter((s) => s.folderId === f.id)
    }))

    // Add unfiled sessions to a default group if any exist
    const unfiled = filtered.filter(
      (s) => !s.folderId || !rawFolders.some((f) => f.id === s.folderId)
    )
    if (unfiled.length > 0) {
      result.unshift({
        id: 'f-root',
        name: 'Без папки',
        items: unfiled
      })
    }

    return result.filter((f) => f.items.length > 0)
  }, [allSessions, rawFolders, searchQuery])

  return {
    folders,
    allSessions,
    searchQuery,
    setSearchQuery
  }
}
