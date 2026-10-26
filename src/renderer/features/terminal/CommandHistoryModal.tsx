import { useState, useMemo, useRef, useEffect, type KeyboardEvent } from 'react'
import {
  History,
  Search,
  Star,
  Play,
  CornerDownLeft,
  Trash2,
  X,
  Clock,
  Server
} from 'lucide-react'
import { useCommandHistoryStore, type CommandHistoryItem } from '../../stores/history-store'

interface CommandHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  currentHost?: string
  onInsertCommand: (command: string, executeImmediately?: boolean) => void
}

function formatRelativeTime(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000)
  if (diffSec < 60) return 'только что'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin} мин. назад`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours} ч. назад`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays} дн. назад`
}

export function CommandHistoryModal({
  isOpen,
  onClose,
  currentHost,
  onInsertCommand
}: CommandHistoryModalProps): JSX.Element | null {
  const items = useCommandHistoryStore((s) => s.items)
  const toggleFavorite = useCommandHistoryStore((s) => s.toggleFavorite)
  const removeCommand = useCommandHistoryStore((s) => s.removeCommand)
  const clearHistory = useCommandHistoryStore((s) => s.clearHistory)

  const [query, setQuery] = useState('')
  const [filterMode, setFilterMode] = useState<'all' | 'favorites' | 'host'>('all')
  const [selectedIndex, setSelectedIndex] = useState(0)

  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (filterMode === 'favorites' && !item.isFavorite) return false
      if (filterMode === 'host' && currentHost && item.host !== currentHost) return false

      if (!query.trim()) return true
      const q = query.toLowerCase()
      return item.command.toLowerCase().includes(q) || (item.host && item.host.toLowerCase().includes(q))
    })
  }, [items, query, filterMode, currentHost])

  // Reset selected index when query or filter changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [query, filterMode])

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Ensure selected item is scrolled into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.children[selectedIndex] as HTMLElement
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [selectedIndex])

  if (!isOpen) return null

  const handleSelect = (item: CommandHistoryItem, execute: boolean): void => {
    onInsertCommand(item.command, execute)
    onClose()
  }

  const handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev < filteredItems.length - 1 ? prev + 1 : prev))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const selected = filteredItems[selectedIndex]
      if (selected) {
        handleSelect(selected, e.shiftKey)
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 select-none animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-panel border border-line rounded-lg shadow-2xl flex flex-col overflow-hidden text-xs max-h-[80vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-line bg-panel2/80">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-acc" />
            <h3 className="text-xs font-semibold text-tx">История команд и быстрый поиск</h3>
            <span className="text-[10px] text-mut font-mono px-1.5 py-0.2 rounded bg-bg border border-line">
              Ctrl+R
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={clearHistory}
              title="Очистить не избранную историю"
              className="text-[11px] text-mut hover:text-err transition-colors"
            >
              Очистить историю
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded text-mut hover:text-tx hover:bg-panel transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search Bar & Filters */}
        <div className="p-3 border-b border-line bg-bg space-y-2">
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-line bg-panel focus-within:border-acc">
            <Search className="w-3.5 h-3.5 text-mut flex-none" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Поиск по истории (введите часть команды или хоста)…"
              className="w-full bg-transparent text-tx text-xs outline-none placeholder:text-mut"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-mut hover:text-tx"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`py-0.5 px-2 rounded-full transition-colors ${
                  filterMode === 'all'
                    ? 'bg-acc text-bg font-medium'
                    : 'bg-panel2 text-mut hover:text-tx'
                }`}
              >
                Все ({items.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('favorites')}
                className={`flex items-center gap-1 py-0.5 px-2 rounded-full transition-colors ${
                  filterMode === 'favorites'
                    ? 'bg-acc text-bg font-medium'
                    : 'bg-panel2 text-mut hover:text-tx'
                }`}
              >
                <Star className="w-3 h-3 fill-current" />
                <span>Избранные ({items.filter((i) => i.isFavorite).length})</span>
              </button>
              {currentHost && (
                <button
                  type="button"
                  onClick={() => setFilterMode('host')}
                  className={`flex items-center gap-1 py-0.5 px-2 rounded-full transition-colors ${
                    filterMode === 'host'
                      ? 'bg-acc text-bg font-medium'
                      : 'bg-panel2 text-mut hover:text-tx'
                  }`}
                >
                  <Server className="w-3 h-3" />
                  <span>Для хоста: {currentHost}</span>
                </button>
              )}
            </div>

            <span className="text-mut text-[10px]">
              {filteredItems.length} {filteredItems.length === 1 ? 'совпадение' : 'команд'}
            </span>
          </div>
        </div>

        {/* Results List */}
        <div ref={listRef} className="flex-1 overflow-y-auto divide-y divide-line/40 max-h-96">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-mut text-xs space-y-1">
              <div>Ничего не найдено</div>
              <div className="text-[11px] opacity-70">
                Попробуйте изменить поисковый запрос или фильтр
              </div>
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedIndex(idx)}
                  onDoubleClick={() => handleSelect(item, false)}
                  className={`group flex items-center justify-between px-3 py-2 cursor-pointer transition-colors ${
                    isSelected ? 'bg-acc/15 border-l-2 border-acc' : 'hover:bg-panel2'
                  }`}
                >
                  <div className="flex-1 min-w-0 pr-3">
                    <div className="font-mono text-xs text-tx font-medium truncate">
                      {item.command}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-mut">
                      <span className="flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5 opacity-60" />
                        {formatRelativeTime(item.timestamp)}
                      </span>
                      {item.host && (
                        <span className="flex items-center gap-1 font-mono">
                          <Server className="w-2.5 h-2.5 opacity-60" />
                          {item.host}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-none">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleFavorite(item.id)
                      }}
                      title={item.isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}
                      className={`p-1 rounded transition-colors ${
                        item.isFavorite
                          ? 'text-warn'
                          : 'text-mut hover:text-warn opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      <Star className="w-3.5 h-3.5" fill={item.isFavorite ? 'currentColor' : 'none'} />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSelect(item, false)
                      }}
                      title="Вставить в терминал (Enter)"
                      className="p-1 rounded hover:bg-panel border border-line text-mut hover:text-tx transition-colors flex items-center gap-1 text-[11px] px-1.5"
                    >
                      <CornerDownLeft className="w-3 h-3" />
                      <span>Вставить</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSelect(item, true)
                      }}
                      title="Выполнить сразу в терминале (Shift+Enter)"
                      className="p-1 rounded bg-acc text-bg hover:bg-acc/90 font-medium transition-colors flex items-center gap-1 text-[11px] px-1.5"
                    >
                      <Play className="w-2.5 h-2.5 fill-current" />
                      <span>Запуск</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeCommand(item.id)
                      }}
                      title="Удалить из истории"
                      className="p-1 rounded text-mut hover:text-err opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-panel2/60 border-t border-line text-[11px] text-mut">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1 py-0.5 rounded bg-bg border border-line font-mono text-[9px]">↑↓</kbd> Навигация
            </span>
            <span>
              <kbd className="px-1 py-0.5 rounded bg-bg border border-line font-mono text-[9px]">Enter</kbd> Вставить
            </span>
            <span>
              <kbd className="px-1 py-0.5 rounded bg-bg border border-line font-mono text-[9px]">Shift+Enter</kbd> Выполнить
            </span>
            <span>
              <kbd className="px-1 py-0.5 rounded bg-bg border border-line font-mono text-[9px]">Esc</kbd> Закрыть
            </span>
          </div>

          {filteredItems[selectedIndex] && (
            <button
              type="button"
              onClick={() => handleSelect(filteredItems[selectedIndex], false)}
              className="py-0.5 px-2 rounded bg-acc text-bg font-medium hover:bg-acc/90 text-xs"
            >
              Выбрать
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
