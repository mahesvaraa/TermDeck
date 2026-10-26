import { useState, useRef, useEffect } from 'react'
import { Bookmark, Plus, Trash2, Folder, Check } from 'lucide-react'
import { useSftpStore } from '../../stores/sftp-store'

interface BookmarksDropdownProps {
  currentPath: string
  onNavigate: (path: string) => void
}

export function BookmarksDropdown({ currentPath, onNavigate }: BookmarksDropdownProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const [newBookmarkName, setNewBookmarkName] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const bookmarks = useSftpStore((s) => s.bookmarks)
  const addBookmark = useSftpStore((s) => s.addBookmark)
  const removeBookmark = useSftpStore((s) => s.removeBookmark)

  const isCurrentBookmarked = bookmarks.some((b) => b.path === currentPath)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setIsAdding(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const handleAddCurrent = (): void => {
    const folderName = currentPath === '/' ? 'Root' : currentPath.split('/').pop() || 'Folder'
    addBookmark(newBookmarkName.trim() || folderName, currentPath)
    setIsAdding(false)
    setNewBookmarkName('')
  }

  return (
    <div className="relative inline-block" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title="Закладки каталогов"
        className={`p-1 rounded transition-colors ${
          isOpen || isCurrentBookmarked
            ? 'text-acc bg-acc/15'
            : 'text-mut hover:text-tx hover:bg-panel2'
        }`}
      >
        <Bookmark className="w-3.5 h-3.5" fill={isCurrentBookmarked ? 'currentColor' : 'none'} />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-64 bg-panel2 border border-line rounded-lg shadow-2xl z-50 py-1 text-xs select-none animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-1.5 border-b border-line flex items-center justify-between text-tx font-medium">
            <div className="flex items-center gap-1.5">
              <Bookmark className="w-3.5 h-3.5 text-acc" />
              <span>Закладки каталогов</span>
            </div>
            {!isAdding && !isCurrentBookmarked && (
              <button
                type="button"
                onClick={() => setIsAdding(true)}
                className="text-[11px] text-acc hover:underline flex items-center gap-0.5"
              >
                <Plus className="w-3 h-3" />
                <span>Добавить</span>
              </button>
            )}
          </div>

          {/* Quick add prompt */}
          {isAdding && (
            <div className="p-2 border-b border-line bg-panel space-y-2">
              <div className="text-[11px] text-mut truncate">
                Путь: <span className="font-mono text-tx">{currentPath}</span>
              </div>
              <input
                type="text"
                autoFocus
                placeholder="Название закладки…"
                value={newBookmarkName}
                onChange={(e) => setNewBookmarkName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddCurrent()
                  if (e.key === 'Escape') setIsAdding(false)
                }}
                className="w-full py-1 px-2 rounded bg-bg border border-acc text-tx text-xs outline-none"
              />
              <div className="flex justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-2 py-0.5 text-[11px] rounded text-mut hover:text-tx"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleAddCurrent}
                  className="px-2 py-0.5 text-[11px] rounded bg-acc text-bg font-medium hover:bg-acc/90"
                >
                  Сохранить
                </button>
              </div>
            </div>
          )}

          {/* Bookmarks List */}
          <div className="max-h-60 overflow-y-auto py-1">
            {bookmarks.map((b) => {
              const isActive = b.path === currentPath
              return (
                <div
                  key={b.id}
                  onClick={() => {
                    onNavigate(b.path)
                    setIsOpen(false)
                  }}
                  className={`group flex items-center justify-between px-3 py-1.5 hover:bg-panel cursor-pointer transition-colors ${
                    isActive ? 'bg-acc/10 text-acc font-medium' : 'text-tx'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <Folder className="w-3.5 h-3.5 flex-none text-mut group-hover:text-acc" />
                    <div className="truncate">
                      <div className="truncate text-xs">{b.name}</div>
                      <div className="text-[10px] text-mut font-mono truncate">{b.path}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-none">
                    {isActive && <Check className="w-3 h-3 text-acc" />}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeBookmark(b.id)
                      }}
                      title="Удалить закладку"
                      className="p-1 rounded text-mut hover:text-err opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {!isAdding && !isCurrentBookmarked && (
            <div className="p-1 border-t border-line">
              <button
                type="button"
                onClick={handleAddCurrent}
                className="w-full text-left px-2.5 py-1.5 rounded hover:bg-panel text-xs text-acc flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Добавить текущую папку</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
