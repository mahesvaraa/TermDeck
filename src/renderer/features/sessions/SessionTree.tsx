import { useState, useRef, useEffect, type KeyboardEvent, type MouseEvent } from 'react'
import { ChevronRight, ChevronDown, Server, Plus, Pencil, Trash2 } from 'lucide-react'
import type { SessionTreeFolder, SessionItem } from '@shared/types'
import { SessionRow } from './SessionRow'

interface SessionTreeProps {
  folders: SessionTreeFolder[]
  onOpenSession: (session: SessionItem) => void
  onEditSession?: (session: SessionItem) => void
  onDuplicateSession?: (session: SessionItem) => void
  onDeleteSession?: (session: SessionItem) => void
  onNewSessionInFolder?: (folderId?: string) => void
  onEditFolder?: (folder: SessionTreeFolder) => void
  onDeleteFolder?: (folderId: string, folderName: string) => void
}

export function SessionTree({
  folders,
  onOpenSession,
  onEditSession,
  onDuplicateSession,
  onDeleteSession,
  onNewSessionInFolder,
  onEditFolder,
  onDeleteFolder
}: SessionTreeProps): JSX.Element {
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({})
  const [folderMenu, setFolderMenu] = useState<{
    folder: SessionTreeFolder
    x: number
    y: number
  } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const toggleFolder = (folderId: string): void => {
    setCollapsedFolders((prev) => ({
      ...prev,
      [folderId]: !prev[folderId]
    }))
  }

  // Dismiss context menu when clicking outside
  useEffect(() => {
    if (!folderMenu) return

    const handleClickOutside = (e: globalThis.MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setFolderMenu(null)
      }
    }

    window.addEventListener('mousedown', handleClickOutside)
    return () => window.removeEventListener('mousedown', handleClickOutside)
  }, [folderMenu])

  const handleFolderContextMenu = (e: MouseEvent, folder: SessionTreeFolder): void => {
    e.preventDefault()
    e.stopPropagation()
    setFolderMenu({ folder, x: e.clientX, y: e.clientY })
  }

  if (folders.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 text-center text-mut text-xs space-y-2 select-none">
        <Server className="w-8 h-8 opacity-30 text-mut" />
        <div className="text-xs font-medium text-tx">Нет сохранённых сессий</div>
        <div className="text-[11px] text-mut leading-relaxed">
          Нажмите «Новая сессия» ниже, чтобы добавить подключение к серверу.
        </div>
      </div>
    )
  }

  return (
    <div role="tree" className="flex-1 overflow-y-auto px-1.5 py-1 text-xs">
      {folders.map((folder) => {
        const isCollapsed = Boolean(collapsedFolders[folder.id])

        return (
          <div key={folder.id} className="mb-0.5">
            <div
              role="treeitem"
              tabIndex={0}
              aria-expanded={!isCollapsed}
              onClick={() => toggleFolder(folder.id)}
              onContextMenu={(e) => handleFolderContextMenu(e, folder)}
              onKeyDown={(e: KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  toggleFolder(folder.id)
                }
              }}
              className="flex items-center gap-1.5 py-1 px-2 rounded-[5px] cursor-pointer text-tx hover:bg-panel2 focus-visible:outline-2 focus-visible:outline-acc focus-visible:outline-offset-1 select-none font-medium text-xs transition-colors group"
            >
              {isCollapsed ? (
                <ChevronRight className="w-3.5 h-3.5 text-mut flex-none" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-mut flex-none" />
              )}
              <span className="truncate">{folder.name}</span>
              <span className="text-[10px] text-mut ml-auto font-normal">
                {folder.items.length}
              </span>
            </div>

            {!isCollapsed && (
              <div role="group" className="mt-0.5">
                {folder.items.map((session) => (
                  <SessionRow
                    key={`${folder.id}-${session.id}`}
                    session={session}
                    isSub={true}
                    onOpen={onOpenSession}
                    onEdit={onEditSession}
                    onDuplicate={onDuplicateSession}
                    onDelete={onDeleteSession}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}

      {/* Folder Context Menu */}
      {folderMenu && (
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            left: `${Math.min(window.innerWidth - 180, folderMenu.x)}px`,
            ...(window.innerHeight - folderMenu.y < 160
              ? { bottom: `${window.innerHeight - folderMenu.y}px` }
              : { top: `${folderMenu.y}px` })
          }}
          className="z-50 min-w-[170px] bg-panel border border-line rounded-lg shadow-xl py-1 text-xs text-tx font-sans select-none"
        >
          {onNewSessionInFolder && (
            <button
              type="button"
              onClick={() => {
                onNewSessionInFolder(folderMenu.folder.id === 'f-root' ? undefined : folderMenu.folder.id)
                setFolderMenu(null)
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-panel2 text-left"
            >
              <Plus className="w-3.5 h-3.5 text-acc" />
              <span>Новая сессия здесь…</span>
            </button>
          )}

          {folderMenu.folder.id !== 'f-root' && onEditFolder && (
            <button
              type="button"
              onClick={() => {
                onEditFolder(folderMenu.folder)
                setFolderMenu(null)
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-panel2 text-left"
            >
              <Pencil className="w-3.5 h-3.5 text-mut" />
              <span>Переименовать папку</span>
            </button>
          )}

          {folderMenu.folder.id !== 'f-root' && onDeleteFolder && (
            <button
              type="button"
              onClick={() => {
                onDeleteFolder(folderMenu.folder.id, folderMenu.folder.name)
                setFolderMenu(null)
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-panel2 text-err text-left border-t border-line mt-1 pt-1"
            >
              <Trash2 className="w-3.5 h-3.5 text-err" />
              <span>Удалить папку</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
