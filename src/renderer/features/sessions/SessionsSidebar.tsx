import { useState, type ChangeEvent } from 'react'
import { Search, KeyRound, Plus, Sliders, FolderPlus, PanelLeftClose, Network } from 'lucide-react'
import { ru } from '../../i18n/ru'
import { useSessions } from './useSessions'
import { SessionTree } from './SessionTree'
import { SessionModal } from './SessionModal'
import { SessionFolderModal } from './SessionFolderModal'
import { useTabsStore } from '../../stores/tabs-store'
import { useSessionsStore } from '../../stores/sessions-store'
import { useSettingsStore } from '../../stores/settings-store'
import type { SessionItem, SessionConfig, SessionTreeFolder, SessionFolder } from '@shared/types'

interface SessionsSidebarProps {
  onKeysClick?: () => void
  onSettingsClick?: () => void
  onTunnelsClick?: () => void
  activeTunnelCount?: number
}

export function SessionsSidebar({
  onKeysClick,
  onSettingsClick,
  onTunnelsClick,
  activeTunnelCount
}: SessionsSidebarProps): JSX.Element {
  const { folders, searchQuery, setSearchQuery } = useSessions()
  const rawSessions = useSessionsStore((s) => s.sessions)
  const rawFolders = useSessionsStore((s) => s.folders)
  const saveSession = useSessionsStore((s) => s.saveSession)
  const deleteSession = useSessionsStore((s) => s.deleteSession)
  const saveFolder = useSessionsStore((s) => s.saveFolder)
  const deleteFolder = useSessionsStore((s) => s.deleteFolder)
  const openTab = useTabsStore((s) => s.openTab)
  const toggleSidebar = useSettingsStore((s) => s.toggleSidebar)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSession, setEditingSession] = useState<SessionConfig | null>(null)
  const [targetFolderIdForNewSession, setTargetFolderIdForNewSession] = useState<string | undefined>()

  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false)
  const [editingFolder, setEditingFolder] = useState<SessionFolder | null>(null)

  const handleOpenSession = (session: SessionItem): void => {
    openTab(session)
  }

  const handleEditSession = (session: SessionItem): void => {
    const found = rawSessions.find((s) => s.id === session.id)
    if (found) {
      setEditingSession(found)
    } else {
      // Reconstruct config from item
      setEditingSession({
        id: session.id,
        name: session.name,
        host: session.host,
        port: session.port || 22,
        username: session.username || 'root',
        auth: (session.auth as 'password' | 'key' | 'agent') || 'password',
        keyPath: session.keyPath || '~/.ssh/id_ed25519',
        folderId: session.folderId,
        keepaliveSec: 30,
        encoding: 'utf-8'
      })
    }
    setIsModalOpen(true)
  }

  const handleDuplicateSession = async (session: SessionItem): Promise<void> => {
    const found = rawSessions.find((s) => s.id === session.id)
    const base: SessionConfig = found || {
      id: session.id,
      name: session.name,
      host: session.host,
      port: session.port || 22,
      username: session.username || 'root',
      auth: (session.auth as 'password' | 'key' | 'agent') || 'password',
      keyPath: session.keyPath,
      folderId: session.folderId,
      keepaliveSec: 30,
      encoding: 'utf-8'
    }

    const duplicated: SessionConfig = {
      ...base,
      id: `s-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: `${base.name} (копия)`
    }

    await saveSession(duplicated)
  }

  const handleDeleteSession = async (session: SessionItem): Promise<void> => {
    const confirmed = window.confirm(`Удалить сессию «${session.name}»?`)
    if (confirmed) {
      await deleteSession(session.id)
    }
  }

  const handleNewSession = (folderId?: string): void => {
    setEditingSession(null)
    setTargetFolderIdForNewSession(folderId)
    setIsModalOpen(true)
  }

  const handleEditFolder = (folder: SessionTreeFolder): void => {
    const raw = rawFolders.find((f) => f.id === folder.id)
    setEditingFolder(raw || { id: folder.id, name: folder.name })
    setIsFolderModalOpen(true)
  }

  const handleDeleteFolder = async (folderId: string, folderName: string): Promise<void> => {
    const confirmed = window.confirm(
      `Удалить папку «${folderName}»?\nСессии в этой папке не будут удалены, а переместятся в «Без папки».`
    )
    if (confirmed) {
      await deleteFolder(folderId)
    }
  }

  const handleSaveFolder = async (name: string, folderId?: string): Promise<void> => {
    const id = folderId || `f-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`
    await saveFolder({ id, name })
  }

  return (
    <>
      <aside className="w-full h-full bg-panel border-r border-line flex flex-col flex-none select-none">
        <div className="flex items-center justify-between pt-2.5 px-3 pb-1.5">
          <h3 className="m-0 text-xs font-semibold text-mut">
            {ru.sidebar.sessionsTitle}
          </h3>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setEditingFolder(null)
                setIsFolderModalOpen(true)
              }}
              title="Создать новую папку сессий"
              className="p-1 rounded text-mut hover:text-tx hover:bg-panel2 focus-visible:outline-2 focus-visible:outline-acc transition-colors"
            >
              <FolderPlus className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={toggleSidebar}
              title="Свернуть панель сессий (Ctrl+B)"
              className="p-1 rounded text-mut hover:text-tx hover:bg-panel2 focus-visible:outline-2 focus-visible:outline-acc transition-colors"
            >
              <PanelLeftClose className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="mx-2.5 mt-1 mb-1.5 flex items-center gap-1.5 rounded-md border border-line bg-bg px-2 py-1 text-xs text-mut focus-within:border-acc">
          <Search className="w-3.5 h-3.5 flex-none text-mut opacity-70" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            placeholder={ru.sidebar.searchPlaceholder}
            className="w-full bg-transparent text-tx placeholder:text-mut focus:outline-none text-xs"
            aria-label={ru.sidebar.searchPlaceholder}
          />
        </div>

        <SessionTree
          folders={folders}
          onOpenSession={handleOpenSession}
          onEditSession={handleEditSession}
          onDuplicateSession={handleDuplicateSession}
          onDeleteSession={handleDeleteSession}
          onNewSessionInFolder={handleNewSession}
          onEditFolder={handleEditFolder}
          onDeleteFolder={handleDeleteFolder}
        />

        <div className="flex items-center gap-1.5 p-2 border-t border-line">
          <button
            type="button"
            onClick={() => handleNewSession()}
            title={ru.sidebar.newSession}
            className="flex-1 min-w-0 flex items-center justify-center gap-1 py-1 px-1.5 border border-acc rounded-md bg-acc text-bg font-semibold text-xs hover:opacity-90 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-acc transition-opacity"
          >
            <Plus className="w-3.5 h-3.5 flex-none" />
            <span className="truncate">{ru.sidebar.newSession}</span>
          </button>
          <button
            type="button"
            onClick={onKeysClick}
            title="Менеджер SSH-ключей"
            className="flex-none flex items-center justify-center gap-1 py-1 px-2 border border-line rounded-md bg-panel2 text-tx text-xs hover:border-acc whitespace-nowrap focus-visible:outline-2 focus-visible:outline-acc transition-colors"
          >
            <KeyRound className="w-3 h-3 text-mut flex-none" />
            <span>{ru.sidebar.keys}</span>
          </button>
          {onTunnelsClick && (
            <button
              type="button"
              onClick={onTunnelsClick}
              title="Управление SSH-туннелями (-L, -R, -D)"
              className={`flex-none flex items-center justify-center gap-1 py-1 px-2 border rounded-md text-xs whitespace-nowrap focus-visible:outline-2 focus-visible:outline-acc transition-colors ${
                (activeTunnelCount ?? 0) > 0
                  ? 'border-acc/40 bg-acc/10 text-acc font-medium'
                  : 'border-line bg-panel2 text-tx hover:border-acc'
              }`}
            >
              <Network
                className={`w-3 h-3 flex-none ${(activeTunnelCount ?? 0) > 0 ? 'text-acc' : 'text-mut'}`}
              />
              <span>Туннели{(activeTunnelCount ?? 0) > 0 ? ` (${activeTunnelCount})` : ''}</span>
            </button>
          )}
          <button
            type="button"
            onClick={onSettingsClick}
            title="Настройки TermDeck"
            className="flex-none flex items-center justify-center p-1.5 border border-line rounded-md bg-panel2 text-tx text-xs hover:border-acc focus-visible:outline-2 focus-visible:outline-acc transition-colors"
          >
            <Sliders className="w-3.5 h-3.5 text-mut flex-none" />
          </button>
        </div>
      </aside>

      {isModalOpen && (
        <SessionModal
          session={
            editingSession ||
            (targetFolderIdForNewSession
              ? ({ folderId: targetFolderIdForNewSession } as unknown as SessionConfig)
              : undefined)
          }
          onClose={() => {
            setIsModalOpen(false)
            setEditingSession(null)
            setTargetFolderIdForNewSession(undefined)
          }}
          onSaved={(savedSession) => {
            if (!editingSession) {
              // Open newly created session
              openTab({
                id: savedSession.id,
                name: savedSession.name,
                host: savedSession.host,
                username: savedSession.username,
                port: savedSession.port,
                type: 'ssh',
                online: true,
                auth: savedSession.auth,
                keyPath: savedSession.keyPath
              })
            }
          }}
        />
      )}

      {isFolderModalOpen && (
        <SessionFolderModal
          folder={editingFolder}
          onSave={handleSaveFolder}
          onClose={() => {
            setIsFolderModalOpen(false)
            setEditingFolder(null)
          }}
        />
      )}
    </>
  )
}
