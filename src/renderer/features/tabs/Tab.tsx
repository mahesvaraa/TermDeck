import {
  useState,
  useRef,
  useEffect,
  type MouseEvent,
  type KeyboardEvent,
  type DragEvent
} from 'react'
import type { TabData } from '../../stores/tabs-store'
import { useTabsStore } from '../../stores/tabs-store'
import type { TabStatus } from '@shared/types'
import {
  Copy,
  Edit3,
  XCircle,
  X,
  FileCode,
  Columns,
  Rows,
  Layers,
  Code,
  Network
} from 'lucide-react'

interface TabProps {
  tab: TabData
  index: number
  isActive: boolean
  onSelect: (id: string) => void
  onClose: (id: string) => void
  onRename: (id: string, newTitle: string) => void
  onDuplicate: (id: string) => void
  onCloseOthers: (id: string) => void
  onReorder: (fromIndex: number, toIndex: number) => void
  onSnippetsClick?: () => void
  onTunnelsClick?: () => void
}

function getStatusDotClass(status: TabStatus): string {
  switch (status) {
    case 'connected':
      return 'bg-ok'
    case 'connecting':
      return 'bg-warn animate-pulse'
    case 'error':
      return 'bg-err'
    case 'disconnected':
    default:
      return 'bg-mut'
  }
}

export function Tab({
  tab,
  index,
  isActive,
  onSelect,
  onClose,
  onRename,
  onDuplicate,
  onCloseOthers,
  onReorder,
  onSnippetsClick,
  onTunnelsClick
}: TabProps): JSX.Element {
  const splitActivePane = useTabsStore((s) => s.splitActivePane)
  const toggleMultiExec = useTabsStore((s) => s.toggleMultiExec)
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(tab.title)
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const menuRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus rename input when editing starts
  useEffect(() => {
    if (isRenaming) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [isRenaming])

  // Dismiss context menu on click outside
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

  const handleClose = (e: MouseEvent): void => {
    e.stopPropagation()
    onClose(tab.id)
  }

  // Middle-click to close
  const handleMouseDown = (e: MouseEvent): void => {
    if (e.button === 1) {
      e.preventDefault()
      e.stopPropagation()
      onClose(tab.id)
    }
  }

  // Context menu (right click)
  const handleContextMenu = (e: MouseEvent): void => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenuPos({ x: e.clientX, y: e.clientY })
  }

  const handleCommitRename = (): void => {
    const trimmed = renameValue.trim()
    if (trimmed && trimmed !== tab.title) {
      onRename(tab.id, trimmed)
    } else {
      setRenameValue(tab.title)
    }
    setIsRenaming(false)
  }

  const handleRenameKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleCommitRename()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setRenameValue(tab.title)
      setIsRenaming(false)
    }
  }

  const handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Enter' || e.key === ' ') {
      onSelect(tab.id)
    }
  }

  // Drag and Drop reordering
  const handleDragStart = (e: DragEvent<HTMLDivElement>): void => {
    e.dataTransfer.setData('text/plain', String(index))
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setIsDragOver(true)
  }

  const handleDragLeave = (): void => {
    setIsDragOver(false)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault()
    setIsDragOver(false)
    const fromIndexStr = e.dataTransfer.getData('text/plain')
    if (fromIndexStr !== '') {
      const fromIndex = parseInt(fromIndexStr, 10)
      if (!isNaN(fromIndex) && fromIndex !== index) {
        onReorder(fromIndex, index)
      }
    }
  }

  return (
    <>
      <div
        role="tab"
        tabIndex={0}
        draggable={!isRenaming}
        aria-selected={isActive}
        onClick={() => onSelect(tab.id)}
        onMouseDown={handleMouseDown}
        onContextMenu={handleContextMenu}
        onKeyDown={handleKeyDown}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`group flex items-center gap-2 py-1.5 px-3 rounded-t-[7px] cursor-pointer whitespace-nowrap text-xs transition-colors select-none focus-visible:outline-2 focus-visible:outline-acc ${
          isDragOver ? 'border-l-2 border-acc' : ''
        } ${
          isActive
            ? 'bg-panel text-tx shadow-[inset_0_2px_0_var(--acc)]'
            : 'text-mut hover:text-tx hover:bg-panel2'
        }`}
      >
        {tab.type === 'editor' ? (
          <FileCode className="w-3.5 h-3.5 text-acc flex-none" />
        ) : (
          <span
            className={`w-2 h-2 rounded-full flex-none ${getStatusDotClass(tab.status)}`}
            aria-hidden="true"
          />
        )}

        {isRenaming ? (
          <input
            ref={inputRef}
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={handleCommitRename}
            onKeyDown={handleRenameKeyDown}
            onClick={(e) => e.stopPropagation()}
            className="bg-bg border border-acc rounded px-1 text-tx text-xs outline-none w-28"
          />
        ) : (
          <span
            onDoubleClick={(e) => {
              e.stopPropagation()
              setIsRenaming(true)
            }}
            title={tab.title}
            className="font-medium truncate max-w-[150px]"
          >
            {tab.title}
          </span>
        )}

        <button
          type="button"
          onClick={handleClose}
          aria-label={`Закрыть вкладку ${tab.title}`}
          className="flex items-center justify-center w-3.5 h-3.5 rounded text-xs leading-none transition-colors focus:outline-none"
        >
          {tab.type === 'editor' && tab.editorState?.isDirty ? (
            <span className="relative flex items-center justify-center w-full h-full">
              <span className="w-2 h-2 rounded-full bg-acc group-hover:hidden" />
              <span className="hidden group-hover:inline opacity-70 hover:opacity-100 hover:text-err font-bold">
                ×
              </span>
            </span>
          ) : (
            <span className="opacity-50 hover:opacity-100 hover:text-err">×</span>
          )}
        </button>
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
              setIsRenaming(true)
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-acc/15 hover:text-acc transition-colors text-left"
          >
            <Edit3 className="w-3.5 h-3.5 text-mut" />
            <span>Переименовать</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setContextMenuPos(null)
              onDuplicate(tab.id)
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-acc/15 hover:text-acc transition-colors text-left"
          >
            <Copy className="w-3.5 h-3.5 text-mut" />
            <span>Дублировать</span>
          </button>
          <div className="h-[1px] bg-line my-1" />

          {tab.type !== 'editor' && (
            <>
              <button
                type="button"
                onClick={() => {
                  setContextMenuPos(null)
                  onSelect(tab.id)
                  splitActivePane('horizontal')
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-acc/15 hover:text-acc transition-colors text-left"
              >
                <Columns className="w-3.5 h-3.5 text-mut" />
                <span>Разделить по горизонтали →</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setContextMenuPos(null)
                  onSelect(tab.id)
                  splitActivePane('vertical')
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-acc/15 hover:text-acc transition-colors text-left"
              >
                <Rows className="w-3.5 h-3.5 text-mut" />
                <span>Разделить по вертикали ↓</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setContextMenuPos(null)
                  toggleMultiExec(tab.id)
                }}
                className={`w-full flex items-center gap-2 px-3 py-1.5 hover:bg-acc/15 hover:text-acc transition-colors text-left ${
                  tab.isMultiExec ? 'text-acc font-medium' : ''
                }`}
              >
                <Layers className={`w-3.5 h-3.5 ${tab.isMultiExec ? 'text-acc' : 'text-mut'}`} />
                <span>{tab.isMultiExec ? 'Отключить Multi-exec' : 'Включить Multi-exec'}</span>
              </button>
              <div className="h-[1px] bg-line my-1" />
            </>
          )}

          {onSnippetsClick && (
            <button
              type="button"
              onClick={() => {
                setContextMenuPos(null)
                onSnippetsClick()
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-acc/15 hover:text-acc transition-colors text-left"
            >
              <Code className="w-3.5 h-3.5 text-mut" />
              <span>Сниппеты команд…</span>
            </button>
          )}

          {tab.type === 'ssh' && onTunnelsClick && (
            <button
              type="button"
              onClick={() => {
                setContextMenuPos(null)
                onTunnelsClick()
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-acc/15 hover:text-acc transition-colors text-left"
            >
              <Network className="w-3.5 h-3.5 text-mut" />
              <span>SSH-туннели…</span>
            </button>
          )}

          <div className="h-[1px] bg-line my-1" />
          <button
            type="button"
            onClick={() => {
              setContextMenuPos(null)
              onCloseOthers(tab.id)
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-acc/15 hover:text-acc transition-colors text-left"
          >
            <XCircle className="w-3.5 h-3.5 text-mut" />
            <span>Закрыть другие</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setContextMenuPos(null)
              onClose(tab.id)
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-err/15 hover:text-err transition-colors text-left text-err"
          >
            <X className="w-3.5 h-3.5 text-err" />
            <span>Закрыть</span>
          </button>
        </div>
      )}
    </>
  )
}
