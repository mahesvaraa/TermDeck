import { useState, useRef, useEffect, type KeyboardEvent, type MouseEvent } from 'react'
import { Terminal, Pencil, Copy, Trash2 } from 'lucide-react'
import type { SessionItem } from '@shared/types'

interface SessionRowProps {
  session: SessionItem
  isSub?: boolean
  onSelect?: (session: SessionItem) => void
  onOpen?: (session: SessionItem) => void
  onEdit?: (session: SessionItem) => void
  onDuplicate?: (session: SessionItem) => void
  onDelete?: (session: SessionItem) => void
}

export function SessionRow({
  session,
  isSub = false,
  onSelect,
  onOpen,
  onEdit,
  onDuplicate,
  onDelete
}: SessionRowProps): JSX.Element {
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!contextMenuPos) return

    const handleClickOutside = (e: globalThis.MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenuPos(null)
      }
    }

    window.addEventListener('mousedown', handleClickOutside)
    return () => window.removeEventListener('mousedown', handleClickOutside)
  }, [contextMenuPos])

  const handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Enter') {
      onOpen?.(session)
    }
  }

  const handleContextMenu = (e: MouseEvent): void => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenuPos({ x: e.clientX, y: e.clientY })
  }

  return (
    <>
      <div
        role="treeitem"
        tabIndex={0}
        onClick={() => onSelect?.(session)}
        onDoubleClick={() => onOpen?.(session)}
        onContextMenu={handleContextMenu}
        onKeyDown={handleKeyDown}
        className={`group flex flex-col py-1.5 px-2 rounded-[6px] cursor-pointer text-tx hover:bg-panel2 focus-visible:outline-2 focus-visible:outline-acc focus-visible:outline-offset-1 select-none text-xs transition-colors mb-0.5 ${
          isSub ? 'pl-[22px]' : ''
        }`}
      >
        {/* Line 1: Status dot + Session Name + Action buttons */}
        <div className="flex items-center justify-between gap-1 min-w-0 w-full">
          <div className="flex items-center gap-1.5 truncate flex-1 min-w-0">
            <span
              className={`w-2 h-2 rounded-full flex-none ${session.online ? 'bg-ok' : 'bg-mut'}`}
              aria-hidden="true"
            />
            <span className="font-medium truncate text-xs text-tx">{session.name}</span>
          </div>

          {/* Action buttons (visible on hover) */}
          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 flex-none transition-opacity ml-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onEdit?.(session)
              }}
              title="Редактировать сессию"
              className="p-1 rounded hover:bg-line text-mut hover:text-tx transition-colors"
            >
              <Pencil className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onDelete?.(session)
              }}
              title="Удалить сессию"
              className="p-1 rounded hover:bg-err/20 text-mut hover:text-err transition-colors"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Line 2: Host + Tags */}
        <div className="flex items-center justify-between gap-2 mt-0.5 pl-3.5 text-[11px] text-mut min-w-0 w-full">
          <span className="truncate flex-1 min-w-0">
            {session.username ? `${session.username}@${session.host}` : session.host}
            {session.port && session.port !== 22 ? `:${session.port}` : ''}
          </span>

          {session.tags && session.tags.length > 0 && (
            <div className="flex items-center gap-1 flex-none flex-wrap">
              {session.tags.slice(0, 3).map((t) => (
                <span
                  key={t}
                  className="px-1 py-0.2 rounded bg-panel border border-line text-[9px] text-mut/80 font-normal leading-tight"
                >
                  #{t}
                </span>
              ))}
              {session.tags.length > 3 && (
                <span className="text-[9px] text-mut/70 leading-tight">+{session.tags.length - 3}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Context Menu */}
      {contextMenuPos && (
        <div
          ref={menuRef}
          style={{
            top: window.innerHeight - contextMenuPos.y < 220 ? undefined : contextMenuPos.y,
            bottom:
              window.innerHeight - contextMenuPos.y < 220
                ? Math.max(8, window.innerHeight - contextMenuPos.y)
                : undefined,
            left: window.innerWidth - contextMenuPos.x < 180 ? undefined : contextMenuPos.x,
            right:
              window.innerWidth - contextMenuPos.x < 180
                ? Math.max(8, window.innerWidth - contextMenuPos.x)
                : undefined
          }}
          className="fixed z-50 min-w-[160px] bg-panel2 border border-line rounded-md shadow-xl py-1 text-xs text-tx font-sans max-h-[calc(100vh-16px)] overflow-y-auto"
        >
          <button
            type="button"
            onClick={() => {
              setContextMenuPos(null)
              onOpen?.(session)
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-acc/15 hover:text-acc transition-colors text-left"
          >
            <Terminal className="w-3.5 h-3.5 text-acc" />
            <span className="font-medium">Подключиться</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setContextMenuPos(null)
              onEdit?.(session)
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-acc/15 hover:text-acc transition-colors text-left"
          >
            <Pencil className="w-3.5 h-3.5 text-mut" />
            <span>Редактировать</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setContextMenuPos(null)
              onDuplicate?.(session)
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-acc/15 hover:text-acc transition-colors text-left"
          >
            <Copy className="w-3.5 h-3.5 text-mut" />
            <span>Дублировать</span>
          </button>

          <div className="h-[1px] bg-line my-1" />

          <button
            type="button"
            onClick={() => {
              setContextMenuPos(null)
              onDelete?.(session)
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-err/15 text-err transition-colors text-left"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Удалить сессию</span>
          </button>
        </div>
      )}
    </>
  )
}
