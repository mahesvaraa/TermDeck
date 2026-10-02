import { useState, type KeyboardEvent } from 'react'
import { ChevronRight, ChevronDown, Server } from 'lucide-react'
import type { SessionFolder, SessionItem } from '../../mocks/types'
import { SessionRow } from './SessionRow'

interface SessionTreeProps {
  folders: SessionFolder[]
  onOpenSession: (session: SessionItem) => void
  onEditSession?: (session: SessionItem) => void
  onDuplicateSession?: (session: SessionItem) => void
  onDeleteSession?: (session: SessionItem) => void
}

export function SessionTree({
  folders,
  onOpenSession,
  onEditSession,
  onDuplicateSession,
  onDeleteSession
}: SessionTreeProps): JSX.Element {
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({})

  const toggleFolder = (folderId: string): void => {
    setCollapsedFolders((prev) => ({
      ...prev,
      [folderId]: !prev[folderId]
    }))
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
              onKeyDown={(e: KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  toggleFolder(folder.id)
                }
              }}
              className="flex items-center gap-1.5 py-1 px-2 rounded-[5px] cursor-pointer text-tx hover:bg-panel2 focus-visible:outline-2 focus-visible:outline-acc focus-visible:outline-offset-1 select-none font-medium text-xs transition-colors"
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
    </div>
  )
}
